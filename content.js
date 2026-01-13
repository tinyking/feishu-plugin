/**
 * 飞书转公众号插件 - V13 (语义化列表重构版)
 * 1. 核心升级：将模拟列表改为标准的 ul/ol > li 结构
 * 2. 算法升级：渲染时自动合并连续的列表项
 * 3. 完美继承：智能滚动、去重、垃圾过滤、图片鉴权
 */

// ==========================================
// 1. 样式配置 (语义化列表适配)
// ==========================================
const WX_STYLES = {
  container: "font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif; font-size: 16px; line-height: 1.8; color: #333; letter-spacing: 0.05em; padding: 20px 10px;",
  h1: "font-size: 24px; font-weight: bold; color: #000; margin: 30px 0 16px 0; text-align: center;",
  h2: "font-size: 20px; font-weight: bold; color: #00d6b9; margin: 24px 0 14px 0; padding-bottom: 5px; border-bottom: 2px solid #00d6b9; display: inline-block;",
  h3: "font-size: 17px; font-weight: bold; color: #333; margin: 20px 0 10px 0; padding-left: 8px; border-left: 4px solid #00d6b9;",
  p: "margin-bottom: 16px; text-align: justify; word-break: break-all;",
  quote: "margin: 20px 0; padding: 15px; background: #f7f7f7; border: none; border-left: 5px solid #d0d0d0; color: #666; font-size: 15px; border-radius: 4px;",
  code: "margin: 16px 0; padding: 15px; background: #f5f5f5; color: #333; font-family: monospace; font-size: 14px; line-height: 1.5; border-radius: 4px; overflow-x: auto; white-space: pre-wrap;",
  callout: "margin: 20px 0; padding: 15px; background: #e8f4ff; border: 1px solid #4a90d9; border-radius: 4px; color: #333;",
  image: "max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block; margin: 20px auto;",
  link: "color: #576b95; text-decoration: none; border-bottom: 1px dashed #576b95;",
  bold: "font-weight: bold; color: #000;",
  inlineCode: "background: #f0f0f0; padding: 2px 5px; border-radius: 3px; font-family: monospace; color: #d63384; font-size: 14px;",
  
  // --- V13 新增语义化列表样式 ---
  // 微信公众号对 ul/ol 的默认缩进支持较好，这里只需微调
  ul: "margin: 0 0 16px 0; padding-left: 22px; list-style-type: disc;",
  ol: "margin: 0 0 16px 0; padding-left: 22px; list-style-type: decimal;",
  li: "margin-bottom: 8px; line-height: 1.8; text-align: justify;"
};

// ==========================================
// 2. 主逻辑入口
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "convert_and_copy") {
    (async () => {
      try {
        console.log("[FeishuPro V13] 启动语义化渲染引擎...");
        
        const blockData = await scrollAndCollect();
        
        if (!blockData || blockData.length === 0) {
          throw new Error("未提取到内容，请确保页面已完全加载");
        }

        const processedBlocks = await processImages(blockData);
        
        // 渲染 HTML (使用新的合并算法)
        const html = renderToHtml(processedBlocks);

        copyToClipboard(html);
        sendResponse({ success: true, count: processedBlocks.length });

      } catch (e) {
        console.error("[FeishuPro Error]", e);
        sendResponse({ success: false, msg: e.message });
      }
    })();
    return true;
  }
});

// ==========================================
// 3. 智能滚动采集引擎 (保持不变)
// ==========================================

const CONTENT_POOL = new Map();
const GARBAGE_TEXTS = [
    "本文暂未被其它文档引用", "本文被以下文档引用", "No references to this document",
    "References to this document", "添加评论", "分享", "复制链接"
];

async function scrollAndCollect() {
    CONTENT_POOL.clear();
    const scrollContainer = findMainContentContainer();
    if (!scrollContainer) throw new Error("无法找到正文滚动区域");

    collectVisibleBlocks();

    if (scrollContainer.scrollHeight <= scrollContainer.clientHeight + 100) {
        return getSortedBlocks();
    }

    const totalHeight = scrollContainer.scrollHeight;
    const viewportHeight = scrollContainer.clientHeight;
    const step = Math.floor(viewportHeight * 0.8); 
    
    let currentScroll = 0;
    while (currentScroll < totalHeight) {
        scrollContainer.scrollTop = currentScroll;
        await new Promise(resolve => setTimeout(resolve, 200)); 
        collectVisibleBlocks(); 
        currentScroll += step;
    }

    scrollContainer.scrollTop = totalHeight;
    await new Promise(resolve => setTimeout(resolve, 300));
    collectVisibleBlocks();
    scrollContainer.scrollTop = 0;

    return getSortedBlocks();
}

function findMainContentContainer() {
    const prioritySelectors = [".docx-editor-container", ".render-document", "#innerdocbodyWrap", ".etherpad-container-wrapper"];
    for (const sel of prioritySelectors) {
        const el = document.querySelector(sel);
        if (el && isScrollable(el)) return el;
    }
    const allDivs = document.querySelectorAll("div");
    let maxArea = 0, bestCandidate = null;
    for (const div of allDivs) {
        if (!isScrollable(div)) continue;
        const cls = (div.className || "").toLowerCase();
        if (cls.includes("nav") || cls.includes("sidebar") || cls.includes("catalog") || cls.includes("tree")) continue;
        const rect = div.getBoundingClientRect();
        if (rect.width < 400) continue;
        const area = rect.width * rect.height;
        if (area > maxArea) { maxArea = area; bestCandidate = div; }
    }
    return bestCandidate || document.documentElement;
}

function isScrollable(el) {
    const style = window.getComputedStyle(el);
    return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 50;
}

function collectVisibleBlocks() {
    const wikiBlocks = document.querySelectorAll('.block[class*="docx-"]:not(.docx-page-block)');
    if (wikiBlocks.length > 0) return extractWikiBlocks(wikiBlocks);
    const aceLines = document.querySelectorAll('.ace-line');
    if (aceLines.length > 0) extractAceLines(aceLines);
}

function isGarbageContent(text) {
    if (!text) return false;
    return GARBAGE_TEXTS.some(garbage => text.includes(garbage));
}

function extractWikiBlocks(nodes) {
    nodes.forEach((node, index) => {
        if (node.closest('.block[class*="docx-table"]') && !node.className.includes('table')) return;
        if (node.closest('.block[class*="docx-quote"]') && node !== node.closest('.block[class*="docx-quote"]')) return;

        const id = node.getAttribute('data-block-id') || `wiki_${index}`;
        if (CONTENT_POOL.has(id)) return;

        const typeInfo = identifyType(node);
        if (!typeInfo) return;

        const textContent = extractFormattedText(node.querySelector('.text-editor') || node);
        if (isGarbageContent(textContent)) return;
        if (!textContent && typeInfo.type !== 'image' && typeInfo.type !== 'divider') return;

        CONTENT_POOL.set(id, { id, type: typeInfo.type, level: typeInfo.level, content: textContent, src: typeInfo.src });
    });
}

function extractAceLines(nodes) {
    nodes.forEach((node, index) => {
        const id = `ace_${index}`;
        if (CONTENT_POOL.has(id)) return;

        let type = 'p', level = 0, src = null;
        const cls = node.className || "";
        
        if (cls.match(/heading-h(\d)/)) {
            type = 'heading'; level = parseInt(cls.match(/heading-h(\d)/)[1]);
        } else if (cls.includes('list-')) {
            type = cls.includes('ordered') ? 'ol' : 'ul';
        } else if (cls.includes('quote')) {
            type = 'quote';
        } else if (cls.includes('gallery')) {
            type = 'image';
            const img = node.querySelector('img');
            if (img) src = img.src;
        }

        const textContent = extractFormattedText(node);
        if (isGarbageContent(textContent)) return;
        if (!textContent && !src) return;

        CONTENT_POOL.set(id, { id, type, level, content: textContent, src });
    });
}

function getSortedBlocks() {
    return Array.from(CONTENT_POOL.values());
}

// ==========================================
// 4. 解析工具 (保持不变)
// ==========================================

function identifyType(node) {
    const cls = node.className || "";
    if (cls.includes('heading')) {
        const match = cls.match(/heading(\d)/);
        return { type: 'heading', level: match ? parseInt(match[1]) : 1 };
    }
    if (cls.includes('image')) {
        const img = node.querySelector('img');
        return img ? { type: 'image', src: img.src } : null;
    }
    if (cls.includes('bullet') || cls.includes('list')) return { type: 'ul' };
    if (cls.includes('ordered')) return { type: 'ol' };
    if (cls.includes('quote')) return { type: 'quote' };
    if (cls.includes('callout')) return { type: 'callout' };
    if (cls.includes('code')) return { type: 'code' };
    return { type: 'p' };
}

function extractFormattedText(root) {
    if (!root) return "";
    const result = [];
    const traverse = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.replace(/[\u200B\u200C\u200D\uFEFF]/g, "") || "";
            if (text) result.push(text);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            const style = node.getAttribute('style') || "";
            const isBold = tag === 'b' || tag === 'strong' || (style.includes('font-weight') && (style.includes('bold') || style.includes('700')));
            const isCode = node.classList.contains('inline-code');
            const isLink = tag === 'a';

            let inner = "";
            const temp = [];
            const originalPush = result.push;
            result.push = (item) => temp.push(item);
            node.childNodes.forEach(traverse);
            result.push = originalPush;
            inner = temp.join("");

            if (!inner) return;
            if (isBold) inner = `<span style="${WX_STYLES.bold}">${inner}</span>`;
            if (isCode) inner = `<span style="${WX_STYLES.inlineCode}">${inner}</span>`;
            if (isLink) inner = `<a href="${node.href}" style="${WX_STYLES.link}">${inner}</a>`;
            result.push(inner);
        }
    };
    root.childNodes.forEach(traverse);
    return result.join("");
}

// ==========================================
// 5. 渲染与输出 (重构核心：合并列表)
// ==========================================

async function processImages(blocks) {
    const tasks = blocks.map(async (block) => {
        if (block.type === 'image' && block.src) {
            const base64 = await urlToBase64(block.src);
            if (base64) block.src = base64;
        }
        return block;
    });
    return Promise.all(tasks);
}

async function urlToBase64(url) {
    try {
        const response = await fetch(url, { mode: 'cors', credentials: 'include' });
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) { return null; }
}

/**
 * V13 核心渲染函数：支持列表合并 (Grouping)
 */
function renderToHtml(blocks) {
    let html = `<div style="${WX_STYLES.container}">`;
    
    // 状态机变量
    let currentListType = null; // 'ul' 或 'ol' 或 null

    blocks.forEach((block, index) => {
        const isList = block.type === 'ul' || block.type === 'ol';
        
        // 1. 列表状态处理
        if (isList) {
            // 如果列表类型改变了 (比如从 ul 变成 ol，或者之前没有列表)，先关闭旧的
            if (currentListType && currentListType !== block.type) {
                html += `</${currentListType}>`;
                currentListType = null;
            }
            
            // 如果当前没有开启列表，开启一个新的
            if (!currentListType) {
                currentListType = block.type;
                const listStyle = currentListType === 'ul' ? WX_STYLES.ul : WX_STYLES.ol;
                html += `<${currentListType} style="${listStyle}">`;
            }
        } else {
            // 如果当前块不是列表，但之前开启了列表，先关闭它
            if (currentListType) {
                html += `</${currentListType}>`;
                currentListType = null;
            }
        }

        // 2. 内容清洗
        let content = block.content || "";
        if (isList) {
             // 移除飞书自带的 "1." 或 "•" 符号，因为 ul/ol 会自动生成
            content = content.replace(/^(&nbsp;|\s|[0-9]+\.|[•·●])+/g, '').trim();
        }

        // 3. 渲染块
        switch (block.type) {
            case 'heading':
                const hStyle = block.level === 1 ? WX_STYLES.h1 : (block.level === 2 ? WX_STYLES.h2 : WX_STYLES.h3);
                html += `<h${block.level} style="${hStyle}">${content}</h${block.level}>`;
                break;
            case 'ul':
            case 'ol':
                // 直接渲染 li，样式交给外部的 ul/ol 和 自身的 li style
                html += `<li style="${WX_STYLES.li}"><section style="display:inline;">${content}</section></li>`;
                break;
            case 'quote':
                html += `<blockquote style="${WX_STYLES.quote}">${content}</blockquote>`;
                break;
            case 'callout':
                html += `<div style="${WX_STYLES.callout}">${content}</div>`;
                break;
            case 'code':
                html += `<div style="${WX_STYLES.code}">${content}</div>`;
                break;
            case 'image':
                if (block.src) html += `<img src="${block.src}" style="${WX_STYLES.image}" />`;
                break;
            default:
                if (content) html += `<p style="${WX_STYLES.p}">${content}</p>`;
        }
    });

    // 循环结束后，如果还有未关闭的列表，关闭它
    if (currentListType) {
        html += `</${currentListType}>`;
    }

    html += `</div>`;
    return html;
}

function copyToClipboard(html) {
    const handler = (e) => {
        e.clipboardData.setData('text/html', html);
        e.clipboardData.setData('text/plain', '已转换为公众号格式');
        e.preventDefault();
    };
    document.addEventListener('copy', handler);
    document.execCommand('copy');
    document.removeEventListener('copy', handler);
}
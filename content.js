/**
 * 飞书转公众号插件 - V12 (列表排版优化版)
 * 1. 修复列表内容换行问题 (将 div 换为 section)
 * 2. 优化列表对齐，圆点/数字与文字完美同行
 * 3. 保持 V11 的所有功能 (智能滚动、去重、过滤)
 */

// ==========================================
// 1. 样式配置 (优化列表项)
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
  
  // --- 列表样式优化 ---
  ulItem: "margin-bottom: 10px; display: flex; align-items: flex-start;",
  // margin-top: 11px 是为了适配 1.8倍行高，让点居中
  ulBullet: "display: inline-block; width: 6px; height: 6px; background: #00d6b9; border-radius: 50%; margin-right: 10px; flex-shrink: 0; margin-top: 11px;",
  
  olItem: "margin-bottom: 10px; display: flex; align-items: flex-start;",
  olNum: "margin-right: 8px; color: #00d6b9; font-weight: bold; font-family: sans-serif; flex-shrink: 0; margin-top: 0px;",
  
  link: "color: #576b95; text-decoration: none; border-bottom: 1px dashed #576b95;",
  bold: "font-weight: bold; color: #000;",
  inlineCode: "background: #f0f0f0; padding: 2px 5px; border-radius: 3px; font-family: monospace; color: #d63384; font-size: 14px;"
};

// ==========================================
// 2. 主逻辑入口
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "convert_and_copy") {
    (async () => {
      try {
        console.log("[FeishuPro V12] 启动转换引擎...");
        
        const blockData = await scrollAndCollect();
        
        if (!blockData || blockData.length === 0) {
          throw new Error("未提取到内容，请确保页面已完全加载");
        }

        const processedBlocks = await processImages(blockData);
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
// 3. 智能滚动采集引擎
// ==========================================

const CONTENT_POOL = new Map();

const GARBAGE_TEXTS = [
    "本文暂未被其它文档引用",
    "本文被以下文档引用",
    "No references to this document",
    "References to this document",
    "添加评论",
    "分享",
    "复制链接"
];

async function scrollAndCollect() {
    CONTENT_POOL.clear();
    
    const scrollContainer = findMainContentContainer();
    if (!scrollContainer) throw new Error("无法找到正文滚动区域");

    console.log("[FeishuPro] 锁定正文容器:", scrollContainer);

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
    const prioritySelectors = [
        ".docx-editor-container",
        ".render-document",
        "#innerdocbodyWrap",
        ".etherpad-container-wrapper"
    ];

    for (const sel of prioritySelectors) {
        const el = document.querySelector(sel);
        if (el && isScrollable(el)) return el;
    }

    const allDivs = document.querySelectorAll("div");
    let maxArea = 0;
    let bestCandidate = null;

    for (const div of allDivs) {
        if (!isScrollable(div)) continue;
        const cls = (div.className || "").toLowerCase();
        
        if (cls.includes("nav") || cls.includes("sidebar") || cls.includes("catalog") || cls.includes("tree")) {
            continue;
        }

        const rect = div.getBoundingClientRect();
        if (rect.width < 400) continue;

        const area = rect.width * rect.height;
        if (area > maxArea) {
            maxArea = area;
            bestCandidate = div;
        }
    }

    return bestCandidate || document.documentElement;
}

function isScrollable(el) {
    const style = window.getComputedStyle(el);
    const hasScroll = style.overflowY === 'auto' || style.overflowY === 'scroll';
    const isBigEnough = el.scrollHeight > el.clientHeight + 50;
    return hasScroll && isBigEnough;
}

function collectVisibleBlocks() {
    const wikiBlocks = document.querySelectorAll('.block[class*="docx-"]:not(.docx-page-block)');
    if (wikiBlocks.length > 0) {
        extractWikiBlocks(wikiBlocks);
        return;
    }

    const aceLines = document.querySelectorAll('.ace-line');
    if (aceLines.length > 0) {
        extractAceLines(aceLines);
    }
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

        CONTENT_POOL.set(id, {
            id,
            type: typeInfo.type,
            level: typeInfo.level,
            content: textContent,
            src: typeInfo.src
        });
    });
}

function extractAceLines(nodes) {
    nodes.forEach((node, index) => {
        const id = `ace_${index}`;
        if (CONTENT_POOL.has(id)) return;

        let type = 'p';
        let level = 0;
        let src = null;
        const cls = node.className || "";
        
        if (cls.match(/heading-h(\d)/)) {
            type = 'heading';
            level = parseInt(cls.match(/heading-h(\d)/)[1]);
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
// 4. 解析工具
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
// 5. 渲染与输出 (关键修复)
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

function renderToHtml(blocks) {
    let html = `<div style="${WX_STYLES.container}">`;
    let olCounter = 1;
    let lastType = null;

    blocks.forEach(block => {
        if (block.type === 'ol') {
            if (lastType !== 'ol') olCounter = 1;
            block.index = olCounter++;
        } else {
            olCounter = 1;
        }
        lastType = block.type;

        let content = block.content || "";
        if (block.type === 'ul' || block.type === 'ol') {
            content = content.replace(/^(&nbsp;|\s|[0-9]+\.|[•·●])+/g, '').trim();
        }

        switch (block.type) {
            case 'heading':
                const style = block.level === 1 ? WX_STYLES.h1 : (block.level === 2 ? WX_STYLES.h2 : WX_STYLES.h3);
                html += `<h${block.level} style="${style}">${content}</h${block.level}>`;
                break;
            case 'ul':
                // 关键修复：将 inner div 改为 section，并强制 margin/padding 为 0
                html += `<div style="${WX_STYLES.ulItem}">
                            <span style="${WX_STYLES.ulBullet}"></span>
                            <section style="flex:1; margin:0; padding:0; min-width:0;">${content}</section>
                         </div>`;
                break;
            case 'ol':
                // 关键修复：将 inner div 改为 section
                html += `<div style="${WX_STYLES.olItem}">
                            <span style="${WX_STYLES.olNum}">${block.index}.</span>
                            <section style="flex:1; margin:0; padding:0; min-width:0;">${content}</section>
                         </div>`;
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
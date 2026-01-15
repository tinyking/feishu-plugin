/**
 * 飞书转公众号插件 - V17.1 (样式防丢失版)
 * 1. 修复：高亮块 (Callout) 粘贴到微信后背景色/边框丢失的问题
 * 2. 策略：将 div 换为 section，并将 CSS 复合属性拆解为独立属性
 * 3. 保持：所有 V17 的功能
 */

// ==========================================
// 1. 默认配置与预设
// ==========================================

const DEFAULT_CONFIG = {
    themeColor: '#00d6b9',
    fontSize: '16px',
    lineHeight: '1.8',
    textAlign: 'justify'
};

const THEME_PRESETS = [
    { name: '青碧', color: '#00d6b9' },
    { name: '蔚蓝', color: '#1890ff' },
    { name: '赤红', color: '#ef4444' },
    { name: '橘橙', color: '#f97316' },
    { name: '紫罗', color: '#8b5cf6' },
    { name: '墨黑', color: '#333333' }
];

const CALLOUT_THEMES = {
    red:    { bg: '#fff1f0', border: '#ffccc7', icon: '🛑' },
    yellow: { bg: '#fffbe6', border: '#ffe58f', icon: '⚠️' },
    green:  { bg: '#f6ffed', border: '#b7eb8f', icon: '✅' },
    blue:   { bg: '#e6f7ff', border: '#91d5ff', icon: 'ℹ️' },
    purple: { bg: '#f9f0ff', border: '#d3adf7', icon: '🔮' },
    grey:   { bg: '#fafafa', border: '#d9d9d9', icon: '📝' },
    default:{ bg: '#e6f7ff', border: '#91d5ff', icon: '💡' }
};

// ==========================================
// 2. 动态样式生成引擎 (核心修复)
// ==========================================

function getWxStyles(config) {
    const c = { ...DEFAULT_CONFIG, ...(config || {}) };
    const numSize = parseFloat(c.fontSize);
    const bulletMarginTop = (parseFloat(c.lineHeight) * numSize - 6) / 2;

    return {
        container: `font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif; font-size: ${c.fontSize}; line-height: ${c.lineHeight}; color: #333; letter-spacing: 0.05em; padding: 20px 10px; text-align: ${c.textAlign};`,
        
        h1: `font-size: 24px; font-weight: bold; color: #000; margin: 30px 0 16px 0; text-align: center; line-height: 1.4;`,
        
        h2: `font-size: 20px; font-weight: bold; color: ${c.themeColor}; margin: 24px 0 14px 0; padding-bottom: 5px; border-bottom: 2px solid ${c.themeColor}; display: inline-block; line-height: 1.4;`,
        
        h3: `font-size: 17px; font-weight: bold; color: #333; margin: 20px 0 10px 0; padding-left: 8px; border-left: 4px solid ${c.themeColor}; line-height: 1.4;`,
        
        p: `font-size: ${c.fontSize}; line-height: ${c.lineHeight}; margin-bottom: 16px; text-align: ${c.textAlign}; word-break: break-all;`,
        
        // 引用块修复：拆解 background 和 border
        quote: `font-size: ${c.fontSize}; line-height: ${c.lineHeight}; margin: 20px 0; padding: 15px; background-color: #f7f7f7; border: none; border-left-width: 5px; border-left-style: solid; border-left-color: #d0d0d0; color: #666; border-radius: 4px; box-sizing: border-box;`,
        
        code: `font-size: 14px; line-height: 1.6; margin: 16px 0; padding: 15px; background-color: #f5f5f5; color: #333; font-family: monospace; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; text-align: left;`,
        
        // Callout 样式其实是动态生成的，这里只作为兜底
        callout: ``,
        
        image: `max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block; margin: 20px auto;`,
        
        link: `color: ${c.themeColor}; text-decoration: none; border-bottom: 1px dashed ${c.themeColor};`,
        
        bold: `font-weight: bold; color: #000;`,
        
        inlineCode: `background-color: #f0f0f0; padding: 2px 5px; border-radius: 3px; font-family: monospace; color: #d63384; font-size: 14px;`,
        
        divider: `margin: 30px 0; border: 0; border-top: 1px solid #dbdbdb;`,

        ul: `margin: 0 0 16px 0; padding-left: 28px; list-style-type: disc;`,
        ol: `margin: 0 0 16px 0; padding-left: 34px; list-style-type: decimal;`,
        
        ulItem: `margin-bottom: 10px; display: flex; align-items: flex-start; text-align: justify;`,
        ulBullet: `display: inline-block; width: 6px; height: 6px; background-color: ${c.themeColor}; border-radius: 50%; margin-right: 10px; flex-shrink: 0; margin-top: ${bulletMarginTop}px;`,
        
        olItem: `margin-bottom: 10px; display: flex; align-items: flex-start; text-align: justify;`,
        olNum: `margin-right: 8px; color: ${c.themeColor}; font-weight: bold; font-family: sans-serif; flex-shrink: 0; margin-top: 0px;`,
        
        li: `font-size: ${c.fontSize}; line-height: ${c.lineHeight}; margin-bottom: 8px; text-align: ${c.textAlign};`
    };
}

// ==========================================
// 3. 抽屉样式
// ==========================================
const DRAWER_STYLES = `
  #feishu-preview-mask {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 99998;
    backdrop-filter: blur(2px); transition: opacity 0.3s;
  }
  #feishu-preview-drawer {
    position: fixed; top: 0; right: 0; width: 480px; height: 100%;
    background: #f7f7f7; z-index: 99999;
    box-shadow: -5px 0 15px rgba(0,0,0,0.1);
    display: flex; flex-direction: column;
    transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    font-family: -apple-system, sans-serif;
  }
  #feishu-preview-drawer.open { transform: translateX(0); }
  .drawer-header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fff; }
  .drawer-title { font-size: 16px; font-weight: 600; color: #333; }
  .drawer-close { cursor: pointer; padding: 4px 8px; font-size: 24px; color: #999; border:none; background:transparent; line-height:1;}
  .drawer-settings { padding: 15px 20px; background: #fff; border-bottom: 1px solid #eee; }
  .setting-row { display: flex; align-items: center; margin-bottom: 12px; }
  .setting-row:last-child { margin-bottom: 0; }
  .setting-label { width: 60px; font-size: 13px; color: #666; font-weight: 500; }
  .setting-content { flex: 1; display: flex; gap: 8px; align-items: center; }
  .color-btn { width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: transform 0.2s; }
  .color-btn.active { border-color: #333; transform: scale(1.1); }
  .size-btn { padding: 4px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; cursor: pointer; background: #fff; color: #333; }
  .size-btn.active { background: #333; color: #fff; border-color: #333; }
  .drawer-content { flex: 1; overflow-y: auto; padding: 20px; background: #fff; }
  .mobile-view { max-width: 100%; margin: 0 auto; }
  .drawer-footer { padding: 16px 20px; border-top: 1px solid #eee; background: #fff; text-align: center; }
  .btn-copy { background: #00d6b9; color: #fff; border: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 214, 185, 0.3); transition: background 0.2s; }
  .btn-copy:hover { background: #00b59c; }
`;

// ==========================================
// 4. 全局状态
// ==========================================
let GLOBAL_BLOCKS = [];
let CURRENT_CONFIG = { ...DEFAULT_CONFIG };

async function loadConfig() {
    return new Promise((resolve) => {
        if (chrome && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(['feishu_wx_config'], (result) => {
                if (result && result.feishu_wx_config) CURRENT_CONFIG = { ...DEFAULT_CONFIG, ...result.feishu_wx_config };
                resolve(CURRENT_CONFIG);
            });
        } else resolve(DEFAULT_CONFIG);
    });
}

function saveConfig() {
    if (chrome && chrome.storage && chrome.storage.sync) chrome.storage.sync.set({ 'feishu_wx_config': CURRENT_CONFIG });
}

// ==========================================
// 5. 消息入口
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "convert_and_copy") {
    (async () => {
      try {
        await loadConfig();
        console.log("[FeishuPro V17.1] 启动...");
        const blockData = await scrollAndCollect();
        if (!blockData || blockData.length === 0) throw new Error("未提取到内容，请确保页面加载完全");
        const processedBlocks = await processImages(blockData);
        GLOBAL_BLOCKS = processedBlocks;
        const styles = getWxStyles(CURRENT_CONFIG);
        const html = renderToHtml(GLOBAL_BLOCKS, styles);
        showPreviewDrawer(html);
        sendResponse({ success: true });
      } catch (e) {
        console.error(e);
        sendResponse({ success: false, msg: e.message });
      }
    })();
    return true;
  }
});

// ==========================================
// 6. UI 逻辑
// ==========================================
function showPreviewDrawer(initialHtml) {
    if (!document.getElementById('feishu-drawer-style')) {
        const style = document.createElement('style');
        style.id = 'feishu-drawer-style';
        style.textContent = DRAWER_STYLES;
        document.head.appendChild(style);
    }
    const oldDrawer = document.getElementById('feishu-preview-drawer');
    const oldMask = document.getElementById('feishu-preview-mask');
    if (oldDrawer) oldDrawer.remove();
    if (oldMask) oldMask.remove();

    const mask = document.createElement('div');
    mask.id = 'feishu-preview-mask';
    const drawer = document.createElement('div');
    drawer.id = 'feishu-preview-drawer';
    
    const colorButtons = THEME_PRESETS.map(p => 
        `<div class="color-btn ${p.color === CURRENT_CONFIG.themeColor ? 'active' : ''}" style="background:${p.color}" data-color="${p.color}" title="${p.name}"></div>`
    ).join('');
    const sizeButtons = ['14px', '15px', '16px', '17px'].map(s => 
        `<button class="size-btn ${s === CURRENT_CONFIG.fontSize ? 'active' : ''}" data-size="${s}">${s.replace('px', '')}</button>`
    ).join('');

    drawer.innerHTML = `
        <div class="drawer-header"><span class="drawer-title">公众号排版预览</span><button class="drawer-close">×</button></div>
        <div class="drawer-settings">
            <div class="setting-row"><span class="setting-label">主题色</span><div class="setting-content" id="setting-color">${colorButtons}</div></div>
            <div class="setting-row"><span class="setting-label">字号</span><div class="setting-content" id="setting-size">${sizeButtons}</div></div>
        </div>
        <div class="drawer-content"><div class="mobile-view" id="preview-container">${initialHtml}</div></div>
        <div class="drawer-footer"><button class="btn-copy" id="final-copy-btn">复制到公众号编辑器</button></div>
    `;
    document.body.appendChild(mask);
    document.body.appendChild(drawer);
    requestAnimationFrame(() => drawer.classList.add('open'));

    const closeHandler = () => {
        drawer.classList.remove('open'); mask.style.opacity = '0';
        setTimeout(() => { if (drawer.parentNode) drawer.remove(); if (mask.parentNode) mask.remove(); }, 300);
    };
    drawer.querySelector('.drawer-close').onclick = closeHandler; mask.onclick = closeHandler;

    const reRender = () => {
        const styles = getWxStyles(CURRENT_CONFIG);
        document.getElementById('preview-container').innerHTML = renderToHtml(GLOBAL_BLOCKS, styles);
        saveConfig();
    };

    document.getElementById('setting-color').onclick = (e) => {
        if (e.target.classList.contains('color-btn')) {
            CURRENT_CONFIG.themeColor = e.target.getAttribute('data-color');
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active'); reRender();
        }
    };
    document.getElementById('setting-size').onclick = (e) => {
        if (e.target.classList.contains('size-btn')) {
            CURRENT_CONFIG.fontSize = e.target.getAttribute('data-size');
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active'); reRender();
        }
    };
    const copyBtn = document.getElementById('final-copy-btn');
    copyBtn.onclick = () => {
        copyToClipboard(document.getElementById('preview-container').innerHTML);
        copyBtn.textContent = "已复制！"; copyBtn.style.background = "#67c23a";
        setTimeout(closeHandler, 800);
    };
}

// ==========================================
// 7. 采集内核
// ==========================================
const CONTENT_POOL = new Map();
const GARBAGE_TEXTS = ["本文暂未被其它文档引用", "本文被以下文档引用", "No references", "References to", "添加评论", "分享", "复制链接"];

async function scrollAndCollect() {
    CONTENT_POOL.clear();
    const scrollContainer = findMainContentContainer();
    if (!scrollContainer) throw new Error("无法找到正文滚动区域");
    collectVisibleBlocks();
    if (scrollContainer.scrollHeight <= scrollContainer.clientHeight + 100) return getSortedBlocks();
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
    for (const sel of prioritySelectors) { const el = document.querySelector(sel); if (el && isScrollable(el)) return el; }
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

function extractWikiBlocks(nodes) {
    nodes.forEach((node, index) => {
        if (node.closest('.block[class*="docx-table"]') && !node.className.includes('table')) return;
        if (node.closest('.block[class*="docx-quote"]') && node !== node.closest('.block[class*="docx-quote"]')) return;
        if (node.className.includes('toc') || node.closest('.docx-toc-block')) return;

        const id = node.getAttribute('data-block-id') || `wiki_${index}`;
        if (CONTENT_POOL.has(id)) return;

        const typeInfo = identifyType(node);
        if (!typeInfo) return;

        const textContent = extractFormattedText(node.querySelector('.text-editor') || node);
        if (GARBAGE_TEXTS.some(g => textContent.includes(g))) return;
        
        let extra = {};
        if (typeInfo.type === 'callout') {
            const cls = node.className || '';
            const emojiNode = node.querySelector('.emoji') || node.querySelector('.callout-emoji');
            
            if (cls.includes('red')) extra.color = 'red';
            else if (cls.includes('yellow')) extra.color = 'yellow';
            else if (cls.includes('green')) extra.color = 'green';
            else if (cls.includes('blue')) extra.color = 'blue';
            else if (cls.includes('purple')) extra.color = 'purple';
            else if (cls.includes('grey') || cls.includes('gray')) extra.color = 'grey';
            else extra.color = 'default';

            extra.emoji = emojiNode ? emojiNode.innerText : '💡';
        }

        if (!textContent && typeInfo.type !== 'image' && typeInfo.type !== 'divider') return;
        
        CONTENT_POOL.set(id, { id, type: typeInfo.type, level: typeInfo.level, content: textContent, src: typeInfo.src, ...extra });
    });
}

function extractAceLines(nodes) {
    nodes.forEach((node, index) => {
        if (node.classList.contains('toc-block')) return;
        const id = `ace_${index}`;
        if (CONTENT_POOL.has(id)) return;
        
        let type = 'p', level = 0, src = null;
        const cls = node.className || "";
        
        if (node.querySelector('hr') || cls.includes('divider')) type = 'divider';
        else if (cls.match(/heading-h(\d)/)) { type = 'heading'; level = parseInt(cls.match(/heading-h(\d)/)[1]); }
        else if (cls.includes('list-')) { type = cls.includes('ordered') ? 'ol' : 'ul'; }
        else if (cls.includes('quote')) { type = 'quote'; }
        else if (cls.includes('gallery')) { type = 'image'; const img = node.querySelector('img'); if (img) src = img.src; }
        
        const textContent = extractFormattedText(node);
        if (GARBAGE_TEXTS.some(g => textContent.includes(g))) return;
        if (!textContent && !src && type !== 'divider') return;
        
        CONTENT_POOL.set(id, { id, type, level, content: textContent, src });
    });
}

function getSortedBlocks() { return Array.from(CONTENT_POOL.values()); }

function identifyType(node) {
    const cls = node.className || "";
    if (cls.includes('heading')) { const match = cls.match(/heading(\d)/); return { type: 'heading', level: match ? parseInt(match[1]) : 1 }; }
    if (cls.includes('image')) { const img = node.querySelector('img'); return img ? { type: 'image', src: img.src } : null; }
    if (cls.includes('bullet') || cls.includes('list')) return { type: 'ul' };
    if (cls.includes('ordered')) return { type: 'ol' };
    if (cls.includes('quote')) return { type: 'quote' };
    if (cls.includes('callout')) return { type: 'callout' };
    if (cls.includes('code')) return { type: 'code' };
    if (cls.includes('divider')) return { type: 'divider' };
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
            const s = getWxStyles(CURRENT_CONFIG);
            const isBold = tag === 'b' || tag === 'strong' || (style.includes('font-weight') && (style.includes('bold') || style.includes('700')));
            const isCode = node.classList.contains('inline-code');
            const isLink = tag === 'a';
            let inner = ""; const temp = []; const originalPush = result.push; result.push = (item) => temp.push(item);
            node.childNodes.forEach(traverse);
            result.push = originalPush; inner = temp.join("");
            if (!inner) return;
            if (isBold) inner = `<span style="${s.bold}">${inner}</span>`;
            if (isCode) inner = `<span style="${s.inlineCode}">${inner}</span>`;
            if (isLink) inner = `<a href="${node.href}" style="${s.link}">${inner}</a>`;
            result.push(inner);
        }
    };
    root.childNodes.forEach(traverse);
    return result.join("");
}

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

function renderToHtml(blocks, styles) {
    if (!styles) styles = getWxStyles(CURRENT_CONFIG);
    let html = `<div style="${styles.container}">`;
    let currentListType = null;
    blocks.forEach((block) => {
        const isList = block.type === 'ul' || block.type === 'ol';
        if (isList) {
            if (currentListType && currentListType !== block.type) { html += `</${currentListType}>`; currentListType = null; }
            if (!currentListType) { currentListType = block.type; html += `<${currentListType} style="${styles[currentListType]}">`; }
        } else {
            if (currentListType) { html += `</${currentListType}>`; currentListType = null; }
        }
        
        let content = block.content || "";
        if (isList) content = content.replace(/^(&nbsp;|\s|[0-9]+\.|[•·●])+/g, '').trim();
        
        switch (block.type) {
            case 'heading':
                const hStyle = block.level === 1 ? styles.h1 : (block.level === 2 ? styles.h2 : styles.h3);
                html += `<h${block.level} style="${hStyle}">${content}</h${block.level}>`; break;
            case 'ul': case 'ol':
                html += `<li style="${styles.li}"><section style="display:inline;">${content}</section></li>`; break;
            case 'quote': html += `<blockquote style="${styles.quote}">${content}</blockquote>`; break;
            
            // --- 核心修复：Callout 改用 section 容器，且样式全拆解 ---
            case 'callout':
                const theme = CALLOUT_THEMES[block.color] || CALLOUT_THEMES.default;
                html += `
                    <section style="margin: 20px 0; padding: 15px; background-color: ${theme.bg}; border-width: 1px; border-style: solid; border-color: ${theme.border}; border-radius: 4px; display: flex; align-items: flex-start; box-sizing: border-box;">
                        <section style="margin-right: 12px; font-size: 20px; line-height: 1.2;">${block.emoji || theme.icon}</section>
                        <section style="flex: 1; min-width: 0; font-size: ${styles.p.match(/font-size:\s*([^;]+)/)[1]}; line-height: ${styles.p.match(/line-height:\s*([^;]+)/)[1]}; color: #333;">${content}</section>
                    </section>
                `;
                break;
                
            case 'code': html += `<div style="${styles.code}">${content}</div>`; break;
            case 'image': if (block.src) html += `<img src="${block.src}" style="${styles.image}" />`; break;
            case 'divider': html += `<hr style="${styles.divider}" />`; break;
            default: if (content) html += `<p style="${styles.p}">${content}</p>`;
        }
    });
    if (currentListType) html += `</${currentListType}>`;
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
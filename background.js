// 飞书文档转微信公众号插件后台脚本

// 监听插件安装事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('飞书文档转微信公众号插件已安装');
    // 可以在这里添加首次安装的欢迎信息或引导
  } else if (details.reason === 'update') {
    console.log('飞书文档转微信公众号插件已更新');
  }
});

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当标签页加载完成且URL包含飞书文档域名时
  if (changeInfo.status === 'complete' && 
      (tab.url.includes('feishu.cn') || tab.url.includes('larksuite.com'))) {
    // 可以在这里执行一些初始化操作
    console.log('检测到飞书文档页面加载完成:', tab.url);
  }
});

// 监听标签页激活事件
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url.includes('feishu.cn') || tab.url.includes('larksuite.com')) {
      console.log('切换到飞书文档页面:', tab.url);
    }
  });
});

// 监听消息事件（可选，用于处理来自content.js或popup.js的消息）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request, '来自:', sender.tab ? sender.tab.url : 'extension');
  
  // 可以在这里添加消息处理逻辑
  // 例如：处理跨标签页通信、调用其他API等
  
  // 必须返回true以保持消息通道打开（如果需要异步响应）
  return false;
});

// 监听扩展卸载事件
chrome.runtime.onSuspend.addListener(() => {
  console.log('插件即将卸载或暂停');
  // 可以在这里保存插件状态或执行清理操作
});

// 示例：添加一个上下文菜单（可选功能）
chrome.runtime.onInstalled.addListener(() => {
  // 在飞书文档页面上添加右键菜单
  chrome.contextMenus.create({
    id: 'extractFeishuContent',
    title: '提取飞书文档内容',
    contexts: ['page'],
    documentUrlPatterns: ['*://*.feishu.cn/*', '*://*.larksuite.com/*']
  });
});

// 监听上下文菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extractFeishuContent') {
    // 向content.js发送消息，提取内容
    chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }, (response) => {
      if (response && response.content) {
        console.log('通过右键菜单提取到内容:', response.content.title);
        // 可以在这里添加通知或其他操作
      }
    });
  }
});
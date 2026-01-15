// 监听插件图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  // 简单的 URL 校验，避免在非飞书页面报错
  if (tab.url.includes("feishu.cn") || tab.url.includes("larksuite.com")) {
    try {
      // 向当前标签页的 content.js 发送消息
      await chrome.tabs.sendMessage(tab.id, { action: "convert_and_copy" });
      console.log("指令已发送至 content.js");
    } catch (error) {
      console.error("发送指令失败 (可能是页面未加载完成):", error);
    }
  } else {
    console.log("当前不是飞书文档页面，忽略点击");
  }
});
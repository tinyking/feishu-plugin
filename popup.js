document.getElementById('convertBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = "正在处理图片，请稍候..."; // 提示用户
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: "convert_and_copy" }, (response) => {
    if (chrome.runtime.lastError) {
      statusDiv.textContent = "错误: 请刷新页面重试";
      statusDiv.style.color = "red";
      return;
    }

    if (response && response.success) {
      statusDiv.textContent = "复制成功！包含图片！";
      statusDiv.style.color = "green";
    } else {
      statusDiv.textContent = "失败: " + (response ? response.msg : "未知错误");
      statusDiv.style.color = "red";
    }
  });
});
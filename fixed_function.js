// 格式化爆款标题为AI聊天消息内容
function formatHotTitleResult(text) {
  // 修改为返回纯Markdown格式的文本，避免HTML和JavaScript混合导致的渲染问题
  const titles = text.split('\n').filter(Boolean);
  let markdown = '### 爆款标题推荐：\n\n';
  
  // 将每个标题格式化为Markdown列表项
  titles.forEach((title, index) => {
    markdown += `${index + 1}. ${title.trim()}\n\n`;
  });
  
  return markdown;
}

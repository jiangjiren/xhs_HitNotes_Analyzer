// 我们的自定义marked解析器不需要配置选项
// 所有配置都已内置在解析器中

// 预处理文本
function preprocessText(text) {
  if (!text) return '';
  
  // 确保输入是字符串
  text = String(text);
  
  return text
    // 移除零宽字符等不可见字符
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // 修复标题格式（确保#后面有空格）
    .replace(/^(#{1,6})([^#\s])/gm, '$1 $2')
    // 修复列表格式
    .replace(/^([+-])\s*([^\s])/gm, '$1 $2')
    .replace(/^(\*)\s*([^\s*])/gm, '$1 $2')
    .replace(/^(\d+)\.?\s*([^\s])/gm, '$1. $2')
    // 处理特殊中文列表标记
    .replace(/^[•·。]\s*/gm, '- ')
    .replace(/^(\d+)[、．]\s*/gm, '$1. ')
    // 清理异常的列表项格式
    .replace(/^[•·]\s*[-–—]+\s*$/gm, '') // 移除只有符号的无效列表项
    .replace(/^[-*+]\s*[-–—]+\s*$/gm, '') // 移除只有符号的无效列表项
    // 将3个及以上的换行符替换为2个，保留段落间距
    .replace(/\n{3,}/g, '\n\n')
    // 清理每行尾部的空格和制表符
    .replace(/[ \t]+$/gm, '')
    // 移除连续的空行
    .replace(/^\s*\n/gm, '\n')
    .trim();
}

// 主解析函数
function parseMarkdown(text, isStream = false) {
  try {
    if (!text) {
      console.warn('Empty text provided to parseMarkdown');
      return '<div class="markdown-body"><p class="markdown-paragraph">No content</p></div>';
    }

    console.log('🔍 parseMarkdown 输入文本前50字符:', text.substring(0, 50));
    
    // 预处理文本
    const processedText = preprocessText(text);
    console.log('🔧 预处理后文本前50字符:', processedText.substring(0, 50));
    
    // 使用marked解析Markdown
    const html = marked(processedText);
    console.log('✅ marked解析后HTML前100字符:', html.substring(0, 100));
    
    // 包装在markdown-body中并添加样式类
    const result = `<div class="markdown-body">${html}</div>`;
    console.log('📦 最终结果前100字符:', result.substring(0, 100));
    
    return result;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    // 如果解析失败，安全地显示原始文本
    return `<div class="markdown-body"><p class="markdown-paragraph">${String(text).replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]))}</p></div>`;
  }
}

// 导出函数
window.parseMarkdown = parseMarkdown;

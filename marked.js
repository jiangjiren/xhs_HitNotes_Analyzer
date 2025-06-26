// marked.js - 简化的Markdown解析器
(function(global) {
  'use strict';

  function marked(src) {
    if (!src) return '';
    
    // 预处理：确保换行符统一
    src = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const lines = src.split('\n');
    let html = '';
    let inList = false;
    let listType = ''; // 'ul' or 'ol'

    function closeList() {
      if (inList) {
        html += (listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
    }

    function inlineFormat(text) {
      if (!text) return '';
      return text
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2">') // 图片
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>') // 链接
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/(\s|^)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank">$2</a>'); // 自动链接
    }

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // 代码块
      if (line.startsWith('```')) {
        closeList();
        const lang = line.slice(3).trim();
        html += `<pre><code class="language-${lang}">`;
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          html += lines[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n';
          i++;
        }
        html += '</code></pre>';
        continue;
      }

      // 标题
      const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (headerMatch) {
        closeList();
        const level = headerMatch[1].length;
        const content = inlineFormat(headerMatch[2].trim());
        html += `<h${level}>${content}</h${level}>`;
        continue;
      }

      // 列表项
      const ulMatch = line.match(/^([*+-]|\s*•)\s+(.*)/);
      const olMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (ulMatch || olMatch) {
        const itemContent = ulMatch ? ulMatch[2] : olMatch[2];
        const currentType = ulMatch ? 'ul' : 'ol';
        
        // 验证列表项内容的有效性
        const trimmedContent = itemContent.trim();
        if (!trimmedContent || 
            trimmedContent === '--' || 
            trimmedContent === '-' || 
            trimmedContent === '—' ||
            /^[-–—]+$/.test(trimmedContent)) {
          // 跳过无效的列表项内容
          continue;
        }
        
        if (!inList || listType !== currentType) {
          closeList();
          inList = true;
          listType = currentType;
          html += (listType === 'ul' ? '<ul>' : '<ol>');
        }
        
        html += `  <li>${inlineFormat(itemContent)}</li>`;
        continue;
      }
      
      // 空行
      if (line.trim() === '') {
        closeList();
        continue;
      }

      // 普通段落
      closeList();
      html += `<p>${inlineFormat(line)}</p>`;
    }

    closeList(); // 确保文件末尾的列表被关闭
    return html;
  }

  // 导出marked函数
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = marked;
  } else {
    global.marked = marked;
  }
})(typeof window !== 'undefined' ? window : this);
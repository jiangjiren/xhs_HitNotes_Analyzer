/* global config */

// 确保消息监听器只被添加一次
if (!window.messageListenerAdded) {
  window.messageListenerAdded = true;
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script收到消息:', message);  // 添加日志
    
    try {
      switch (message.action) {
        case 'checkReady':
          console.log('检查页面就绪状态');  // 添加日志
          sendResponse(true);
          return false; // 同步响应，不需要保持通道开放
        
      case 'startCollecting':
        console.log('开始采集命令:', message);  // 添加日志
        console.log('设置最小点赞数为:', message.minLikes); // 新增日志，确认minLikes参数
        isCollecting = true;
        collectedData = []; // 重置已采集数据
        lastScrollHeight = 0;
        currentNoteIndex = 0;
        successCount = 0;
        maxNotesToCollect = message.maxNotes || 100;
        minLikes = message.minLikes !== undefined ? message.minLikes : 0;
        // 重置采集完成标志，确保新的采集过程可以正常发送完成消息
        window.collectionCompleteSent = false;
        // 重置导出状态标志
        window.dataExported = false;
        console.log('当前minLikes值:', minLikes); // 新增日志，确认minLikes变量赋值
        
        // 发送初始状态更新
        chrome.runtime.sendMessage({
            type: 'updateStatus',
            text: `开始采集笔记，目标：${maxNotesToCollect}篇（点赞数≥${minLikes}）`
        });
        
        autoScroll(); // 修改：调用autoScroll函数而不是不存在的collectNotes函数
        sendResponse(true); // 立即发送响应
        return false; // 同步响应，不需要保持通道开放
        
      case 'stopCollecting':
        console.log('停止采集命令');  // 添加日志
        isCollecting = false;
        // 停止采集时，如果有数据且尚未导出，则导出
        if (collectedData.length > 0 && !window.dataExported) {
            exportData();
            // 使用统一的函数发送采集完成消息
            sendCollectionComplete('用户停止采集');
        }
        sendResponse(true);
        return false; // 同步响应，不需要保持通道开放
        
      case 'exportData':
        // 手动导出命令，如果有数据且尚未导出，则执行导出
        if (collectedData.length > 0 && !window.dataExported) {
            exportData();
        }
        sendResponse(true);
        return false; // 同步响应，不需要保持通道开放
        
      case 'getCurrentPageContent':
        console.log('收到获取当前页面内容请求');
        try {
          const pageContent = getCurrentPageContent();
          console.log('返回页面内容:', pageContent);
          sendResponse(pageContent);
        } catch (error) {
          console.error('获取页面内容时出错:', error);
          sendResponse({
            success: false,
            message: '获取页面内容时出错: ' + error.message
          });
        }
        return true; // 异步响应，需要保持通道开放
        
        default:
          return true;  // 默认保持通道开放，以防有异步响应
      }
      
      return true;  // 默认保持通道开放，以防有异步响应
    } catch (error) {
      console.error('Content script处理消息时出错:', error);
      sendResponse({ success: false, error: error.message });
      return false;
    }
  });
}

let isCollecting = false;
let collectedData = [];
let lastScrollHeight = 0;
let maxNotesToCollect = 10;
let minLikes = 500;
let successCount = 0;
let currentNoteIndex = 0;

// 页面加载时的初始化日志
console.log('小红书采集助手Content Script已加载');
console.log('当前页面URL:', window.location.href);
console.log('页面准备状态:', document.readyState);

// 初始化导出状态标志
if (window.dataExported === undefined) {
    window.dataExported = false;
}

// 解析数字文本（处理"1万"这样的格式）
function parseNumber(text) {
    if (!text) return 0;
    text = text.trim();
    if (text.includes('万')) {
        return parseFloat(text.replace('万', '')) * 10000;
    }
    return parseInt(text) || 0;
}

// 导出数据
function exportData() {
    // 检查是否有数据可导出
    if (collectedData.length === 0) {
        chrome.runtime.sendMessage({type: 'updateStatus', text: '没有可导出的数据'});
        return;
    }
    
    // 检查是否已经导出过数据
    if (window.dataExported) {
        console.log('数据已经导出过，不再重复导出');
        return;
    }
    
    // 设置导出状态标志
    window.dataExported = true;

    // 创建时间戳
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;

    // 导出XLSX (Excel)文件
    // 准备表格数据
    const headers = ['标题', '作者', '点赞数', '收藏数', '评论数', '发布时间', '链接', '笔记内容'];
    const data = collectedData.map(item => [
        item.title,
        item.author,
        item.likes,
        item.collects,
        item.comments,
        item.editDate,
        item.link,
        item.content
    ]);
    
    // 将数据发送到background.js处理Excel生成
    chrome.runtime.sendMessage({
        action: 'generateExcel',
        headers: headers,
        data: data,
        filename: `小红书爆款笔记数据_${timestamp}.xlsx`,
        rowHeight: 20 // 设置行高为20像素
    }, response => {
        if (response && response.status === 'success') {
            console.log('Excel文件生成成功');
        } else {
            console.error('Excel文件生成失败');
        }
    });

    // 导出TXT - 修改格式，添加点赞、收藏、评论数量到标题下面一行
    const txtContent = collectedData.map(data => 
        `标题：${data.title}\n点赞：${data.likes} | 收藏：${data.collects} | 评论：${data.comments}\n\n${data.content}\n\n----------------------------------------\n\n`
    ).join('');

    // 不再在这里发送AI分析请求，改为在popup.js中统一处理
    // 将格式化的文本内容保存到全局变量，供后续分析使用
    window.formattedAnalysisContent = txtContent;

    // 下载TXT文件
    chrome.runtime.sendMessage({
        action: 'downloadFile',
        content: txtContent,
        filename: `小红书爆款笔记内容_${timestamp}.txt`
    });
    
    // 更新状态
    chrome.runtime.sendMessage({
        type: 'updateStatus',
        text: '数据导出完成，准备AI分析...'
    });
    
    console.log('数据导出完成，已设置导出状态标志');
}

// 修改：处理笔记详情
async function processNoteDetail(noteElement) {
    try {
        // 更新选择器，适应新的页面结构
        const coverElement = noteElement.querySelector('a.cover.mask.ld') || 
                            noteElement.querySelector('a.cover.mask') || 
                            noteElement.querySelector('a[href*="/search_result/"]');
        if (!coverElement) return null;
        
        console.log('找到封面元素，准备点击:', coverElement);
        
        // 模拟点击封面图片
        coverElement.click();
        
        // 等待弹窗加载
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 等待并确保所有需要的元素都加载完成
        let retryCount = 0;
        let noteData = null;
        
        while (retryCount < 5) { // 最多重试5次
            // 获取详情信息
            let noteContent = '';
            
            // 更新选择器，适应新的弹窗结构
            const detailDesc = document.querySelector('.content .desc') || 
                              document.querySelector('.content .content') || 
                              document.querySelector('#detail-desc') || 
                              document.querySelector('.note-content');
            
            // 更新选择器，适应新的交互按钮结构 - 基于用户提供的HTML结构
            const buttonsSection = document.querySelector('.buttons.engage-bar-style') || 
                                  document.querySelector('.like-collect-container .like-wrapper') || 
                                  document.querySelector('.operation-wrapper .like-wrapper') || 
                                  document.querySelector('div[data-v-fe12f9f2].interact-container .buttons .left') || 
                                  document.querySelector('div[data-v-3eeaf146].left');
            
            // 获取发布时间 - 更新选择器
            const dateElement = document.querySelector('.publish-time') || 
                              document.querySelector('.time') || 
                              document.querySelector('.date[selected-disabled-search]');
            
            const editDate = dateElement ? formatDate(dateElement.textContent.replace('编辑于', '').trim()) : '';
            
            console.log('弹窗元素状态:', {
                detailDesc: !!detailDesc,
                buttonsSection: !!buttonsSection,
                dateElement: !!dateElement
            });
            
            if (detailDesc) {
                // 获取笔记内容 - 更新选择器
                const noteTextSpan = detailDesc.querySelector('.desc span') || 
                                   detailDesc.querySelector('.content span') || 
                                   detailDesc.querySelector('.note-text > span') || 
                                   detailDesc;
                
                if (noteTextSpan) {
                    noteContent = noteTextSpan.textContent.trim();
                    // 移除标签文本和@用户文本
                    noteContent = noteContent.replace(/#[^\s#]+/g, '').trim();
                    noteContent = noteContent.replace(/@[^\s@]+/g, '').trim();
                    console.log('成功获取笔记内容，长度:', noteContent.length);
                }
            }
            
            // 获取收藏数和评论数
            let collectCount = 0;
            let commentCount = 0;
            
            // 基于用户提供的HTML结构更新选择器
            if (buttonsSection) {
                console.log('找到交互按钮区域:', buttonsSection);
                
                // 直接查找所有的.count元素
                const countElements = buttonsSection.querySelectorAll('.count');
                console.log('找到count元素数量:', countElements.length);
                
                // 输出所有count元素的文本内容，帮助调试
                countElements.forEach((el, index) => {
                    console.log(`count元素 ${index}:`, el.textContent);
                });
                
                // 通常第一个是点赞数，第二个是收藏数，第三个是评论数
                if (countElements.length >= 3) {
                    // 跳过点赞数，直接获取收藏数和评论数
                    collectCount = parseNumber(countElements[1].textContent);
                    commentCount = parseNumber(countElements[2].textContent);
                    console.log('从count元素序列中获取数据 - 收藏:', collectCount, '评论:', commentCount);
                } else {
                    // 如果元素数量不足，尝试通过父元素类名来定位
                    const collectWrapper = buttonsSection.querySelector('.collect-wrapper .count');
                    const chatWrapper = buttonsSection.querySelector('.chat-wrapper .count');
                    
                    if (collectWrapper) {
                        collectCount = parseNumber(collectWrapper.textContent);
                        console.log('从collect-wrapper中获取收藏数:', collectCount);
                    }
                    
                    if (chatWrapper) {
                        commentCount = parseNumber(chatWrapper.textContent);
                        console.log('从chat-wrapper中获取评论数:', commentCount);
                    }
                }
            }
            
            // 只有当所有数据都获取到时才认为采集成功
            if (noteContent) {
                noteData = {
                    content: noteContent,
                    collects: collectCount,
                    comments: commentCount,
                    editDate: editDate
                };
                console.log('成功获取笔记详情数据:', noteData);
                break; // 数据完整，退出重试循环
            }
            
            // 如果数据不完整，等待后重试
            console.log('笔记详情数据不完整，等待重试...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            retryCount++;
        }
        
        // 关闭弹窗前确保数据已采集完成
        if (noteData) {
            // 更新选择器，适应新的关闭按钮结构
            const closeButton = document.querySelector('.close-btn') || 
                              document.querySelector('.close') || 
                              document.querySelector('.close-box');
            
            if (closeButton) {
                console.log('找到关闭按钮，点击关闭弹窗');
                closeButton.click();
            } else {
                console.log('未找到关闭按钮，尝试按ESC键关闭');
                // 尝试按ESC键关闭
                document.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    keyCode: 27,
                    which: 27,
                    bubbles: true
                }));
            }
            
            // 等待弹窗关闭
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.log('未能获取笔记详情数据，尝试关闭弹窗');
            // 尝试关闭弹窗
            const closeButton = document.querySelector('.close-btn') || 
                              document.querySelector('.close') || 
                              document.querySelector('.close-box');
            
            if (closeButton) {
                closeButton.click();
            } else {
                // 尝试按ESC键关闭
                document.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'Escape',
                    code: 'Escape',
                    keyCode: 27,
                    which: 27,
                    bubbles: true
                }));
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return noteData;
    } catch (error) {
        console.error('处理笔记详情时出错:', error);
        return null;
    }
}

// 修改：自动滚动
async function autoScroll() {
    if (!isCollecting) return;

    // 先处理当前页面上的笔记
    await parseNoteData();
    
    // 如果已经停止采集或达到目标数量，则退出
    if (!isCollecting || successCount >= maxNotesToCollect) {
        // 在发送采集完成消息前先导出数据（如果尚未导出）
        if (collectedData.length > 0 && !window.dataExported) {
            await exportData();
        }
        
        // 使用统一的函数发送采集完成消息
        sendCollectionComplete('采集完成');
        return;
    }

    const scrollHeight = document.documentElement.scrollHeight;
    
    // 如果页面高度没有变化，可能已经到底部
    if (scrollHeight === lastScrollHeight) {
        chrome.runtime.sendMessage({type: 'updateStatus', text: '已到达页面底部'});
        // 如果已经到底部且有数据，则停止采集
        if (collectedData.length > 0 && !window.dataExported) {
            isCollecting = false;
            await exportData();
            sendCollectionComplete('已到达页面底部');
        }
        return;
    }
    
    lastScrollHeight = scrollHeight;
    window.scrollTo(0, scrollHeight);
    
    // 增加等待时间，确保新内容完全加载
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 发送滚动状态更新
    chrome.runtime.sendMessage({
        type: 'updateStatus',
        text: `正在滚动加载更多笔记... 已采集 ${successCount}/${maxNotesToCollect} 篇`
    });
    
    // 等待新笔记元素出现
    let retryCount = 0;
    let previousCount = 0;
    
    while (retryCount < 5) {
        // 更新选择器，适应新的页面结构
        const currentNotes = document.querySelectorAll('section.note-item').length;
        if (currentNotes > previousCount) {
            // 发现新笔记，等待它们完全渲染
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
        previousCount = currentNotes;
    }
    
    // 如果还在采集且未达到目标数量，继续滚动
    if (isCollecting && successCount < maxNotesToCollect) {
        autoScroll();
    }
}

// 添加：统一发送采集完成消息的函数
function sendCollectionComplete(reason) {
    // 添加一个标志，防止重复发送
    if (window.collectionCompleteSent) return;
    
    window.collectionCompleteSent = true;
    chrome.runtime.sendMessage({
        type: 'collectionComplete',
        text: `已采集 ${successCount} 篇笔记，${reason}`,
        data: collectedData || [], // 包含采集到的数据
        formattedContent: window.formattedAnalysisContent || '' // 包含格式化的文本内容
    });
}

// 修改：解析笔记数据
async function parseNoteData() {
    // 更新选择器，适应新的页面结构
    const notes = document.querySelectorAll('section.note-item');
    console.log('找到笔记元素数量:', notes.length); // 新增日志
    console.log('当前最小点赞数设置:', minLikes); // 新增日志
    
    // 每次解析时重置索引，检查所有可见的笔记
    currentNoteIndex = 0;
    
    // 创建一个Map来存储当前页面上所有笔记的ID，确保在一次解析中不会重复处理
    const currentPageNoteIds = new Map();
    
    // 首先遍历所有笔记，提取ID并存储到Map中
    // 这样可以确保即使页面上有重复的笔记元素，我们也只处理每个ID一次
    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const linkElement = note.querySelector('a.cover.mask.ld') || note.querySelector('a.cover.mask') || note.querySelector('a[href*="/search_result/"]');
        if (!linkElement) continue;
        
        // 提取笔记ID
        const noteId = linkElement.href.split('/').pop().split('?')[0];
        
        // 只存储第一次出现的笔记元素
        if (!currentPageNoteIds.has(noteId)) {
            currentPageNoteIds.set(noteId, note);
        }
    }
    
    console.log('当前页面上不重复的笔记数量:', currentPageNoteIds.size);
    
    // 然后只处理Map中的笔记，确保每个ID只处理一次
    for (const [noteId, note] of currentPageNoteIds.entries()) {
        if (!isCollecting) {
            break;
        }
        if (successCount >= maxNotesToCollect) {
            isCollecting = false;
            sendCollectionComplete('已达到最大抓取数量');
            break;
        }
        
        // 更新选择器，适应新的页面结构
        const linkElement = note.querySelector('a.cover.mask.ld') || note.querySelector('a.cover.mask') || note.querySelector('a[href*="/search_result/"]');
        if (!linkElement) continue;
        
        // 检查是否已采集
        if (collectedData.some(item => item.id === noteId)) {
            console.log('跳过已采集的笔记:', noteId);
            continue;
        }
        
        // 尝试多种可能的选择器来获取点赞数
        // 根据提供的HTML结构更新选择器
        let likeElement = note.querySelector('.like-wrapper .count');
        
        // 如果第一种选择器没找到，尝试其他可能的选择器
        if (!likeElement) {
            likeElement = note.querySelector('.count[selected-disabled-search]');
            if (!likeElement) {
                likeElement = note.querySelector('.like-wrapper span.count');
                if (!likeElement) {
                    // 尝试查找所有包含数字的元素，并检查它们的文本内容
                    const allCountElements = note.querySelectorAll('.count');
                    console.log('笔记ID:', noteId, '找到的所有count元素:', allCountElements.length);
                    
                    // 输出所有count元素的文本内容，帮助调试
                    allCountElements.forEach((el, index) => {
                        console.log(`count元素 ${index}:`, el.textContent);
                    });
                    
                    // 如果找到了count元素，使用第一个
                    if (allCountElements.length > 0) {
                        likeElement = allCountElements[0];
                    }
                }
            }
        }
        
        // 输出调试信息，查看点赞元素是否存在
        console.log('笔记ID:', noteId, '点赞元素:', likeElement); // 新增日志
        
        const likesCount = parseNumber(likeElement ? likeElement.textContent : '0');
        console.log('笔记ID:', noteId, '解析到的点赞数:', likesCount, '最小点赞数要求:', minLikes); // 新增日志
        
        // 检查点赞数是否达到阈值
        if (likesCount < minLikes) {
            console.log('笔记ID:', noteId, '点赞数不足，跳过'); // 新增日志
            continue;
        }
        
        // 更新选择器，适应新的页面结构
        const titleElement = note.querySelector('.title span') || note.querySelector('.title');
        const authorElement = note.querySelector('.author .name') || note.querySelector('.name');
        
        console.log('发现符合条件的笔记:', {
            id: noteId,
            likes: likesCount,
            title: titleElement ? titleElement.textContent : '未知标题'
        });
        
        // 获取详情数据并等待完成
        const detailData = await processNoteDetail(note);
        
        // 只有当详情数据采集成功时才保存
        if (detailData) {
            const data = {
                id: noteId,
                title: titleElement ? titleElement.textContent.trim() : '未知标题',
                author: authorElement ? authorElement.textContent.trim() : '未知作者',
                likes: likesCount,
                link: linkElement.href,
                ...detailData
            };
            
            collectedData.push(data);
            successCount++;
            
            chrome.runtime.sendMessage({
                type: 'updateStatus',
                text: `成功采集 ${successCount} 篇笔记（点赞数≥${minLikes}）`
            });
            
            // 成功采集一条后等待一定时间再继续
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log('笔记详情采集失败，跳过:', noteId);
        }
    }
}

function startCollecting({ maxNotes, minLikes }) {
    console.log('开始采集命令:', { action: 'startCollecting', maxNotes, minLikes });
    console.log('设置最小点赞数为:', minLikes);
    
    // 添加进度显示更新
    chrome.runtime.sendMessage({
        action: 'updateProgress',
        collected: 0,
        total: maxNotes,
        status: '采集中...'
    });
}

function processNote(noteElement) {
    // ... existing note processing code ...

    if (likes >= minLikes) {
        console.log('发现符合条件的笔记:', { id: noteId, likes, title });
        
        // 在找到符合条件的笔记时更新进度
        chrome.runtime.sendMessage({
            action: 'updateProgress',
            collected: collectedNotes.length,
            total: maxNotes,
            status: `已采集 ${collectedNotes.length}/${maxNotes}`
        });
        
        // ... rest of note processing
    }
}

// 添加：获取当前页面内容的函数
function getCurrentPageContent() {
  try {
    console.log('开始获取当前页面内容');
    
    // 判断是否在笔记详情页
    const isNotePage = window.location.href.includes('xhslink.com') || 
                       window.location.href.includes('xiaohongshu.com/explore') || 
                       window.location.href.includes('xiaohongshu.com/discovery/item');
    
    if (!isNotePage) {
      return {
        success: false,
        message: '当前页面不是小红书笔记页面，请打开一篇小红书笔记后再试'
      };
    }
    
    // 获取笔记标题
    const titleElement = document.querySelector('.title') || 
                         document.querySelector('._7qjlx') || 
                         document.querySelector('h1');
    const title = titleElement ? titleElement.textContent.trim() : '未能获取标题';
    
    // 获取笔记内容
    const contentElement = document.querySelector('.content') || 
                           document.querySelector('._50x5m') || 
                           document.querySelector('.desc');
    const content = contentElement ? contentElement.textContent.trim() : '未能获取内容';
    
    // 获取互动数据（点赞、收藏、评论）
    let likes = 0, collects = 0, comments = 0;
    
    // 使用更通用的选择器
    const engageBar = document.querySelector('.buttons.engage-bar-style') || 
                      document.querySelector('.interact-bar');
    
    if (engageBar) {
      const countElements = engageBar.querySelectorAll('.count');
      if (countElements.length >= 3) {
        likes = parseNumber(countElements[0].textContent);
        collects = parseNumber(countElements[1].textContent);
        comments = parseNumber(countElements[2].textContent);
      } else {
        // 备选方案：通过父元素类名定位
        const likeElement = document.querySelector('.like .count') || 
                            document.querySelector('[data-v-icon="like"] .count');
        const collectElement = document.querySelector('.collect .count') || 
                               document.querySelector('[data-v-icon="collect"] .count');
        const commentElement = document.querySelector('.comment .count') || 
                               document.querySelector('[data-v-icon="comment"] .count');
        
        likes = likeElement ? parseNumber(likeElement.textContent) : 0;
        collects = collectElement ? parseNumber(collectElement.textContent) : 0;
        comments = commentElement ? parseNumber(commentElement.textContent) : 0;
      }
    }
    
    // 获取作者信息
    const authorElement = document.querySelector('.author-wrapper .name') || 
                          document.querySelector('.user-nickname') || 
                          document.querySelector('.author-name');
    const author = authorElement ? authorElement.textContent.trim() : '未能获取作者';
    
    // 获取发布时间
    const dateElement = document.querySelector('.publish-time') || 
                        document.querySelector('.time') || 
                        document.querySelector('.date');
    const editDate = dateElement ? formatDate(dateElement.textContent.trim()) : '';
    
    // 获取当前URL
    const link = window.location.href;
    
    // 组装数据
    const noteData = {
      success: true,
      title,
      content,
      author,
      likes,
      collects,
      comments,
      editDate,
      link
    };
    
    console.log('成功获取页面内容:', noteData);
    return noteData;
    
  } catch (error) {
    console.error('获取页面内容时出错:', error);
    return {
      success: false,
      message: '获取页面内容时出错: ' + error.message
    };
  }
}

// 格式化日期
function formatDate(dateText) {
    if (!dateText) return '';
    
    // 移除所有非数字和连字符的字符
    dateText = dateText.replace(/[^0-9\-]/g, '').trim();
    
    // 如果已经是标准日期格式（如 2024-03-15），直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
        return dateText;
    }
    
    // 处理"x天前"的格式 - 数字已经被提取出来
    const daysAgo = parseInt(dateText);
    if (!isNaN(daysAgo)) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    return '';
}

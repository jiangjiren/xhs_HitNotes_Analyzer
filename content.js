/* global config */

// 立即执行的日志，确保脚本被加载
console.log('🔥 Content Script 开始加载!');
console.log('🔥 当前时间:', new Date().toLocaleString());
console.log('🔥 页面URL:', window.location.href);

// 确保消息监听器只被添加一次
if (!window.messageListenerAdded) {
  window.messageListenerAdded = true;
  console.log('🔥 添加消息监听器');
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('🔥 Content script收到消息:', message);  // 添加日志
    
    try {
      switch (message.type || message.action) {
        case 'checkReady':
        case 'ping':
          console.log('🔥 检查页面就绪状态');  // 添加日志
          sendResponse(true);
          return false; // 同步响应，不需要保持通道开放
        
      case 'startCollecting':
        console.log('🚀 开始采集');
        
        // 清除之前的定时器
        if (window.autoScrollTimer) {
            clearTimeout(window.autoScrollTimer);
            window.autoScrollTimer = null;
        }
        
        // 重置所有状态标志
        isCollecting = true;
        window.forceStop = false;
        
        collectedData = []; // 重置已采集数据
        lastScrollHeight = 0;
        currentNoteIndex = 0;
        successCount = 0;
        maxNotesToCollect = message.maxNotes || 100;
        minLikes = message.minLikes !== undefined ? message.minLikes : 0;
        // 重置采集完成标志，确保新的采集过程可以正常发送完成消息
        window.collectionCompleteSent = false;
        window.dataExported = false;
        
        console.log('🚀 采集参数设置完成:', {
            maxNotes: maxNotesToCollect,
            minLikes: minLikes,
            isCollecting: isCollecting
        });
        
        // 开始采集
        setTimeout(() => {
            autoScroll();
        }, 1000);
        
        sendResponse({success: true});
        break;
        
      case 'stopCollecting':
        console.log('🛑 停止采集命令接收');
        console.log('停止前状态:', isCollecting);
        
        // 立即设置停止标志
        isCollecting = false;
        
        // 设置全局强制停止标志
        window.forceStop = true;
        
        // 强制清除所有可能的定时器
        if (window.autoScrollTimer) {
            console.log('清除定时器:', window.autoScrollTimer);
            clearTimeout(window.autoScrollTimer);
            window.autoScrollTimer = null;
        }
        
        // 清除所有可能的延时操作
        const highestTimeoutId = setTimeout(() => {}, 0);
        for (let i = 0; i < highestTimeoutId; i++) {
            clearTimeout(i);
        }
        
        // 清除所有可能的interval
        const highestIntervalId = setInterval(() => {}, 0);
        for (let i = 0; i < highestIntervalId; i++) {
            clearInterval(i);
        }
        
        console.log('🛑 停止采集处理完成');
        
        // 发送完成响应
        sendResponse({success: true, message: '停止采集成功'});
        
        // 立即调用采集完成处理
        setTimeout(() => {
            sendCollectionComplete('用户停止采集');
        }, 100);
        
        break;
        
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

// 新增：可中断的等待函数
function cancellableWait(ms) {
    return new Promise((resolve, reject) => {
        const interval = 100; // 每100ms检查一次
        let waited = 0;

        const timer = setInterval(() => {
            // 检查停止信号和强制停止标志
            if (!isCollecting || window.forceStop) {
                clearInterval(timer);
                console.log('🛑 等待被中断');
                // 抛出一个特定的错误来表示操作被取消
                reject(new Error('CollectionCancelled'));
                return;
            }

            waited += interval;
            if (waited >= ms) {
                clearInterval(timer);
                resolve();
            }
        }, interval);
    });
}

// 新增：统一的停止检查函数
function checkAndStop(location) {
    if (!isCollecting || window.forceStop) {
        console.log(`🛑 采集在${location}被停止`);
        throw new Error('CollectionCancelled');
    }
}

// 解析数字文本（处理"1万"这样的格式）
function parseNumber(text) {
    if (!text) {
        console.log('parseNumber: 输入为空，返回0');
        return 0;
    }
    
    text = text.trim();
    console.log('parseNumber: 原始文本:', `"${text}"`);
    
    if (text.includes('万')) {
        const numStr = text.replace('万', '').trim();
        console.log('parseNumber: 提取的数字字符串:', `"${numStr}"`);
        const result = parseFloat(numStr) * 10000;
        console.log('parseNumber: "万"格式解析结果:', result);
        return result;
    }
    
    if (text.includes('千')) {
        const numStr = text.replace('千', '').trim();
        console.log('parseNumber: 提取的数字字符串:', `"${numStr}"`);
        const result = parseFloat(numStr) * 1000;
        console.log('parseNumber: "千"格式解析结果:', result);
        return result;
    }
    
    const result = parseInt(text) || 0;
    console.log('parseNumber: 普通数字解析结果:', result);
    return result;
}

// 导出数据
function exportData() {
    console.log('📤 exportData函数开始执行');
    console.log('📤 数据导出状态检查:', {
        collectedDataLength: collectedData.length,
        dataExported: window.dataExported
    });
    
    // 检查是否有数据可导出
    if (collectedData.length === 0) {
        console.log('📤 没有可导出的数据');
        chrome.runtime.sendMessage({type: 'updateStatus', text: '没有可导出的数据'});
        return;
    }
    
    // 检查是否已经导出过数据
    if (window.dataExported) {
        console.log('📤 数据已经导出过，不再重复导出');
        return;
    }
    
    // 设置导出状态标志
    console.log('📤 设置导出状态标志');
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
    console.log('📤 发送Excel生成请求到background.js');
    console.log('📤 Excel数据:', {
        headers,
        dataRows: data.length,
        filename: `小红书爆款笔记数据_${timestamp}.xlsx`
    });
    
    chrome.runtime.sendMessage({
        action: 'generateExcel',
        headers: headers,
        data: data,
        filename: `小红书爆款笔记数据_${timestamp}.xlsx`,
        rowHeight: 20 // 设置行高为20像素
    }, response => {
        console.log('📤 Excel生成响应:', response);
        if (response && response.status === 'success') {
            console.log('✅ Excel文件生成成功');
        } else {
            console.error('❌ Excel文件生成失败:', response);
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
    console.log('📤 发送TXT文件下载请求到background.js');
    console.log('📤 TXT数据:', {
        contentLength: txtContent.length,
        filename: `小红书爆款笔记内容_${timestamp}.txt`
    });
    
    chrome.runtime.sendMessage({
        action: 'downloadFile',
        content: txtContent,
        filename: `小红书爆款笔记内容_${timestamp}.txt`
    }, response => {
        console.log('📤 TXT下载响应:', response);
        if (response && response.status === 'success') {
            console.log('✅ TXT文件下载成功');
        } else {
            console.log('❌ TXT文件下载失败:', response);
        }
    });
    
    // 更新状态
    chrome.runtime.sendMessage({
        type: 'updateStatus',
        text: '数据导出完成，准备AI分析...'
    });
    
    console.log('✅ 数据导出完成，已设置导出状态标志');
    console.log('📁 文件保存位置: 下载文件夹/小红书爆款采集/');
    console.log(`📊 Excel文件: 小红书爆款笔记数据_${timestamp}.xlsx`);
    console.log(`📄 TXT文件: 小红书爆款笔记内容_${timestamp}.txt`);
}

// 修改：处理笔记详情 - 恢复弹窗处理逻辑，但优化关闭机制
async function processNoteDetail(noteElement) {
    // 在函数开始时立即检查停止信号
    if (!isCollecting || window.forceStop) {
        console.log('🛑 processNoteDetail开始前检测到停止信号，立即返回');
        return null;
    }
    
    let result = null;
    try {
        console.log('开始处理笔记详情...');
        
        // 更新选择器，适应新的页面结构
        const coverElement = noteElement.querySelector('a.cover.mask.ld') || 
                            noteElement.querySelector('a.cover.mask') || 
                            noteElement.querySelector('a[href*="/search_result/"]');

        if (!coverElement) {
            console.log('未找到笔记的封面/链接元素');
            return null;
        }

        console.log('找到封面元素，准备点击打开弹窗');
        
        // 在点击前再次检查停止信号
        if (!isCollecting || window.forceStop) {
            console.log('🛑 在点击笔记前检测到停止信号，立即返回');
            return null;
        }
        
        // 点击笔记，打开详情弹窗
        coverElement.click();

        // 等待详情弹窗出现，使用轮询检查而不是固定延时
        console.log('等待弹窗出现...');
        let detailModal = null;
        let attempts = 0;
        const maxAttempts = 20; // 最多等待10秒 (20 * 500ms)
        
        while (!detailModal && attempts < maxAttempts) {
            if (!isCollecting || window.forceStop) {
                console.log('🛑 采集被中断，停止等待弹窗');
                return null;
            }
            
            await cancellableWait(500);
            
            // 尝试更多可能的弹窗选择器，包括小红书的实际选择器
            const modalSelectors = [
                '#noteContainer',  // 小红书实际的弹窗容器ID
                '.note-container', // 小红书实际的弹窗容器类
                'div.note-detail-wrapper',
                '.note-detail',
                '[class*="detail"]',
                '[class*="modal"]',
                '[class*="popup"]',
                '[class*="overlay"]',
                'div[style*="position: fixed"]',
                'div[style*="z-index"]'
            ];
            
            for (const selector of modalSelectors) {
                detailModal = document.querySelector(selector);
                if (detailModal) {
                    console.log(`第${attempts}次检查，通过选择器找到弹窗: ${selector}`);
                    console.log('弹窗元素:', detailModal.tagName, detailModal.className, detailModal.id);
                    break;
                }
            }
            
            // 如果还没找到，尝试查找包含关闭按钮的父容器
            if (!detailModal) {
                const closeBtn = document.querySelector('.close-icon, .close, [class*="close"]');
                if (closeBtn) {
                    // 向上查找可能的弹窗容器
                    let parent = closeBtn.parentElement;
                    let depth = 0;
                    while (parent && depth < 10) {
                        const style = window.getComputedStyle(parent);
                        if (style.position === 'fixed' || style.zIndex > 100) {
                            detailModal = parent;
                            console.log(`第${attempts}次检查，通过关闭按钮找到弹窗容器`);
                            break;
                        }
                        parent = parent.parentElement;
                        depth++;
                    }
                }
            }
            
            attempts++;
            console.log(`第${attempts}次检查弹窗，找到:`, !!detailModal);
        }
        
        if (!detailModal) {
            console.log('等待超时，未找到详情弹窗，尝试从整个页面提取信息');
            // 备用策略：直接从页面中查找可能的内容
            const allContentElements = document.querySelectorAll('.desc, .content, .note-content, [class*="desc"]');
            const allDateElements = document.querySelectorAll('.date, .time, .publish-time, [class*="date"]');
            const allCountElements = document.querySelectorAll('.count');
            
            console.log(`页面中找到 ${allContentElements.length} 个内容元素, ${allDateElements.length} 个时间元素, ${allCountElements.length} 个计数元素`);
            
            // 如果页面上有新出现的元素（可能是弹窗内容），尝试提取
            if (allContentElements.length > 0 || allCountElements.length > 3) {
                const content = allContentElements.length > 0 ? allContentElements[0].innerText.trim() : '无内容预览';
                const editDate = allDateElements.length > 0 ? formatDate(allDateElements[0].textContent) : '未知时间';
                
                // 尝试从所有计数元素中提取收藏和评论数
                let collects = 0;
                let comments = 0;
                if (allCountElements.length >= 3) {
                    collects = parseNumber(allCountElements[1].textContent);
                    comments = parseNumber(allCountElements[2].textContent);
                }
                
                console.log('从页面提取的信息:', { content: content.substring(0, 50) + '...', editDate, collects, comments });
                
                result = {
                    content,
                    editDate,
                    collects,
                    comments
                };
            } else {
                console.log('页面中也未找到足够的信息，返回null');
                return null;
            }
        } else {
            console.log('弹窗已打开，等待内容加载完成...');
            
            // 等待弹窗内容完全加载 - 这是关键步骤！
            let contentLoaded = false;
            let contentAttempts = 0;
            const maxContentAttempts = 10; // 最多等待5秒
            
            while (!contentLoaded && contentAttempts < maxContentAttempts) {
                if (!isCollecting || window.forceStop) {
                    console.log('🛑 采集被中断，停止等待内容加载');
                    return null;
                }
                
                // 检查关键内容元素是否已加载
                const titleElement = detailModal.querySelector('#detail-title');
                const descElement = detailModal.querySelector('#detail-desc .note-text') || 
                                  detailModal.querySelector('#detail-desc');
                const interactContainer = detailModal.querySelector('.interact-container') ||
                                        detailModal.querySelector('.buttons.engage-bar-style');
                
                if (titleElement && descElement && interactContainer) {
                    console.log('关键内容元素已加载完成');
                    contentLoaded = true;
                } else {
                    console.log(`第${contentAttempts + 1}次检查内容加载，标题:${!!titleElement}, 内容:${!!descElement}, 互动:${!!interactContainer}`);
                    await cancellableWait(500);
                    contentAttempts++;
                }
            }
            
            if (!contentLoaded) {
                console.log('内容加载超时，继续尝试提取');
            }
            
            // 再次检查停止信号
            if (!isCollecting || window.forceStop) {
                console.log('🛑 在内容提取前检测到停止信号');
                return null;
            }
            
            console.log('开始提取信息...');

            // 提取笔记内容 - 根据小红书实际结构
            const titleElement = detailModal.querySelector('#detail-title') || 
                                detailModal.querySelector('.title');
            const descElement = detailModal.querySelector('#detail-desc .note-text') || 
                              detailModal.querySelector('#detail-desc') || 
                              detailModal.querySelector('.desc .note-text') ||
                              detailModal.querySelector('.desc') || 
                              detailModal.querySelector('.content') ||
                              detailModal.querySelector('.note-content') ||
                              detailModal.querySelector('[class*="desc"]');
            
            const title = titleElement ? titleElement.innerText.trim() : '';
            const desc = descElement ? descElement.innerText.trim() : '';
            const content = title && desc ? `${title}\n\n${desc}` : (title || desc || '未找到内容');
            
            console.log('内容提取调试信息:');
            console.log('- 标题元素:', !!titleElement, titleElement ? titleElement.tagName + '.' + titleElement.className : '无');
            console.log('- 标题内容:', title ? title.substring(0, 50) + '...' : '无');
            console.log('- 内容元素:', !!descElement, descElement ? descElement.tagName + '.' + descElement.className : '无');
            console.log('- 内容文本:', desc ? desc.substring(0, 100) + '...' : '无');
            console.log('- 最终合并内容:', content.substring(0, 100) + '...');
            console.log('- 最终内容长度:', content.length);
            
            // 如果内容只是标题，说明desc提取失败
            if (content === title) {
                console.log('⚠️ 警告：内容只包含标题，desc提取可能失败');
                console.log('尝试查找页面上所有可能的内容元素...');
                const allDescElements = document.querySelectorAll('[id*="desc"], [class*="desc"], .note-text, .content');
                console.log('找到的所有可能内容元素:', allDescElements.length);
                allDescElements.forEach((el, index) => {
                    console.log(`元素${index}:`, el.tagName, el.className, el.id, el.textContent ? el.textContent.substring(0, 50) + '...' : '无文本');
                });
            }
            
            // 提取发布时间 - 根据小红书实际结构
            const dateElement = detailModal.querySelector('.bottom-container .date') ||
                               detailModal.querySelector('.date') ||
                               detailModal.querySelector('.time') ||
                               detailModal.querySelector('.publish-time') ||
                               detailModal.querySelector('[class*="date"]');
            const editDate = dateElement ? formatDate(dateElement.textContent) : '未知时间';

            // 提取点赞数 - 根据小红书弹窗实际结构
            console.log('开始提取互动数据...');
            
            // 初始化互动数据变量
            let likes = 0, collects = 0, comments = 0;
            
            // 首先尝试找到整个互动容器
            const interactContainer = detailModal.querySelector('.interact-container') ||
                                    detailModal.querySelector('.buttons.engage-bar-style');
            console.log('互动容器:', !!interactContainer);
            
            if (interactContainer) {
                console.log('互动容器HTML:', interactContainer.outerHTML.substring(0, 500) + '...');
                
                // 在互动容器中查找各个元素
                const likeWrapper = interactContainer.querySelector('.like-wrapper');
                const collectWrapper = interactContainer.querySelector('.collect-wrapper');
                const chatWrapper = interactContainer.querySelector('.chat-wrapper');
                
                console.log('找到的包装器:', {
                    like: !!likeWrapper,
                    collect: !!collectWrapper, 
                    chat: !!chatWrapper
                });
                
                // 提取点赞数
                const likeElement = likeWrapper ? likeWrapper.querySelector('.count') : null;
                console.log('点赞元素:', !!likeElement, likeElement ? likeElement.outerHTML : '无');
                
                // 提取收藏数
                const collectsElement = collectWrapper ? collectWrapper.querySelector('.count') : null;
                console.log('收藏元素:', !!collectsElement, collectsElement ? collectsElement.outerHTML : '无');
                
                // 提取评论数
                const commentsElement = chatWrapper ? chatWrapper.querySelector('.count') : null;
                console.log('评论元素:', !!commentsElement, commentsElement ? commentsElement.outerHTML : '无');
                
                likes = parseNumber(likeElement ? likeElement.textContent : '0');
                collects = parseNumber(collectsElement ? collectsElement.textContent : '0');
                comments = parseNumber(commentsElement ? commentsElement.textContent : '0');
                
                console.log('互动容器解析结果:', { likes, collects, comments });
            } else {
                console.log('未找到互动容器，使用备用选择器...');
                
                // 备用选择器
                const likeElement = detailModal.querySelector('.like-wrapper .count[selected-disabled-search]') ||
                                  detailModal.querySelector('.like-wrapper .count') ||
                                  detailModal.querySelector('.like .count') ||
                                  detailModal.querySelector('[class*="like"] .count');
                const collectsElement = detailModal.querySelector('.collect-wrapper .count') ||
                                       detailModal.querySelector('.collect .count') ||
                                       detailModal.querySelector('[class*="collect"] .count');
                const commentsElement = detailModal.querySelector('.chat-wrapper .count') ||
                                       detailModal.querySelector('.comments-container .total') ||
                                       detailModal.querySelector('.comment-wrapper .count') ||
                                       detailModal.querySelector('.comment .count') ||
                                       detailModal.querySelector('[class*="comment"] .count');

                likes = parseNumber(likeElement ? likeElement.textContent : '0');
                collects = parseNumber(collectsElement ? collectsElement.textContent : '0');
                comments = parseNumber(commentsElement ? commentsElement.textContent : '0');
                
                console.log('备用选择器结果:');
                console.log('- 点赞元素:', !!likeElement, likeElement ? likeElement.textContent : '无');
                console.log('- 收藏元素:', !!collectsElement, collectsElement ? collectsElement.textContent : '无');
                console.log('- 评论元素:', !!commentsElement, commentsElement ? commentsElement.textContent : '无');
                console.log('- 备用选择器解析结果:', { likes, collects, comments });
            }
            
            console.log('成功提取弹窗信息:', { content: content.substring(0, 50) + '...', editDate, likes, collects, comments });
            
            result = {
                content,
                editDate,
                likes,
                collects,
                comments
            };
        }
        
    } catch (error) {
        if (error.message === 'CollectionCancelled') {
            console.log('🛑 processNoteDetail被成功中断');
        } else {
            console.error('处理笔记详情时出错:', error);
        }
        result = null;
    } finally {
        // 无论成功还是失败，都尝试关闭弹窗（除非被强制停止）
        if (!window.forceStop) {
            console.log('进入finally块，尝试关闭弹窗...');
            
            // 尝试多种可能的关闭按钮选择器，包括小红书的实际选择器
            const closeBtnSelectors = [
                '.close.close-mask-dark',  // 小红书实际的关闭按钮类
                '.close',                  // 小红书的关闭按钮基础类
                'div.close',              // div形式的关闭按钮
                'div.note-detail-wrapper .close-icon',
                'div.note-detail-wrapper .close',
                '.note-detail .close-icon',
                '.note-detail .close',
                '.close-icon',
                '[class*="close"]',
                '[aria-label="关闭"]',
                '[title="关闭"]',
                'button[class*="close"]'
            ];
            
            let closeBtn = null;
            for (const selector of closeBtnSelectors) {
                closeBtn = document.querySelector(selector);
                if (closeBtn) {
                    console.log(`找到关闭按钮，选择器: ${selector}`);
                    console.log('关闭按钮元素:', closeBtn.tagName, closeBtn.className);
                    break;
                }
            }
            
            if (closeBtn) {
                console.log('执行关闭按钮点击');
                closeBtn.click();
                try {
                    // 等待弹窗关闭动画，使用可中断的等待
                    await cancellableWait(800);
                    console.log('弹窗关闭完成');
                } catch (e) {
                    console.log('🛑 关闭等待被中断');
                }
            } else {
                console.log('未找到关闭按钮，尝试按ESC键关闭');
                // 尝试按ESC键关闭弹窗
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                try {
                    // 使用可中断的等待
                    await cancellableWait(500);
                } catch (e) {
                    console.log('🛑 ESC关闭等待被中断');
                }
            }
        } else {
            console.log('🛑 检测到强制停止，跳过弹窗关闭');
        }
    }
    return result;
}

// 修改：自动滚动
async function autoScroll() {
    console.log('🚀 autoScroll开始执行');
    
    if (!isCollecting || window.forceStop) {
        console.log('🛑 检测到停止信号，退出滚动');
        return;
    }

    try {
        console.log('📋 开始处理当前页面笔记...');
        // 先处理当前页面上的笔记
        await parseNoteData();
        
        console.log('📋 处理笔记完成，当前状态:', {
            isCollecting,
            successCount,
            maxNotesToCollect,
            collectedDataLength: collectedData.length
        });
        
        // 在每个关键步骤都检查停止信号
        if (!isCollecting || window.forceStop) {
            console.log('🛑 处理笔记后检测到停止信号');
            return;
        }
        
        // 如果已经达到目标数量，则退出
        if (successCount >= maxNotesToCollect) {
            console.log('✅ 已达到目标数量，结束采集');
            sendCollectionComplete('已达到最大抓取数量');
            return;
        }

        const scrollHeight = document.documentElement.scrollHeight;
        console.log('📏 滚动高度检查:', {
            currentScrollHeight: scrollHeight,
            lastScrollHeight: lastScrollHeight,
            isFirstScroll: lastScrollHeight === 0
        });
        
        // 改进页面到底部的判断逻辑
        if (scrollHeight === lastScrollHeight && lastScrollHeight > 0) {
            console.log('📄 页面高度未变化，可能已到底部');
            
            // 等待一下，看看是否有新内容加载
            console.log('⏳ 等待3秒，检查是否有新内容...');
            await cancellableWait(3000);
            
            const newScrollHeight = document.documentElement.scrollHeight;
            console.log('📏 等待后的滚动高度:', newScrollHeight);
            
            if (newScrollHeight === scrollHeight) {
                console.log('📄 确认页面已到底部，结束采集');
                sendCollectionComplete('页面已到底部');
                return;
            } else {
                console.log('📄 发现新内容，继续采集');
                lastScrollHeight = newScrollHeight;
            }
        } else {
            lastScrollHeight = scrollHeight;
        }
        
        console.log('📜 滚动到页面底部...');
        // 滚动到页面底部
        window.scrollTo(0, scrollHeight);
        
        // 等待内容加载，但可以被中断
        console.log('⏳ 等待新内容加载...');
        try {
            await cancellableWait(3000);
        } catch (error) {
            if (error.message === 'CollectionCancelled') {
                console.log('🛑 等待过程中被取消');
                return;
            }
            throw error;
        }
        
        // 继续下一轮滚动
        if (isCollecting && !window.forceStop) {
            console.log('🔄 设置下一轮滚动定时器...');
            window.autoScrollTimer = setTimeout(autoScroll, 1000);
        } else {
            console.log('🛑 停止信号检测到，不再继续滚动');
        }
        
    } catch (error) {
        if (error.message === 'CollectionCancelled') {
            console.log('🛑 采集被取消');
            return;
        }
        console.error('❌ 滚动过程中出错:', error);
        sendCollectionComplete('滚动过程中出错: ' + error.message);
    }
}

// 添加：统一发送采集完成消息的函数
function sendCollectionComplete(reason) {
    console.log(`✅ 采集完成: ${reason}`);
    console.log(`✅ 采集到的数据数量: ${collectedData.length}`);
    console.log(`✅ 采集数据预览:`, collectedData.slice(0, 2));
    
    // 确保只发送一次完成消息
    if (window.collectionCompleteSent) {
        return;
    }
    window.collectionCompleteSent = true;
    
    // 确保采集状态被设置为false
    isCollecting = false;
    
    // 清除定时器
    if (window.autoScrollTimer) {
        clearTimeout(window.autoScrollTimer);
        window.autoScrollTimer = null;
    }

    // 准备格式化的文本内容供AI分析
    let formattedContent = '';
    if (collectedData.length > 0) {
        formattedContent = collectedData.map((item, index) => 
            `${index + 1}. 标题：${item.title}\n` +
            `   作者：${item.author}\n` +
            `   点赞：${item.likes} | 收藏：${item.collects || 0} | 评论：${item.comments || 0}\n` +
            `   发布时间：${item.editDate || '未知'}\n` +
            `   链接：${item.link}\n` +
            `   内容：${item.content || '无内容'}\n`
        ).join('\n----------------------------------------\n\n');
    }

    // 导出任何已采集的数据
    if (collectedData.length > 0 && !window.dataExported) {
        console.log('🔄 开始导出数据...');
        exportData();
    }

    // 发送完成消息给popup - 修正数据结构
    chrome.runtime.sendMessage({
        type: 'collectionComplete',
        text: reason, // 保持兼容性
        reason: reason,
        data: collectedData, // 正确传递采集的数据
        dataCount: collectedData.length,
        successCount: successCount,
        formattedContent: formattedContent // 添加格式化内容供AI分析
    });
}

// 修改：解析笔记数据
async function parseNoteData() {
    console.log('📋 parseNoteData开始执行');
    
    try {
        // 尝试多种选择器，适应不同的页面结构
        let notes = document.querySelectorAll('section.note-item');
        console.log('📋 使用 section.note-item 找到笔记元素数量:', notes.length);
        
        // 如果没有找到笔记，尝试其他选择器
        if (notes.length === 0) {
            console.log('⚠️ 没有找到笔记元素，尝试其他选择器...');
            
            const alternativeSelectors = [
                '.note-item',
                '[class*="note-item"]',
                '.feed-item',
                '[class*="feed-item"]',
                '.card',
                '[class*="card"]',
                'section[class*="item"]',
                'article[class*="item"]'
            ];
            
            for (const selector of alternativeSelectors) {
                notes = document.querySelectorAll(selector);
                console.log(`📋 选择器 "${selector}" 找到 ${notes.length} 个元素`);
                if (notes.length > 0) {
                    // 验证这些元素是否包含笔记链接
                    let validNotes = 0;
                    for (let i = 0; i < Math.min(5, notes.length); i++) {
                        const note = notes[i];
                        const linkElement = note.querySelector('a[href*="xiaohongshu.com"], a[href*="xhslink.com"], a[href*="/search_result/"]');
                        if (linkElement) validNotes++;
                    }
                    console.log(`📋 其中包含有效链接的元素: ${validNotes} 个`);
                    if (validNotes > 0) {
                        console.log(`✅ 使用选择器: ${selector}`);
                        break;
                    }
                }
            }
            
            if (notes.length === 0) {
                console.log('📋 页面URL:', window.location.href);
                console.log('📋 页面标题:', document.title);
                console.log('📋 页面加载状态:', document.readyState);
                console.log('⏳ 等待页面加载更多内容...');
                return;
            }
        }
        
        console.log('📋 当前最小点赞数设置:', minLikes);
    
    // 每次解析时重置索引，检查所有可见的笔记
    currentNoteIndex = 0;
    
    // 创建一个Map来存储当前页面上所有笔记的ID，确保在一次解析中不会重复处理
    const currentPageNoteIds = new Map();
    
    // 首先遍历所有笔记，提取ID并存储到Map中
    // 这样可以确保即使页面上有重复的笔记元素，我们也只处理每个ID一次
    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        // 更灵活的链接选择器
        const linkElement = note.querySelector('a.cover.mask.ld') || 
                           note.querySelector('a.cover.mask') || 
                           note.querySelector('a[href*="/search_result/"]') ||
                           note.querySelector('a[href*="xiaohongshu.com"]') ||
                           note.querySelector('a[href*="xhslink.com"]');
        if (!linkElement) continue;
        
        // 提取笔记ID
        const noteId = linkElement.href.split('/').pop().split('?')[0];
        
        // 只存储第一次出现的笔记元素
        if (!currentPageNoteIds.has(noteId)) {
            currentPageNoteIds.set(noteId, note);
        }
    }
    
    console.log('📋 当前页面上不重复的笔记数量:', currentPageNoteIds.size);
    
    // 如果没有有效的笔记，也给出提示
    if (currentPageNoteIds.size === 0) {
        console.log('⚠️ 没有找到有效的笔记链接');
        console.log('💡 建议执行 analyzePageStructure() 分析页面结构');
        return;
    }
    
    // 然后只处理Map中的笔记，确保每个ID只处理一次
    for (const [noteId, note] of currentPageNoteIds.entries()) {
        // 每次循环开始时立即检查停止信号
        if (!isCollecting || window.forceStop) {
            console.log('🛑 在处理笔记前检测到停止信号，立即退出循环');
            break;
        }
        if (successCount >= maxNotesToCollect) {
            // 不要在这里设置isCollecting = false，让sendCollectionComplete统一处理
            sendCollectionComplete('已达到最大抓取数量');
            break;
        }
        
        // 更灵活的链接选择器
        const linkElement = note.querySelector('a.cover.mask.ld') || 
                           note.querySelector('a.cover.mask') || 
                           note.querySelector('a[href*="/search_result/"]') ||
                           note.querySelector('a[href*="xiaohongshu.com"]') ||
                           note.querySelector('a[href*="xhslink.com"]');
        if (!linkElement) continue;
        
        // 检查是否已采集
        if (collectedData.some(item => item.id === noteId)) {
            console.log('📋 跳过已采集的笔记:', noteId);
            continue;
        }
        
        // 更灵活的点赞数选择器
        let likeElement = note.querySelector('.count[selected-disabled-search]') || // 原有选择器
                         note.querySelector('.like-wrapper .count') ||
                         note.querySelector('.like .count') ||
                         note.querySelector('.engagement .count') ||
                         note.querySelector('[class*="like"] .count') ||
                         note.querySelector('.count'); // 最后的备用选择器
        
        // 输出调试信息，查看点赞元素是否存在
        console.log('📋 笔记ID:', noteId, '点赞元素:', !!likeElement);
        
        const likesCount = parseNumber(likeElement ? likeElement.textContent : '0');
        console.log('📋 笔记ID:', noteId, '解析到的点赞数:', likesCount, '最小点赞数要求:', minLikes);
        
        // 检查点赞数是否达到阈值
        if (likesCount < minLikes) {
            console.log('📋 笔记ID:', noteId, '点赞数不足，跳过');
            continue;
        }
        
        // 更灵活的标题和作者选择器
        const titleElement = note.querySelector('.title span') || 
                            note.querySelector('.title') ||
                            note.querySelector('[class*="title"]') ||
                            note.querySelector('h3') ||
                            note.querySelector('h2');
        const authorElement = note.querySelector('.author .name') || 
                             note.querySelector('.name') ||
                             note.querySelector('.author') ||
                             note.querySelector('[class*="author"]') ||
                             note.querySelector('[class*="user"]');
        
        console.log('✅ 发现符合条件的笔记:', {
            id: noteId,
            likes: likesCount,
            title: titleElement ? titleElement.textContent : '未知标题'
        });
        
        // 获取详情数据并等待完成
        const detailData = await processNoteDetail(note);
        
        // 只有当详情数据采集成功时才保存
        if (detailData) {
            const finalLikes = detailData.likes !== undefined ? detailData.likes : likesCount;
            
            const data = {
                id: noteId,
                title: titleElement ? titleElement.textContent.trim() : '未知标题',
                author: authorElement ? authorElement.textContent.trim() : '未知作者',
                likes: finalLikes,
                link: linkElement.href,
                ...detailData
            };
            
            collectedData.push(data);
            successCount++;
            
            console.log('✅ 成功采集笔记:', noteId, '当前总数:', successCount);
            
            try {
                chrome.runtime.sendMessage({
                    type: 'updateStatus',
                    text: `成功采集 ${successCount} 篇笔记（点赞数≥${minLikes}）`
                });
            } catch (error) {
                console.log('发送采集成功消息失败:', error.message);
            }
            
            // 成功采集一条后检查是否需要继续
            if (!isCollecting || window.forceStop) {
                console.log('🛑 在成功采集后检测到停止信号，立即退出');
                break;
            }
            // 等待一定时间再继续，使用可中断等待
            await cancellableWait(1000);
        } else {
            console.log('❌ 笔记详情采集失败，跳过:', noteId);
        }
    }
    
    console.log('📋 parseNoteData执行完成');
    
    } catch (error) {
        if (error.message === 'CollectionCancelled') {
            console.log('🛑 parseNoteData被成功中断');
            // 如果是因为取消而中断，直接返回，不需要额外处理
            return;
        } else {
            console.error('❌ parseNoteData处理时发生错误:', error);
            // 其他错误也抛出，让上层处理
            throw error;
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

// 测试函数 - 用户可以在控制台手动调用
window.testContentScript = function() {
    console.log('🧪 Content Script 测试开始');
    console.log('🧪 isCollecting:', isCollecting);
    console.log('🧪 messageListenerAdded:', window.messageListenerAdded);
    console.log('🧪 forceStop:', window.forceStop);
    console.log('🧪 collectedData length:', collectedData.length);
    console.log('🧪 页面笔记元素数量:', document.querySelectorAll('section.note-item').length);
    console.log('🧪 测试完成');
    return {
        isCollecting,
        messageListenerAdded: window.messageListenerAdded,
        forceStop: window.forceStop,
        collectedDataLength: collectedData.length,
        noteElements: document.querySelectorAll('section.note-item').length
    };
};

// 页面结构分析函数
window.analyzePageStructure = function() {
    console.log('🔍 开始分析页面结构...');
    console.log('🔍 页面URL:', window.location.href);
    console.log('🔍 页面标题:', document.title);
    
    // 检查各种可能的笔记容器
    const selectors = [
        'section.note-item',
        '.note-item',
        '[class*="note-item"]',
        '.feed-item',
        '[class*="feed-item"]',
        '.card',
        '[class*="card"]',
        '.explore-item',
        '[class*="explore"]',
        '.waterfall-item',
        '[class*="waterfall"]',
        'section',
        'article',
        '[class*="item"]'
    ];
    
    console.log('🔍 检查各种选择器:');
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`  ${selector}: ${elements.length} 个元素`);
        if (elements.length > 0 && elements.length < 50) {
            console.log(`    第一个元素类名: ${elements[0].className}`);
            console.log(`    第一个元素HTML (前200字符): ${elements[0].outerHTML.substring(0, 200)}...`);
        }
    });
    
    // 检查页面中所有包含链接的元素
    console.log('🔍 检查页面中的链接:');
    const allLinks = document.querySelectorAll('a[href*="xiaohongshu.com"], a[href*="xhslink.com"]');
    console.log(`  找到 ${allLinks.length} 个小红书相关链接`);
    
    if (allLinks.length > 0) {
        console.log('  前5个链接:');
        for (let i = 0; i < Math.min(5, allLinks.length); i++) {
            console.log(`    ${i + 1}. ${allLinks[i].href}`);
            console.log(`       父元素: ${allLinks[i].parentElement.tagName}.${allLinks[i].parentElement.className}`);
        }
    }
    
    // 检查是否在搜索结果页面
    const isSearchPage = window.location.href.includes('search_result');
    const isExplorePage = window.location.href.includes('explore');
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '/explore';
    
    console.log('🔍 页面类型判断:');
    console.log(`  搜索结果页: ${isSearchPage}`);
    console.log(`  探索页: ${isExplorePage}`);
    console.log(`  首页: ${isHomePage}`);
    
    // 检查页面加载状态
    console.log('🔍 页面状态:');
    console.log(`  document.readyState: ${document.readyState}`);
    console.log(`  页面可见性: ${document.visibilityState}`);
    
    return {
        url: window.location.href,
        title: document.title,
        readyState: document.readyState,
        visibilityState: document.visibilityState,
        isSearchPage,
        isExplorePage,
        isHomePage,
        linkCount: allLinks.length,
        selectors: selectors.map(sel => ({
            selector: sel,
            count: document.querySelectorAll(sel).length
        }))
    };
};

// 采集状态和数据分析函数
window.analyzeCollectionStatus = function() {
    console.log('📊 开始分析采集状态...');
    console.log('📊 当前采集状态:', {
        isCollecting,
        forceStop: window.forceStop,
        successCount,
        maxNotesToCollect,
        minLikes,
        collectedDataLength: collectedData.length,
        dataExported: window.dataExported,
        collectionCompleteSent: window.collectionCompleteSent
    });
    
    console.log('📊 已采集的数据预览:');
    if (collectedData.length > 0) {
        collectedData.slice(0, 3).forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.title}`);
            console.log(`     作者: ${item.author}`);
            console.log(`     点赞: ${item.likes} | 收藏: ${item.collects || 0} | 评论: ${item.comments || 0}`);
            console.log(`     内容长度: ${item.content ? item.content.length : 0} 字符`);
            console.log(`     链接: ${item.link}`);
        });
        
        if (collectedData.length > 3) {
            console.log(`  ... 还有 ${collectedData.length - 3} 条数据`);
        }
    } else {
        console.log('  没有采集到任何数据');
    }
    
    // 检查当前页面的笔记元素
    const currentNotes = document.querySelectorAll('section.note-item');
    console.log(`📊 当前页面笔记元素: ${currentNotes.length} 个`);
    
    if (currentNotes.length > 0) {
        console.log('📊 分析前3个笔记元素:');
        for (let i = 0; i < Math.min(3, currentNotes.length); i++) {
            const note = currentNotes[i];
            const linkElement = note.querySelector('a.cover.mask.ld') || note.querySelector('a.cover.mask') || note.querySelector('a[href*="/search_result/"]');
            const titleElement = note.querySelector('.title span') || note.querySelector('.title');
            const likeElement = note.querySelector('.count[selected-disabled-search]') || note.querySelector('.like-wrapper .count') || note.querySelector('.count');
            
            console.log(`  笔记 ${i + 1}:`);
            console.log(`    有链接: ${!!linkElement}`);
            console.log(`    有标题: ${!!titleElement} ${titleElement ? '(' + titleElement.textContent.trim().substring(0, 30) + '...)' : ''}`);
            console.log(`    有点赞数: ${!!likeElement} ${likeElement ? '(' + likeElement.textContent + ')' : ''}`);
            
            if (linkElement) {
                const noteId = linkElement.href.split('/').pop().split('?')[0];
                const isAlreadyCollected = collectedData.some(item => item.id === noteId);
                console.log(`    笔记ID: ${noteId}`);
                console.log(`    已采集: ${isAlreadyCollected}`);
            }
        }
    }
    
    return {
        isCollecting,
        forceStop: window.forceStop,
        successCount,
        maxNotesToCollect,
        minLikes,
        collectedDataLength: collectedData.length,
        dataExported: window.dataExported,
        collectionCompleteSent: window.collectionCompleteSent,
        currentNoteElements: currentNotes.length,
        collectedData: collectedData.slice(0, 3) // 只返回前3条作为预览
    };
};

console.log('🔥 Content Script 加载完成!');
console.log('🔥 调试函数说明:');
console.log('🔥   testContentScript() - 测试脚本基本功能');
console.log('🔥   analyzePageStructure() - 分析页面结构和元素');
console.log('🔥   analyzeCollectionStatus() - 分析采集状态和已采集数据');

// 快速诊断函数
window.quickDiagnosis = function() {
    console.log('🩺 开始快速诊断...');
    console.log('🩺 =====================================');
    
    // 1. 检查脚本状态
    console.log('1️⃣ 脚本状态检查:');
    console.log(`   ✅ Content Script已加载: true`);
    console.log(`   📊 消息监听器已添加: ${!!window.messageListenerAdded}`);
    console.log(`   🔄 当前采集状态: ${isCollecting}`);
    console.log(`   🛑 强制停止标志: ${window.forceStop || false}`);
    
    // 2. 检查页面环境
    console.log('2️⃣ 页面环境检查:');
    console.log(`   🌐 页面URL: ${window.location.href}`);
    console.log(`   📄 页面标题: ${document.title}`);
    console.log(`   ⚡ 页面加载状态: ${document.readyState}`);
    console.log(`   👀 页面可见性: ${document.visibilityState}`);
    
    // 3. 检查笔记元素
    console.log('3️⃣ 笔记元素检查:');
    const mainSelector = 'section.note-item';
    const mainNotes = document.querySelectorAll(mainSelector);
    console.log(`   📝 主选择器 "${mainSelector}": ${mainNotes.length} 个`);
    
    if (mainNotes.length === 0) {
        console.log('   ⚠️  主选择器未找到元素，检查备用选择器...');
        const backupSelectors = ['.note-item', '[class*="note-item"]', '.feed-item', '.card'];
        let foundAlternative = false;
        
        backupSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            console.log(`   🔍 "${selector}": ${elements.length} 个`);
            if (elements.length > 0 && !foundAlternative) {
                foundAlternative = true;
                console.log(`   ✅ 可用的备用选择器: ${selector}`);
            }
        });
        
        if (!foundAlternative) {
            console.log('   ❌ 未找到任何可用的笔记元素选择器');
            console.log('   💡 建议: 执行 analyzePageStructure() 获取详细页面分析');
        }
    } else {
        // 检查前几个笔记元素的质量
        console.log(`   ✅ 找到 ${mainNotes.length} 个笔记元素，检查前3个...`);
        for (let i = 0; i < Math.min(3, mainNotes.length); i++) {
            const note = mainNotes[i];
            const hasLink = !!note.querySelector('a[href*="xiaohongshu.com"], a[href*="xhslink.com"]');
            const hasTitle = !!note.querySelector('.title, [class*="title"]');
            const hasLikes = !!note.querySelector('.count, [class*="like"]');
            
            console.log(`   📋 笔记 ${i + 1}: 链接=${hasLink}, 标题=${hasTitle}, 点赞=${hasLikes}`);
        }
    }
    
    // 4. 检查采集数据
    console.log('4️⃣ 采集数据检查:');
    console.log(`   📊 已采集数据数量: ${collectedData.length}`);
    console.log(`   🎯 成功采集数量: ${successCount}`);
    console.log(`   📈 最大采集数量: ${maxNotesToCollect}`);
    console.log(`   👍 最小点赞数要求: ${minLikes}`);
    console.log(`   📤 数据已导出: ${!!window.dataExported}`);
    console.log(`   ✅ 完成消息已发送: ${!!window.collectionCompleteSent}`);
    
    if (collectedData.length > 0) {
        console.log('   📋 数据样本:');
        console.log(`      标题: ${collectedData[0].title}`);
        console.log(`      作者: ${collectedData[0].author}`);
        console.log(`      点赞: ${collectedData[0].likes}`);
        console.log(`      内容长度: ${collectedData[0].content ? collectedData[0].content.length : 0} 字符`);
    }
    
    // 5. 给出诊断结论
    console.log('5️⃣ 诊断结论:');
    
    if (collectedData.length > 0) {
        console.log('   ✅ 采集功能正常，已有数据');
        if (!window.dataExported) {
            console.log('   ⚠️  数据尚未导出，可能需要手动触发');
        }
        if (!window.collectionCompleteSent) {
            console.log('   ⚠️  完成消息尚未发送给popup');
        }
    } else if (mainNotes.length === 0) {
        console.log('   ❌ 页面上没有找到笔记元素');
        console.log('   💡 可能原因: 页面结构变化或网络加载问题');
        console.log('   🔧 建议: 刷新页面或切换到小红书搜索结果页');
    } else {
        console.log('   ⚠️  找到笔记元素但未采集到数据');
        console.log('   💡 可能原因: 点赞数不足或元素解析问题');
        console.log('   🔧 建议: 降低最小点赞数要求或检查元素结构');
    }
    
    console.log('🩺 =====================================');
    console.log('🩺 快速诊断完成!');
    
    return {
        scriptLoaded: true,
        messageListenerAdded: !!window.messageListenerAdded,
        isCollecting,
        forceStop: window.forceStop || false,
        pageUrl: window.location.href,
        pageTitle: document.title,
        readyState: document.readyState,
        visibilityState: document.visibilityState,
        noteElementsFound: mainNotes.length,
        collectedDataCount: collectedData.length,
        successCount,
        maxNotesToCollect,
        minLikes,
        dataExported: !!window.dataExported,
        completeSent: !!window.collectionCompleteSent
    };
};

console.log('🔥 可以执行 quickDiagnosis() 进行快速问题诊断');

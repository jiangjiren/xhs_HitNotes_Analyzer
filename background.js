/* global config */

// 导入配置文件和xlsx库
importScripts('config.js');
importScripts('xlsx.full.min.js');

// 全局变量，用于控制流式输出
let shouldStopStreaming = false;

// 请求取消控制器
let abortController = new AbortController();

// 处理插件图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
    // 检查是否已有打开的窗口
    const existingWindows = await chrome.windows.getAll();
    const popupWindow = existingWindows.find(w => w.type === 'popup' && w.title === '小红书爆款采集分析');
    
    if (popupWindow) {
        // 如果窗口已存在，激活它
        await chrome.windows.update(popupWindow.id, { focused: true });
    } else {
        // 获取当前窗口的位置和大小
        const currentWindow = await chrome.windows.getCurrent();
        
        // 获取屏幕信息
        const displays = await chrome.system.display.getInfo();
        const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
        
        // 计算新窗口的位置
        let left = currentWindow.left + currentWindow.width;
        let top = currentWindow.top;
        
        // 确保窗口不会超出屏幕右边界
        if (left + 400 > primaryDisplay.bounds.width) {
            left = primaryDisplay.bounds.width - 400;
        }
        
        // 确保窗口不会超出屏幕底部
        if (top + 600 > primaryDisplay.bounds.height) {
            top = primaryDisplay.bounds.height - 600;
        }
        
        // 确保窗口不会超出屏幕左边界和顶部
        left = Math.max(0, left);
        top = Math.max(0, top);
        
        // 创建新窗口，使用计算后的位置
        await chrome.windows.create({
            url: 'popup.html',
            type: 'popup',
            width: 400,
            height: 600,
            left: left,
            top: top
        });
    }
});

// 下载文本文件的辅助函数
function downloadTextFile(content, filename) {
    console.log('📤 downloadTextFile开始执行:', {
        contentLength: content.length,
        filename: filename
    });

    return new Promise((resolve, reject) => {
        try {
            // 处理中文字符
            const encoder = new TextEncoder();
            const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
            const contentBytes = encoder.encode(content);

            // 合并BOM和内容
            const fileData = new Uint8Array(bom.length + contentBytes.length);
            fileData.set(bom);
            fileData.set(contentBytes, bom.length);

            // 转换为base64
            let binary = '';
            fileData.forEach(byte => binary += String.fromCharCode(byte));
            const base64Content = btoa(binary);

            // 创建data URL
            const mimeType = filename.endsWith('.csv') ? 'text/csv' : 'text/plain';
            const dataUrl = `data:${mimeType};charset=utf-8;base64,${base64Content}`;

            // 构建保存路径
            let savePath = `小红书爆款采集/${filename}`;

            console.log('📤 开始下载文件:', savePath);

            // 下载文件
            chrome.downloads.download({
                url: dataUrl,
                filename: savePath,
                saveAs: false
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('📤 下载失败:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    console.log('📤 下载成功，ID:', downloadId);
                    resolve(downloadId);
                }
            });
        } catch (error) {
            console.error('📤 下载文件时出错:', error);
            reject(error);
        }
    });
}

// 下载图片的辅助函数
function downloadImage(imageUrl, filename, timestamp) {
    console.log('📷 downloadImage开始执行:', {
        imageUrl: imageUrl,
        filename: filename,
        timestamp: timestamp
    });

    return new Promise((resolve, reject) => {
        try {
            // 清理文件名，移除非法字符
            const sanitizedFilename = filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);

            // 从URL中提取文件扩展名，如果没有则默认使用 .jpg
            let extension = '.jpg';
            const urlParts = imageUrl.split('.');
            const lastPart = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
            if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(lastPart)) {
                extension = '.' + lastPart;
            }

            // 构建保存路径：小红书爆款采集/封面图_时间戳/文件名.扩展名
            const savePath = `小红书爆款采集/封面图_${timestamp}/${sanitizedFilename}${extension}`;

            console.log('📷 开始下载图片:', savePath);

            // 下载图片
            chrome.downloads.download({
                url: imageUrl,
                filename: savePath,
                saveAs: false
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('📷 图片下载失败:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    console.log('📷 图片下载成功，ID:', downloadId);
                    resolve(downloadId);
                }
            });
        } catch (error) {
            console.error('📷 下载图片时出错:', error);
            reject(error);
        }
    });
}

// 生成Excel文件的辅助函数
function generateExcel(headers, data, filename, rowHeight = 20) { 
    try {
        // 创建工作簿
        const wb = XLSX.utils.book_new();
        
        // 创建工作表数据
        const wsData = [headers, ...data];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // 设置列宽 (自动适应内容，但不超过20)
        const colWidths = headers.map((h, i) => {
            // 获取该列所有数据的最大长度
            let maxLen = h.length;
            data.forEach(row => {
                if (row[i] && String(row[i]).length > maxLen) {
                    maxLen = String(row[i]).length;
                }
            });
            // 限制最大列宽为20
            return { wch: Math.min(maxLen, 20) };
        });
        
        // 设置行高
        const rowSettings = {};
        for (let i = 0; i < data.length + 1; i++) { // +1 是为了包括表头
            rowSettings[i] = { hpt: rowHeight }; // hpt是点数高度 (1/72英寸)
        }
        
        // 应用列宽和行高
        ws['!cols'] = colWidths;
        ws['!rows'] = rowSettings;
        
        // 将工作表添加到工作簿
        XLSX.utils.book_append_sheet(wb, ws, "爆款笔记数据");
        
        // 将工作簿转换为二进制数据
        const excelBinary = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
        
        // 转换为Blob
        const buffer = new ArrayBuffer(excelBinary.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < excelBinary.length; i++) {
            view[i] = excelBinary.charCodeAt(i) & 0xFF;
        }
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // 使用base64编码代替URL.createObjectURL
        const reader = new FileReader();
        reader.onload = function(e) {
            // 获取base64数据
            const base64data = e.target.result;
            
            console.log('📤 开始下载Excel文件:', `小红书爆款采集/${filename}`);
            
            // 下载文件
            chrome.downloads.download({
                url: base64data,
                filename: `小红书爆款采集/${filename}`,
                saveAs: false
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error('📤 Excel下载失败:', chrome.runtime.lastError);
                } else {
                    console.log('📤 Excel下载成功，ID:', downloadId);
                }
            });
        };
        
        reader.onerror = function(error) {
            console.error('📤 读取Excel文件失败:', error);
        };
        
        // 读取Blob为DataURL (base64)
        reader.readAsDataURL(blob);
        
        return true;
    } catch (error) {
        console.error('生成Excel文件时出错:', error);
        return false;
    }
}

// 发送状态更新的辅助函数
async function sendStatusUpdate(tabId, status) {
    try {
        await chrome.tabs.sendMessage(tabId, { action: 'updateStatus', status });
    } catch (error) {
        console.error('发送状态更新失败:', error);
    }
}

// DeepSeek API错误码对应的具体原因
const apiErrorMessages = {
    400: "请求参数有误，请检查您的输入内容是否符合要求",
    401: "API密钥无效或已过期，请检查您的API密钥设置",
    402: "账户余额不足，请前往 https://platform.deepseek.com 充值",
    403: "您没有权限访问该资源，请确认您的账户状态",
    404: "请求的资源不存在，请检查API地址是否正确",
    422: "请求参数错误，请根据错误信息提示修改相关参数",
    429: "请求速率达到上限，请合理规划您的请求速率",
    500: "服务器内部故障，请稍后重试。若问题一直存在，请联系客服",
    502: "服务暂时不可用，请稍后重试",
    503: "服务器负载过高，请稍后重试您的请求",
    504: "服务器响应超时，请稍后重试"
};

// 获取友好的错误提示信息
function getFriendlyErrorMessage(error) {
    console.log('处理错误信息:', error);
    
    // 如果错误信息已经包含了详细的API错误和解决方案，直接返回
    if (error.message.includes('API错误') && error.message.includes('💡 解决方案')) {
        return error.message;
    }
    
    // 尝试从错误消息中提取状态码
    const statusCodeMatch = error.message.match(/(\d{3})/);
    if (statusCodeMatch) {
        const statusCode = parseInt(statusCodeMatch[1]);
        if (apiErrorMessages[statusCode]) {
            // 如果错误消息中包含更多详细信息，也包含进来
            let detailedMessage = apiErrorMessages[statusCode];
            
            // 特别处理一些常见的详细错误信息
            if (error.message.includes('FAILED_PRECONDITION')) {
                detailedMessage += '\n💡 解决方案：您所在的地区不支持此API服务，请尝试使用VPN或切换到其他模型。';
            } else if (error.message.includes('INVALID_ARGUMENT')) {
                detailedMessage += '\n💡 解决方案：请求参数有误，请检查您的输入内容。';
            } else if (error.message.includes('PERMISSION_DENIED')) {
                detailedMessage += '\n💡 解决方案：API密钥权限不足，请检查您的API密钥设置。';
            }
            
            return detailedMessage;
        }
    }
    
    // 特别处理Gemini API的特定错误
    if (error.message.includes('User location is not supported')) {
        return 'Gemini API错误：您所在的地区不支持此API服务。\n💡 解决方案：请尝试使用VPN连接到支持的地区，或切换到DeepSeek模型。';
    }
    
    if (error.message.includes('API key not valid')) {
        return 'API密钥无效：请检查您在设置中输入的API密钥是否正确。';
    }
    
    // 特别处理DeepSeek API的特定错误
    if (error.message.includes('DeepSeek API错误 401')) {
        return 'DeepSeek API密钥错误：API密钥无效或已过期。\n💡 解决方案：请检查您的API密钥是否正确，如没有请先创建API密钥。';
    }
    
    if (error.message.includes('DeepSeek API错误 402')) {
        return 'DeepSeek账户余额不足。\n💡 解决方案：请前往 https://platform.deepseek.com 充值后重试。';
    }
    
    if (error.message.includes('DeepSeek API错误 429')) {
        return 'DeepSeek请求速率限制：请求过于频繁。\n💡 解决方案：请稍后重试，或合理规划您的请求频率。';
    }
    
    // 如果包含具体的错误信息，直接返回
    if (error.message.length > 20 && error.message.includes('API')) {
        return `AI服务错误：${error.message}`;
    }
    
    // 如果无法提取状态码或状态码没有对应的友好消息，返回通用错误消息
    return `调用AI服务时出现错误：${error.message}\n请稍后重试。如果问题持续存在，请检查您的API密钥设置或联系客服。`;
}

// 使用DeepSeek API分析内容
async function analyzeWithDeepSeek(content, tabId, isChat = false, isDataAnalysis = false, chatHistory = [], skipUserMessage = false, createNewSession = false, hasFile = false, customInstructionPrompt = '') {
    // 重置停止流式输出标志
    shouldStopStreaming = false;
    
    // 在每次API调用前，先从存储中获取最新的API密钥
    const apiKeyResult = await chrome.storage.local.get(['deepseekApiKey']);
    if (apiKeyResult.deepseekApiKey && apiKeyResult.deepseekApiKey.trim() !== '') {
        config.DEEPSEEK_API_KEY = apiKeyResult.deepseekApiKey;
        console.log('使用用户设置的API密钥');
    } else {
        console.log('未设置API密钥');
        // 发送提示消息到popup
        chrome.runtime.sendMessage({
            type: 'apiKeyRequired',
            message: '请点击右上角的设置图标，设置您的DeepSeek API密钥后就可以使用AI分析和对话功能。'
        });
        
        // 尝试清除旧的localStorage中的密钥，确保不会有混淆
        try {
            // 使用chrome.tabs.executeScript在当前标签页中执行脚本清除localStorage
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs.length > 0) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        function: () => {
                            localStorage.removeItem('apiKey');
                            console.log('已清除localStorage中的apiKey');
                        }
                    }).catch(err => console.error('清除localStorage失败:', err));
                }
            });
        } catch (e) {
            console.error('尝试清除localStorage时出错:', e);
        }
        
        return; // 终止API调用
    }
    
    console.log('开始调用DeepSeek API:', {
        contentLength: content.length,
        tabId: tabId,
        isChat: isChat,
        isDataAnalysis: isDataAnalysis,
        historyLength: chatHistory.length,
        apiKey: config.DEEPSEEK_API_KEY ? '已设置' : '未设置',
        skipUserMessage: skipUserMessage,
        createNewSession: createNewSession,
        customInstructionPrompt: customInstructionPrompt ? `已设置 (${customInstructionPrompt.length}字符)` : '未设置'
    });
    
    try {
        // 构建系统消息
        let systemMessage = isChat ?
            (isDataAnalysis ?
                "你是一个专业的小红书数据分析师，擅长分析小红书笔记数据，提供专业的数据洞察和建议。" :
                (hasFile ?
                    "你是一个资深的内容分析专家，擅长分析文本内容并回答相关问题。请仔细阅读用户上传的文件内容，并针对性地回答用户的问题。" :
                    "你是一个资深的内容分析专家，擅长分析文本内容并回答相关问题。")) :
            "你是一个专业的小红书内容分析师，擅长分析笔记内容特点和趋势。";

        // 如果有自定义指令，将其合并到系统消息中
        if (customInstructionPrompt && customInstructionPrompt.trim()) {
            systemMessage = customInstructionPrompt.trim() + '\n\n' + systemMessage;
            console.log('✅ DeepSeek: 自定义指令已合并到系统消息中');
            console.log('📝 DeepSeek: 自定义指令长度:', customInstructionPrompt.trim().length);
            console.log('📝 DeepSeek: 自定义指令预览:', customInstructionPrompt.trim().substring(0, 100) + '...');
            console.log('📋 DeepSeek: 最终系统消息长度:', systemMessage.length);
        } else {
            console.log('ℹ️ DeepSeek: 未设置自定义指令或自定义指令为空，使用默认系统消息');
            console.log('📝 DeepSeek: customInstructionPrompt值:', customInstructionPrompt);
        }

        // 构建完整的消息数组
        const messages = [
            { role: "system", content: systemMessage },
            ...chatHistory // 添加历史对话记录
        ];

        // 如果不是聊天模式，添加特定的分析提示
        if (!isChat) {
            messages.push({
                role: "user",
                content: `请分析以下小红书笔记内容：
${content}

请提供以下分析：
1. 笔记主题和内容总结
2. 5个潜在爆款选题建议`
            });
        } else {
            // 在聊天模式下，直接添加当前消息
            messages.push({
                role: "user",
                content: content
            });
        }

        console.log('准备发送API请求:', {
            url: config.DEEPSEEK_API_URL,
            messageCount: messages.length
        });

        // 设置30秒超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(config.DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: messages,
                temperature: 1.5,
                max_tokens: 2000,
                stream: true,
                createNewSession: createNewSession
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        console.log('API响应状态:', response.status, response.statusText);

        if (!response.ok) {
            let errorData = {};
            let detailedError = `DeepSeek API错误 ${response.status}`;
            
            try {
                errorData = await response.json();
                if (errorData.error) {
                    detailedError = `DeepSeek API错误 ${response.status}: ${errorData.error.message || errorData.error.code || '未知错误'}`;
                    
                    // 特别处理常见错误代码
                    const errorCode = errorData.error.code;
                    const errorMessage = errorData.error.message || '';
                    
                    if (errorCode === 'invalid_api_key' || errorMessage.includes('API key')) {
                        detailedError += '\n💡 解决方案：请检查您的DeepSeek API密钥是否正确，如没有API密钥请先创建。';
                    } else if (errorCode === 'rate_limit_exceeded' || response.status === 429) {
                        detailedError += '\n💡 解决方案：请求速率过快，请稍后重试或合理规划请求频率。';
                    } else if (errorCode === 'insufficient_quota' || response.status === 402) {
                        detailedError += '\n💡 解决方案：账户余额不足，请前往 https://platform.deepseek.com 充值。';
                    } else if (response.status === 400) {
                        detailedError += '\n💡 解决方案：请求格式错误，请检查输入内容是否符合要求。';
                    } else if (response.status === 422) {
                        detailedError += '\n💡 解决方案：请求参数有误，请根据错误信息修改相关参数。';
                    } else if (response.status >= 500) {
                        detailedError += '\n💡 解决方案：服务器故障，请稍后重试。如问题持续存在，请联系DeepSeek客服。';
                    }
                } else {
                    detailedError += `: ${JSON.stringify(errorData)}`;
                }
            } catch (e) {
                const text = await response.text();
                detailedError = `DeepSeek API错误 ${response.status}: ${text}`;
            }
            
            throw new Error(detailedError);
        }

        // 创建响应流读取器
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // 读取流数据
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 解码二进制数据
            const chunk = decoder.decode(value);
            buffer += chunk;

            // 处理数据块
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);

                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                            const content = parsed.choices[0].delta.content;

                            // 发送消息到popup
                            if (!skipUserMessage) {
                                chrome.runtime.sendMessage({
                                    type: 'streamResponse',
                                    content: content,
                                    isChat: isChat,
                                    createNewSession: createNewSession
                                }).catch(err => {
                                    console.error('发送消息到popup失败:', err);
                                });
                            } else {
                                // 如果是跳过用户消息的模式（一键总结），使用特殊类型
                                chrome.runtime.sendMessage({
                                    type: 'streamSummaryResponse',
                                    content: content,
                                    createNewSession: createNewSession
                                }).catch(err => {
                                    console.error('发送总结消息到popup失败:', err);
                                });
                            }
                        }
                    } catch (e) {
                        console.error('解析流数据时出错:', e);
                    }
                }
            }

            // 检查是否需要停止流式输出
            if (shouldStopStreaming) {
                console.log('停止流式输出');
                break;
            }
        }

        // 发送完成消息
        chrome.runtime.sendMessage({
            type: 'analysisComplete'
        }).catch(err => {
            console.error('发送完成消息失败:', err);
        });

    } catch (error) {
        console.error('API请求失败:', error);
        
        let friendlyErrorMessage;
        if (error.name === 'AbortError') {
            friendlyErrorMessage = 'DeepSeek API请求超时（30秒），请检查网络连接或稍后重试。';
        } else if (error.message.includes('DeepSeek API错误') && error.message.includes('💡 解决方案')) {
            // 如果错误信息已经包含了详细的解决方案，直接使用
            friendlyErrorMessage = error.message;
        } else {
            friendlyErrorMessage = getFriendlyErrorMessage(error);
        }
        
        console.log('最终发送的错误信息:', friendlyErrorMessage);
        chrome.runtime.sendMessage({
            type: 'error',
            error: friendlyErrorMessage
        });
    }
}

// 使用Gemini API分析内容（流式输出）
async function analyzeWithGemini(content, tabId, isChat = false, isDataAnalysis = false, chatHistory = [], skipUserMessage = false, createNewSession = false, model = 'gemini-3-flash-preview', hasFile = false, customInstructionPrompt = '') {
    shouldStopStreaming = false;
    const apiKeyResult = await chrome.storage.local.get(['geminiApiKey']);
    if (apiKeyResult.geminiApiKey && apiKeyResult.geminiApiKey.trim() !== '') {
        config.GEMINI_API_KEY = apiKeyResult.geminiApiKey;
        console.log('使用用户设置的Gemini API密钥');
    } else {
        console.log('未设置Gemini API密钥');
        chrome.runtime.sendMessage({
            type: 'apiKeyRequired',
            message: '请点击右上角的设置图标，设置您的Google Gemini API密钥后就可以使用AI分析和对话功能。'
        });
        return;
    }

    // 构建多轮对话历史，转换为Gemini REST API格式
    let contents = [];
    let systemMessage = isChat ?
        (isDataAnalysis ?
            "你是一个专业的小红书数据分析师，擅长分析小红书笔记数据，提供专业的数据洞察和建议。" :
            (hasFile ?
                "你是一个资深的内容分析专家，擅长分析文本内容并回答相关问题。请仔细阅读用户上传的文件内容，并针对性地回答用户的问题。" :
                "你是一个资深的内容分析专家，擅长分析文本内容并回答相关问题。")) :
        "你是一个专业的小红书内容分析师，擅长分析笔记内容特点和趋势。";

    // 如果有自定义指令，将其合并到系统消息中
    if (customInstructionPrompt && customInstructionPrompt.trim()) {
        systemMessage = customInstructionPrompt.trim() + '\n\n' + systemMessage;
        console.log('✅ Gemini: 自定义指令已合并到系统消息中');
        console.log('📝 Gemini: 自定义指令长度:', customInstructionPrompt.trim().length);
        console.log('📝 Gemini: 自定义指令预览:', customInstructionPrompt.trim().substring(0, 100) + '...');
        console.log('📋 Gemini: 最终系统消息长度:', systemMessage.length);
    } else {
        console.log('ℹ️ Gemini: 未设置自定义指令或自定义指令为空，使用默认系统消息');
        console.log('📝 Gemini: customInstructionPrompt值:', customInstructionPrompt);
    }

    contents.push({ role: "user", parts: [{ text: systemMessage }] });
    for (const msg of chatHistory) {
        if (msg.role && msg.content) {
            let role = msg.role === 'user' ? 'user' : 'model';
            contents.push({ role, parts: [{ text: msg.content }] });
        }
    }
    if (content && content.trim()) {
        contents.push({ role: "user", parts: [{ text: content }] });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.GEMINI_API_KEY}`;
    const payload = { 
        contents,
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192
        }
    };
    console.log('Gemini 流式API请求:', JSON.stringify(payload));
    console.log('Gemini API端点:', endpoint);
    console.log('Gemini API密钥长度:', config.GEMINI_API_KEY ? config.GEMINI_API_KEY.length : 0);
    console.log('Gemini自定义指令状态:', customInstructionPrompt ? `已设置 (${customInstructionPrompt.length}字符)` : '未设置');
    
    let reader = null;
    try {
        // 设置30秒超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Gemini API响应状态:', response.status);
        console.log('Gemini API响应头:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API错误:', response.status, errorText);
            
            // 尝试解析错误信息
            let detailedError = `Gemini API错误 ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                console.log('解析的Gemini错误数据:', errorData);
                if (errorData.error) {
                    detailedError = `Gemini API错误 ${response.status}: ${errorData.error.message || errorData.error.code || '未知错误'}`;
                    
                    // 特别处理常见错误
                    if (errorData.error.code === 'FAILED_PRECONDITION' || errorData.error.message?.includes('User location is not supported')) {
                        detailedError += '\n💡 解决方案：您所在的地区不支持Gemini API，请尝试使用VPN或切换到DeepSeek模型。';
                        console.log('检测到地区限制错误，添加解决方案');
                    } else if (errorData.error.code === 'INVALID_ARGUMENT') {
                        detailedError += '\n💡 解决方案：请求参数有误，请检查输入内容是否符合要求。';
                    } else if (errorData.error.code === 'PERMISSION_DENIED') {
                        detailedError += '\n💡 解决方案：API密钥权限不足，请检查您的Gemini API密钥设置。';
                    } else if (errorData.error.code === 'RESOURCE_EXHAUSTED') {
                        detailedError += '\n💡 解决方案：API配额已用尽，请稍后重试或升级您的Gemini账户。';
                    } else if (errorData.error.code === 'UNAUTHENTICATED') {
                        detailedError += '\n💡 解决方案：API密钥无效，请检查您的Gemini API密钥设置。';
                    }
                }
            } catch (parseError) {
                console.log('解析Gemini错误JSON失败:', parseError);
                detailedError += `: ${errorText}`;
            }
            
            console.log('构建的详细错误信息:', detailedError);
            
            // 如果流式API失败，尝试使用非流式API
            console.log('尝试使用非流式Gemini API...');
            const nonStreamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.GEMINI_API_KEY}`;
            const nonStreamResponse = await fetch(nonStreamEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (nonStreamResponse.ok) {
                const result = await nonStreamResponse.json();
                console.log('非流式Gemini API成功:', result);
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    chrome.runtime.sendMessage({
                        type: 'streamResponse',
                        content: text,
                        isChat: isChat,
                        createNewSession: createNewSession
                    });
                    chrome.runtime.sendMessage({ type: 'analysisComplete' });
                    return;
                }
            } else {
                // 非流式API也失败了，获取更详细的错误信息
                const nonStreamErrorText = await nonStreamResponse.text();
                console.log('非流式API也失败，错误信息:', nonStreamErrorText);
                try {
                    const nonStreamErrorData = JSON.parse(nonStreamErrorText);
                    if (nonStreamErrorData.error) {
                        // 如果非流式API返回同样的错误，保持原来的详细错误信息
                        if (nonStreamErrorData.error.code === 'FAILED_PRECONDITION' || 
                            nonStreamErrorData.error.message?.includes('User location is not supported')) {
                            // 保持原来的详细错误信息，不要覆盖
                            console.log('保持原来的地区限制错误信息');
                        } else {
                            detailedError = `Gemini API错误: ${nonStreamErrorData.error.message || nonStreamErrorData.error.code}`;
                        }
                    }
                } catch (e) {
                    // 解析失败，使用原始错误文本
                    console.log('解析非流式API错误失败:', e);
                }
            }
            
            throw new Error(detailedError);
        }
        
        if (!response.body) {
            throw new Error('Gemini流式API响应体为空');
        }
        
        reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        
                while (true) {
            // 检查是否需要停止流式输出
            if (shouldStopStreaming) {
                console.log('停止Gemini流式输出');
                break;
            }

            const { done, value } = await reader.read();
            if (done) {
                console.log('Gemini流读取完成');
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            console.log('Gemini原始数据块:', chunk);
            buffer += chunk;
            
            // 处理每一行数据（Gemini的数据格式是每行一个data:对象）
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留最后不完整的行
            
            for (const line of lines) {
                if (shouldStopStreaming) {
                    console.log('停止Gemini流式输出');
                    break;
                }
                
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
                
                console.log('Gemini处理行:', trimmedLine);
                
                // 检查是否是data:行
                if (trimmedLine.startsWith('data: ')) {
                    const dataStr = trimmedLine.slice(6).trim();
                    console.log('Gemini提取的数据:', dataStr);
                    
                    // 跳过结束标记
                    if (dataStr === '[DONE]' || dataStr === '') {
                        console.log('Gemini流式输出完成标记');
                        continue;
                    }
                    
                    try {
                        const data = JSON.parse(dataStr);
                        console.log('Gemini解析的JSON数据:', data);
                        
                        // 检查错误
                        if (data.error) {
                            console.error('Gemini API返回错误:', data.error);
                            throw new Error(`Gemini API错误: ${data.error.message || JSON.stringify(data.error)}`);
                        }
                        
                        // 提取文本内容
                        const part = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (part) {
                            console.log('Gemini发送内容片段:', part);
                            chrome.runtime.sendMessage({
                                type: 'streamResponse',
                                content: part,
                                isChat: isChat,
                                createNewSession: createNewSession
                            });
                        } else {
                            console.log('Gemini数据中没有文本内容，完整结构:', JSON.stringify(data, null, 2));
                            
                            // 检查完成原因
                            if (data.candidates?.[0]?.finishReason) {
                                console.log('Gemini完成原因:', data.candidates[0].finishReason);
                            }
                        }
                    } catch (parseError) {
                        console.error('Gemini JSON解析失败:', parseError, '原始数据:', dataStr);
                    }
                } else {
                    console.log('Gemini非data行，跳过:', trimmedLine);
                }
            }
            
            if (shouldStopStreaming) break;
        }
        
        // 确保发送完成消息
        if (!shouldStopStreaming) {
            chrome.runtime.sendMessage({ type: 'analysisComplete' });
        }
        
    } catch (error) {
        console.error('Gemini流式API请求失败:', error);
        
        let friendlyErrorMessage;
        if (error.name === 'AbortError') {
            friendlyErrorMessage = 'Gemini API请求超时（30秒），请检查网络连接或稍后重试。';
        } else if (error.message.includes('Gemini API错误') && error.message.includes('💡 解决方案')) {
            // 如果错误信息已经包含了详细的解决方案，直接使用
            friendlyErrorMessage = error.message;
        } else {
            friendlyErrorMessage = getFriendlyErrorMessage(error);
        }
        
        console.log('最终发送的错误信息:', friendlyErrorMessage);
        chrome.runtime.sendMessage({
            type: 'error',
            error: friendlyErrorMessage
        });
    } finally {
        // 确保清理资源
        if (reader) {
            try {
                await reader.cancel();
            } catch (e) {
                console.log('取消reader时出错:', e);
            }
        }
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeContent') {
        // 添加日志记录收到的请求
        console.log('收到分析内容请求:', {
            contentLength: request.content ? request.content.length : 0,
            isChat: request.isChat,
            isDataAnalysis: request.isDataAnalysis,
            hasFile: request.hasFile,
            skipUserMessage: request.skipUserMessage,
            createNewSession: request.createNewSession,
            model: request.model || 'deepseek' // 默认使用DeepSeek模型
        });
        // 获取当前活动标签页
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs.length > 0) {
                console.log('background.js 收到的模型参数:', request.model);
      if (request.model === 'gemini-3-flash-preview' || request.model === 'gemini-3.1-pro-preview') {
                    console.log('调用Gemini API，模型:', request.model);
                    analyzeWithGemini(
                        request.content,
                        tabs[0].id,
                        request.isChat,
                        request.isDataAnalysis,
                        request.chatHistory || [],
                        request.skipUserMessage || false,
                        request.createNewSession || false,
                        request.model, // 传递具体的模型名称
                        request.hasFile || false, // 传递hasFile参数
                        request.customInstructionPrompt || ''
                    );
                } else {
                    console.log('调用DeepSeek API，模型:', request.model);
                    analyzeWithDeepSeek(
                        request.content,
                        tabs[0].id,
                        request.isChat,
                        request.isDataAnalysis,
                        request.chatHistory || [],
                        request.skipUserMessage || false,
                        request.createNewSession || false,
                        request.hasFile || false, // 传递hasFile参数
                        request.customInstructionPrompt || ''
                    );
                }
                // 发送确认响应，表示已开始处理
                sendResponse({status: 'processing'});
            } else {
                console.error('无法获取当前标签页');
                sendResponse({error: '无法获取当前标签页'});
            }
        });
        return true; // 异步
    } else if (request.action === 'updateApiKey') {
        // 处理API密钥更新
        console.log('收到API密钥更新请求');
        if (request.apiKey && request.apiKey.trim() !== '') {
            config.DEEPSEEK_API_KEY = request.apiKey;
            console.log('DeepSeek API密钥已更新');
        }
        if (request.geminiApiKey && request.geminiApiKey.trim() !== '') {
            config.GEMINI_API_KEY = request.geminiApiKey;
            console.log('Gemini API密钥已更新');
        }
        sendResponse({status: 'success'});
        return false;
    } else if (request.action === 'downloadFile') {
        console.log('📤 收到下载文件请求:', request.filename);
        downloadTextFile(request.content, request.filename)
            .then(() => {
                console.log('📤 文件下载成功');
                sendResponse({ status: 'success' });
            })
            .catch(error => {
                console.error('📤 下载文件时出错:', error);
                sendResponse({ status: 'error', message: error.message });
            });
        return true; // 保持消息通道开放以进行异步响应
    } else if (request.action === 'generateExcel') {
        try {
            const result = generateExcel(
                request.headers, 
                request.data, 
                request.filename, 
                request.rowHeight || 20
            );
            sendResponse({ status: result ? 'success' : 'error' });
        } catch (error) {
            console.error('生成Excel文件时出错:', error);
            sendResponse({ status: 'error', message: error.message });
        }
        return false;
    } else if (request.action === 'stopStreaming') {
        shouldStopStreaming = true;
        console.log('停止流式输出');
        sendResponse({status: 'stopped'});
        return false;
    } else if (request.action === 'getAnyPageContent') {
        console.log('收到获取任意网页内容请求:', request.tabId);
        getAnyPageContent(request.tabId)
            .then(result => {
                console.log('获取页面内容成功:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('获取页面内容失败:', error);
                sendResponse({
                    success: false,
                    message: '获取页面内容失败: ' + error.message
                });
            });
        return true;
    } else if (request.action === 'cancelPendingRequests') {
        console.log('取消所有未完成的请求');
        abortController.abort();
        sendResponse({status: 'cancelled'});
        return false;
    } else if (request.action === 'downloadImage') {
        console.log('📷 收到下载图片请求:', request.filename);
        downloadImage(request.imageUrl, request.filename, request.timestamp)
            .then(() => {
                console.log('📷 图片下载成功');
                sendResponse({ status: 'success' });
            })
            .catch(error => {
                console.error('📷 下载图片时出错:', error);
                sendResponse({ status: 'error', message: error.message });
            });
        return true; // 保持消息通道开放以进行异步响应
    }
});

chrome.runtime.onInstalled.addListener(() => {
  // 设置侧边栏显示规则
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

// 监听页面变化以显示侧边栏
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('xiaohongshu.com')) {
    try {
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'popup.html',
        enabled: true
      });
    } catch (error) {
      console.error('设置侧边栏失败:', error);
    }
  }
});

// 监听插件图标点击事件，打开侧边栏
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.includes('xiaohongshu.com')) {
    try {
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: 'popup.html',
        enabled: true
      });
      await chrome.sidePanel.toggle(tab.id);
    } catch (error) {
      console.error('打开侧边栏失败:', error);
    }
  }
}); 

// 获取任意网页内容的函数
async function getAnyPageContent(tabId) {
  try {
    console.log('开始获取页面内容，标签页ID:', tabId);
    
    // 注入并执行脚本，获取页面内容
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // 这个函数会在目标页面中执行
        try {
          // 获取页面标题
          const title = document.title || '未能获取标题';
          
          // 获取页面URL
          const url = window.location.href;
          
          // 获取页面主要内容
          let content = '';
          
          // 尝试获取文章主体内容
          const mainContentSelectors = [
            'article', // 通用文章标签
            '.article-content', // 常见的文章内容类
            '.post-content',
            '.entry-content',
            '.content',
            'main',
            '#content',
            '.main-content',
            '.post',
            '.article'
          ];
          
          // 尝试各种选择器获取内容
          let mainElement = null;
          for (const selector of mainContentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim().length > 100) {
              mainElement = element;
              break;
            }
          }
          
          // 如果找到了主要内容元素
          if (mainElement) {
            content = mainElement.textContent.trim();
          } else {
            // 如果没有找到主要内容，获取body内容并去除脚本等
            const body = document.body;
            if (body) {
              // 创建body的克隆，以便我们可以安全地修改它
              const bodyClone = body.cloneNode(true);
              
              // 移除所有脚本、样式、导航、页脚等非内容元素
              const elementsToRemove = bodyClone.querySelectorAll('script, style, nav, footer, header, .header, .footer, .nav, .menu, .sidebar, .ad, .advertisement');
              elementsToRemove.forEach(el => el.remove());
              
              // 获取清理后的内容
              content = bodyClone.textContent.trim();
            }
          }
          
          // 清理内容，移除多余空白
          content = content.replace(/\s+/g, ' ').trim();
          
          // 如果内容太长，截取前10000个字符
          if (content.length > 10000) {
            content = content.substring(0, 10000) + '...(内容已截断)';
          }
          
          // 尝试获取作者信息
          let author = '';
          const authorSelectors = [
            '.author', 
            '.byline', 
            '.post-author', 
            'meta[name="author"]', 
            '[rel="author"]'
          ];
          
          for (const selector of authorSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              if (selector === 'meta[name="author"]') {
                author = element.getAttribute('content');
              } else {
                author = element.textContent.trim();
              }
              if (author) break;
            }
          }
          
          // 返回结果
          return {
            success: true,
            title,
            content,
            author: author || '未知作者',
            url,
            isArticle: !!mainElement,
            source: document.domain
          };
        } catch (error) {
          return {
            success: false,
            message: '在页面中执行脚本时出错: ' + error.message
          };
        }
      }
    });
    
    console.log('页面内容获取结果:', results);
    
    // 检查结果
    if (!results || results.length === 0) {
      return {
        success: false,
        message: '无法获取页面内容'
      };
    }
    
    // 返回执行结果
    return results[0].result;
    
  } catch (error) {
    console.error('获取页面内容时出错:', error);
    return {
      success: false,
      message: '获取页面内容时出错: ' + error.message
    };
  }
}

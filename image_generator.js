// ----------------------------------------------------------------------------
// 图片生成API密钥管理
// 安全实践：密钥从用户设置中获取，而非硬编码在代码中
// ----------------------------------------------------------------------------

// 初始化空密钥变量
let AK = null; // Access Key ID
let SK = null; // Secret Access Key

// 新增：从 popup.js 更新密钥的函数，并挂载到window上
window.updateImageGenCredentials = function(newAK, newSK) {
  AK = newAK;
  SK = newSK;
  
  // 如果更新了密钥，隐藏错误提示
  const errorDisplay = document.getElementById('errorDisplay');
  if (errorDisplay && checkApiKeysConfigured()) {
      errorDisplay.style.display = 'none';
  }
};

// 检查是否配置了API密钥
function checkApiKeysConfigured() {
  return AK !== null && SK !== null && AK.trim() !== '' && SK.trim() !== '';
}

// 显示未配置密钥的错误提示
function showApiKeyError() {
  const errorDisplay = document.getElementById('errorDisplay');
  if (errorDisplay) {
    errorDisplay.textContent = '请先配置图片生成API密钥！点击右侧导航栏底部的设置图标进行配置。';
    errorDisplay.style.display = 'block';
  }
}

// 从本地存储中读取设置
function loadApiKeys() {
  // 使用 chrome.storage.local API
  chrome.storage.local.get(['imageGenApiKey', 'imageGenApiSecret'], (result) => {
    const savedAK = result.imageGenApiKey;
    const savedSK = result.imageGenApiSecret;

    // 只有当密钥存在且非空时才设置
    if (savedAK && savedAK.trim() !== '') {
      AK = savedAK;
    }
    
    if (savedSK && savedSK.trim() !== '') {
      SK = savedSK;
    }
  });
}

const API_HOST = 'visual.volcengineapi.com';
const API_SERVICE = 'cv';
const API_REGION = 'cn-north-1'; // 根据实际情况选择区域
const API_ACTION = 'CVProcess'; // 根据API文档
const API_VERSION = '2022-08-31'; // 请根据实际API版本填写

// 使用CryptoJS库进行哈希和签名计算

// 默认图片尺寸和比例设置
let currentWidth = 1328;
let currentHeight = 1328;
let currentRatio = "1:1";

// 初始化页面
function initImageGenerator() {
    
    // 加载保存的API密钥
    loadApiKeys();
    
    // 获取DOM元素
    const generateButton = document.getElementById('generateButton');
    const promptInput = document.getElementById('promptInput');
    const imageGallery = document.getElementById('imageGallery');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    const aspectRatioButtons = document.querySelectorAll('.aspect-ratio-btn');
    
    // 设置默认选中的比例按钮
    aspectRatioButtons.forEach(btn => {
        if (btn.dataset.ratio === currentRatio) {
            btn.classList.add('active');
        }
        
        // 添加点击事件
        btn.addEventListener('click', () => {
            // 移除所有按钮的active类
            aspectRatioButtons.forEach(b => b.classList.remove('active'));
            // 为当前按钮添加active类
            btn.classList.add('active');
            
            // 更新当前宽高和比例
            currentWidth = parseInt(btn.dataset.width);
            currentHeight = parseInt(btn.dataset.height);
            currentRatio = btn.dataset.ratio;
            
            // 更新输入框的值
            widthInput.value = currentWidth;
            heightInput.value = currentHeight;
        });
    });
    
    // 为宽度输入框添加事件监听
    widthInput.addEventListener('change', () => {
        currentWidth = parseInt(widthInput.value);
        // 确保宽度在有效范围内
        if (currentWidth < 512) currentWidth = 512;
        if (currentWidth > 2048) currentWidth = 2048;
        // 移除必须是8的倍数的限制
        widthInput.value = currentWidth;
        
        // 移除所有比例按钮的active类
        aspectRatioButtons.forEach(btn => btn.classList.remove('active'));
    });
    
    // 为高度输入框添加事件监听
    heightInput.addEventListener('change', () => {
        currentHeight = parseInt(heightInput.value);
        // 确保高度在有效范围内
        if (currentHeight < 512) currentHeight = 512;
        if (currentHeight > 2048) currentHeight = 2048;
        // 移除必须是8的倍数的限制
        heightInput.value = currentHeight;
        
        // 移除所有比例按钮的active类
        aspectRatioButtons.forEach(btn => btn.classList.remove('active'));
    });
    
    // 生成图片按钮点击事件
    generateButton.addEventListener('click', async () => {
        const promptTextArea = document.getElementById('promptInput');
        const promptText = promptTextArea.value.trim();
        if (!promptText) {
            showError('请输入图像描述文字！');
            return;
        }

        // 检查API密钥是否已配置
        if (!checkApiKeysConfigured()) {
            showApiKeyError();
            return;
        }

        showLoading(true);
        clearError();
        clearImages();

        try {
            const requestUrl = `https://${API_HOST}/?Action=${API_ACTION}&Version=${API_VERSION}`;

            // 1. 准备请求体 (Payload)
            // 使用火山引擎通用3.0-文生图API
            // 参数说明：
            // req_key: 模型标识符
            // prompt: 用户输入的描述文字
            // seed: 随机种子，-1表示随机生成
            // scale: 提示词相关性，值越大越遵循提示词
            // width/height: 图片尺寸，必须是8的倍数
            const requestPayload = {
                req_key: "high_aes_general_v30l_zt2i", // 火山引擎通用3.0文生图模型
                prompt: promptText,     // 用户输入的描述
                seed: -1,               // 随机种子
                scale: 2.5,             // 提示词相关性
                width: currentWidth,     // 使用用户设置的宽度
                height: currentHeight,   // 使用用户设置的高度
            };
            
            const bodyString = JSON.stringify(requestPayload);

            // 2. 准备签名所需信息
            const httpRequestMethod = 'POST';
            const canonicalURI = '/'; // 通常是 /
            const canonicalQueryString = `Action=${API_ACTION}&Version=${API_VERSION}`; // Query 参数
            
            // 正确生成 YYYYMMDDTHHMMSSZ 格式的 UTC 时间戳 (X-Date) 和 YYYYMMDD 格式的日期 (CredentialScope)
            const now = new Date();
            const year = now.getUTCFullYear();
            const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
            const day = now.getUTCDate().toString().padStart(2, '0');
            const hours = now.getUTCHours().toString().padStart(2, '0');
            const minutes = now.getUTCMinutes().toString().padStart(2, '0');
            const seconds = now.getUTCSeconds().toString().padStart(2, '0');

            const isoDate = `${year}${month}${day}T${hours}${minutes}${seconds}Z`; // 格式如 20240510T023043Z
            const shortDate = `${year}${month}${day}`;

            // 使用CryptoJS计算请求体的SHA256哈希
            const hashedPayload = CryptoJS.SHA256(bodyString).toString(CryptoJS.enc.Hex);
            
            // 3. 构建规范请求 (Canonical Request)
            const canonicalHeaders = `content-type:application/json\nhost:${API_HOST}\nx-content-sha256:${hashedPayload}\nx-date:${isoDate}\n`;
            const signedHeaders = 'content-type;host;x-content-sha256;x-date';
            const canonicalRequest = 
                `${httpRequestMethod}\n` +
                `${canonicalURI}\n` +
                `${canonicalQueryString}\n` +
                `${canonicalHeaders}\n` +
                `${signedHeaders}\n` +
                `${hashedPayload}`;

            // 4. 计算签名 (Signature)
            const hashedCanonicalRequest = CryptoJS.SHA256(canonicalRequest).toString(CryptoJS.enc.Hex);
            const stringToSign = 
                `HMAC-SHA256\n` +
                `${isoDate}\n` +
                `${shortDate}/${API_REGION}/${API_SERVICE}/request\n` +
                `${hashedCanonicalRequest}`;

            // 使用HMAC-SHA256计算签名
            const kDate = CryptoJS.HmacSHA256(shortDate, SK); // SK 是 SecretKey
            const kRegion = CryptoJS.HmacSHA256(API_REGION, kDate);
            const kService = CryptoJS.HmacSHA256(API_SERVICE, kRegion);
            const kSigning = CryptoJS.HmacSHA256('request', kService);
            const signature = CryptoJS.HmacSHA256(stringToSign, kSigning).toString(CryptoJS.enc.Hex);

            // 5. 构建 Authorization Header
            const authorizationHeader = 
                `HMAC-SHA256 Credential=${AK}/${shortDate}/${API_REGION}/${API_SERVICE}/request, ` +
                `SignedHeaders=${signedHeaders}, Signature=${signature}`;

            // 6. 发送请求
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Date': isoDate,
                    'X-Content-Sha256': hashedPayload,
                    'Authorization': authorizationHeader,
                    'Host': API_HOST // Host header 也是必须的
                },
                body: bodyString
            });

            showLoading(false);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                let errorMessage = `API 请求失败，状态码: ${response.status}`;
                if (errorData && errorData.ResponseMetadata && errorData.ResponseMetadata.Error) {
                    errorMessage += `\n错误类型: ${errorData.ResponseMetadata.Error.Code}`; 
                    errorMessage += `\n错误信息: ${errorData.ResponseMetadata.Error.Message}`;
                } else if (errorData && errorData.message) {
                    errorMessage += `\n信息: ${errorData.message}`;
                }
                showError(errorMessage);
                return;
            }

            const result = await response.json();

            // 处理API响应
            if (result.ResponseMetadata && result.ResponseMetadata.Error) {
                showError(`API 返回错误: ${result.ResponseMetadata.Error.Code} - ${result.ResponseMetadata.Error.Message}`);
            } else if (result.code && result.code !== 10000 && result.message) {
                showError(`API 返回错误: ${result.code} - ${result.message}`);
            } else if (result.code === 10000 && result.data && result.data.binary_data_base64) {
                if (Array.isArray(result.data.binary_data_base64) && result.data.binary_data_base64.length > 0) {
                    result.data.binary_data_base64.forEach((base64Image, index) => {
                        if (!base64Image || base64Image.trim() === '') {
                            return; // 跳过空的 base64 字符串
                        }
                        
                        // 创建图片容器
                        const imageContainer = document.createElement('div');
                        imageContainer.className = 'image-container';
                        
                        // 创建缩略图
                        const thumbnailElement = document.createElement('img');
                        thumbnailElement.className = 'thumbnail';
                        thumbnailElement.alt = `${promptText}`;
                        
                        // 创建下载按钮
                        const downloadButton = document.createElement('button');
                        downloadButton.className = 'download-btn';
                        downloadButton.innerHTML = '<i class="download-icon"></i>下载';
                        
                        // 添加到容器
                        imageContainer.appendChild(thumbnailElement);
                        imageContainer.appendChild(downloadButton);
                        
                        // 设置图片源（先尝试JPEG）
                        const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;
                        thumbnailElement.src = imageDataUrl;
                        
                        // 为缩略图添加点击事件，显示大图
                        thumbnailElement.addEventListener('click', () => {
                            showLightbox(imageDataUrl, promptText);
                        });
                        
                        // 为下载按钮添加点击事件
                        downloadButton.addEventListener('click', (e) => {
                            e.stopPropagation(); // 防止触发缩略图的点击事件
                            downloadImage(imageDataUrl, `AI生成图片_${new Date().getTime()}.jpg`);
                        });
                        

                        
                        // 错误处理
                        thumbnailElement.onerror = function() {
                            const pngDataUrl = `data:image/png;base64,${base64Image}`;
                            thumbnailElement.src = pngDataUrl;
                            
                            // 更新点击和下载事件中的URL
                            thumbnailElement.onclick = () => showLightbox(pngDataUrl, promptText);
                            downloadButton.onclick = (e) => {
                                e.stopPropagation();
                                downloadImage(pngDataUrl, `AI生成图片_${new Date().getTime()}.png`);
                            };
                            
                            thumbnailElement.onerror = function() {
                                thumbnailElement.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="%23f44336" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
                                thumbnailElement.alt = '图片加载失败';
                                downloadButton.disabled = true;
                            };
                        };
                        
                        // 添加到画廊
                        imageGallery.appendChild(imageContainer);
                    });
                } else {
                    showError('API成功返回，但图片数据格式不正确 (binary_data_base64)。请检查控制台。');
                }
            } else if (result.data && result.data.image_urls && result.data.image_urls.length > 0) {
                result.data.image_urls.forEach(imageUrl => {
                    // 创建图片容器
                    const imageContainer = document.createElement('div');
                    imageContainer.className = 'image-container';
                    
                    // 创建缩略图
                    const thumbnailElement = document.createElement('img');
                    thumbnailElement.className = 'thumbnail';
                    thumbnailElement.src = imageUrl;
                    thumbnailElement.alt = promptText;
                    
                    // 创建下载按钮
                    const downloadButton = document.createElement('button');
                    downloadButton.className = 'download-btn';
                    downloadButton.innerHTML = '<i class="download-icon"></i>下载';
                    
                    // 添加到容器
                    imageContainer.appendChild(thumbnailElement);
                    imageContainer.appendChild(downloadButton);
                    
                    // 为缩略图添加点击事件，显示大图
                    thumbnailElement.addEventListener('click', () => {
                        showLightbox(imageUrl, promptText);
                    });
                    
                    // 为下载按钮添加点击事件
                    downloadButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // 对于URL，我们需要先下载图片再转为blob
                        fetch(imageUrl)
                            .then(response => response.blob())
                            .then(blob => {
                                const url = window.URL.createObjectURL(blob);
                                downloadImage(url, `AI生成图片_${new Date().getTime()}.jpg`);
                                window.URL.revokeObjectURL(url);
                            })
                            .catch(error => {
                                // 下载失败，静默处理
                            });
                    });
                    
                    // 添加到画廊
                    imageGallery.appendChild(imageContainer);
                });
            } else if (result.data && result.data.image_base64 && result.data.image_base64.length > 0) {
                result.data.image_base64.forEach(base64Image => {
                    // 创建图片容器
                    const imageContainer = document.createElement('div');
                    imageContainer.className = 'image-container';
                    
                    // 创建缩略图
                    const thumbnailElement = document.createElement('img');
                    thumbnailElement.className = 'thumbnail';
                    thumbnailElement.alt = promptText;
                    
                    // 创建下载按钮
                    const downloadButton = document.createElement('button');
                    downloadButton.className = 'download-btn';
                    downloadButton.innerHTML = '<i class="download-icon"></i>下载';
                    
                    // 添加到容器
                    imageContainer.appendChild(thumbnailElement);
                    imageContainer.appendChild(downloadButton);
                    
                    // 设置图片源
                    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;
                    thumbnailElement.src = imageDataUrl;
                    
                    // 为缩略图添加点击事件，显示大图
                    thumbnailElement.addEventListener('click', () => {
                        showLightbox(imageDataUrl, promptText);
                    });
                    
                    // 为下载按钮添加点击事件
                    downloadButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        downloadImage(imageDataUrl, `AI生成图片_${new Date().getTime()}.jpg`);
                    });
                    
                    // 添加到画廊
                    imageGallery.appendChild(imageContainer);
                });
            } else {
                showError('API成功返回，但无法识别图片数据格式。请检查控制台。');
            }
        } catch (error) {
            showLoading(false);
            showError(`请求过程中发生错误: ${error.message || error}`);
        }
    });
    
}

function showLoading(isLoading) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const generateButton = document.getElementById('generateButton');
    loadingIndicator.style.display = isLoading ? 'block' : 'none';
    generateButton.disabled = isLoading;
}

function showError(message) {
    const errorDisplay = document.getElementById('errorDisplay');
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
}

function clearError() {
    const errorDisplay = document.getElementById('errorDisplay');
    errorDisplay.textContent = '';
    errorDisplay.style.display = 'none';
}

function clearImages() {
    const imageGallery = document.getElementById('imageGallery');
    imageGallery.innerHTML = '';
}



// 创建并显示灯箱效果（放大查看图片）
function showLightbox(imageUrl, altText) {
    // 创建灯箱容器
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    
    // 创建图片元素
    const fullImage = document.createElement('img');
    fullImage.src = imageUrl;
    fullImage.alt = altText;
    
    // 创建关闭按钮
    const closeButton = document.createElement('button');
    closeButton.className = 'lightbox-close';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        document.body.removeChild(lightbox);
    });
    
    // 创建下载按钮
    const downloadButton = document.createElement('button');
    downloadButton.className = 'lightbox-download';
    downloadButton.innerHTML = '下载图片';
    downloadButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const extension = imageUrl.includes('image/jpeg') ? 'jpg' : 'png';
        downloadImage(imageUrl, `AI生成图片_${new Date().getTime()}.${extension}`);
    });
    
    // 添加元素到灯箱
    lightbox.appendChild(fullImage);
    lightbox.appendChild(closeButton);
    lightbox.appendChild(downloadButton);
    
    // 点击灯箱背景关闭
    lightbox.addEventListener('click', () => {
        document.body.removeChild(lightbox);
    });
    
    // 阻止点击图片时关闭灯箱
    fullImage.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 添加到页面
    document.body.appendChild(lightbox);
}

// 下载图片函数
function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}



// 提醒用户配置 AK/SK
if (AK === 'YOUR_ACCESS_KEY_ID' || SK === 'YOUR_SECRET_ACCESS_KEY') {
    showError('重要提示：请打开 image_generator.js 文件，将 AK 和 SK 替换为你的火山引擎 Access Key ID 和 Secret Access Key。否则程序无法工作。');
}

// 导出初始化函数
window.initImageGenerator = initImageGenerator;

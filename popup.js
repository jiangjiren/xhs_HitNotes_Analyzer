// ===== 扩展启动测试 =====
console.log('🚀 popup.js 文件开始加载...');
console.log('📅 当前时间:', new Date().toLocaleString());

document.addEventListener('DOMContentLoaded', function() {

  
  const collectBtn = document.getElementById('collectBtn');
  const status = document.getElementById('status');
  const maxNotesInput = document.getElementById('maxNotes');
  const minLikesInput = document.getElementById('minLikes');
  const messageInput = document.getElementById('messageInput');
  const sendMessageBtn = document.getElementById('sendMessage');
  const chatMessages = document.getElementById('chatMessages');
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const newChatBtn = document.getElementById('newChatBtn'); 
  const getPageContentBtn = document.getElementById('getPageContentBtn'); 
  const historyBtn = document.getElementById('historyBtn'); 
  const historyModal = document.getElementById('historyModal'); 
  const closeHistoryModal = document.getElementById('closeHistoryModal'); 
  const historyList = document.getElementById('historyList'); 
  
  // 添加设置相关元素
  const accessKeyIdInput = document.getElementById('accessKeyId');
  const secretAccessKeyInput = document.getElementById('secretAccessKey');
  
  // 添加Tab页切换相关元素
  const collectionTabBtn = document.getElementById('collectionTabBtn');
  const aiAssistantTabBtn = document.getElementById('aiAssistantTabBtn');
  const imageGeneratorTabBtn = document.getElementById('imageGeneratorTabBtn');
  const settingsTabBtn = document.getElementById('settingsTabBtn');
  const collectionTab = document.getElementById('collectionTab');
  const aiAssistantTab = document.getElementById('aiAssistantTab');
  const imageGeneratorTab = document.getElementById('imageGeneratorTab');
  const settingsTab = document.getElementById('settingsTab');
  
  let currentXhsTab = null;
  let hasCollectedData = false; 
  let chatSessions = []; 
  let uploadedFileContent = null;
  let hasShownOpenPageMessage = false; 
  let isStreaming = false; 
  let shouldStopStreaming = false; 
  let pageContentLoaded = false; 
  let currentPageContent = null;
  let isCollecting = false; // 新增：是否正在采集的状态 
  
  const settingsIcon = document.getElementById('settingsIcon');
  const settingsModal = document.getElementById('settingsModal');
  const saveSettingsButton = document.getElementById('saveSettings'); 
  const closeSettingsModalBtn = document.querySelector('#settingsModal .close-modal'); 
  const settingsModalOverlay = document.getElementById('settings-modal-overlay');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
  
  // 加载已保存的设置
  function loadSettings() {
    // 加载DeepSeek API密钥
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
      chrome.storage.local.get(['deepseekApiKey'], (result) => {
        if (result.deepseekApiKey && result.deepseekApiKey.trim() !== '') {
          apiKeyInput.value = '********';
          apiKeyInput.setAttribute('data-has-value', 'true');
        } else {
          apiKeyInput.value = '';
          apiKeyInput.removeAttribute('data-has-value');
        }
      });
    }
    
    // 加载Gemini API密钥
    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    if (geminiApiKeyInput) {
      chrome.storage.local.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey && result.geminiApiKey.trim() !== '') {
          geminiApiKeyInput.value = '********';
          geminiApiKeyInput.setAttribute('data-has-value', 'true');
        } else {
          geminiApiKeyInput.value = '';
          geminiApiKeyInput.removeAttribute('data-has-value');
        }
      });
    }
    
    // 加载Access Key ID
    if (accessKeyIdInput) {
      chrome.storage.local.get(['imageGenApiKey'], (result) => {
        if (result.imageGenApiKey && result.imageGenApiKey.trim() !== '') {
          accessKeyIdInput.value = '********';
          accessKeyIdInput.setAttribute('data-has-value', 'true');
        } else {
          accessKeyIdInput.value = '';
          accessKeyIdInput.removeAttribute('data-has-value');
        }
      });
    }
    
    // 加载Secret Access Key
    if (secretAccessKeyInput) {
      chrome.storage.local.get(['imageGenApiSecret'], (result) => {
        if (result.imageGenApiSecret && result.imageGenApiSecret.trim() !== '') {
          secretAccessKeyInput.value = '********';
          secretAccessKeyInput.setAttribute('data-has-value', 'true');
        } else {
          secretAccessKeyInput.value = '';
          secretAccessKeyInput.removeAttribute('data-has-value');
        }
      });
    }
  }
  
  // 打开设置模态框
  if (settingsTabBtn && settingsModalOverlay) {
    settingsTabBtn.addEventListener('click', function() {
      loadSettings(); 
      settingsModalOverlay.classList.remove('hidden');
    });
  }

  // 关闭设置模态框
  if (closeSettingsBtn && settingsModalOverlay) {
    closeSettingsBtn.addEventListener('click', function() {
      settingsModalOverlay.classList.add('hidden');
    });
  }
  
    // 点击模态框外部关闭
  if (settingsModalOverlay) {
    settingsModalOverlay.addEventListener('click', function(e) {
      if (e.target === settingsModalOverlay) {
        settingsModalOverlay.classList.add('hidden');
      }
    });
  }

  // 保存设置
  if (saveSettingsBtn && settingsModalOverlay) {
    saveSettingsBtn.addEventListener('click', function() {
      const apiKeyInput = document.getElementById('apiKey');
      const geminiApiKeyInput = document.getElementById('geminiApiKey');
      const accessKeyIdInput = document.getElementById('accessKeyId');
      const secretAccessKeyInput = document.getElementById('secretAccessKey');

      const settingsToSave = {};

      if (apiKeyInput.value.trim() && !apiKeyInput.hasAttribute('data-has-value')) {
        settingsToSave.deepseekApiKey = apiKeyInput.value.trim();
      }

      if (geminiApiKeyInput.value.trim() && !geminiApiKeyInput.hasAttribute('data-has-value')) {
        settingsToSave.geminiApiKey = geminiApiKeyInput.value.trim();
      }
      
      if (accessKeyIdInput.value.trim() && !accessKeyIdInput.hasAttribute('data-has-value')) {
        settingsToSave.imageGenApiKey = accessKeyIdInput.value.trim();
      }

      if (secretAccessKeyInput.value.trim() && !secretAccessKeyInput.hasAttribute('data-has-value')) {
        settingsToSave.imageGenApiSecret = secretAccessKeyInput.value.trim();
      }

      if (Object.keys(settingsToSave).length > 0) {
        chrome.storage.local.set(settingsToSave, function() {
          settingsModalOverlay.classList.add('hidden');
          showToast('设置已保存！');
          loadSettings(); // 重新加载以更新状态
          checkApiKeyStatus(); 
          
          // 如果有更新，发送消息到background.js
          const message = { type: 'updateApiKey' };
          if(settingsToSave.deepseekApiKey) message.deepseekApiKey = settingsToSave.deepseekApiKey;
          if(settingsToSave.geminiApiKey) message.geminiApiKey = settingsToSave.geminiApiKey;
          if(settingsToSave.imageGenApiKey) message.imageGenAK = settingsToSave.imageGenApiKey;
          if(settingsToSave.imageGenApiSecret) message.imageGenSK = settingsToSave.imageGenApiSecret;

          chrome.runtime.sendMessage(message);
          
          if (typeof window.updateImageGenCredentials === 'function') {
              window.updateImageGenCredentials(settingsToSave.imageGenApiKey, settingsToSave.imageGenApiSecret);
          }
        });
      } else {
        settingsModalOverlay.classList.add('hidden');
      }
    });
  }
  
  // 关闭设置模态框 (通过 specific close button ID)
  if (closeSettingsModalBtn && settingsModal) {
    closeSettingsModalBtn.addEventListener('click', function() {
      settingsModal.style.display = 'none';
    });
  }

  // 点击模态框外部关闭 (Optional: good UX)
  if (settingsModal) {
    window.addEventListener('click', function(event) {
      if (event.target == settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
  }

  // 显示Toast提示函数
  function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, duration);
    }
  }
  
  // 更新采集按钮状态
  function updateCollectButtonState(collecting) {
    if (!collectBtn) return;
    
    isCollecting = collecting;
    const iconElement = collectBtn.querySelector('.material-icons');
    
    if (collecting) {
      // 采集中状态
      collectBtn.className = 'apple-btn apple-btn-collecting';
      iconElement.textContent = 'stop_circle';
      // 更新按钮文本，保留图标
      collectBtn.innerHTML = '<span class="material-icons">stop_circle</span>停止采集';
    } else {
      // 未采集状态
      collectBtn.className = 'apple-btn apple-btn-primary';
      iconElement.textContent = 'play_circle';
      // 更新按钮文本，保留图标
      collectBtn.innerHTML = '<span class="material-icons">play_circle</span>开始采集';
    }
  }
  
  // 测试复制功能
  function testClipboard() {
    const testText = "测试复制功能";
    navigator.clipboard.writeText(testText).then(() => {
      console.log('复制测试成功');
      showToast('复制功能正常');
    }).catch(err => {
      console.error('复制测试失败:', err);
      showToast('复制功能异常：' + err.message);
    });
  }
  
  // Tab页切换功能
  function switchTab(tabId) {
    console.log('切换到tab:', tabId);
    
    if (!collectionTab || !aiAssistantTab || !imageGeneratorTab || !settingsTab ||
        !collectionTabBtn || !aiAssistantTabBtn || !imageGeneratorTabBtn || !settingsTabBtn) {
      console.error('Tab元素未找到，无法切换');
      return;
    }
    
    collectionTab.classList.remove('active');
    aiAssistantTab.classList.remove('active');
    imageGeneratorTab.classList.remove('active');
    settingsTab.classList.remove('active');
    
    collectionTabBtn.classList.remove('active');
    aiAssistantTabBtn.classList.remove('active');
    imageGeneratorTabBtn.classList.remove('active');
    settingsTabBtn.classList.remove('active');
    
    if (tabId === 'collection') {
      collectionTab.classList.add('active');
      collectionTabBtn.classList.add('active');
    } else if (tabId === 'aiAssistant') {
      aiAssistantTab.classList.add('active');
      aiAssistantTabBtn.classList.add('active');
    } else if (tabId === 'imageGenerator') {
      imageGeneratorTab.classList.add('active');
      imageGeneratorTabBtn.classList.add('active');
      if (typeof window.imageGeneratorInitialized === 'undefined') {
        window.imageGeneratorInitialized = true;
        if (typeof window.initImageGenerator === 'function') {
          window.initImageGenerator();
        }
      }
    } else if (tabId === 'settings') {
      settingsTab.classList.add('active');
      settingsTabBtn.classList.add('active');
      loadSettings(); // 加载设置
    }
  }
  
  // 添加Tab按钮点击事件
  if (collectionTabBtn) {
    collectionTabBtn.addEventListener('click', () => {
      switchTab('collection');
    });
  }
  
  if (aiAssistantTabBtn) {
    aiAssistantTabBtn.addEventListener('click', () => {
      switchTab('aiAssistant');
    });
  }
  
  if (imageGeneratorTabBtn) {
    imageGeneratorTabBtn.addEventListener('click', () => {
      switchTab('imageGenerator');
    });
  }

  if (settingsTabBtn) {
    settingsTabBtn.addEventListener('click', () => {
      if (settingsModalOverlay) settingsModalOverlay.classList.remove('hidden');
      loadSettings();
    });
  }
  
  // 加载历史会话
  chrome.storage.local.get(['chatSessions'], (result) => {
    let existingSessions = [];
    if (result.chatSessions) {
      existingSessions = result.chatSessions;
    }
    
    const now = new Date();
    const newSession = {
      id: 'session_' + now.getTime(),
      title: now.toLocaleString(),
      created: now.toLocaleString(),
      messages: [], // 空消息数组，不包含欢迎消息
      hasUserMessage: false,
      currentSession: true,
      isTemporary: true // 标记为临时会话
    };
    
    // 将新会话和历史会话合并，新会话在前
    chatSessions = [newSession];
    
    if (existingSessions.length > 0) {
      chatSessions = chatSessions.concat(existingSessions);
    }
    
    // 不立即保存到storage，等有实际对话内容时再保存
    console.log('[DEBUG] 初始化加载chatSessions（不保存）:', chatSessions.length, chatSessions.map(s => ({id: s.id, messages: s.messages.length, isTemporary: s.isTemporary})));
    
    // 只在UI上显示欢迎消息，不加入会话历史
    addMessage('欢迎使用AI助手，请输入您的问题。', false, true);
    
    uploadedFileContent = null; 
    clearUploadedFile(); 
    messageInput.value = ''; 
    clearPageContent(); 
  });
  
  // 清理历史记录的函数
  function clearChatHistory() {
    chatSessions = [];
    chatMessages.innerHTML = '';
    chrome.storage.local.remove('chatSessions');
    uploadedFileContent = null; 
    clearUploadedFile(); 
    messageInput.value = ''; 
    clearPageContent(); 
  }

  // 添加清除页面内容的函数
  function clearPageContent() {
    pageContentLoaded = false;
    currentPageContent = null;
    getPageContentBtn.classList.remove('active');
  }

  // 添加创建新会话的函数
  function createNewChatSession(title = null) {
    chatMessages.innerHTML = '';
    addMessage('欢迎使用AI助手，请输入您的问题。', false, true); // 只UI展示
    const now = new Date();
    const newSession = {
      id: 'session_' + now.getTime(),
      title: title || now.toLocaleString(),
      created: now.toLocaleString(),
      messages: [], // 新会话从空的消息数组开始
      hasUserMessage: false,
      currentSession: true
      // 不再默认加saveToHistory: true
    };
    
    // 确保所有旧会话都不是当前会话
    if (chatSessions && chatSessions.length > 0) {
      chatSessions.forEach(s => { 
        s.currentSession = false; 
      });
    }
    
    // 将新会话添加到会话列表的开头
    if (!chatSessions) {
      chatSessions = [];
    }
    chatSessions = [newSession, ...chatSessions];
    
    // 清理所有历史 session 的本地提示（保持原有逻辑）
    chatSessions.forEach(session => {
      if (session.id !== newSession.id) { // 不处理新创建的会话
        session.messages = (session.messages || []).filter(msg => {
          if (!msg.role || !msg.content) return false;
          if (msg.role === 'assistant' && (
            msg.content === '欢迎使用AI助手，请输入您的问题。' ||
            msg.content === '正在思考...' ||
            msg.content === '正在总结内容...' ||
            msg.content === '正在生成爆款标题，请稍候...' ||
            msg.content === '正在将内容改写为小红书笔记，请稍候...')) {
            return false;
          }
          return true;
        });
      }
    });
    
    console.log('创建新会话:', newSession.id, '消息数量:', newSession.messages.length);
    return newSession;
  }

  // 新建对话按钮点击事件
  newChatBtn.addEventListener('click', () => {
    // 先清空当前会话的历史记录
    if (chatSessions && chatSessions.length > 0) {
      chatSessions.forEach(session => {
        session.currentSession = false;
      });
    }
    
    // 创建全新的会话
    createNewChatSession();
    
    uploadedFileContent = null; 
    clearUploadedFile(); 
    messageInput.value = ''; 
    clearPageContent();
    
    console.log('新建对话完成，当前会话历史已清空');
  });

  // 页面内容按钮点击事件
  if (getPageContentBtn) {
    getPageContentBtn.addEventListener('click', async () => {
      try {
        getPageContentBtn.classList.add('active');
        
        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
          showToast('无法获取当前页面');
          getPageContentBtn.classList.remove('active');
          return;
        }

        // 支持所有网页，不限制特定网站

        // 注入内容脚本获取页面内容
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // 获取页面标题
            const title = document.title;
            
            // 获取页面主要内容，尝试多种选择器
            let content = '';
            
            // 尝试获取文章内容的常见选择器
            const contentSelectors = [
              'article', 
              '.content', 
              '.post-content', 
              '.entry-content',
              '.note-content',
              '[data-testid="note-content"]',
              'main',
              '.main-content',
              '#content',
              '.article-content',
              '.post-body',
              '.text-content'
            ];
            
            for (const selector of contentSelectors) {
              const element = document.querySelector(selector);
              if (element && element.innerText.trim()) {
                content = element.innerText.trim();
                break;
              }
            }
            
            // 如果没有找到主要内容，获取body中的所有文本（排除导航、脚本等）
            if (!content) {
              const bodyClone = document.body.cloneNode(true);
              // 移除脚本、样式、导航等不需要的元素
              const elementsToRemove = bodyClone.querySelectorAll('script, style, nav, header, footer, .nav, .navigation, .menu, .sidebar');
              elementsToRemove.forEach(el => el.remove());
              content = bodyClone.innerText.trim();
            }
            
            // 获取网站信息
            const hostname = window.location.hostname;
            const siteName = document.querySelector('meta[property="og:site_name"]')?.content || hostname;
            
            // 获取描述信息
            const description = document.querySelector('meta[name="description"]')?.content || 
                              document.querySelector('meta[property="og:description"]')?.content || '';
            
            return {
              title: title,
              content: content.substring(0, 3000), // 限制内容长度，避免过长
              siteName: siteName,
              hostname: hostname,
              description: description,
              url: window.location.href
            };
          }
        });

        if (results && results[0] && results[0].result) {
          const pageData = results[0].result;
          currentPageContent = pageData;
          pageContentLoaded = true;
          
          // 在聊天框中显示页面信息卡片
          const pageCard = createPageContentCard(pageData);
          chatMessages.appendChild(pageCard);
          chatMessages.scrollTop = chatMessages.scrollHeight;
          
          showToast(`已加载 ${pageData.hostname} 的页面内容`);
        } else {
          showToast('获取页面内容失败');
        }
        
        getPageContentBtn.classList.remove('active');
      } catch (error) {
        console.error('获取页面内容失败:', error);
        showToast('获取页面内容失败');
        getPageContentBtn.classList.remove('active');
      }
    });
  }

  // 创建页面内容卡片
  function createPageContentCard(pageData) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'page-content-preview';
    
    let cardHTML = `
      <div class="page-preview-header">
        <span class="material-icons">description</span>
        <span>页面内容已加载</span>
      </div>
      <div class="page-preview-body">
        <div class="page-title">
          <a href="${pageData.url}" target="_blank" class="page-title-link">${pageData.title}</a>
        </div>`;
    
    if (pageData.author) {
      cardHTML += `<div class="page-author">作者：${pageData.author}</div>`;
    }
    
    cardHTML += `
        <div class="page-source">来源：${pageData.hostname || pageData.siteName || '未知来源'}</div>
      </div>
      <div class="page-actions">
        <button class="summarize-btn">一键总结</button>
        <button class="note-btn">写成小红书笔记</button>
        <button class="hot-title-btn">生成爆款标题</button>
      </div>
    `;
    
    cardDiv.innerHTML = cardHTML;
    
    // 为一键总结按钮添加点击事件
    const summarizeBtn = cardDiv.querySelector('.summarize-btn');
    if (summarizeBtn) {
      summarizeBtn.addEventListener('click', () => {
        // 如果正在流式输出，不处理
        if (isStreaming) return;
        
        // 显示处理中状态
        addMessage('正在总结内容...', false);
        
                 // 构建总结请求
         const title = currentPageContent.title || '无标题';
         const content = currentPageContent.content || '';
         const summaryRequest = `请对以下内容进行总结，提炼核心观点和要点：\n\n标题：${title}\n\n${content}`;
         
         // 获取当前选择的模型
         const modelSwitcher = document.getElementById('modelSwitcher');
         const selectedModel = modelSwitcher ? modelSwitcher.value : 'deepseek';
        
        // 发送消息给background script
        chrome.runtime.sendMessage({
          action: 'analyzeContent',
          content: summaryRequest,
          isChat: true,
          isDataAnalysis: false,
          chatHistory: chatSessions.find(s => s.currentSession === true)?.messages || [],
          hasFile: false,
          skipUserMessage: true, // 添加标记，表示不显示用户消息
          model: selectedModel,
          customInstructionPrompt: '' // 页面功能不使用自定义指令，保持为空
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('发送消息时出错:', chrome.runtime.lastError);
          }
        });
        
                 // 添加到历史记录但不显示在界面上
         const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
         if (currentSessionIndex !== -1) {
           const summaryMessage = `[一键总结] ${title}`;
           chatSessions[currentSessionIndex].messages.push({ role: "user", content: summaryMessage, hidden: true });
           chatSessions[currentSessionIndex].hasUserMessage = true;
           saveSessionsToStorage();
         }
      });
    }
    
    // 为写成笔记按钮添加点击事件
    const noteBtn = cardDiv.querySelector('.note-btn');
    if (noteBtn) {
      noteBtn.addEventListener('click', () => {
        // 如果正在流式输出，不处理
        if (isStreaming) return;
        
        // 显示处理中状态
        addMessage('正在将内容改写为小红书笔记，请稍候...', false);
        
                 // 构建改写请求
         const title = currentPageContent.title || '无标题';
         const content = currentPageContent.content || '';
         const rewriteRequest = `请将以下内容改写成1000字以内的小红书笔记格式，保留核心内容，使用小红书常见的轻松活泼风格，添加适当的emoji表情，分段清晰：\n\n标题：${title}\n\n${content}`;
         
         // 获取当前选择的模型
         const modelSwitcher = document.getElementById('modelSwitcher');
         const selectedModel = modelSwitcher ? modelSwitcher.value : 'deepseek';
        
        // 发送消息给background script
        chrome.runtime.sendMessage({
          action: 'analyzeContent',
          content: rewriteRequest,
          isChat: true,
          isDataAnalysis: false,
          chatHistory: chatSessions.find(s => s.currentSession === true)?.messages || [],
          hasFile: false,
          skipUserMessage: true,
          model: selectedModel,
          customInstructionPrompt: '' // 页面功能不使用自定义指令，保持为空
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('发送消息时出错:', chrome.runtime.lastError);
          }
        });
        
                 // 添加到历史记录但不显示在界面上
         const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
         if (currentSessionIndex !== -1) {
           const noteMessage = `[写成笔记] ${title}`;
           chatSessions[currentSessionIndex].messages.push({ role: "user", content: noteMessage, hidden: true });
           chatSessions[currentSessionIndex].hasUserMessage = true;
           saveSessionsToStorage();
         }
      });
    }
    
    // 为生成爆款标题按钮添加点击事件
    const hotTitleBtn = cardDiv.querySelector('.hot-title-btn');
    if (hotTitleBtn) {
      hotTitleBtn.addEventListener('click', () => {
        // 如果正在流式输出，不处理
        if (isStreaming) return;
        
        // 显示处理中状态
        addMessage('正在生成爆款标题，请稍候...', false);
        
                 // 构建生成标题请求
         const title = currentPageContent.title || '';
         const content = currentPageContent.content || '';
         const titleRequest = `请根据以下内容，直接生成5个吸引人的小红书爆款标题，不要解释，只需列出5个标题：\n\n标题：${title}\n\n${content}`;
         
         // 获取当前选择的模型
         const modelSwitcher = document.getElementById('modelSwitcher');
         const selectedModel = modelSwitcher ? modelSwitcher.value : 'deepseek';
        
        // 发送消息给background script
        chrome.runtime.sendMessage({
          action: 'analyzeContent',
          content: titleRequest,
          isChat: true,
          isDataAnalysis: false,
          chatHistory: chatSessions.find(s => s.currentSession === true)?.messages || [],
          hasFile: false,
          skipUserMessage: true,
          model: selectedModel,
          customInstructionPrompt: '' // 页面功能不使用自定义指令，保持为空
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('发送消息时出错:', chrome.runtime.lastError);
          }
        });
        
                 // 添加到历史记录但不显示在界面上
         const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
         if (currentSessionIndex !== -1) {
           const titleMessage = `[生成爆款标题] ${title}`;
           chatSessions[currentSessionIndex].messages.push({ role: "user", content: titleMessage, hidden: true });
           chatSessions[currentSessionIndex].hasUserMessage = true;
           saveSessionsToStorage();
         }
      });
    }
    
    return cardDiv;
  }

  // 历史记录按钮点击事件
  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      // 显示历史记录模态框
      const historyModal = document.getElementById('historyModal');
      const historyList = document.getElementById('historyList');
      
      if (historyModal && historyList) {
        // 清空历史列表
        historyList.innerHTML = '';
        
        // 加载历史记录
        chrome.storage.local.get(['chatSessions'], (result) => {
          const sessions = result.chatSessions || [];
          
          if (sessions.length === 0) {
            historyList.innerHTML = '<div class="no-history">暂无聊天历史</div>';
          } else {
            sessions.forEach(session => {
              const sessionDiv = document.createElement('div');
              sessionDiv.className = 'history-item';
              sessionDiv.innerHTML = `
                <div class="history-content">
                  <div class="history-title">${session.title}</div>
                  <div class="history-date">${session.created}</div>
                </div>
                <button class="delete-btn" title="删除此对话">
                  <span class="material-icons">delete</span>
                </button>
              `;
              
              // 点击历史记录项加载对话
              const historyContent = sessionDiv.querySelector('.history-content');
              historyContent.addEventListener('click', () => {
                loadChatSession(session);
                historyModal.style.display = 'none';
              });
              
              // 点击删除按钮删除对话
              const deleteBtn = sessionDiv.querySelector('.delete-btn');
              deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                deleteHistorySession(session.id);
              });
              
              historyList.appendChild(sessionDiv);
            });
          }
        });
        
        // 显示模态框
        historyModal.style.display = 'flex';
      }
    });
  }

  // 删除历史记录会话
  function deleteHistorySession(sessionId) {
    // 显示确认对话框
    if (confirm('确定要删除这条聊天记录吗？删除后无法恢复。')) {
      // 从存储中删除
      chrome.storage.local.get(['chatSessions'], (result) => {
        const sessions = result.chatSessions || [];
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        
        chrome.storage.local.set({ chatSessions: updatedSessions }, () => {
          // 从当前会话列表中删除
          const sessionIndex = chatSessions.findIndex(s => s.id === sessionId);
          if (sessionIndex !== -1) {
            chatSessions.splice(sessionIndex, 1);
          }
          
          // 重新加载历史记录列表
          refreshHistoryList();
          showToast('聊天记录已删除');
          console.log('[DEBUG] 删除会话后写入chatSessions:', updatedSessions.length, updatedSessions.map(s => ({id: s.id, messages: s.messages.length})));
        });
      });
    }
  }

  // 刷新历史记录列表
  function refreshHistoryList() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    // 清空历史列表
    historyList.innerHTML = '';
    
    // 重新加载历史记录
    chrome.storage.local.get(['chatSessions'], (result) => {
      let sessions = result.chatSessions || [];
      
      // 清理空的历史记录
      const validSessions = sessions.filter(session => {
        // 过滤掉系统提示消息，得到有效消息
        const validMessages = (session.messages || []).filter(msg => 
          msg.role && msg.content && msg.content.trim() && 
          !(msg.role === 'assistant' && 
            (msg.content === '欢迎使用AI助手，请输入您的问题。' || 
             msg.content === '正在思考...' ||
             msg.content === '正在总结内容...' ||
             msg.content === '正在生成爆款标题，请稍候...' ||
             msg.content === '正在将内容改写为小红书笔记，请稍候...' ||
             msg.content === '发送消息失败，请重试' ||
             msg.content.startsWith('未检测到') ||
             msg.content.startsWith('欢迎使用AI助手')))
        );
        
        // 检查是否有有效的对话内容
        const hasValidConversation = validMessages.length >= 2 && 
                                    validMessages.some(msg => msg.role === 'user') && 
                                    validMessages.some(msg => msg.role === 'assistant');
        
        // 检查是否有页面内容
        const hasPageContent = session.pageContent && 
                              session.pageContent.content && 
                              session.pageContent.content.trim();
        
        return hasValidConversation || hasPageContent;
      });
      
      // 如果清理后的会话列表与原来不同，更新存储
      if (validSessions.length !== sessions.length) {
        chrome.storage.local.set({ chatSessions: validSessions });
        console.log('清理了', sessions.length - validSessions.length, '个空对话');
      }
      
      if (validSessions.length === 0) {
        historyList.innerHTML = '<div class="no-history">暂无聊天历史</div>';
      } else {
        validSessions.forEach(session => {
          const sessionDiv = document.createElement('div');
          sessionDiv.className = 'history-item';
          sessionDiv.innerHTML = `
            <div class="history-content">
              <div class="history-title">${session.title}</div>
              <div class="history-date">${session.created}</div>
            </div>
            <button class="delete-btn" title="删除此对话">
              <span class="material-icons">delete</span>
            </button>
          `;
          
          // 点击历史记录项加载对话
          const historyContent = sessionDiv.querySelector('.history-content');
          historyContent.addEventListener('click', () => {
            loadChatSession(session);
            const historyModal = document.getElementById('historyModal');
            if (historyModal) {
              historyModal.style.display = 'none';
            }
          });
          
          // 点击删除按钮删除对话
          const deleteBtn = sessionDiv.querySelector('.delete-btn');
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            deleteHistorySession(session.id);
          });
          
          historyList.appendChild(sessionDiv);
        });
      }
    });
  }

  // 加载聊天会话
  function loadChatSession(session) {
    // 先在chatSessions里查找
    let targetSession = chatSessions.find(s => s.id === session.id);
    if (!targetSession) {
      // 没有就插入
      chatSessions.unshift(session);
      targetSession = session;
    }
    // 所有会话currentSession设为false
    chatSessions.forEach(s => s.currentSession = false);
    // 只给目标会话设为true
    targetSession.currentSession = true;

    // 清空当前聊天
    chatMessages.innerHTML = '';
    // 加载历史消息
    if (targetSession.messages && targetSession.messages.length > 0) {
      targetSession.messages.forEach(msg => {
        addMessage(msg.content, msg.role === 'user', true);
      });
    }
    showToast('历史对话已加载');
  }

  // 历史记录模态框关闭事件
  if (closeHistoryModal) {
    closeHistoryModal.addEventListener('click', () => {
      if (historyModal) {
        historyModal.style.display = 'none';
      }
    });
  }

  // 点击模态框外部关闭
  if (historyModal) {
    historyModal.addEventListener('click', (event) => {
      if (event.target === historyModal) {
        historyModal.style.display = 'none';
      }
    });
  }

  // 在窗口关闭时保存会话历史
  window.addEventListener('unload', () => {
    saveSessionsToStorage();
  });
  
  // 保存会话到存储的函数
  function saveSessionsToStorage() {
    chrome.storage.local.get(['chatSessions'], (result) => {
      const existingSessions = result.chatSessions || [];
      
      const sessionsToSave = chatSessions.filter(session => {
        // 首先过滤掉系统提示消息，得到有效消息
        const validMessages = (session.messages || []).filter(msg => 
          msg.role && msg.content && msg.content.trim() && 
          !(msg.role === 'assistant' && 
            (msg.content === '欢迎使用AI助手，请输入您的问题。' || 
             msg.content === '正在思考...' ||
             msg.content === '正在总结内容...' ||
             msg.content === '正在生成爆款标题，请稍候...' ||
             msg.content === '正在将内容改写为小红书笔记，请稍候...' ||
             msg.content === '发送消息失败，请重试' ||
             msg.content.startsWith('未检测到') ||
             msg.content.startsWith('欢迎使用AI助手')))
        );
        
        // 检查是否有有效的对话内容
        const hasValidConversation = validMessages.length >= 2 && // 至少有一轮对话（用户+AI）
                                    validMessages.some(msg => msg.role === 'user') && 
                                    validMessages.some(msg => msg.role === 'assistant');
        
        // 检查是否有页面内容（即使没有对话也可以保存）
        const hasPageContent = session.pageContent && 
                              session.pageContent.content && 
                              session.pageContent.content.trim();
        
        // 如果是临时会话且没有内容，不保存
        if (session.isTemporary && !hasValidConversation && !hasPageContent) {
          return false;
        }
        
        // 只保留有内容的会话，不再因为saveToHistory为true而保存
        return hasValidConversation || hasPageContent;
      }).map(session => {
        const sessionCopy = JSON.parse(JSON.stringify(session));
        
        // 移除临时标记，因为一旦保存就不再是临时会话了
        delete sessionCopy.isTemporary;
        
        // 清理消息数组，移除系统提示
        if (sessionCopy.messages && sessionCopy.messages.length > 0) {
          sessionCopy.messages = sessionCopy.messages.filter(msg => 
            msg.role && msg.content && msg.content.trim() &&
            !(msg.role === 'assistant' && 
              (msg.content === '欢迎使用AI助手，请输入您的问题。' || 
               msg.content === '正在思考...' ||
               msg.content === '正在总结内容...' ||
               msg.content === '正在生成爆款标题，请稍候...' ||
               msg.content === '正在将内容改写为小红书笔记，请稍候...' ||
               msg.content === '发送消息失败，请重试' ||
               msg.content.startsWith('未检测到') ||
               msg.content.startsWith('欢迎使用AI助手')))
          );
        }
        
        // 保留页面内容
        if (session.pageContent) {
          sessionCopy.pageContent = session.pageContent;
        }
        
        return sessionCopy;
      });
      
      // 进一步过滤：确保保存的会话确实有内容
      const finalSessionsToSave = sessionsToSave.filter(session => {
        const hasMessages = session.messages && session.messages.length > 0;
        const hasPageContent = session.pageContent && session.pageContent.content;
        return hasMessages || hasPageContent;
      });
      
      if (finalSessionsToSave.length > 0) {
        const currentIds = finalSessionsToSave.map(s => s.id);
        const filteredExisting = existingSessions.filter(s => !currentIds.includes(s.id));
        const updatedSessions = [...finalSessionsToSave, ...filteredExisting];
        
        chrome.storage.local.set({ chatSessions: updatedSessions });
        console.log('[DEBUG] saveSessionsToStorage写入chatSessions:', updatedSessions.length, updatedSessions.map(s => ({id: s.id, messages: s.messages.length})));
        
        console.log('保存会话到历史记录:', finalSessionsToSave.length, '个有效会话');
      } else {
        console.log('没有有效会话需要保存');
      }
    });
  }
  
  // 添加思考动画消息
  function addThinkingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message thinking-message';
    
    // 创建思考文本和动画元素
    const thinkingContainer = document.createElement('div');
    thinkingContainer.innerHTML = `
      <span class="thinking-text">正在思考</span>
      <span class="thinking-dots">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <div class="thinking-shimmer"></div>
    `;
    
    messageDiv.appendChild(thinkingContainer);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 保持"正在思考"文本不变，只显示动画效果
  }

  // 添加消息到聊天窗口
  function addMessage(message, isUser, onlyUI = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    if (!isUser) {
      messageDiv.setAttribute('data-raw-content', message);
      // 使用改进的markdown解析函数
      if (typeof window.parseMarkdown === 'function') {
        messageDiv.innerHTML = window.parseMarkdown(message);
      } else {
        // 降级方案：使用基本的marked函数
        const processedMessage = String(message).trim()
          .replace(/^(#{1,6})([^#\s])/gm, '$1 $2') // 修复标题格式
          .replace(/^(\*|\+|-)\s*([^\s])/gm, '$1 $2') // 修复列表格式
          .replace(/^(\d+)\.?\s*([^\s])/gm, '$1. $2'); // 修复数字列表格式
        messageDiv.innerHTML = marked(processedMessage);
      }
      
      // 为AI消息添加复制按钮（排除系统提示消息）
      if (!message.startsWith('欢迎使用AI助手') && !message.startsWith('正在思考') && !message.startsWith('正在总结内容') && !message.startsWith('正在生成爆款标题') && !message.startsWith('正在将内容改写为小红书笔记') && !message.startsWith('发送消息失败')) {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '<span class="material-icons">content_copy</span>复制';
        copyButton.addEventListener('click', async () => {
          try {
            // 优先获取渲染后的纯文本内容
            let textToCopy = message;
            
            // 尝试从当前消息的渲染内容中提取纯文本
            const messageContent = messageDiv.querySelector('.markdown-body');
            if (messageContent) {
              textToCopy = messageContent.innerText || messageContent.textContent || message;
            } else {
              // 如果没有markdown-body，直接从messageDiv获取文本
              const textContent = messageDiv.textContent || messageDiv.innerText;
              if (textContent && textContent !== '复制') {
                // 移除复制按钮的文本
                textToCopy = textContent.replace(/复制$/, '').replace(/已复制$/, '').trim();
              }
            }
            
            await navigator.clipboard.writeText(textToCopy);
            copyButton.innerHTML = '<span class="material-icons">check</span>已复制';
            copyButton.classList.add('copy-success');
            setTimeout(() => {
              copyButton.innerHTML = '<span class="material-icons">content_copy</span>复制';
              copyButton.classList.remove('copy-success');
            }, 2000);
          } catch (err) {
            console.error('复制失败:', err);
            // 降级方案：使用execCommand
            let textToCopy = message;
            
            // 同样尝试获取渲染后的文本内容
            const messageContent = messageDiv.querySelector('.markdown-body');
            if (messageContent) {
              textToCopy = messageContent.innerText || messageContent.textContent || message;
            } else {
              const textContent = messageDiv.textContent || messageDiv.innerText;
              if (textContent && textContent !== '复制') {
                textToCopy = textContent.replace(/复制$/, '').replace(/已复制$/, '').trim();
              }
            }
            
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            try {
              document.execCommand('copy');
              copyButton.innerHTML = '<span class="material-icons">check</span>已复制';
              copyButton.classList.add('copy-success');
              setTimeout(() => {
                copyButton.innerHTML = '<span class="material-icons">content_copy</span>复制';
                copyButton.classList.remove('copy-success');
              }, 2000);
            } catch (fallbackErr) {
              console.error('降级复制也失败:', fallbackErr);
              showToast('复制失败，请手动选择文本复制');
            }
            document.body.removeChild(textArea);
          }
        });
        messageDiv.appendChild(copyButton);
      }
      
      // 只在不是UI提示时写入messages
      if (!onlyUI && !message.startsWith('欢迎使用AI助手') && !message.startsWith('正在思考') && !message.startsWith('正在总结内容') && !message.startsWith('正在生成爆款标题') && !message.startsWith('正在将内容改写为小红书笔记') && !message.startsWith('发送消息失败')) {
        const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
        if (currentSessionIndex !== -1) {
          chatSessions[currentSessionIndex].messages.push({ role: "assistant", content: message });
        } else if (chatSessions.length > 0) {
          chatSessions[0].messages.push({ role: "assistant", content: message });
        }
      }
    } else {
      messageDiv.textContent = message;
      if (!onlyUI) {
        const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
        if (currentSessionIndex !== -1) {
          chatSessions[currentSessionIndex].messages.push({ role: "user", content: message });
          chatSessions[currentSessionIndex].hasUserMessage = true;
          // 如果是临时会话，移除临时标记
          if (chatSessions[currentSessionIndex].isTemporary) {
            delete chatSessions[currentSessionIndex].isTemporary;
          }
        } else if (chatSessions.length > 0) {
          chatSessions[0].messages.push({ role: "user", content: message });
          chatSessions[0].hasUserMessage = true;
          // 如果是临时会话，移除临时标记
          if (chatSessions[0].isTemporary) {
            delete chatSessions[0].isTemporary;
          }
        }
      }
    }
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // 将发送逻辑封装成一个函数
  function handleSendMessage() {
    const rawMessage = messageInput.value.trim();
    if (!rawMessage || isStreaming) return;

    // 确定当前会话并判断是否为新对话的第一条消息
    let currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
    if (currentSessionIndex === -1 && chatSessions.length > 0) {
      currentSessionIndex = 0;
    }
    const isFirstMessage = (currentSessionIndex !== -1) ? !chatSessions[currentSessionIndex].hasUserMessage : true;

    // 无论第几条消息，都需要获取自定义指令并传递给AI
    chrome.storage.local.get(['activeInstructionId', 'customInstructions'], (data) => {
      let finalMessage = rawMessage;
      let customInstructionPrompt = '';

      console.log('📋 从storage读取自定义指令数据:', {
        activeInstructionId: data.activeInstructionId,
        customInstructionsCount: data.customInstructions ? data.customInstructions.length : 0
      });

      // 获取激活的自定义指令
      if (data.activeInstructionId && Array.isArray(data.customInstructions)) {
        const activeInstr = data.customInstructions.find(instr => instr.id === data.activeInstructionId);
        if (activeInstr && activeInstr.prompt && activeInstr.prompt.trim()) {
          customInstructionPrompt = activeInstr.prompt.trim();
          console.log('✅ 找到激活的自定义指令:', activeInstr.name, '| 指令长度:', customInstructionPrompt.length);
          console.log('📝 自定义指令内容预览:', customInstructionPrompt.substring(0, 100) + (customInstructionPrompt.length > 100 ? '...' : ''));
        } else {
          console.log('⚠️ activeInstructionId存在但未找到对应的指令:', data.activeInstructionId);
        }
      } else {
        if (!data.activeInstructionId) {
          console.log('ℹ️ 未设置自定义指令(activeInstructionId为空)，使用默认系统提示');
        } else if (!Array.isArray(data.customInstructions)) {
          console.log('⚠️ customInstructions不是数组:', typeof data.customInstructions);
        }
      }

      console.log('🚀 准备发送消息给AI，customInstructionPrompt长度:', customInstructionPrompt.length);
      sendToAI(finalMessage, rawMessage, customInstructionPrompt);
      messageInput.value = '';
    });
  }

  // 停止流式输出
  function handleStopStreaming() {
    if (isStreaming) {
      shouldStopStreaming = true;
      chrome.runtime.sendMessage({ action: 'stopStreaming' });
      isStreaming = false;
      toggleSendStopButton(false);
      
      // 移除思考动画消息
      const thinkingMessage = document.querySelector('.thinking-message');
      if (thinkingMessage) {
        thinkingMessage.remove();
      }
      
      // 不显示"已停止生成"消息
    }
  }

  // 为发送按钮添加事件监听
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', function() {
      if (isStreaming) {
        handleStopStreaming();
      } else {
        handleSendMessage();
      }
    });
  }

  // 为输入框添加键盘事件监听
  if (messageInput) {
    messageInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // 阻止默认的回车换行行为
        handleSendMessage();
      }
    });
  }

  // 发送消息到AI
  function sendToAI(message, displayMessage = null, customInstructionPrompt = '') {
    const uiMessage = displayMessage !== null ? displayMessage : message;

    console.log('📨 sendToAI函数被调用，参数:', {
      messageLength: message.length,
      hasDisplayMessage: displayMessage !== null,
      customInstructionPromptLength: customInstructionPrompt.length
    });

    // 如果有上传的文件，在聊天框中显示文件信息
    if (uploadedFileContent) {
      const fileInfoText = `📎 已上传文件: ${uploadedFileContent.fileName} (${formatFileSize(uploadedFileContent.fileSize)})`;
      addMessage(fileInfoText, true, true);
      
      // 隐藏底部的文件提示
      if (fileInfo) {
        fileInfo.style.display = 'none';
      }
    }
    
    // 立即在UI上显示用户消息
    addMessage(uiMessage, true, true);

    const modelSwitcher = document.getElementById('modelSwitcher');
    const activeModel = modelSwitcher ? modelSwitcher.value : 'deepseek'; 
    const isDataAnalysis = uploadedFileContent && uploadedFileContent.isData;

    try {
      isStreaming = true;
      toggleSendStopButton(true);

      // ... session handling ...
      let currentSession = chatSessions.find(s => s.currentSession === true);
      if (!currentSession && chatSessions.length > 0) currentSession = chatSessions[0];
      // ... more session handling if not found ...

      // 保存用户消息到历史记录
      currentSession.messages.push({ role: "user", content: uiMessage });
      currentSession.hasUserMessage = true; 
      if (!currentSession.title || currentSession.title === currentSession.created) {
        // 修正标题生成逻辑
        const titleText = uiMessage.substring(0, 20);
        currentSession.title = titleText.length < uiMessage.length ? titleText + '...' : titleText;
      }
      saveSessionsToStorage();
      
      addThinkingMessage();
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
      // 准备发送给AI的内容
      let content = '';
      if (uploadedFileContent) {
        content = `===== 文件内容开始 =====\n${uploadedFileContent.content}\n===== 文件内容结束 =====\n\n用户问题：${message}`;
      } else if (pageContentLoaded && currentPageContent) {
        if (currentPageContent) {
          const pageInfo = `\n标题：${currentPageContent.title}\n来源：${currentPageContent.source || '未知来源'}\n作者：${currentPageContent.author || '未知作者'}\n链接：${currentPageContent.url || '未知'}\n\n内容：\n${currentPageContent.content}\n`;
          content = `===== 网页内容开始 =====\n${pageInfo}\n===== 网页内容结束 =====\n\n用户问题：${message}`;
        }
      } else {
        content = message;
      }
      
      const allMessages = currentSession.messages || [];
      const filteredHistory = allMessages.slice(0, -1).filter(msg => {
        if (!msg.role || !msg.content) return false;
        if (msg.role === 'assistant' && (
          msg.content === '欢迎使用AI助手，请输入您的问题。' ||
          msg.content === '正在思考...' ||
          msg.content === '正在总结内容...' ||
          msg.content === '正在生成爆款标题，请稍候...' ||
          msg.content === '正在将内容改写为小红书笔记，请稍候...')) {
          return false;
        }
        return true;
      });

      console.log('✉️ 即将发送消息给background.js:', {
        action: 'analyzeContent',
        contentLength: content.length,
        isChat: true,
        isDataAnalysis: isDataAnalysis,
        chatHistoryLength: filteredHistory.length,
        hasFile: !!uploadedFileContent || (pageContentLoaded && !!currentPageContent),
        model: activeModel,
        customInstructionPromptLength: customInstructionPrompt.length,
        customInstructionPromptPreview: customInstructionPrompt ? customInstructionPrompt.substring(0, 50) + '...' : '(empty)'
      });

      chrome.runtime.sendMessage({
        action: 'analyzeContent',
        content: content,
        isChat: true,
        isDataAnalysis: isDataAnalysis,
        chatHistory: filteredHistory,
        hasFile: !!uploadedFileContent || (pageContentLoaded && !!currentPageContent),
        model: activeModel,
        customInstructionPrompt: customInstructionPrompt
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      const thinkingMessage = document.querySelector('.thinking-message');
      if (thinkingMessage) {
        thinkingMessage.remove();
      }
      
      const errorMessage = error.message || '发送消息失败，请重试';
      addMessage(`❌ ${errorMessage}`, false);
      
      isStreaming = false;
      toggleSendStopButton(false);
      
      const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
      if (currentSessionIndex !== -1 && chatSessions[currentSessionIndex]?.messages) {
        chatSessions[currentSessionIndex].messages.pop();
      } else if (chatSessions.length > 0 && chatSessions[0]?.messages) {
        chatSessions[0].messages.pop();
      }
    }
  }
  
  // 切换发送/停止按钮状态
  function toggleSendStopButton(isStop) {
    const sendIcon = sendMessageBtn.querySelector('.material-icons');
    
    if (isStop) {
      if (sendIcon) sendIcon.textContent = 'stop';
      sendMessageBtn.classList.add('stop-mode');
      sendMessageBtn.title = '停止生成';
    } else {
      if (sendIcon) sendIcon.textContent = 'send';
      sendMessageBtn.classList.remove('stop-mode');
      sendMessageBtn.title = '发送';
    }
  }

  // 添加清除文件的功能
  function clearUploadedFile() {
    uploadedFileContent = null;
    fileInput.value = '';
    fileInfo.textContent = '支持TXT文件，最大10MB';
    fileInfo.className = 'monica-file-info';
    fileInfo.style.display = 'none';
  }
  
  // 处理文件上传
  fileInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) {
      clearUploadedFile();
      return;
    }
    
    if (file.type !== 'text/plain') {
      clearUploadedFile();
      fileInfo.textContent = '只支持TXT文件';
      fileInfo.className = 'monica-file-info';
      fileInfo.style.display = 'flex';
      setTimeout(() => {
        fileInfo.style.display = 'none';
      }, 3000);
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      clearUploadedFile();
      fileInfo.textContent = '文件大小不能超过10MB';
      fileInfo.className = 'monica-file-info';
      fileInfo.style.display = 'flex';
      setTimeout(() => {
        fileInfo.style.display = 'none';
      }, 3000);
      return;
    }
    
    try {
      const content = await readFileContent(file);
      uploadedFileContent = {
        content: content,
        fileName: file.name,
        fileSize: file.size
      };
      
      fileInfo.textContent = `已上传: ${file.name} (${formatFileSize(file.size)})`;
      fileInfo.className = 'monica-file-info';
      fileInfo.style.display = 'flex';
      
    } catch (error) {
      console.error('读取文件失败:', error);
      clearUploadedFile();
      fileInfo.textContent = '读取文件失败';
      fileInfo.className = 'monica-file-info';
      fileInfo.style.display = 'flex';
      setTimeout(() => {
        fileInfo.style.display = 'none';
      }, 3000);
    }
  });
  
  // 添加移除文件的事件监听器
  const removeFileBtn = document.getElementById('removeFile');
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', function() {
      clearUploadedFile();
    });
  }
  
  // 添加文件大小格式化函数
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  }
  
  // 读取文件内容
  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }
  
  // 重构流式输出和消息监听
  let streamingBuffer = '';
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'apiKeyRequired') {
      chrome.storage.local.get(['deepseekApiKey'], (result) => {
        if (result.deepseekApiKey && result.deepseekApiKey.trim() !== '') {
          console.log('已设置API密钥，忽略提示');
          sendResponse();
          return;
        }
        console.log('收到API密钥缺失提示:', message.message);
        addMessage(message.message, false, true);
        if (settingsModal) {
          loadSettings(); 
          settingsModal.style.display = 'block';
        }
        sendResponse();
      });
      return true;
    } else if (message.type === 'streamResponse' && message.isChat === true) {
      isStreaming = true;
      toggleSendStopButton(true);
      // 移除思考动画消息
      const thinkingMessage = document.querySelector('.thinking-message');
      if (thinkingMessage) {
        thinkingMessage.remove();
      }
      let aiMessageDiv = document.querySelector('.ai-message.streaming');
      if (!aiMessageDiv) {
        aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message ai-message streaming';
        aiMessageDiv.setAttribute('data-raw-content', '');
        chatMessages.appendChild(aiMessageDiv);
      }
      streamingBuffer += message.content || '';
      aiMessageDiv.setAttribute('data-raw-content', streamingBuffer);
      // 使用改进的markdown解析函数处理流式内容
      if (typeof window.parseMarkdown === 'function') {
        aiMessageDiv.innerHTML = window.parseMarkdown(streamingBuffer, true);
      } else {
        // 降级方案：使用基本的marked函数
        const processedBuffer = String(streamingBuffer).trim()
          .replace(/^(#{1,6})([^#\s])/gm, '$1 $2') // 修复标题格式
          .replace(/^([+-])\s*([^\s])/gm, '$1 $2') // 修复 + 和 - 列表
          .replace(/^(\*)\s*([^\s*])/gm, '$1 $2') // 修复 * 列表，同时避免破坏 **bold** 语法
          .replace(/^(\d+)\.?\s*([^\s])/gm, '$1. $2'); // 修复数字列表格式
        aiMessageDiv.innerHTML = marked(processedBuffer);
      }
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return false;
    } else if (message.type === 'streamSummaryResponse') {
      // 处理一键总结/爆款标题等跳过用户消息的流式输出
      isStreaming = true;
      toggleSendStopButton(true);
      // 移除思考动画消息
      const thinkingMessage = document.querySelector('.thinking-message');
      if (thinkingMessage) {
        thinkingMessage.remove();
      }
      let aiMessageDiv = document.querySelector('.ai-message.streaming');
      if (!aiMessageDiv) {
        aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message ai-message streaming';
        aiMessageDiv.setAttribute('data-raw-content', '');
        chatMessages.appendChild(aiMessageDiv);
      }
      streamingBuffer += message.content || '';
      aiMessageDiv.setAttribute('data-raw-content', streamingBuffer);
      // 使用改进的markdown解析函数处理流式内容
      if (typeof window.parseMarkdown === 'function') {
        aiMessageDiv.innerHTML = window.parseMarkdown(streamingBuffer, true);
      } else {
        // 降级方案：使用基本的marked函数
        const processedBuffer = String(streamingBuffer).trim()
          .replace(/^(#{1,6})([^#\s])/gm, '$1 $2') // 修复标题格式
          .replace(/^([+-])\s*([^\s])/gm, '$1 $2') // 修复 + 和 - 列表
          .replace(/^(\*)\s*([^\s*])/gm, '$1 $2') // 修复 * 列表，同时避免破坏 **bold** 语法
          .replace(/^(\d+)\.\s*([^\s])/gm, '$1. $2'); // 修复数字列表格式
        aiMessageDiv.innerHTML = marked(processedBuffer);
      }
      chatMessages.scrollTop = chatMessages.scrollHeight;
      return false;
    } else if (message.type === 'analysisComplete') {
      isStreaming = false;
      shouldStopStreaming = false;
      window.newSessionCreated = false;
      const streamingMessages = document.querySelectorAll('.streaming');
      streamingMessages.forEach(msg => {
        msg.classList.remove('streaming');
        
        // 为流式响应的AI消息添加复制按钮
        if (streamingBuffer.trim()) {
          const copyButton = document.createElement('button');
          copyButton.className = 'copy-button';
          copyButton.innerHTML = '<span class="material-icons">content_copy</span>复制';
          copyButton.addEventListener('click', async () => {
            try {
              // 优先获取渲染后的纯文本内容
              let textToCopy = streamingBuffer;
              
              // 尝试从当前消息的渲染内容中提取纯文本
              const messageContent = msg.querySelector('.markdown-body');
              if (messageContent) {
                textToCopy = messageContent.innerText || messageContent.textContent || streamingBuffer;
              } else {
                // 如果没有markdown-body，直接从msg获取文本
                const textContent = msg.textContent || msg.innerText;
                if (textContent && textContent !== '复制') {
                  // 移除复制按钮的文本
                  textToCopy = textContent.replace(/复制$/, '').replace(/已复制$/, '').trim();
                }
              }
              
              await navigator.clipboard.writeText(textToCopy);
              copyButton.innerHTML = '<span class="material-icons">check</span>已复制';
              copyButton.classList.add('copy-success');
              setTimeout(() => {
                copyButton.innerHTML = '<span class="material-icons">content_copy</span>复制';
                copyButton.classList.remove('copy-success');
              }, 2000);
            } catch (err) {
              console.error('复制失败:', err);
              // 降级方案：使用execCommand
              let textToCopy = streamingBuffer;
              
              // 同样尝试获取渲染后的文本内容
              const messageContent = msg.querySelector('.markdown-body');
              if (messageContent) {
                textToCopy = messageContent.innerText || messageContent.textContent || streamingBuffer;
              } else {
                const textContent = msg.textContent || msg.innerText;
                if (textContent && textContent !== '复制') {
                  textToCopy = textContent.replace(/复制$/, '').replace(/已复制$/, '').trim();
                }
              }
              
              const textArea = document.createElement('textarea');
              textArea.value = textToCopy;
              document.body.appendChild(textArea);
              textArea.select();
              try {
                document.execCommand('copy');
                copyButton.innerHTML = '<span class="material-icons">check</span>已复制';
                copyButton.classList.add('copy-success');
                setTimeout(() => {
                  copyButton.innerHTML = '<span class="material-icons">content_copy</span>复制';
                  copyButton.classList.remove('copy-success');
                }, 2000);
              } catch (fallbackErr) {
                console.error('降级复制也失败:', fallbackErr);
                showToast('复制失败，请手动选择文本复制');
              }
              document.body.removeChild(textArea);
            }
          });
          msg.appendChild(copyButton);
        }
      });
      
      // 只保存到会话历史，不创建新的UI元素（因为流式输出已经显示了）
      if (streamingBuffer.trim()) {
        // 只将消息内容保存到会话历史中
        const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
        if (currentSessionIndex !== -1) {
          chatSessions[currentSessionIndex].messages.push({ role: "assistant", content: streamingBuffer });
        } else if (chatSessions.length > 0) {
          chatSessions[0].messages.push({ role: "assistant", content: streamingBuffer });
        }
      }
      
      streamingBuffer = '';
      if (chatSessions.length > 0) {
        const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
        let currentSession = currentSessionIndex !== -1 ? chatSessions[currentSessionIndex] : chatSessions[0];
        currentSession.messages.forEach(msg => { if (msg.role === 'assistant' && msg.streaming) delete msg.streaming; });
        saveSessionsToStorage();
      }
      toggleSendStopButton(false);
      return false;
    } else if (message.type === 'updateStatus') {
      // 更新采集状态显示
      const statusElement = document.getElementById('status');
      const statusTextElement = statusElement.querySelector('span:last-child');
      statusTextElement.textContent = message.text;
      statusElement.style.display = 'flex';
      return false;
    } else if (message.type === 'collectionComplete') {
      console.log('收到采集完成消息:', message.text, '数据条数:', message.data?.length || 0);
      
      // 重置采集按钮状态
      updateCollectButtonState(false);
      
      // 自动切换到AI助手界面
      switchTab('aiAssistant');
      
      // 等待界面切换完成后，检查是否有采集数据，然后开始AI分析
      setTimeout(() => {
        // 检查是否已经有AI分析在进行中
        if (!isStreaming) {
          if (message.data && message.data.length > 0) {
            // 显示采集完成提示
            showToast(`笔记采集完成，正在分析${message.data.length}篇笔记...`, 3000);
            
            // 有采集数据，进行数据分析
            const analysisPrompt = `作为一个小红书运营专家，请分析采集的小红书爆款笔记的共同点。先写100字左右的总结，然后从以下几个维度进行拆解：\n1. 选题角度与用户痛点：这个选题切中了用户的什么需求或痛点？\n2. 标题特点：标题使用了哪些技巧来吸引点击？（例如：数字、夸张、提问、制造反差、身份带入等）\n3. 根据以上内容给我推荐5个爆款选题`;
            
            // 创建新的会话用于分析采集数据
            createNewChatSession(`笔记分析 - ${new Date().toLocaleString()}`);
            
            // 将采集数据设置为页面内容，使用格式化的文本内容
            const analysisContent = message.formattedContent || 
              `采集到${message.data.length}篇笔记数据：\n\n` + 
              message.data.map((item, index) => 
                `${index + 1}. 标题：${item.title}\n` +
                `   作者：${item.author}\n` +
                `   点赞：${item.likes} | 收藏：${item.collects} | 评论：${item.comments}\n` +
                `   内容：${item.content}\n`
              ).join('\n----------------------------------------\n\n');
            
            currentPageContent = {
              title: `小红书笔记采集数据分析`,
              content: analysisContent,
              source: '笔记采集',
              author: '系统采集',
              url: window.location.href
            };
            pageContentLoaded = true;
            
            sendToAI(analysisPrompt);
          } else {
            // 没有采集数据，只显示完成消息
            showToast('笔记采集完成', 2000);
            addMessage(`${message.text}。如需AI分析，请手动输入问题。`, false, true);
          }
        }
      }, 500); // 延迟500ms确保界面切换完成
      
      return false;
    } else if (message.type === 'error') {
      // 重置采集按钮状态（在错误情况下）
      updateCollectButtonState(false);
      
      // 移除思考动画消息
      const thinkingMessage = document.querySelector('.thinking-message');
      if (thinkingMessage) {
        thinkingMessage.remove();
      }
      
      // 显示具体的错误信息
      const errorMessage = message.error || '发送消息失败，请重试';
      addMessage(`❌ ${errorMessage}`, false, true);
      
      // 重置流式输出状态
      isStreaming = false;
      toggleSendStopButton(false);
      
      return false;
    }
    // 其他所有分支 return false
    return false;
  });
  
  // 移除聊天框中的API密钥提示消息
  function removeApiKeyNotices() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const apiKeyMessages = chatMessages.querySelectorAll('.message.system:not(.user)');
    apiKeyMessages.forEach(msg => {
      if (msg.textContent.includes('API密钥') || 
          msg.textContent.includes('设置') || 
          msg.textContent.includes('DeepSeek')) {
        msg.remove();
      }
    });
    
    if (chatMessages.children.length === 0) {
      addMessage('欢迎使用AI助手， 请输入您的问题。', false);
    }
  }

  // 检查API密钥状态
  function checkApiKeyStatus() {
    chrome.storage.local.get(['deepseekApiKey'], (result) => {
      const hasApiKey = result.deepseekApiKey && result.deepseekApiKey.trim() !== '';
      console.log('检查API密钥状态:', hasApiKey ? '已设置' : '未设置');

      removeApiKeyNotices();

      if (!hasApiKey) {
        addMessage('未检测到 DeepSeek API 密钥，部分 AI 功能不可用。请点击右下角"设置"图标填写后再尝试。', false);
      }
    });
  }

  // 定期检查标签页状态
  async function checkXhsTab() {
    // 如果正在采集，保持 currentXhsTab 不变，避免停止指令发错目标
    if (isCollecting) {
      return;
    }
    const tab = await findXhsTabs();
    if (!tab) {
      collectBtn.disabled = true;
    } else {
      hasShownOpenPageMessage = false;
      try {
        if (!status.textContent.includes('成功采集') && 
            !status.textContent.includes('开始采集') && 
            !status.textContent.includes('停止采集')) {
          const statusElement = document.getElementById('status');
          const statusTextElement = statusElement.querySelector('span:last-child');
          statusTextElement.textContent = '准备就绪';
          statusElement.style.display = 'flex';
        }
        if (collectBtn.disabled && !isCollecting) {
          collectBtn.disabled = false;
        }
      } catch (error) {
        console.error('检查页面就绪状态时出错:', error);
        if (!status.textContent.includes('成功采集')) {
          const statusElement = document.getElementById('status');
          const statusTextElement = statusElement.querySelector('span:last-child');
          statusTextElement.textContent = '请刷新页面';
          statusElement.style.display = 'flex';
        }
        collectBtn.disabled = true;
      }
    }
  }
  
  // 查找所有目标标签页
  async function findXhsTabs() {
    try {
      const tabs = await chrome.tabs.query({url: ["*://*.xiaohongshu.com/*", "*://docs.qq.com/*", "*://*.feishu.cn/*", "*://*.aliyun.com/*", "*://*.baidu.com/*"]});
      if (tabs.length === 0) {
        const statusElement = document.getElementById('status');
        const statusTextElement = statusElement.querySelector('span:last-child');
        statusTextElement.textContent = '未检测到可用页面';
        statusElement.style.display = 'flex';
        collectBtn.disabled = true;
        currentXhsTab = null;
        return null;
      }
      const activeTab = tabs.find(tab => tab.active);
      if (activeTab) {
        currentXhsTab = activeTab;
        collectBtn.disabled = isCollecting;
        return activeTab;
      }
      currentXhsTab = tabs[0];
      collectBtn.disabled = isCollecting;
      return tabs[0];
    } catch (error) {
      const errorMessage = '查找目标页面失败';
      console.error(errorMessage + ':', error);
      const statusElement = document.getElementById('status');
      const statusTextElement = statusElement.querySelector('span:last-child');
      statusTextElement.textContent = errorMessage;
      statusElement.style.display = 'flex';
      collectBtn.disabled = true;
      currentXhsTab = null;
      return null;
    }
  }
  
  // 检查页面是否准备好
  async function checkPageReady(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'checkReady' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('页面未准备好:', chrome.runtime.lastError.message);
          resolve(false);
        } else {
          resolve(!!response);
        }
      });
    });
  }

  // 动态注入content script
  async function injectContentScript(tabId) {
    try {
      console.log('开始动态注入content script到tab:', tabId);
      
      // 先注入config.js
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['config.js']
      });
      
      // 再注入content.js
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      console.log('Content script注入成功');
      
      // 等待一下让script初始化
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('注入content script失败:', error);
      return false;
    }
  }

  // 等待页面准备好
  async function waitForPageReady(tabId, maxAttempts = 3) {
    for (let i = 0; i < maxAttempts; i++) {
      if (await checkPageReady(tabId)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
  }

  // 采集按钮点击事件处理
  collectBtn.addEventListener('click', async () => {
    console.log('🔄 采集按钮点击，当前状态:', isCollecting);
    
    if (isCollecting) {
      // 停止采集
      console.log('🛑 执行停止采集');
      
      if (currentXhsTab) {
        const statusElement = document.getElementById('status');
        const statusTextElement = statusElement.querySelector('span:last-child');
        statusTextElement.textContent = '正在停止采集...';
        statusElement.style.display = 'flex';
        
        // 先更新UI状态
        updateCollectButtonState(false);
        
        // 发送停止消息
        chrome.tabs.sendMessage(currentXhsTab.id, {
          type: 'stopCollecting'
        }, (response) => {
          console.log('🛑 停止采集响应:', response);
          if (chrome.runtime.lastError) {
            console.error('停止采集失败:', chrome.runtime.lastError);
          }
        });
      }
    } else {
      // 开始采集
      console.log('🚀 执行开始采集');
      
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      const tab = tabs[0];
      
      if (!tab.url.includes('xiaohongshu.com')) {
        alert('请在小红书页面使用此功能');
        return;
      }
      
      currentXhsTab = tab;
      
      // 检查页面是否准备好
      let pageReady = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!pageReady && attempts < maxAttempts) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, {type: 'ping'});
          pageReady = true;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            console.log('页面未准备好，动态注入content script');
            await injectContentScript(tab.id);
            pageReady = true;
          }
        }
      }
      
      if (pageReady) {
        console.log('页面准备就绪，开始采集');
        
        // 获取采集参数
        const maxNotes = parseInt(document.getElementById('maxNotes').value) || 10;
        const minLikes = parseInt(document.getElementById('minLikes').value) || 0;
        
        // 更新UI状态
        updateCollectButtonState(true);
        
        // 发送采集命令
        const result = await chrome.tabs.sendMessage(tab.id, {
          type: 'startCollecting',
          maxNotes: maxNotes,
          minLikes: minLikes
        });
        
        console.log('采集命令发送结果:', result);
      }
    }
  });
  
  // 每秒检查一次标签页状态
  setInterval(checkXhsTab, 1000);

  // 检查API密钥状态
  checkApiKeyStatus(); 

  // 初始化默认显示第一个tab
  console.log('初始化默认tab显示');
  setTimeout(() => {
    switchTab('collection');
  }, 100);

  // 添加页面关闭事件监听器
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      chrome.runtime.sendMessage({ action: 'cancelPendingRequests' });
    }
  });

  window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ action: 'cancelPendingRequests' });
  });

  // --- 自定义指令功能 ---
  const showHideBtn = document.getElementById('show-hide-instructions-btn');
  const instructionsContainer = document.getElementById('instructions-container');
  const instructionsList = document.getElementById('instructions-list');
  const addNewBtn = document.getElementById('add-new-instruction-btn');
  const addForm = document.getElementById('add-instruction-form');
  const saveBtn = document.getElementById('save-instruction-btn');
  const cancelBtn = document.getElementById('cancel-add-btn');
  const instructionNameInput = document.getElementById('instruction-name');
  const instructionPromptInput = document.getElementById('instruction-prompt');
  const instructionEditIdInput = document.getElementById('instruction-edit-id');
  const instructionsModalOverlay = document.getElementById('instructions-modal-overlay');
  const closeInstructionsBtn = document.getElementById('close-instructions-btn');

  const MAX_INSTRUCTIONS = 10;

  // --- 新增：更新指令按钮状态 ---
  function updateInstructionButtonState(isActive) {
    if (showHideBtn) {
      if (isActive) {
        showHideBtn.classList.add('active');
      } else {
        showHideBtn.classList.remove('active');
      }
    }
  }

  // 切换指令界面的显示/隐藏
  showHideBtn.addEventListener('click', () => {
      if (instructionsModalOverlay) {
        instructionsModalOverlay.classList.remove('hidden');
      }
  });

  // 关闭指令弹窗的函数
  function closeInstructionsModal() {
    if (instructionsModalOverlay) {
      instructionsModalOverlay.classList.add('hidden');
      // 如果添加/编辑表单是打开的，就取消它
      if (!addForm.classList.contains('hidden')) {
        cancelBtn.click();
      }
    }
  }

  // 为弹窗的关闭按钮和遮罩层添加事件
  if (closeInstructionsBtn) {
    closeInstructionsBtn.addEventListener('click', closeInstructionsModal);
  }
  if (instructionsModalOverlay) {
    instructionsModalOverlay.addEventListener('click', (e) => {
      if (e.target === instructionsModalOverlay) {
        closeInstructionsModal();
      }
    });
  }

  // 显示添加表单
  addNewBtn.addEventListener('click', () => {
      addForm.classList.remove('hidden');
      addNewBtn.classList.add('hidden');
  });

  // 取消添加或编辑
  cancelBtn.addEventListener('click', () => {
      addForm.classList.add('hidden');
      addNewBtn.classList.remove('hidden');
      instructionNameInput.value = '';
      instructionPromptInput.value = '';
      instructionEditIdInput.value = ''; // 重置编辑ID
      saveBtn.textContent = '保存'; // 恢复按钮文本
  });

  // 保存新指令或更新现有指令
  saveBtn.addEventListener('click', () => {
      const name = instructionNameInput.value.trim();
      const prompt = instructionPromptInput.value.trim();
      const editId = instructionEditIdInput.value;

      if (!name) {
          alert('指令名称不能为空！');
          return;
      }
      if (prompt.length > 10000) {
          alert('指令内容不能超过10000字！');
          return;
      }

      chrome.storage.local.get({ customInstructions: [] }, (data) => {
          let instructions = data.customInstructions;
          
          if (editId) { // --- 更新逻辑 ---
              const instructionToUpdate = instructions.find(instr => instr.id === editId);
              if (instructionToUpdate) {
                  instructionToUpdate.name = name;
                  instructionToUpdate.prompt = prompt;
              }
          } else { // --- 新增逻辑 ---
              if (instructions.length >= MAX_INSTRUCTIONS) {
                  alert(`最多只能添加 ${MAX_INSTRUCTIONS} 条指令。`);
                  return;
              }
              const newInstruction = {
                  id: `instr_${Date.now()}`,
                  name: name,
                  prompt: prompt,
              };
              instructions.push(newInstruction);
          }

          chrome.storage.local.set({ customInstructions: instructions }, () => {
              renderInstructions();
              cancelBtn.click(); // 关闭并重置表单
          });
      });
  });

  // 渲染指令列表
  function renderInstructions() {
      chrome.storage.local.get({ customInstructions: [], activeInstructionId: null }, (data) => {
          const { customInstructions, activeInstructionId } = data;
          
          // 更新按钮状态
          updateInstructionButtonState(activeInstructionId);

          instructionsList.innerHTML = ''; // 清空列表

          // 添加 "无指令" 选项
          const noneOptionItem = document.createElement('div');
          noneOptionItem.className = 'instruction-item';
          noneOptionItem.innerHTML = `
              <input type="radio" id="instr-none" name="active-instruction" value="none" ${!activeInstructionId ? 'checked' : ''}>
              <label for="instr-none">无预设指令</label>
          `;
          instructionsList.appendChild(noneOptionItem);

          // 渲染每个指令
          customInstructions.forEach(instr => {
              const item = document.createElement('div');
              item.className = 'instruction-item';
              item.dataset.id = instr.id;

              const isChecked = instr.id === activeInstructionId;

              item.innerHTML = `
                  <input type="radio" id="${instr.id}" name="active-instruction" value="${instr.id}" ${isChecked ? 'checked' : ''}>
                  <label for="${instr.id}">${instr.name}</label>
                  <div class="instruction-buttons">
                    <button class="edit-btn" title="编辑指令">✏️</button>
                    <button class="delete-btn" title="删除指令">
                      <span class="material-icons">delete</span>
                    </button>
                  </div>
              `;
              instructionsList.appendChild(item);
          });
      });
  }

  // 事件委托处理选择、编辑和删除
  instructionsList.addEventListener('click', (e) => {
      const target = e.target;
      const item = target.closest('.instruction-item');
      if (!item) return;

      const instructionId = item.dataset.id;

      // 编辑指令
      if (target.classList.contains('edit-btn')) {
          startEditInstruction(instructionId);
      }
      // 删除指令 - 检查点击的是删除按钮或其子元素
      if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
          if (confirm('确定要删除这条指令吗？')) {
              deleteInstruction(instructionId);
          }
      }
      // 选择指令
      if (target.type === 'radio') {
          const selectedId = target.value;
          const idToSave = selectedId === 'none' ? null : selectedId;

          // 获取指令名称用于日志
          let instructionName = '无预设指令';
          if (idToSave) {
              chrome.storage.local.get({ customInstructions: [] }, (data) => {
                  const selectedInstr = data.customInstructions.find(instr => instr.id === idToSave);
                  if (selectedInstr) {
                      instructionName = selectedInstr.name;
                  }
                  console.log(`🎯 正在保存激活的自定义指令: ${instructionName} (ID: ${idToSave})`);
              });
          } else {
              console.log('🎯 正在清除激活的自定义指令');
          }

          chrome.storage.local.set({ activeInstructionId: idToSave }, () => {
              if (chrome.runtime.lastError) {
                  console.error('❌ 保存自定义指令ID失败:', chrome.runtime.lastError);
              } else {
                  console.log('✅ 自定义指令ID已成功保存到storage:', idToSave);
                  // 立即验证保存结果
                  chrome.storage.local.get(['activeInstructionId'], (verifyData) => {
                      console.log('🔍 验证storage中的activeInstructionId:', verifyData.activeInstructionId);
                  });
              }
          });

          // 立即更新UI以获得最佳用户体验
          updateInstructionButtonState(idToSave);
          // 选择指令后自动关闭弹窗
          closeInstructionsModal();
      }
  });

  function startEditInstruction(id) {
      chrome.storage.local.get({ customInstructions: [] }, (data) => {
          const instructionToEdit = data.customInstructions.find(instr => instr.id === id);
          if (instructionToEdit) {
              addForm.classList.remove('hidden');
              addNewBtn.classList.add('hidden');

              instructionNameInput.value = instructionToEdit.name;
              instructionPromptInput.value = instructionToEdit.prompt;
              instructionEditIdInput.value = instructionToEdit.id;
              
              saveBtn.textContent = '保存更改';
          }
      });
  }
  
  function deleteInstruction(id) {
      chrome.storage.local.get({ customInstructions: [], activeInstructionId: null }, (data) => {
          const newInstructions = data.customInstructions.filter(instr => instr.id !== id);
          let newActiveId = data.activeInstructionId;
          // 如果删除的是当前激活的指令，则重置激活状态
          if (newActiveId === id) {
              newActiveId = null;
          }
          chrome.storage.local.set({ customInstructions: newInstructions, activeInstructionId: newActiveId }, () => {
              renderInstructions();
          });
      });
  }

  // 初始加载
  renderInstructions();

  function closeSettingsModal() {
    if (settingsModalOverlay) settingsModalOverlay.classList.add('hidden');
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
  }
  if (settingsModalOverlay) {
    settingsModalOverlay.addEventListener('click', (e) => {
      if (e.target === settingsModalOverlay) closeSettingsModal();
    });
  }

  if (cancelSettingsBtn) {
    cancelSettingsBtn.addEventListener('click', function() {
      settingsModalOverlay.classList.add('hidden');
    });
  }
});

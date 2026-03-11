// ===== 鎵╁睍鍚姩娴嬭瘯 =====
console.log('popup.js 文件开始加载...');
console.log('当前时间:', new Date().toLocaleString());

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
  const modelSwitcher = document.getElementById('modelSwitcher');
  const collectToolBtn = document.getElementById('collectToolBtn');
  const collectToolPanel = document.getElementById('collectToolPanel');
  
  // 娣诲姞璁剧疆鐩稿叧鍏冪礌
  const accessKeyIdInput = document.getElementById('accessKeyId');
  const secretAccessKeyInput = document.getElementById('secretAccessKey');
  
  // 娣诲姞Tab椤靛垏鎹㈢浉鍏冲厓绱?
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
  let isCollecting = false; // 是否正在采集中
  const MAX_CHAT_SESSIONS = 30;
  const MAX_MESSAGES_PER_SESSION = 200;
  
  const settingsIcon = document.getElementById('settingsIcon');
  const settingsModal = document.getElementById('settingsModal');
  const saveSettingsButton = document.getElementById('saveSettings'); 
  const closeSettingsModalBtn = document.querySelector('#settingsModal .close-modal'); 
  const settingsModalOverlay = document.getElementById('settings-modal-overlay');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
  
  // 鍔犺浇宸蹭繚瀛樼殑璁剧疆
  function loadSettings() {
    // 鍔犺浇DeepSeek API瀵嗛挜
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
    
    // 鍔犺浇Gemini API瀵嗛挜
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
    
    // 鍔犺浇Access Key ID
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
    
    // 鍔犺浇Secret Access Key
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
  
  // 鎵撳紑璁剧疆妯℃€佹
  if (settingsTabBtn && settingsModalOverlay) {
    settingsTabBtn.addEventListener('click', function() {
      loadSettings(); 
      settingsModalOverlay.classList.remove('hidden');
    });
  }

  // 鍏抽棴璁剧疆妯℃€佹
  if (closeSettingsBtn && settingsModalOverlay) {
    closeSettingsBtn.addEventListener('click', function() {
      settingsModalOverlay.classList.add('hidden');
    });
  }
  
    // 鐐瑰嚮妯℃€佹澶栭儴鍏抽棴
  if (settingsModalOverlay) {
    settingsModalOverlay.addEventListener('click', function(e) {
      if (e.target === settingsModalOverlay) {
        settingsModalOverlay.classList.add('hidden');
      }
    });
  }

  // 淇濆瓨璁剧疆
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
          loadSettings(); // 閲嶆柊鍔犺浇浠ユ洿鏂扮姸鎬?
          checkApiKeyStatus(); 
          
          // 濡傛灉鏈夋洿鏂帮紝鍙戦€佹秷鎭埌background.js
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
  
  // 鍏抽棴璁剧疆妯℃€佹 (閫氳繃 specific close button ID)
  if (closeSettingsModalBtn && settingsModal) {
    closeSettingsModalBtn.addEventListener('click', function() {
      settingsModal.style.display = 'none';
    });
  }

  // 鐐瑰嚮妯℃€佹澶栭儴鍏抽棴 (Optional: good UX)
  if (settingsModal) {
    window.addEventListener('click', function(event) {
      if (event.target == settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
  }

  // 鏄剧ずToast鎻愮ず鍑芥暟
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

  if (modelSwitcher) {
    chrome.storage.local.get(['selectedModel'], (result) => {
      const savedModel = result.selectedModel;
      if (savedModel && modelSwitcher.querySelector(`option[value="${savedModel}"]`)) {
        modelSwitcher.value = savedModel;
      } else if (savedModel) {
        chrome.storage.local.set({ selectedModel: modelSwitcher.value });
      }
    });

    modelSwitcher.addEventListener('change', () => {
      chrome.storage.local.set({ selectedModel: modelSwitcher.value });
    });
  }

  function getMessageInputMaxHeight() {
    if (!messageInput) return 0;
    const maxHeightValue = window.getComputedStyle(messageInput).maxHeight;
    const parsed = parseInt(maxHeightValue, 10);
    return Number.isFinite(parsed) ? parsed : 120;
  }

  function autoResizeMessageInput() {
    if (!messageInput) return;
    const maxHeight = getMessageInputMaxHeight();
    messageInput.style.height = 'auto';
    const nextHeight = Math.min(messageInput.scrollHeight, maxHeight);
    messageInput.style.height = `${nextHeight}px`;
    messageInput.style.overflowY = messageInput.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }
  function closeCollectToolPanel() {
    if (!collectToolPanel || !collectToolBtn) return;
    collectToolPanel.classList.remove('open');
    collectToolBtn.classList.remove('active');
    collectToolPanel.style.transform = 'translateX(0)';
  }

  function positionCollectToolPanel() {
    if (!collectToolPanel) return;

    const mainContent = document.querySelector('.main-content');
    const boundsHost = mainContent || document.body;
    const hostRect = boundsHost.getBoundingClientRect();

    // Reset transform first, then calculate final offset.
    collectToolPanel.style.transform = 'translateX(0)';
    const panelRect = collectToolPanel.getBoundingClientRect();

    const minLeft = hostRect.left + 8;
    const maxRight = hostRect.right - 8;

    // Prefer right alignment close to the extension content edge.
    let shiftX = maxRight - panelRect.right;

    // Keep panel fully visible inside host bounds.
    const projectedLeft = panelRect.left + shiftX;
    if (projectedLeft < minLeft) {
      shiftX += (minLeft - projectedLeft);
    }

    const projectedRight = panelRect.right + shiftX;
    if (projectedRight > maxRight) {
      shiftX -= (projectedRight - maxRight);
    }

    collectToolPanel.style.transform = `translateX(${Math.round(shiftX)}px)`;
  }

  function toggleCollectToolPanel() {
    if (!collectToolPanel || !collectToolBtn) return;
    const isOpen = collectToolPanel.classList.contains('open');
    if (isOpen) {
      closeCollectToolPanel();
      return;
    }
    collectToolPanel.classList.add('open');
    collectToolBtn.classList.add('active');
    requestAnimationFrame(() => {
      // Always reset to the top when reopening, avoid "half panel" view.
      collectToolPanel.scrollTop = 0;

      const btnRect = collectToolBtn.getBoundingClientRect();
      const chatContainer = collectToolPanel.closest('.monica-chat-container');
      let availableAbove = Math.max(200, btnRect.top - 16);

      if (chatContainer) {
        const containerRect = chatContainer.getBoundingClientRect();
        availableAbove = Math.max(200, btnRect.top - containerRect.top - 12);
      }

      collectToolPanel.style.maxHeight = `${Math.min(420, Math.floor(availableAbove))}px`;
      positionCollectToolPanel();
    });
  }
  
  // 鏇存柊閲囬泦鎸夐挳鐘舵€?
  function updateCollectButtonState(collecting) {
    if (!collectBtn) return;
    
    isCollecting = collecting;
    if (collectToolBtn) {
      collectToolBtn.classList.toggle('is-active', collecting);
    }
    const iconElement = collectBtn.querySelector('.material-icons');
    
    if (collecting) {
      // 閲囬泦涓姸鎬?
      collectBtn.className = 'apple-btn apple-btn-collecting';
      iconElement.textContent = 'stop_circle';
      // 鏇存柊鎸夐挳鏂囨湰锛屼繚鐣欏浘鏍?
      collectBtn.innerHTML = '<span class="material-icons">stop_circle</span>停止采集';
    } else {
      // 鏈噰闆嗙姸鎬?
      collectBtn.className = 'apple-btn apple-btn-primary';
      iconElement.textContent = 'play_circle';
      // 鏇存柊鎸夐挳鏂囨湰锛屼繚鐣欏浘鏍?
      collectBtn.innerHTML = '<span class="material-icons">play_circle</span>开始采集';
    }
  }
  
  // 娴嬭瘯澶嶅埗鍔熻兘
  function testClipboard() {
    const testText = "测试复制功能";
    navigator.clipboard.writeText(testText).then(() => {
      console.log('复制测试成功');
      showToast('复制功能正常');
    }).catch(err => {
      console.error('复制测试失败:', err);
      showToast('复制功能异常: ' + err.message);
    });
  }
  
  // Tab椤靛垏鎹㈠姛鑳?
  function switchTab(tabId) {
    console.log('鍒囨崲鍒皌ab:', tabId);

    if (!aiAssistantTab || !imageGeneratorTab || !settingsTab ||
        !aiAssistantTabBtn || !imageGeneratorTabBtn || !settingsTabBtn) {
      console.error('Tab鍏冪礌鏈壘鍒帮紝鏃犳硶鍒囨崲');
      return;
    }

    [collectionTab, aiAssistantTab, imageGeneratorTab, settingsTab].forEach((tab) => {
      if (tab) tab.classList.remove('active');
    });

    [collectionTabBtn, aiAssistantTabBtn, imageGeneratorTabBtn, settingsTabBtn].forEach((btn) => {
      if (btn) btn.classList.remove('active');
    });

    if (tabId === 'collection') {
      tabId = 'aiAssistant';
    }

    if (tabId === 'aiAssistant') {
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
      loadSettings();
    }
  }
  
  // 娣诲姞Tab鎸夐挳鐐瑰嚮浜嬩欢
  
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
  
  // 鍔犺浇鍘嗗彶浼氳瘽
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
      messages: [], // 绌烘秷鎭暟缁勶紝涓嶅寘鍚杩庢秷鎭?
      hasUserMessage: false,
      currentSession: true,
      isTemporary: true // 鏍囪涓轰复鏃朵細璇?
    };
    
    // 灏嗘柊浼氳瘽鍜屽巻鍙蹭細璇濆悎骞讹紝鏂颁細璇濆湪鍓?
    chatSessions = [newSession];
    
    if (existingSessions.length > 0) {
      chatSessions = chatSessions.concat(existingSessions);
    }
    
    // 涓嶇珛鍗充繚瀛樺埌storage锛岀瓑鏈夊疄闄呭璇濆唴瀹规椂鍐嶄繚瀛?
    console.log('[DEBUG] 鍒濆鍖栧姞杞絚hatSessions锛堜笉淇濆瓨锛?', chatSessions.length, chatSessions.map(s => ({id: s.id, messages: s.messages.length, isTemporary: s.isTemporary})));
    
    // 鍙湪UI涓婃樉绀烘杩庢秷鎭紝涓嶅姞鍏ヤ細璇濆巻鍙?
    addMessage('欢迎使用AI助手，请输入您的问题。', false, true);
    
    uploadedFileContent = null; 
    clearUploadedFile(); 
    messageInput.value = ''; 
    autoResizeMessageInput();
    clearPageContent(); 
  });
  
  // 娓呯悊鍘嗗彶璁板綍鐨勫嚱鏁?
  function clearChatHistory() {
    chatSessions = [];
    chatMessages.innerHTML = '';
    chrome.storage.local.remove('chatSessions');
    uploadedFileContent = null; 
    clearUploadedFile(); 
    messageInput.value = ''; 
    autoResizeMessageInput();
    clearPageContent(); 
  }

  if (collectToolBtn && collectToolPanel) {
    collectToolBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleCollectToolPanel();
    });

    collectToolPanel.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    document.addEventListener('click', () => {
      closeCollectToolPanel();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeCollectToolPanel();
      }
    });

    window.addEventListener('resize', () => {
      if (!collectToolPanel.classList.contains('open')) return;
      requestAnimationFrame(() => {
        positionCollectToolPanel();
      });
    });
  }
  // 娣诲姞娓呴櫎椤甸潰鍐呭鐨勫嚱鏁?
  function clearPageContent() {
    pageContentLoaded = false;
    currentPageContent = null;
    getPageContentBtn.classList.remove('active');
  }

  // 娣诲姞鍒涘缓鏂颁細璇濈殑鍑芥暟
  function createNewChatSession(title = null) {
    chatMessages.innerHTML = '';
    addMessage('欢迎使用AI助手，请输入您的问题。', false, true); // 只UI展示
    const now = new Date();
    const newSession = {
      id: 'session_' + now.getTime(),
      title: title || now.toLocaleString(),
      created: now.toLocaleString(),
      messages: [], // 鏂颁細璇濅粠绌虹殑娑堟伅鏁扮粍寮€濮?
      hasUserMessage: false,
      currentSession: true
      // 涓嶅啀榛樿鍔爏aveToHistory: true
    };
    
    // 纭繚鎵€鏈夋棫浼氳瘽閮戒笉鏄綋鍓嶄細璇?
    if (chatSessions && chatSessions.length > 0) {
      chatSessions.forEach(s => { 
        s.currentSession = false; 
      });
    }
    
    // 灏嗘柊浼氳瘽娣诲姞鍒颁細璇濆垪琛ㄧ殑寮€澶?
    if (!chatSessions) {
      chatSessions = [];
    }
    chatSessions = [newSession, ...chatSessions];
    
    // 娓呯悊鎵€鏈夊巻鍙?session 鐨勬湰鍦版彁绀猴紙淇濇寔鍘熸湁閫昏緫锛?
    chatSessions.forEach(session => {
      if (session.id !== newSession.id) { // 涓嶅鐞嗘柊鍒涘缓鐨勪細璇?
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
    
    console.log('鍒涘缓鏂颁細璇?', newSession.id, '娑堟伅鏁伴噺:', newSession.messages.length);
    return newSession;
  }

  // 鏂板缓瀵硅瘽鎸夐挳鐐瑰嚮浜嬩欢
  newChatBtn.addEventListener('click', () => {
    // 鍏堟竻绌哄綋鍓嶄細璇濈殑鍘嗗彶璁板綍
    if (chatSessions && chatSessions.length > 0) {
      chatSessions.forEach(session => {
        session.currentSession = false;
      });
    }
    
    // 鍒涘缓鍏ㄦ柊鐨勪細璇?
    createNewChatSession();
    
    uploadedFileContent = null; 
    clearUploadedFile(); 
    messageInput.value = ''; 
    autoResizeMessageInput();
    clearPageContent();
    
    console.log('鏂板缓瀵硅瘽瀹屾垚锛屽綋鍓嶄細璇濆巻鍙插凡娓呯┖');
  });

  // 椤甸潰鍐呭鎸夐挳鐐瑰嚮浜嬩欢
  if (getPageContentBtn) {
    getPageContentBtn.addEventListener('click', async () => {
      try {
        getPageContentBtn.classList.add('active');
        
        // 鑾峰彇褰撳墠娲诲姩鏍囩椤?
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
          showToast('无法获取当前页面');
          getPageContentBtn.classList.remove('active');
          return;
        }

        // 鏀寔鎵€鏈夌綉椤碉紝涓嶉檺鍒剁壒瀹氱綉绔?

        // 娉ㄥ叆鍐呭鑴氭湰鑾峰彇椤甸潰鍐呭
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // 鑾峰彇椤甸潰鏍囬
            const title = document.title;
            
            // 鑾峰彇椤甸潰涓昏鍐呭锛屽皾璇曞绉嶉€夋嫨鍣?
            let content = '';
            
            // 灏濊瘯鑾峰彇鏂囩珷鍐呭鐨勫父瑙侀€夋嫨鍣?
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
            
            // 濡傛灉娌℃湁鎵惧埌涓昏鍐呭锛岃幏鍙朾ody涓殑鎵€鏈夋枃鏈紙鎺掗櫎瀵艰埅銆佽剼鏈瓑锛?
            if (!content) {
              const bodyClone = document.body.cloneNode(true);
              // 绉婚櫎鑴氭湰銆佹牱寮忋€佸鑸瓑涓嶉渶瑕佺殑鍏冪礌
              const elementsToRemove = bodyClone.querySelectorAll('script, style, nav, header, footer, .nav, .navigation, .menu, .sidebar');
              elementsToRemove.forEach(el => el.remove());
              content = bodyClone.innerText.trim();
            }
            
            // 鑾峰彇缃戠珯淇℃伅
            const hostname = window.location.hostname;
            const siteName = document.querySelector('meta[property="og:site_name"]')?.content || hostname;
            
            // 鑾峰彇鎻忚堪淇℃伅
            const description = document.querySelector('meta[name="description"]')?.content || 
                              document.querySelector('meta[property="og:description"]')?.content || '';
            
            return {
              title: title,
              content: content.substring(0, 3000), // 闄愬埗鍐呭闀垮害锛岄伩鍏嶈繃闀?
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
          
          // 鍦ㄨ亰澶╂涓樉绀洪〉闈俊鎭崱鐗?
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

  // 鍒涘缓椤甸潰鍐呭鍗＄墖
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
    
    // 涓轰竴閿€荤粨鎸夐挳娣诲姞鐐瑰嚮浜嬩欢
    const summarizeBtn = cardDiv.querySelector('.summarize-btn');
    if (summarizeBtn) {
      summarizeBtn.addEventListener('click', () => {
        // 濡傛灉姝ｅ湪娴佸紡杈撳嚭锛屼笉澶勭悊
        if (isStreaming) return;
        
        // 鏄剧ず澶勭悊涓姸鎬?
        addMessage('正在总结内容...', false);
        
                 // 鏋勫缓鎬荤粨璇锋眰
         const title = currentPageContent.title || '无标题';
         const content = currentPageContent.content || '';
         const summaryRequest = `请对以下内容进行总结，提炼核心观点和要点：\n\n标题：${title}\n\n${content}`;
         
         // 鑾峰彇褰撳墠閫夋嫨鐨勬ā鍨?
         const modelSwitcher = document.getElementById('modelSwitcher');
         const selectedModel = modelSwitcher ? modelSwitcher.value : 'deepseek';
        
        // 鍙戦€佹秷鎭粰background script
        chrome.runtime.sendMessage({
          action: 'analyzeContent',
          content: summaryRequest,
          isChat: true,
          isDataAnalysis: false,
          chatHistory: chatSessions.find(s => s.currentSession === true)?.messages || [],
          hasFile: false,
          skipUserMessage: true, // 娣诲姞鏍囪锛岃〃绀轰笉鏄剧ず鐢ㄦ埛娑堟伅
          model: selectedModel,
          customInstructionPrompt: '' // 椤甸潰鍔熻兘涓嶄娇鐢ㄨ嚜瀹氫箟鎸囦护锛屼繚鎸佷负绌?
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('鍙戦€佹秷鎭椂鍑洪敊:', chrome.runtime.lastError);
          }
        });
        
                 // 娣诲姞鍒板巻鍙茶褰曚絾涓嶆樉绀哄湪鐣岄潰涓?
         const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
         if (currentSessionIndex !== -1) {
           const summaryMessage = `[一键总结] ${title}`;
           chatSessions[currentSessionIndex].messages.push({ role: "user", content: summaryMessage, hidden: true });
           chatSessions[currentSessionIndex].hasUserMessage = true;
           saveSessionsToStorage();
         }
      });
    }
    
    // 涓哄啓鎴愮瑪璁版寜閽坊鍔犵偣鍑讳簨浠?
    const noteBtn = cardDiv.querySelector('.note-btn');
    if (noteBtn) {
      noteBtn.addEventListener('click', () => {
        // 濡傛灉姝ｅ湪娴佸紡杈撳嚭锛屼笉澶勭悊
        if (isStreaming) return;
        
        // 鏄剧ず澶勭悊涓姸鎬?
        addMessage('正在将内容改写为小红书笔记，请稍候...', false);
        
                 // 鏋勫缓鏀瑰啓璇锋眰
         const title = currentPageContent.title || '无标题';
         const content = currentPageContent.content || '';
         const rewriteRequest = `请将以下内容改写成1000字以内的小红书笔记格式，保留核心内容，使用小红书常见的轻松活泼风格，添加适当的emoji表情，分段清晰：\n\n标题：${title}\n\n${content}`;
         
         // 鑾峰彇褰撳墠閫夋嫨鐨勬ā鍨?
         const modelSwitcher = document.getElementById('modelSwitcher');
         const selectedModel = modelSwitcher ? modelSwitcher.value : 'deepseek';
        
        // 鍙戦€佹秷鎭粰background script
        chrome.runtime.sendMessage({
          action: 'analyzeContent',
          content: rewriteRequest,
          isChat: true,
          isDataAnalysis: false,
          chatHistory: chatSessions.find(s => s.currentSession === true)?.messages || [],
          hasFile: false,
          skipUserMessage: true,
          model: selectedModel,
          customInstructionPrompt: '' // 椤甸潰鍔熻兘涓嶄娇鐢ㄨ嚜瀹氫箟鎸囦护锛屼繚鎸佷负绌?
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('鍙戦€佹秷鎭椂鍑洪敊:', chrome.runtime.lastError);
          }
        });
        
                 // 娣诲姞鍒板巻鍙茶褰曚絾涓嶆樉绀哄湪鐣岄潰涓?
         const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
         if (currentSessionIndex !== -1) {
           const noteMessage = `[写成笔记] ${title}`;
           chatSessions[currentSessionIndex].messages.push({ role: "user", content: noteMessage, hidden: true });
           chatSessions[currentSessionIndex].hasUserMessage = true;
           saveSessionsToStorage();
         }
      });
    }
    
    // 涓虹敓鎴愮垎娆炬爣棰樻寜閽坊鍔犵偣鍑讳簨浠?
    const hotTitleBtn = cardDiv.querySelector('.hot-title-btn');
    if (hotTitleBtn) {
      hotTitleBtn.addEventListener('click', () => {
        // 濡傛灉姝ｅ湪娴佸紡杈撳嚭锛屼笉澶勭悊
        if (isStreaming) return;
        
        // 鏄剧ず澶勭悊涓姸鎬?
        addMessage('正在生成爆款标题，请稍候...', false);
        
                 // 鏋勫缓鐢熸垚鏍囬璇锋眰
         const title = currentPageContent.title || '';
         const content = currentPageContent.content || '';
         const titleRequest = `请根据以下内容，直接生成5个吸引人的小红书爆款标题，不要解释，只需列出5个标题：\n\n标题：${title}\n\n${content}`;
         
         // 鑾峰彇褰撳墠閫夋嫨鐨勬ā鍨?
         const modelSwitcher = document.getElementById('modelSwitcher');
         const selectedModel = modelSwitcher ? modelSwitcher.value : 'deepseek';
        
        // 鍙戦€佹秷鎭粰background script
        chrome.runtime.sendMessage({
          action: 'analyzeContent',
          content: titleRequest,
          isChat: true,
          isDataAnalysis: false,
          chatHistory: chatSessions.find(s => s.currentSession === true)?.messages || [],
          hasFile: false,
          skipUserMessage: true,
          model: selectedModel,
          customInstructionPrompt: '' // 椤甸潰鍔熻兘涓嶄娇鐢ㄨ嚜瀹氫箟鎸囦护锛屼繚鎸佷负绌?
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('鍙戦€佹秷鎭椂鍑洪敊:', chrome.runtime.lastError);
          }
        });
        
                 // 娣诲姞鍒板巻鍙茶褰曚絾涓嶆樉绀哄湪鐣岄潰涓?
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

  // 鍘嗗彶璁板綍鎸夐挳鐐瑰嚮浜嬩欢
  if (historyBtn) {
    historyBtn.addEventListener('click', () => {
      // 鏄剧ず鍘嗗彶璁板綍妯℃€佹
      const historyModal = document.getElementById('historyModal');
      const historyList = document.getElementById('historyList');
      
      if (historyModal && historyList) {
        // 娓呯┖鍘嗗彶鍒楄〃
        historyList.innerHTML = '';
        
        // 鍔犺浇鍘嗗彶璁板綍
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

              const titleElement = sessionDiv.querySelector('.history-title');
              if (titleElement) {
                titleElement.textContent = session.title || '未命名对话';
              }

              const dateElement = sessionDiv.querySelector('.history-date');
              if (dateElement) {
                dateElement.textContent = session.created || '';
              }

              const deleteActionBtn = sessionDiv.querySelector('.delete-btn');
              const actionsDiv = document.createElement('div');
              actionsDiv.className = 'history-actions';

              const renameBtn = document.createElement('button');
              renameBtn.className = 'history-action-btn rename-btn';
              renameBtn.type = 'button';
              renameBtn.title = '重命名此对话';
              renameBtn.innerHTML = '<span class="material-icons">edit</span>';

              if (deleteActionBtn) {
                sessionDiv.appendChild(actionsDiv);
                actionsDiv.appendChild(renameBtn);
                actionsDiv.appendChild(deleteActionBtn);
              }
              
              // 鐐瑰嚮鍘嗗彶璁板綍椤瑰姞杞藉璇?
              const historyContent = sessionDiv.querySelector('.history-content');
              historyContent.addEventListener('click', () => {
                loadChatSession(session);
                historyModal.style.display = 'none';
              });

              renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                renameHistorySession(session.id, session.title || '');
              });
              
              // 鐐瑰嚮鍒犻櫎鎸夐挳鍒犻櫎瀵硅瘽
              const deleteBtn = sessionDiv.querySelector('.delete-btn');
              deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 闃绘浜嬩欢鍐掓场
                deleteHistorySession(session.id);
              });
              
              historyList.appendChild(sessionDiv);
            });
          }
        });
        
        // 鏄剧ず妯℃€佹
        historyModal.style.display = 'flex';
      }
    });
  }

  // 鍒犻櫎鍘嗗彶璁板綍浼氳瘽
  function deleteHistorySession(sessionId) {
    // 鏄剧ず纭瀵硅瘽妗?
    if (confirm('确定要删除这条聊天记录吗？删除后无法恢复。')) {
      // 浠庡瓨鍌ㄤ腑鍒犻櫎
      chrome.storage.local.get(['chatSessions'], (result) => {
        const sessions = result.chatSessions || [];
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        
        chrome.storage.local.set({ chatSessions: updatedSessions }, () => {
          // 浠庡綋鍓嶄細璇濆垪琛ㄤ腑鍒犻櫎
          const sessionIndex = chatSessions.findIndex(s => s.id === sessionId);
          if (sessionIndex !== -1) {
            chatSessions.splice(sessionIndex, 1);
          }
          
          // 閲嶆柊鍔犺浇鍘嗗彶璁板綍鍒楄〃
          refreshHistoryList();
          showToast('聊天记录已删除');
          console.log('[DEBUG] 鍒犻櫎浼氳瘽鍚庡啓鍏hatSessions:', updatedSessions.length, updatedSessions.map(s => ({id: s.id, messages: s.messages.length})));
        });
      });
    }
  }

  // 鍒锋柊鍘嗗彶璁板綍鍒楄〃
  function renameHistorySession(sessionId, currentTitle) {
    const nextTitle = prompt('请输入新的对话标题', currentTitle || '');
    if (nextTitle === null) {
      return;
    }

    const trimmedTitle = nextTitle.trim();
    if (!trimmedTitle) {
      showToast('标题不能为空');
      return;
    }

    chrome.storage.local.get(['chatSessions'], (result) => {
      const sessions = result.chatSessions || [];
      const updatedSessions = sessions.map(session => (
        session.id === sessionId
          ? { ...session, title: trimmedTitle }
          : session
      ));

      chrome.storage.local.set({ chatSessions: updatedSessions }, () => {
        const sessionIndex = chatSessions.findIndex(s => s.id === sessionId);
        if (sessionIndex !== -1) {
          chatSessions[sessionIndex].title = trimmedTitle;
        }

        refreshHistoryList();
        showToast('标题已重命名');
      });
    });
  }

  function refreshHistoryList() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    // 娓呯┖鍘嗗彶鍒楄〃
    historyList.innerHTML = '';
    
    // 閲嶆柊鍔犺浇鍘嗗彶璁板綍
    chrome.storage.local.get(['chatSessions'], (result) => {
      let sessions = result.chatSessions || [];
      
      // 娓呯悊绌虹殑鍘嗗彶璁板綍
      const validSessions = sessions.filter(session => {
        // 杩囨护鎺夌郴缁熸彁绀烘秷鎭紝寰楀埌鏈夋晥娑堟伅
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
        
        // 妫€鏌ユ槸鍚︽湁鏈夋晥鐨勫璇濆唴瀹?
        const hasValidConversation = validMessages.length >= 2 && 
                                    validMessages.some(msg => msg.role === 'user') && 
                                    validMessages.some(msg => msg.role === 'assistant');
        
        // 妫€鏌ユ槸鍚︽湁椤甸潰鍐呭
        const hasPageContent = session.pageContent && 
                              session.pageContent.content && 
                              session.pageContent.content.trim();
        
        return hasValidConversation || hasPageContent;
      });
      
      // 濡傛灉娓呯悊鍚庣殑浼氳瘽鍒楄〃涓庡師鏉ヤ笉鍚岋紝鏇存柊瀛樺偍
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

          const titleElement = sessionDiv.querySelector('.history-title');
          if (titleElement) {
            titleElement.textContent = session.title || '未命名对话';
          }

          const dateElement = sessionDiv.querySelector('.history-date');
          if (dateElement) {
            dateElement.textContent = session.created || '';
          }

          const deleteActionBtn = sessionDiv.querySelector('.delete-btn');
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'history-actions';

          const renameBtn = document.createElement('button');
          renameBtn.className = 'history-action-btn rename-btn';
          renameBtn.type = 'button';
          renameBtn.title = '重命名此对话';
          renameBtn.innerHTML = '<span class="material-icons">edit</span>';

          if (deleteActionBtn) {
            sessionDiv.appendChild(actionsDiv);
            actionsDiv.appendChild(renameBtn);
            actionsDiv.appendChild(deleteActionBtn);
          }
          
          // 鐐瑰嚮鍘嗗彶璁板綍椤瑰姞杞藉璇?
          const historyContent = sessionDiv.querySelector('.history-content');
          historyContent.addEventListener('click', () => {
            loadChatSession(session);
            const historyModal = document.getElementById('historyModal');
            if (historyModal) {
              historyModal.style.display = 'none';
            }
          });

          renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            renameHistorySession(session.id, session.title || '');
          });
          
          // 鐐瑰嚮鍒犻櫎鎸夐挳鍒犻櫎瀵硅瘽
          const deleteBtn = sessionDiv.querySelector('.delete-btn');
          deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 闃绘浜嬩欢鍐掓场
            deleteHistorySession(session.id);
          });
          
          historyList.appendChild(sessionDiv);
        });
      }
    });
  }

  // 鍔犺浇鑱婂ぉ浼氳瘽
  function loadChatSession(session) {
    // 鍏堝湪chatSessions閲屾煡鎵?
    let targetSession = chatSessions.find(s => s.id === session.id);
    if (!targetSession) {
      // 娌℃湁灏辨彃鍏?
      chatSessions.unshift(session);
      targetSession = session;
    }
    // 鎵€鏈変細璇漜urrentSession璁句负false
    chatSessions.forEach(s => s.currentSession = false);
    // 鍙粰鐩爣浼氳瘽璁句负true
    targetSession.currentSession = true;

    // 娓呯┖褰撳墠鑱婂ぉ
    chatMessages.innerHTML = '';
    // 鍔犺浇鍘嗗彶娑堟伅
    if (targetSession.messages && targetSession.messages.length > 0) {
      targetSession.messages.forEach(msg => {
        addMessage(msg.content, msg.role === 'user', true);
      });
    }
    showToast('历史对话已加载');
  }

  // 鍘嗗彶璁板綍妯℃€佹鍏抽棴浜嬩欢
  if (closeHistoryModal) {
    closeHistoryModal.addEventListener('click', () => {
      if (historyModal) {
        historyModal.style.display = 'none';
      }
    });
  }

  // 鐐瑰嚮妯℃€佹澶栭儴鍏抽棴
  if (historyModal) {
    historyModal.addEventListener('click', (event) => {
      if (event.target === historyModal) {
        historyModal.style.display = 'none';
      }
    });
  }

  // 鍦ㄧ獥鍙ｅ叧闂椂淇濆瓨浼氳瘽鍘嗗彶
  window.addEventListener('unload', () => {
    saveSessionsToStorage();
  });
  
  // 淇濆瓨浼氳瘽鍒板瓨鍌ㄧ殑鍑芥暟
  function saveSessionsToStorage() {
    chrome.storage.local.get(['chatSessions'], (result) => {
      const existingSessions = result.chatSessions || [];
      
      const sessionsToSave = chatSessions.filter(session => {
        // 棣栧厛杩囨护鎺夌郴缁熸彁绀烘秷鎭紝寰楀埌鏈夋晥娑堟伅
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
        
        // 妫€鏌ユ槸鍚︽湁鏈夋晥鐨勫璇濆唴瀹?
        const hasValidConversation = validMessages.length >= 2 && // 鑷冲皯鏈変竴杞璇濓紙鐢ㄦ埛+AI锛?
                                    validMessages.some(msg => msg.role === 'user') && 
                                    validMessages.some(msg => msg.role === 'assistant');
        
        // 妫€鏌ユ槸鍚︽湁椤甸潰鍐呭锛堝嵆浣挎病鏈夊璇濅篃鍙互淇濆瓨锛?
        const hasPageContent = session.pageContent && 
                              session.pageContent.content && 
                              session.pageContent.content.trim();
        
        // 濡傛灉鏄复鏃朵細璇濅笖娌℃湁鍐呭锛屼笉淇濆瓨
        if (session.isTemporary && !hasValidConversation && !hasPageContent) {
          return false;
        }
        
        // 鍙繚鐣欐湁鍐呭鐨勪細璇濓紝涓嶅啀鍥犱负saveToHistory涓簍rue鑰屼繚瀛?
        return hasValidConversation || hasPageContent;
      }).map(session => {
        const sessionCopy = JSON.parse(JSON.stringify(session));
        
        // 绉婚櫎涓存椂鏍囪锛屽洜涓轰竴鏃︿繚瀛樺氨涓嶅啀鏄复鏃朵細璇濅簡
        delete sessionCopy.isTemporary;
        
        // 娓呯悊娑堟伅鏁扮粍锛岀Щ闄ょ郴缁熸彁绀?
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
        
        // 淇濈暀椤甸潰鍐呭
        if (session.pageContent) {
          sessionCopy.pageContent = session.pageContent;
        }
        
        return sessionCopy;
      });
      
      // 杩涗竴姝ヨ繃婊わ細纭繚淇濆瓨鐨勪細璇濈‘瀹炴湁鍐呭
      sessionsToSave.forEach(session => {
        if (session.messages && session.messages.length > MAX_MESSAGES_PER_SESSION) {
          session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
        }
      });

      const finalSessionsToSave = sessionsToSave.filter(session => {
        const hasMessages = session.messages && session.messages.length > 0;
        const hasPageContent = session.pageContent && session.pageContent.content;
        return hasMessages || hasPageContent;
      });
      
      if (finalSessionsToSave.length > 0) {
        const currentIds = finalSessionsToSave.map(s => s.id);
        const filteredExisting = existingSessions.filter(s => !currentIds.includes(s.id));
        const updatedSessions = [...finalSessionsToSave, ...filteredExisting].slice(0, MAX_CHAT_SESSIONS);
        
        chrome.storage.local.set({ chatSessions: updatedSessions });
        console.log('[DEBUG] saveSessionsToStorage鍐欏叆chatSessions:', updatedSessions.length, updatedSessions.map(s => ({id: s.id, messages: s.messages.length})));
        
        console.log('保存会话到历史记录:', finalSessionsToSave.length, '个有效会话');
      } else {
        console.log('没有有效会话需要保存');
      }
    });
  }
  
  // 娣诲姞鎬濊€冨姩鐢绘秷鎭?
  function addThinkingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message thinking-message';
    
    // 鍒涘缓鎬濊€冩枃鏈拰鍔ㄧ敾鍏冪礌
    const thinkingContainer = document.createElement('div');
    thinkingContainer.innerHTML = `
      <span class="thinking-text">正在思考...</span>
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
    
    // 淇濇寔"姝ｅ湪鎬濊€?鏂囨湰涓嶅彉锛屽彧鏄剧ず鍔ㄧ敾鏁堟灉
  }

  // 娣诲姞娑堟伅鍒拌亰澶╃獥鍙?
  function addMessage(message, isUser, onlyUI = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    if (!isUser) {
      messageDiv.setAttribute('data-raw-content', message);
      // 浣跨敤鏀硅繘鐨刴arkdown瑙ｆ瀽鍑芥暟
      if (typeof window.parseMarkdown === 'function') {
        messageDiv.innerHTML = window.parseMarkdown(message);
      } else {
        // 闄嶇骇鏂规锛氱洿鎺ヤ娇鐢╩arked
        messageDiv.innerHTML = marked(String(message).trim());
      }
      
      // 涓篈I娑堟伅娣诲姞澶嶅埗鎸夐挳锛堟帓闄ょ郴缁熸彁绀烘秷鎭級
      if (!message.startsWith('欢迎使用AI助手') && !message.startsWith('正在思考...') && !message.startsWith('正在总结内容') && !message.startsWith('正在生成爆款标题') && !message.startsWith('正在将内容改写为小红书笔记') && !message.startsWith('发送消息失败')) {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '<span class="material-icons">content_copy</span>复制';
        copyButton.addEventListener('click', async () => {
          try {
            // 浼樺厛鑾峰彇娓叉煋鍚庣殑绾枃鏈唴瀹?
            let textToCopy = message;
            
            // 灏濊瘯浠庡綋鍓嶆秷鎭殑娓叉煋鍐呭涓彁鍙栫函鏂囨湰
            const messageContent = messageDiv.querySelector('.markdown-body');
            if (messageContent) {
              textToCopy = messageContent.innerText || messageContent.textContent || message;
            } else {
              // 濡傛灉娌℃湁markdown-body锛岀洿鎺ヤ粠messageDiv鑾峰彇鏂囨湰
              const textContent = messageDiv.textContent || messageDiv.innerText;
              if (textContent && textContent !== '复制') {
                // 绉婚櫎澶嶅埗鎸夐挳鐨勬枃鏈?
                textToCopy = textContent.replace(/复制$/, '').replace(/已复制/, '').trim();
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
            // 闄嶇骇鏂规锛氫娇鐢╡xecCommand
            let textToCopy = message;
            
            // 鍚屾牱灏濊瘯鑾峰彇娓叉煋鍚庣殑鏂囨湰鍐呭
            const messageContent = messageDiv.querySelector('.markdown-body');
            if (messageContent) {
              textToCopy = messageContent.innerText || messageContent.textContent || message;
            } else {
              const textContent = messageDiv.textContent || messageDiv.innerText;
              if (textContent && textContent !== '复制') {
                textToCopy = textContent.replace(/复制$/, '').replace(/已复制/, '').trim();
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
      
      // 鍙湪涓嶆槸UI鎻愮ず鏃跺啓鍏essages
      if (!onlyUI && !message.startsWith('欢迎使用AI助手') && !message.startsWith('正在思考...') && !message.startsWith('正在总结内容') && !message.startsWith('正在生成爆款标题') && !message.startsWith('正在将内容改写为小红书笔记') && !message.startsWith('发送消息失败')) {
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
          // 濡傛灉鏄复鏃朵細璇濓紝绉婚櫎涓存椂鏍囪
          if (chatSessions[currentSessionIndex].isTemporary) {
            delete chatSessions[currentSessionIndex].isTemporary;
          }
        } else if (chatSessions.length > 0) {
          chatSessions[0].messages.push({ role: "user", content: message });
          chatSessions[0].hasUserMessage = true;
          // 濡傛灉鏄复鏃朵細璇濓紝绉婚櫎涓存椂鏍囪
          if (chatSessions[0].isTemporary) {
            delete chatSessions[0].isTemporary;
          }
        }
      }
    }
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // 灏嗗彂閫侀€昏緫灏佽鎴愪竴涓嚱鏁?
  function handleSendMessage() {
    const rawMessage = messageInput.value.trim();
    if (!rawMessage || isStreaming) return;

    // 纭畾褰撳墠浼氳瘽骞跺垽鏂槸鍚︿负鏂板璇濈殑绗竴鏉℃秷鎭?
    let currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
    if (currentSessionIndex === -1 && chatSessions.length > 0) {
      currentSessionIndex = 0;
    }
    const isFirstMessage = (currentSessionIndex !== -1) ? !chatSessions[currentSessionIndex].hasUserMessage : true;

    // 鏃犺绗嚑鏉℃秷鎭紝閮介渶瑕佽幏鍙栬嚜瀹氫箟鎸囦护骞朵紶閫掔粰AI
    chrome.storage.local.get(['activeInstructionId', 'customInstructions'], (data) => {
      let finalMessage = rawMessage;
      let customInstructionPrompt = '';

      console.log('从 storage 读取自定义指令数据:', {
        activeInstructionId: data.activeInstructionId,
        customInstructionsCount: data.customInstructions ? data.customInstructions.length : 0
      });

      // 鑾峰彇婵€娲荤殑鑷畾涔夋寚浠?
      if (data.activeInstructionId && Array.isArray(data.customInstructions)) {
        const activeInstr = data.customInstructions.find(instr => instr.id === data.activeInstructionId);
        if (activeInstr && activeInstr.prompt && activeInstr.prompt.trim()) {
          customInstructionPrompt = activeInstr.prompt.trim();
          console.log('找到激活的自定义指令:', activeInstr.name, '| 指令长度:', customInstructionPrompt.length);
          console.log('自定义指令内容预览:', customInstructionPrompt.substring(0, 100) + (customInstructionPrompt.length > 100 ? '...' : ''));
        } else {
          console.log('activeInstructionId 存在但未找到对应指令:', data.activeInstructionId);
        }
      } else {
        if (!data.activeInstructionId) {
          console.log('ℹ️ 未设置自定义指令(activeInstructionId为空)，使用默认系统提示');
        } else if (!Array.isArray(data.customInstructions)) {
          console.log('customInstructions 不是数组:', typeof data.customInstructions);
        }
      }

      console.log('准备发送消息给 AI，自定义指令长度:', customInstructionPrompt.length);
      sendToAI(finalMessage, rawMessage, customInstructionPrompt);
      messageInput.value = '';
      autoResizeMessageInput();
    });
  }

  // 鍋滄娴佸紡杈撳嚭
  function handleStopStreaming() {
    if (isStreaming) {
      shouldStopStreaming = true;
      chrome.runtime.sendMessage({ action: 'stopStreaming' });
      isStreaming = false;
      toggleSendStopButton(false);
      
      // 绉婚櫎鎬濊€冨姩鐢绘秷鎭?
      const thinkingMessage = document.querySelector('.thinking-message');
      if (thinkingMessage) {
        thinkingMessage.remove();
      }
      
      // 涓嶆樉绀?宸插仠姝㈢敓鎴?娑堟伅
    }
  }

  // 涓哄彂閫佹寜閽坊鍔犱簨浠剁洃鍚?
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', function() {
      if (isStreaming) {
        handleStopStreaming();
      } else {
        handleSendMessage();
      }
    });
  }

  // 涓鸿緭鍏ユ娣诲姞閿洏浜嬩欢鐩戝惉
  if (messageInput) {
    messageInput.addEventListener('input', function() {
      autoResizeMessageInput();
    });
    autoResizeMessageInput();
    messageInput.addEventListener('keydown', function(event) {
      if (event.isComposing || event.keyCode === 229) {
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // 阻止默认回车换行，改为发送消息
        handleSendMessage();
      }
    });
  }

  // 鍙戦€佹秷鎭埌AI
  function sendToAI(message, displayMessage = null, customInstructionPrompt = '') {
    const uiMessage = displayMessage !== null ? displayMessage : message;

    console.log('sendToAI 函数被调用，参数:', {
      messageLength: message.length,
      hasDisplayMessage: displayMessage !== null,
      customInstructionPromptLength: customInstructionPrompt.length
    });

    // 濡傛灉鏈変笂浼犵殑鏂囦欢锛屽湪鑱婂ぉ妗嗕腑鏄剧ず鏂囦欢淇℃伅
    if (uploadedFileContent) {
      const fileInfoText = `已上传文件：${uploadedFileContent.fileName} (${formatFileSize(uploadedFileContent.fileSize)})`;
      addMessage(fileInfoText, true, true);
      
      // 闅愯棌搴曢儴鐨勬枃浠舵彁绀?
      if (fileInfo) {
        fileInfo.style.display = 'none';
      }
    }
    
    // 绔嬪嵆鍦║I涓婃樉绀虹敤鎴锋秷鎭?
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

      // 淇濆瓨鐢ㄦ埛娑堟伅鍒板巻鍙茶褰?
      currentSession.messages.push({ role: "user", content: uiMessage });
      currentSession.hasUserMessage = true; 
      if (!currentSession.title || currentSession.title === currentSession.created) {
        // 淇鏍囬鐢熸垚閫昏緫
        const titleText = uiMessage.substring(0, 20);
        currentSession.title = titleText.length < uiMessage.length ? titleText + '...' : titleText;
      }
      saveSessionsToStorage();
      
      addThinkingMessage();
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
      // 鍑嗗鍙戦€佺粰AI鐨勫唴瀹?
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

      console.log('鉁夛笍 鍗冲皢鍙戦€佹秷鎭粰background.js:', {
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
      console.error('鍙戦€佹秷鎭け璐?', error);
      const thinkingMessage = document.querySelector('.thinking-message');
      if (thinkingMessage) {
        thinkingMessage.remove();
      }
      
      const errorMessage = error.message || '发送消息失败，请重试';
      addMessage(`错误：${errorMessage}`, false);
      
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
  
  // 鍒囨崲鍙戦€?鍋滄鎸夐挳鐘舵€?
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

  // 娣诲姞娓呴櫎鏂囦欢鐨勫姛鑳?
  function clearUploadedFile() {
    uploadedFileContent = null;
    fileInput.value = '';
    fileInfo.textContent = '支持 TXT 文件，最大 10MB';
    fileInfo.className = 'monica-file-info';
    fileInfo.style.display = 'none';
  }
  
  // 澶勭悊鏂囦欢涓婁紶
  fileInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) {
      clearUploadedFile();
      return;
    }
    
    if (file.type !== 'text/plain') {
      clearUploadedFile();
      fileInfo.textContent = '只支持 TXT 文件';
      fileInfo.className = 'monica-file-info';
      fileInfo.style.display = 'flex';
      setTimeout(() => {
        fileInfo.style.display = 'none';
      }, 3000);
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      clearUploadedFile();
      fileInfo.textContent = '文件大小不能超过 10MB';
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
      
      fileInfo.textContent = `已上传：${file.name} (${formatFileSize(file.size)})`;
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
  
  // 娣诲姞绉婚櫎鏂囦欢鐨勪簨浠剁洃鍚櫒
  const removeFileBtn = document.getElementById('removeFile');
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', function() {
      clearUploadedFile();
    });
  }
  
  // 娣诲姞鏂囦欢澶у皬鏍煎紡鍖栧嚱鏁?
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  }
  
  // 璇诲彇鏂囦欢鍐呭
  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }
  
  // 閲嶆瀯娴佸紡杈撳嚭鍜屾秷鎭洃鍚?  let streamingBuffer = '';
  let streamingMessageDiv = null;
  let streamingRenderScheduled = false;

  function scheduleStreamingRender() {
    if (streamingRenderScheduled) return;
    streamingRenderScheduled = true;
    requestAnimationFrame(() => {
      streamingRenderScheduled = false;
      if (!streamingMessageDiv) return;
      streamingMessageDiv.setAttribute('data-raw-content', streamingBuffer);
      if (typeof window.parseMarkdown === 'function') {
        streamingMessageDiv.innerHTML = window.parseMarkdown(streamingBuffer, true);
      } else {
        streamingMessageDiv.innerHTML = marked(String(streamingBuffer).trim());
      }
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'apiKeyRequired') {
      chrome.storage.local.get(['deepseekApiKey'], (result) => {
        if (result.deepseekApiKey && result.deepseekApiKey.trim() !== '') {
          console.log('已设置API密钥，忽略提示');
          sendResponse();
          return;
        }
        console.log('鏀跺埌API瀵嗛挜缂哄け鎻愮ず:', message.message);
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
      // 绉婚櫎鎬濊€冨姩鐢绘秷鎭?
      const thinkingMessage = document.querySelector('.thinking-message');
      if (thinkingMessage) {
        thinkingMessage.remove();
      }
      if (!streamingMessageDiv) {
        streamingBuffer = '';
        streamingMessageDiv = document.createElement('div');
        streamingMessageDiv.className = 'message ai-message streaming';
        streamingMessageDiv.setAttribute('data-raw-content', '');
        chatMessages.appendChild(streamingMessageDiv);
      }
      streamingBuffer += message.content || '';
      scheduleStreamingRender();
      return false;
    } else if (message.type === 'streamSummaryResponse') {
      // 澶勭悊涓€閿€荤粨/鐖嗘鏍囬绛夎烦杩囩敤鎴锋秷鎭殑娴佸紡杈撳嚭
      isStreaming = true;
      toggleSendStopButton(true);
      // 绉婚櫎鎬濊€冨姩鐢绘秷鎭?
      const thinkingMessage = document.querySelector('.thinking-message');
      if (thinkingMessage) {
        thinkingMessage.remove();
      }
      if (!streamingMessageDiv) {
        streamingBuffer = '';
        streamingMessageDiv = document.createElement('div');
        streamingMessageDiv.className = 'message ai-message streaming';
        streamingMessageDiv.setAttribute('data-raw-content', '');
        chatMessages.appendChild(streamingMessageDiv);
      }
      streamingBuffer += message.content || '';
      scheduleStreamingRender();
      return false;
    } else if (message.type === 'analysisComplete') {
      isStreaming = false;
      shouldStopStreaming = false;
      window.newSessionCreated = false;
      const streamingMessages = document.querySelectorAll('.streaming');
      streamingMessages.forEach(msg => {
        msg.classList.remove('streaming');
        
        // 涓烘祦寮忓搷搴旂殑AI娑堟伅娣诲姞澶嶅埗鎸夐挳
        if (streamingBuffer.trim()) {
          const copyButton = document.createElement('button');
          copyButton.className = 'copy-button';
          copyButton.innerHTML = '<span class="material-icons">content_copy</span>复制';
          copyButton.addEventListener('click', async () => {
            try {
              // 浼樺厛鑾峰彇娓叉煋鍚庣殑绾枃鏈唴瀹?
              let textToCopy = streamingBuffer;
              
              // 灏濊瘯浠庡綋鍓嶆秷鎭殑娓叉煋鍐呭涓彁鍙栫函鏂囨湰
              const messageContent = msg.querySelector('.markdown-body');
              if (messageContent) {
                textToCopy = messageContent.innerText || messageContent.textContent || streamingBuffer;
              } else {
                // 濡傛灉娌℃湁markdown-body锛岀洿鎺ヤ粠msg鑾峰彇鏂囨湰
                const textContent = msg.textContent || msg.innerText;
                if (textContent && textContent !== '复制') {
                  // 绉婚櫎澶嶅埗鎸夐挳鐨勬枃鏈?
                  textToCopy = textContent.replace(/复制$/, '').replace(/已复制/, '').trim();
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
              // 闄嶇骇鏂规锛氫娇鐢╡xecCommand
              let textToCopy = streamingBuffer;
              
              // 鍚屾牱灏濊瘯鑾峰彇娓叉煋鍚庣殑鏂囨湰鍐呭
              const messageContent = msg.querySelector('.markdown-body');
              if (messageContent) {
                textToCopy = messageContent.innerText || messageContent.textContent || streamingBuffer;
              } else {
                const textContent = msg.textContent || msg.innerText;
                if (textContent && textContent !== '复制') {
                  textToCopy = textContent.replace(/复制$/, '').replace(/已复制/, '').trim();
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
      
      // 鍙繚瀛樺埌浼氳瘽鍘嗗彶锛屼笉鍒涘缓鏂扮殑UI鍏冪礌锛堝洜涓烘祦寮忚緭鍑哄凡缁忔樉绀轰簡锛?
      if (streamingBuffer.trim()) {
        // 鍙皢娑堟伅鍐呭淇濆瓨鍒颁細璇濆巻鍙蹭腑
        const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
        if (currentSessionIndex !== -1) {
          chatSessions[currentSessionIndex].messages.push({ role: "assistant", content: streamingBuffer });
        } else if (chatSessions.length > 0) {
          chatSessions[0].messages.push({ role: "assistant", content: streamingBuffer });
        }
      }
      
      streamingBuffer = '';
      streamingMessageDiv = null;
      streamingRenderScheduled = false;
      if (chatSessions.length > 0) {
        const currentSessionIndex = chatSessions.findIndex(s => s.currentSession === true);
        let currentSession = currentSessionIndex !== -1 ? chatSessions[currentSessionIndex] : chatSessions[0];
        currentSession.messages.forEach(msg => { if (msg.role === 'assistant' && msg.streaming) delete msg.streaming; });
        saveSessionsToStorage();
      }
      toggleSendStopButton(false);
      return false;
    } else if (message.type === 'updateStatus') {
      // 鏇存柊閲囬泦鐘舵€佹樉绀?
      const statusElement = document.getElementById('status');
      const statusTextElement = statusElement.querySelector('span:last-child');
      statusTextElement.textContent = message.text;
      statusElement.style.display = 'flex';
      return false;
    } else if (message.type === 'collectionComplete') {
      console.log('鏀跺埌閲囬泦瀹屾垚娑堟伅:', message.text, '鏁版嵁鏉℃暟:', message.data?.length || 0);
      
      // 閲嶇疆閲囬泦鎸夐挳鐘舵€?
      updateCollectButtonState(false);
      closeCollectToolPanel();
      
      // 鑷姩鍒囨崲鍒癆I鍔╂墜鐣岄潰
      switchTab('aiAssistant');
      
      // 绛夊緟鐣岄潰鍒囨崲瀹屾垚鍚庯紝妫€鏌ユ槸鍚︽湁閲囬泦鏁版嵁锛岀劧鍚庡紑濮婣I鍒嗘瀽
      setTimeout(() => {
        // 妫€鏌ユ槸鍚﹀凡缁忔湁AI鍒嗘瀽鍦ㄨ繘琛屼腑
        if (!isStreaming) {
          if (message.data && message.data.length > 0) {
            // 鏄剧ず閲囬泦瀹屾垚鎻愮ず
            showToast(`笔记采集完成，正在分析 ${message.data.length} 篇笔记...`, 3000);
            
            // 鏈夐噰闆嗘暟鎹紝杩涜鏁版嵁鍒嗘瀽
            const analysisPrompt = `作为一个小红书运营专家，请分析本次采集到的爆款笔记共同点。先写约200字总结，然后从以下维度拆解：\n1. 选题角度与用户痛点：这个选题击中了什么需求或痛点？\n2. 标题特点：标题用了哪些吸引点击的技巧（如数字、反差、提问、身份带入等）？\n3. 基于以上分析，给我推荐5个爆款选题。`;
            
            // 鍒涘缓鏂扮殑浼氳瘽鐢ㄤ簬鍒嗘瀽閲囬泦鏁版嵁
            createNewChatSession(`笔记分析 - ${new Date().toLocaleString()}`);
            
            // 灏嗛噰闆嗘暟鎹缃负椤甸潰鍐呭锛屼娇鐢ㄦ牸寮忓寲鐨勬枃鏈唴瀹?
            const analysisContent = message.formattedContent || 
              `采集到 ${message.data.length} 篇笔记数据：\n\n` + 
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
            // 娌℃湁閲囬泦鏁版嵁锛屽彧鏄剧ず瀹屾垚娑堟伅
            showToast('笔记采集完成', 2000);
            addMessage(`${message.text}。如需AI分析，请手动输入问题。`, false, true);
          }
        }
      }, 500); // 寤惰繜500ms纭繚鐣岄潰鍒囨崲瀹屾垚
      
      return false;
    } else if (message.type === 'error') {
      // 閲嶇疆閲囬泦鎸夐挳鐘舵€侊紙鍦ㄩ敊璇儏鍐典笅锛?
      updateCollectButtonState(false);
      
      // 绉婚櫎鎬濊€冨姩鐢绘秷鎭?
      const thinkingMessage = document.querySelector('.thinking-message');
      if (thinkingMessage) {
        thinkingMessage.remove();
      }
      
      // 鏄剧ず鍏蜂綋鐨勯敊璇俊鎭?
      const errorMessage = message.error || '发送消息失败，请重试';
      addMessage(`错误：${errorMessage}`, false, true);
      
      // 閲嶇疆娴佸紡杈撳嚭鐘舵€?      isStreaming = false;
      toggleSendStopButton(false);
      streamingBuffer = '';
      streamingMessageDiv = null;
      streamingRenderScheduled = false;
      
      return false;
    }
    // 鍏朵粬鎵€鏈夊垎鏀?return false
    return false;
  });
  
  // 绉婚櫎鑱婂ぉ妗嗕腑鐨凙PI瀵嗛挜鎻愮ず娑堟伅
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
      addMessage('欢迎使用AI助手，请输入您的问题。', false);
    }
  }

  // 妫€鏌PI瀵嗛挜鐘舵€?
  function checkApiKeyStatus() {
    chrome.storage.local.get(['deepseekApiKey'], (result) => {
      const hasApiKey = result.deepseekApiKey && result.deepseekApiKey.trim() !== '';
      console.log('检查API密钥状态:', hasApiKey ? '已设置' : '未设置');

      removeApiKeyNotices();

      if (!hasApiKey) {
        addMessage('未检测到 DeepSeek API 密钥，部分 AI 功能不可用。请点击右下角设置图标填写后再试。', false);
      }
    });
  }

  // 瀹氭湡妫€鏌ユ爣绛鹃〉鐘舵€?
  async function checkXhsTab() {
    // 濡傛灉姝ｅ湪閲囬泦锛屼繚鎸?currentXhsTab 涓嶅彉锛岄伩鍏嶅仠姝㈡寚浠ゅ彂閿欑洰鏍?
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
        console.error('妫€鏌ラ〉闈㈠氨缁姸鎬佹椂鍑洪敊:', error);
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
  
  // 鏌ユ壘鎵€鏈夌洰鏍囨爣绛鹃〉
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
  
  // 妫€鏌ラ〉闈㈡槸鍚﹀噯澶囧ソ
  async function checkPageReady(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'checkReady' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('椤甸潰鏈噯澶囧ソ:', chrome.runtime.lastError.message);
          resolve(false);
        } else {
          resolve(!!response);
        }
      });
    });
  }

  // 鍔ㄦ€佹敞鍏ontent script
  async function injectContentScript(tabId) {
    try {
      console.log('寮€濮嬪姩鎬佹敞鍏ontent script鍒皌ab:', tabId);
      
      // 鍏堟敞鍏onfig.js
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['config.js']
      });
      
      // 鍐嶆敞鍏ontent.js
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      console.log('Content script娉ㄥ叆鎴愬姛');
      
      // 绛夊緟涓€涓嬭script鍒濆鍖?
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('娉ㄥ叆content script澶辫触:', error);
      return false;
    }
  }

  // 绛夊緟椤甸潰鍑嗗濂?
  async function waitForPageReady(tabId, maxAttempts = 3) {
    for (let i = 0; i < maxAttempts; i++) {
      if (await checkPageReady(tabId)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
  }

  // 閲囬泦鎸夐挳鐐瑰嚮浜嬩欢澶勭悊
  if (collectBtn) {
  collectBtn.addEventListener('click', async () => {
    console.log('采集按钮点击，当前状态:', isCollecting);
    
    if (isCollecting) {
      // 鍋滄閲囬泦
      console.log('执行停止采集');
      
      if (currentXhsTab) {
        const statusElement = document.getElementById('status');
        const statusTextElement = statusElement.querySelector('span:last-child');
        statusTextElement.textContent = '正在停止采集...';
        statusElement.style.display = 'flex';
        
        // 鍏堟洿鏂癠I鐘舵€?
        updateCollectButtonState(false);
        
        // 鍙戦€佸仠姝㈡秷鎭?
        chrome.tabs.sendMessage(currentXhsTab.id, {
          type: 'stopCollecting'
        }, (response) => {
          console.log('停止采集响应:', response);
          if (chrome.runtime.lastError) {
            console.error('鍋滄閲囬泦澶辫触:', chrome.runtime.lastError);
          }
        });
      }
    } else {
      // 寮€濮嬮噰闆?
      console.log('🚀 执行开始采集');
      
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      const tab = tabs[0];
      
      if (!tab.url.includes('xiaohongshu.com')) {
        alert('请在小红书页面使用此功能');
        return;
      }
      
      currentXhsTab = tab;
      
      // 妫€鏌ラ〉闈㈡槸鍚﹀噯澶囧ソ
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
            console.log('椤甸潰鏈噯澶囧ソ锛屽姩鎬佹敞鍏ontent script');
            await injectContentScript(tab.id);
            pageReady = true;
          }
        }
      }
      
      if (pageReady) {
        console.log('页面准备就绪，开始采集');
        
        // 鑾峰彇閲囬泦鍙傛暟
        const maxNotes = parseInt(document.getElementById('maxNotes').value) || 10;
        const minLikes = parseInt(document.getElementById('minLikes').value) || 0;
        const downloadCover = document.getElementById('downloadCover').checked;

        console.log('是否下载封面图:', downloadCover);

        // 鏇存柊UI鐘舵€?
        updateCollectButtonState(true);

        // 鍙戦€侀噰闆嗗懡浠?
        const result = await chrome.tabs.sendMessage(tab.id, {
          type: 'startCollecting',
          maxNotes: maxNotes,
          minLikes: minLikes,
          downloadCover: downloadCover
        });
        
        console.log('閲囬泦鍛戒护鍙戦€佺粨鏋?', result);
      }
    }
  });
  
  // 姣忕妫€鏌ヤ竴娆℃爣绛鹃〉鐘舵€?
  }

  setInterval(checkXhsTab, 1000);

  // 妫€鏌PI瀵嗛挜鐘舵€?
  checkApiKeyStatus(); 

  // 鍒濆鍖栭粯璁ゆ樉绀虹涓€涓猼ab
  console.log('鍒濆鍖栭粯璁ab鏄剧ず');
  setTimeout(() => {
    switchTab('aiAssistant');
  }, 100);

  // 娣诲姞椤甸潰鍏抽棴浜嬩欢鐩戝惉鍣?
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      chrome.runtime.sendMessage({ action: 'cancelPendingRequests' });
    }
  });

  window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ action: 'cancelPendingRequests' });
  });

  // --- 鑷畾涔夋寚浠ゅ姛鑳?---
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

  // --- 鏂板锛氭洿鏂版寚浠ゆ寜閽姸鎬?---
  function updateInstructionButtonState(isActive) {
    if (showHideBtn) {
      if (isActive) {
        showHideBtn.classList.add('active');
      } else {
        showHideBtn.classList.remove('active');
      }
    }
  }

  // 鍒囨崲鎸囦护鐣岄潰鐨勬樉绀?闅愯棌
  showHideBtn.addEventListener('click', () => {
      if (instructionsModalOverlay) {
        instructionsModalOverlay.classList.remove('hidden');
      }
  });

  // 鍏抽棴鎸囦护寮圭獥鐨勫嚱鏁?
  function closeInstructionsModal() {
    if (instructionsModalOverlay) {
      instructionsModalOverlay.classList.add('hidden');
      // 濡傛灉娣诲姞/缂栬緫琛ㄥ崟鏄墦寮€鐨勶紝灏卞彇娑堝畠
      if (!addForm.classList.contains('hidden')) {
        cancelBtn.click();
      }
    }
  }

  // 涓哄脊绐楃殑鍏抽棴鎸夐挳鍜岄伄缃╁眰娣诲姞浜嬩欢
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

  // 鏄剧ず娣诲姞琛ㄥ崟
  addNewBtn.addEventListener('click', () => {
      addForm.classList.remove('hidden');
      addNewBtn.classList.add('hidden');
  });

  // 鍙栨秷娣诲姞鎴栫紪杈?
  cancelBtn.addEventListener('click', () => {
      addForm.classList.add('hidden');
      addNewBtn.classList.remove('hidden');
      instructionNameInput.value = '';
      instructionPromptInput.value = '';
      instructionEditIdInput.value = ''; // 閲嶇疆缂栬緫ID
      saveBtn.textContent = '保存'; // 鎭㈠鎸夐挳鏂囨湰
  });

  // 淇濆瓨鏂版寚浠ゆ垨鏇存柊鐜版湁鎸囦护
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
          
          if (editId) { // --- 鏇存柊閫昏緫 ---
              const instructionToUpdate = instructions.find(instr => instr.id === editId);
              if (instructionToUpdate) {
                  instructionToUpdate.name = name;
                  instructionToUpdate.prompt = prompt;
              }
          } else { // --- 鏂板閫昏緫 ---
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
              cancelBtn.click(); // 鍏抽棴骞堕噸缃〃鍗?
          });
      });
  });

  // 娓叉煋鎸囦护鍒楄〃
  function renderInstructions() {
      chrome.storage.local.get({ customInstructions: [], activeInstructionId: null }, (data) => {
          const { customInstructions, activeInstructionId } = data;
          
          // 鏇存柊鎸夐挳鐘舵€?
          updateInstructionButtonState(activeInstructionId);

          instructionsList.innerHTML = ''; // 娓呯┖鍒楄〃

          // 娣诲姞 "鏃犳寚浠? 閫夐」
          const noneOptionItem = document.createElement('div');
          noneOptionItem.className = 'instruction-item';
          noneOptionItem.innerHTML = `
              <input type="radio" id="instr-none" name="active-instruction" value="none" ${!activeInstructionId ? 'checked' : ''}>
              <label for="instr-none">无预设指令</label>
          `;
          instructionsList.appendChild(noneOptionItem);

          // 娓叉煋姣忎釜鎸囦护
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

  // 浜嬩欢濮旀墭澶勭悊閫夋嫨銆佺紪杈戝拰鍒犻櫎
  instructionsList.addEventListener('click', (e) => {
      const target = e.target;
      const item = target.closest('.instruction-item');
      if (!item) return;

      const instructionId = item.dataset.id;

      // 缂栬緫鎸囦护
      if (target.classList.contains('edit-btn')) {
          startEditInstruction(instructionId);
      }
      // 鍒犻櫎鎸囦护 - 妫€鏌ョ偣鍑荤殑鏄垹闄ゆ寜閽垨鍏跺瓙鍏冪礌
      if (target.classList.contains('delete-btn') || target.closest('.delete-btn')) {
          if (confirm('确定要删除这条指令吗？')) {
              deleteInstruction(instructionId);
          }
      }
      // 閫夋嫨鎸囦护
      if (target.type === 'radio') {
          const selectedId = target.value;
          const idToSave = selectedId === 'none' ? null : selectedId;

          // 鑾峰彇鎸囦护鍚嶇О鐢ㄤ簬鏃ュ織
          let instructionName = '无预设指令';
          if (idToSave) {
              chrome.storage.local.get({ customInstructions: [] }, (data) => {
                  const selectedInstr = data.customInstructions.find(instr => instr.id === idToSave);
                  if (selectedInstr) {
                      instructionName = selectedInstr.name;
                  }
                  console.log(`正在保存激活的自定义指令: ${instructionName} (ID: ${idToSave})`);
              });
          } else {
              console.log('🎯 正在清除激活的自定义指令');
          }

          chrome.storage.local.set({ activeInstructionId: idToSave }, () => {
              if (chrome.runtime.lastError) {
                  console.error('保存自定义指令 ID 失败:', chrome.runtime.lastError);
              } else {
                  console.log('鉁?鑷畾涔夋寚浠D宸叉垚鍔熶繚瀛樺埌storage:', idToSave);
                  // 绔嬪嵆楠岃瘉淇濆瓨缁撴灉
                  chrome.storage.local.get(['activeInstructionId'], (verifyData) => {
                      console.log('验证 storage 中的 activeInstructionId:', verifyData.activeInstructionId);
                  });
              }
          });

          // 绔嬪嵆鏇存柊UI浠ヨ幏寰楁渶浣崇敤鎴蜂綋楠?
          updateInstructionButtonState(idToSave);
          // 閫夋嫨鎸囦护鍚庤嚜鍔ㄥ叧闂脊绐?
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
          // 濡傛灉鍒犻櫎鐨勬槸褰撳墠婵€娲荤殑鎸囦护锛屽垯閲嶇疆婵€娲荤姸鎬?
          if (newActiveId === id) {
              newActiveId = null;
          }
          chrome.storage.local.set({ customInstructions: newInstructions, activeInstructionId: newActiveId }, () => {
              renderInstructions();
          });
      });
  }

  // 鍒濆鍔犺浇
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

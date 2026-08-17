// ===== AI 创作助手 · Apple HIG 交互控制器 =====
console.log('AI 创作助手 popup.js (Apple HIG Edition) 开始加载...');

document.addEventListener('DOMContentLoaded', function () {
  // DOM 核心引用
  const chatMessages = document.getElementById('chatMessages');
  const messageInput = document.getElementById('messageInput');
  const sendMessageBtn = document.getElementById('sendMessage');
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const newChatBtn = document.getElementById('newChatBtn');
  const getPageContentBtn = document.getElementById('getPageContentBtn');
  const historyBtn = document.getElementById('historyBtn');
  const historyModal = document.getElementById('historyModal');
  const closeHistoryModal = document.getElementById('closeHistoryModal');
  const historyList = document.getElementById('historyList');
  const modelSwitcher = document.getElementById('modelSwitcher');
  const deepseekThinkingEffortSelect = document.getElementById('deepseekThinkingEffort');
  const collectToolBtn = document.getElementById('collectToolBtn');
  const collectToolPanel = document.getElementById('collectToolPanel');
  const collectBtn = document.getElementById('collectBtn');
  const settingsTabBtn = document.getElementById('settingsTabBtn');
  const settingsModalOverlay = document.getElementById('settings-modal-overlay');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const cancelSettingsBtn = document.getElementById('cancel-settings-btn');
  const sessionPillBtn = document.getElementById('sessionPillBtn');
  const headerSessionTitle = document.getElementById('headerSessionTitle');
  const moreMenuBtn = document.getElementById('moreMenuBtn');
  const moreMenu = document.getElementById('moreMenu');

  // 情境横幅与灵动胶囊
  const contextBanner = document.getElementById('contextBanner');
  const contextBannerTitle = document.getElementById('contextBannerTitle');
  const contextBannerDesc = document.getElementById('contextBannerDesc');
  const contextActionBtn = document.getElementById('contextActionBtn');
  const contextDismissBtn = document.getElementById('contextDismissBtn');
  const contextBannerIcon = document.getElementById('contextBannerIcon');
  const collectCapsule = document.getElementById('collectCapsule');
  const capsuleStatusText = document.getElementById('capsuleStatusText');
  const capsuleStopBtn = document.getElementById('capsuleStopBtn');

  // 状态变量
  let currentXhsTab = null;
  let currentActiveTab = null;
  let chatSessions = [];
  let uploadedAttachments = [];
  const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  const MAX_TEXT_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
  // Gemini 视觉端内部本就会把图缩到 1568 左右，传更大只是白费带宽和 token
  const IMAGE_MAX_EDGE = 1568;
  // 尺寸和体积都已达标的图不重编码，避免无谓的画质损失
  const IMAGE_SKIP_COMPRESS_SIZE = 1024 * 1024;
  const IMAGE_JPEG_QUALITY = 0.85;
  const IMAGE_PNG_FALLBACK_SIZE = 1.5 * 1024 * 1024;
  const VISION_FALLBACK_MODEL = 'gemini-3.7-flash';
  let isStreaming = false;
  let shouldStopStreaming = false;
  let pageContentLoaded = false;
  let currentPageContent = null;
  let isCollecting = false;
  // 本次采集结果的笔记正文上下文，绑定到自动创建的分析会话上，
  // 让首轮分析和后续追问都能拿到真实笔记数据（只存内存，不写 storage）
  let collectionContext = null;
  const COLLECTION_CTX_MAX_CHARS = 30000;
  const COLLECTION_NOTE_MAX_CHARS = 600;
  let streamingBuffer = '';
  let streamingMessageDiv = null;
  let reasoningBuffer = '';
  let reasoningMessageDiv = null;
  let hasAutoCollapsedReasoning = false;
  let streamingRenderScheduled = false;
  let reasoningRenderScheduled = false;
  let bannerDismissed = false;

  // ==========================================================================
  // 1. Apple 风格 Toast 通知
  // ==========================================================================
  function showToast(message, duration = 2200) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, duration);
    }
  }

  // ==========================================================================
  // 2. 设置 (Settings) 管理
  // ==========================================================================
  function loadSettings() {
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
      chrome.storage.local.get(['deepseekApiKey'], (result) => {
        if (result.deepseekApiKey && result.deepseekApiKey.trim() !== '') {
          apiKeyInput.value = '••••••••••••••••';
          apiKeyInput.setAttribute('data-has-value', 'true');
        } else {
          apiKeyInput.value = '';
          apiKeyInput.removeAttribute('data-has-value');
        }
      });
    }

    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    if (geminiApiKeyInput) {
      chrome.storage.local.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey && result.geminiApiKey.trim() !== '') {
          geminiApiKeyInput.value = '••••••••••••••••';
          geminiApiKeyInput.setAttribute('data-has-value', 'true');
        } else {
          geminiApiKeyInput.value = '';
          geminiApiKeyInput.removeAttribute('data-has-value');
        }
      });
    }
  }

  function openSettingsModal() {
    loadSettings();
    if (settingsModalOverlay) settingsModalOverlay.classList.remove('hidden');
    closeAllPopovers();
  }

  function closeSettingsModal() {
    if (settingsModalOverlay) settingsModalOverlay.classList.add('hidden');
  }

  if (settingsTabBtn) settingsTabBtn.addEventListener('click', openSettingsModal);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);
  if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  if (settingsModalOverlay) {
    settingsModalOverlay.addEventListener('click', (e) => {
      if (e.target === settingsModalOverlay) closeSettingsModal();
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const apiKeyInput = document.getElementById('apiKey');
      const geminiApiKeyInput = document.getElementById('geminiApiKey');
      const settingsToSave = {};

      if (apiKeyInput.value.trim() && !apiKeyInput.hasAttribute('data-has-value')) {
        settingsToSave.deepseekApiKey = apiKeyInput.value.trim();
      }
      if (geminiApiKeyInput.value.trim() && !geminiApiKeyInput.hasAttribute('data-has-value')) {
        settingsToSave.geminiApiKey = geminiApiKeyInput.value.trim();
      }

      if (Object.keys(settingsToSave).length > 0) {
        chrome.storage.local.set(settingsToSave, () => {
          closeSettingsModal();
          showToast('API 设置已保存');
          loadSettings();
          const message = { type: 'updateApiKey' };
          if (settingsToSave.deepseekApiKey) message.deepseekApiKey = settingsToSave.deepseekApiKey;
          if (settingsToSave.geminiApiKey) message.geminiApiKey = settingsToSave.geminiApiKey;
          chrome.runtime.sendMessage(message);
        });
      } else {
        closeSettingsModal();
      }
    });
  }

  // ==========================================================================
  // 3. 模型与思考深度选择器 (Model & Thinking Effort Menu)
  // ==========================================================================
  const modelMenuBtn = document.getElementById('modelMenuBtn');
  const modelMenu = document.getElementById('modelMenu');
  const modelMenuLabel = document.getElementById('modelMenuLabel');
  const thinkingTagBadge = document.getElementById('thinkingTagBadge');
  const thinkingSection = document.getElementById('thinkingSection');

  function isDeepSeekModel(model) {
    return typeof model === 'string' && model.startsWith('deepseek');
  }

  function getModelDisplayName(val) {
    const map = {
      'deepseek-v4-flash': 'DeepSeek V4 Flash',
      'deepseek-v4-pro': 'DeepSeek V4 Pro',
      'gemini-3.7-flash': 'Gemini 3.7 Flash',
      'gemini-3.1-pro-preview': 'Gemini 3.1 Pro'
    };
    return map[val] || val;
  }

  function getThinkingDisplayName(effort) {
    if (effort === 'max') return 'Max';
    if (effort === 'high') return 'High';
    if (effort === 'mid' || effort === 'medium') return 'Mid';
    if (effort === 'low') return 'Low';
    return 'Off';
  }

  function getThinkingOptions(model) {
    const effort = deepseekThinkingEffortSelect ? deepseekThinkingEffortSelect.value : 'high';
    return {
      thinkingType: (effort === 'disabled' || effort === 'off') ? 'disabled' : 'enabled',
      reasoningEffort: effort
    };
  }

  function syncModelMenuState() {
    if (!modelSwitcher) return;
    const model = modelSwitcher.value;
    const effort = deepseekThinkingEffortSelect ? deepseekThinkingEffortSelect.value : 'high';

    if (modelMenuLabel) modelMenuLabel.textContent = getModelDisplayName(model);

    if (thinkingTagBadge) {
      if (effort !== 'disabled') {
        thinkingTagBadge.textContent = getThinkingDisplayName(effort);
        thinkingTagBadge.classList.remove('disabled');
      } else {
        thinkingTagBadge.classList.add('disabled');
      }
    }

    // 思考深度选项对 DeepSeek 和 Gemini 均生效
    if (thinkingSection) {
      thinkingSection.style.display = 'block';
    }

    if (modelMenu) {
      modelMenu.querySelectorAll('[data-model]').forEach((item) => {
        item.classList.toggle('checked', item.dataset.model === model);
      });
      modelMenu.querySelectorAll('[data-effort]').forEach((item) => {
        item.classList.toggle('checked', item.dataset.effort === effort);
      });
    }
  }

  // 初始化模型与思考状态
  chrome.storage.local.get(['selectedModel', 'deepseekReasoningEffort'], (result) => {
    let savedModel = result.selectedModel === 'deepseek' ? 'deepseek-v4-flash' : result.selectedModel;
    if (savedModel && modelSwitcher && modelSwitcher.querySelector(`option[value="${savedModel}"]`)) {
      modelSwitcher.value = savedModel;
    }
    const savedEffort = result.deepseekReasoningEffort;
    if (savedEffort && deepseekThinkingEffortSelect && deepseekThinkingEffortSelect.querySelector(`option[value="${savedEffort}"]`)) {
      deepseekThinkingEffortSelect.value = savedEffort;
    }
    syncModelMenuState();
  });

  if (modelMenuBtn && modelMenu) {
    modelMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !modelMenu.classList.contains('open');
      closeAllPopovers();
      if (willOpen) {
        syncModelMenuState();
        modelMenu.classList.add('open');
        modelMenuBtn.classList.add('open');
        modelMenuBtn.setAttribute('aria-expanded', 'true');
      }
    });

    modelMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const modelItem = e.target.closest('[data-model]');
      if (modelItem) {
        const selectedModel = modelItem.dataset.model;
        if (modelSwitcher) {
          modelSwitcher.value = selectedModel;
          chrome.storage.local.set({ selectedModel });
        }
        syncModelMenuState();
        return;
      }

      const effortItem = e.target.closest('[data-effort]');
      if (effortItem) {
        const effort = effortItem.dataset.effort;
        if (deepseekThinkingEffortSelect) {
          deepseekThinkingEffortSelect.value = effort;
          chrome.storage.local.set({ deepseekReasoningEffort: effort });
        }
        syncModelMenuState();
        closeAllPopovers();
      }
    });
  }

  // ==========================================================================
  // 4. 附件与更多 Popover 菜单
  // ==========================================================================
  const attachBtn = document.getElementById('attachBtn');
  const attachMenu = document.getElementById('attachMenu');
  const attachUploadBtn = document.getElementById('attachUploadBtn');

  function closeAllPopovers() {
    if (modelMenu) {
      modelMenu.classList.remove('open');
      if (modelMenuBtn) modelMenuBtn.classList.remove('open');
    }
    if (attachMenu) {
      attachMenu.classList.remove('open');
    }
    if (moreMenu) {
      moreMenu.classList.remove('open');
    }
    if (collectToolPanel) {
      collectToolPanel.classList.remove('open');
      if (collectToolBtn) collectToolBtn.classList.remove('active');
    }
  }

  document.addEventListener('click', () => {
    closeAllPopovers();
  });

  if (attachBtn && attachMenu) {
    attachBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !attachMenu.classList.contains('open');
      closeAllPopovers();
      if (willOpen) attachMenu.classList.add('open');
    });
  }

  if (attachUploadBtn && fileInput) {
    attachUploadBtn.addEventListener('click', () => {
      closeAllPopovers();
      fileInput.click();
    });
  }

  if (moreMenuBtn && moreMenu) {
    moreMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !moreMenu.classList.contains('open');
      closeAllPopovers();
      if (willOpen) moreMenu.classList.add('open');
    });
  }

  // ==========================================================================
  // 5. 采集爆款面板与灵动胶囊交互
  // ==========================================================================
  if (collectToolBtn && collectToolPanel) {
    collectToolBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !collectToolPanel.classList.contains('open');
      closeAllPopovers();
      if (willOpen) {
        collectToolPanel.classList.add('open');
        collectToolBtn.classList.add('active');
      }
    });

    collectToolPanel.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  function updateCollectButtonState(collecting) {
    isCollecting = collecting;
    if (collectCapsule) {
      collectCapsule.classList.toggle('active', collecting);
    }
    if (collectBtn) {
      collectBtn.innerHTML = collecting
        ? '<span class="material-icons" style="font-size:16px;">stop</span><span>停止采集</span>'
        : '<span class="material-icons" style="font-size:16px;">play_arrow</span><span>开始采集</span>';
    }
  }

  if (capsuleStopBtn) {
    capsuleStopBtn.addEventListener('click', () => {
      if (isCollecting && currentXhsTab) {
        capsuleStatusText.textContent = '正在停止采集...';
        chrome.tabs.sendMessage(currentXhsTab.id, { type: 'stopCollecting' });
        updateCollectButtonState(false);
      }
    });
  }

  // 触发采集逻辑
  async function triggerCollection(customParams = null) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab || !tab.url || !tab.url.includes('xiaohongshu.com')) {
      showToast('请在小红书网页端使用此功能');
      return;
    }

    currentXhsTab = tab;
    closeAllPopovers();

    // 确保页面就绪
    let pageReady = false;
    let attempts = 0;
    while (!pageReady && attempts < 3) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'ping' });
        pageReady = true;
      } catch (err) {
        attempts++;
        if (attempts >= 3) {
          await injectContentScript(tab.id);
          pageReady = true;
        }
      }
    }

    if (pageReady) {
      const maxNotes = customParams?.maxNotes || parseInt(document.getElementById('maxNotes').value) || 10;
      const minLikes = customParams?.minLikes || parseInt(document.getElementById('minLikes').value) || 500;
      const downloadCover = customParams?.downloadCover ?? document.getElementById('downloadCover').checked;

      capsuleStatusText.textContent = `开始采集前 ${maxNotes} 篇爆款 (赞>${minLikes})...`;
      updateCollectButtonState(true);

      chrome.tabs.sendMessage(tab.id, {
        type: 'startCollecting',
        maxNotes: maxNotes,
        minLikes: minLikes,
        downloadCover: downloadCover
      });
    }
  }

  if (collectBtn) {
    collectBtn.addEventListener('click', () => {
      if (isCollecting) {
        if (currentXhsTab) {
          chrome.tabs.sendMessage(currentXhsTab.id, { type: 'stopCollecting' });
          updateCollectButtonState(false);
        }
      } else {
        triggerCollection();
      }
    });
  }

  // ==========================================================================
  // 6. 智能情境感知 (Context-Aware Intelligence)
  // ==========================================================================
  async function updateContextAwareness() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab || !tab.url || bannerDismissed) return;

      currentActiveTab = tab;
      const url = tab.url;

      if (url.includes('xiaohongshu.com/search') || (url.includes('xiaohongshu.com/explore') && url.includes('keyword='))) {
        // 小红书搜索页
        contextBannerTitle.textContent = '小红书爆款嗅探';
        contextBannerDesc.textContent = '检测到搜索页，可一键采集前10篇高赞笔记';
        contextActionBtn.innerHTML = '<span class="material-icons" style="font-size:13px;">bolt</span><span>一键采集 Top 10</span>';
        contextBannerIcon.innerHTML = '<span class="material-icons">bolt</span>';
        contextActionBtn.onclick = () => triggerCollection({ maxNotes: 10, minLikes: 500, downloadCover: true });
        contextBanner.classList.add('show');
      } else if (url.includes('xiaohongshu.com/explore/')) {
        // 小红书单篇笔记详情页
        contextBannerTitle.textContent = '爆款笔记拆解';
        contextBannerDesc.textContent = '已就绪：分析当前笔记文案结构与爆款钩子';
        contextActionBtn.innerHTML = '<span class="material-icons" style="font-size:13px;">auto_awesome</span><span>一键拆解</span>';
        contextBannerIcon.innerHTML = '<span class="material-icons">description</span>';
        contextActionBtn.onclick = () => {
          if (getPageContentBtn) getPageContentBtn.click();
        };
        contextBanner.classList.add('show');
      } else if (!url.startsWith('chrome://') && !url.startsWith('edge://') && !url.startsWith('about:')) {
        // 普通文章/网页
        contextBannerTitle.textContent = '网页内容提炼';
        contextBannerDesc.textContent = `将 ${tab.title ? tab.title.substring(0, 18) + '...' : '当前网页'} 改写为小红书笔记`;
        contextActionBtn.innerHTML = '<span class="material-icons" style="font-size:13px;">auto_awesome</span><span>读取并改写</span>';
        contextBannerIcon.innerHTML = '<span class="material-icons">article</span>';
        contextActionBtn.onclick = () => {
          if (getPageContentBtn) getPageContentBtn.click();
        };
        contextBanner.classList.add('show');
      } else {
        contextBanner.classList.remove('show');
      }
    } catch (e) {
      console.warn('Context awareness error:', e);
    }
  }

  if (contextDismissBtn) {
    contextDismissBtn.addEventListener('click', () => {
      bannerDismissed = true;
      contextBanner.classList.remove('show');
    });
  }

  // 轮询当前标签页环境
  setInterval(updateContextAwareness, 1500);

  // ==========================================================================
  // 7. 会话管理 (Chat Sessions)
  // ==========================================================================
  function updateHeaderSessionTitle(title) {
    if (headerSessionTitle) {
      headerSessionTitle.textContent = title || '新建对话';
    }
  }

  function saveSessionsToStorage() {
    const toSave = chatSessions.filter(s => !s.isTemporary || (s.messages && s.messages.length > 0));
    // 图片 base64 只在内存里保留（供当前会话多轮追问回灌给模型），写入 storage 时剥离。
    // 历史渲染本来就不读 attachments，全量写入只会顶满配额，
    // 导致后续 _pendingImageAttachments 的写入静默失败、图片丢给 AI 之前就没了。
    const stripped = toSave.map(s => ({
      ...s,
      messages: (s.messages || []).map(m =>
        m.attachments && m.attachments.length > 0
          ? { ...m, attachments: m.attachments.map(a => ({ mimeType: a.mimeType })) }
          : m
      )
    }));
    chrome.storage.local.set({ chatSessions: stripped }, () => {
      if (chrome.runtime.lastError) {
        console.error('保存会话失败:', chrome.runtime.lastError.message);
      }
    });
  }

  // 会话是否还没被首条消息命名过。
  // 用显式标记而不是比较标题字符串——占位文案一改，字符串判定就会失效
  function isUnnamedSession(session) {
    if (!session) return false;
    if (typeof session.titlePending === 'boolean') return session.titlePending;
    // 兼容标记引入前存下的旧会话
    return !session.title || session.title === session.created || session.title === '新建对话';
  }

  function makeSessionTitle(text) {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '新建对话';
    return clean.length > 18 ? clean.substring(0, 18) + '...' : clean;
  }

  // 一次性回填：占位标题不会被首条消息覆盖的那段时期，历史里堆了一批「新建对话」。
  // 回填后写入 titlePending: false，之后启动不会重复处理
  function backfillSessionTitles(sessions) {
    let fixed = 0;
    for (const s of sessions) {
      if (!s || !Array.isArray(s.messages) || s.messages.length === 0) continue;
      if (!isUnnamedSession(s)) continue;
      const firstUser = s.messages.find(m => m.role === 'user' && m.content && m.content.trim());
      if (!firstUser) continue;
      s.title = makeSessionTitle(firstUser.content);
      s.titlePending = false;
      fixed++;
    }
    return fixed;
  }

  function createNewChatSession(title = null) {
    chatMessages.innerHTML = '';
    renderWelcomeScreen();
    const now = new Date();
    const newSession = {
      id: 'session_' + now.getTime(),
      title: title || now.toLocaleString(),
      created: now.toLocaleString(),
      messages: [],
      hasUserMessage: false,
      currentSession: true,
      titlePending: !title
    };

    if (chatSessions && chatSessions.length > 0) {
      chatSessions.forEach(s => { s.currentSession = false; });
    }

    chatSessions = [newSession, ...(chatSessions || [])];
    updateHeaderSessionTitle(newSession.title);
    clearUploadedFiles();
    clearPageContent();
    messageInput.value = '';
    autoResizeMessageInput();
    return newSession;
  }

  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      createNewChatSession();
      showToast('已新建对话');
    });
  }

  if (sessionPillBtn) {
    sessionPillBtn.addEventListener('click', () => {
      if (historyBtn) historyBtn.click();
    });
  }

  // ==========================================================================
  // 8. 欢迎引导屏渲染
  // ==========================================================================
  function renderWelcomeScreen() {
    if (!chatMessages) return;

    const welcome = document.createElement('div');
    welcome.className = 'welcome';
    welcome.innerHTML = `
      <div class="welcome-badge">
        <span class="material-icons" style="font-size:12px;">auto_awesome</span>
        <span>小红书 · 创作副驾</span>
      </div>
      <h1 class="welcome-title">今天想写点什么？</h1>
      <p class="welcome-sub">采集爆款数据 → 拆解核心结构 → 生成你自己的爆款笔记</p>
      <div class="welcome-grid">
        <button class="welcome-card" type="button" data-welcome="collect">
          <span class="material-icons">travel_explore</span>
          <span class="welcome-card-body">
            <span class="welcome-card-title">采集爆款笔记</span>
            <span class="welcome-card-desc">在小红书搜索结果页批量抓取高赞笔记，自动分析共性</span>
          </span>
        </button>
        <button class="welcome-card" type="button" data-welcome="page">
          <span class="material-icons">description</span>
          <span class="welcome-card-body">
            <span class="welcome-card-title">读取当前网页</span>
            <span class="welcome-card-desc">把正在阅读的文章一键提炼、总结或改写为小红书风格</span>
          </span>
        </button>
        <button class="welcome-card" type="button" data-welcome="prompt"
          data-prompt="帮我写一篇小红书笔记，主题是：">
          <span class="material-icons">edit_note</span>
          <span class="welcome-card-body">
            <span class="welcome-card-title">写一篇小红书文案</span>
            <span class="welcome-card-desc">输入任意主题，生成结构完整、口语化排版的优质文案</span>
          </span>
        </button>
        <button class="welcome-card" type="button" data-welcome="prompt"
          data-prompt="围绕下面这个主题，帮我起 5 个吸引人点击的小红书爆款标题：">
          <span class="material-icons">local_fire_department</span>
          <span class="welcome-card-body">
            <span class="welcome-card-title">起 5 个爆款标题</span>
            <span class="welcome-card-desc">套用高点击标题公式，快速测试用户吸睛点</span>
          </span>
        </button>
      </div>
    `;

    welcome.addEventListener('click', (event) => {
      const card = event.target.closest('.welcome-card');
      if (!card) return;
      event.stopPropagation();

      const type = card.dataset.welcome;
      if (type === 'collect') {
        if (collectToolBtn) collectToolBtn.click();
      } else if (type === 'page') {
        if (getPageContentBtn) getPageContentBtn.click();
      } else if (type === 'prompt') {
        if (!messageInput) return;
        messageInput.value = card.dataset.prompt || '';
        messageInput.focus();
        messageInput.setSelectionRange(messageInput.value.length, messageInput.value.length);
        autoResizeMessageInput();
      }
    });

    chatMessages.appendChild(welcome);
  }

  function removeWelcomeScreen() {
    if (!chatMessages) return;
    const welcome = chatMessages.querySelector('.welcome');
    if (welcome) welcome.remove();
  }

  // ==========================================================================
  // 9. 智能后续指令胶囊 (Follow-up Action Chips)
  // ==========================================================================
  function appendFollowUpPills(container) {
    const followupDiv = document.createElement('div');
    followupDiv.className = 'followup-container';
    followupDiv.innerHTML = `
      <button type="button" class="followup-pill" data-prompt="请按上面的第 1 个选题，写出一篇完整的小红书正文笔记，带emoji和标签">
        <span>👉 写第1个选题正文</span>
      </button>
      <button type="button" class="followup-pill" data-prompt="请针对上面的内容，再生成 5 个不同风格的吸睛爆款标题">
        <span>👉 换一批爆款标题</span>
      </button>
      <button type="button" class="followup-pill" data-prompt="请帮我设计这篇笔记配套的首图封面排版与拍摄脚本建议">
        <span>👉 封面图设计建议</span>
      </button>
    `;

    followupDiv.addEventListener('click', (e) => {
      const pill = e.target.closest('.followup-pill');
      if (!pill) return;
      const prompt = pill.dataset.prompt;
      if (prompt && !isStreaming) {
        if (messageInput) {
          messageInput.value = prompt;
          handleSendMessage();
        }
      }
    });

    container.appendChild(followupDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // ==========================================================================
  // 10. 消息渲染与复制逻辑
  // ==========================================================================
  function addMessage(message, isUser, onlyUI = false) {
    removeWelcomeScreen();
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

    if (!isUser) {
      messageDiv.setAttribute('data-raw-content', message);

      const headerDiv = document.createElement('div');
      headerDiv.className = 'ai-message-header';
      headerDiv.innerHTML = '<span class="material-icons">auto_awesome</span><span>AI 助手</span>';
      messageDiv.appendChild(headerDiv);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'markdown-body';
      if (typeof window.parseMarkdown === 'function') {
        contentDiv.innerHTML = window.parseMarkdown(message);
      } else if (typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked(String(message).trim());
      } else {
        contentDiv.textContent = message;
      }
      messageDiv.appendChild(contentDiv);

      // 复制按钮
      if (!message.startsWith('正在') && !message.startsWith('错误')) {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '<span class="material-icons">content_copy</span>复制';
        copyButton.addEventListener('click', async () => {
          try {
            let textToCopy = contentDiv.innerText || message;
            await navigator.clipboard.writeText(textToCopy);
            copyButton.innerHTML = '<span class="material-icons">check</span>已复制';
            copyButton.classList.add('copy-success');
            setTimeout(() => {
              copyButton.innerHTML = '<span class="material-icons">content_copy</span>复制';
              copyButton.classList.remove('copy-success');
            }, 1800);
          } catch (err) {
            showToast('复制失败，请手动选择复制');
          }
        });
        messageDiv.appendChild(copyButton);
      }

      if (!onlyUI) {
        const currentSession = chatSessions.find(s => s.currentSession === true) || chatSessions[0];
        if (currentSession) {
          currentSession.messages.push({ role: 'assistant', content: message });
          saveSessionsToStorage();
        }
      }
    } else {
      messageDiv.textContent = message;
      if (!onlyUI) {
        const currentSession = chatSessions.find(s => s.currentSession === true) || chatSessions[0];
        if (currentSession) {
          currentSession.messages.push({ role: 'user', content: message });
          currentSession.hasUserMessage = true;
          if (currentSession.isTemporary) delete currentSession.isTemporary;
          saveSessionsToStorage();
        }
      }
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addImageMessage(image) {
    if (!chatMessages) return;
    removeWelcomeScreen();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';

    const caption = document.createElement('div');
    caption.textContent = `${image.fileName} (${formatFileSize(image.fileSize)})`;

    const img = document.createElement('img');
    img.className = 'message-image';
    img.src = image.dataUrl;
    img.alt = image.fileName;

    messageDiv.appendChild(caption);
    messageDiv.appendChild(img);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addThinkingMessage() {
    removeWelcomeScreen();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message thinking-message';
    messageDiv.innerHTML = `
      <span class="material-icons" style="font-size:16px; color:var(--brand);">auto_awesome</span>
      <span class="thinking-text">正在思考与生成</span>
      <div class="thinking-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function ensureReasoningMessage() {
    if (reasoningMessageDiv) return reasoningMessageDiv;
    reasoningBuffer = '';
    reasoningMessageDiv = document.createElement('div');
    reasoningMessageDiv.className = 'message deepseek-reasoning-message';
    reasoningMessageDiv.innerHTML = `
      <div class="deepseek-reasoning-header">
        <span class="deepseek-reasoning-title">
          <span class="material-icons" style="font-size:14px; vertical-align:text-bottom; margin-right:3px; color:var(--brand);">psychology</span>
          <span class="title-text">思考过程 (Reasoning)</span>
        </span>
        <button type="button" class="deepseek-reasoning-toggle" title="收起/展开">
          <span class="material-icons">expand_less</span>
        </button>
      </div>
      <div class="deepseek-reasoning-body">正在深度推理...</div>
    `;

    chatMessages.appendChild(reasoningMessageDiv);
    return reasoningMessageDiv;
  }

  // 全局事件代理：点击任何思考过程标题栏均能百分百响应折叠/展开
  if (chatMessages) {
    chatMessages.addEventListener('click', (e) => {
      const header = e.target.closest('.deepseek-reasoning-header');
      if (header) {
        const card = header.closest('.deepseek-reasoning-message');
        if (card) {
          const isCollapsed = card.classList.toggle('collapsed');
          const icon = card.querySelector('.deepseek-reasoning-toggle .material-icons');
          if (icon) icon.textContent = isCollapsed ? 'expand_more' : 'expand_less';
        }
      }
    });
  }

  function scheduleReasoningRender() {
    if (reasoningRenderScheduled) return;
    reasoningRenderScheduled = true;
    requestAnimationFrame(() => {
      reasoningRenderScheduled = false;
      if (!reasoningMessageDiv) return;
      const body = reasoningMessageDiv.querySelector('.deepseek-reasoning-body');
      if (body) {
        // 卡片自身是 max-height:200px 的滚动容器，只滚外层不够：
        // 外层早已到底，内层却停在顶部，新推理文字堆在看不见的地方。
        // 贴底判断要在写入前测量，且用户手动上翻时不强行拽回
        const stickToBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 40;
        body.textContent = reasoningBuffer || '正在思考...';
        if (stickToBottom) body.scrollTop = body.scrollHeight;
      }
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  function scheduleStreamingRender() {
    if (streamingRenderScheduled) return;
    streamingRenderScheduled = true;
    requestAnimationFrame(() => {
      streamingRenderScheduled = false;
      if (!streamingMessageDiv) return;
      const contentDiv = streamingMessageDiv.querySelector('.markdown-body');
      if (contentDiv) {
        if (typeof window.parseMarkdown === 'function') {
          contentDiv.innerHTML = window.parseMarkdown(streamingBuffer);
        } else if (typeof marked !== 'undefined') {
          contentDiv.innerHTML = marked(streamingBuffer);
        } else {
          contentDiv.textContent = streamingBuffer;
        }
      }
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  // ==========================================================================
  // 11. 输入区高度自适应与发送处理
  // ==========================================================================
  const INITIAL_INPUT_HEIGHT = 34;
  function autoResizeMessageInput() {
    if (!messageInput) return;
    messageInput.style.height = 'auto';
    if (!messageInput.value) {
      messageInput.style.height = `${INITIAL_INPUT_HEIGHT}px`;
      messageInput.style.overflowY = 'hidden';
      return;
    }
    const h = messageInput.scrollHeight;
    messageInput.style.height = `${Math.min(Math.max(h, INITIAL_INPUT_HEIGHT), 130)}px`;
    messageInput.style.overflowY = h > 130 ? 'auto' : 'hidden';
  }

  if (messageInput) {
    messageInput.addEventListener('input', autoResizeMessageInput);
    messageInput.addEventListener('keydown', (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  function toggleSendStopButton(isStop) {
    if (!sendMessageBtn) return;
    if (isStop) {
      sendMessageBtn.classList.add('stop-mode');
      sendMessageBtn.title = '停止生成';
      sendMessageBtn.innerHTML = '<span class="material-icons">stop</span>';
    } else {
      sendMessageBtn.classList.remove('stop-mode');
      sendMessageBtn.title = '发送 (Enter)';
      sendMessageBtn.innerHTML = '<span class="material-icons">arrow_upward</span>';
    }
  }

  function handleStopStreaming() {
    if (isStreaming) {
      shouldStopStreaming = true;
      chrome.runtime.sendMessage({ action: 'stopStreaming' });
      isStreaming = false;
      toggleSendStopButton(false);
      const thinkingMessage = document.querySelector('.thinking-message');
      if (thinkingMessage) thinkingMessage.remove();
    }
  }

  function handleSendMessage() {
    let rawMessage = messageInput.value.trim();
    if (isStreaming) return;

    const hasImages = uploadedAttachments.some(a => a.kind === 'image');
    const hasFiles = uploadedAttachments.length > 0;

    // 如果未输入文字，但存在附件或提取的网页内容，提供智能默认提示词
    if (!rawMessage) {
      if (hasImages) {
        const imgCount = uploadedAttachments.filter(a => a.kind === 'image').length;
        rawMessage = imgCount > 1
          ? `请综合分析这 ${imgCount} 张图片，提炼小红书多图/九宫格视觉亮点与创作建议。`
          : '请分析这张图片，提炼视觉亮点，并给出适合的小红书爆款选题与文案创作建议。';
      } else if (hasFiles) {
        rawMessage = '请分析上传的文件内容并提炼核心要点。';
      } else if (pageContentLoaded && currentPageContent) {
        rawMessage = '请分析当前网页内容并总结要点。';
      } else {
        return; // 既无文字又无附件时才忽略
      }
    }

    chrome.storage.local.get(['activeInstructionId', 'customInstructions'], (data) => {
      let customInstructionPrompt = '';
      if (data.activeInstructionId && Array.isArray(data.customInstructions)) {
        const activeInstr = data.customInstructions.find(i => i.id === data.activeInstructionId);
        if (activeInstr && activeInstr.prompt) customInstructionPrompt = activeInstr.prompt.trim();
      }

      sendToAI(rawMessage, rawMessage, customInstructionPrompt);
      messageInput.value = '';
      autoResizeMessageInput();
    });
  }

  if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', () => {
      if (isStreaming) {
        handleStopStreaming();
      } else {
        handleSendMessage();
      }
    });
  }

  // 把采集到的笔记整理成可直接投喂给模型的文本块。
  // 逐篇截断正文并限制总长度，避免上百篇全文一次性顶爆模型上下文
  function buildCollectionContextText(data, fallbackText) {
    const list = Array.isArray(data) ? data : [];

    if (list.length === 0) {
      const fallback = (fallbackText || '').trim();
      if (!fallback) return null;
      const clipped = fallback.length > COLLECTION_CTX_MAX_CHARS
        ? fallback.slice(0, COLLECTION_CTX_MAX_CHARS) + '\n…（内容过长已截断）'
        : fallback;
      return `===== 本次采集的小红书笔记数据 =====\n${clipped}\n===== 笔记数据结束 =====`;
    }

    const blocks = [];
    let totalChars = 0;

    for (let i = 0; i < list.length; i++) {
      const item = list[i] || {};
      let body = (item.content || '').trim();
      if (!body) {
        body = '（未抓到正文）';
      } else if (body.length > COLLECTION_NOTE_MAX_CHARS) {
        body = body.slice(0, COLLECTION_NOTE_MAX_CHARS) + '…（正文已截断）';
      }

      const block =
        `${i + 1}. 标题：${item.title || '无标题'}\n` +
        `   作者：${item.author || '未知'}\n` +
        `   点赞：${item.likes || 0} | 收藏：${item.collects || 0} | 评论：${item.comments || 0}\n` +
        `   发布时间：${item.editDate || '未知'}\n` +
        `   链接：${item.link || '无'}\n` +
        `   正文：${body}`;

      if (totalChars + block.length > COLLECTION_CTX_MAX_CHARS && blocks.length > 0) break;
      blocks.push(block);
      totalChars += block.length;
    }

    const header = blocks.length < list.length
      ? `===== 本次采集的小红书笔记数据（共 ${list.length} 篇，因长度限制仅提供前 ${blocks.length} 篇）=====`
      : `===== 本次采集的小红书笔记数据（共 ${list.length} 篇）=====`;

    return `${header}\n${blocks.join('\n\n----------------------------------------\n\n')}\n===== 笔记数据结束 =====`;
  }

  // 单独存一份，popup 关掉再打开时追问仍能带上原始笔记（不塞进 chatSessions，避免撑爆会话存储）
  function persistCollectionContext() {
    if (collectionContext) {
      chrome.storage.local.set({ collectionContext: collectionContext }, () => {
        if (chrome.runtime.lastError) {
          console.warn('采集上下文持久化失败:', chrome.runtime.lastError.message);
        }
      });
    } else {
      chrome.storage.local.remove('collectionContext');
    }
  }

  // 采集上下文只对它所属的那个分析会话生效，切到别的会话不会被误带上
  function getActiveCollectionContext(session) {
    if (!collectionContext || !session) return '';
    return collectionContext.sessionId === session.id ? collectionContext.text : '';
  }

  // 发送消息至 AI
  function sendToAI(message, displayMessage = null, customInstructionPrompt = '') {
    const uiMessage = displayMessage !== null ? displayMessage : message;
    const currentAttachments = [...uploadedAttachments]; // 保存本次请求的所有附件快照
    const imageAttachments = currentAttachments.filter(a => a.kind === 'image');
    const textAttachments = currentAttachments.filter(a => a.kind !== 'image');
    const hasCurrentPage = pageContentLoaded && !!currentPageContent;
    const activeSession = chatSessions.find(s => s.currentSession === true) || chatSessions[0];
    const collectionCtxText = getActiveCollectionContext(activeSession);

    // 清理输入框挂载的附件状态，并把附件气泡渲染到主聊天区
    if (currentAttachments.length > 0) {
      for (const img of imageAttachments) {
        addImageMessage(img);
      }
      for (const txt of textAttachments) {
        addMessage(`已上传文件：${txt.fileName} (${formatFileSize(txt.fileSize)})`, true, true);
      }
      if (imageAttachments.length > 0) {
        ensureVisionCapableModel();
      }
      clearUploadedFiles();
    }

    addMessage(uiMessage, true, true);

    let activeModel = modelSwitcher ? modelSwitcher.value : 'gemini-3.7-flash';
    if (imageAttachments.length > 0 && !activeModel.startsWith('gemini')) {
      activeModel = 'gemini-3.7-flash';
      if (modelSwitcher) modelSwitcher.value = activeModel;
      syncModelMenuState();
    }
    const isDataAnalysis = textAttachments.some(t => t.isData) || !!collectionCtxText;

    try {
      isStreaming = true;
      hasAutoCollapsedReasoning = false;
      toggleSendStopButton(true);

      let currentSession = chatSessions.find(s => s.currentSession === true) || chatSessions[0];
      const attachments = imageAttachments.map(att => ({
        mimeType: att.mimeType,
        data: att.base64
      }));

      currentSession.messages.push({
        role: 'user',
        content: uiMessage,
        attachments: attachments
      });
      currentSession.hasUserMessage = true;
      if (isUnnamedSession(currentSession)) {
        currentSession.title = makeSessionTitle(uiMessage);
        currentSession.titlePending = false;
        updateHeaderSessionTitle(currentSession.title);
      }
      saveSessionsToStorage();

      addThinkingMessage();

      let content = '';
      if (textAttachments.length > 0) {
        const combinedText = textAttachments.map(t => `===== 文件 [${t.fileName}] 开始 =====\n${t.content}\n===== 文件结束 =====`).join('\n\n');
        content = `${combinedText}\n\n用户问题：${message}`;
      } else if (hasCurrentPage) {
        content = `===== 网页内容开始 =====\n标题：${currentPageContent.title}\n内容：\n${currentPageContent.content}\n===== 网页内容结束 =====\n\n用户问题：${message}`;
      } else {
        content = message;
      }

      // 采集数据放在最前面，保证模型每一轮都能看到原始笔记
      if (collectionCtxText) {
        content = `${collectionCtxText}\n\n${content}`;
      }

      const allMessages = currentSession.messages || [];
      const filteredHistory = allMessages.slice(0, -1).filter(m => m.role && (m.content || (m.attachments && m.attachments.length > 0)) && !m.content?.startsWith('正在'));

      // chrome.runtime.sendMessage 对大消息有隐性限制，
      // 大型 base64 图片通过 chrome.storage.local 中转更可靠
      if (attachments.length > 0) {
        const sendWithAttachments = (payloadAttachments) => {
          chrome.runtime.sendMessage({
            action: 'analyzeContent',
            content: content,
            isChat: true,
            isDataAnalysis: isDataAnalysis,
            chatHistory: filteredHistory,
            hasFile: currentAttachments.length > 0 || hasCurrentPage || !!collectionCtxText,
            attachments: payloadAttachments,
            model: activeModel,
            ...getThinkingOptions(activeModel),
            customInstructionPrompt: customInstructionPrompt
          }).catch(err => {
            console.error('发送带图消息失败:', err);
            showToast('发送失败，请重试');
          });
        };

        chrome.storage.local.set({ _pendingImageAttachments: attachments }, () => {
          // storage 写入失败（多为配额超限）时必须降级直传，
          // 否则 background 读到空数组，图片会被静默丢掉而 AI 照常作答
          if (chrome.runtime.lastError) {
            console.error('📸 图片暂存 storage 失败，降级为直接传递:', chrome.runtime.lastError.message);
            showToast('图片暂存失败，已改为直接发送');
            sendWithAttachments(attachments);
            return;
          }
          console.log(`📸 ${attachments.length} 张图片已暂存至 storage，大小约:`, Math.round(JSON.stringify(attachments).length / 1024), 'KB');
          sendWithAttachments([{ _fromStorage: true }]);
        });
      } else {
        chrome.runtime.sendMessage({
          action: 'analyzeContent',
          content: content,
          isChat: true,
          isDataAnalysis: isDataAnalysis,
          chatHistory: filteredHistory,
          hasFile: currentAttachments.length > 0 || hasCurrentPage || !!collectionCtxText,
          attachments: [],
          model: activeModel,
          ...getThinkingOptions(activeModel),
          customInstructionPrompt: customInstructionPrompt
        });
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      const thinking = document.querySelector('.thinking-message');
      if (thinking) thinking.remove();
      addMessage(`错误：${error.message || '发送失败，请重试'}`, false, true);
      isStreaming = false;
      toggleSendStopButton(false);
    }
  }

  // ==========================================================================
  // 12. 多图与多文件上传展示处理 (Multi-Attachment Engine)
  // ==========================================================================
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function renderAttachmentShelf() {
    const shelf = document.getElementById('fileInfo');
    const list = document.getElementById('attachmentList');
    if (!shelf || !list) return;

    if (uploadedAttachments.length === 0) {
      shelf.style.display = 'none';
      list.innerHTML = '';
      return;
    }

    shelf.style.display = 'flex';
    list.innerHTML = '';

    uploadedAttachments.forEach((att, idx) => {
      const item = document.createElement('div');
      item.className = 'attachment-item';

      if (att.kind === 'image') {
        item.innerHTML = `
          <img class="file-thumb" src="${att.dataUrl}" alt="${att.fileName}" title="${att.fileName} (${formatFileSize(att.fileSize)})">
          <button type="button" class="attachment-remove-btn" data-index="${idx}" title="移除">
            <span class="material-icons">close</span>
          </button>
        `;
      } else {
        item.innerHTML = `
          <div class="attachment-text-chip" title="${att.fileName} (${formatFileSize(att.fileSize)})">
            <span class="material-icons" style="font-size:14px;">description</span>
            <span>${att.fileName}</span>
          </div>
          <button type="button" class="attachment-remove-btn" data-index="${idx}" title="移除">
            <span class="material-icons">close</span>
          </button>
        `;
      }

      list.appendChild(item);
    });
  }

  // 监听附件列表中移除按钮的点击
  const attachmentListEl = document.getElementById('attachmentList');
  if (attachmentListEl) {
    attachmentListEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.attachment-remove-btn');
      if (!btn) return;
      const idx = parseInt(btn.dataset.index, 10);
      if (!isNaN(idx) && idx >= 0 && idx < uploadedAttachments.length) {
        uploadedAttachments.splice(idx, 1);
        renderAttachmentShelf();
        if (fileInput) fileInput.value = '';
      }
    });
  }

  function clearUploadedFiles() {
    uploadedAttachments = [];
    renderAttachmentShelf();
    if (fileInput) fileInput.value = '';
  }

  function ensureVisionCapableModel() {
    const cur = modelSwitcher ? modelSwitcher.value : '';
    if (cur.startsWith('gemini')) return;
    if (modelSwitcher) {
      modelSwitcher.value = VISION_FALLBACK_MODEL;
      chrome.storage.local.set({ selectedModel: VISION_FALLBACK_MODEL });
    }
    syncModelMenuState();
    showToast('已自动切换到支持看图的 Gemini 模型');
  }

  async function processUploadedFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    let hasNewImage = false;
    let addedCount = 0;
    let savedBytes = 0;

    for (const file of files) {
      if (uploadedAttachments.length >= 9) {
        showToast('最多同时添加 9 张图片或文件');
        break;
      }
      const isImg = file.type.startsWith('image/') || SUPPORTED_IMAGE_TYPES.includes(file.type);
      if (isImg) {
        if (file.size > MAX_IMAGE_SIZE) {
          showToast(`图片 ${file.name} 超过 20MB，已跳过`);
          continue;
        }
        try {
          const img = await compressImageFile(file);
          if (img.fileSize < img.originalSize) {
            savedBytes += img.originalSize - img.fileSize;
          }

          uploadedAttachments.push({
            fileName: file.name || `图片_${uploadedAttachments.length + 1}.png`,
            fileSize: img.fileSize,
            mimeType: img.mimeType,
            dataUrl: img.dataUrl,
            base64: img.base64,
            kind: 'image'
          });
          hasNewImage = true;
          addedCount++;
        } catch (err) {
          console.error('读取图片失败:', err);
        }
      } else {
        if (file.size > MAX_TEXT_FILE_SIZE) {
          showToast(`文件 ${file.name} 超过 10MB，已跳过`);
          continue;
        }
        try {
          const text = await readFileContent(file);
          uploadedAttachments.push({
            fileName: file.name || `文本_${uploadedAttachments.length + 1}.txt`,
            fileSize: file.size,
            content: text,
            kind: 'text'
          });
          addedCount++;
        } catch (err) {
          console.error('读取文件失败:', err);
        }
      }
    }

    renderAttachmentShelf();
    if (hasNewImage) {
      ensureVisionCapableModel();
      const imgCount = uploadedAttachments.filter(a => a.kind === 'image').length;
      showToast(savedBytes > 100 * 1024
        ? `已就绪 ${imgCount} 张图片，压缩省下 ${formatFileSize(savedBytes)}`
        : `已就绪 ${imgCount} 张图片`);
    } else if (addedCount > 0) {
      showToast('文件已加载');
    }
    if (fileInput) fileInput.value = '';
  }

  if (fileInput) {
    fileInput.addEventListener('change', async (event) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        await processUploadedFiles(files);
      }
    });
  }

  // 支持输入框直接 Ctrl+V 连续粘贴截图 / 多图
  if (messageInput) {
    messageInput.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const filesToProcess = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) filesToProcess.push(file);
        }
      }
      if (filesToProcess.length > 0) {
        await processUploadedFiles(filesToProcess);
      }
    });
  }

  // 支持拖拽多张图片到输入区域
  const omnibarCard = document.querySelector('.omnibar-card');
  if (omnibarCard) {
    omnibarCard.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      omnibarCard.style.borderColor = 'var(--apple-blue)';
    });
    omnibarCard.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      omnibarCard.style.borderColor = '';
    });
    omnibarCard.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      omnibarCard.style.borderColor = '';
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        await processUploadedFiles(files);
      }
    });
  }

  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  // 上传前把图缩到 Gemini 实际需要的尺寸，5MB 的截图通常能降到几百 KB，
  // 既省传输，也让 storage 中转不至于被单张图顶满
  async function compressImageFile(file) {
    const originalSize = file.size;

    const asOriginal = async () => {
      const dataUrl = await readFileAsDataURL(file);
      let mimeType = file.type || 'image/png';
      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
      return { dataUrl, base64: dataUrl.split(',')[1], mimeType, fileSize: originalSize, originalSize };
    };

    // GIF 重编码只会剩第一帧，原样保留
    if (file.type === 'image/gif') return asOriginal();

    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (err) {
      console.warn('图片解码失败，按原图上传:', err);
      return asOriginal();
    }

    const longEdge = Math.max(bitmap.width, bitmap.height);
    if (longEdge <= IMAGE_MAX_EDGE && originalSize <= IMAGE_SKIP_COMPRESS_SIZE) {
      bitmap.close();
      return asOriginal();
    }

    const scale = Math.min(1, IMAGE_MAX_EDGE / longEdge);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // PNG 保持 PNG，避免透明区域被压成黑块；PNG 压完仍过大时才退回 JPEG
    let mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    let dataUrl = mimeType === 'image/png'
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', IMAGE_JPEG_QUALITY);

    if (mimeType === 'image/png' && dataUrl.length * 0.75 > IMAGE_PNG_FALLBACK_SIZE) {
      // 转 JPEG 前先给透明区域垫一层白底，否则会变黑
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      mimeType = 'image/jpeg';
      dataUrl = canvas.toDataURL('image/jpeg', IMAGE_JPEG_QUALITY);
    }

    const base64 = dataUrl.split(',')[1];
    return { dataUrl, base64, mimeType, fileSize: Math.round(base64.length * 0.75), originalSize };
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  // ==========================================================================
  // 13. 网页内容提取
  // ==========================================================================
  function clearPageContent() {
    pageContentLoaded = false;
    currentPageContent = null;
  }

  if (getPageContentBtn) {
    getPageContentBtn.addEventListener('click', async () => {
      closeAllPopovers();
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
          showToast('无法获取当前标签页');
          return;
        }

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const title = document.title;
            let content = '';
            const contentSelectors = [
              'article', '.content', '.post-content', '.entry-content',
              '.note-content', '[data-testid="note-content"]', 'main',
              '.main-content', '#content', '.article-content', '.post-body', '.text-content'
            ];

            for (const selector of contentSelectors) {
              const element = document.querySelector(selector);
              if (element && element.innerText.trim()) {
                content = element.innerText.trim();
                break;
              }
            }

            if (!content) {
              const clone = document.body.cloneNode(true);
              clone.querySelectorAll('script, style, nav, header, footer, .nav, .sidebar').forEach(el => el.remove());
              content = clone.innerText.trim();
            }

            return {
              title: title,
              content: content.substring(0, 3500),
              hostname: window.location.hostname,
              url: window.location.href
            };
          }
        });

        if (results && results[0] && results[0].result) {
          const pageData = results[0].result;
          currentPageContent = pageData;
          pageContentLoaded = true;

          const card = createPageContentCard(pageData);
          chatMessages.appendChild(card);
          chatMessages.scrollTop = chatMessages.scrollHeight;
          showToast(`已加载 ${pageData.hostname} 网页内容`);
        } else {
          showToast('读取网页失败');
        }
      } catch (err) {
        console.error('获取页面内容失败:', err);
        showToast('读取页面失败，请刷新页面重试');
      }
    });
  }

  function createPageContentCard(pageData) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'page-content-preview';
    cardDiv.innerHTML = `
      <div class="page-preview-header">
        <span class="material-icons">description</span>
        <span>页面内容已提取</span>
      </div>
      <div class="page-preview-body">
        <div class="page-title">
          <a href="${pageData.url}" target="_blank" class="page-title-link">${pageData.title}</a>
        </div>
        <div class="page-source">来源：${pageData.hostname || '当前网页'}</div>
      </div>
      <div class="page-actions">
        <button type="button" class="summarize-btn">一键总结</button>
        <button type="button" class="note-btn">写成小红书笔记</button>
        <button type="button" class="hot-title-btn">生成5个爆款标题</button>
      </div>
    `;

    cardDiv.querySelector('.summarize-btn').addEventListener('click', () => {
      if (isStreaming) return;
      addMessage('正在提炼网页要点...', false);
      sendToAI(`请对以下内容进行结构化总结，提炼核心痛点与要点：\n\n标题：${pageData.title}\n\n${pageData.content}`, '一键总结当前网页');
    });

    cardDiv.querySelector('.note-btn').addEventListener('click', () => {
      if (isStreaming) return;
      addMessage('正在改写为小红书笔记...', false);
      sendToAI(`请将以下内容改写成一篇结构完整的小红书文案（800字以内），语言通俗活泼，分段清晰，带emoji与相关标签：\n\n标题：${pageData.title}\n\n${pageData.content}`, '将当前网页改写为小红书笔记');
    });

    cardDiv.querySelector('.hot-title-btn').addEventListener('click', () => {
      if (isStreaming) return;
      addMessage('正在生成爆款标题...', false);
      sendToAI(`请根据以下内容，直接提供5个高点击率的小红书爆款标题：\n\n标题：${pageData.title}\n\n${pageData.content}`, '生成5个爆款标题');
    });

    return cardDiv;
  }

  // ==========================================================================
  // 14. 历史记录管理 (History Modal)
  // ==========================================================================
  function openHistoryModal() {
    closeAllPopovers();
    if (historyModal && historyList) {
      historyList.innerHTML = '';
      chrome.storage.local.get(['chatSessions'], (result) => {
        const sessions = (result.chatSessions || []).filter(s => s.messages && s.messages.length > 0);
        if (sessions.length === 0) {
          historyList.innerHTML = '<div class="no-history">暂无历史对话记录</div>';
        } else {
          sessions.forEach(session => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
              <div class="history-content">
                <div class="history-title">${session.title || '未命名对话'}</div>
                <div class="history-date">${session.created || ''}</div>
              </div>
              <div class="history-actions">
                <button type="button" class="history-action-btn rename-btn" title="重命名">
                  <span class="material-icons">edit</span>
                </button>
                <button type="button" class="delete-btn" title="删除对话">
                  <span class="material-icons">delete</span>
                </button>
              </div>
            `;

            item.querySelector('.history-content').addEventListener('click', () => {
              loadChatSession(session);
              historyModal.classList.add('hidden');
            });

            item.querySelector('.rename-btn').addEventListener('click', (e) => {
              e.stopPropagation();
              const next = prompt('请输入新标题', session.title || '');
              if (next && next.trim()) {
                session.title = next.trim();
                session.titlePending = false;  // 手动改过名就不再被首条消息覆盖
                saveSessionsToStorage();
                openHistoryModal();
                updateHeaderSessionTitle(session.title);
              }
            });

            item.querySelector('.delete-btn').addEventListener('click', (e) => {
              e.stopPropagation();
              if (confirm('确定要删除这条对话记录吗？')) {
                chatSessions = chatSessions.filter(s => s.id !== session.id);
                saveSessionsToStorage();
                openHistoryModal();
                showToast('已删除记录');
              }
            });

            historyList.appendChild(item);
          });
        }
      });
      historyModal.classList.remove('hidden');
    }
  }

  function loadChatSession(session) {
    chatMessages.innerHTML = '';
    chatSessions.forEach(s => { s.currentSession = (s.id === session.id); });
    updateHeaderSessionTitle(session.title);

    if (session.messages && session.messages.length > 0) {
      session.messages.forEach(msg => {
        if (msg.role === 'user') {
          addMessage(msg.content, true, true);
        } else if (msg.role === 'assistant') {
          addMessage(msg.content, false, true);
        }
      });
      appendFollowUpPills(chatMessages);
    } else {
      renderWelcomeScreen();
    }
  }

  if (historyBtn) historyBtn.addEventListener('click', openHistoryModal);
  if (closeHistoryModal) closeHistoryModal.addEventListener('click', () => historyModal.classList.add('hidden'));
  if (historyModal) {
    historyModal.addEventListener('click', (e) => {
      if (e.target === historyModal) historyModal.classList.add('hidden');
    });
  }

  // ==========================================================================
  // 15. 自定义指令 (Custom Instructions)
  // ==========================================================================
  const instructionsModalOverlay = document.getElementById('instructions-modal-overlay');
  const showHideInstructionsBtn = document.getElementById('show-hide-instructions-btn');
  const closeInstructionsBtn = document.getElementById('close-instructions-btn');
  const addNewInstructionBtn = document.getElementById('add-new-instruction-btn');
  const addInstructionForm = document.getElementById('add-instruction-form');
  const saveInstructionBtn = document.getElementById('save-instruction-btn');
  const cancelAddInstructionBtn = document.getElementById('cancel-add-btn');
  const instructionsList = document.getElementById('instructions-list');
  const instructionNameInput = document.getElementById('instruction-name');
  const instructionPromptInput = document.getElementById('instruction-prompt');
  const instructionEditIdInput = document.getElementById('instruction-edit-id');

  function openInstructionsModal() {
    closeAllPopovers();
    if (instructionsModalOverlay) {
      instructionsModalOverlay.classList.remove('hidden');
      renderInstructions();
    }
  }

  function closeInstructionsModal() {
    if (instructionsModalOverlay) {
      instructionsModalOverlay.classList.add('hidden');
      if (addInstructionForm) addInstructionForm.classList.add('hidden');
      if (addNewInstructionBtn) addNewInstructionBtn.classList.remove('hidden');
    }
  }

  if (showHideInstructionsBtn) showHideInstructionsBtn.addEventListener('click', openInstructionsModal);
  if (closeInstructionsBtn) closeInstructionsBtn.addEventListener('click', closeInstructionsModal);
  if (instructionsModalOverlay) {
    instructionsModalOverlay.addEventListener('click', (e) => {
      if (e.target === instructionsModalOverlay) closeInstructionsModal();
    });
  }

  if (addNewInstructionBtn) {
    addNewInstructionBtn.addEventListener('click', () => {
      addInstructionForm.classList.remove('hidden');
      addNewInstructionBtn.classList.add('hidden');
      instructionNameInput.value = '';
      instructionPromptInput.value = '';
      instructionEditIdInput.value = '';
    });
  }

  if (cancelAddInstructionBtn) {
    cancelAddInstructionBtn.addEventListener('click', () => {
      addInstructionForm.classList.add('hidden');
      addNewInstructionBtn.classList.remove('hidden');
    });
  }

  if (saveInstructionBtn) {
    saveInstructionBtn.addEventListener('click', () => {
      const name = instructionNameInput.value.trim();
      const prompt = instructionPromptInput.value.trim();
      const editId = instructionEditIdInput.value;

      if (!name) { showToast('请输入指令名称'); return; }
      if (!prompt) { showToast('请输入指令内容'); return; }

      chrome.storage.local.get({ customInstructions: [] }, (data) => {
        let list = data.customInstructions || [];
        if (editId) {
          const item = list.find(i => i.id === editId);
          if (item) { item.name = name; item.prompt = prompt; }
        } else {
          list.push({ id: 'instr_' + Date.now(), name, prompt });
        }
        chrome.storage.local.set({ customInstructions: list }, () => {
          renderInstructions();
          addInstructionForm.classList.add('hidden');
          addNewInstructionBtn.classList.remove('hidden');
          showToast('指令已保存');
        });
      });
    });
  }

  function renderInstructions() {
    if (!instructionsList) return;
    chrome.storage.local.get({ customInstructions: [], activeInstructionId: null }, (data) => {
      const { customInstructions, activeInstructionId } = data;
      instructionsList.innerHTML = '';

      // 无指令选项
      const noneDiv = document.createElement('div');
      noneDiv.className = 'instruction-item';
      noneDiv.innerHTML = `
        <input type="radio" id="instr-none" name="active-instr" value="none" ${!activeInstructionId ? 'checked' : ''}>
        <label for="instr-none">默认人设（无特殊设定）</label>
      `;
      noneDiv.querySelector('input').addEventListener('change', () => {
        chrome.storage.local.set({ activeInstructionId: null }, () => {
          showToast('已切回默认人设');
          closeInstructionsModal();
        });
      });
      instructionsList.appendChild(noneDiv);

      customInstructions.forEach(instr => {
        const item = document.createElement('div');
        item.className = 'instruction-item';
        item.innerHTML = `
          <input type="radio" id="${instr.id}" name="active-instr" value="${instr.id}" ${instr.id === activeInstructionId ? 'checked' : ''}>
          <label for="${instr.id}">${instr.name}</label>
          <div class="instruction-buttons">
            <button type="button" class="edit-btn" title="编辑">✏️</button>
            <button type="button" class="delete-btn" title="删除">
              <span class="material-icons">delete</span>
            </button>
          </div>
        `;

        item.querySelector('input').addEventListener('change', () => {
          chrome.storage.local.set({ activeInstructionId: instr.id }, () => {
            showToast(`已激活: ${instr.name}`);
            closeInstructionsModal();
          });
        });

        item.querySelector('.edit-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          addInstructionForm.classList.remove('hidden');
          addNewInstructionBtn.classList.add('hidden');
          instructionNameInput.value = instr.name;
          instructionPromptInput.value = instr.prompt;
          instructionEditIdInput.value = instr.id;
        });

        item.querySelector('.delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`确定删除指令 "${instr.name}" 吗？`)) {
            const updated = customInstructions.filter(i => i.id !== instr.id);
            const newActive = activeInstructionId === instr.id ? null : activeInstructionId;
            chrome.storage.local.set({ customInstructions: updated, activeInstructionId: newActive }, () => {
              renderInstructions();
            });
          }
        });

        instructionsList.appendChild(item);
      });
    });
  }

  // ==========================================================================
  // 16. Background 消息监听 (Streaming & Collection)
  // ==========================================================================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'apiKeyRequired') {
      addMessage(message.message || '请先在设置中配置您的 API 密钥。', false, true);
      openSettingsModal();
      return true;
    } else if (message.type === 'deepseekThinkingStarted') {
      isStreaming = true;
      toggleSendStopButton(true);
      const thinking = document.querySelector('.thinking-message');
      if (thinking) thinking.remove();
      ensureReasoningMessage();
      scheduleReasoningRender();
      return false;
    } else if (message.type === 'streamReasoningResponse') {
      isStreaming = true;
      toggleSendStopButton(true);
      const thinking = document.querySelector('.thinking-message');
      if (thinking) thinking.remove();
      ensureReasoningMessage();
      reasoningBuffer += message.content || '';
      scheduleReasoningRender();
      return false;
    } else if (message.type === 'streamResponse' || message.type === 'streamSummaryResponse') {
      isStreaming = true;
      toggleSendStopButton(true);
      const thinking = document.querySelector('.thinking-message');
      if (thinking) thinking.remove();

      // 思考内容输出完成，进入正式回复时，自动将思考内容折叠收起（仅在首个回复数据包到达时触发一次）
      if (!hasAutoCollapsedReasoning) {
        hasAutoCollapsedReasoning = true;
        if (reasoningMessageDiv && !reasoningMessageDiv.classList.contains('collapsed')) {
          reasoningMessageDiv.classList.add('collapsed');
          const icon = reasoningMessageDiv.querySelector('.deepseek-reasoning-toggle .material-icons');
          if (icon) icon.textContent = 'expand_more';
        }
      }

      if (!streamingMessageDiv) {
        streamingBuffer = '';
        streamingMessageDiv = document.createElement('div');
        streamingMessageDiv.className = 'message ai-message streaming';
        streamingMessageDiv.innerHTML = `
          <div class="ai-message-header">
            <span class="material-icons">auto_awesome</span>
            <span>AI 助手</span>
          </div>
          <div class="markdown-body"></div>
        `;
        chatMessages.appendChild(streamingMessageDiv);
      }
      streamingBuffer += message.content || '';
      scheduleStreamingRender();
      return false;
    } else if (message.type === 'analysisComplete') {
      isStreaming = false;
      shouldStopStreaming = false;

      if (streamingMessageDiv && streamingBuffer.trim()) {
        streamingMessageDiv.classList.remove('streaming');
        const contentDiv = streamingMessageDiv.querySelector('.markdown-body');
        const textToSave = streamingBuffer;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-button';
        copyBtn.innerHTML = '<span class="material-icons">content_copy</span>复制';
        copyBtn.addEventListener('click', async () => {
          await navigator.clipboard.writeText(contentDiv ? contentDiv.innerText : textToSave);
          copyBtn.innerHTML = '<span class="material-icons">check</span>已复制';
          copyBtn.classList.add('copy-success');
          setTimeout(() => {
            copyBtn.innerHTML = '<span class="material-icons">content_copy</span>复制';
            copyBtn.classList.remove('copy-success');
          }, 1800);
        });
        streamingMessageDiv.appendChild(copyBtn);

        const currentSession = chatSessions.find(s => s.currentSession === true) || chatSessions[0];
        if (currentSession) {
          currentSession.messages.push({ role: 'assistant', content: textToSave });
          saveSessionsToStorage();
        }

        // 自动添加快捷后续动作
        appendFollowUpPills(chatMessages);
      }

      streamingBuffer = '';
      streamingMessageDiv = null;
      reasoningBuffer = '';
      reasoningMessageDiv = null;
      hasAutoCollapsedReasoning = false;
      toggleSendStopButton(false);
      return false;
    } else if (message.type === 'updateStatus') {
      if (capsuleStatusText) capsuleStatusText.textContent = message.text || '采集进行中...';
      return false;
    } else if (message.type === 'collectionComplete') {
      updateCollectButtonState(false);
      if (message.data && message.data.length > 0) {
        showToast(`采集完成，共抓取 ${message.data.length} 篇爆款笔记`, 2500);
        const analysisPrompt = `作为一个资深小红书爆款操盘手，请深度分析上面这 ${message.data.length} 篇爆款笔记：\n1. 爆款规律总结：提炼这些笔记共同打中了什么痛点或情绪？\n2. 标题吸睛公式：拆解高频词与标题句式套路；\n3. 落地建议：基于以上分析，生成 3 个当下可立即执行的全新爆款选题与切入点。`;
        const session = createNewChatSession(`爆款分析 · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);

        // 采集数据必须随请求一起发出去，否则模型只收到一句空指令，会回"没看到笔记内容"
        const ctxText = buildCollectionContextText(message.data, message.formattedContent);
        collectionContext = ctxText ? { sessionId: session.id, text: ctxText, count: message.data.length } : null;
        persistCollectionContext();
        if (!ctxText) {
          console.warn('采集完成但未能构建笔记上下文，AI 将拿不到原始数据');
        }

        sendToAI(analysisPrompt, '⚡ 已自动开始深度分析本次采集的爆款数据');
      } else {
        showToast('笔记采集完成');
      }
      return false;
    } else if (message.type === 'error') {
      updateCollectButtonState(false);
      isStreaming = false;
      toggleSendStopButton(false);
      const thinking = document.querySelector('.thinking-message');
      if (thinking) thinking.remove();
      addMessage(`错误：${message.error || '请求失败，请检查网络或 API Key'}`, false, true);
      return false;
    }
  });

  // ==========================================================================
  // 17. 动态脚本注入工具
  // ==========================================================================
  async function injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['config.js', 'content.js']
      });
    } catch (e) {
      console.warn('Script injection notice:', e);
    }
  }

  // ==========================================================================
  // 18. 初始加载会话
  // ==========================================================================
  chrome.storage.local.get(['chatSessions', 'collectionContext'], (result) => {
    const existing = result.chatSessions || [];
    const restoredCtx = result.collectionContext;
    // 上下文所属会话已被删除时一并丢弃，避免残留数据被塞进不相干的对话
    if (restoredCtx && restoredCtx.sessionId && restoredCtx.text &&
        existing.some(s => s.id === restoredCtx.sessionId)) {
      collectionContext = restoredCtx;
    } else if (restoredCtx) {
      chrome.storage.local.remove('collectionContext');
    }
    const now = new Date();
    const newSession = {
      id: 'session_' + now.getTime(),
      title: '新建对话',
      created: now.toLocaleString(),
      messages: [],
      hasUserMessage: false,
      currentSession: true,
      isTemporary: true,
      titlePending: true
    };

    chatSessions = [newSession, ...existing];

    const fixed = backfillSessionTitles(chatSessions);
    if (fixed > 0) {
      console.log(`📝 已为 ${fixed} 条历史对话回填标题`);
      saveSessionsToStorage();
    }

    updateHeaderSessionTitle(newSession.title);
    renderWelcomeScreen();
    autoResizeMessageInput();
  });
});

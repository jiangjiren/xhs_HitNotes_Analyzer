/**
 * 小红书视频一键下载按钮
 * 在笔记详情页/详情弹窗里检测到视频后，注入一个悬浮按钮，点击即可下载原视频。
 */
(function () {
    // 只在顶层窗口注入，避免 all_frames 模式下 iframe 里重复出现按钮
    if (window.top !== window) return;
    if (window.__xhsVideoDownloaderInited) return;
    window.__xhsVideoDownloaderInited = true;

    const PROBE_REQUEST = 'XHS_HELPER_VIDEO_PROBE_REQUEST';
    const PROBE_RESPONSE = 'XHS_HELPER_VIDEO_PROBE_RESULT';
    const BUTTON_ID = 'xhs-helper-video-download-btn';

    let button = null;
    let statusResetTimer = null;
    let isBusy = false;
    let probeInjected = false;
    const pendingProbes = new Map();

    // ---------- 页面上下文探针 ----------

    function injectProbe() {
        if (probeInjected) return;
        probeInjected = true;
        try {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('xhs_video_probe.js');
            script.onload = () => script.remove();
            script.onerror = () => console.warn('🎬 视频探针加载失败，可能被页面 CSP 拦截');
            (document.head || document.documentElement).appendChild(script);
        } catch (error) {
            console.warn('🎬 注入视频探针失败:', error);
        }
    }

    window.addEventListener('message', function (event) {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.type !== PROBE_RESPONSE) return;

        const resolve = pendingProbes.get(data.requestId);
        if (resolve) {
            pendingProbes.delete(data.requestId);
            resolve(data.error ? null : data.payload);
        }
    });

    function askProbe(noteId) {
        injectProbe();
        return new Promise(resolve => {
            const requestId = 'probe_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            pendingProbes.set(requestId, resolve);
            window.postMessage({ type: PROBE_REQUEST, requestId: requestId, noteId: noteId }, '*');
            setTimeout(() => {
                if (pendingProbes.has(requestId)) {
                    pendingProbes.delete(requestId);
                    resolve(null);
                }
            }, 3000);
        });
    }

    // ---------- 页面信息提取 ----------

    function getCurrentNoteId() {
        const fromPath = location.pathname.match(/\/(?:explore|discovery\/item|search_result)\/([0-9a-zA-Z]{16,32})/);
        if (fromPath) return fromPath[1];

        const container = document.querySelector('#noteContainer, .note-container');
        if (container) {
            const link = container.querySelector('a[href*="/explore/"], a[href*="/discovery/item/"]');
            if (link) {
                const fromLink = link.getAttribute('href').match(/\/(?:explore|discovery\/item)\/([0-9a-zA-Z]{16,32})/);
                if (fromLink) return fromLink[1];
            }
        }
        return '';
    }

    // 当前是否处于"看某条笔记"的状态（详情页或详情弹窗）
    function isNoteView() {
        return !!getCurrentNoteId() || !!document.querySelector('#noteContainer, .note-container');
    }

    function isVisibleVideo(v) {
        return !!v && v.offsetWidth > 100 && v.offsetHeight > 100;
    }

    function getVideoElement() {
        // 笔记容器内优先，但必须挑可见的那个：
        // 小红书会留下尺寸为 0 的预加载 video，选中它会导致按钮永远不显示
        const scoped = Array.from(document.querySelectorAll(
            '#noteContainer video, .note-container video, .note-detail-mask video'
        ));
        const scopedVisible = scoped.find(isVisibleVideo);
        if (scopedVisible) return scopedVisible;

        const all = Array.from(document.querySelectorAll('video'));
        return all.find(isVisibleVideo) || scoped[0] || all[0] || null;
    }

    function getDirectVideoUrl() {
        const video = getVideoElement();
        if (!video) return '';
        const candidates = [video.currentSrc, video.getAttribute('src')];
        const source = video.querySelector('source');
        if (source) candidates.push(source.getAttribute('src'));

        for (const url of candidates) {
            // blob: 地址是 MSE 播放器生成的，无法直接下载，只能靠探针拿真实地址
            if (url && /^https?:\/\//.test(url)) return url;
        }
        return '';
    }

    function getPageTitle() {
        const titleNode = document.querySelector('#detail-title, .note-content .title, #noteContainer .title');
        if (titleNode && titleNode.innerText.trim()) return titleNode.innerText.trim();

        const descNode = document.querySelector('#detail-desc .note-text, #detail-desc, .note-content .desc');
        if (descNode && descNode.innerText.trim()) return descNode.innerText.trim().split('\n')[0];

        return (document.title || '').replace(/\s*-\s*小红书.*$/, '').trim();
    }

    function getAuthorName() {
        const node = document.querySelector('#noteContainer .author-wrapper .username, .author-container .username, .author-wrapper .name');
        return node ? node.innerText.trim() : '';
    }

    function buildFilename(info) {
        const parts = [];
        const author = (info && info.author) || getAuthorName();
        const title = (info && (info.title || info.desc)) || getPageTitle();
        if (author) parts.push(author);
        if (title) parts.push(title.slice(0, 40));
        if (!parts.length) parts.push('小红书视频');

        const noteId = (info && info.noteId) || getCurrentNoteId();
        if (noteId) parts.push(noteId.slice(-6));
        return parts.join('_');
    }

    // ---------- 悬浮按钮 ----------

    const ICON_DOWNLOAD = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    const ICON_DONE = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    const ICON_FAIL = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const ICON_LOADING = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" class="xhs-helper-spin"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>';

    const STYLE_TEXT = [
        '#' + BUTTON_ID + ' {',
        '    position: fixed;',
        // left/top 由 JS 按视频位置计算；拿不到视频位置时用 .corner 退回视口角落
        '    left: 0;',
        '    top: 0;',
        '    z-index: 2147483000;',
        '    display: none;',
        '    align-items: center;',
        '    gap: 7px;',
        '    height: 40px;',
        '    padding: 0 16px;',
        '    border: none;',
        '    border-radius: 20px;',
        // 半透明 + 毛玻璃：压在视频上时不至于挡死画面，悬停再变实色
        '    background: rgba(255, 36, 66, 0.88);',
        '    backdrop-filter: blur(10px) saturate(140%);',
        '    -webkit-backdrop-filter: blur(10px) saturate(140%);',
        '    color: #fff;',
        '    font-size: 14px;',
        '    font-weight: 500;',
        '    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;',
        '    line-height: 1;',
        '    cursor: pointer;',
        '    box-shadow: 0 6px 20px rgba(255, 36, 66, 0.32);',
        '    transition: transform .18s cubic-bezier(.2,.8,.3,1), box-shadow .18s ease, background .18s ease;',
        '}',
        '#' + BUTTON_ID + '.visible { display: inline-flex; }',
        // 定位不到视频时的兜底：回到视口右下角
        '#' + BUTTON_ID + '.corner { left: auto; top: auto; right: 24px; bottom: 96px; }',
        '#' + BUTTON_ID + ':hover { background: #FF2442; transform: translateY(-2px); box-shadow: 0 10px 26px rgba(255, 36, 66, 0.45); }',
        '#' + BUTTON_ID + ':active { transform: translateY(0); }',
        '#' + BUTTON_ID + '.busy { background: rgba(90, 90, 96, 0.88); box-shadow: 0 6px 20px rgba(0,0,0,.24); cursor: default; }',
        '#' + BUTTON_ID + '.busy:hover { background: rgba(90, 90, 96, 0.88); transform: none; }',
        '#' + BUTTON_ID + '.done { background: rgba(52, 199, 89, 0.92); box-shadow: 0 6px 20px rgba(52,199,89,.32); }',
        '#' + BUTTON_ID + '.done:hover { background: rgba(52, 199, 89, 0.92); }',
        '#' + BUTTON_ID + '.fail { background: rgba(255, 149, 0, 0.92); box-shadow: 0 6px 20px rgba(255,149,0,.32); }',
        '#' + BUTTON_ID + '.fail:hover { background: rgba(255, 149, 0, 0.92); }',
        '#' + BUTTON_ID + ' svg { flex: none; }',
        '.xhs-helper-spin { animation: xhs-helper-rotate .9s linear infinite; transform-origin: 50% 50%; }',
        '@keyframes xhs-helper-rotate { to { transform: rotate(360deg); } }'
    ].join('\n');

    function injectStyle() {
        if (document.getElementById('xhs-helper-video-style')) return;
        const style = document.createElement('style');
        style.id = 'xhs-helper-video-style';
        style.textContent = STYLE_TEXT;
        (document.head || document.documentElement).appendChild(style);
    }

    function setStatus(text, icon, className, holdMs) {
        if (!button) return;
        const wasVisible = button.classList.contains('visible');
        button.innerHTML = icon + '<span>' + text + '</span>';
        // className 会重置 .corner，重新定位一次把它算回来
        button.className = (wasVisible ? 'visible ' : '') + (className || '');
        if (wasVisible) positionButton();
        if (statusResetTimer) clearTimeout(statusResetTimer);
        if (holdMs) {
            statusResetTimer = setTimeout(resetStatus, holdMs);
        }
    }

    function resetStatus() {
        isBusy = false;
        setStatus('下载视频', ICON_DOWNLOAD, '');
    }

    function createButton() {
        injectStyle();
        button = document.createElement('button');
        button.id = BUTTON_ID;
        button.type = 'button';
        button.title = '下载当前笔记的视频';
        button.addEventListener('click', handleClick);
        document.body.appendChild(button);
        resetStatus();
    }

    function showButton(visible) {
        if (!button) return;
        button.classList.toggle('visible', visible);
        if (visible) positionButton();
    }

    // 吸附到视频右上角内侧。
    // 不选底部，是因为 xgplayer 的进度条和播放控件都在视频底部，会互相挡。
    const EDGE_INSET = 14;

    function positionButton() {
        if (!button) return;

        const video = getVideoElement();
        const rect = isVisibleVideo(video) ? video.getBoundingClientRect() : null;

        // 只有数据探针命中、DOM 里找不到视频时，退回视口角落
        if (!rect || rect.width < 160 || rect.height < 160) {
            button.classList.add('corner');
            button.style.left = '';
            button.style.top = '';
            return;
        }

        button.classList.remove('corner');
        const bw = button.offsetWidth || 116;
        const bh = button.offsetHeight || 40;

        // 夹在视口内，视频被滚出去时按钮不会跟着飞走
        const left = Math.max(8, Math.min(rect.right - bw - EDGE_INSET, window.innerWidth - bw - 8));
        const top = Math.max(8, Math.min(rect.top + EDGE_INSET, window.innerHeight - bh - 8));

        button.style.left = Math.round(left) + 'px';
        button.style.top = Math.round(top) + 'px';
    }

    // ---------- 下载流程 ----------

    async function handleClick(event) {
        // 按钮压在视频上，别让点击落到播放器上触发暂停
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (isBusy) return;
        isBusy = true;
        setStatus('解析中', ICON_LOADING, 'busy');

        try {
            const noteId = getCurrentNoteId();
            const info = (probeCache.key === cacheKey() && probeCache.info) || await askProbe(noteId);
            const videoUrl = (info && info.url) || getDirectVideoUrl();

            if (!videoUrl) {
                console.warn('🎬 未能解析出视频地址，noteId:', noteId);
                setStatus('没找到视频', ICON_FAIL, 'fail', 2600);
                return;
            }

            setStatus('下载中', ICON_LOADING, 'busy');
            const response = await sendMessage({
                action: 'downloadVideo',
                videoUrl: videoUrl,
                filename: buildFilename(info),
                pageUrl: location.href
            });

            if (response && response.status === 'success') {
                setStatus('已保存', ICON_DONE, 'done', 2600);
            } else {
                console.warn('🎬 视频下载失败:', response);
                setStatus('下载失败', ICON_FAIL, 'fail', 2600);
            }
        } catch (error) {
            console.error('🎬 下载视频出错:', error);
            setStatus('下载失败', ICON_FAIL, 'fail', 2600);
        }
    }

    function sendMessage(payload) {
        return new Promise(resolve => {
            try {
                chrome.runtime.sendMessage(payload, response => {
                    if (chrome.runtime.lastError) {
                        resolve({ status: 'error', message: chrome.runtime.lastError.message });
                    } else {
                        resolve(response);
                    }
                });
            } catch (error) {
                resolve({ status: 'error', message: error.message });
            }
        });
    }

    // ---------- 视频检测 ----------

    // 两条独立的判据，任意一条成立就显示按钮：
    //   1) DOM 里有可见的 video 元素
    //   2) 页面数据里这条笔记带视频（小红书改版换 DOM 时靠这条兜底）
    let probeCache = { key: null, hasVideo: false, info: null };

    function cacheKey() {
        // 用完整 href 兜底，避免只有 query 变化时探测结果发霉
        return getCurrentNoteId() || location.href;
    }

    function refreshProbeCache() {
        if (!isNoteView()) {
            probeCache = { key: null, hasVideo: false, info: null };
            return;
        }
        const key = cacheKey();
        if (probeCache.key === key) return;

        probeCache = { key: key, hasVideo: false, info: null };
        askProbe(getCurrentNoteId()).then(info => {
            // 期间可能已经翻到别的笔记，结果作废
            if (cacheKey() !== key) return;
            probeCache = { key: key, hasVideo: !!(info && info.url), info: info };
            refresh();
        });
    }

    function hasPlayableVideo() {
        return isVisibleVideo(getVideoElement());
    }

    let lastVisible = null;
    function refresh() {
        const visible = hasPlayableVideo() || (isNoteView() && probeCache.hasVideo);
        if (visible !== lastVisible) {
            lastVisible = visible;
            showButton(visible);
            if (!visible && !isBusy) resetStatus();
        } else if (visible) {
            // 可见性没变也要跟位置：换笔记、窗口缩放、视频尺寸变化都会挪动视频
            positionButton();
        }
    }

    let refreshTimer = null;
    let lastKey = null;
    function tick() {
        const key = cacheKey();
        if (key !== lastKey) {
            lastKey = key;
            refreshProbeCache();
        }
        refresh();
    }

    function start() {
        if (!document.body) {
            setTimeout(start, 300);
            return;
        }
        createButton();
        injectProbe();
        tick();

        const observer = new MutationObserver(() => {
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(tick, 200);
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // 视频容器自己是可滚动的（note-detail-mask 带 overflow:auto），
        // scroll 事件不冒泡，必须用捕获才能收到内层滚动
        document.addEventListener('scroll', positionButton, { capture: true, passive: true });
        window.addEventListener('resize', positionButton, { passive: true });

        // 视频元素尺寸变化（全屏切换、窗口拖拽）时重新定位
        if (typeof ResizeObserver === 'function') {
            const ro = new ResizeObserver(() => positionButton());
            let watched = null;
            setInterval(() => {
                const v = getVideoElement();
                if (v && v !== watched) {
                    if (watched) ro.unobserve(watched);
                    ro.observe(v);
                    watched = v;
                }
            }, 1500);
        }

        // 小红书是单页应用，弹窗开关不一定触发 body 子树变化，补一个轮询兜底
        setInterval(tick, 1200);
        console.log('🎬 小红书视频下载按钮已注入');
    }

    start();
})();

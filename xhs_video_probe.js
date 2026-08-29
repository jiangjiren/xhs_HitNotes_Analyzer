/**
 * 运行在小红书页面主世界（page context）中的探针脚本。
 * content script 处于隔离环境，读不到 window.__INITIAL_STATE__，
 * 因此由这里读取笔记数据后，通过 postMessage 回传视频真实地址。
 */
(function () {
    const REQUEST_TYPE = 'XHS_HELPER_VIDEO_PROBE_REQUEST';
    const RESPONSE_TYPE = 'XHS_HELPER_VIDEO_PROBE_RESULT';

    if (window.__xhsHelperVideoProbeReady) {
        return;
    }
    window.__xhsHelperVideoProbeReady = true;

    // 小红书部分字段是 Vue 的响应式引用，取值时需要解包
    function unref(value) {
        if (value && typeof value === 'object') {
            if ('_rawValue' in value) return value._rawValue;
            if ('value' in value && !Array.isArray(value)) return value.value;
        }
        return value;
    }

    function isVideoUrl(url) {
        return typeof url === 'string' && /^https?:\/\//.test(url) && !/\.(m3u8|mpd)(\?|$)/i.test(url);
    }

    // stream 下按编码分组，h264 兼容性最好，其余作为兜底
    function pickFromStream(stream) {
        stream = unref(stream);
        if (!stream || typeof stream !== 'object') return null;

        const codecs = ['h264', 'h265', 'av1', 'h266'];
        const orderedKeys = codecs.filter(c => c in stream).concat(
            Object.keys(stream).filter(k => !codecs.includes(k))
        );

        for (const key of orderedKeys) {
            const list = unref(stream[key]);
            if (!Array.isArray(list)) continue;
            for (const item of list) {
                const entry = unref(item);
                if (!entry || typeof entry !== 'object') continue;
                const candidates = [entry.masterUrl].concat(
                    Array.isArray(entry.backupUrls) ? entry.backupUrls : []
                );
                const url = candidates.find(isVideoUrl);
                if (url) {
                    return {
                        url: url,
                        codec: key,
                        width: entry.width || 0,
                        height: entry.height || 0,
                        size: entry.size || 0,
                        duration: entry.duration || 0
                    };
                }
            }
        }
        return null;
    }

    // 兜底：在笔记对象内递归找 masterUrl / videoUrl 字段
    function deepFindVideo(node, depth) {
        if (!node || depth > 8) return null;
        node = unref(node);
        if (!node || typeof node !== 'object') return null;

        if (Array.isArray(node)) {
            for (const child of node) {
                const found = deepFindVideo(child, depth + 1);
                if (found) return found;
            }
            return null;
        }

        for (const key of ['masterUrl', 'videoUrl', 'originVideoKey', 'url']) {
            const value = unref(node[key]);
            if (isVideoUrl(value) && /video|\.mp4/i.test(value)) {
                return { url: value, codec: 'unknown', width: 0, height: 0, size: 0, duration: 0 };
            }
        }

        for (const key of Object.keys(node)) {
            if (key.startsWith('__')) continue;
            const found = deepFindVideo(node[key], depth + 1);
            if (found) return found;
        }
        return null;
    }

    function extractFromNote(note) {
        note = unref(note);
        if (!note || typeof note !== 'object') return null;

        const video = unref(note.video);
        let picked = null;
        if (video) {
            picked = pickFromStream(unref(unref(video.media) && unref(video.media).stream)) ||
                     pickFromStream(unref(video.stream)) ||
                     deepFindVideo(video, 0);
        }
        if (!picked) return null;

        const user = unref(note.user) || {};
        return Object.assign(picked, {
            noteId: unref(note.noteId) || unref(note.id) || '',
            title: (unref(note.title) || '').trim(),
            desc: (unref(note.desc) || '').trim(),
            author: (unref(user.nickname) || unref(user.nickName) || '').trim()
        });
    }

    function findNote(noteId) {
        const state = window.__INITIAL_STATE__;
        if (!state) return null;

        const noteStore = unref(state.note);
        if (!noteStore) return null;

        const detailMap = unref(noteStore.noteDetailMap) || {};
        const targetIds = [
            noteId,
            unref(noteStore.currentNoteId),
            unref(noteStore.firstNoteId)
        ].filter(Boolean);

        // 能确定是哪条笔记时，只认这条：找到了就以它为准，没视频就返回 null。
        // 不能继续往下遍历——否则图文笔记会命中 detailMap 里缓存的其它视频笔记，
        // 结果是按钮误显示、点下去下到的是别人的视频。
        for (const id of targetIds) {
            const entry = unref(detailMap[id]);
            if (!entry) continue;
            const result = extractFromNote(unref(entry.note) || entry);
            if (result && !result.noteId) result.noteId = id;
            return result;
        }

        // 完全定位不到当前笔记时才遍历兜底（弹窗场景下 URL 里可能没有 id）
        for (const id of Object.keys(detailMap)) {
            const entry = unref(detailMap[id]);
            const result = entry && extractFromNote(unref(entry.note) || entry);
            if (result) {
                if (!result.noteId) result.noteId = id;
                return result;
            }
        }
        return null;
    }

    window.addEventListener('message', function (event) {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.type !== REQUEST_TYPE) return;

        let payload = null;
        let error = '';
        try {
            payload = findNote(data.noteId || '');
            if (!payload) error = '页面数据里没有找到视频地址';
        } catch (e) {
            error = e && e.message ? e.message : String(e);
        }

        window.postMessage({
            type: RESPONSE_TYPE,
            requestId: data.requestId,
            payload: payload,
            error: error
        }, '*');
    });

    window.postMessage({ type: RESPONSE_TYPE, requestId: 'ready', payload: null, error: '' }, '*');
})();

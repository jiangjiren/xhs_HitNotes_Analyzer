// 标记是否有用户交互
let hasUserInteraction = false;

// 监听用户交互
document.addEventListener('click', function() {
    hasUserInteraction = true;
});

document.addEventListener('keydown', function() {
    hasUserInteraction = true;
});

// 防止窗口关闭
window.onbeforeunload = function(e) {
    if (hasUserInteraction) {
        e.preventDefault();
        return "确定要关闭窗口吗？采集进度将会丢失。";
    }
};

// 防止窗口被关闭
document.addEventListener('keydown', function(e) {
    // 阻止Alt+F4
    if (e.key === 'F4' && e.altKey) {
        e.preventDefault();
    }
    // 阻止Ctrl+W
    if (e.key === 'w' && e.ctrlKey) {
        e.preventDefault();
    }
}); 
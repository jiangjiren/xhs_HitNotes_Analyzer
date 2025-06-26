// API配置
const config = {
    // DeepSeek API配置
    DEEPSEEK_API_KEY: '', // 不再提供默认API密钥
    DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
    
    // Gemini API配置
    GEMINI_API_KEY: '',
    GEMINI_OPENAI_COMPATIBLE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    
    // OpenAI兼容API端点
    OPENAI_STYLE_GEMINI_URL: "https://generativelanguage.googleapis.com/v1beta/models/"
}; 

// 从存储中获取用户设置的API密钥
chrome.storage.local.get(['deepseekApiKey', 'geminiApiKey'], (result) => {
    if (result.deepseekApiKey && result.deepseekApiKey.trim() !== '') {
        config.DEEPSEEK_API_KEY = result.deepseekApiKey;
        console.log('已加载用户设置的DeepSeek API密钥');
    } else {
        console.log('未设置DeepSeek API密钥，需要用户在设置中配置');
    }
    
    if (result.geminiApiKey && result.geminiApiKey.trim() !== '') {
        config.GEMINI_API_KEY = result.geminiApiKey;
        console.log('已加载用户设置的Gemini API密钥');
    } else {
        console.log('未设置Gemini API密钥，需要用户在设置中配置');
    }
});
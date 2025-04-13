/**
 * 存储管理模块
 */
const Storage = {
    // 配置相关
    CONFIG_KEY: 'bookmark_categorizer_config',
    
    // 中间状态键名
    STATE_KEY: 'bookmark_categorizer_state',
    PARSED_BOOKMARKS_KEY: 'bookmark_categorizer_parsed',
    CATEGORIZED_BOOKMARKS_KEY: 'bookmark_categorizer_categorized',
    
    // 默认配置
    defaultConfig: {
        apiKey: '',
        apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        modelName: 'qwen-turbo',
        batchSize: 30,
        prompt: `我需要你帮我对一批浏览器书签进行分类，将它们分成有意义的类别。
请分析每个书签的标题和URL，然后为每个书签分配一个合适的类别，总共的大类别数不应超过10个，每个大类的小类别数不超过7个，不能有三级分类。
类别应该精确、具体且有意义，比如：
- 编程开发（可进一步细分为：CTF、ACM、Web等）
- 学习教育（可细分为：在线课程、学术资源、教育平台等）
- 实用工具（在线工具、实用导航、软件资源、网盘等）
- 娱乐（有意思、电影、视频、音乐等等）
- 科研（科研工具、科研资源、科研平台等）
- 生活（医疗、各项技能）
- 游戏(游戏资源、在线单人游戏、在线多人游戏、游戏攻略等)
- 等等
`
    },
    
    // 保存配置
    saveConfig(config) {
        localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
    },
    
    // 获取配置
    getConfig() {
        const savedConfig = localStorage.getItem(this.CONFIG_KEY);
        return savedConfig ? JSON.parse(savedConfig) : this.defaultConfig;
    },
    
    // 保存当前状态
    saveState(state) {
        localStorage.setItem(this.STATE_KEY, JSON.stringify(state));
    },
    
    // 获取保存的状态
    getState() {
        const savedState = localStorage.getItem(this.STATE_KEY);
        return savedState ? JSON.parse(savedState) : null;
    },
    
    // 清除状态
    clearState() {
        localStorage.removeItem(this.STATE_KEY);
    },
    
    // 保存解析后的书签
    saveParsedBookmarks(bookmarks) {
        localStorage.setItem(this.PARSED_BOOKMARKS_KEY, JSON.stringify(bookmarks));
    },
    
    // 获取解析后的书签
    getParsedBookmarks() {
        const bookmarks = localStorage.getItem(this.PARSED_BOOKMARKS_KEY);
        return bookmarks ? JSON.parse(bookmarks) : null;
    },
    
    // 保存整理后的书签
    saveCategorizedBookmarks(bookmarks) {
        localStorage.setItem(this.CATEGORIZED_BOOKMARKS_KEY, JSON.stringify(bookmarks));
    },
    
    // 获取分类后的书签
    getCategorizedBookmarks() {
        const bookmarks = localStorage.getItem(this.CATEGORIZED_BOOKMARKS_KEY);
        return bookmarks ? JSON.parse(bookmarks) : null;
    },
    
    // 清除所有缓存的书签数据
    clearBookmarkData() {
        localStorage.removeItem(this.PARSED_BOOKMARKS_KEY);
        localStorage.removeItem(this.CATEGORIZED_BOOKMARKS_KEY);
    },

    //清除分类后的书签数据
    clearCategorizedBookmarks() {
        localStorage.removeItem(this.PARSED_BOOKMARKS_KEY);
        localStorage.removeItem(this.CATEGORIZED_BOOKMARKS_KEY);
    },
};
/**
 * UI更新和交互模块
 */
const UI = {
    elements: {
        // 配置相关
        apiConfigForm: document.getElementById('apiConfigForm'),
        saveConfigBtn: document.getElementById('saveConfig'),
        resetConfigBtn: document.getElementById('resetConfig'),
        apiKeyInput: document.getElementById('apiKey'),
        apiUrlInput: document.getElementById('apiUrl'),
        modelNameInput: document.getElementById('modelName'),
        promptInput: document.getElementById('prompt'),
        batchSizeInput: document.getElementById('batchSize'),
        resetCategorizationBtn: document.getElementById('resetCategorization'),

        // 添加配置折叠相关元素
        toggleConfigBtn: document.getElementById('toggleConfigBtn'),
        apiConfigContent: document.getElementById('apiConfigContent'),
        
        // 文件处理相关
        bookmarksFileInput: document.getElementById('bookmarksFile'),
        parseBtn: document.getElementById('parseBtn'),
        categorizeBtn: document.getElementById('categorizeBtn'),
        exportBtn: document.getElementById('exportBtn'),
        resumeNotification: document.getElementById('resumeNotification'),
        resumeBtn: document.getElementById('resumeBtn'),
        startNewBtn: document.getElementById('startNewBtn'),
        
        // 进度显示相关
        progressBar: document.getElementById('progressBar'),
        progressText: document.getElementById('progressText'),
        progressStatus: document.getElementById('progressStatus'),
        totalBookmarks: document.getElementById('totalBookmarks'),
        processedBookmarks: document.getElementById('processedBookmarks'),
        currentStatus: document.getElementById('currentStatus'),
        
        // 结果相关
        categoryFilter: document.getElementById('categoryFilter'),
        categorySelect: document.getElementById('categorySelect'),
        resultsTree: document.getElementById('resultsTree'),
        resultsLoading: document.getElementById('resultsLoading'),
        emptyResults: document.getElementById('emptyResults')
    },
    
    /**
     * 初始化UI
     */
    init() {
        this.loadConfigToForm();
        this.setupEventListeners();
    },
    
    /**
     * 从存储中加载配置到表单
     */
    loadConfigToForm() {
        const config = Storage.getConfig();
        this.elements.apiKeyInput.value = config.apiKey || '';
        this.elements.apiUrlInput.value = config.apiUrl || '';
        this.elements.modelNameInput.value = config.modelName || '';
        this.elements.promptInput.value = config.prompt || '';
        this.elements.batchSizeInput.value = config.batchSize || 5;
    },
    
    /**
     * 从表单中获取配置
     * @returns {Object} 配置对象
     */
    getConfigFromForm() {
        return {
            apiKey: this.elements.apiKeyInput.value.trim(),
            apiUrl: this.elements.apiUrlInput.value.trim(),
            modelName: this.elements.modelNameInput.value.trim(),
            prompt: this.elements.promptInput.value.trim(),
            batchSize: parseInt(this.elements.batchSizeInput.value) || 5
        };
    },
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 添加配置折叠功能
        this.elements.toggleConfigBtn.addEventListener('click', () => {
            const content = this.elements.apiConfigContent;
            const isVisible = content.style.display !== 'none';
            
            content.style.display = isVisible ? 'none' : 'block';
            this.elements.toggleConfigBtn.textContent = isVisible ? '展开' : '收起';
        });

        // 保存配置
        this.elements.saveConfigBtn.addEventListener('click', () => {
            const config = this.getConfigFromForm();
            Storage.saveConfig(config);
            this.showNotification('配置已保存', 'success');
        });
        
        // 重置配置
        this.elements.resetConfigBtn.addEventListener('click', () => {
            if (confirm('确定要重置为默认配置吗？')) {
                Storage.saveConfig(Storage.defaultConfig);
                this.loadConfigToForm();
                this.showNotification('配置已重置为默认值', 'info');
            }
        });

        // 添加重新功能
        this.elements.resetCategorizationBtn.addEventListener('click', () => {
            if (confirm('确定要重置所有整理结果吗？这将删除之前的所有整理数据。')) {
                // 清除存储的整理结果
                Storage.clearCategorizedBookmarks();
                
                // 清空结果显示
                this.elements.resultsTree.innerHTML = '';
                this.elements.emptyResults.style.display = 'block';
                
                // 更新按钮状态
                const state = {
                    parsedBookmarks: Storage.getParsedBookmarks(),
                    categorizedBookmarks: null,
                    isProcessing: false
                };
                this.updateButtonStates(state);
                
                this.showNotification('整理结果已重置', 'info');
            }
        });
        
        // 文件选择
        this.elements.bookmarksFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.elements.parseBtn.disabled = false;
            } else {
                this.elements.parseBtn.disabled = true;
            }
        });
        
        // 整理过滤
        this.elements.categoryFilter.addEventListener('input', this.handleCategoryFilter.bind(this));
        this.elements.categorySelect.addEventListener('change', this.handleCategorySelect.bind(this));
    },
    
    /**
     * 显示通知消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (info, success, warning, error)
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 添加到页面顶部
        const notificationsContainer = document.getElementById('notificationsContainer') || document.createElement('div');
        
        if (!document.getElementById('notificationsContainer')) {
            notificationsContainer.id = 'notificationsContainer';
            notificationsContainer.style.position = 'fixed';
            notificationsContainer.style.top = '0';
            notificationsContainer.style.left = '0';
            notificationsContainer.style.width = '100%';
            notificationsContainer.style.zIndex = '1000';
            document.body.insertBefore(notificationsContainer, document.body.firstChild);
        }
        
        notificationsContainer.appendChild(notification);
        
        // 自动移除
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 1000);
        }, 3000);
    },
    /**
     * 更新进度显示
     * @param {number} current - 当前处理数量
     * @param {number} total - 总数量
     * @param {string} status - 当前状态描述
     */
    updateProgress(current, total, status) {
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        
        this.elements.progressBar.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${percentage}%`;
        this.elements.progressStatus.textContent = status;
        this.elements.totalBookmarks.textContent = total;
        this.elements.processedBookmarks.textContent = current;
        this.elements.currentStatus.textContent = status;
    },
    
    /**
     * 显示是否继续上次任务的通知
     */
    showResumeNotification() {
        this.elements.resumeNotification.style.display = 'block';
    },
    
    /**
     * 隐藏是否继续上次任务的通知
     */
    hideResumeNotification() {
        this.elements.resumeNotification.style.display = 'none';
    },
    
    /**
     * 更新按钮状态
     * @param {Object} state - 当前应用状态
     */
    updateButtonStates(state) {
        // 解析按钮状态
        this.elements.parseBtn.disabled = !this.elements.bookmarksFileInput.files[0] || 
                                          state.isProcessing;
        
        // 整理按钮状态
        this.elements.categorizeBtn.disabled = !state.parsedBookmarks || 
                                              state.isProcessing;
        
        // 导出按钮状态
        this.elements.exportBtn.disabled = !state.categorizedBookmarks || 
                                          state.isProcessing;
    },



    /**
     * 显示/隐藏API处理状态
     * @param {boolean} isProcessing - 是否正在处理
     * @param {string} message - 状态消息
     */
    showApiProcessingStatus(isProcessing, message = '') {
        const apiStatusElement = document.getElementById('apiProcessingStatus') || this.createApiStatusElement();
        
        if (isProcessing) {
            apiStatusElement.style.display = 'flex';
            this.updateApiProcessingStatus(message);
        } else {
            apiStatusElement.style.display = 'none';
        }
    },

    /**
     * 更新API处理状态消息
     * @param {string} message - 状态消息
     */
    updateApiProcessingStatus(message) {
        const apiStatusElement = document.getElementById('apiProcessingStatus');
        if (apiStatusElement) {
            const messageElement = apiStatusElement.querySelector('.message');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    },

    /**
     * 创建API状态显示元素
     * @returns {HTMLElement} 创建的状态元素
     */
    createApiStatusElement() {
        const apiStatusElement = document.createElement('div');
        apiStatusElement.id = 'apiProcessingStatus';
        apiStatusElement.className = 'api-processing-status';
        
        // 添加动画效果的加载指示器
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            spinner.appendChild(dot);
        }
        
        // 添加消息显示区域
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        messageElement.textContent = '正在处理...';
        
        apiStatusElement.appendChild(spinner);
        apiStatusElement.appendChild(messageElement);
        
        // 添加到页面中
        document.body.appendChild(apiStatusElement);
        
        // 默认隐藏
        apiStatusElement.style.display = 'none';
        
        return apiStatusElement;
    },








    
    /**
     * 显示整理结果
     * @param {Object} bookmarksByCategory - 按类别组织的书签对象
     */
    displayResults(bookmarksByCategory) {
        if (!bookmarksByCategory) {
            this.elements.emptyResults.style.display = 'block';
            this.elements.resultsTree.innerHTML = '';
            return;
        }
        
        this.elements.emptyResults.style.display = 'none';
        this.elements.resultsTree.innerHTML = '';
        
        // 更新类别选择下拉框
        this.updateCategorySelect(bookmarksByCategory);
        
        // 递归构建整理树
        const buildTree = (categoryDict, container) => {
            const sortedCategories = Object.keys(categoryDict).sort();
            
            for (const category of sortedCategories) {
                if (category === "_items") continue;
                
                const items = categoryDict[category];
                
                // 创建类别节点
                const categoryNode = document.createElement('div');
                categoryNode.className = 'tree-node';
                
                const folderElement = document.createElement('div');
                folderElement.className = 'tree-folder';
                folderElement.innerHTML = `<span class="tree-folder-icon">📁</span> ${category} <span class="count">(${this.countBookmarks(items)})</span>`;
                
                // 折叠/展开功能
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'tree-items';
                childrenContainer.style.display = 'none';
                
                folderElement.addEventListener('click', () => {
                    const isVisible = childrenContainer.style.display !== 'none';
                    childrenContainer.style.display = isVisible ? 'none' : 'block';
                    folderElement.querySelector('.tree-folder-icon').textContent = isVisible ? '📁' : '📂';
                });
                
                categoryNode.appendChild(folderElement);
                categoryNode.appendChild(childrenContainer);
                
                // 添加子类别或书签
                if (isObject(items)) {
                    buildTree(items, childrenContainer);
                    
                    // 添加 _items 特殊键中的书签
                    if (items._items) {
                        this.addBookmarksToContainer(items._items, childrenContainer);
                    }
                } else if (Array.isArray(items)) {
                    this.addBookmarksToContainer(items, childrenContainer);
                }
                
                container.appendChild(categoryNode);
            }
        };
        
        buildTree(bookmarksByCategory, this.elements.resultsTree);
    },
    
    /**
     * 更新类别选择下拉框
     * @param {Object} bookmarksByCategory - 按类别组织的书签对象
     */
    updateCategorySelect(bookmarksByCategory) {
        const select = this.elements.categorySelect;
        select.innerHTML = '<option value="all">所有类别</option>';
        
        const categories = this.getAllCategories(bookmarksByCategory);
        
        for (const category of categories) {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        }
    },
    
    /**
     * 获取所有类别
     * @param {Object} bookmarksByCategory - 按类别组织的书签对象
     * @param {string} prefix - 当前路径前缀
     * @returns {Array} 类别列表
     */
    getAllCategories(bookmarksByCategory, prefix = '') {
        let categories = [];
        
        for (const category in bookmarksByCategory) {
            if (category === '_items') continue;
            
            const fullPath = prefix ? `${prefix}/${category}` : category;
            categories.push(fullPath);
            
            const items = bookmarksByCategory[category];
            if (isObject(items)) {
                const subCategories = this.getAllCategories(items, fullPath);
                categories = categories.concat(subCategories);
            }
        }
        
        return categories;
    },
    
    /**
     * 添加书签到容器
     * @param {Array} bookmarks - 书签数组
     * @param {HTMLElement} container - 容器元素
     */
    addBookmarksToContainer(bookmarks, container) {
        if (!bookmarks || bookmarks.length === 0) return;
        
        const sortedBookmarks = [...bookmarks].sort((a, b) => 
            (a.title || "").localeCompare(b.title || ""));
            
        for (const bookmark of sortedBookmarks) {
            const bookmarkElement = document.createElement('div');
            bookmarkElement.className = 'tree-item';
            
            const link = document.createElement('a');
            link.href = bookmark.url;
            link.textContent = bookmark.title;
            link.title = bookmark.url;
            link.target = '_blank';
            
            bookmarkElement.appendChild(link);
            container.appendChild(bookmarkElement);
        }
    },
    
    /**
     * 计算一个类别中的书签总数
     * @param {Object|Array} items - 类别中的项目
     * @returns {number} 书签数量
     */
    countBookmarks(items) {
        let count = 0;
        
        if (Array.isArray(items)) {
            count += items.length;
        } else if (isObject(items)) {
            // 计算_items中的书签
            if (items._items) {
                count += items._items.length;
            }
            
            // 递归计算子类别中的书签
            for (const key in items) {
                if (key !== '_items') {
                    count += this.countBookmarks(items[key]);
                }
            }
        }
        
        return count;
    },
    
    /**
     * 处理类别过滤
     */
    handleCategoryFilter() {
        const filterText = this.elements.categoryFilter.value.toLowerCase();
        const treeNodes = this.elements.resultsTree.querySelectorAll('.tree-node');
        
        treeNodes.forEach(node => {
            const folderName = node.querySelector('.tree-folder').textContent.toLowerCase();
            const items = node.querySelectorAll('.tree-item');
            
            let hasMatch = folderName.includes(filterText);
            
            // 检查书签
            if (!hasMatch) {
                items.forEach(item => {
                    const title = item.textContent.toLowerCase();
                    if (title.includes(filterText)) {
                        hasMatch = true;
                    }
                    item.style.display = title.includes(filterText) ? 'block' : 'none';
                });
            } else {
                // 文件夹名匹配，显示所有书签
                items.forEach(item => item.style.display = 'block');
            }
            
            node.style.display = hasMatch ? 'block' : 'none';
        });
    },
    
    /**
     * 处理类别选择
     */
    handleCategorySelect() {
        const selectedCategory = this.elements.categorySelect.value;
        const treeNodes = this.elements.resultsTree.querySelectorAll('.tree-node');
        
        if (selectedCategory === 'all') {
            treeNodes.forEach(node => node.style.display = 'block');
            return;
        }
        
        const categories = selectedCategory.split('/');
        
        // 隐藏所有节点
        treeNodes.forEach(node => node.style.display = 'none');
        
        // 展开选择路径
        let currentNodes = Array.from(this.elements.resultsTree.children);
        
        for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            let found = false;
            
            for (const node of currentNodes) {
                const folderElement = node.querySelector('.tree-folder');
                const folderName = folderElement.textContent.split(' ')[1]; // 去掉图标和计数
                
                if (folderName === category) {
                    node.style.display = 'block';
                    const childrenContainer = node.querySelector('.tree-items');
                    childrenContainer.style.display = 'block';
                    folderElement.querySelector('.tree-folder-icon').textContent = '📂';
                    
                    // 更新当前节点为子节点
                    currentNodes = Array.from(childrenContainer.children);
                    found = true;
                    break;
                }
            }
            
            if (!found) break;
        }
    }
};
/**
 * 主应用逻辑
 */
const App = {
    // 应用状态
    state: {
        isProcessing: false,
        parsedBookmarks: null,
        categorizedBookmarks: null,
        bookmarksByCategory: null,
        processedCount: 0,
        totalCount: 0,
        currentStatus: '就绪'
    },
    
    /**
     * 初始化应用
     */
    init() {
        // 初始化UI
        UI.init();
        
        // 检查是否有未完成的任务
        this.checkResumeState();
        
        // 设置事件监听器
        this.setupEventListeners();
    },
    
    /**
     * 检查是否有可以恢复的状态
     */
    checkResumeState() {
        const savedState = Storage.getState();
        if (savedState) {
            console.log('找到保存的状态:', savedState);
            
            // 恢复已解析的书签
            const parsedBookmarks = Storage.getParsedBookmarks();
            if (parsedBookmarks) {
                UI.showResumeNotification();
            }
        }
    },
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 解析书签按钮
        UI.elements.parseBtn.addEventListener('click', this.handleParseBookmarks.bind(this));
        
        // 整理书签按钮
        UI.elements.categorizeBtn.addEventListener('click', this.handleCategorizeBookmarks.bind(this));
        
        // 导出按钮
        UI.elements.exportBtn.addEventListener('click', this.handleExportBookmarks.bind(this));
        
        // 继续上次任务按钮
        UI.elements.resumeBtn.addEventListener('click', this.handleResumeTask.bind(this));
        
        // 开始新任务按钮
        UI.elements.startNewBtn.addEventListener('click', this.handleStartNewTask.bind(this));
    },
    
    /**
     * 处理书签解析
     */
    async handleParseBookmarks() {
        if (this.state.isProcessing) return;
        
        const file = UI.elements.bookmarksFileInput.files[0];
        if (!file) {
            UI.showNotification('请选择书签HTML文件', 'warning');
            return;
        }
        
        this.setState({ isProcessing: true, currentStatus: '正在解析书签文件...' });
        UI.updateButtonStates(this.state);
        
        try {
            // 读取文件内容
            const content = await this.readFileContent(file);
            
            // 解析书签
            const bookmarks = BookmarkParser.parseBookmarks(content);
            
            // 更新状态
            this.setState({ 
                parsedBookmarks: bookmarks,
                totalCount: bookmarks.length,
                processedCount: 0,
                currentStatus: '书签解析完成' 
            });
            
            // 保存解析结果
            Storage.saveParsedBookmarks(bookmarks);
            Storage.saveState({
                stage: 'parsed',
                totalCount: bookmarks.length,
                processedCount: 0
            });
            
            UI.showNotification(`成功解析 ${bookmarks.length} 个书签`, 'success');
            UI.elements.categorizeBtn.disabled = false;
        } catch (error) {
            console.error('解析书签时出错:', error);
            UI.showNotification(`解析失败: ${error.message}`, 'error');
        } finally {
            this.setState({ isProcessing: false });
            UI.updateButtonStates(this.state);
        }
    },
    
    /**
     * 处理书签整理
     */
    async handleCategorizeBookmarks() {
        if (this.state.isProcessing) return;
        
        if (!this.state.parsedBookmarks) {
            UI.showNotification('请先解析书签文件', 'warning');
            return;
        }
        
        const config = Storage.getConfig();
        if (!config.apiKey) {
            UI.showNotification('请先配置API密钥', 'warning');
            return;
        }
        
        this.setState({ 
            isProcessing: true, 
            processedCount: 0,
            currentStatus: '正在整理书签...' 
        });
        UI.updateButtonStates(this.state);
        
        try {
            const bookmarks = this.state.parsedBookmarks;
            const batchSize = config.batchSize || 5;
            
            // 恢复已有整理结果
            let categorizedBookmarks = [];
            const savedCategorized = Storage.getCategorizedBookmarks();
            
            if (savedCategorized && savedCategorized.length > 0) {
                categorizedBookmarks = savedCategorized;
                this.setState({ processedCount: categorizedBookmarks.length });
            }
            
            // 处理剩余未整理的书签
            for (let i = categorizedBookmarks.length; i < bookmarks.length; i += batchSize) {
                const batch = bookmarks.slice(i, i + batchSize);
                
                this.setState({ 
                    currentStatus: `正在整理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(bookmarks.length / batchSize)}` 
                });
                
                try {
                    const categorizedBatch = await ApiHandler.categorizeBookmarks(batch, config);
                    categorizedBookmarks = [...categorizedBookmarks, ...categorizedBatch];
                    
                    // 更新进度
                    this.setState({ 
                        processedCount: categorizedBookmarks.length,
                        categorizedBookmarks: categorizedBookmarks
                    });
                    
                    // 保存中间结果
                    Storage.saveCategorizedBookmarks(categorizedBookmarks);
                    Storage.saveState({
                        stage: 'categorizing',
                        totalCount: bookmarks.length,
                        processedCount: categorizedBookmarks.length
                    });
                    
                    // 重组书签并展示当前结果
                    const bookmarksByCategory = BookmarkParser.reorganizeBookmarks(categorizedBookmarks);
                    this.setState({ bookmarksByCategory });
                    UI.displayResults(bookmarksByCategory);
                    
                } catch (error) {
                    console.error(`处理批次 ${Math.floor(i / batchSize) + 1} 时出错:`, error);
                    UI.showNotification(`批次处理错误: ${error.message}`, 'error');
                    
                    // 为该批次添加未整理标记并继续
                    const uncategorizedBatch = batch.map(bookmark => ({ ...bookmark, category: '未整理' }));
                    categorizedBookmarks = [...categorizedBookmarks, ...uncategorizedBatch];
                    
                    this.setState({ 
                        processedCount: categorizedBookmarks.length,
                        categorizedBookmarks: categorizedBookmarks
                    });
                    
                    // 保存中间结果
                    Storage.saveCategorizedBookmarks(categorizedBookmarks);
                }
                
                // 更新UI进度
                UI.updateProgress(
                    this.state.processedCount,
                    this.state.totalCount, 
                    this.state.currentStatus
                );
            }
            
            // 整理完成，重组书签结构
            const bookmarksByCategory = BookmarkParser.reorganizeBookmarks(categorizedBookmarks);
            this.setState({ 
                categorizedBookmarks: categorizedBookmarks,
                bookmarksByCategory: bookmarksByCategory,
                currentStatus: '整理完成'
            });
            
            // 保存最终状态
            Storage.saveState({
                stage: 'categorized',
                totalCount: bookmarks.length,
                processedCount: bookmarks.length
            });
            
            // 更新UI
            UI.displayResults(bookmarksByCategory);
            UI.showNotification('书签整理完成', 'success');
            UI.elements.exportBtn.disabled = false;
            
        } catch (error) {
            console.error('整理书签时出错:', error);
            UI.showNotification(`整理失败: ${error.message}`, 'error');
        } finally {
            this.setState({ isProcessing: false });
            UI.updateButtonStates(this.state);
        }
    },
    
    /**
     * 处理书签导出
     */
    handleExportBookmarks() {
        if (!this.state.bookmarksByCategory) {
            UI.showNotification('没有可导出的整理结果', 'warning');
            return;
        }
        
        try {
            // 生成HTML文件内容
            const htmlContent = BookmarkParser.generateBookmarkHtml(this.state.bookmarksByCategory);
            
            // 创建下载链接
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'categorized_bookmarks.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            UI.showNotification('书签文件已导出', 'success');
            
            // 清除状态
            Storage.clearState();
        } catch (error) {
            console.error('导出书签时出错:', error);
            UI.showNotification(`导出失败: ${error.message}`, 'error');
        }
    },
    
    /**
     * 恢复上次任务
     */
    handleResumeTask() {
        const savedState = Storage.getState();
        if (!savedState) return;
        
        const parsedBookmarks = Storage.getParsedBookmarks();
        if (parsedBookmarks) {
            this.setState({ 
                parsedBookmarks: parsedBookmarks,
                totalCount: savedState.totalCount,
                processedCount: savedState.processedCount
            });
            
            // 如果有整理结果，也恢复
            const categorizedBookmarks = Storage.getCategorizedBookmarks();
            if (categorizedBookmarks) {
                this.setState({ 
                    categorizedBookmarks: categorizedBookmarks,
                    bookmarksByCategory: BookmarkParser.reorganizeBookmarks(categorizedBookmarks)
                });
                
                // 显示结果
                UI.displayResults(this.state.bookmarksByCategory);
            }
            
            UI.updateProgress(
                this.state.processedCount,
                this.state.totalCount, 
                savedState.stage === 'parsed' ? '书签解析完成' : '整理部分完成'
            );
            
            UI.showNotification('已恢复上次任务状态', 'info');
        }
        
        UI.hideResumeNotification();
        UI.updateButtonStates(this.state);
    },
    
    /**
     * 开始新任务
     */
    handleStartNewTask() {
        // 清除所有保存的状态和数据
        Storage.clearState();
        Storage.clearBookmarkData();
        
        // 重置应用状态
        this.setState({
            isProcessing: false,
            parsedBookmarks: null,
            categorizedBookmarks: null,
            bookmarksByCategory: null,
            processedCount: 0,
            totalCount: 0,
            currentStatus: '就绪'
        });
        
        // 清空结果显示
        UI.elements.resultsTree.innerHTML = '';
        UI.elements.emptyResults.style.display = 'block';
        
        // 重置进度显示
        UI.updateProgress(0, 0, '就绪');
        
        UI.hideResumeNotification();
        UI.updateButtonStates(this.state);
        UI.showNotification('已清除之前的处理状态', 'info');
    },
    
    /**
     * 读取文件内容
     * @param {File} file - 文件对象
     * @returns {Promise<string>} 文件内容
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    },
    
    /**
     * 更新应用状态
     * @param {Object} newState - 新状态对象
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        UI.updateProgress(
            this.state.processedCount,
            this.state.totalCount, 
            this.state.currentStatus
        );
    }
};

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
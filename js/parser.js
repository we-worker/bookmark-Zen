/**
 * 书签解析模块
 */
const BookmarkParser = {
    /**
     * 解析书签HTML文件
     * @param {string} htmlContent - HTML文件内容
     * @returns {Array} 解析后的书签数组
     */
    parseBookmarks(htmlContent) {
        const bookmarks = [];
        const urlSet = new Set(); // 用于去重
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // 递归解析DOM树获取所有书签
            const parseFolder = (element, folderPath = []) => {
                const children = element.children;
                
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    
                    if (child.tagName === 'DT') {
                        const h3 = child.querySelector('h3');
                        
                        // 如果是文件夹
                        if (h3) {
                            const folderName = h3.textContent.trim();
                            const newPath = [...folderPath, folderName];
                            
                            // 递归解析子文件夹
                            const dl = child.querySelector('dl');
                            if (dl) {
                                parseFolder(dl, newPath);
                            }
                        } 
                        // 如果是书签
                        else {
                            const a = child.querySelector('a');
                            if (a && a.href) {
                                // 过滤一些特殊URL
                                const url = a.href;
                                if (!url.startsWith('javascript:') && !url.startsWith('place:') && !urlSet.has(url)) {
                                    bookmarks.push({
                                        title: a.textContent.trim(),
                                        url: url,
                                        folder_path: folderPath.join('/'),
                                        add_date: a.getAttribute('add_date'),
                                        icon: a.getAttribute('icon')
                                    });
                                    urlSet.add(url);
                                }
                            }
                        }
                    }
                }
            };
            
            // 找到书签的根元素
            const dlElements = doc.querySelectorAll('dl');
            if (dlElements.length > 0) {
                parseFolder(dlElements[0]);
            }
            
            return bookmarks;
        } catch (error) {
            console.error("解析书签时出错:", error);
            throw new Error("解析书签文件失败: " + error.message);
        }
    },
    
    /**
     * 根据整理重组书签结构
     * @param {Array} categorizedBookmarks - 已整理的书签数组
     * @returns {Object} 按类别组织的书签对象
     */
    reorganizeBookmarks(categorizedBookmarks) {
        if (!categorizedBookmarks || categorizedBookmarks.length === 0) {
            return null;
        }
        
        const bookmarksByCategory = {};
        
        for (const bookmark of categorizedBookmarks) {
            const category = bookmark.category || "未整理";
            
            // 处理多级整理，例如 "编程/Python"
            const categories = category.split("/");
            let currentDict = bookmarksByCategory;
            
            // 构建整理的嵌套结构
            for (let i = 0; i < categories.length; i++) {
                let cat = categories[i].trim();
                if (!cat) continue;
                
                if (i === categories.length - 1) { // 最后一级整理
                    if (!currentDict[cat]) {
                        currentDict[cat] = [];
                    }
                    
                    // 确保当前位置是列表类型才添加书签
                    if (Array.isArray(currentDict[cat])) {
                        currentDict[cat].push(bookmark);
                    } else {
                        // 如果发现是字典，则添加到特殊键 "_items"
                        if (!currentDict[cat]["_items"]) {
                            currentDict[cat]["_items"] = [];
                        }
                        currentDict[cat]["_items"].push(bookmark);
                    }
                } else {
                    if (!currentDict[cat]) {
                        currentDict[cat] = {};
                    } else if (!isObject(currentDict[cat])) {
                        // 如果发现不是对象，转换为对象并将原数据存入特殊键
                        const items = currentDict[cat];
                        currentDict[cat] = { "_items": items };
                    }
                    currentDict = currentDict[cat];
                }
            }
        }
        
        return bookmarksByCategory;
    },
    
    /**
     * 生成书签HTML文件内容
     * @param {Object} bookmarksByCategory - 按类别组织的书签对象
     * @returns {string} HTML文件内容
     */
    generateBookmarkHtml(bookmarksByCategory) {
        // 使用标准的书签文件格式
        let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n';
        html += '<!-- This is an automatically generated file by AI.\n';
        html += '     It contains the reorganized bookmarks based on AI categorization.\n';
        html += '     DO NOT EDIT! -->\n';
        html += '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n';
        html += '<TITLE>Bookmarks</TITLE>\n';
        html += '<H1>Bookmarks</H1>\n';
        html += '<DL><p>\n';
        
        // 添加收藏夹栏文件夹
        const timestamp = Math.floor(Date.now() / 1000);
        html += `    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}" PERSONAL_TOOLBAR_FOLDER="true">收藏夹栏</H3>\n`;
        html += '    <DL><p>\n';
        
        // 递归添加整理和书签
        const formatCategory = (categoryDict, indentLevel = 2) => {
            let result = "";
            const indent = "    ".repeat(indentLevel);
            
            // 按字母顺序排序类别
            const sortedCategories = Object.keys(categoryDict).sort();
            
            for (const category of sortedCategories) {
                const items = categoryDict[category];
                
                // 处理特殊键 "_items"
                if (category === "_items") {
                    // 直接添加书签，不创建额外的整理文件夹
                    const sortedItems = [...items].sort((a, b) => 
                        (a.title || "").localeCompare(b.title || ""));
                        
                    for (const bookmark of sortedItems) {
                        result += `${indent}<DT><A HREF="${bookmark.url || ""}"`;
                        if (bookmark.add_date) {
                            result += ` ADD_DATE="${bookmark.add_date}"`;
                        }
                        if (bookmark.icon) {
                            result += ` ICON="${bookmark.icon}"`;
                        }
                        result += `>${bookmark.title || ""}</A>\n`;
                    }
                    continue;
                }
                
                // 创建整理文件夹
                result += `${indent}<DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${category}</H3>\n`;
                result += `${indent}<DL><p>\n`;
                
                if (isObject(items)) { // 这是一个子整理
                    // 递归添加子整理
                    result += formatCategory(items, indentLevel + 1);
                    
                    // 如果字典中有 "_items" 键，也需要添加这些书签
                    if (items["_items"]) {
                        const sortedItems = [...items["_items"]].sort((a, b) => 
                            (a.title || "").localeCompare(b.title || ""));
                            
                        for (const bookmark of sortedItems) {
                            result += `${indent}    <DT><A HREF="${bookmark.url || ""}"`;
                            if (bookmark.add_date) {
                                result += ` ADD_DATE="${bookmark.add_date}"`;
                            }
                            if (bookmark.icon) {
                                result += ` ICON="${bookmark.icon}"`;
                            }
                            result += `>${bookmark.title || ""}</A>\n`;
                        }
                    }
                } else { // 这是一个书签列表
                    const sortedItems = [...items].sort((a, b) => 
                        (a.title || "").localeCompare(b.title || ""));
                        
                    for (const bookmark of sortedItems) {
                        result += `${indent}    <DT><A HREF="${bookmark.url || ""}"`;
                        if (bookmark.add_date) {
                            result += ` ADD_DATE="${bookmark.add_date}"`;
                        }
                        if (bookmark.icon) {
                            result += ` ICON="${bookmark.icon}"`;
                        }
                        result += `>${bookmark.title || ""}</A>\n`;
                    }
                }
                
                result += `${indent}</DL><p>\n`;
            }
            
            return result;
        };
        
        // 添加所有整理和书签
        html += formatCategory(bookmarksByCategory);
        
        // 关闭主DL标签
        html += '    </DL><p>\n';
        html += '</DL><p>\n';
        
        return html;
    }
};

// 辅助函数：检查是否是对象
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}
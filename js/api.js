/**
 * API请求处理模块
 */
const ApiHandler = {

    system_prompt: `\n\n书签数据格式如下JSON所示：\n{batch_json}\n\n请输出JSON格式的结果，保留原始书签的所有字段，并添加一个名为"category"的字段来表示你分配的类别。\n分类应当尽可能详细且合理。\n只返回JSON格式的结果，不要添加任何其他解释文本。`,

    /**
     * 使用大模型API进行书签整理
     * @param {Array} batch - 需要整理的书签批次
     * @param {Object} config - API配置
     * @returns {Promise<Array>} 整理后的书签
     */
    async categorizeBookmarks(batch, config) {
        try {
            // 更新UI状态，显示处理中
            UI.showApiProcessingStatus(true, "正在调用大模型API进行分类...");
            
            // 清理书签数据，移除icon和add_date
            const cleanedBatch = batch.map(bookmark => {
                const { icon, add_date, ...cleanBookmark } = bookmark;
                return cleanBookmark;
            });
            
            let prompt = config.prompt;
            // 获取之前的分类情况
            const existingCategories = this.extractExistingCategories();
        
            // 将现有分类信息添加到提示词中
            if (existingCategories && existingCategories.length > 0) {
                prompt += `\n\n请尽量使用以下已有的分类类别:\n${existingCategories.join('\n')}`;
            }
            prompt += this.system_prompt;
    
            // 添加书签数据到提示词中
            const batchJson = JSON.stringify(cleanedBatch, null, 2);
            prompt = prompt.replace('{batch_json}', batchJson);
            
            console.log("API请求提示词:", prompt);
            
            // 更新状态提示
            UI.updateApiProcessingStatus("正在发送请求到大模型...");
            
            // 调用API
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.modelName,
                    messages: [
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 4000
                })
            });
            
            // 更新状态提示
            UI.updateApiProcessingStatus("大模型响应已收到，正在处理结果...");
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API请求失败 (${response.status}): ${errorText}`);
            }
            
            const data = await response.json();
            console.log("API响应:", data);
            
            // 从响应中提取内容
            const content = data.choices[0].message.content;
            
            // 更新状态提示
            UI.updateApiProcessingStatus("正在解析大模型返回的JSON结果...");
            
            // 从内容中提取JSON
            let jsonResult;
            try {
                // 尝试直接解析整个内容
                jsonResult = JSON.parse(content);
            } catch (e) {
                // 如果失败，尝试提取markdown代码块中的JSON
                const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    jsonResult = JSON.parse(jsonMatch[1]);
                } else {
                    // 如果仍然失败，尝试查找第一个 [ 和最后一个 ]
                    const start = content.indexOf('[');
                    const end = content.lastIndexOf(']') + 1;
                    if (start >= 0 && end > start) {
                        jsonResult = JSON.parse(content.substring(start, end));
                    } else {
                        throw new Error("无法从API响应中提取JSON");
                    }
                }
            }
            
            // 更新UI状态，隐藏处理中提示
            UI.showApiProcessingStatus(false);
            return jsonResult;
        } catch (error) {
            // 发生错误时，更新UI状态，显示错误信息
            UI.showApiProcessingStatus(false);
            console.error("整理API请求错误:", error);
            throw error;
        }
    },

    /**
     * 从现有的分类书签中提取分类类别
     * @returns {Array} 现有的分类类别
     */
    extractExistingCategories() {
        // 获取已分类的书签数据
        const categorizedBookmarks = Storage.getCategorizedBookmarks();
        if (!categorizedBookmarks || categorizedBookmarks.length === 0) {
            return [];
        }
        
        // 收集所有已使用的类别
        const categories = new Set();
        categorizedBookmarks.forEach(bookmark => {
            if (bookmark.category) {
                categories.add(bookmark.category);
            }
        });
        
        return Array.from(categories);
    },
};
/**
 * Lớp xử lý kết nối và tương tác với MongoDB Data API
 * Cung cấp các phương thức để thực hiện các thao tác CRUD trên MongoDB
 * Hỗ trợ dự phòng vào localStorage khi không có kết nối
 */
class MongoDB {
    constructor(config) {
        console.log("Initializing MongoDB class");
        
        // Lấy cấu hình từ config được truyền vào hoặc biến toàn cục CONFIG
        const cfg = config || (window.CONFIG || {});
        
        // Sử dụng giá trị cấu hình với giá trị mặc định
        this.apiKey = cfg.MONGODB_API_KEY || "data-yourapi"; 
        this.privateKey = cfg.MONGODB_PRIVATE_KEY || "603be368-8b71-4e66-8b30-d1cacb64ac50";
        this.connectionString = cfg.MONGODB_CONNECTION_STRING || "mongodb+srv://tam2632005:123@tamtam.0fe2k.mongodb.net/BE?retryWrites=true&w=majority&appName=tamtam";
        this.database = cfg.MONGODB_DATABASE || "BE";
        this.dataSource = cfg.MONGODB_DATA_SOURCE || "tamtam";
        this.isConnected = false;
        this.connectAttempts = 0;
        this.maxConnectAttempts = 3;
        
        // Cờ để bật tính năng dự phòng vào localStorage
        this.useLocalFallback = cfg.LOCAL_STORAGE_FALLBACK !== false;
        
        // Kết nối trong constructor mà không gây chặn
        setTimeout(() => {
            this.connect().then(connected => {
                if (connected) {
                    console.log("MongoDB connected successfully during initialization");
                } else {
                    console.warn("MongoDB connection failed during initialization, using local storage");
                    if (window.mainView) {
                        window.mainView.showNotification("Không thể kết nối đến cơ sở dữ liệu. Đang sử dụng lưu trữ cục bộ.", "warning");
                    }
                }
            }).catch(err => {
                console.error("MongoDB initialization error:", err);
            });
        }, 0);
    }

    /**
     * Gửi yêu cầu đến MongoDB Data API
     * @param {string} action - Hành động cần thực hiện (find, insertOne, updateOne, deleteOne)
     * @param {string} collection - Tên bộ sưu tập (collection)
     * @param {object} payload - Dữ liệu kèm theo yêu cầu
     * @returns {Promise<object>} Kết quả từ API
     * @throws {Error} Lỗi nếu yêu cầu thất bại
     */
    async request(action, collection, payload) {
        try {
            if (window.CONFIG && window.CONFIG.DEBUG_MODE) {
                console.log(`Making MongoDB request: ${action} to collection ${collection}`, payload);
            }
            
            // Ghi log nỗ lực kết nối
            console.log(`Connecting to MongoDB Data API with app ID: ${this.apiKey}`);
            console.log(`Database: ${this.database}, Collection: ${collection}`);
            
            // URL endpoint API - đảm bảo đúng định dạng data-xxx cho app ID
            let appId = this.apiKey;
            if (!appId.startsWith('data-')) {
                appId = 'data-' + appId;
                console.log(`Corrected appId format: ${appId}`);
            }
            
            // Loại bỏ khoảng trắng nếu có
            appId = appId.trim();
            
            const apiEndpoint = `https://data.mongodb-api.com/app/${appId}/endpoint/data/v1/action/${action}`;
            console.log(`API Endpoint: ${apiEndpoint}`);
            
            // Chuẩn bị body request
            const requestBody = JSON.stringify({
                dataSource: this.dataSource,
                database: this.database,
                collection: collection,
                ...payload
            });
            
            // Thực hiện request
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.privateKey,
                    'Access-Control-Request-Headers': '*'
                },
                body: requestBody
            });

            // In response headers để debug
            console.log("Response headers:", Object.fromEntries([...response.headers.entries()]));

            // Kiểm tra lỗi
            if (!response.ok) {
                let errorData = {};
                let errorText = "";
                
                try {
                    errorText = await response.text();
                    try {
                        errorData = JSON.parse(errorText);
                    } catch (e) {
                        console.warn("Response is not JSON:", errorText);
                    }
                } catch (e) {
                    console.warn("Could not read error response:", e);
                }
                
                console.error("MongoDB API Response Error:", response.status, errorData, errorText);
                
                // Xử lý các trường hợp lỗi cụ thể
                if (errorText.includes("cannot find app") || errorText.includes("Invalid API key")) {
                    this.isConnected = false;
                    const errorMsg = "Lỗi cấu hình MongoDB: API key không hợp lệ. Đang sử dụng lưu trữ cục bộ.";
                    if (window.mainView) window.mainView.showNotification(errorMsg, "error");
                    console.error("Invalid MongoDB API Key or Configuration:", this.apiKey);
                    throw new Error("Invalid MongoDB API Key or Configuration");
                }
                
                // Nếu không được ủy quyền, thử kết nối lại
                if (response.status === 401) {
                    this.isConnected = false;
                    console.log("Authentication failed, trying to reconnect...");
                    if (await this.connect()) {
                        return this.request(action, collection, payload);
                    }
                }
                
                throw new Error(`MongoDB API Error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
            }

            // Trích xuất kết quả
            const result = await response.json();
            console.log(`MongoDB response for ${action} on ${collection}:`, result);
            
            this.isConnected = true; // Đánh dấu kết nối thành công
            return result;
        } catch (error) {
            console.error(`Error calling MongoDB Data API (${action}):`, error.message);
            
            // Dự phòng vào localStorage nếu MongoDB không khả dụng
            if (this.useLocalFallback) {
                if (action === 'find') {
                    const localData = JSON.parse(localStorage.getItem(collection) || '[]');
                    console.log(`Falling back to local storage for ${collection}, found ${localData.length} items`);
                    return { documents: localData };
                } else if (action === 'insertOne') {
                    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
                    
                    // Save to localStorage if document is included
                    if (payload.document) {
                        const localCollection = JSON.parse(localStorage.getItem(collection) || '[]');
                        localCollection.push({...payload.document, _id: localId});
                        localStorage.setItem(collection, JSON.stringify(localCollection));
                        console.log(`Document saved to local storage with ID: ${localId}`);
                    }
                    
                    return { insertedId: localId };
                } else if (action === 'updateOne' || action === 'deleteOne') {
                    // Just return a mock response
                    return { modifiedCount: 1 };
                }
            }
            
            throw error;
        }
    }

    /**
     * Kết nối đến MongoDB
     * @returns {Promise<boolean>} true nếu kết nối thành công, false nếu thất bại
     */
    async connect() {
        if (this.isConnected) {
            console.log("Already connected to MongoDB");
            return true;
        }
        
        if (this.connectAttempts >= this.maxConnectAttempts) {
            console.warn(`Reached maximum connection attempts (${this.maxConnectAttempts}). Using local storage fallback.`);
            return false;
        }
        
        this.connectAttempts++;
        
        try {
            console.log(`Attempting to connect to MongoDB (attempt ${this.connectAttempts})...`);
            console.log(`Using app ID: ${this.apiKey}, database: ${this.database}, dataSource: ${this.dataSource}`);
            
            // Kiểm tra kết nối bằng một truy vấn đơn giản
            const result = await this.request('find', 'User', {
                filter: {},
                limit: 1
            });
            
            if (result && (result.documents !== undefined)) {
                console.log("MongoDB connection successful!", result);
                this.isConnected = true;
                this.connectAttempts = 0; // Reset số lần thử kết nối
                
                // Thông báo kết nối thành công
                if (window.mainView) {
                    window.mainView.showNotification("Đã kết nối đến cơ sở dữ liệu thành công.", "success", 3000);
                }
                
                // Đồng bộ dữ liệu từ localStorage lên MongoDB nếu có
                this.syncLocalToMongoDB();
                
                return true;
            } else {
                console.warn("MongoDB connection test returned unexpected result:", result);
                this.isConnected = false;
                return false;
            }
        } catch (error) {
            console.error("MongoDB connection error:", error.message);
            
            // Thử kết nối với collection Admin nếu User không tồn tại
            try {
                console.log("Trying to connect to Admin collection...");
                const adminResult = await this.request('find', 'Admin', {
                    filter: {},
                    limit: 1
                });
                
                if (adminResult && (adminResult.documents !== undefined)) {
                    console.log("MongoDB connection successful via Admin collection!", adminResult);
                    this.isConnected = true;
                    this.connectAttempts = 0; // Reset số lần thử kết nối
                    
                    // Đồng bộ dữ liệu từ localStorage lên MongoDB 
                    this.syncLocalToMongoDB();
                    
                    return true;
                }
            } catch (adminError) {
                console.error("Admin collection connection failed too:", adminError.message);
            }
            
            // Hiện thông báo khi có lỗi kết nối
            if (window.mainView) {
                window.mainView.showNotification("Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau hoặc tiếp tục sử dụng ở chế độ offline.", "error");
            }
            
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Lưu dữ liệu vào MongoDB hoặc localStorage
     * @param {string} collection - Tên bộ sưu tập
     * @param {object} data - Dữ liệu cần lưu
     * @returns {Promise<object>} Kết quả lưu dữ liệu
     */
    async save(collection, data) {
        try {
            // Thêm timestamps tự động
            if (!data.createdAt) {
                data.createdAt = new Date().toISOString();
            }
            data.updatedAt = new Date().toISOString();
            
            if (!this.isConnected) {
                const connected = await this.connect();
                if (!connected) {
                console.warn("Not connected to MongoDB, saving to local storage only");
                    const localResult = this.saveLocal(collection, data);
                    
                    // Đánh dấu cần đồng bộ lên MongoDB sau
                    this.markForSync(collection, localResult);
                    
                    return { insertedId: localResult._id || `local_${Date.now()}` };
                }
            }
            
            // Đảm bảo dữ liệu lưu trữ đúng cách
            const cleanData = this.prepareDataForSave(data);
            
            const result = await this.request('insertOne', collection, {
                document: cleanData
            });
            console.log(`Đã lưu vào collection ${collection}:`, result);
            
            // Đồng thời lưu cục bộ như bản sao dự phòng
            this.saveLocal(collection, { ...cleanData, _id: result.insertedId });
            
            return result;
        } catch (error) {
            console.error(`Lỗi khi lưu vào collection ${collection}:`, error);
            
            if (window.mainView) {
                window.mainView.showNotification(`Lỗi khi lưu dữ liệu: ${error.message}`, "error");
            } else {
                console.error(`Notification error: ${error.message}`);
            }
            
            // Dự phòng vào localStorage
            const localResult = this.saveLocal(collection, data);
            
            // Đánh dấu cần đồng bộ lên MongoDB sau
            this.markForSync(collection, localResult);
            
            return { insertedId: localResult._id || `local_${Date.now()}` };
        }
    }
    
    /**
     * Chuẩn bị dữ liệu trước khi lưu vào MongoDB
     * Chuyển đổi các dữ liệu đặc biệt và làm sạch
     * @param {Object} data - Dữ liệu cần chuẩn bị
     * @returns {Object} Dữ liệu đã làm sạch
     */
    prepareDataForSave(data) {
        // Tạo bản sao để không ảnh hưởng đến dữ liệu gốc
        const cleanData = JSON.parse(JSON.stringify(data));
        
        // Giới hạn kích thước dữ liệu base64 nếu có
        if (cleanData.base64Content && cleanData.base64Content.length > 16 * 1024 * 1024) {
            console.warn("base64Content is too large, truncating to 16MB limit");
            cleanData.base64Content = cleanData.base64Content.substring(0, 16 * 1024 * 1024);
            cleanData.isContentTruncated = true;
        }
        
        return cleanData;
    }
    
    /**
     * Đánh dấu bản ghi cần đồng bộ với MongoDB khi có kết nối
     * @param {string} collection - Tên bộ sưu tập
     * @param {object} data - Dữ liệu cần đồng bộ
     */
    markForSync(collection, data) {
        const pendingSyncs = JSON.parse(localStorage.getItem('pendingMongoSync') || '[]');
        pendingSyncs.push({
            collection,
            data,
            timestamp: Date.now()
        });
        localStorage.setItem('pendingMongoSync', JSON.stringify(pendingSyncs));
    }
    
    /**
     * Đồng bộ dữ liệu từ localStorage lên MongoDB
     * Được gọi tự động khi kết nối thành công
     */
    async syncLocalToMongoDB() {
        if (!this.isConnected) {
            console.warn("Cannot sync to MongoDB: not connected");
            return;
        }
        
        const pendingSyncs = JSON.parse(localStorage.getItem('pendingMongoSync') || '[]');
        if (pendingSyncs.length === 0) {
            console.log("No pending syncs to process");
            return;
        }
        
        console.log(`Processing ${pendingSyncs.length} pending syncs...`);
        
        const successfulSyncs = [];
        
        for (let i = 0; i < pendingSyncs.length; i++) {
            const syncItem = pendingSyncs[i];
            try {
                console.log(`Syncing item ${i+1}/${pendingSyncs.length} to collection ${syncItem.collection}`);
                
                // Nếu có _id bắt đầu bằng local_, tạo mới thay vì cập nhật
                const data = syncItem.data;
                const isLocalId = data._id && data._id.toString().startsWith('local_');
                
                if (isLocalId) {
                    delete data._id; // Xóa id cục bộ để MongoDB tạo ID mới
                    await this.request('insertOne', syncItem.collection, {
                        document: data
                    });
                } else {
                    // Cập nhật nếu có _id thực
                    await this.request('updateOne', syncItem.collection, {
                        filter: { _id: data._id },
                        update: { $set: data },
                        upsert: true
                    });
                }
                
                successfulSyncs.push(i);
            } catch (error) {
                console.error(`Error syncing item ${i} to MongoDB:`, error);
            }
        }
        
        // Xóa các sync đã thành công
        const newPendingSyncs = pendingSyncs.filter((_, index) => !successfulSyncs.includes(index));
        localStorage.setItem('pendingMongoSync', JSON.stringify(newPendingSyncs));
        
        console.log(`Synced ${successfulSyncs.length}/${pendingSyncs.length} items. ${newPendingSyncs.length} items remaining.`);
    }
    
    /**
     * Lưu tệp tin lên MongoDB
     * Phương thức đặc biệt để xử lý tệp tin hiệu quả
     * @param {string} collection - Tên bộ sưu tập (thường là MultimediaStorage)
     * @param {object} fileData - Dữ liệu tệp tin
     * @returns {Promise<object>} Kết quả lưu tệp tin
     */
    async saveFile(collection, fileData) {
        try {
            if (!fileData.id) {
                fileData.id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            }
            
            fileData.uploadDate = fileData.uploadDate || new Date().toISOString();
            fileData.updatedAt = new Date().toISOString();
            
            // Cố gắng kết nối MongoDB trước khi lưu
            await this.connect();
            
            // Nếu vẫn không kết nối được, lưu cục bộ
            if (!this.isConnected) {
                console.warn("MongoDB not connected, saving file to localStorage");
                const localResult = this.saveLocal(collection, fileData);
                this.markForSync(collection, localResult);
                return { id: fileData.id, insertedId: `local_${Date.now()}` };
            }
            
            console.log(`Saving file to MongoDB collection ${collection}:`, fileData.name);
            
            // Phân tách nội dung base64 để hiệu quả hơn trong MongoDB
            let contentDocument = null;
            if (fileData.base64Content) {
                // Lưu nội dung vào collection riêng nếu quá lớn
                if (fileData.base64Content.length > 500000) { // ~500KB
                    contentDocument = {
                        fileId: fileData.id,
                        userId: fileData.userId,
                        content: fileData.base64Content,
                        contentType: fileData.type || 'application/octet-stream',
                        uploadDate: fileData.uploadDate
                    };
                    
                    // Lưu nội dung vào collection riêng
                    const contentResult = await this.request('insertOne', 'FileContents', {
                        document: contentDocument
                    });
                    
                    console.log("File content saved separately:", contentResult);
                    
                    // Xóa nội dung khỏi dữ liệu chính và lưu tham chiếu
                    delete fileData.base64Content;
                    fileData.contentId = contentResult.insertedId;
                    fileData.hasExternalContent = true;
                }
            }
            
            // Lưu thông tin tệp tin (không có nội dung hoặc đã tối ưu kích thước)
            const result = await this.request('insertOne', collection, {
                document: fileData
            });
            
            console.log(`File metadata saved to ${collection}:`, result);
            
            // Cập nhật ID MongoDB vào dữ liệu
            fileData._id = result.insertedId;
            
            // Lưu vào localStorage để xử lý ngoại tuyến
            this.saveLocal(collection, fileData);
            
            return { ...result, id: fileData.id };
        } catch (error) {
            console.error(`Error saving file to MongoDB:`, error);
            
            // Hiện thông báo lỗi
            if (window.mainView) {
                window.mainView.showNotification(`Lỗi khi lưu tệp tin: ${error.message}`, "error");
            }
            
            // Fallback to local storage
            const localResult = this.saveLocal(collection, fileData);
            this.markForSync(collection, localResult);
            
            return { id: fileData.id, insertedId: `local_${Date.now()}` };
        }
    }
    
    /**
     * Lấy nội dung tệp tin từ MongoDB
     * @param {string} fileId - ID của tệp tin
     * @returns {Promise<object>} Nội dung tệp tin
     */
    async getFileContent(fileId) {
        try {
            // Đảm bảo có kết nối MongoDB
            if (!this.isConnected && !await this.connect()) {
                throw new Error("Không thể kết nối đến MongoDB");
            }
            
            // Tìm tệp tin trong collection MultimediaStorage
            const fileResult = await this.request('find', 'MultimediaStorage', {
                filter: { id: fileId },
                limit: 1
            });
            
            if (!fileResult.documents || fileResult.documents.length === 0) {
                throw new Error(`Không tìm thấy tệp tin với ID ${fileId}`);
            }
            
            const fileData = fileResult.documents[0];
            
            // Nếu nội dung được lưu trực tiếp trong tệp
            if (fileData.base64Content) {
                return {
                    id: fileId,
                    content: fileData.base64Content,
                    contentType: fileData.type || 'application/octet-stream',
                    fileName: fileData.name
                };
            }
            
            // Nếu nội dung được lưu trong collection riêng
            if (fileData.hasExternalContent && fileData.contentId) {
                const contentResult = await this.request('find', 'FileContents', {
                    filter: { 
                        $or: [
                            { _id: fileData.contentId },
                            { fileId: fileId }
                        ]
                    },
                    limit: 1
                });
                
                if (!contentResult.documents || contentResult.documents.length === 0) {
                    throw new Error(`Không tìm thấy nội dung tệp tin với ID ${fileId}`);
                }
                
                const contentData = contentResult.documents[0];
                
                return {
                    id: fileId,
                    content: contentData.content,
                    contentType: fileData.type || contentData.contentType || 'application/octet-stream',
                    fileName: fileData.name
                };
            }
            
            throw new Error(`Không tìm thấy nội dung của tệp tin ${fileId}`);
        } catch (error) {
            console.error(`Error retrieving file content:`, error);
            
            // Thử lấy từ localStorage
            const fileKey = `mediaVault_file_${fileId}`;
            const localContent = localStorage.getItem(fileKey);
            
            if (localContent) {
                return {
                    id: fileId,
                    content: localContent,
                    contentType: 'application/octet-stream',
                    fileName: fileId
                };
            }
            
            throw error;
        }
    }
    
    /**
     * Phương thức hỗ trợ để lưu dữ liệu vào localStorage
     * @param {string} collection - Tên bộ sưu tập
     * @param {object} data - Dữ liệu cần lưu
     * @returns {object} Dữ liệu đã lưu
     */
    saveLocal(collection, data) {
        const localData = JSON.parse(localStorage.getItem(collection) || '[]');
        localData.push(data);
        localStorage.setItem(collection, JSON.stringify(localData));
        console.log(`Saved to local storage: ${collection}`);
        return data;
    }

    /**
     * Tìm kiếm dữ liệu trong MongoDB hoặc localStorage
     * @param {string} collection - Tên bộ sưu tập
     * @param {object} query - Điều kiện tìm kiếm
     * @returns {Promise<Array>} Mảng các đối tượng thỏa mãn điều kiện
     */
    async find(collection, query = {}) {
        try {
            if (!this.isConnected && !await this.connect()) {
                console.warn("Not connected to MongoDB, reading from local storage only");
                const localData = JSON.parse(localStorage.getItem(collection) || '[]');
                return this.filterLocalData(localData, query);
            }
            
            const result = await this.request('find', collection, {
                filter: query
            });
            return result.documents || [];
        } catch (error) {
            console.error(`Lỗi khi tìm trong collection ${collection}:`, error);
            
            if (window.mainView) {
                window.mainView.showNotification(`Lỗi khi truy vấn dữ liệu: ${error.message}`, "error");
            } else {
                console.error(`Notification error: ${error.message}`);
            }
            
            // Dự phòng vào localStorage
            const localData = JSON.parse(localStorage.getItem(collection) || '[]');
            return this.filterLocalData(localData, query);
        }
    }
    
    /**
     * Phương thức hỗ trợ để lọc dữ liệu trong localStorage
     * @param {Array} data - Dữ liệu cần lọc
     * @param {object} query - Điều kiện lọc
     * @returns {Array} Mảng các đối tượng thỏa mãn điều kiện
     */
    filterLocalData(data, query) {
        if (!query || Object.keys(query).length === 0) {
            return data;
        }
        
        return data.filter(item => {
            for (const [key, value] of Object.entries(query)) {
                if (key === '$or' && Array.isArray(value)) {
                    const orResult = value.some(orClause => {
                        for (const [orKey, orValue] of Object.entries(orClause)) {
                            if (item[orKey] === orValue) {
                                return true;
                            }
                        }
                        return false;
                    });
                    if (!orResult) return false;
                } else if (item[key] !== value) {
                    return false;
                }
            }
            return true;
        });
    }
    
    /**
     * Cập nhật dữ liệu trong MongoDB hoặc localStorage
     * @param {string} collection - Tên bộ sưu tập
     * @param {object} filter - Điều kiện lọc
     * @param {object} update - Dữ liệu cập nhật
     * @returns {Promise<object>} Kết quả cập nhật
     */
    async update(collection, filter, update) {
        try {
            if (!this.isConnected && !await this.connect()) {
                console.warn("Not connected to MongoDB, updating local storage only");
                this.updateLocal(collection, filter, update);
                return { modifiedCount: 1 };
            }
            
            const result = await this.request('updateOne', collection, {
                filter: filter,
                update: { $set: update }
            });
            
            // Đồng thời cập nhật cục bộ
            this.updateLocal(collection, filter, update);
            
            return result;
        } catch (error) {
            console.error(`Lỗi khi cập nhật collection ${collection}:`, error);
            
            if (window.mainView) {
                window.mainView.showNotification(`Lỗi khi cập nhật dữ liệu: ${error.message}`, "error");
            } else {
                console.error(`Notification error: ${error.message}`);
            }
            
            // Dự phòng vào localStorage
            this.updateLocal(collection, filter, update);
            return { modifiedCount: 1 };
        }
    }
    
    /**
     * Phương thức hỗ trợ để cập nhật dữ liệu trong localStorage
     * @param {string} collection - Tên bộ sưu tập
     * @param {object} filter - Điều kiện lọc
     * @param {object} update - Dữ liệu cập nhật
     * @returns {object} Kết quả cập nhật
     */
    updateLocal(collection, filter, update) {
        const localData = JSON.parse(localStorage.getItem(collection) || '[]');
        let updated = false;
        
        const updatedData = localData.map(item => {
            let match = true;
            for (const [key, value] of Object.entries(filter)) {
                if (item[key] !== value) {
                    match = false;
                    break;
                }
            }
            
            if (match) {
                updated = true;
                return { ...item, ...update };
            }
            return item;
        });
        
        localStorage.setItem(collection, JSON.stringify(updatedData));
        console.log(`Updated in local storage: ${collection}, updated: ${updated}`);
        return { modifiedCount: updated ? 1 : 0 };
    }
    
    /**
     * Xóa dữ liệu từ MongoDB hoặc localStorage
     * @param {string} collection - Tên bộ sưu tập
     * @param {object} filter - Điều kiện lọc
     * @returns {Promise<object>} Kết quả xóa
     */
    async delete(collection, filter) {
        try {
            if (!this.isConnected && !await this.connect()) {
                console.warn("Not connected to MongoDB, deleting from local storage only");
                this.deleteLocal(collection, filter);
                return { deletedCount: 1 };
            }
            
            const result = await this.request('deleteOne', collection, {
                filter: filter
            });
            
            // Đồng thời xóa cục bộ
            this.deleteLocal(collection, filter);
            
            return result;
        } catch (error) {
            console.error(`Lỗi khi xóa từ collection ${collection}:`, error);
            
            if (window.mainView) {
                window.mainView.showNotification(`Lỗi khi xóa dữ liệu: ${error.message}`, "error");
            } else {
                console.error(`Notification error: ${error.message}`);
            }
            
            // Dự phòng vào localStorage
            this.deleteLocal(collection, filter);
            return { deletedCount: 1 };
        }
    }
    
    /**
     * Phương thức hỗ trợ để xóa dữ liệu từ localStorage
     * @param {string} collection - Tên bộ sưu tập
     * @param {object} filter - Điều kiện lọc
     * @returns {object} Kết quả xóa
     */
    deleteLocal(collection, filter) {
        const localData = JSON.parse(localStorage.getItem(collection) || '[]');
        
        const filteredData = localData.filter(item => {
            if (filter.$or) {
                return !filter.$or.some(orClause => {
                    for (const [key, value] of Object.entries(orClause)) {
                        if (item[key] === value) {
                            return true;
                        }
                    }
                    return false;
                });
            }
            
            for (const [key, value] of Object.entries(filter)) {
                if (item[key] === value) {
                    return false;
                }
            }
            return true;
        });
        
        localStorage.setItem(collection, JSON.stringify(filteredData));
        console.log(`Deleted from local storage: ${collection}, removed: ${localData.length - filteredData.length}`);
        return { deletedCount: localData.length - filteredData.length };
    }
    
    /**
     * Hàm kiểm tra kết nối
     * @returns {Promise<boolean>} true nếu kết nối thành công, false nếu thất bại
     */
    async testConnection() {
        try {
            const result = await fetch('https://data.mongodb-api.com/app/data-api/endpoint/data/v1/status', {
                method: 'GET'
            });
            
            if (result.ok) {
                console.log("MongoDB API status endpoint is reachable.");
                return true;
            } else {
                console.error("MongoDB API status endpoint returned error:", result.status);
                return false;
            }
        } catch (error) {
            console.error("Cannot reach MongoDB API:", error);
            return false;
        }
    }
}
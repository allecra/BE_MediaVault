/**
 * Lớp xử lý kết nối và tương tác với MongoDB Data API
 * Cung cấp các phương thức để thực hiện các thao tác CRUD trên MongoDB
 * Hỗ trợ dự phòng vào localStorage khi không có kết nối
 */
class MongoDB {
    constructor(config) {
        // Lấy cấu hình từ config được truyền vào hoặc biến toàn cục CONFIG
        const cfg = config || (window.CONFIG || {});
        
        // Sử dụng giá trị cấu hình với giá trị mặc định
        this.apiKey = cfg.MONGODB_API_KEY || "data-yourapi"; 
        this.privateKey = cfg.MONGODB_PRIVATE_KEY || "603be368-8b71-4e66-8b30-d1cacb64ac50";
        this.connectionString = cfg.MONGODB_CONNECTION_STRING || "mongodb+srv://tam2632005:123@tamtam.0fe2k.mongodb.net/BE?retryWrites=true&w=majority&appName=tamtam";
        this.database = cfg.MONGODB_DATABASE || "BE";
        this.dataSource = cfg.MONGODB_DATA_SOURCE || "tamtam";
        this.isConnected = false;
        
        // Cờ để bật tính năng dự phòng vào localStorage
        this.useLocalFallback = cfg.LOCAL_STORAGE_FALLBACK !== false;
        
        // Thử kết nối ban đầu
        this.connect().catch(err => {
            console.warn("Initial MongoDB connection failed:", err.message);
            if (window.mainView) {
                window.mainView.showNotification("Không thể kết nối đến cơ sở dữ liệu. Đang sử dụng lưu trữ cục bộ.", "warning");
            }
        });
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
            
            // URL endpoint API đã sửa
            const response = await fetch(`https://data.mongodb-api.com/app/${this.apiKey}/endpoint/data/v1/action/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.privateKey,
                },
                body: JSON.stringify({
                    dataSource: this.dataSource,
                    database: this.database,
                    collection: collection,
                    ...payload
                })
            });

            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.warn("Could not parse error response as JSON:", e);
                }
                
                console.error("MongoDB API Response Error:", response.status, errorData);
                
                // Xử lý các trường hợp lỗi cụ thể
                if (errorData.error && errorData.error.includes("cannot find app")) {
                    this.isConnected = false;
                    const errorMsg = "Lỗi cấu hình MongoDB: App ID không hợp lệ. Đang sử dụng lưu trữ cục bộ.";
                    if (window.mainView) window.mainView.showNotification(errorMsg, "error");
                    console.error("Invalid MongoDB App ID:", this.apiKey);
                    throw new Error("Invalid MongoDB App ID");
                }
                
                // Nếu không được ủy quyền, thử kết nối lại
                if (response.status === 401) {
                    this.isConnected = false;
                    console.log("Authentication failed, trying to reconnect...");
                    if (await this.connect()) {
                        return this.request(action, collection, payload);
                    }
                }
                
                throw new Error(`MongoDB API Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
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
                    // Tạo ID cục bộ ngẫu nhiên
                    return { insertedId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}` };
                } else if (action === 'updateOne' || action === 'deleteOne') {
                    // Chỉ trả về phản hồi giả lập
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
        try {
            console.log("Attempting to connect to MongoDB...");
            console.log(`Using app ID: ${this.apiKey}, database: ${this.database}, dataSource: ${this.dataSource}`);
            
            // Kiểm tra kết nối bằng một truy vấn đơn giản tới bộ sưu tập Users
            const result = await this.request('find', 'Users', {
                filter: {},
                limit: 1
            });
            
            console.log("MongoDB connection successful! Found collections:", result);
            this.isConnected = true;
            return true;
        } catch (error) {
            console.error("MongoDB connection error:", error.message);
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
            if (!this.isConnected && !await this.connect()) {
                console.warn("Not connected to MongoDB, saving to local storage only");
                this.saveLocal(collection, data);
                return { insertedId: `local_${Date.now()}` };
            }
            
            const result = await this.request('insertOne', collection, {
                document: data
            });
            console.log(`Đã lưu vào collection ${collection}:`, result);
            
            // Đồng thời lưu cục bộ như bản sao dự phòng
            this.saveLocal(collection, { ...data, _id: result.insertedId });
            
            return result;
        } catch (error) {
            console.error(`Lỗi khi lưu vào collection ${collection}:`, error);
            
            if (window.mainView) {
                window.mainView.showNotification(`Lỗi khi lưu dữ liệu: ${error.message}`, "error");
            } else {
                console.error(`Notification error: ${error.message}`);
            }
            
            // Dự phòng vào localStorage
            this.saveLocal(collection, data);
            return { insertedId: `local_${Date.now()}` };
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
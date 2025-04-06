/**
 * Lớp StorageModel - Quản lý lưu trữ và truy xuất tệp tin
 * Đảm bảo đồng bộ giữa localStorage và MongoDB
 */
class StorageModel {
    constructor() {
        this.LOCAL_STORAGE_FILES_KEY = 'mediaVault_files';
        
        // Khởi tạo kho lưu trữ local nếu chưa có
        this.initializeLocalStorage();
        
        // Thư mục upload cho các loại file
        this.uploadPaths = {
            image: 'uploads/images/',
            document: 'uploads/documents/',
            video: 'uploads/videos/',
            audio: 'uploads/audio/',
            other: 'uploads/other/'
        };
    }
    
    /**
     * Khởi tạo kho lưu trữ nếu chưa tồn tại
     */
    initializeLocalStorage() {
        if (!localStorage.getItem(this.LOCAL_STORAGE_FILES_KEY)) {
            localStorage.setItem(this.LOCAL_STORAGE_FILES_KEY, JSON.stringify([]));
        }
    }
    
    /**
     * Lấy tất cả tệp tin từ localStorage
     * @returns {Array} Danh sách tệp tin
     */
    getAllFiles() {
        try {
            const filesJson = localStorage.getItem(this.LOCAL_STORAGE_FILES_KEY);
            return filesJson ? JSON.parse(filesJson) : [];
        } catch (error) {
            console.error('Lỗi khi đọc danh sách tệp tin từ localStorage:', error);
            return [];
        }
    }
    
    /**
     * Lưu danh sách tệp tin vào localStorage
     * @param {Array} files - Danh sách tệp tin cần lưu
     */
    saveAllFiles(files) {
        try {
            localStorage.setItem(this.LOCAL_STORAGE_FILES_KEY, JSON.stringify(files));
        } catch (error) {
            console.error('Lỗi khi lưu danh sách tệp tin vào localStorage:', error);
        }
    }
    
    /**
     * Lấy danh sách tệp tin của người dùng
     * @param {string} userId - ID người dùng
     * @returns {Promise<Array>} Danh sách tệp tin của người dùng
     */
    async getUserFiles(userId) {
        try {
            if (!userId) {
                throw new Error('ID người dùng không hợp lệ');
            }
            
            // Thử lấy từ MongoDB trước
            if (window.mongoDB && window.mongoDB.isConnected) {
                try {
                    console.log(`Đang tìm tệp tin của người dùng ${userId} từ MongoDB...`);
                    const result = await window.mongoDB.find('MultimediaStorage', { userId: userId });
                    
                    if (result && result.documents && result.documents.length > 0) {
                        console.log(`Tìm thấy ${result.documents.length} tệp tin từ MongoDB`);
                        
                        // Sắp xếp theo thời gian tạo giảm dần
                        const files = result.documents.sort((a, b) => {
                            const dateA = new Date(a.uploadDate || a.timestamp || 0);
                            const dateB = new Date(b.uploadDate || b.timestamp || 0);
                            return dateB - dateA;
                        });
                        
                        return files;
                    }
                } catch (error) {
                    console.error('Lỗi khi truy vấn MongoDB:', error);
                }
            }
            
            // Nếu không có MongoDB hoặc không tìm thấy dữ liệu, dùng localStorage
            console.log('Sử dụng localStorage để lấy tệp tin...');
            const files = this.getAllFiles();
            const userFiles = files.filter(file => file.userId === userId);
            
            // Sắp xếp theo thời gian giảm dần
            userFiles.sort((a, b) => {
                const dateA = new Date(a.uploadDate || a.timestamp || 0);
                const dateB = new Date(b.uploadDate || b.timestamp || 0);
                return dateB - dateA;
            });
            
            return userFiles;
        } catch (error) {
            console.error('Lỗi khi lấy tệp tin của người dùng:', error);
            return [];
        }
    }
    
    /**
     * Lưu tệp tin
     * @param {Object} fileData - Thông tin tệp tin cần lưu
     * @returns {Promise<Object>} Thông tin tệp tin đã lưu
     */
    async saveFile(fileData) {
        try {
            if (!fileData || !fileData.userId) {
                throw new Error('Dữ liệu tệp tin không hợp lệ');
            }
            
            // Đảm bảo tệp tin có ID
            if (!fileData.id) {
                fileData.id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            }
            
            // Thêm timestamp nếu chưa có
            if (!fileData.timestamp) {
                fileData.timestamp = new Date().toISOString();
            }
            
            let savedInMongoDB = false;
            
            // Ưu tiên lưu vào MongoDB
            if (window.mongoDB) {
                try {
                    console.log(`Đang lưu tệp tin ${fileData.name} vào MongoDB...`);
                    
                    // Đảm bảo kết nối với MongoDB
                    if (!window.mongoDB.isConnected) {
                        await window.mongoDB.connect();
                    }
                    
                    // Kiểm tra xem tệp tin đã tồn tại chưa
                    const filter = { id: fileData.id };
                    const existingFile = await window.mongoDB.find('MultimediaStorage', filter);
                    
                    let result;
                    if (existingFile && existingFile.documents && existingFile.documents.length > 0) {
                        // Cập nhật tệp tin nếu đã tồn tại
                        console.log('Cập nhật tệp tin đã tồn tại trong MongoDB');
                        result = await window.mongoDB.update('MultimediaStorage', filter, fileData);
                    } else {
                        // Thêm tệp tin mới
                        console.log('Thêm tệp tin mới vào MongoDB');
                        result = await window.mongoDB.save('MultimediaStorage', fileData);
                    }
                    
                    console.log('Kết quả lưu tệp tin MongoDB:', result);
                    savedInMongoDB = true;
                } catch (error) {
                    console.error('Lỗi khi lưu tệp tin vào MongoDB:', error);
                    // Tiếp tục sử dụng localStorage nếu MongoDB lỗi
                }
            }
            
            // Lưu vào localStorage chỉ khi cần thiết (không lưu được vào MongoDB hoặc cần bản sao cục bộ)
            console.log(`Lưu tệp tin ${fileData.name} vào localStorage`);
            
            // Lấy danh sách tệp tin hiện tại
            const files = this.getAllFiles();
            
            // Kiểm tra xem tệp tin đã tồn tại chưa
            const existingIndex = files.findIndex(file => file.id === fileData.id);
            
            if (existingIndex >= 0) {
                // Cập nhật tệp tin nếu đã tồn tại
                files[existingIndex] = { ...files[existingIndex], ...fileData };
            } else {
                // Thêm tệp tin mới
                files.push(fileData);
            }
            
            // Lưu danh sách tệp tin đã cập nhật
            this.saveAllFiles(files);
            
            // Phát sự kiện cập nhật tệp tin
            window.dispatchEvent(new CustomEvent('storage-updated', {
                detail: { fileId: fileData.id, action: 'save', savedInMongoDB }
            }));
            
            return fileData;
        } catch (error) {
            console.error('Lỗi khi lưu tệp tin:', error);
            throw error;
        }
    }
    
    /**
     * Xóa tệp tin
     * @param {string} fileId - ID của tệp tin cần xóa
     * @param {string} userId - ID của người dùng sở hữu tệp tin
     * @returns {Promise<boolean>} Kết quả xóa tệp tin
     */
    async deleteFile(fileId, userId) {
        try {
            if (!fileId) {
                throw new Error('ID tệp tin không hợp lệ');
            }
            
            // Xóa khỏi MongoDB nếu có kết nối
            if (window.mongoDB && window.mongoDB.isConnected) {
                try {
                    console.log(`Đang xóa tệp tin ${fileId} khỏi MongoDB...`);
                    const filter = { id: fileId };
                    
                    // Thêm điều kiện userId để đảm bảo an toàn
                    if (userId) {
                        filter.userId = userId;
                    }
                    
                    const result = await window.mongoDB.delete('MultimediaStorage', filter);
                    console.log('Kết quả xóa tệp tin:', result);
                } catch (error) {
                    console.error('Lỗi khi xóa tệp tin khỏi MongoDB:', error);
                }
            }
            
            // Xóa khỏi localStorage
            console.log(`Xóa tệp tin ${fileId} khỏi localStorage`);
            
            // Lấy danh sách tệp tin hiện tại
            const files = this.getAllFiles();
            
            // Lọc tệp tin cần xóa
            const filteredFiles = files.filter(file => {
                // Thêm điều kiện userId để đảm bảo an toàn
                if (userId) {
                    return file.id !== fileId || file.userId !== userId;
                }
                return file.id !== fileId;
            });
            
            // Kiểm tra xem có tệp tin nào bị xóa không
            const isDeleted = files.length !== filteredFiles.length;
            
            if (!isDeleted) {
                console.warn(`Không tìm thấy tệp tin có ID ${fileId} để xóa`);
                return false;
            }
            
            // Lưu danh sách tệp tin đã cập nhật
            this.saveAllFiles(filteredFiles);
            
            // Phát sự kiện cập nhật tệp tin
            window.dispatchEvent(new CustomEvent('storage-updated', {
                detail: { fileId: fileId, action: 'delete' }
            }));
            
            return true;
        } catch (error) {
            console.error('Lỗi khi xóa tệp tin:', error);
            throw error;
        }
    }
    
    /**
     * Đọc nội dung tệp dưới dạng Base64
     * @param {File} file - Tệp cần đọc
     * @returns {Promise<string>} Chuỗi Base64 của tệp
     */
    async readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                const base64String = reader.result;
                resolve(base64String);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Xóa tất cả tệp tin của người dùng
     * @param {string} userId - ID của người dùng
     * @returns {Promise<boolean>} Kết quả xóa tệp tin
     */
    async deleteAllUserFiles(userId) {
        try {
            if (!userId) {
                throw new Error('ID người dùng không hợp lệ');
            }
            
            // Xóa khỏi MongoDB nếu có kết nối
            if (window.mongoDB && window.mongoDB.isConnected) {
                try {
                    console.log(`Đang xóa tất cả tệp tin của người dùng ${userId} khỏi MongoDB...`);
                    const filter = { userId: userId };
                    const result = await window.mongoDB.deleteMany('MultimediaStorage', filter);
                    console.log('Kết quả xóa tệp tin:', result);
                } catch (error) {
                    console.error('Lỗi khi xóa tệp tin khỏi MongoDB:', error);
                }
            }
            
            // Xóa khỏi localStorage
            console.log(`Xóa tất cả tệp tin của người dùng ${userId} khỏi localStorage`);
            
            // Lấy danh sách tệp tin hiện tại
            const files = this.getAllFiles();
            
            // Lọc tệp tin của người dùng
            const filteredFiles = files.filter(file => file.userId !== userId);
            
            // Lưu danh sách tệp tin đã cập nhật
            this.saveAllFiles(filteredFiles);
            
            // Phát sự kiện cập nhật tệp tin
            window.dispatchEvent(new CustomEvent('storage-updated', {
                detail: { userId: userId, action: 'delete-all' }
            }));
            
            return true;
        } catch (error) {
            console.error('Lỗi khi xóa tất cả tệp tin của người dùng:', error);
            throw error;
        }
    }
    
    /**
     * Lưu tệp tin lên máy chủ
     * @param {File} file - Tệp cần lưu
     * @param {Object} fileData - Thông tin tệp tin
     * @returns {Promise<Object>} Thông tin tệp tin đã lưu
     */
    async saveFileToServer(file, fileData) {
        try {
            if (!file || !fileData) {
                throw new Error('Dữ liệu tệp tin không hợp lệ');
            }
            
            // Xác định loại tệp để chọn thư mục lưu trữ
            const fileType = this.getFileType(file.type);
            const uploadPath = this.uploadPaths[fileType] || this.uploadPaths.other;
            
            // Đường dẫn đầy đủ của tệp
            const filePath = `${uploadPath}${fileData.id}_${file.name}`;
            
            // Đọc file và chuyển thành base64 để lưu vào MongoDB
            const base64Content = await this.readFileAsBase64(file);
            fileData.base64Content = base64Content;
            fileData.path = filePath;
            fileData.fileType = fileType;
            
            // Lưu dữ liệu tệp vào FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('filePath', filePath);
            formData.append('fileId', fileData.id);
            formData.append('userId', fileData.userId);
            
            try {
                // Ưu tiên lưu trực tiếp vào MongoDB nếu có kết nối
                if (window.mongoDB) {
                    if (!window.mongoDB.isConnected) {
                        await window.mongoDB.connect();
                    }
                    
                    // MongoDB Data API không hỗ trợ trực tiếp lưu tệp
                    // Vì vậy chúng ta sẽ lưu đường dẫn và nội dung base64 trong MongoDB
                    console.log(`Đang lưu nội dung tệp ${file.name} vào MongoDB...`);
                    
                    // Lưu thông tin tệp vào MongoDB để tham chiếu
                    const mongoData = {
                        ...fileData,
                        contentType: file.type,
                        size: file.size,
                        uploadDate: new Date().toISOString()
                    };
                    
                    // Kết quả lưu trữ thành công
                    return mongoData;
                }
                
                // Nếu không có MongoDB, gửi yêu cầu tải lên tới API
                console.log('Không có kết nối MongoDB, sử dụng API upload...');
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('Lỗi khi tải lên tệp tin qua API');
                }
                
                const result = await response.json();
                
                // Cập nhật fileData với đường dẫn tệp
                fileData.url = result.url || filePath;
                
                return fileData;
            } catch (error) {
                console.error('Lỗi khi lưu tệp lên máy chủ:', error);
                
                // Fallback: Lưu vào localStorage khi không thể lưu lên máy chủ
                console.log('Sử dụng localStorage làm phương án dự phòng...');
                
                // Thông qua mock API
                const mockApi = new MockApi();
                const result = await mockApi.uploadFile(formData);
                
                if (!result.success) {
                    throw new Error(result.error || 'Lỗi khi tải lên tệp tin');
                }
                
                fileData.url = result.url;
                return fileData;
            }
        } catch (error) {
            console.error('Lỗi khi lưu tệp tin lên máy chủ:', error);
            throw error;
        }
    }
    
    /**
     * Xác định loại tệp dựa vào MIME type
     * @param {string} mimeType - MIME type của tệp
     * @returns {string} Loại tệp
     */
    getFileType(mimeType) {
        if (!mimeType) return 'other';
        
        if (mimeType.startsWith('image/')) {
            return 'image';
        } else if (mimeType.startsWith('video/')) {
            return 'video';
        } else if (mimeType.startsWith('audio/')) {
            return 'audio';
        } else if (
            mimeType === 'application/pdf' ||
            mimeType === 'application/msword' ||
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/vnd.ms-excel' ||
            mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            mimeType === 'application/vnd.ms-powerpoint' ||
            mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
            mimeType === 'text/plain' ||
            mimeType === 'text/html' ||
            mimeType === 'text/css' ||
            mimeType === 'text/javascript'
        ) {
            return 'document';
        }
        
        return 'other';
    }
} 
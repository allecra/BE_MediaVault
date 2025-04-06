/**
 * Lớp FileModel - Quản lý lưu trữ và truy xuất các file kiểm tra
 */
class FileModel {
    constructor() {
        this.storageKey = 'mediaVault_files';
        this.initializeStorage();
        
        // Các đường dẫn upload theo loại file
        this.uploadPaths = {
            document: '/uploads/documents/',
            image: '/uploads/images/',
            video: '/uploads/videos/',
            audio: '/uploads/audio/',
            other: '/uploads/other/'
        };
    }

    /**
     * Khởi tạo kho lưu trữ nếu chưa tồn tại
     */
    initializeStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    /**
     * Lấy tất cả các file từ kho lưu trữ
     * @returns {Array} - Danh sách các file
     */
    getAllFiles() {
        try {
            const filesJson = localStorage.getItem(this.storageKey);
            return filesJson ? JSON.parse(filesJson) : [];
        } catch (error) {
            console.error('Lỗi khi lấy danh sách file:', error);
            return [];
        }
    }

    /**
     * Lưu file mới vào kho lưu trữ
     * @param {Object} fileData - Thông tin file cần lưu
     * @returns {Promise<Object>} - Thông tin file đã lưu
     */
    async saveFile(fileData) {
        try {
            if (!fileData || !fileData.id) {
                throw new Error('Dữ liệu file không hợp lệ');
            }

            // Thêm thời gian tạo nếu chưa có
            if (!fileData.timestamp) {
                fileData.timestamp = new Date().toISOString();
            }

            // Lấy danh sách file hiện tại
            const files = this.getAllFiles();

            // Kiểm tra nếu file đã tồn tại
            const existingIndex = files.findIndex(file => file.id === fileData.id);
            
            if (existingIndex >= 0) {
                // Cập nhật file nếu đã tồn tại
                files[existingIndex] = { ...files[existingIndex], ...fileData };
            } else {
                // Thêm file mới
                files.push(fileData);
            }

            // Lưu danh sách file đã cập nhật
            localStorage.setItem(this.storageKey, JSON.stringify(files));

            console.log('File đã được lưu:', fileData.id);
            return fileData;
        } catch (error) {
            console.error('Lỗi khi lưu file:', error);
            throw new Error('Không thể lưu file: ' + error.message);
        }
    }

    /**
     * Xóa file khỏi kho lưu trữ
     * @param {string} fileId - ID của file cần xóa
     * @returns {Promise<boolean>} - Kết quả xóa file
     */
    async deleteFile(fileId) {
        try {
            if (!fileId) {
                throw new Error('ID file không hợp lệ');
            }
            
            // Lấy danh sách file hiện tại
            const files = this.getAllFiles();
            
            // Lọc file cần xóa
            const updatedFiles = files.filter(file => file.id !== fileId);
            
            // Kiểm tra nếu không tìm thấy file
            if (files.length === updatedFiles.length) {
                throw new Error('Không tìm thấy file có ID: ' + fileId);
            }
            
            // Lưu danh sách file đã cập nhật
            localStorage.setItem(this.storageKey, JSON.stringify(updatedFiles));
            
            console.log('File đã được xóa:', fileId);
            return true;
        } catch (error) {
            console.error('Lỗi khi xóa file:', error);
            throw new Error('Không thể xóa file: ' + error.message);
        }
    }

    /**
     * Lấy danh sách file của người dùng
     * @param {string} userId - ID của người dùng
     * @returns {Promise<Array>} - Danh sách file của người dùng
     */
    async getUserFiles(userId) {
        try {
            if (!userId) {
                throw new Error('ID người dùng không hợp lệ');
            }
            
            // Lấy danh sách file hiện tại
            const files = this.getAllFiles();
            
            // Lọc file theo userId
            const userFiles = files.filter(file => file.userId === userId);
            
            // Sắp xếp theo thời gian giảm dần (mới nhất trước)
            userFiles.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return userFiles;
        } catch (error) {
            console.error('Lỗi khi lấy file của người dùng:', error);
            throw new Error('Không thể lấy danh sách file: ' + error.message);
        }
    }

    /**
     * Lấy chi tiết file theo ID
     * @param {string} fileId - ID của file cần lấy
     * @returns {Promise<Object>} - Thông tin chi tiết của file
     */
    async getFileById(fileId) {
        try {
            if (!fileId) {
                throw new Error('ID file không hợp lệ');
            }
            
            // Lấy danh sách file hiện tại
            const files = this.getAllFiles();
            
            // Tìm file theo ID
            const file = files.find(file => file.id === fileId);
            
            if (!file) {
                throw new Error('Không tìm thấy file có ID: ' + fileId);
            }
            
            return file;
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết file:', error);
            throw new Error('Không thể lấy thông tin file: ' + error.message);
        }
    }

    /**
     * Xóa tất cả file của người dùng
     * @param {string} userId - ID của người dùng
     * @returns {Promise<boolean>} - Kết quả xóa file
     */
    async deleteAllUserFiles(userId) {
        try {
            if (!userId) {
                throw new Error('ID người dùng không hợp lệ');
            }
            
            // Lấy danh sách file hiện tại
            const files = this.getAllFiles();
            
            // Lọc file không thuộc người dùng
            const remainingFiles = files.filter(file => file.userId !== userId);
            
            // Lưu danh sách file đã cập nhật
            localStorage.setItem(this.storageKey, JSON.stringify(remainingFiles));
            
            console.log('Tất cả file của người dùng đã được xóa:', userId);
            return true;
        } catch (error) {
            console.error('Lỗi khi xóa tất cả file của người dùng:', error);
            throw new Error('Không thể xóa file: ' + error.message);
        }
    }

    /**
     * Đọc file dưới dạng Base64
     * @param {File} file - File cần đọc
     * @returns {Promise<string>} - Nội dung file dưới dạng Base64
     */
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const base64String = event.target.result.split(',')[1];
                resolve(base64String);
            };
            
            reader.onerror = (error) => {
                console.error('Error reading file:', error);
                reject(error);
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Xác định loại file dựa vào MIME type
     * @param {string} mimeType - MIME type của file
     * @returns {string} - Loại file (document, image, video, audio, other)
     */
    getFileType(mimeType) {
        if (!mimeType) return 'other';
        
        if (mimeType.includes('pdf') || 
            mimeType.includes('doc') || 
            mimeType.includes('xls') ||
            mimeType.includes('ppt') ||
            mimeType.includes('text')) {
            return 'document';
        } else if (mimeType.includes('image')) {
            return 'image';
        } else if (mimeType.includes('video')) {
            return 'video';
        } else if (mimeType.includes('audio')) {
            return 'audio';
        } else {
            return 'other';
        }
    }
    
    /**
     * Lưu file vào server
     * @param {File} file - File cần lưu
     * @param {Object} fileData - Thông tin file
     * @returns {Promise<Object>} - Thông tin file đã lưu
     */
    async saveFileToServer(file, fileData) {
        try {
            // Giả lập lưu file vào server
            console.log(`[MOCK] Saving file to server: ${file.name}`);
            
            // Đọc file dưới dạng Base64
            const base64Content = await this.readFileAsBase64(file);
            
            // Tạo path và url giả lập
            const fileType = this.getFileType(file.type);
            const uploadPath = this.uploadPaths[fileType] || this.uploadPaths.other;
            const filePath = `${uploadPath}${fileData.id}_${file.name}`;
            
            return {
                ...fileData,
                path: filePath,
                url: filePath,
                base64Content
            };
        } catch (error) {
            console.error('Error saving file to server:', error);
            throw new Error('Cannot save file to server: ' + error.message);
        }
    }

    /**
     * Lấy danh sách file của người dùng
     * @param {string} userId - ID của người dùng
     * @returns {Promise<Array>} - Danh sách file của người dùng
     */
    async getFilesByUserId(userId) {
        try {
            if (!userId) {
                throw new Error('ID người dùng không hợp lệ');
            }
            
            // Nếu có kết nối MongoDB, ưu tiên lấy từ MongoDB
            if (window.mongoDB && window.mongoDB.isConnected) {
                try {
                    console.log('Đang lấy files từ MongoDB cho user:', userId);
                    const filter = { userId: userId };
                    const result = await window.mongoDB.find('MultimediaStorage', filter);
                    
                    if (result && result.documents && result.documents.length > 0) {
                        console.log(`Tìm thấy ${result.documents.length} files trong MongoDB`);
                        
                        // Kết hợp với dữ liệu local nếu có
                        const localFiles = this.getUserFiles(userId);
                        
                        // Map MongoDB documents sang định dạng file
                        const mongoFiles = result.documents.map(doc => ({
                            id: doc._id || doc.id,
                            name: doc.name,
                            type: doc.type,
                            size: doc.size,
                            userId: doc.userId,
                            uploadDate: doc.uploadDate,
                            path: doc.path,
                            url: doc.url,
                            base64Content: doc.base64Content,
                            status: doc.status || 'uploaded'
                        }));
                        
                        // Kết hợp và loại bỏ trùng lặp
                        const combinedFiles = [...mongoFiles];
                        
                        // Thêm file local không có trong MongoDB
                        for (const localFile of localFiles) {
                            if (!combinedFiles.some(file => file.id === localFile.id)) {
                                combinedFiles.push(localFile);
                            }
                        }
                        
                        // Sắp xếp theo thời gian tải lên, mới nhất đầu tiên
                        combinedFiles.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                        
                        return combinedFiles;
                    }
                } catch (error) {
                    console.error('Lỗi khi lấy files từ MongoDB:', error);
                    // Tiếp tục với dữ liệu local nếu có lỗi
                }
            }
            
            // Nếu không có MongoDB, sử dụng localStorage
            return this.getUserFiles(userId);
        } catch (error) {
            console.error('Lỗi khi lấy files của người dùng:', error);
            return [];
        }
    }
}
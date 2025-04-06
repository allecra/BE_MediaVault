/**
 * Mock API - Giả lập các API cho môi trường phát triển
 * Sử dụng localStorage để lưu trữ dữ liệu
 */
class MockApi {
    constructor() {
        this.delay = 500; // Delay mặc định (ms)
        this.endpoints = {
            'auth/login': this.login.bind(this),
            'auth/register': this.register.bind(this),
            'auth/logout': this.logout.bind(this),
            'auth/validate': this.validateToken.bind(this),
            'user/profile': this.getUserProfile.bind(this),
            'user/update': this.updateUserProfile.bind(this),
            'check/status': this.checkStatus.bind(this),
            'check/result': this.getCheckResult.bind(this),
            'history': this.getHistory.bind(this),
            'history/add': this.addHistory.bind(this),
            'storage/list': this.getStorageList.bind(this),
            'api/upload': this.uploadFile.bind(this) // Thêm API tải lên tệp
        };
        
        // Mock routing
        this.initMockRouting();
    }
    
    // ... existing code ...
    
    /**
     * Xử lý tải lên tệp
     * @param {FormData} formData - Dữ liệu form
     * @returns {Promise<Object>} - Kết quả tải lên
     */
    async uploadFile(formData) {
        // Mô phỏng quá trình tải lên tệp
        const file = formData.get('file');
        const filePath = formData.get('filePath');
        const fileId = formData.get('fileId');
        const userId = formData.get('userId');
        
        if (!file || !fileId || !userId) {
            return {
                success: false,
                error: 'Dữ liệu tệp tin không hợp lệ'
            };
        }
        
        try {
            // Mô phỏng quá trình lưu tệp
            console.log(`[MockApi] Đang lưu tệp ${file.name} vào ${filePath}`);
            
            // Trong môi trường thực tế, tệp sẽ được lưu vào hệ thống tệp của máy chủ
            // Ở đây, chúng ta chỉ mô phỏng quá trình này
            
            // Dùng FileReader để đọc tệp và lưu vào localStorage
            const reader = new FileReader();
            
            return new Promise((resolve, reject) => {
                reader.onload = () => {
                    try {
                        // Lưu dữ liệu tệp vào localStorage
                        // Chú ý: đây không phải cách tốt cho dữ liệu lớn, nhưng đủ cho mô phỏng
                        localStorage.setItem(`mediaVault_file_${fileId}`, reader.result);
                        
                        // Trả về kết quả thành công
                        resolve({
                            success: true,
                            fileId: fileId,
                            path: filePath,
                            url: `data:${file.type};base64,${btoa(reader.result)}`,
                            size: file.size,
                            name: file.name,
                            type: file.type
                        });
                    } catch (error) {
                        console.error('Lỗi khi lưu tệp vào localStorage:', error);
                        reject({
                            success: false,
                            error: 'Không thể lưu tệp tin'
                        });
                    }
                };
                
                reader.onerror = () => {
                    reject({
                        success: false,
                        error: 'Không thể đọc tệp tin'
                    });
                };
                
                // Đọc tệp dưới dạng Text để tiết kiệm dung lượng
                // Trong thực tế, tệp sẽ được lưu trên hệ thống tệp của máy chủ
                reader.readAsText(file);
            });
        } catch (error) {
            console.error('[MockApi] Lỗi khi tải lên tệp:', error);
            return {
                success: false,
                error: error.message || 'Lỗi khi tải lên tệp tin'
            };
        }
    }
    
    /**
     * Lấy danh sách tệp trong kho lưu trữ
     * @param {Object} params - Tham số truy vấn
     * @returns {Promise<Object>} - Danh sách tệp
     */
    async getStorageList(params) {
        const { userId } = params;
        
        if (!userId) {
            return {
                success: false,
                error: 'ID người dùng không hợp lệ'
            };
        }
        
        try {
            // Lấy danh sách tệp từ localStorage
            const filesJson = localStorage.getItem('mediaVault_files');
            const files = filesJson ? JSON.parse(filesJson) : [];
            
            // Lọc theo userId
            const userFiles = files.filter(file => file.userId === userId);
            
            return {
                success: true,
                files: userFiles
            };
        } catch (error) {
            console.error('[MockApi] Lỗi khi lấy danh sách tệp:', error);
            return {
                success: false,
                error: error.message || 'Lỗi khi lấy danh sách tệp'
            };
        }
    }
    
    // ... existing code ...
} 
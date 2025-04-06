class MainController {
    constructor(fileModel, mainView, plagiarismAPI, userModel) {
        this.fileModel = fileModel;
        this.mainView = mainView;
        this.plagiarismAPI = plagiarismAPI;
        this.userModel = userModel;
    }

    async checkDuplicate(contentParam, typeParam) {
        console.log('Bắt đầu hàm checkDuplicate');
        try {
            // Hiển thị thông báo đang xử lý
            this.mainView.showNotification('Đang xử lý yêu cầu...', 'info');
            
            // Kiểm tra đăng nhập
            if (!this.userModel.isLoggedIn()) {
                this.mainView.showNotification('Vui lòng đăng nhập để sử dụng tính năng này!', 'error');
                if (window.authView) {
                    window.authView.showModal('login-modal');
                } else {
                    console.error('authView không tồn tại, không thể hiển thị modal đăng nhập');
                }
                return;
            }
            
            // Kiểm tra nếu PlagiarismAPI không được khởi tạo
            if (!this.plagiarismAPI) {
                console.error('PlagiarismAPI chưa được khởi tạo đúng cách');
                this.mainView.showNotification('Lỗi hệ thống: API kiểm tra chưa sẵn sàng', 'error');
                return;
            }
            
            // Check if the user has remaining checks
            try {
                const user = this.userModel.getCurrentUser();
                await this.userModel.useCheck();
            } catch (error) {
                this.mainView.showNotification(error.message, 'error');
                console.error('Error when using check:', error);
                
                // If out of checks, show subscription page after a short delay
                if (error.message && error.message.includes('hết lượt')) {
                    setTimeout(() => {
                        window.location.href = 'subscription.html';
                    }, 2000);
                }
                return;
            }

            // Get content from parameters or form
            let content, type;
            if (contentParam && typeParam) {
                content = contentParam;
                type = typeParam;
            } else {
                const checkType = document.querySelector('.check-type.active')?.dataset.type || 'text';
                console.log('Loại kiểm tra được chọn:', checkType);
                
                if (checkType === 'text') {
                    const textInput = document.getElementById('text-input')?.value;
                    if (!textInput) {
                        this.mainView.showNotification('Vui lòng nhập văn bản để kiểm tra!', 'warning');
                        return;
                    }
                    content = textInput;
                    type = 'text';
                } else if (checkType === 'file') {
                    const fileInput = document.getElementById('file-input')?.files[0];
                    if (!fileInput) {
                        this.mainView.showNotification('Vui lòng tải lên một tệp để kiểm tra!', 'warning');
                        return;
                    }
                    try {
                        content = await this.readFile(fileInput);
                    } catch (fileError) {
                        console.error('Lỗi đọc tệp:', fileError);
                        this.mainView.showNotification('Không thể đọc tệp đã tải lên. Vui lòng thử lại!', 'error');
                        return;
                    }
                    type = fileInput.type.startsWith('image') ? 'image' : 
                           fileInput.type.startsWith('video') ? 'video' : 
                           fileInput.type.startsWith('audio') ? 'audio' : 'file';
                } else if (checkType === 'image') {
                    const imageInput = document.getElementById('image-input')?.files[0];
                    if (!imageInput) {
                        this.mainView.showNotification('Vui lòng tải lên một hình ảnh để kiểm tra!', 'warning');
                        return;
                    }
                    try {
                        content = await this.readFile(imageInput);
                    } catch (imageError) {
                        console.error('Lỗi đọc hình ảnh:', imageError);
                        this.mainView.showNotification('Không thể đọc hình ảnh đã tải lên. Vui lòng thử lại!', 'error');
                        return;
                    }
                    type = 'image';
                } else if (checkType === 'video') {
                    const videoInput = document.getElementById('video-input')?.files[0];
                    if (!videoInput) {
                        this.mainView.showNotification('Vui lòng tải lên một video để kiểm tra!', 'warning');
                        return;
                    }
                    try {
                        content = await this.readFile(videoInput);
                    } catch (videoError) {
                        console.error('Lỗi đọc video:', videoError);
                        this.mainView.showNotification('Không thể đọc video đã tải lên. Vui lòng thử lại!', 'error');
                        return;
                    }
                    type = 'video';
                }
            }

            // Kiểm tra lại nội dung
            if (!content) {
                this.mainView.showNotification('Không thể kiểm tra nội dung trống!', 'error');
                return;
            }

            console.log(`Bắt đầu kiểm tra nội dung loại: ${type}`);

            // Check the user's subscription plan for feature access
            const user = this.userModel.getCurrentUser();
            const currentPlan = user?.plan || 'free';
            
            // Free plan can only check text
            if (currentPlan === 'free' && type !== 'text') {
                this.mainView.showNotification('Gói Miễn phí chỉ hỗ trợ kiểm tra văn bản. Vui lòng nâng cấp gói dịch vụ.', 'warning');
                setTimeout(() => {
                    window.location.href = 'subscription.html';
                }, 2000);
                return;
            }
            
            // Basic plan can only check text and files, not images/videos
            if (currentPlan === 'basic' && (type === 'image' || type === 'video')) {
                this.mainView.showNotification('Gói Cơ bản không hỗ trợ kiểm tra hình ảnh và video. Vui lòng nâng cấp gói dịch vụ.', 'warning');
                setTimeout(() => {
                    window.location.href = 'subscription.html';
                }, 2000);
                return;
            }

            // Hiển thị modal kết quả với trạng thái đang tải
            this.mainView.showModal('duplicate-result-modal');
            
            // Hiển thị loading trong modal
            const loadingElement = document.getElementById('duplicate-loading');
            const resultElement = document.getElementById('duplicate-result-content');
            
            if (loadingElement) loadingElement.style.display = 'flex';
            if (resultElement) resultElement.style.display = 'none';

            // Perform the check using the instance method
            console.log('Gọi API kiểm tra trùng lặp với loại:', type);
            const result = await this.plagiarismAPI.check(content, type);
            console.log('Kết quả từ API:', result);
            
            if (!result) {
                throw new Error('Không nhận được kết quả từ API kiểm tra');
            }
            
            // Add timestamp to result
            result.timestamp = new Date().toISOString();

            // Save the file with user ID
            const fileData = {
                id: Date.now().toString(),
                type,
                content: typeof content === 'string' ? 
                    (content.length > 1000 ? content.substring(0, 1000) + '...' : content) : 
                    'Binary content', // Truncate long content
                result,
                userId: user.id || user._id,
                userEmail: user.email,
                timestamp: result.timestamp
            };

            try {
                await this.fileModel.saveFile(fileData);
            } catch (saveError) {
                console.error('Error saving result to history:', saveError);
                // Continue displaying the result even if saving fails
            }
            
            // Ẩn loading, hiển thị kết quả
            if (loadingElement) loadingElement.style.display = 'none';
            if (resultElement) resultElement.style.display = 'block';
            
            // Display the result
            if (typeof this.mainView.displayDuplicateResult === 'function') {
                this.mainView.displayDuplicateResult(result);
            } else {
                console.error('displayDuplicateResult không tồn tại trong mainView');
                this.mainView.showNotification('Lỗi hiển thị kết quả', 'error');
                this.mainView.closeModal('duplicate-result-modal');
            }
            
            // Update the remaining checks indicator if it exists
            const checksRemainingElement = document.getElementById('checks-remaining');
            if (checksRemainingElement && user.checksRemaining !== undefined) {
                checksRemainingElement.textContent = user.checksRemaining;
            }
        } catch (error) {
            console.error('Error in checkDuplicate:', error);
            
            // Chi tiết hóa thông báo lỗi
            let errorMessage = 'Lỗi khi kiểm tra trùng lặp';
            
            if (error.message) {
                if (error.message.includes('network') || error.message.includes('connection')) {
                    errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.';
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'Yêu cầu kiểm tra bị hết thời gian. Vui lòng thử lại sau.';
                } else if (error.message.includes('permission') || error.message.includes('access')) {
                    errorMessage = 'Bạn không có quyền thực hiện thao tác này.';
                } else if (error.message.includes('format') || error.message.includes('type')) {
                    errorMessage = 'Định dạng tệp không được hỗ trợ. Vui lòng sử dụng định dạng khác.';
                } else if (error.message.includes('size')) {
                    errorMessage = 'Tệp có kích thước quá lớn. Vui lòng sử dụng tệp nhỏ hơn.';
                } else if (error.message.includes('API') || error.message.includes('khởi tạo')) {
                    errorMessage = 'Lỗi hệ thống API. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.';
                } else {
                    errorMessage = `Lỗi: ${error.message}`;
                }
            }
            
            this.mainView.showNotification(errorMessage, 'error');
            
            // Đóng modal kết quả
            this.mainView.closeModal('duplicate-result-modal');
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            if (file.type.startsWith('text')) {
                reader.readAsText(file);
            } else {
                reader.readAsDataURL(file);
            }
        });
    }

    async saveResult(result) {
        try {
            if (!this.userModel.isLoggedIn()) {
                this.mainView.showNotification('Vui lòng đăng nhập để lưu kết quả!', 'error');
                return;
            }

            const user = this.userModel.getCurrentUser();
            
            const fileData = {
                id: Date.now().toString(),
                type: result.type,
                content: result.content.length > 1000 ? result.content.substring(0, 1000) + '...' : result.content,
                result: {
                    percentage: result.percentage,
                    sources: result.sources || []
                },
                userId: user.id || user._id,
                userEmail: user.email,
                timestamp: result.timestamp || new Date().toISOString()
            };

            await this.fileModel.saveFile(fileData);
            this.mainView.showNotification('Đã lưu kết quả vào lịch sử!', 'success');
        } catch (error) {
            console.error('Error saving result:', error);
            this.mainView.showNotification('Lỗi khi lưu kết quả: ' + error.message, 'error');
        }
    }
    
    async deleteHistory(fileId) {
        try {
            if (!this.userModel.isLoggedIn()) {
                this.mainView.showNotification('Vui lòng đăng nhập để xóa lịch sử!', 'error');
                return;
            }
            
            await this.fileModel.deleteFile(fileId);
            
            // Reload history
            const files = await this.fileModel.getUserFiles(this.userModel.getCurrentUser().id);
            this.mainView.displayHistory(files);
            
            this.mainView.showNotification('Đã xóa khỏi lịch sử!', 'success');
        } catch (error) {
            console.error('Error deleting history:', error);
            this.mainView.showNotification('Lỗi khi xóa lịch sử: ' + error.message, 'error');
        }
    }

    async loadHistory() {
        try {
            if (!this.userModel.isLoggedIn()) {
                this.mainView.showNotification('Vui lòng đăng nhập để xem lịch sử!', 'error');
                return;
            }

            const user = this.userModel.getCurrentUser();
            const files = await this.fileModel.getUserFiles(user.id || user._id);
            
            this.mainView.displayHistory(files);
        } catch (error) {
            console.error('Error loading history:', error);
            this.mainView.showNotification('Lỗi khi tải lịch sử: ' + error.message, 'error');
        }
    }
}
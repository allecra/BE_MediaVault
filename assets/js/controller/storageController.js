/**
 * Lớp điều khiển quản lý lưu trữ tệp
 * Xử lý tải lên, lưu trữ và hiển thị tệp
 */
class StorageController {
    constructor(fileModel, userModel, mainView) {
        // Kiểm tra và khởi tạo các model cần thiết
        this.fileModel = fileModel || new StorageModel();
        this.userModel = userModel || new UserModel();
        this.mainView = mainView || new StorageView();
        this.storageView = window.storageView || mainView || null;
        
        // Create a simple notification service if none is provided
        this.notificationService = {
            showSuccess: (message) => {
                console.log('Success:', message);
                if (this.mainView && this.mainView.showNotification) {
                    this.mainView.showNotification(message, 'success');
                }
            },
            showError: (message) => {
                console.error('Error:', message);
                if (this.mainView && this.mainView.showNotification) {
                    this.mainView.showNotification(message, 'error');
                }
            },
            showWarning: (message) => {
                console.warn('Warning:', message);
                if (this.mainView && this.mainView.showNotification) {
                    this.mainView.showNotification(message, 'warning');
                }
            },
            showInfo: (message) => {
                console.info('Info:', message);
                if (this.mainView && this.mainView.showNotification) {
                    this.mainView.showNotification(message, 'info');
                }
            }
        };
        
        // Khởi tạo biến
        this.files = [];
        this.totalStorage = 1024 * 1024 * 1024; // 1GB mặc định
        this.usedStorage = 0;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchQuery = '';
        this.sortBy = 'newest'; // Mặc định sắp xếp theo mới nhất
        this.fileTypeFilter = 'all'; // Mặc định hiển thị tất cả loại tệp
        this.fileTypeCounts = {
            pdf: 0,
            doc: 0,
            image: 0,
            video: 0,
            other: 0
        };
        this.recentActivities = [];
        
        // Lắng nghe sự kiện đăng nhập/đăng xuất và cập nhật người dùng
        window.addEventListener('user-login', this.handleUserLoginEvent.bind(this));
        window.addEventListener('user-logout', this.handleUserLogoutEvent.bind(this));
        window.addEventListener('user-updated', this.handleUserUpdatedEvent.bind(this));
        window.addEventListener('subscription-updated', this.handleSubscriptionUpdateEvent.bind(this));
        window.addEventListener('storage', this.handleStorageEvent.bind(this));
        
        // Kiểm tra trạng thái đăng nhập khi tải trang
        this.checkLoginState();
        
        // Khởi tạo giao diện người dùng
        this.initializeUI();
    }

    /**
     * Kiểm tra trạng thái đăng nhập và tải dữ liệu phù hợp
     */
    async checkLoginState() {
        try {
            const isAuthenticated = await this.checkUserAuthentication();
            
            if (isAuthenticated) {
            const user = await this.userModel.getCurrentUser();
                console.log('User is logged in:', user.email);
                
                // Cập nhật tên người dùng
                const usernameDisplay = document.getElementById('username-display');
                if (usernameDisplay) {
                    usernameDisplay.textContent = user.username || user.email;
                }
                
                // Tải dữ liệu lưu trữ
                this.loadUserStorage();
            } else {
                console.log('No user is logged in');
                // Giao diện khách đã được thiết lập trong checkUserAuthentication
            }
        } catch (error) {
            console.error('Error checking login state:', error);
            this.showGuestUI();
        }
    }
    
    /**
     * Xử lý sự kiện đăng nhập
     * @param {Event} event - Sự kiện đăng nhập
     */
    handleUserLoginEvent(event) {
        console.log('User login event detected');
        if (event.detail && event.detail.user) {
            console.log('User logged in:', event.detail.user.email);
            this.loadUserStorage();
        }
    }
    
    /**
     * Xử lý sự kiện đăng xuất
     */
    handleUserLogoutEvent() {
        console.log('User logout event detected');
        this.showGuestUI();
        this.files = [];
        this.updateStorageDisplay();
        this.renderFiles();
    }
    
    /**
     * Xử lý sự kiện cập nhật người dùng
     * @param {Event} event - Sự kiện cập nhật người dùng
     */
    handleUserUpdatedEvent(event) {
        console.log('User update event detected');
        if (event.detail && event.detail.user) {
            console.log('User data updated:', event.detail.user.email);
            // Cập nhật giao diện dựa trên dữ liệu người dùng mới
            this.loadUserStorage();
        }
    }
    
    /**
     * Xử lý sự kiện cập nhật gói đăng ký
     * @param {Event} event - Sự kiện cập nhật gói đăng ký
     */
    handleSubscriptionUpdateEvent(event) {
        console.log('Subscription update event detected');
        if (event.detail && event.detail.user) {
            console.log('User subscription updated:', event.detail.user.plan);
            // Cập nhật giới hạn lưu trữ dựa trên gói mới
            this.updateStorageLimits(event.detail.user.plan);
            
            // Cập nhật hiển thị thông tin gói dịch vụ
            const planDisplay = document.getElementById('current-plan');
            if (planDisplay) {
                let planName = 'Miễn phí';
                switch (event.detail.user.plan) {
                    case 'basic': planName = 'Cơ bản'; break;
                    case 'premium': planName = 'Cao cấp'; break;
                    case 'business': planName = 'Doanh nghiệp'; break;
                }
                planDisplay.textContent = planName;
            }
            
            // Cập nhật số lần kiểm tra còn lại
            const checksDisplay = document.getElementById('checks-remaining');
            if (checksDisplay && event.detail.user.checksRemaining !== undefined) {
                checksDisplay.textContent = event.detail.user.checksRemaining;
            }
            
            // Cập nhật hiển thị lưu trữ
            this.updateStorageDisplay();
            
            // Hiển thị thông báo thành công
            if (this.mainView) {
                this.mainView.showNotification('Gói dịch vụ đã được cập nhật thành công!', 'success');
            }
        }
    }
    
    /**
     * Cập nhật giới hạn lưu trữ dựa trên gói dịch vụ
     * @param {string} plan - Gói dịch vụ
     */
    updateStorageLimits(plan) {
        switch (plan) {
            case 'basic':
                this.totalStorage = 5 * 1024 * 1024 * 1024; // 5GB
                break;
            case 'premium':
                this.totalStorage = 50 * 1024 * 1024 * 1024; // 50GB
                break;
            case 'business':
                this.totalStorage = 200 * 1024 * 1024 * 1024; // 200GB
                break;
            default:
                this.totalStorage = 1 * 1024 * 1024 * 1024; // 1GB (free)
        }
        console.log(`Storage limit updated to ${this.totalStorage / (1024 * 1024 * 1024)}GB`);
    }
    
    /**
     * Xử lý sự kiện thay đổi localStorage
     * @param {StorageEvent} event - Sự kiện storage
     */
    handleStorageEvent(event) {
        if (event.key === this.userModel.LOCAL_STORAGE_CURRENT_USER_KEY) {
            console.log('Storage event: Current user changed');
            this.checkLoginState();
        } else if (event.key === this.fileModel.LOCAL_STORAGE_FILES_KEY) {
            console.log('Storage event: Files changed');
            this.loadUserStorage();
        }
    }

    /**
     * Khởi tạo giao diện và đăng ký sự kiện
     */
    async initializeUI() {
        // Xử lý khu vực tải lên
        const uploadArea = document.getElementById('upload-area');
        const uploadBtn = document.getElementById('upload-btn');
        const fileInput = document.getElementById('file-upload');
        
        if (uploadArea && uploadBtn && fileInput) {
            // Xử lý sự kiện kéo và thả
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('active');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('active');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('active');
                this.handleFileUpload(e.dataTransfer.files);
            });
            
            // Xử lý nút tải lên
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });
            
            // Xử lý sự kiện chọn tệp
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
                // Reset input để có thể chọn cùng một tệp nhiều lần
                fileInput.value = '';
            });
        }
        
        // Xử lý tìm kiếm
        const searchInput = document.querySelector('.files-search input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim().toLowerCase();
                this.currentPage = 1; // Đặt lại trang về trang đầu tiên khi tìm kiếm
                this.renderFiles();
            });
            
            // Căn chỉnh vị trí icon tìm kiếm
            const searchIcon = searchInput.parentElement.querySelector('i');
            if (searchIcon) {
                searchIcon.style.top = '50%';
                searchIcon.style.left = '0.8rem';
                searchIcon.style.transform = 'translateY(-50%)';
            }
            
            // Điều chỉnh kích thước và style cho input tìm kiếm
            searchInput.style.padding = '0.6rem 1rem 0.6rem 2.2rem';
            searchInput.style.width = '100%';
            searchInput.style.borderRadius = '6px';
        }
        
        // Khởi tạo các bộ lọc và sắp xếp
        this.initializeFilters();
        
        // Kiểm tra trạng thái đăng nhập và tải dữ liệu
        await this.checkLoginState();
    }
    
    /**
     * Xử lý tải tệp lên, kiểm tra xác thực người dùng trước
     * @param {FileList} files - Danh sách tệp được chọn
     */
    async handleFileUpload(files) {
        // Tạo service thông báo nếu chưa có
        if (!this.notificationService && this.mainView) {
            this.notificationService = {
                showSuccess: (message) => this.mainView.showNotification(message, 'success'),
                showError: (message) => this.mainView.showNotification(message, 'error'),
                showWarning: (message) => this.mainView.showNotification(message, 'warning'),
                showInfo: (message) => this.mainView.showNotification(message, 'info')
            };
        }
        
        // Kiểm tra xác thực người dùng
        if (!this.userModel.getCurrentUser()) {
            if (this.notificationService) {
                this.notificationService.showError('Vui lòng đăng nhập để tải lên tệp');
            } else {
                alert('Vui lòng đăng nhập để tải lên tệp');
            }
            
            // Focus vào nút đăng nhập hoặc mở modal
            const loginButton = document.querySelector('.login-btn');
            if (loginButton) loginButton.click();
            return;
        }

        // Kiểm tra nếu không có tệp được chọn
        if (!files || files.length === 0) {
            if (this.notificationService) {
                this.notificationService.showWarning('Không có tệp nào được chọn');
            } else {
                alert('Không có tệp nào được chọn');
            }
            return;
        }

        // Lấy thông tin người dùng
        const currentUser = this.userModel.getCurrentUser();
        if (!currentUser || !currentUser.id) {
            if (this.notificationService) {
                this.notificationService.showError('Không thể xác định người dùng hiện tại');
            } else {
                alert('Không thể xác định người dùng hiện tại');
            }
            return;
        }

        // Kiểm tra giới hạn lưu trữ
        const currentSize = this.getTotalStorageUsed(currentUser.id);
        const filesSize = Array.from(files).reduce((total, file) => total + file.size, 0);
        const totalSize = currentSize + filesSize;
        
        // Lấy giới hạn lưu trữ theo gói người dùng
        const storageLimit = this.getUserStorageLimit(currentUser);
        
        if (totalSize > storageLimit) {
            if (this.notificationService) {
                this.notificationService.showError(`Vượt quá giới hạn lưu trữ (${this.formatFileSize(storageLimit)})`);
            } else {
                alert(`Vượt quá giới hạn lưu trữ (${this.formatFileSize(storageLimit)})`);
            }
            return;
        }

        // Xử lý từng tệp
        for (const file of Array.from(files)) {
            // Kiểm tra giới hạn kích thước mỗi tệp (100MB)
            if (file.size > 100 * 1024 * 1024) {
                if (this.notificationService) {
                    this.notificationService.showWarning(`Tệp '${file.name}' vượt quá giới hạn 100MB`);
                } else {
                    alert(`Tệp '${file.name}' vượt quá giới hạn 100MB`);
                }
                continue;
            }
            
            try {
                // Hiển thị modal tiến trình
                if (this.storageView) {
                    this.storageView.showUploadModal(file.name);
                }
                
                // Tải tệp lên
                const uploadedFile = await this.uploadFile(file, currentUser.id);
                
                // Tải lại thông tin lưu trữ
                await this.loadUserStorage();
                
                // Thông báo thành công
                if (this.notificationService) {
                    this.notificationService.showSuccess(`Tải lên thành công: ${file.name}`);
                } else if (this.mainView) {
                    this.mainView.showNotification(`Tải lên thành công: ${file.name}`, 'success');
                }
                
                // Ẩn modal tiến trình
                if (this.storageView) {
                    this.storageView.hideUploadModal(true);
                }
                
                // Reset input file để có thể chọn lại cùng một file
                const fileInput = document.getElementById('file-upload');
                if (fileInput) fileInput.value = '';
                
            } catch (error) {
                console.error(`Lỗi khi tải lên tệp ${file.name}:`, error);
                
                // Thông báo lỗi
                if (this.notificationService) {
                    this.notificationService.showError(`Lỗi khi tải lên: ${error.message || file.name}`);
                } else if (this.mainView) {
                    this.mainView.showNotification(`Lỗi khi tải lên: ${error.message || file.name}`, 'error');
                }
                
                // Ẩn modal tiến trình với trạng thái lỗi
                if (this.storageView) {
                    this.storageView.hideUploadModal(false);
                }
                
                // Reset input file để có thể chọn lại cùng một file
                const fileInput = document.getElementById('file-upload');
                if (fileInput) fileInput.value = '';
            }
        }
    }

    /**
     * Tải thông tin lưu trữ của người dùng
     */
    async loadUserStorage() {
        try {
            // Kiểm tra xác thực người dùng
            const isAuthenticated = await this.checkUserAuthentication();
            
            if (!isAuthenticated) {
                console.log('User not authenticated, showing guest UI');
                this.files = [];
                this.updateStorageDisplay();
                this.renderFiles();
                return;
            }
            
            const currentUser = await this.userModel.getCurrentUser();
            if (!currentUser || !currentUser.id) {
                console.error('User information is missing');
                return;
            }
            
            console.log('Loading storage for user:', currentUser.email);
            
            // Cập nhật giới hạn lưu trữ dựa trên gói dịch vụ
            this.updateStorageLimits(currentUser.plan || 'free');
            
            // Tải tệp từ cục bộ và MongoDB
            const files = await this.fileModel.getFilesByUserId(currentUser.id);
            
            console.log('Loaded files:', files.length);
            
            this.files = files;
            
            // Tính toán dung lượng đã sử dụng
            this.calculateUsedStorage();
            
            // Tính toán số lượng theo loại tệp
            this.calculateFileTypeCounts();
            
            // Cập nhật hiển thị
            this.updateStorageDisplay();
            this.renderFiles();
            this.renderRecentActivities();
            
            // Đồng bộ với MongoDB
            this.syncWithMongoDB(currentUser);
                } catch (error) {
            console.error('Error loading user storage:', error);
            if (this.mainView) {
                this.mainView.showNotification('Có lỗi xảy ra khi tải dữ liệu lưu trữ: ' + error.message, 'error');
            }
        }
    }

    /**
     * Đồng bộ hóa thông tin người dùng giữa localStorage và MongoDB
     * @param {Object} currentUser - Thông tin người dùng hiện tại
     */
    async syncUserData(currentUser) {
        try {
            if (!currentUser) return;
            
            const userId = currentUser.id || currentUser._id;
            console.log(`Bắt đầu đồng bộ hóa dữ liệu người dùng ${userId}`);
            
            // Kiểm tra và cập nhật thông tin người dùng từ MongoDB
            if (window.mongoDB && window.mongoDB.isConnected) {
                console.log('Đồng bộ hóa dữ liệu với MongoDB...');
                
                try {
                    // Lấy thông tin người dùng mới nhất từ MongoDB
                    const filter = { _id: userId };
                    const result = await window.mongoDB.find('Users', filter);
                    
                    if (result && result.documents && result.documents.length > 0) {
                        const mongoUser = result.documents[0];
                        console.log('Tìm thấy dữ liệu người dùng trong MongoDB:', mongoUser.Email);
                        
                        // So sánh thời gian cập nhật để biết nguồn nào mới hơn
                        const mongoUpdateTime = new Date(mongoUser.LastUpdated || 0);
                        const localUpdateTime = new Date(currentUser.lastUpdated || 0);
                        
                        // Đồng bộ dữ liệu storage
                        const mergedUser = {
                            ...currentUser,
                            lastSync: new Date().toISOString()
                        };
                        
                        // Nếu MongoDB có dữ liệu mới hơn
                        if (mongoUpdateTime > localUpdateTime) {
                            console.log('Dữ liệu MongoDB mới hơn, cập nhật vào localStorage');
                            mergedUser.storageQuota = mongoUser.StorageQuota || currentUser.storageQuota;
                            mergedUser.storageUsed = mongoUser.StorageUsed || currentUser.storageUsed;
                            mergedUser.plan = mongoUser.Plan || currentUser.plan;
                            mergedUser.expirationDate = mongoUser.ExpirationDate || currentUser.expirationDate;
                        } 
                        // Nếu localStorage có dữ liệu mới hơn
                        else if (localUpdateTime > mongoUpdateTime) {
                            console.log('Dữ liệu localStorage mới hơn, cập nhật lên MongoDB');
                            
                            // Cập nhật MongoDB với dữ liệu local mới hơn
                            await this.userModel.saveUserToMongoDB({
                                ...currentUser,
                                _id: userId
                            });
                        } else {
                            console.log('Dữ liệu đồng bộ, không cần cập nhật');
                        }
                        
                        // Lưu dữ liệu đã hợp nhất vào localStorage
                        await this.userModel.saveUserToLocalStorage(mergedUser);
                        
                        // Cập nhật biến currentUser để sử dụng trong hàm
                        Object.assign(currentUser, mergedUser);
                        
                        console.log('Đồng bộ dữ liệu người dùng hoàn tất');
            } else {
                        // Nếu không tìm thấy người dùng trong MongoDB, cần tạo mới
                        console.log('Không tìm thấy người dùng trong MongoDB, tạo bản ghi mới');
                        
                        // Đảm bảo người dùng có lastSync
                        if (!currentUser.lastSync) {
                            currentUser.lastSync = new Date().toISOString();
                        }
                        
                        // Lưu thông tin người dùng vào MongoDB
                        await this.userModel.saveUserToMongoDB(currentUser);
                    }
                } catch (error) {
                    console.error('Lỗi khi đồng bộ dữ liệu với MongoDB:', error);
                }
            } else {
                console.log('MongoDB không khả dụng, chỉ sử dụng localStorage');
            }
            
            // Đồng bộ files của người dùng
            await this.syncUserFiles(userId);
            
            // Cập nhật hiển thị storage
            this.updateStorageDisplay();
            
            return currentUser;
        } catch (error) {
            console.error('Lỗi trong quá trình đồng bộ dữ liệu người dùng:', error);
        }
    }

    /**
     * Đồng bộ hóa tệp tin của người dùng giữa localStorage và MongoDB
     * @param {string} userId - ID người dùng
     */
    async syncUserFiles(userId) {
        try {
            if (!userId) {
                throw new Error('Yêu cầu ID người dùng');
            }
            
            console.log(`Đồng bộ hóa tệp tin cho người dùng: ${userId}`);
            
            // Tệp tin từ localStorage
            const localFiles = this.fileModel.getAllFiles().filter(file => file.userId === userId);
            console.log(`Tìm thấy ${localFiles.length} tệp tin trong localStorage`);
            
            // Tệp tin từ MongoDB (nếu có kết nối)
            let mongoFiles = [];
            let needsSync = false;
            
                if (window.mongoDB && window.mongoDB.isConnected) {
                    try {
                    console.log('Đang lấy tệp tin từ MongoDB...');
                        const result = await window.mongoDB.find('MultimediaStorage', { userId: userId });
                    
                        if (result && result.documents) {
                        mongoFiles = result.documents;
                        console.log(`Tìm thấy ${mongoFiles.length} tệp tin trong MongoDB`);
                        needsSync = true;
                        }
                    } catch (mongoError) {
                    console.error('Lỗi khi lấy tệp tin từ MongoDB:', mongoError);
                }
            }
            
            // Nếu có dữ liệu từ cả hai nguồn, cần đồng bộ hóa
            if (needsSync) {
                console.log('Đồng bộ hóa tệp tin giữa localStorage và MongoDB...');
                
                // Tạo map các tệp tin từ MongoDB để tìm kiếm nhanh
                const mongoFilesMap = new Map();
                mongoFiles.forEach(file => {
                    mongoFilesMap.set(file.id, file);
                });
                
                // Tạo map các tệp tin từ localStorage để tìm kiếm nhanh
                const localFilesMap = new Map();
                localFiles.forEach(file => {
                    localFilesMap.set(file.id, file);
                });
                
                // Hợp nhất danh sách tệp tin
                const allFileIds = new Set([...mongoFilesMap.keys(), ...localFilesMap.keys()]);
                const mergedFiles = [];
                const updatedFiles = [];
                
                for (const fileId of allFileIds) {
                    const mongoFile = mongoFilesMap.get(fileId);
                    const localFile = localFilesMap.get(fileId);
                    
                    if (mongoFile && localFile) {
                        // Cả hai nguồn đều có tệp tin, lấy bản mới nhất
                        const mongoDate = new Date(mongoFile.lastModified || mongoFile.timestamp || 0);
                        const localDate = new Date(localFile.lastModified || localFile.timestamp || 0);
                        
                        if (mongoDate >= localDate) {
                            mergedFiles.push(mongoFile);
                            
                            // Cập nhật localStorage nếu cần
                            if (JSON.stringify(mongoFile) !== JSON.stringify(localFile)) {
                                updatedFiles.push(mongoFile);
                            }
                        } else {
                            mergedFiles.push(localFile);
                            
                            // Cập nhật MongoDB với bản mới hơn từ localStorage
                            try {
                                await window.mongoDB.update('MultimediaStorage', { id: fileId }, localFile);
                                console.log(`Đã cập nhật MongoDB với tệp tin mới hơn: ${fileId}`);
                            } catch (e) {
                                console.error(`Không thể cập nhật tệp tin trong MongoDB: ${fileId}`, e);
                            }
                        }
                    } else if (mongoFile) {
                        // Chỉ có trong MongoDB, thêm vào danh sách hợp nhất và cần cập nhật localStorage
                        mergedFiles.push(mongoFile);
                        updatedFiles.push(mongoFile);
                    } else if (localFile) {
                        // Chỉ có trong localStorage, thêm vào MongoDB
                        mergedFiles.push(localFile);
                        try {
                            await window.mongoDB.save('MultimediaStorage', localFile);
                            console.log(`Đã thêm tệp tin vào MongoDB: ${fileId}`);
                        } catch (e) {
                            console.error(`Không thể thêm tệp tin vào MongoDB: ${fileId}`, e);
                        }
                    }
                }
                
                // Cập nhật lại localStorage với danh sách hợp nhất
                if (updatedFiles.length > 0) {
                    console.log(`Cập nhật ${updatedFiles.length} tệp tin trong localStorage`);
                    
                    const allFiles = this.fileModel.getAllFiles();
                    const filteredFiles = allFiles.filter(file => file.userId !== userId);
                    const updatedAllFiles = [...filteredFiles, ...mergedFiles];
                    
                    this.fileModel.saveAllFiles(updatedAllFiles);
                }
                
                console.log(`Đã đồng bộ hóa ${mergedFiles.length} tệp tin cho người dùng ${userId}`);
                
                // Cập nhật thông tin sử dụng dung lượng người dùng
                const totalUsed = mergedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
                const currentUser = await this.userModel.getCurrentUser();
                
                if (currentUser && (currentUser.id === userId || currentUser._id === userId)) {
                    currentUser.storageUsed = totalUsed;
                    await this.userModel.saveUserToMongoDB(currentUser);
                }
                
                // Sử dụng danh sách hợp nhất
                this.files = mergedFiles;
            } else {
                // Không có kết nối MongoDB, chỉ sử dụng localStorage
                console.log('Chỉ sử dụng tệp tin từ localStorage');
                this.files = localFiles;
            }
            
            // Sắp xếp tệp tin theo thời gian giảm dần
            this.files.sort((a, b) => {
                const dateA = new Date(a.uploadDate || a.timestamp || 0);
                const dateB = new Date(b.uploadDate || b.timestamp || 0);
                return dateB - dateA;
            });
            
            console.log(`Tổng số tệp tin sau khi đồng bộ: ${this.files.length}`);
            
            // Cập nhật giao diện người dùng
            this.renderFiles();
        } catch (error) {
            console.error('Không thể đồng bộ tệp tin người dùng:', error);
            // Trong trường hợp lỗi, sử dụng dữ liệu từ localStorage
            this.files = this.fileModel.getAllFiles().filter(file => file.userId === userId);
        }
    }

    /**
     * Kiểm tra xác thực người dùng
     * @returns {Promise<boolean>} True nếu người dùng đã đăng nhập, false nếu chưa
     */
    async checkUserAuthentication() {
        try {
            const currentUser = await this.userModel.getCurrentUser();
            
            if (currentUser && currentUser.id) {
                // Cập nhật UI cho người dùng đã đăng nhập
                this.showUserUI();
                return true;
            } else {
                // Hiển thị UI cho khách
                this.showGuestUI();
                return false;
            }
        } catch (error) {
            console.error('Error checking user authentication:', error);
            this.showGuestUI();
            return false;
        }
    }

    /**
     * Hiển thị giao diện cho người dùng đã đăng nhập
     */
    showUserUI() {
        // Ẩn các phần UI chỉ dành cho khách
        const guestElements = document.querySelectorAll('.guest-only');
        guestElements.forEach(el => {
            el.style.display = 'none';
        });
        
        // Hiển thị các phần UI dành cho người dùng đã đăng nhập
        const userElements = document.querySelectorAll('.user-only');
        userElements.forEach(el => {
            el.style.display = 'block';
        });
        
        // Hiển thị khu vực tải lên
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.style.display = 'block';
        }
    }
    
    /**
     * Hiển thị giao diện cho khách
     */
    showGuestUI() {
        // Hiển thị các phần UI chỉ dành cho khách
        const guestElements = document.querySelectorAll('.guest-only');
        guestElements.forEach(el => {
            el.style.display = 'block';
        });
        
        // Ẩn các phần UI dành cho người dùng đã đăng nhập
        const userElements = document.querySelectorAll('.user-only');
        userElements.forEach(el => {
            el.style.display = 'none';
        });
        
        // Ẩn khu vực tải lên
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.style.display = 'none';
        }
        
        // Hiển thị thông báo đăng nhập
        const loginPrompt = document.getElementById('login-prompt');
        if (loginPrompt) {
            loginPrompt.style.display = 'block';
        }
    }

    /**
     * Tính toán dung lượng đã sử dụng từ danh sách tệp
     */
    calculateUsedStorage() {
        this.usedStorage = this.files.reduce((total, file) => {
            return total + (file.size || 0);
        }, 0);
    }
    
    /**
     * Tính toán số lượng cho từng loại tệp
     */
    calculateFileTypeCounts() {
        // Khởi tạo lại thống kê
        this.fileTypeCounts = {
            pdf: 0,
            doc: 0,
            image: 0,
            video: 0,
            other: 0
        };
        
        // Đếm số lượng cho mỗi loại
        this.files.forEach(file => {
            if (file.type) {
                if (file.type.includes('pdf')) {
                    this.fileTypeCounts.pdf++;
                } else if (file.type.includes('word') || file.type.includes('doc')) {
                    this.fileTypeCounts.doc++;
                } else if (file.type.includes('image')) {
                    this.fileTypeCounts.image++;
                } else if (file.type.includes('video')) {
                    this.fileTypeCounts.video++;
                } else {
                    this.fileTypeCounts.other++;
                }
            } else {
                this.fileTypeCounts.other++;
            }
        });
        
        // Cập nhật UI
        document.getElementById('pdf-count').textContent = this.fileTypeCounts.pdf;
        document.getElementById('doc-count').textContent = this.fileTypeCounts.doc;
        document.getElementById('image-count').textContent = this.fileTypeCounts.image;
        document.getElementById('video-count').textContent = this.fileTypeCounts.video;
        document.getElementById('other-count').textContent = this.fileTypeCounts.other;
    }
    
    /**
     * Tải hoạt động gần đây
     */
    loadRecentActivities() {
        // Trong triển khai thực tế, bạn sẽ lấy dữ liệu từ cơ sở dữ liệu
        // Ở đây chúng ta mô phỏng bằng cách sử dụng 5 tệp gần đây nhất
        const recentFiles = [...this.files]
            .sort((a, b) => {
                const dateA = a.uploadDate ? new Date(a.uploadDate) : new Date(0);
                const dateB = b.uploadDate ? new Date(b.uploadDate) : new Date(0);
                return dateB - dateA;
            })
            .slice(0, 5);
            
        // Hiển thị hoạt động gần đây
        const recentActivityList = document.getElementById('recent-activity-list');
        
        if (recentActivityList) {
            if (recentFiles.length === 0) {
                recentActivityList.innerHTML = '<p class="text-center text-muted">Chưa có hoạt động nào</p>';
                return;
            }
            
            recentActivityList.innerHTML = recentFiles.map(file => {
                const date = new Date(file.uploadDate || Date.now());
                const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                
                let iconClass = 'fa-file-alt';
                let colorClass = 'text-secondary';
                
                if (file.type) {
                    if (file.type.includes('pdf')) {
                        iconClass = 'fa-file-pdf';
                        colorClass = 'text-danger';
                    } else if (file.type.includes('word') || file.type.includes('doc')) {
                        iconClass = 'fa-file-word';
                        colorClass = 'text-primary';
                    } else if (file.type.includes('image')) {
                        iconClass = 'fa-file-image';
                        colorClass = 'text-success';
                    } else if (file.type.includes('video')) {
                        iconClass = 'fa-file-video';
                        colorClass = 'text-warning';
                    }
                }
                
                return `
                    <div class="activity-item d-flex align-items-center mb-2">
                        <i class="fas ${iconClass} ${colorClass} me-2"></i>
                        <div class="activity-details">
                            <div class="activity-name text-truncate" style="max-width: 200px;">${file.name}</div>
                            <div class="activity-date small text-muted">${dateStr}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    /**
     * Cập nhật hiển thị thông tin lưu trữ
     */
    updateStorageDisplay() {
        const usedStorageEl = document.getElementById('used-storage');
        const totalStorageEl = document.getElementById('total-storage');
        const percentageStorageEl = document.getElementById('percentage-storage');
        const storageBarEl = document.getElementById('storage-bar');
        
        if (usedStorageEl && totalStorageEl && percentageStorageEl && storageBarEl) {
            const usedMB = (this.usedStorage / (1024 * 1024)).toFixed(2);
            const totalMB = (this.totalStorage / (1024 * 1024)).toFixed(0);
            const percentage = Math.min(100, ((this.usedStorage / this.totalStorage) * 100).toFixed(2));
            
            usedStorageEl.textContent = `${usedMB} MB`;
            totalStorageEl.textContent = totalMB >= 1024 ? `${(totalMB / 1024).toFixed(2)} GB` : `${totalMB} MB`;
            percentageStorageEl.textContent = `${percentage}%`;
            
            storageBarEl.style.width = `${percentage}%`;
            
            // Đổi màu thanh tiến trình dựa trên tỷ lệ sử dụng
            if (percentage > 90) {
                storageBarEl.style.backgroundColor = 'var(--danger)';
            } else if (percentage > 70) {
                storageBarEl.style.backgroundColor = 'var(--warning)';
            } else {
                storageBarEl.style.backgroundColor = 'var(--primary-color)';
            }
        }
    }

    /**
     * Hiển thị danh sách tệp
     */
    renderFiles() {
        const filesListEl = document.getElementById('files-list');
        const noFilesEl = document.getElementById('no-files');
        const paginationEl = document.getElementById('files-pagination');
        
        if (!filesListEl || !noFilesEl || !paginationEl) {
            return;
        }
        
        // Bước 1: Lọc tệp theo truy vấn tìm kiếm
        let filteredFiles = this.files;
        
        // Lọc theo từ khóa tìm kiếm
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filteredFiles = filteredFiles.filter(file => 
                file.name.toLowerCase().includes(query) || 
                (file.type && file.type.toLowerCase().includes(query))
            );
        }
        
        // Lọc theo loại tệp
        if (this.fileTypeFilter !== 'all') {
            filteredFiles = filteredFiles.filter(file => {
                if (!file.type) return this.fileTypeFilter === 'other';
                
                switch (this.fileTypeFilter) {
                    case 'document':
                        return file.type.includes('pdf') || 
                               file.type.includes('doc') || 
                               file.type.includes('txt');
                    case 'image':
                        return file.type.includes('image');
                    case 'video':
                        return file.type.includes('video');
                    default:
                        return true;
                }
            });
        }
        
        // Bước 2: Sắp xếp tệp
        filteredFiles.sort((a, b) => {
            switch (this.sortBy) {
                case 'newest':
                    const dateA = a.uploadDate ? new Date(a.uploadDate) : new Date(0);
                    const dateB = b.uploadDate ? new Date(b.uploadDate) : new Date(0);
                    return dateB - dateA;
                case 'oldest':
                    const dateC = a.uploadDate ? new Date(a.uploadDate) : new Date(0);
                    const dateD = b.uploadDate ? new Date(b.uploadDate) : new Date(0);
                    return dateC - dateD;
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'size':
                    return (b.size || 0) - (a.size || 0);
                default:
                    return 0;
            }
        });
        
        // Hiển thị thông báo nếu không có tệp nào
        if (filteredFiles.length === 0) {
            filesListEl.innerHTML = '';
            noFilesEl.style.display = 'block';
            paginationEl.innerHTML = '';
            return;
        }
        
        // Có tệp, ẩn thông báo "Không có tệp"
        noFilesEl.style.display = 'none';
        
        // Tính toán phân trang
        const totalPages = Math.ceil(filteredFiles.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, filteredFiles.length);
        const currentFiles = filteredFiles.slice(startIndex, endIndex);
        
        // Tạo phần tử HTML cho từng tệp
        filesListEl.innerHTML = currentFiles.map(file => this.createFileElement(file)).join('');
        
        // Đăng ký sự kiện cho từng tệp
        currentFiles.forEach(file => {
            const fileElement = document.getElementById(`file-${file.id}`);
            if (fileElement) {
                // Preview
                const previewBtn = fileElement.querySelector('.preview-action');
                if (previewBtn) {
                    previewBtn.addEventListener('click', () => {
                        this.previewFile(file);
                    });
                }
                
                // Download
                const downloadBtn = fileElement.querySelector('.download-action');
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', () => {
                        this.downloadFile(file);
                    });
                }
                
                // Delete
                const deleteBtn = fileElement.querySelector('.delete-action');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        this.deleteFile(file);
                    });
                }
            }
        });
        
        // Tạo phân trang
        this.renderPagination(paginationEl, totalPages);
    }

    /**
     * Tạo phần tử HTML cho tệp
     * @param {Object} file - Thông tin tệp
     * @returns {string} HTML cho phần tử tệp
     */
    createFileElement(file) {
        const date = new Date(file.uploadDate || Date.now());
        const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        const fileSize = this.formatFileSize(file.size || 0);
        
        // Xác định biểu tượng và lớp CSS dựa trên loại tệp
        let iconClass = 'txt';
        let iconHtml = '<i class="fas fa-file-alt"></i>';
        
        if (file.type) {
            if (file.type.includes('pdf')) {
                iconClass = 'pdf';
                iconHtml = '<i class="fas fa-file-pdf"></i>';
            } else if (file.type.includes('word') || file.type.includes('doc')) {
                iconClass = 'doc';
                iconHtml = '<i class="fas fa-file-word"></i>';
            } else if (file.type.includes('image')) {
                iconClass = 'img';
                iconHtml = '<i class="fas fa-file-image"></i>';
            } else if (file.type.includes('video')) {
                iconClass = 'vid';
                iconHtml = '<i class="fas fa-file-video"></i>';
            }
        }
        
        // Tạo HTML
        return `
            <div class="file-item" id="file-${file.id}">
                <div class="file-icon ${iconClass}">
                    ${iconHtml}
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">
                        <span>${fileSize}</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action preview-action" title="Xem trước">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="file-action download-action" title="Tải xuống">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="file-action delete-action" title="Xóa">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Tạo phân trang
     * @param {HTMLElement} paginationEl - Phần tử HTML chứa phân trang
     * @param {number} totalPages - Tổng số trang
     */
    renderPagination(paginationEl, totalPages) {
        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }
        
        const pageNumbers = [];
        
        // Luôn hiển thị trang đầu, trang cuối và trang hiện tại
        // Cùng với 1 trang trước và sau trang hiện tại
        pageNumbers.push(1);
        
        if (this.currentPage > 3) {
            pageNumbers.push('...');
        }
        
        // Trang trước
        if (this.currentPage > 2) {
            pageNumbers.push(this.currentPage - 1);
        }
        
        // Trang hiện tại
        if (this.currentPage !== 1 && this.currentPage !== totalPages) {
            pageNumbers.push(this.currentPage);
        }
        
        // Trang sau
        if (this.currentPage < totalPages - 1) {
            pageNumbers.push(this.currentPage + 1);
        }
        
        if (this.currentPage < totalPages - 2) {
            pageNumbers.push('...');
        }
        
        if (totalPages > 1) {
            pageNumbers.push(totalPages);
        }
        
        // Tạo HTML cho phân trang
        paginationEl.innerHTML = `
            <div class="pagination-container">
                <button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" data-page="prev">
                    <i class="fas fa-chevron-left"></i>
                </button>
                
                ${pageNumbers.map(page => {
                    if (page === '...') {
                        return '<span class="pagination-ellipsis">...</span>';
                    }
                    return `<button class="pagination-btn ${page === this.currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`;
                }).join('')}
                
                <button class="pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" data-page="next">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
        
        // Đăng ký sự kiện cho các nút phân trang
        const paginationBtns = paginationEl.querySelectorAll('.pagination-btn');
        paginationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                
                if (page === 'prev' && this.currentPage > 1) {
                    this.currentPage--;
                } else if (page === 'next' && this.currentPage < totalPages) {
                    this.currentPage++;
                } else if (page !== 'prev' && page !== 'next') {
                    this.currentPage = parseInt(page);
                }
                
                this.renderFiles();
                
                // Cuộn lên đầu danh sách tệp
                const filesListEl = document.getElementById('files-list');
                if (filesListEl) {
                    filesListEl.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }
    
    /**
     * Định dạng kích thước tệp thành chuỗi dễ đọc
     * @param {number} size - Kích thước tệp tính bằng byte
     * @returns {string} Kích thước tệp đã định dạng
     */
    formatFileSize(size) {
        if (size < 1024) {
            return `${size} B`;
        } else if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(2)} KB`;
        } else if (size < 1024 * 1024 * 1024) {
            return `${(size / (1024 * 1024)).toFixed(2)} MB`;
        } else {
            return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        }
    }

    /**
     * Xử lý tải lên tệp tin
     * @param {File} file - Tệp tin cần tải lên
     * @param {string} userId - ID của người dùng
     * @returns {Promise<Object>} - Thông tin tệp tin đã tải lên
     */
    async uploadFile(file, userId) {
        try {
            if (!file || !userId) {
                throw new Error('Tệp tin hoặc ID người dùng không hợp lệ');
            }
            
            console.log(`Đang tải lên tệp ${file.name} (${this.formatFileSize(file.size)})`);
            
            // Tạo thông tin tệp tin
            const fileData = {
                id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                name: file.name,
                type: file.type,
                size: file.size,
                userId: userId,
                uploadDate: new Date().toISOString(),
                status: 'uploading',
                checkCount: 0
            };
            
            // Thông báo bắt đầu tải lên
            if (this.mainView && this.mainView.showNotification) {
                this.mainView.showNotification(`Đang tải lên ${file.name}...`, 'info');
            }
            
            try {
                // Đọc nội dung tệp tin
                const base64Content = await this.fileModel.readFileAsBase64(file);
                fileData.base64Content = base64Content;
                
                let savedFile;
                
                // Ưu tiên lưu trực tiếp vào MongoDB nếu có kết nối
                if (window.mongoDB) {
                    console.log("Sử dụng MongoDB để lưu tệp tin...");
                    
                    // Xác định loại tệp để chọn thư mục lưu trữ
                    const fileType = this.fileModel.getFileType(file.type);
                    const uploadPath = this.fileModel.uploadPaths[fileType] || this.fileModel.uploadPaths.other;
                    const filePath = `${uploadPath}${fileData.id}_${file.name}`;
                    
                    fileData.path = filePath;
                    fileData.fileType = fileType;
                    
                    // Lưu tệp tin lên MongoDB sử dụng phương thức đặc biệt
                    const result = await window.mongoDB.saveFile('MultimediaStorage', fileData);
                    console.log("Kết quả lưu tệp tin vào MongoDB:", result);
                    
                    // Lưu thông tin tệp tin vào cơ sở dữ liệu
                    savedFile = await this.fileModel.saveFile({
                        ...fileData,
                        _id: result.insertedId,
                        status: 'uploaded',
                        savedInMongoDB: true
                    });
                } else {
                    // Sử dụng StorageModel nếu không có kết nối MongoDB
                    console.log("Sử dụng StorageModel để lưu tệp tin...");
                    
                    // Lưu tệp tin lên máy chủ
                    const storedFile = await this.fileModel.saveFileToServer(file, fileData);
                    
                    // Cập nhật trạng thái và thông tin tệp
                    fileData.path = storedFile.path || '';
                    fileData.url = storedFile.url || '';
                    fileData.status = 'uploaded';
                    
                    // Lưu thông tin tệp tin vào cơ sở dữ liệu
                    savedFile = await this.fileModel.saveFile(fileData);
                }
                
                console.log(`Tệp tin ${file.name} đã được tải lên thành công:`, savedFile);
                
                // Thêm vào danh sách tệp tin
                this.files.unshift(savedFile);
                
                // Cập nhật giao diện
                this.updateStorageDisplay();
            this.renderFiles();
            
                // Thêm vào hoạt động gần đây
                this.addRecentActivity({
                    action: 'upload',
                    fileName: file.name,
                    fileId: savedFile.id,
                    timestamp: new Date().toISOString(),
                    userId: userId
                });
                
                // Thông báo thành công
                if (this.mainView && this.mainView.showNotification) {
                    this.mainView.showNotification(`Tệp tin ${file.name} đã được tải lên thành công!`, 'success');
                }
                
                return savedFile;
        } catch (error) {
                console.error(`Lỗi khi tải lên tệp ${file.name}:`, error);
                
                // Thông báo lỗi
                if (this.mainView && this.mainView.showNotification) {
                    this.mainView.showNotification(`Lỗi khi tải lên tệp tin: ${error.message}`, 'error');
                }
                
                throw error;
            }
        } catch (error) {
            console.error('Lỗi khi xử lý tải lên tệp tin:', error);
            throw error;
        }
    }

    /**
     * Thêm một hoạt động gần đây
     * @param {Object} activity - Thông tin hoạt động
     */
    addRecentActivity(activity) {
        // Thêm vào đầu danh sách
        this.recentActivities.unshift(activity);
        
        // Giới hạn số lượng hoạt động
        if (this.recentActivities.length > 20) {
            this.recentActivities = this.recentActivities.slice(0, 20);
        }
        
        // Lưu vào localStorage
        this.saveRecentActivities();
        
        // Cập nhật giao diện
        if (this.storageView) {
            this.storageView.displayRecentActivities(this.recentActivities);
        }
    }

    /**
     * Lưu danh sách hoạt động gần đây vào localStorage
     */
    saveRecentActivities() {
        try {
            const userId = this.userModel.getCurrentUser()?.id;
            if (userId) {
                localStorage.setItem(`mediaVault_activities_${userId}`, JSON.stringify(this.recentActivities));
            }
        } catch (error) {
            console.error('Lỗi khi lưu hoạt động gần đây:', error);
        }
    }

    /**
     * Xem trước tệp
     * @param {Object} file - Thông tin tệp
     */
    async previewFile(file) {
        try {
            // Kiểm tra xác thực người dùng
            const isAuthenticated = await this.checkUserAuthentication();
            
            if (!isAuthenticated) {
                if (this.mainView) {
                    this.mainView.showNotification('Vui lòng đăng nhập để xem tệp', 'warning');
                    this.mainView.showModal('login-modal');
                }
                return;
            }
            
            console.log('Previewing file:', file.name);
            
            // Kiểm tra xem tệp có nội dung không
            if (!file.content && !file.url) {
                console.error('File has no content or URL');
                if (this.mainView) {
                    this.mainView.showNotification('Không thể xem trước tệp này', 'error');
                }
                return;
            }
            
            // Hiển thị tệp dựa trên loại
            if (this.storageView && this.storageView.previewFile) {
                this.storageView.previewFile(file);
            } else if (this.mainView && this.mainView.previewFile) {
                this.mainView.previewFile(file);
            } else {
                console.error('No preview method available');
                // Mở tệp trong tab mới nếu có URL
                if (file.url) {
                    window.open(file.url, '_blank');
                }
            }
            
            // Thêm vào hoạt động gần đây
            this.addRecentActivity({
                type: 'view',
                fileId: file.id,
                fileName: file.name,
                fileType: file.type,
                date: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error previewing file:', error);
            if (this.mainView) {
                this.mainView.showNotification('Có lỗi xảy ra khi xem trước tệp: ' + error.message, 'error');
            }
        }
    }

    /**
     * Tải xuống tệp
     * @param {Object} file - Thông tin tệp
     */
    async downloadFile(file) {
        try {
            // Kiểm tra xác thực người dùng
            const isAuthenticated = await this.checkUserAuthentication();
            
            if (!isAuthenticated) {
                if (this.mainView) {
                    this.mainView.showNotification('Vui lòng đăng nhập để tải xuống tệp', 'warning');
                    this.mainView.showModal('login-modal');
                }
                return;
            }
            
            console.log('Downloading file:', file.name);
            
            // Tạo và tải xuống tệp
            if (file.content) {
                // Đối với dữ liệu Base64
                const contentType = file.type || 'application/octet-stream';
                const byteCharacters = atob(file.content.split(',')[1] || file.content);
                const byteArrays = [];
                
                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);
                    
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    
                    const byteArray = new Uint8Array(byteNumbers);
                    byteArrays.push(byteArray);
                }
                
                const blob = new Blob(byteArrays, { type: contentType });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // Thêm vào hoạt động gần đây
                this.addRecentActivity({
                    type: 'download',
                    fileId: file.id,
                    fileName: file.name,
                    fileType: file.type,
                    date: new Date().toISOString()
                });
                
                if (this.mainView) {
                    this.mainView.showNotification(`Đã tải xuống "${file.name}"`, 'success');
                }
            } else if (file.url) {
                // Đối với URL
                window.open(file.url, '_blank');
                
                // Thêm vào hoạt động gần đây
                this.addRecentActivity({
                    type: 'download',
                    fileId: file.id,
                    fileName: file.name,
                    fileType: file.type,
                    date: new Date().toISOString()
                });
            } else {
                console.error('File has no content or URL');
                if (this.mainView) {
                    this.mainView.showNotification('Không thể tải xuống tệp này', 'error');
                }
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            if (this.mainView) {
                this.mainView.showNotification('Có lỗi xảy ra khi tải xuống tệp: ' + error.message, 'error');
            }
        }
    }

    /**
     * Xóa tệp
     * @param {Object} file - Thông tin tệp
     */
    async deleteFile(file) {
        try {
            // Kiểm tra xác thực người dùng
            const isAuthenticated = await this.checkUserAuthentication();
            
            if (!isAuthenticated) {
                if (this.mainView) {
                    this.mainView.showNotification('Vui lòng đăng nhập để xóa tệp', 'warning');
                    this.mainView.showModal('login-modal');
                }
                return;
            }
            
            // Hiển thị hộp thoại xác nhận xóa
            if (this.mainView && this.mainView.showConfirmDialog) {
                this.mainView.showConfirmDialog(
                    `Xóa "${file.name}"`,
                    'Bạn có chắc chắn muốn xóa tệp này? Hành động này không thể hoàn tác.',
                    async () => {
                        try {
                            // Thực hiện xóa tệp
            await this.fileModel.deleteFile(file.id);
            
                            // Cập nhật hiển thị
            this.files = this.files.filter(f => f.id !== file.id);
            this.calculateUsedStorage();
                            this.calculateFileTypeCounts();
            this.updateStorageDisplay();
                            this.renderFiles();
                            
                            // Thêm vào hoạt động gần đây
                            this.addRecentActivity({
                                type: 'delete',
                                fileId: file.id,
                                fileName: file.name,
                                fileType: file.type,
                                date: new Date().toISOString()
                            });
                            
                            console.log('File deleted:', file.name);
                            
                            if (this.mainView) {
                                this.mainView.showNotification(`Đã xóa "${file.name}"`, 'success');
                            }
                        } catch (error) {
                            console.error('Error deleting file:', error);
                            if (this.mainView) {
                                this.mainView.showNotification('Có lỗi xảy ra khi xóa tệp: ' + error.message, 'error');
                            }
                        }
                    }
                );
            } else {
                // Nếu không có hiển thị hộp thoại, xóa ngay
                if (confirm(`Bạn có chắc chắn muốn xóa "${file.name}"? Hành động này không thể hoàn tác.`)) {
                    await this.fileModel.deleteFile(file.id);
                    
                    // Cập nhật hiển thị
                    this.files = this.files.filter(f => f.id !== file.id);
                    this.calculateUsedStorage();
                    this.calculateFileTypeCounts();
                    this.updateStorageDisplay();
            this.renderFiles();
            
                    console.log('File deleted:', file.name);
                    
            if (this.mainView) {
                        this.mainView.showNotification(`Đã xóa "${file.name}"`, 'success');
            }
                }
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            if (this.mainView) {
                this.mainView.showNotification('Có lỗi xảy ra khi xóa tệp: ' + error.message, 'error');
            }
        }
    }

    /**
     * Dọn dẹp lưu trữ (xóa tệp cũ hoặc tạm thời)
     */
    async cleanStorage() {
        try {
            // Xác nhận dọn dẹp
            if (!confirm('Bạn có chắc chắn muốn dọn dẹp lưu trữ? Thao tác này sẽ xóa các tệp tạm thời và dữ liệu không sử dụng.')) {
                return;
            }
            
            // Lấy ID người dùng hiện tại
            const currentUser = await this.userModel.getCurrentUser();
            if (!currentUser) {
                return;
            }
            
            // Lọc tệp đã kiểm tra trùng lặp nhưng không lưu lại
            const temporaryFiles = this.files.filter(file => file.temporary === true);
            
            if (temporaryFiles.length === 0) {
                if (this.mainView) {
                    this.mainView.showNotification('Không có tệp nào cần dọn dẹp', 'info');
                }
                return;
            }
            
            // Xóa từng tệp tạm thời
            for (const file of temporaryFiles) {
                await this.fileModel.deleteFile(file.id);
            }
            
            // Cập nhật danh sách tệp
            this.files = this.files.filter(file => file.temporary !== true);
            
            // Cập nhật dung lượng đã sử dụng
            this.calculateUsedStorage();
            this.updateStorageDisplay();
            
            // Cập nhật thống kê loại tệp
            this.calculateFileTypeCounts();
            
            // Cập nhật hoạt động gần đây
            this.loadRecentActivities();
            
            // Hiển thị lại danh sách tệp
            this.renderFiles();
            
            // Hiển thị thông báo thành công
            if (this.mainView) {
                this.mainView.showNotification(`Đã dọn dẹp ${temporaryFiles.length} tệp tạm thời`, 'success');
            }
            
        } catch (error) {
            console.error('Error cleaning storage:', error);
            if (this.mainView) {
                this.mainView.showNotification(`Lỗi khi dọn dẹp lưu trữ: ${error.message}`, 'error');
            }
        }
    }

    /**
     * Xử lý khi người dùng thay đổi tab
     * @param {string} tabId - ID của tab được chọn
     */
    handleTabChange(tabId) {
        console.log(`Tab changed to: ${tabId}`);
        
        // Lưu tab hiện tại
        this.currentTab = tabId;
        
        // Lọc tệp tin dựa trên tab được chọn
        let filteredFiles = [...this.files];
        
        switch (tabId) {
            case 'recent':
                // Lọc tệp tin đã tải lên trong 7 ngày qua
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                
                filteredFiles = filteredFiles.filter(file => {
                    const uploadDate = new Date(file.uploadDate || Date.now());
                    return uploadDate >= oneWeekAgo;
                });
                break;
                
            case 'shared':
                // Lọc tệp tin đã chia sẻ
                filteredFiles = filteredFiles.filter(file => file.shared);
                break;
                
            default: // 'all-files'
                // Giữ nguyên danh sách
                break;
        }
        
        // Cập nhật danh sách hiển thị
        this.renderFileList(filteredFiles);
    }
    
    /**
     * Xử lý khi người dùng thay đổi bộ lọc loại tệp
     * @param {string} filterValue - Giá trị bộ lọc
     */
    handleFilterChange(filterValue) {
        console.log(`Filter changed to: ${filterValue}`);
        
        // Lưu bộ lọc hiện tại
        this.fileTypeFilter = filterValue;
        
        // Cập nhật hiển thị
        this.renderFiles();
    }
    
    /**
     * Xử lý khi người dùng thay đổi cách sắp xếp
     * @param {string} sortValue - Giá trị sắp xếp
     */
    handleSortChange(sortValue) {
        console.log(`Sort changed to: ${sortValue}`);
        
        // Lưu cách sắp xếp hiện tại
        this.sortBy = sortValue;
        
        // Cập nhật hiển thị
        this.renderFiles();
    }
    
    /**
     * Hiển thị danh sách tệp tin
     * @param {Array} files - Danh sách tệp tin cần hiển thị
     */
    renderFileList(files) {
        const fileListElement = document.querySelector('.files-container');
        const emptyMessage = document.querySelector('.empty-files-message');
        
        if (!fileListElement) return;
        
        // Hiển thị thông báo nếu không có tệp tin
        if (!files || files.length === 0) {
            if (emptyMessage) emptyMessage.style.display = 'block';
            return;
        }
        
        // Ẩn thông báo trống
        if (emptyMessage) emptyMessage.style.display = 'none';
        
        // Tạo HTML cho danh sách tệp tin
        let fileListHTML = '<div class="file-list">';
        
        files.forEach(file => {
            // Xác định icon dựa trên loại tệp
            let fileIcon = 'fa-file-alt';
            let fileColorClass = 'text-secondary';
            
            if (file.type) {
                if (file.type.includes('pdf')) {
                    fileIcon = 'fa-file-pdf';
                    fileColorClass = 'text-danger';
                } else if (file.type.includes('word') || file.type.includes('doc')) {
                    fileIcon = 'fa-file-word';
                    fileColorClass = 'text-primary';
                } else if (file.type.includes('image')) {
                    fileIcon = 'fa-file-image';
                    fileColorClass = 'text-success';
                } else if (file.type.includes('video')) {
                    fileIcon = 'fa-file-video';
                    fileColorClass = 'text-warning';
                } else if (file.type.includes('audio')) {
                    fileIcon = 'fa-file-audio';
                    fileColorClass = 'text-info';
                } else if (file.type.includes('zip') || file.type.includes('rar')) {
                    fileIcon = 'fa-file-archive';
                    fileColorClass = 'text-dark';
                }
            }
            
            // Định dạng kích thước
            let sizeText = 'Unknown';
            if (file.size) {
                if (file.size < 1024) {
                    sizeText = `${file.size} B`;
                } else if (file.size < 1024 * 1024) {
                    sizeText = `${(file.size / 1024).toFixed(2)} KB`;
                } else {
                    sizeText = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
                }
            }
            
            // Định dạng ngày
            const date = new Date(file.uploadDate || Date.now());
            const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            
            // Thêm file vào danh sách
            fileListHTML += `
                <div class="file-item" data-id="${file.id}">
                    <div class="file-icon ${fileColorClass}">
                        <i class="fas ${fileIcon}"></i>
                    </div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-info">
                            <span class="file-size">${sizeText}</span>
                            <span class="file-date">${dateStr}</span>
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="file-action download" title="Tải xuống">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="file-action share" title="Chia sẻ">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="file-action delete" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        fileListHTML += '</div>';
        
        // Cập nhật nội dung
        fileListElement.innerHTML = fileListHTML;
        
        // Đăng ký sự kiện cho các nút
        this.registerFileActions();
    }
    
    /**
     * Đăng ký sự kiện cho các nút thao tác với tệp tin
     */
    registerFileActions() {
        // Đăng ký sự kiện cho nút tải xuống
        document.querySelectorAll('.file-action.download').forEach(button => {
            button.addEventListener('click', (e) => {
                const fileId = e.target.closest('.file-item').dataset.id;
                this.handleFileDownload(fileId);
            });
        });
        
        // Đăng ký sự kiện cho nút chia sẻ
        document.querySelectorAll('.file-action.share').forEach(button => {
            button.addEventListener('click', (e) => {
                const fileId = e.target.closest('.file-item').dataset.id;
                this.handleFileShare(fileId);
            });
        });
        
        // Đăng ký sự kiện cho nút xóa
        document.querySelectorAll('.file-action.delete').forEach(button => {
            button.addEventListener('click', (e) => {
                const fileId = e.target.closest('.file-item').dataset.id;
                this.handleFileDelete(fileId);
            });
        });
    }

    /**
     * Xử lý tải xuống tệp tin
     * @param {string} fileId - ID của tệp tin
     */
    handleFileDownload(fileId) {
        try {
            console.log(`Downloading file with ID: ${fileId}`);
            
            // Tìm tệp tin trong danh sách
            const file = this.files.find(f => f.id === fileId);
            
            if (!file) {
                console.error(`File with ID ${fileId} not found`);
                if (this.mainView) {
                    this.mainView.showNotification('Không tìm thấy tệp tin', 'error');
                }
                return;
            }
            
            // Hiển thị thông báo đang tải
            if (this.mainView) {
                this.mainView.showNotification('Đang chuẩn bị tải xuống...', 'info');
            }
            
            // Mô phỏng tải xuống (trong triển khai thực tế, sẽ thực sự tải xuống tệp)
            setTimeout(() => {
                console.log(`File ${file.name} download completed`);
                
                // Cập nhật lần truy cập gần nhất
                file.lastAccessed = new Date().toISOString();
                
                // Lưu vào MongoDB
                this.fileModel.updateFile(fileId, { lastAccessed: file.lastAccessed })
                    .then(() => {
                        console.log(`Updated lastAccessed for file ${fileId}`);
                    })
                    .catch(error => {
                        console.error(`Error updating file metadata: ${error}`);
                    });
                
                // Hiển thị thông báo thành công
                if (this.mainView) {
                    this.mainView.showNotification('Tải xuống thành công', 'success');
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error downloading file:', error);
            if (this.mainView) {
                this.mainView.showNotification(`Lỗi khi tải xuống: ${error.message}`, 'error');
            }
        }
    }
    
    /**
     * Xử lý chia sẻ tệp tin
     * @param {string} fileId - ID của tệp tin
     */
    handleFileShare(fileId) {
        try {
            console.log(`Sharing file with ID: ${fileId}`);
            
            // Tìm tệp tin trong danh sách
            const file = this.files.find(f => f.id === fileId);
            
            if (!file) {
                console.error(`File with ID ${fileId} not found`);
                if (this.mainView) {
                    this.mainView.showNotification('Không tìm thấy tệp tin', 'error');
                }
                return;
            }
            
            // Mô phỏng hiển thị hộp thoại chia sẻ
            this.showSharingDialog(file);
            
        } catch (error) {
            console.error('Error sharing file:', error);
            if (this.mainView) {
                this.mainView.showNotification(`Lỗi khi chia sẻ: ${error.message}`, 'error');
            }
        }
    }
    
    /**
     * Hiển thị hộp thoại chia sẻ tệp tin
     * @param {Object} file - Thông tin tệp tin
     */
    showSharingDialog(file) {
        // Kiểm tra xem dialog đã tồn tại chưa
        let shareDialog = document.getElementById('share-dialog');
        
        if (!shareDialog) {
            // Tạo dialog nếu chưa tồn tại
            shareDialog = document.createElement('div');
            shareDialog.id = 'share-dialog';
            shareDialog.className = 'modal';
            
            shareDialog.innerHTML = `
                <div class="modal-content">
                    <span class="close-btn" id="share-close"><i class="fas fa-times"></i></span>
                    <h3>Chia sẻ tệp tin</h3>
                    <div id="share-file-info"></div>
                    <div class="share-options">
                        <div class="share-option">
                            <h4>Liên kết chia sẻ</h4>
                            <div class="share-link-container">
                                <input type="text" id="share-link" readonly>
                                <button id="copy-link" class="btn btn-outline">
                                    <i class="fas fa-copy"></i> Sao chép
                                </button>
                            </div>
                        </div>
                        <div class="share-option">
                            <h4>Chia sẻ qua email</h4>
                            <div class="share-email-container">
                                <input type="email" id="share-email" placeholder="Nhập địa chỉ email">
                                <button id="send-email" class="btn btn-primary">
                                    <i class="fas fa-paper-plane"></i> Gửi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(shareDialog);
            
            // Xử lý đóng dialog
            const closeBtn = document.getElementById('share-close');
            closeBtn.addEventListener('click', () => {
                shareDialog.style.display = 'none';
            });
            
            // Đóng khi nhấp bên ngoài
            window.addEventListener('click', (event) => {
                if (event.target === shareDialog) {
                    shareDialog.style.display = 'none';
                }
            });
        }
        
        // Cập nhật thông tin tệp tin
        const fileInfoElement = document.getElementById('share-file-info');
        fileInfoElement.innerHTML = `
            <p><strong>Tên tệp:</strong> ${file.name}</p>
            <p><strong>Loại:</strong> ${file.type || 'Không xác định'}</p>
        `;
        
        // Tạo liên kết chia sẻ
        const shareLink = document.getElementById('share-link');
        const shareUrl = `${window.location.origin}/share.html?file=${file.id}`;
        shareLink.value = shareUrl;
        
        // Xử lý sao chép liên kết
        const copyBtn = document.getElementById('copy-link');
        copyBtn.addEventListener('click', () => {
            shareLink.select();
            document.execCommand('copy');
            
            if (this.mainView) {
                this.mainView.showNotification('Đã sao chép liên kết', 'success');
            }
        });
        
        // Xử lý gửi email
        const sendEmailBtn = document.getElementById('send-email');
        sendEmailBtn.addEventListener('click', () => {
            const emailInput = document.getElementById('share-email');
            const email = emailInput.value.trim();
            
            if (!email) {
                if (this.mainView) {
                    this.mainView.showNotification('Vui lòng nhập địa chỉ email', 'warning');
                }
                return;
            }
            
            // Mô phỏng gửi email
            if (this.mainView) {
                this.mainView.showNotification(`Đã gửi liên kết đến ${email}`, 'success');
            }
            
            // Cập nhật trạng thái chia sẻ
            file.shared = true;
            file.sharedWith = file.sharedWith || [];
            file.sharedWith.push({
                email: email,
                date: new Date().toISOString()
            });
            
            // Lưu vào MongoDB
            this.fileModel.updateFile(file.id, { 
                shared: true,
                sharedWith: file.sharedWith
            }).then(() => {
                console.log(`Updated sharing status for file ${file.id}`);
            }).catch(error => {
                console.error(`Error updating file sharing status: ${error}`);
            });
            
            // Đóng dialog
            shareDialog.style.display = 'none';
        });
        
        // Hiển thị dialog
        shareDialog.style.display = 'flex';
    }
    
    /**
     * Xử lý xóa tệp tin
     * @param {string} fileId - ID của tệp tin
     */
    handleFileDelete(fileId) {
        try {
            console.log(`Deleting file with ID: ${fileId}`);
            
            // Tìm tệp tin trong danh sách
            const file = this.files.find(f => f.id === fileId);
            
            if (!file) {
                console.error(`File with ID ${fileId} not found`);
                if (this.mainView) {
                    this.mainView.showNotification('Không tìm thấy tệp tin', 'error');
                }
                return;
            }
            
            // Hiển thị xác nhận
            this.showConfirmation(
                `Bạn có chắc chắn muốn xóa tệp tin "${file.name}" không?`,
                async () => {
                    try {
                        // Hiển thị thông báo đang xóa
                        if (this.mainView) {
                            this.mainView.showNotification('Đang xóa tệp tin...', 'info');
                        }
                        
                        // Xóa tệp tin
                        await this.fileModel.deleteFile(fileId);
                        
                        // Cập nhật danh sách tệp tin
                        this.files = this.files.filter(f => f.id !== fileId);
                        
                        // Cập nhật hiển thị
                        this.calculateUsedStorage();
                        this.calculateFileTypeCounts();
                        this.updateStorageDisplay();
                        this.renderFiles();
                        
                        console.log(`File ${file.name} deleted successfully`);
                        
                        // Hiển thị thông báo thành công
                        if (this.mainView) {
                            this.mainView.showNotification('Đã xóa tệp tin', 'success');
                        }
                    } catch (error) {
                        console.error('Error deleting file:', error);
                        if (this.mainView) {
                            this.mainView.showNotification(`Lỗi khi xóa tệp tin: ${error.message}`, 'error');
                        }
                    }
                }
            );
            
        } catch (error) {
            console.error('Error handling file deletion:', error);
            if (this.mainView) {
                this.mainView.showNotification(`Lỗi: ${error.message}`, 'error');
            }
        }
    }
    
    /**
     * Hiển thị hộp thoại xác nhận
     * @param {string} message - Nội dung xác nhận
     * @param {Function} onConfirm - Hàm xử lý khi xác nhận
     */
    showConfirmation(message, onConfirm) {
        // Kiểm tra xem dialog đã tồn tại chưa
        let confirmDialog = document.getElementById('confirm-dialog');
        
        if (!confirmDialog) {
            // Tạo dialog nếu chưa tồn tại
            confirmDialog = document.createElement('div');
            confirmDialog.id = 'confirm-dialog';
            confirmDialog.className = 'modal';
            
            confirmDialog.innerHTML = `
                <div class="modal-content">
                    <span class="close-btn" id="confirm-close"><i class="fas fa-times"></i></span>
                    <h3>Xác nhận</h3>
                    <p id="confirm-message"></p>
                    <div class="modal-actions">
                        <button id="confirm-cancel" class="btn btn-outline">Hủy</button>
                        <button id="confirm-ok" class="btn btn-primary">Xác nhận</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(confirmDialog);
        }
        
        // Cập nhật nội dung
        const messageElement = document.getElementById('confirm-message');
        messageElement.textContent = message;
        
        // Lấy các nút
        const closeBtn = document.getElementById('confirm-close');
        const cancelBtn = document.getElementById('confirm-cancel');
        const okBtn = document.getElementById('confirm-ok');
        
        // Xử lý đóng dialog
        const closeDialog = () => {
            confirmDialog.style.display = 'none';
        };
        
        closeBtn.onclick = closeDialog;
        cancelBtn.onclick = closeDialog;
        
        // Xử lý nút xác nhận
        okBtn.onclick = () => {
            closeDialog();
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        };
        
        // Đóng khi nhấp bên ngoài
        window.onclick = (event) => {
            if (event.target === confirmDialog) {
                closeDialog();
            }
        };
        
        // Hiển thị dialog
        confirmDialog.style.display = 'flex';
    }

    /**
     * Gets the total storage used by a user
     * @param {string} userId - User ID
     * @returns {number} - Total storage used in bytes
     */
    getTotalStorageUsed(userId) {
        try {
            // Get all files for the user
            const userFiles = this.fileModel.getUserFiles(userId);
            
            // Calculate total size
            const totalSize = userFiles.reduce((total, file) => {
                return total + (file.size || 0);
            }, 0);
            
            return totalSize;
        } catch (error) {
            console.error('Error calculating total storage used:', error);
            return 0;
        }
    }

    /**
     * Gets the storage limit for a user based on their plan
     * @param {Object} user - User object
     * @returns {number} - Storage limit in bytes
     */
    getUserStorageLimit(user) {
        // Default limit (1GB for free users)
        let storageLimit = 1 * 1024 * 1024 * 1024;
        
        if (!user || !user.plan) {
            return storageLimit;
        }
        
        // Adjust limit based on user's plan
        switch (user.plan) {
            case 'basic':
                storageLimit = 5 * 1024 * 1024 * 1024; // 5GB
                break;
            case 'premium':
                storageLimit = 50 * 1024 * 1024 * 1024; // 50GB
                break;
            case 'business':
                storageLimit = 200 * 1024 * 1024 * 1024; // 200GB
                break;
        }
        
        return storageLimit;
    }

    /**
     * Formats a file size in bytes to a human-readable string
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
} 
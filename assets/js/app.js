// Initialize components when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo các models
    const userModel = new UserModel();
    
    // Khởi tạo kết nối MongoDB
    let mongoDB = null;
    try {
        mongoDB = new MongoDB({
            apiKey: CONFIG.MONGODB_API_KEY,
            privateKey: CONFIG.MONGODB_PRIVATE_KEY,
            connectionString: CONFIG.MONGODB_CONNECTION_STRING,
            dataSource: CONFIG.MONGODB_DATA_SOURCE,
            database: CONFIG.MONGODB_DATABASE
        });
    } catch (error) {
        console.error('MongoDB initialization error:', error);
        if (window.mainView) {
            window.mainView.showNotification('Không thể kết nối đến cơ sở dữ liệu. Đang sử dụng lưu trữ cục bộ.', 'warning');
        }
    }
    
    // Xác định trang hiện tại
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Khởi tạo main view trước để đảm bảo có thể hiển thị thông báo
    if (typeof MainView !== 'undefined' && !window.mainView) {
        window.mainView = new MainView();
    }
    
    // Khởi tạo authentication view
    if (typeof AuthView !== 'undefined') {
        // Đảm bảo authView đã được khởi tạo và gán vào biến toàn cục
        if (!window.authView) {
            window.authView = new AuthView();
            console.log("AuthView initialized");
        }
        
        // Đợi một chút để đảm bảo AuthView đã khởi tạo xong
        setTimeout(() => {
            // Khởi tạo auth controller với instance authView 
            if (typeof AuthController !== 'undefined' && window.authView) {
                const authController = new AuthController(userModel, window.authView);
                window.authController = authController;
                console.log("AuthController initialized with authView");
            } else {
                console.error("AuthController class is not defined or authView is not ready!");
            }
        }, 100);
    } else {
        console.error("AuthView class is not defined!");
    }
    
    // Khởi tạo các thành phần cụ thể cho từng trang
    initializePageComponents(currentPage, userModel, mongoDB);
    
    // Khởi tạo chức năng chung cho tất cả các trang
    setupMobileNav();
    setupSessionChecks(userModel);
});

/**
 * Khởi tạo các thành phần của trang dựa trên trang hiện tại
 */
function initializePageComponents(page, userModel, mongoDB) {
    // Khởi tạo các thành phần chung
    window.mainView = new MainView();
    window.authView = new AuthView();
    window.authController = new AuthController(userModel, window.authView);
    
    // Khởi tạo các thành phần riêng của từng trang
    if (page === 'index.html' || page === '' || page === '/') {
        // Trang chủ
        // Không cần khởi tạo thêm
    } else if (page === 'check.html') {
        // Trang kiểm tra trùng lặp
        window.fileModel = new FileModel();
        const plagiarismAPI = new PlagiarismAPI();
        window.mainController = new MainController(window.fileModel, window.mainView, plagiarismAPI, userModel);
        console.log("MainController initialized correctly from app.js");
    } else if (page === 'history.html') {
        // Trang lịch sử
        window.fileModel = new FileModel();
        window.historyController = new HistoryController(userModel, window.fileModel, window.mainView);
    } else if (page === 'subscription.html') {
        // Trang gói đăng ký
        window.subscriptionView = new SubscriptionView();
        window.subscriptionController = new SubscriptionController(userModel, window.mainView, window.subscriptionView);
    } else if (page === 'storage.html') {
        // Trang lưu trữ
        window.fileModel = new FileModel();
        window.storageView = new StorageView();
        window.storageController = new StorageController(window.fileModel, userModel, window.mainView);
    } else {
        // Khởi tạo thành phần mặc định cho các trang khác
        if (window.MainView && !window.mainView) {
            window.mainView = new MainView();
        }
    }
}

/**
 * Cài đặt điều hướng trên thiết bị di động
 */
function setupMobileNav() {
    // Xử lý điều hướng trên thiết bị di động
    const hamburger = document.querySelector('.hamburger');
    const mobileNav = document.querySelector('.mobile-nav');
    
    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileNav.classList.toggle('active');
            
            // Ngăn cuộn trang khi menu đang mở
            document.body.style.overflow = 
                mobileNav.classList.contains('active') ? 'hidden' : '';
        });
        
        // Đóng mobile nav khi nhấp chuột ra ngoài
        document.addEventListener('click', (e) => {
            if (mobileNav.classList.contains('active') && 
                !mobileNav.contains(e.target) && 
                !hamburger.contains(e.target)) {
                
                hamburger.classList.remove('active');
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}

/**
 * Cài đặt kiểm tra phiên làm việc
 * @param {UserModel} userModel - Model quản lý người dùng
 */
function setupSessionChecks(userModel) {
    // Kiểm tra tính hợp lệ của phiên định kỳ (mỗi 5 phút)
    setInterval(() => {
        userModel.validateSession();
    }, 5 * 60 * 1000);
    
    // Thêm sự kiện lắng nghe cho thay đổi khả năng hiển thị trang
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Xác thực phiên khi người dùng quay lại tab
            userModel.validateSession();
        }
    });
    
    // Kiểm tra trước khi tải lại trang để đảm bảo tính bền vững của phiên
    window.addEventListener('beforeunload', () => {
        // Đảm bảo phiên được lưu đúng cách
        const currentUser = userModel.getCurrentUser();
        if (currentUser) {
            localStorage.setItem('mediaVault_currentUser', JSON.stringify(currentUser));
        }
    });
}
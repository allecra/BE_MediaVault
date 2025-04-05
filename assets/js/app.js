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
 * Khởi tạo các thành phần cụ thể cho từng trang
 * @param {string} page - Tên trang hiện tại
 * @param {UserModel} userModel - Model quản lý người dùng
 * @param {MongoDB} mongoDB - Kết nối đến MongoDB
 */
function initializePageComponents(page, userModel, mongoDB) {
    // Khởi tạo các controllers và views dựa vào trang hiện tại
    switch (page) {
        case 'index.html':
        case '':
            // Khởi tạo thành phần cho trang chủ
            if (window.MainView && !window.mainView) {
                window.mainView = new MainView();
            }
            break;
            
        case 'check.html':
            // Khởi tạo thành phần cho trang kiểm tra
            if (window.MainView && !window.mainView) {
                window.mainView = new MainView();
            }
            
            // Khởi tạo mainController cho trang kiểm tra
            if (window.MainController && !window.mainController) {
                const fileModel = new FileModel();
                const plagiarismAPI = new PlagiarismAPI();
                window.mainController = new MainController(fileModel, window.mainView, plagiarismAPI, userModel);
                console.log("MainController initialized for check page");
            }
            break;
            
        case 'admin.html':
            // Khởi tạo thành phần cho trang admin
            if (window.AdminView && window.AdminController) {
                const adminView = new AdminView();
                const adminController = new AdminController(userModel, mongoDB);
                
                // Tải dữ liệu ban đầu cho dashboard
                adminController.loadDashboard();
            }
            break;
            
        case 'history.html':
            // Khởi tạo thành phần cho trang lịch sử
            if (window.MainView && !window.mainView) {
                window.mainView = new MainView();
            }
            
            if (window.HistoryController) {
                const historyController = new HistoryController(userModel, mongoDB);
                historyController.loadHistory();
            }
            break;
            
        case 'subscription.html':
            // Khởi tạo thành phần cho trang đăng ký gói dịch vụ
            if (window.MainView && !window.mainView) {
                window.mainView = new MainView();
            }
            
            if (window.SubscriptionController) {
                const subscriptionController = new SubscriptionController(userModel);
                subscriptionController.loadPlans();
            }
            
            if (window.PaymentView && window.PaymentController) {
                const paymentView = new PaymentView();
                const paymentController = new PaymentController(userModel, paymentView);
            }
            break;
            
        default:
            // Khởi tạo thành phần mặc định cho các trang khác
            if (window.MainView && !window.mainView) {
                window.mainView = new MainView();
            }
            break;
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
/**
 * Lớp xử lý giao diện xác thực người dùng
 * Quản lý hiển thị modal đăng nhập, đăng ký, profile và các chức năng người dùng
 */
class AuthView {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
    }
    
    /**
     * Khởi tạo các biến tham chiếu đến phần tử HTML
     */
    initializeElements() {
        // Các phần tử sẽ được khởi tạo trong setupEventListeners để đảm bảo DOM đã được tải
        this.userDropdown = null;
        this.userIcon = null;
        this.dropdownContent = null;
        this.usernameDisplay = null;
        this.profileLink = null;
        this.settingsLink = null;
        this.logoutLink = null;
        
        // Initialize modal elements
        this.loginModal = document.getElementById('login-modal');
        this.registerModal = document.getElementById('register-modal');
        this.forgotPasswordModal = document.getElementById('forgot-password-modal');
        
        // Initialize notification elements
        this.loginNotification = document.getElementById('login-notification');
        this.registerNotification = document.getElementById('register-notification');
        this.forgotNotification = document.getElementById('forgot-notification');
        
        // Initialize form elements
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.forgotPasswordForm = document.getElementById('forgot-password-form');
    }
    
    /**
     * Thiết lập các sự kiện lắng nghe cho các phần tử
     */
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Khởi tạo các phần tử sau khi DOM đã được tải hoàn toàn
            this.userDropdown = document.querySelector('.user-dropdown');
            this.userIcon = document.querySelector('.user-icon');
            this.dropdownContent = document.querySelector('.dropdown-content');
            this.usernameDisplay = document.getElementById('username-display');
            this.profileLink = document.getElementById('profile-link');
            this.settingsLink = document.getElementById('settings-link');
            this.logoutLink = document.getElementById('logout-link');
            
            this.setupDropdown();
            this.setupProfileLinks();
        });
        
        // Setup event listeners for forgot password
        if (document.getElementById('forgot-password')) {
            document.getElementById('forgot-password').addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('login-modal');
                this.showModal('forgot-password-modal');
            });
        }
        
        if (document.getElementById('back-to-login')) {
            document.getElementById('back-to-login').addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('forgot-password-modal');
                this.showModal('login-modal');
            });
        }
        
        // Setup form submissions
        if (this.forgotPasswordForm) {
            this.forgotPasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('forgot-email').value;
                
                // Show processing notification
                this.showNotification('forgot-notification', 'Đang xử lý yêu cầu...', 'info');
                
                // Call the API or controller method to handle password reset
                setTimeout(() => {
                    // This is just a placeholder. In a real app, you would call an API endpoint
                    this.showNotification('forgot-notification', 'Hướng dẫn khôi phục mật khẩu đã được gửi tới email của bạn.', 'success');
                    // Reset the form
                    this.forgotPasswordForm.reset();
                }, 1500);
            });
        }
    }
    
    /**
     * Thiết lập chức năng cho dropdown menu của người dùng
     */
    setupDropdown() {
        if (!this.userIcon || !this.userDropdown || !this.dropdownContent) return;
        
        // Thêm sự kiện lắng nghe khi click vào icon người dùng
        this.userIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Chuyển đổi trạng thái active cho mobile
            this.userDropdown.classList.toggle('active');
            
            // Chuyển đổi hiển thị cho desktop
            const isVisible = this.dropdownContent.style.display === 'block' || 
                              this.dropdownContent.classList.contains('active');
            
            if (isVisible) {
                this.hideDropdown();
            } else {
                this.showDropdown();
            }
        });
        
        // Đóng dropdown khi click ra ngoài
        document.addEventListener('click', (e) => {
            if (this.userDropdown && 
                this.dropdownContent && 
                !this.userDropdown.contains(e.target)) {
                this.hideDropdown();
            }
        });
    }
    
    /**
     * Hiển thị dropdown menu
     */
    showDropdown() {
        if (!this.dropdownContent) return;
        
        this.dropdownContent.style.display = 'block';
        this.dropdownContent.style.opacity = '1';
        this.dropdownContent.style.transform = 'translateY(0)';
        this.dropdownContent.style.visibility = 'visible';
        this.userDropdown.classList.add('active');
        
        // Đặt focus vào liên kết đầu tiên để cải thiện khả năng truy cập
        const firstLink = this.dropdownContent.querySelector('a');
        if (firstLink) firstLink.focus();
    }
    
    /**
     * Ẩn dropdown menu
     */
    hideDropdown() {
        if (!this.dropdownContent) return;
        
        this.dropdownContent.style.opacity = '0';
        this.dropdownContent.style.transform = 'translateY(-10px)';
        this.dropdownContent.style.visibility = 'hidden';
        
        // Sử dụng setTimeout để cho phép hiệu ứng chuyển tiếp hoàn thành trước khi ẩn
        setTimeout(() => {
            if (this.dropdownContent.style.opacity === '0') {
                this.dropdownContent.style.display = 'none';
            }
        }, 300);
        
        this.userDropdown.classList.remove('active');
    }
    
    /**
     * Thiết lập các liên kết trong profile dropdown
     */
    setupProfileLinks() {
        // Thiết lập liên kết profile
        if (this.profileLink) {
            this.profileLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideDropdown();
                this.showModal('profile-modal');
            });
        }
        
        // Thiết lập liên kết cài đặt
        if (this.settingsLink) {
            this.settingsLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideDropdown();
                this.showModal('settings-modal');
            });
        }
        
        // Thiết lập liên kết đăng xuất
        if (this.logoutLink) {
            this.logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideDropdown();
                
                // Hiển thị hộp thoại xác nhận
                const confirmLogout = confirm('Bạn có chắc chắn muốn đăng xuất?');
                if (confirmLogout) {
                    // Kích hoạt sự kiện đăng xuất
                    const logoutEvent = new CustomEvent('user:logout');
                    document.dispatchEvent(logoutEvent);
                }
            });
        }
        
        // Lắng nghe sự kiện đăng xuất
        document.addEventListener('user:logout', () => {
            // Phần này sẽ được xử lý bởi auth controller
            // Chỉ đóng các modal đang mở
            const openModals = document.querySelectorAll('.modal[style*="display: flex"]');
            openModals.forEach(modal => {
                this.closeModal(modal.id);
            });
        });
    }

    /**
     * Hiển thị modal với ID cụ thể
     * @param {string} modalId - ID của modal cần hiển thị
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Đóng modal với ID cụ thể
     * @param {string} modalId - ID của modal cần đóng
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * Cập nhật giao diện điều hướng dựa trên trạng thái đăng nhập
     * @param {Object} user - Thông tin người dùng hiện tại
     */
    updateNav(user) {
        const guestLinks = document.querySelectorAll('.guest-only');
        const userLinks = document.querySelectorAll('.user-only');
        const usernameDisplay = document.getElementById('username-display');

        if (user) {
            // Người dùng đã đăng nhập
            guestLinks.forEach(link => link.style.display = 'none');
            userLinks.forEach(link => link.style.display = 'flex');
            
            // Cập nhật hiển thị tên người dùng
            if (usernameDisplay) {
                usernameDisplay.textContent = user.username || user.email;
                usernameDisplay.setAttribute('title', user.username || user.email);
            }
            
            // Cập nhật các liên kết admin nếu người dùng là admin
            if (user.isAdmin) {
                const adminLinks = document.querySelectorAll('.admin-link');
                adminLinks.forEach(link => {
                    link.style.display = 'block';
                });
            }
        } else {
            // Người dùng đã đăng xuất
            guestLinks.forEach(link => link.style.display = 'flex');
            userLinks.forEach(link => link.style.display = 'none');
            
            // Ẩn các liên kết admin
            const adminLinks = document.querySelectorAll('.admin-link');
            adminLinks.forEach(link => {
                link.style.display = 'none';
            });
            
            // Xóa tên người dùng
            if (usernameDisplay) {
                usernameDisplay.textContent = '';
                usernameDisplay.removeAttribute('title');
            }
        }
        
        // Thêm/cập nhật modal hồ sơ nếu cần
        this.ensureProfileModal(user);
    }
    
    /**
     * Đảm bảo modal hồ sơ tồn tại và được cập nhật
     * @param {Object} user - Thông tin người dùng hiện tại
     */
    ensureProfileModal(user) {
        if (!user) return;
        
        // Kiểm tra xem modal hồ sơ đã tồn tại chưa
        let profileModal = document.getElementById('profile-modal');
        
        if (!profileModal) {
            // Tạo modal hồ sơ mới
            profileModal = document.createElement('div');
            profileModal.id = 'profile-modal';
            profileModal.className = 'modal';
            
            profileModal.innerHTML = `
                <div class="modal-content">
                    <span class="close-btn" onclick="authView.closeModal('profile-modal')">
                        <i class="fas fa-times"></i>
                    </span>
                    <h3>Thông tin hồ sơ</h3>
                    <div class="profile-info">
                        <div class="profile-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="profile-details">
                            <p><strong>Tên người dùng:</strong> <span id="profile-username">${user.username || 'Chưa cập nhật'}</span></p>
                            <p><strong>Email:</strong> <span id="profile-email">${user.email}</span></p>
                            <p><strong>Gói dịch vụ:</strong> <span id="profile-plan">${user.plan || 'Miễn phí'}</span></p>
                            <p><strong>Ngày tham gia:</strong> <span id="profile-joined">${new Date(user.createdAt || Date.now()).toLocaleDateString('vi-VN')}</span></p>
                        </div>
                    </div>
                    <div class="profile-actions">
                        <button class="btn btn-primary" id="edit-profile-btn">Chỉnh sửa hồ sơ</button>
                        <button class="btn btn-outline" onclick="authView.closeModal('profile-modal')">Đóng</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(profileModal);
            
            // Thêm sự kiện lắng nghe cho nút chỉnh sửa hồ sơ
            const editProfileBtn = document.getElementById('edit-profile-btn');
            if (editProfileBtn) {
                editProfileBtn.addEventListener('click', () => {
                    this.closeModal('profile-modal');
                    this.showModal('settings-modal');
                });
            }
        } else {
            // Cập nhật thông tin hồ sơ
            const usernameElement = document.getElementById('profile-username');
            const emailElement = document.getElementById('profile-email');
            const planElement = document.getElementById('profile-plan');
            
            if (usernameElement) usernameElement.textContent = user.username || 'Chưa cập nhật';
            if (emailElement) emailElement.textContent = user.email;
            if (planElement) planElement.textContent = user.plan || 'Miễn phí';
        }
        
        // Đảm bảo modal cài đặt cũng tồn tại
        this.ensureSettingsModal(user);
    }
    
    /**
     * Đảm bảo modal cài đặt tồn tại và được cập nhật
     * @param {Object} user - Thông tin người dùng hiện tại
     */
    ensureSettingsModal(user) {
        if (!user) return;
        
        // Kiểm tra xem modal cài đặt đã tồn tại chưa
        let settingsModal = document.getElementById('settings-modal');
        
        if (!settingsModal) {
            // Tạo modal cài đặt mới
            settingsModal = document.createElement('div');
            settingsModal.id = 'settings-modal';
            settingsModal.className = 'modal';
            
            settingsModal.innerHTML = `
                <div class="modal-content">
                    <span class="close-btn" onclick="authView.closeModal('settings-modal')">
                        <i class="fas fa-times"></i>
                    </span>
                    <h3>Cài đặt tài khoản</h3>
                    <form id="settings-form">
                        <div class="form-group">
                            <label for="settings-username">Tên người dùng</label>
                            <input type="text" id="settings-username" value="${user.username || ''}" placeholder="Tên người dùng">
                        </div>
                        <div class="form-group">
                            <label for="settings-email">Email</label>
                            <input type="email" id="settings-email" value="${user.email}" readonly>
                            <small>Email không thể thay đổi</small>
                        </div>
                        <div class="form-group">
                            <label for="settings-password">Mật khẩu mới</label>
                            <input type="password" id="settings-password" placeholder="Để trống nếu không thay đổi">
                        </div>
                        <div class="form-group">
                            <label for="settings-confirm-password">Xác nhận mật khẩu</label>
                            <input type="password" id="settings-confirm-password" placeholder="Xác nhận mật khẩu mới">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Lưu thay đổi</button>
                            <button type="button" class="btn btn-outline" onclick="authView.closeModal('settings-modal')">Hủy</button>
                        </div>
                    </form>
                </div>
            `;
            
            document.body.appendChild(settingsModal);
            
            // Thêm sự kiện lắng nghe cho form cài đặt
            const settingsForm = document.getElementById('settings-form');
            if (settingsForm) {
                settingsForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const username = document.getElementById('settings-username').value;
                    const password = document.getElementById('settings-password').value;
                    const confirmPassword = document.getElementById('settings-confirm-password').value;
                    
                    // Xác thực dữ liệu
                    if (password && password !== confirmPassword) {
                        alert('Mật khẩu xác nhận không khớp!');
                        return;
                    }
                    
                    // Phát sự kiện để controller xử lý
                    const updateEvent = new CustomEvent('user:update', {
                        detail: { 
                            username,
                            password: password || undefined
                        }
                    });
                    
                    document.dispatchEvent(updateEvent);
                    
                    // Đóng modal
                    this.closeModal('settings-modal');
                });
            }
        } else {
            // Cập nhật giá trị form cài đặt
            const usernameInput = document.getElementById('settings-username');
            const emailInput = document.getElementById('settings-email');
            
            if (usernameInput) usernameInput.value = user.username || '';
            if (emailInput) emailInput.value = user.email;
        }
    }

    /**
     * Hiển thị thông báo trong phần tử cụ thể
     * @param {string} elementId - ID của phần tử chứa thông báo
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại thông báo (success, error, info, warning)
     */
    showNotification(elementId, message, type = 'info') {
        // Đầu tiên thử sử dụng hệ thống thông báo chính nếu có sẵn
        if (window.mainView && typeof window.mainView.showNotification === 'function') {
            window.mainView.showNotification(message, type);
            return;
        }
        
        // Sử dụng thông báo nội bộ nếu không có hệ thống thông báo chính
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with ID ${elementId} not found`);
            return;
        }
        
        // Xác định icon phù hợp theo loại thông báo
        let iconClass = 'fa-info-circle';
        if (type === 'success') {
            iconClass = 'fa-check-circle';
        } else if (type === 'error') {
            iconClass = 'fa-exclamation-circle';
        } else if (type === 'warning') {
            iconClass = 'fa-exclamation-triangle';
        }
        
        // Cập nhật thông báo
        element.innerHTML = message;
        element.className = 'auth-notification ' + type;
        element.style.display = 'block';
        
        // Tự động ẩn sau 5 giây
        setTimeout(() => {
            element.style.opacity = '0';
            setTimeout(() => {
                element.style.display = 'none';
                element.style.opacity = '1';
            }, 300);
        }, 5000);
    }
    
    /**
     * Hide a notification message
     * @param {string} elementId - ID of the notification container
     */
    hideNotification(elementId) {
        // Kiểm tra nếu elementId là một phần tử DOM
        let element;
        if (typeof elementId === 'string') {
            element = document.getElementById(elementId);
        } else {
            element = elementId; // Đã là phần tử DOM
        }
        
        if (element) {
            element.style.display = 'none';
        }
    }
    
    /**
     * Show login success message
     * @param {string} username - Name of the logged in user
     */
    showLoginSuccess(username) {
        this.showNotification('login-notification', `Đăng nhập thành công! Xin chào ${username}.`, 'success');
        
        // Close the modal after a short delay
        setTimeout(() => {
            this.closeModal('login-modal');
            location.reload(); // Reload the page to reflect logged in state
        }, 2000);
    }
    
    /**
     * Show registration success message
     */
    showRegisterSuccess() {
        this.showNotification('register-notification', 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.', 'success');
        
        // Switch to login modal after a short delay
        setTimeout(() => {
            this.closeModal('register-modal');
            this.showModal('login-modal');
            // Show a welcome message in the login notification
            this.showNotification('login-notification', 'Tài khoản đã được tạo thành công, vui lòng đăng nhập.', 'success');
        }, 2000);
    }
    
    /**
     * Show an error message for login
     * @param {string} errorMessage - Error message to display
     */
    showLoginError(errorMessage) {
        this.showNotification('login-notification', errorMessage, 'error');
    }
    
    /**
     * Show an error message for registration
     * @param {string} errorMessage - Error message to display
     */
    showRegisterError(errorMessage) {
        this.showNotification('register-notification', errorMessage, 'error');
    }
}

// Khởi tạo auth view và đảm bảo nó có sẵn trong phạm vi toàn cầu
const authView = new AuthView();
window.authView = authView; // Đảm bảo nó có sẵn trên toàn cầu
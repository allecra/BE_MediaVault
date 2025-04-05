class AuthController {
    constructor(userModel, authView) {
        this.userModel = userModel;
        this.authView = authView;
        this.setupEventListeners();
        this.checkAuth();
        
        // Initialize notification elements
        this.loginNotification = document.getElementById('login-notification');
        this.registerNotification = document.getElementById('register-notification');
    }

    setupEventListeners() {
        document.getElementById('login-form')?.addEventListener('submit', this.handleLogin.bind(this));
        document.getElementById('register-form')?.addEventListener('submit', this.handleRegister.bind(this));
        
        // Listen for custom logout event
        document.addEventListener('user:logout', this.handleLogout.bind(this));
        
        // Listen for user update event
        document.addEventListener('user:update', this.handleUserUpdate.bind(this));
        
        // Check authentication status when page loads
        window.addEventListener('load', this.checkAuth.bind(this));
        
        // Listen for forgot password link
        document.getElementById('forgot-password')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.authView.closeModal('login-modal');
            this.authView.showModal('forgot-password-modal');
        });
        
        // Listen for back to login link
        document.getElementById('back-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.authView.closeModal('forgot-password-modal');
            this.authView.showModal('login-modal');
        });
        
        // Listen for forgot password form submission
        document.getElementById('forgot-password-form')?.addEventListener('submit', this.handleForgotPassword.bind(this));
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const email = form.querySelector('#login-email').value;
        const password = form.querySelector('#login-password').value;
        const rememberMe = form.querySelector('#remember-me')?.checked || false;
        
        console.log('Login attempt:', email);
        
        // Lưu giá trị đầu vào để tránh mất dữ liệu khi refresh
        localStorage.setItem('temp_login_email', email);
        
        // Show processing notification
        this.showNotificationInElement('login-notification', 'Đang xử lý...', 'info');
        
        try {
            if (!this.userModel) {
                console.error('UserModel không có sẵn');
                this.showNotificationInElement('login-notification', 'Lỗi hệ thống. Vui lòng thử lại sau.', 'error');
                return;
            }
            
            const user = await this.userModel.login(email, password, rememberMe);
            if (user) {
                // Update navigation and close modal
                console.log('Login successful for user:', user.email);
                
                if (this.authView) {
                    this.authView.updateNav(user);
                }
                
                // Xóa dữ liệu tạm thời
                localStorage.removeItem('temp_login_email');
                
                // Reset form chỉ khi đăng nhập thành công
                form.reset();
                
                // Show success notification and handle redirect with delay
                this.showNotificationInElement('login-notification', `Đăng nhập thành công! Xin chào ${user.username || user.email}.`, 'success');
                
                // Add delay for user to see the success message
                setTimeout(() => {
                    if (this.authView) {
                        this.authView.closeModal('login-modal');
                    }
                    
                    // Check if redirect is needed (admin or specific page)
                    if (user.role === 'admin') {
                        console.log('Admin user detected, redirecting to admin page');
                        // Redirect to admin page
                        window.location.href = 'admin.html';
                    } else if (user.isAdmin && window.location.pathname.includes('admin.html')) {
                        // Already on admin page, just refresh
                        window.location.reload();
                    } else if (sessionStorage.getItem('redirectAfterLogin')) {
                        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                        sessionStorage.removeItem('redirectAfterLogin');
                        window.location.href = redirectUrl;
                    } else {
                        // Reload to update UI
                        window.location.reload();
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotificationInElement('login-notification', error.message || 'Đăng nhập thất bại! Vui lòng kiểm tra thông tin đăng nhập.', 'error');
            
            // Khôi phục dữ liệu đầu vào khi có lỗi xảy ra
            if (localStorage.getItem('temp_login_email')) {
                const savedEmail = localStorage.getItem('temp_login_email');
                if (form.querySelector('#login-email').value !== savedEmail) {
                    form.querySelector('#login-email').value = savedEmail;
                }
            }
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const form = event.target;
        const username = form.querySelector('#register-username')?.value || '';
        const email = form.querySelector('#register-email').value;
        const password = form.querySelector('#register-password').value;
        const confirmPassword = form.querySelector('#register-confirm-password')?.value || '';
        
        console.log('Register attempt:', email);
        
        // Show processing notification
        this.showNotificationInElement('register-notification', 'Đang xử lý...', 'info');
        
        // Validate password match
        if (password !== confirmPassword) {
            this.showNotificationInElement('register-notification', 'Mật khẩu xác nhận không khớp!', 'error');
            return;
        }
        
        try {
            if (!this.userModel) {
                console.error('UserModel không có sẵn');
                this.showNotificationInElement('register-notification', 'Lỗi hệ thống. Vui lòng thử lại sau.', 'error');
                return;
            }
            
            const user = await this.userModel.register(email, password, username);
            if (user) {
                // Update navigation
                console.log('Registration successful for user:', user.email);
                
                if (this.authView) {
                    this.authView.updateNav(user);
                }
                
                form.reset();
                
                // Show success notification
                this.showNotificationInElement('register-notification', 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.', 'success');
                
                // Switch to login modal after a short delay
                setTimeout(() => {
                    if (this.authView) {
                        this.authView.closeModal('register-modal');
                        this.authView.showModal('login-modal');
                        // Show a welcome message in the login notification
                        this.showNotificationInElement('login-notification', 'Tài khoản đã được tạo thành công, vui lòng đăng nhập.', 'success');
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotificationInElement('register-notification', error.message || 'Đăng ký thất bại! Vui lòng thử lại sau.', 'error');
        }
    }

    async handleLogout() {
        try {
            await this.userModel.logout();
            
            // Update navigation
            this.authView.updateNav(null);
            
            // Show success notification
            this.showNotification('Đăng xuất thành công!', 'success');
            
            // Redirect to home page if on admin or protected page
            const currentPath = window.location.pathname;
            if (currentPath.includes('admin.html') || 
                currentPath.includes('dashboard.html')) {
                window.location.href = 'index.html';
            } else {
                // Reload current page to reset any user-specific content
                window.location.reload();
            }
        } catch (error) {
            this.showNotification(error.message || 'Đăng xuất thất bại!', 'error');
        }
    }
    
    async handleUserUpdate(event) {
        const userData = event.detail;
        
        try {
            const updatedUser = await this.userModel.updateUser(userData);
            if (updatedUser) {
                // Update navigation with updated user
                this.authView.updateNav(updatedUser);
                
                // Show success notification
                this.showNotification('Cập nhật tài khoản thành công!', 'success');
            }
        } catch (error) {
            this.showNotification(error.message || 'Cập nhật tài khoản thất bại!', 'error');
        }
    }

    async checkAuth() {
        try {
            const user = await this.userModel.getCurrentUser();
            
            // Update navigation based on authentication status
            this.authView.updateNav(user);
            
            // Check if user should access this page
            const currentPath = window.location.pathname;
            
            if (currentPath.includes('admin.html')) {
                // Chỉ cho phép người dùng có role là 'admin' truy cập trang admin
                if (!user || (user.role !== 'admin' && !user.isAdmin)) {
                    console.log('Access denied: Non-admin user attempted to access admin page');
                    // Chuyển hướng về trang chủ
                    window.location.href = 'index.html';
                    return;
                }
            }
            
            if (!user && (
                currentPath.includes('dashboard.html') ||
                currentPath.includes('profile.html')
            )) {
                // Redirect to login for protected pages
                sessionStorage.setItem('redirectAfterLogin', window.location.href);
                window.location.href = 'index.html';
                return;
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }
    
    showNotification(message, type = 'info') {
        // Check if mainView has a notification method
        if (window.mainView && typeof window.mainView.showNotification === 'function') {
            window.mainView.showNotification(message, type);
        } else {
            // Fallback simple notification
            alert(message);
        }
    }

    /**
     * Xử lý quên mật khẩu và gửi OTP qua email
     */
    async handleForgotPassword(event) {
        event.preventDefault();
        
        const form = event.target;
        const email = form.querySelector('#forgot-email').value;
        
        if (!email) {
            this.showNotificationInElement('forgot-notification', 'Vui lòng nhập địa chỉ email', 'error');
            return;
        }
        
        // Lưu email để sử dụng cho xác thực OTP sau này
        localStorage.setItem('reset_password_email', email);
        
        this.showNotificationInElement('forgot-notification', 'Đang xử lý yêu cầu...', 'info');
        
        try {
            // Gọi phương thức resetPassword để lấy mã OTP
            const result = await this.userModel.resetPassword(email);
            
            if (result.success) {
                // Hiển thị form nhập mã OTP
                this.showOTPVerificationForm(result);
            } else {
                this.showNotificationInElement('forgot-notification', result.message, 'error');
            }
        } catch (error) {
            console.error('Error requesting password reset:', error);
            this.showNotificationInElement('forgot-notification', 'Có lỗi xảy ra khi xử lý yêu cầu', 'error');
        }
    }
    
    /**
     * Hiển thị form xác thực OTP và đặt lại mật khẩu
     */
    showOTPVerificationForm(otpResult) {
        // Ẩn form quên mật khẩu
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) {
            forgotForm.style.display = 'none';
        }
        
        // Hiển thị thông báo
        this.showNotificationInElement('forgot-notification', otpResult.message, 'success');
        
        // Kiểm tra xem form OTP đã tồn tại chưa
        let otpForm = document.getElementById('otp-verification-form');
        
        // Nếu chưa tồn tại, tạo mới form
        if (!otpForm) {
            const modalContent = document.querySelector('#forgot-password-modal .modal-content');
            
            // Tạo form xác thực OTP
            otpForm = document.createElement('form');
            otpForm.id = 'otp-verification-form';
            otpForm.innerHTML = `
                <div class="form-group">
                    <label for="otp-code">Mã xác thực OTP</label>
                    <input type="text" id="otp-code" placeholder="Nhập mã OTP đã nhận được qua email" required>
                </div>
                <div class="form-group">
                    <label for="new-password">Mật khẩu mới</label>
                    <input type="password" id="new-password" placeholder="Nhập mật khẩu mới" required>
                </div>
                <div class="form-group">
                    <label for="confirm-new-password">Xác nhận mật khẩu mới</label>
                    <input type="password" id="confirm-new-password" placeholder="Nhập lại mật khẩu mới" required>
                </div>
                <button type="submit" class="btn btn-primary">Xác nhận đặt lại mật khẩu</button>
                <p style="text-align: center; margin-top: 1rem;">
                    <a href="#" id="request-new-otp">Gửi lại mã OTP</a> | 
                    <a href="#" id="back-to-forgot">Quay lại</a>
                </p>
            `;
            
            // Thêm form vào modal
            modalContent.appendChild(otpForm);
            
            // Xử lý sự kiện submit form OTP
            otpForm.addEventListener('submit', this.handleOTPVerification.bind(this));
            
            // Xử lý sự kiện gửi lại mã OTP
            document.getElementById('request-new-otp').addEventListener('click', (e) => {
                e.preventDefault();
                // Hiển thị lại form quên mật khẩu
                this.resetForgotPasswordForm();
                // Tự động kích hoạt lại quá trình gửi mã OTP
                const email = localStorage.getItem('reset_password_email');
                if (email) {
                    document.getElementById('forgot-email').value = email;
                    this.handleForgotPassword(new Event('submit'));
                }
            });
            
            // Xử lý sự kiện quay lại form quên mật khẩu
            document.getElementById('back-to-forgot').addEventListener('click', (e) => {
                e.preventDefault();
                this.resetForgotPasswordForm();
            });
        } else {
            // Nếu đã tồn tại, hiển thị lại
            otpForm.style.display = 'block';
        }
        
        // Nếu đang trong môi trường debug, hiển thị mã OTP
        if (otpResult.otp) {
            const otpNotification = document.createElement('div');
            otpNotification.className = 'debug-notification';
            otpNotification.innerHTML = `<strong>Debug Mode:</strong> OTP Code: ${otpResult.otp}`;
            otpNotification.style.backgroundColor = '#f8f9fa';
            otpNotification.style.padding = '10px';
            otpNotification.style.marginBottom = '15px';
            otpNotification.style.border = '1px dashed #ccc';
            otpNotification.style.borderRadius = '4px';
            otpNotification.style.fontSize = '14px';
            
            // Thêm thông báo OTP vào đầu form
            otpForm.prepend(otpNotification);
        }
    }

    /**
     * Xử lý xác thực OTP và đặt lại mật khẩu
     */
    async handleOTPVerification(event) {
        event.preventDefault();
        
        const form = event.target;
        const otp = form.querySelector('#otp-code').value;
        const newPassword = form.querySelector('#new-password').value;
        const confirmPassword = form.querySelector('#confirm-new-password').value;
        const email = localStorage.getItem('reset_password_email');
        
        if (!email) {
            this.showNotificationInElement('forgot-notification', 'Phiên làm việc đã hết hạn. Vui lòng thử lại.', 'error');
            this.resetForgotPasswordForm();
            return;
        }
        
        if (!otp) {
            this.showNotificationInElement('forgot-notification', 'Vui lòng nhập mã OTP', 'error');
            return;
        }
        
        if (!newPassword || !confirmPassword) {
            this.showNotificationInElement('forgot-notification', 'Vui lòng nhập mật khẩu mới', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.showNotificationInElement('forgot-notification', 'Mật khẩu không khớp. Vui lòng thử lại.', 'error');
            return;
        }
        
        this.showNotificationInElement('forgot-notification', 'Đang xử lý...', 'info');
        
        try {
            // Xác thực OTP và đặt lại mật khẩu
            const result = await this.userModel.verifyOTP(email, otp, newPassword);
            
            if (result.success) {
                this.showNotificationInElement('forgot-notification', result.message, 'success');
                
                // Xóa dữ liệu tạm thời
                localStorage.removeItem('reset_password_email');
                
                // Chuyển về form đăng nhập sau 3 giây
                setTimeout(() => {
                    this.authView.closeModal('forgot-password-modal');
                    this.authView.showModal('login-modal');
                    this.showNotificationInElement('login-notification', 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập với mật khẩu mới.', 'success');
                }, 3000);
            } else {
                this.showNotificationInElement('forgot-notification', result.message, 'error');
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            this.showNotificationInElement('forgot-notification', 'Có lỗi xảy ra khi xác thực mã OTP', 'error');
        }
    }

    /**
     * Đặt lại form quên mật khẩu về trạng thái ban đầu
     */
    resetForgotPasswordForm() {
        // Hiển thị lại form quên mật khẩu
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) {
            forgotForm.style.display = 'block';
        }
        
        // Ẩn form xác thực OTP
        const otpForm = document.getElementById('otp-verification-form');
        if (otpForm) {
            otpForm.style.display = 'none';
        }
        
        // Xóa thông báo
        this.hideNotificationInElement('forgot-notification');
    }

    /**
     * Hiển thị thông báo trong một phần tử cụ thể
     * @param {string|HTMLElement} elementId - ID của phần tử hiển thị thông báo hoặc phần tử DOM
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại thông báo (success, error, info)
     */
    showNotificationInElement(elementId, message, type = 'info') {
        try {
            // Đầu tiên thử dùng phương thức của authView
            if (this.authView && typeof this.authView.showNotification === 'function') {
                this.authView.showNotification(elementId, message, type);
                return;
            }
            
            // Nếu không có authView, xử lý thủ công
            let element = null;
            
            // Kiểm tra nếu elementId là một phần tử DOM
            if (typeof elementId === 'string') {
                element = document.getElementById(elementId);
            } else if (elementId instanceof HTMLElement) {
                element = elementId;
            }
            
            // Nếu tìm thấy phần tử, hiển thị thông báo
            if (element) {
                element.className = 'auth-notification ' + type;
                element.textContent = message;
                element.style.display = 'block';
                
                // Tự động ẩn nếu là thông báo thành công
                if (type === 'success') {
                    setTimeout(() => {
                        element.style.display = 'none';
                    }, 5000);
                }
                return;
            }
            
            // Nếu không tìm thấy phần tử, kiểm tra mainView
            if (window.mainView && typeof window.mainView.showNotification === 'function') {
                window.mainView.showNotification(message, type);
                return;
            }
            
            // Cuối cùng, sử dụng alert nếu không có cách nào khác
            console.log(`Notification (${type}): ${message}`);
            if (type === 'error') {
                alert('Lỗi: ' + message);
            } else if (type === 'success') {
                alert('Thành công: ' + message);
            } else {
                alert(message);
            }
        } catch (error) {
            console.error('Error showing notification:', error);
            alert(message);
        }
    }
    
    /**
     * Ẩn thông báo trong một phần tử
     * @param {string|HTMLElement} elementId - ID của phần tử hoặc phần tử DOM
     */
    hideNotificationInElement(elementId) {
        try {
            // Đầu tiên thử dùng phương thức của authView
            if (this.authView && typeof this.authView.hideNotification === 'function') {
                this.authView.hideNotification(elementId);
                return;
            }
            
            // Nếu không có authView, xử lý thủ công
            let element = null;
            
            // Kiểm tra nếu elementId là một phần tử DOM
            if (typeof elementId === 'string') {
                element = document.getElementById(elementId);
            } else if (elementId instanceof HTMLElement) {
                element = elementId;
            }
            
            // Ẩn phần tử nếu tìm thấy
            if (element) {
                element.style.display = 'none';
            }
        } catch (error) {
            console.error('Error hiding notification:', error);
        }
    }
}

// Initialize the auth controller
if (typeof UserModel !== 'undefined' && typeof authView !== 'undefined') {
    const authController = new AuthController(new UserModel(), authView);
}
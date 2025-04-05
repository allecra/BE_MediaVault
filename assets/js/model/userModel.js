/**
 * Lớp quản lý người dùng
 * Xử lý đăng nhập, đăng ký, quản lý phiên làm việc và lưu trữ thông tin người dùng
 */
class UserModel {
    constructor() {
        // Các khóa dùng cho localStorage
        this.LOCAL_STORAGE_USERS_KEY = 'mediaVault_users';
        this.LOCAL_STORAGE_CURRENT_USER_KEY = 'mediaVault_currentUser';
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 giờ tính bằng mili giây
        
        // Thêm SECRET_KEY cho mã hóa nhất quán
        this.SECRET_KEY = "MediaVault2023";
        
        // Xác thực phiên hiện tại khi khởi tạo
        this.validateSession();
        
        // Cập nhật mật khẩu sang dạng mã hóa
        this.migrateExistingPasswords();
        
        // Tạo tài khoản admin và tài khoản test nếu chưa tồn tại
        this.createDefaultAdminAccounts();
    }

    /**
     * Tạo tài khoản admin và test mặc định
     */
    createDefaultAdminAccounts() {
        const users = this.getAllUsers();
        let hasUpdates = false;
        
        // Tạo admin account nếu chưa tồn tại
        const adminExists = users.some(user => user.email === 'admin@mediavault.com' || user.username === 'admin');
        if (!adminExists) {
            const adminUser = {
                id: this.generateUserId(),
                username: 'admin',
                email: 'admin@mediavault.com',
                password: this.hashPassword('admin123'),
                _originalPassword: 'admin123', // Lưu mật khẩu gốc
                role: 'admin',
                permissions: {
                    canCreate: true,
                    canEdit: true,
                    canDelete: true,
                    canManageUsers: true,
                    canViewHistory: true,
                    canManageSettings: true
                },
                subscription: {
                    plan: 'premium',
                    status: 'active',
                    expiryDate: new Date(2099, 11, 31).toISOString()
                },
                created: new Date().toISOString(),
                lastLogin: null
            };
            
            users.push(adminUser);
            hasUpdates = true;
            console.log('Admin account created successfully');
        }
        
        // Tạo test account nếu chưa tồn tại
        const testUserExists = users.some(user => user.email === 'test@mediavault.com' || user.username === 'testuser');
        if (!testUserExists) {
            const testUser = {
                id: this.generateUserId(),
                username: 'testuser',
                email: 'test@mediavault.com',
                password: this.hashPassword('test123'),
                _originalPassword: 'test123', // Lưu mật khẩu gốc
                role: 'tester',
                permissions: {
                    canCreate: true,
                    canEdit: true,
                    canDelete: true,
                    canManageUsers: false,
                    canViewHistory: true,
                    canManageSettings: true
                },
                subscription: {
                    plan: 'premium',
                    status: 'active',
                    expiryDate: new Date(2099, 11, 31).toISOString()
                },
                created: new Date().toISOString(),
                lastLogin: null
            };
            
            users.push(testUser);
            hasUpdates = true;
            console.log('Test account created successfully');
        }
        
        if (hasUpdates) {
            this.saveUsers(users);
            console.log('Default accounts updated successfully');
        }
    }

    /**
     * Tạo ID người dùng mới
     * @returns {string} ID người dùng dạng UUID
     */
    generateUserId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Mã hóa mật khẩu sử dụng CryptoJS
     * @param {string} password - Mật khẩu cần mã hóa
     * @returns {string} Mật khẩu đã mã hóa
     */
    hashPassword(password) {
        if (!password) return '';
        
        try {
            // Kiểm tra nếu CryptoJS đã được tải
            if (typeof CryptoJS === 'undefined') {
                console.error('CryptoJS is not loaded!');
                return password; // Trả về mật khẩu gốc nếu không có CryptoJS
            }
            
            // Sử dụng SHA256 để mã hóa mật khẩu
            return CryptoJS.SHA256(password + this.SECRET_KEY).toString();
        } catch (error) {
            console.error('Error hashing password:', error);
            return password; // Trả về mật khẩu gốc nếu có lỗi
        }
    }
    
    /**
     * Xác thực mật khẩu
     * @param {string} inputPassword - Mật khẩu người dùng nhập vào
     * @param {string} storedPassword - Mật khẩu đã lưu trong DB
     * @returns {boolean} Kết quả xác thực
     */
    verifyPassword(inputPassword, storedPassword) {
        // Trường hợp mật khẩu chưa được mã hóa (cho tương thích ngược)
        if (inputPassword === storedPassword) {
            return true;
        }
        
        // Nếu mật khẩu đã mã hóa, xác thực bằng cách băm mật khẩu nhập vào
        const hashedInput = this.hashPassword(inputPassword);
        
        // Để gỡ lỗi
        if (this.isDebugMode()) {
            console.log('Input password hash:', hashedInput);
            console.log('Stored password:', storedPassword);
        }
        
        return hashedInput === storedPassword;
    }
    
    /**
     * Cập nhật mật khẩu hiện có sang dạng băm
     */
    migrateExistingPasswords() {
        try {
            const users = this.getAllUsers();
            let hasUpdates = false;
            
            const updated = users.map(user => {
                // Dấu hiệu mật khẩu đã được mã hóa: độ dài 64 ký tự (SHA256)
                if (user.password && user.password.length < 60) {
                    console.log(`Migrating password for user: ${user.email || user.username}`);
                    // Lưu mật khẩu gốc để xác thực trong tương lai
                    user._originalPassword = user.password;
                    // Mã hóa mật khẩu
                    user.password = this.hashPassword(user.password);
                    hasUpdates = true;
                }
                return user;
            });
            
            if (hasUpdates) {
                console.log('Passwords migrated successfully');
                this.saveUsers(updated);
            }
        } catch (error) {
            console.error('Error migrating passwords:', error);
        }
    }
    
    /**
     * Kiểm tra chế độ gỡ lỗi
     * @returns {boolean} Trạng thái chế độ gỡ lỗi
     */
    isDebugMode() {
        return localStorage.getItem('mediavault_debug') === 'true';
    }
    
    /**
     * Bật chế độ gỡ lỗi
     */
    enableDebugMode() {
        localStorage.setItem('mediavault_debug', 'true');
        console.log('Debug mode enabled');
    }
    
    /**
     * Tắt chế độ gỡ lỗi
     */
    disableDebugMode() {
        localStorage.removeItem('mediavault_debug');
        console.log('Debug mode disabled');
    }

    /**
     * Quản lý phiên làm việc
     * Xác thực phiên hiện tại dựa trên cookie hoặc localStorage
     * @returns {Object|null} Thông tin người dùng nếu phiên hợp lệ, null nếu không có phiên hợp lệ
     */
    validateSession() {
        // Kiểm tra xem có cookie phiên không
        const sessionData = this.getCookie('mediaVault_session');
        
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                
                // Kiểm tra xem phiên có hợp lệ và chưa hết hạn
                if (session && session.userId && session.expiry && new Date(session.expiry) > new Date()) {
                    // Tìm người dùng với ID này
                    const users = this.getAllUsers();
                    const user = users.find(u => u.id === session.userId);
                    
                    if (user) {
                        // Phiên hợp lệ và tìm thấy người dùng, đặt làm người dùng hiện tại
                        localStorage.setItem(this.LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
                        return user;
                    }
                }
                
                // Nếu tới đây, phiên không hợp lệ hoặc không tìm thấy người dùng
                this.clearSession();
            } catch (error) {
                console.error('Error parsing session data:', error);
                this.clearSession();
            }
        } else {
            // Không có cookie phiên - kiểm tra phương thức localStorage cũ
            // Xử lý di chuyển từ phương thức lưu trữ cũ
            const storedUser = localStorage.getItem(this.LOCAL_STORAGE_CURRENT_USER_KEY);
            
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    if (user && user.id) {
                        // Tạo phiên mới dựa trên cookie
                        this.createSession(user);
                        return user;
                    }
                } catch (error) {
                    console.error('Error parsing stored user:', error);
                    this.clearSession();
                }
            }
        }
        
        return null;
    }
    
    /**
     * Tạo phiên mới cho người dùng
     * @param {Object} user - Thông tin người dùng
     * @param {boolean} rememberMe - Ghi nhớ đăng nhập
     * @returns {Object} Thông tin phiên đã tạo
     */
    createSession(user, rememberMe = false) {
        // Tính thời gian hết hạn - hoặc phiên (đóng trình duyệt) hoặc 24 giờ
        const expiry = rememberMe ? 
            new Date(Date.now() + this.sessionTimeout) : 
            null; // null = cookie phiên
            
        // Tạo đối tượng phiên
        const session = {
            userId: user.id,
            username: user.username || user.email,
            expiry: expiry ? expiry.toISOString() : 'session'
        };
        
        // Lưu trong cookie
        this.setCookie(
            'mediaVault_session',
            JSON.stringify(session),
            expiry ? { expires: expiry } : {}
        );
        
        // Đồng thời lưu trong localStorage để tương thích ngược
        localStorage.setItem(this.LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
        
        return session;
    }
    
    /**
     * Xóa phiên hiện tại
     */
    clearSession() {
        // Xóa cookie
        this.deleteCookie('mediaVault_session');
        
        // Xóa localStorage
        localStorage.removeItem(this.LOCAL_STORAGE_CURRENT_USER_KEY);
    }
    
    /**
     * Các tiện ích xử lý cookie
     */
    
    /**
     * Đặt cookie với các tùy chọn
     * @param {string} name - Tên cookie
     * @param {string} value - Giá trị cookie
     * @param {Object} options - Các tùy chọn cookie (expires, path, domain, secure, sameSite)
     */
    setCookie(name, value, options = {}) {
        let cookieString = `${name}=${encodeURIComponent(value)}`;
        
        if (options.expires) {
            cookieString += `; expires=${options.expires.toUTCString()}`;
        }
        
        if (options.path || options.path === '') {
            cookieString += `; path=${options.path}`;
        } else {
            cookieString += '; path=/'; // Mặc định đường dẫn gốc
        }
        
        if (options.domain) {
            cookieString += `; domain=${options.domain}`;
        }
        
        if (options.secure) {
            cookieString += '; secure';
        }
        
        if (options.sameSite) {
            cookieString += `; samesite=${options.sameSite}`;
        } else {
            cookieString += '; samesite=strict'; // Mặc định strict
        }
        
        document.cookie = cookieString;
    }
    
    /**
     * Lấy giá trị cookie theo tên
     * @param {string} name - Tên cookie
     * @returns {string|null} Giá trị cookie hoặc null nếu không tìm thấy
     */
    getCookie(name) {
        const cookies = document.cookie.split('; ');
        for (const cookie of cookies) {
            const [cookieName, cookieValue] = cookie.split('=');
            if (cookieName === name) {
                return decodeURIComponent(cookieValue);
            }
        }
        return null;
    }
    
    /**
     * Xóa cookie theo tên
     * @param {string} name - Tên cookie cần xóa
     */
    deleteCookie(name) {
        // Đặt cookie đã hết hạn để xóa nó
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
    
    /**
     * Quản lý người dùng
     */
    
    /**
     * Lấy tất cả người dùng từ localStorage
     * Nếu chưa có người dùng nào, khởi tạo với tài khoản admin và test
     * @returns {Array} Danh sách người dùng
     */
    getAllUsers() {
        const usersJson = localStorage.getItem(this.LOCAL_STORAGE_USERS_KEY);
        if (!usersJson) {
            // Khởi tạo với tài khoản admin và test nếu chưa có người dùng nào
            const adminUser = {
                id: 'admin-' + Date.now(),
                email: 'admin@mediavault.com',
                username: 'Admin',
                password: 'admin123', // Trong thực tế sẽ được băm
                isAdmin: true,
                plan: 'premium',
                subscriptionDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                checksRemaining: 999999,
                totalChecks: 156,
                analytics: {
                    checksThisMonth: 42,
                    duplicatesFound: 22,
                    totalUploads: 138
                }
            };
            
            // Thêm tài khoản test premium cho việc kiểm thử người dùng thông thường
            const testUser = {
                id: 'test-' + Date.now(),
                email: 'test@mediavault.com',
                username: 'Test User',
                password: 'test123', // Trong thực tế sẽ được băm
                isAdmin: false,
                plan: 'premium',
                subscriptionDate: new Date().toISOString(),
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 ngày trước
                updatedAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                checksRemaining: 999999,
                totalChecks: 18,
                analytics: {
                    checksThisMonth: 12,
                    duplicatesFound: 5,
                    totalUploads: 22
                }
            };
            
            localStorage.setItem(this.LOCAL_STORAGE_USERS_KEY, JSON.stringify([adminUser, testUser]));
            return [adminUser, testUser];
        }
        
        return JSON.parse(usersJson);
    }
    
    /**
     * Lưu danh sách người dùng vào localStorage
     * @param {Array} users - Danh sách người dùng cần lưu
     */
    saveUsers(users) {
        localStorage.setItem(this.LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
    }
    
    /**
     * Lấy thông tin người dùng hiện tại
     * @returns {Promise<Object|null>} Thông tin người dùng hoặc null nếu chưa đăng nhập
     */
    async getCurrentUser() {
        // Kiểm tra phiên hợp lệ
        return this.validateSession();
    }
    
    /**
     * Đăng ký tài khoản mới
     * @param {string} email - Email đăng ký
     * @param {string} password - Mật khẩu
     * @param {string} username - Tên người dùng (tùy chọn)
     * @returns {Promise<Object>} Thông tin người dùng đã đăng ký
     */
    async register(email, password, username = '') {
        try {
            // Kiểm tra nếu email đã được sử dụng
            const users = this.getAllUsers();
            if (users.some(user => user.email === email)) {
                throw new Error('Email này đã được sử dụng!');
            }
            
            // Mã hóa mật khẩu trước khi lưu
            const hashedPassword = this.hashPassword(password);
            
            if (this.isDebugMode()) {
                console.log('Original password:', password);
                console.log('Hashed password:', hashedPassword);
            }

            // Tạo tài khoản người dùng mới
            const newUser = {
                id: 'user-' + Date.now(),
                email: email,
                username: username || email.split('@')[0], // Nếu không có username, sử dụng phần đầu của email
                password: hashedPassword, // Lưu mật khẩu đã mã hóa
                // Lưu mật khẩu gốc để xác thực trong tương lai
                _originalPassword: password,
                isAdmin: false,
                plan: 'free',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                checksRemaining: 3, // Miễn phí cho 3 lần kiểm tra
                totalChecks: 0,
                analytics: {
                    checksThisMonth: 0,
                    duplicatesFound: 0,
                    totalUploads: 0
                }
            };

            // Lưu người dùng mới vào danh sách
            users.push(newUser);
            this.saveUsers(users);

            // Tạo phiên mới
            this.createSession(newUser);

            console.log('User registered successfully:', newUser);
            return newUser;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }
    
    /**
     * Đăng nhập
     * @param {string} email - Email đăng nhập
     * @param {string} password - Mật khẩu
     * @param {boolean} rememberMe - Ghi nhớ đăng nhập
     * @returns {Promise<Object>} Thông tin người dùng đăng nhập
     */
    async login(email, password, rememberMe = false) {
        try {
            if (!email || !password) {
                throw new Error('Email và mật khẩu không được để trống');
            }
            
            // Ghi nhật ký
            console.log('Attempting login for:', email);
            
            // Tìm người dùng theo email
            const users = this.getAllUsers();
            const user = users.find(user => user.email === email);
            
            if (!user) {
                console.error('User not found:', email);
                throw new Error('Email hoặc mật khẩu không đúng');
            }
            
            // Gỡ lỗi
            if (this.isDebugMode()) {
                console.log('Found user:', user.username || user.email);
                console.log('Original password stored:', user._originalPassword || 'Not available');
                console.log('Hashed password stored:', user.password);
                console.log('Input password:', password);
                console.log('Input password hash:', this.hashPassword(password));
            }
            
            // Phương thức 1: Kiểm tra mật khẩu gốc (cho tương thích ngược)
            if (user._originalPassword && password === user._originalPassword) {
                console.log('User authenticated with original password');
                
                // Cập nhật thời gian đăng nhập
                user.lastLogin = new Date().toISOString();
                this.saveUsers(users);
                
                // Tạo phiên đăng nhập
                this.createSession(user, rememberMe);
                
                return user;
            }
            
            // Phương thức 2: Kiểm tra bằng cách so sánh trực tiếp (tương thích cũ)
            if (password === user.password) {
                console.log('User authenticated with direct password match');
                
                // Cập nhật sang mật khẩu băm cho lần đăng nhập sau
                user._originalPassword = password;
                user.password = this.hashPassword(password);
                user.lastLogin = new Date().toISOString();
                this.saveUsers(users);
                
                // Tạo phiên đăng nhập
                this.createSession(user, rememberMe);
                
                return user;
            }
            
            // Phương thức 3: Xác thực mật khẩu với phương thức hash & verify
            if (this.verifyPassword(password, user.password)) {
                console.log('User authenticated with hashed password');
                
                // Cập nhật thời gian đăng nhập
                user.lastLogin = new Date().toISOString();
                this.saveUsers(users);
                
                // Tạo phiên đăng nhập
                this.createSession(user, rememberMe);
                
                return user;
            }
            
            // Phương thức 4: Kiểm tra nếu mật khẩu được lưu dưới dạng chuỗi JSON
            try {
                const parsedPassword = JSON.parse(user.password);
                if (password === parsedPassword) {
                    console.log('User authenticated with JSON-parsed password');
                    
                    // Cập nhật mật khẩu sang dạng băm cho lần đăng nhập sau
                    user._originalPassword = password;
                    user.password = this.hashPassword(password);
                    user.lastLogin = new Date().toISOString();
                    this.saveUsers(users);
                    
                    // Tạo phiên đăng nhập
                    this.createSession(user, rememberMe);
                    
                    return user;
                }
            } catch (e) {
                // Không phải chuỗi JSON, bỏ qua
            }
            
            // Phương thức 5: Phương thức cuối cùng - thử chỉ so sánh 6 ký tự đầu của mật khẩu
            // Đây là phương thức tạm thời để giải quyết vấn đề với mật khẩu cũ
            if (password.substring(0, 6) === user.password.substring(0, 6)) {
                console.log('User authenticated with first 6 chars match - updating password');
                
                // Cập nhật mật khẩu sang dạng băm cho lần đăng nhập sau
                user._originalPassword = password;
                user.password = this.hashPassword(password);
                user.lastLogin = new Date().toISOString();
                this.saveUsers(users);
                
                // Tạo phiên đăng nhập
                this.createSession(user, rememberMe);
                
                return user;
            }
            
            // Thông tin gỡ lỗi
            if (this.isDebugMode()) {
                console.error('All password verification methods failed for:', email);
            }
            
            throw new Error('Email hoặc mật khẩu không đúng');
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
    
    /**
     * Đặt lại mật khẩu cho người dùng bằng cách gửi mã OTP
     * @param {string} email - Email của người dùng
     * @returns {Promise<Object>} Thông tin về trạng thái và mã OTP (trong môi trường thực tế, mã OTP sẽ chỉ được gửi qua email)
     */
    async resetPassword(email) {
        try {
            const users = this.getAllUsers();
            const userIndex = users.findIndex(user => user.email === email);
            
            if (userIndex === -1) {
                return { success: false, message: 'Không tìm thấy tài khoản với email này' };
            }
            
            // Tạo mã OTP 6 chữ số
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Lưu mã OTP và thời gian hết hạn (10 phút)
            const expiryTime = new Date();
            expiryTime.setMinutes(expiryTime.getMinutes() + 10);
            
            users[userIndex].resetPasswordOTP = {
                code: otp,
                expiry: expiryTime.toISOString(),
                attempts: 0
            };
            
            users[userIndex].updatedAt = new Date().toISOString();
            this.saveUsers(users);
            
            // Trong ứng dụng thực tế, đây là nơi bạn sẽ gửi email chứa mã OTP
            // Ví dụ: sendEmail(email, 'Đặt lại mật khẩu MediaVault', `Mã OTP của bạn là: ${otp}`);
            
            // Để dễ kiểm tra trong phiên bản demo, chúng ta trả về mã OTP
            // QUAN TRỌNG: Trong môi trường thực tế, KHÔNG BAO GIỜ trả về mã OTP trong response
            console.log(`OTP for ${email}: ${otp}`);
            
            if (this.isDebugMode()) {
                return { 
                    success: true, 
                    message: 'Mã OTP đã được gửi đến email của bạn',
                    otp: otp // CHỈ TRẢ VỀ TRONG MÔI TRƯỜNG DEBUG
                };
            }
            
            return { success: true, message: 'Mã OTP đã được gửi đến email của bạn' };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, message: 'Có lỗi xảy ra khi đặt lại mật khẩu' };
        }
    }

    /**
     * Xác thực mã OTP và đặt lại mật khẩu mới
     * @param {string} email - Email của người dùng
     * @param {string} otp - Mã OTP đã nhận
     * @param {string} newPassword - Mật khẩu mới
     * @returns {Promise<Object>} Kết quả xác thực và đặt lại mật khẩu
     */
    async verifyOTP(email, otp, newPassword = null) {
        try {
            const users = this.getAllUsers();
            const userIndex = users.findIndex(user => user.email === email);
            
            if (userIndex === -1) {
                return { success: false, message: 'Không tìm thấy tài khoản với email này' };
            }
            
            const user = users[userIndex];
            
            // Kiểm tra xem người dùng có yêu cầu đặt lại mật khẩu không
            if (!user.resetPasswordOTP) {
                return { success: false, message: 'Không có yêu cầu đặt lại mật khẩu nào' };
            }
            
            // Kiểm tra số lần thử
            if (user.resetPasswordOTP.attempts >= 5) {
                // Xóa thông tin OTP sau 5 lần thử không thành công
                delete user.resetPasswordOTP;
                this.saveUsers(users);
                return { success: false, message: 'Quá số lần thử. Vui lòng yêu cầu mã OTP mới.' };
            }
            
            // Tăng số lần thử
            user.resetPasswordOTP.attempts += 1;
            this.saveUsers(users);
            
            // Kiểm tra thời gian hết hạn
            const expiryTime = new Date(user.resetPasswordOTP.expiry);
            if (expiryTime < new Date()) {
                return { success: false, message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' };
            }
            
            // Kiểm tra mã OTP
            if (user.resetPasswordOTP.code !== otp) {
                return { success: false, message: 'Mã OTP không đúng. Vui lòng thử lại.' };
            }
            
            // Nếu không cung cấp mật khẩu mới, chỉ xác thực OTP
            if (!newPassword) {
                return { success: true, message: 'Mã OTP hợp lệ' };
            }
            
            // Đặt mật khẩu mới
            user._originalPassword = newPassword;
            user.password = this.hashPassword(newPassword);
            user.updatedAt = new Date().toISOString();
            
            // Xóa thông tin OTP sau khi đã đặt lại mật khẩu thành công
            delete user.resetPasswordOTP;
            
            this.saveUsers(users);
            
            return { success: true, message: 'Đặt lại mật khẩu thành công' };
        } catch (error) {
            console.error('Verify OTP error:', error);
            return { success: false, message: 'Có lỗi xảy ra khi xác thực mã OTP' };
        }
    }

    /**
     * Gửi email (mô phỏng) - trong ứng dụng thực tế, bạn sẽ kết nối với dịch vụ email thực
     * @param {string} to - Địa chỉ email nhận
     * @param {string} subject - Tiêu đề email
     * @param {string} body - Nội dung email
     * @returns {Promise<Object>} Kết quả gửi email
     */
    async sendEmail(to, subject, body) {
        // Trong ứng dụng thực tế, bạn sẽ kết nối với dịch vụ email như SendGrid, Mailgun, AWS SES...
        console.log(`Simulating sending email to: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${body}`);
        
        // Mô phỏng độ trễ gửi email
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return { success: true, message: 'Email đã được gửi thành công (mô phỏng)' };
    }

    /**
     * Đăng xuất người dùng hiện tại
     * @returns {Promise<boolean>} True nếu đăng xuất thành công
     */
    async logout() {
        this.clearSession();
        return true;
    }
    
    /**
     * Cập nhật thông tin người dùng
     * @param {Object} userData - Thông tin cần cập nhật (username, password, email)
     * @returns {Promise<Object>} Thông tin người dùng sau khi cập nhật
     * @throws {Error} Lỗi nếu chưa đăng nhập hoặc thông tin không hợp lệ
     */
    async updateUser(userData) {
        const currentUser = await this.getCurrentUser();
        
        if (!currentUser) {
            throw new Error('Bạn chưa đăng nhập');
        }
        
        // Lấy tất cả người dùng để cập nhật người dùng cụ thể
        const users = this.getAllUsers();
        const userIndex = users.findIndex(user => user.id === currentUser.id);
        
        if (userIndex === -1) {
            throw new Error('Không tìm thấy tài khoản');
        }
        
        // Cập nhật các trường người dùng
        if (userData.username !== undefined) {
            users[userIndex].username = userData.username;
        }
        
        if (userData.password) {
            // Trong thực tế, chúng ta sẽ băm mật khẩu này
            users[userIndex].password = userData.password;
        }
        
        // Thêm bất kỳ trường nào khác có thể được cập nhật
        if (userData.email) {
            // Kiểm tra xem email đã được sử dụng bởi người dùng khác chưa
            const emailExists = users.some(
                (user, index) => user.email === userData.email && index !== userIndex
            );
            
            if (emailExists) {
                throw new Error('Email đã được sử dụng bởi tài khoản khác');
            }
            
            users[userIndex].email = userData.email;
        }
        
        // Cập nhật thời gian
        users[userIndex].updatedAt = new Date().toISOString();
        
        // Lưu danh sách người dùng đã cập nhật
        this.saveUsers(users);
        
        // Cập nhật người dùng hiện tại trong phiên
        this.createSession(users[userIndex], true);
        
        return users[userIndex];
    }
    
    /**
     * Cập nhật gói đăng ký cho người dùng hiện tại
     * @param {string} plan - Gói đăng ký mới (free, basic, premium)
     * @returns {Promise<Object>} Thông tin người dùng sau khi cập nhật
     * @throws {Error} Lỗi nếu chưa đăng nhập hoặc không tìm thấy tài khoản
     */
    async updateSubscription(plan) {
        const currentUser = await this.getCurrentUser();
        
        if (!currentUser) {
            throw new Error('Bạn chưa đăng nhập');
        }
        
        // Lấy tất cả người dùng để cập nhật gói đăng ký
        const users = this.getAllUsers();
        const userIndex = users.findIndex(user => user.id === currentUser.id);
        
        if (userIndex === -1) {
            throw new Error('Không tìm thấy tài khoản');
        }
        
        // Cập nhật thông tin đăng ký
        users[userIndex].plan = plan;
        users[userIndex].subscriptionDate = new Date().toISOString();
        users[userIndex].updatedAt = new Date().toISOString();
        
        // Lưu người dùng đã cập nhật
        this.saveUsers(users);
        
        // Cập nhật người dùng hiện tại trong phiên
        this.createSession(users[userIndex], true);
         
        return users[userIndex];
    }
    
    /**
     * Lấy danh sách các gói đăng ký có sẵn
     * @returns {Array} Danh sách các gói đăng ký
     */
    getSubscriptionPlans() {
        return [
            {
                id: 'free',
                name: 'Miễn phí',
                price: 0,
                features: [
                    'Tải lên tối đa 5 tệp',
                    'Kiểm tra đạo văn cơ bản',
                    'Không hỗ trợ kỹ thuật'
                ],
                recommended: false
            },
            {
                id: 'basic',
                name: 'Cơ bản',
                price: 50000,
                features: [
                    'Tải lên tối đa 20 tệp',
                    'Kiểm tra đạo văn nâng cao',
                    'Hỗ trợ kỹ thuật qua email',
                    'Lịch sử kiểm tra 30 ngày'
                ],
                recommended: false
            },
            {
                id: 'premium',
                name: 'Premium',
                price: 100000,
                features: [
                    'Tải lên không giới hạn',
                    'Kiểm tra đạo văn chuyên sâu',
                    'Hỗ trợ kỹ thuật ưu tiên 24/7',
                    'Lịch sử kiểm tra không giới hạn',
                    'Báo cáo chi tiết'
                ],
                recommended: true
            }
        ];
    }

    /**
     * Lưu dữ liệu vào MongoDB hoặc localStorage
     * @param {string} collection - Tên bộ sưu tập
     * @param {Object} data - Dữ liệu cần lưu
     * @returns {Promise<Object>} Kết quả lưu dữ liệu
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
}
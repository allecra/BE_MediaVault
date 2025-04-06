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
            
            // Lưu admin vào MongoDB trong collection Admin
            this.saveUserToMongoDB(adminUser);
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
            
            // Lưu test user vào MongoDB
            this.saveUserToMongoDB(testUser);
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
        return localStorage.getItem('mediaVault_debug') === 'true';
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
     * Lấy giá trị cookie theo tên
     * @param {string} name - Tên cookie
     * @returns {string|null} Giá trị cookie hoặc null nếu không tìm thấy
     */
    getCookie(name) {
        try {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
                const [cookieName, ...rest] = cookie.trim().split('=');
                // Phải nối lại phần giá trị vì giá trị cookie có thể chứa dấu "="
                const cookieValue = rest.join('=');
                if (cookieName === name) {
                    return decodeURIComponent(cookieValue);
                }
            }
            
            // Logging nếu không tìm thấy
            if (name === 'mediaVault_session') {
                console.log('Session cookie not found. All cookies:', document.cookie);
            }
            
            return null;
        } catch (error) {
            console.error('Error getting cookie:', error);
            return null;
        }
    }
    
    /**
     * Quản lý phiên làm việc
     * Xác thực phiên hiện tại dựa trên cookie hoặc localStorage
     * @returns {Object|null} Thông tin người dùng nếu phiên hợp lệ, null nếu không có phiên hợp lệ
     */
    validateSession() {
        try {
            console.log('Validating current session');
            
            // Kiểm tra xem có cookie phiên không
            const sessionData = this.getCookie('mediaVault_session');
            console.log('Session cookie exists:', sessionData ? 'Yes' : 'No');
            
            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    console.log('Found session data:', session);
                    
                    // Kiểm tra xem phiên có hợp lệ và chưa hết hạn
                    if (session && session.userId && session.expiry && (session.expiry === 'session' || new Date(session.expiry) > new Date())) {
                        // Tìm người dùng với ID này
                        const users = this.getAllUsers();
                        const user = users.find(u => u.id === session.userId);
                        
                        if (user) {
                            console.log('Valid session found for:', user.email);
                            
                            // Phiên hợp lệ và tìm thấy người dùng, đặt làm người dùng hiện tại
                            localStorage.setItem(this.LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
                            return user;
                        } else {
                            console.warn('User not found for session ID:', session.userId);
                        }
                    } else {
                        console.warn('Session invalid or expired');
                    }
                    
                    // Nếu tới đây, phiên không hợp lệ hoặc không tìm thấy người dùng
                    this.clearSession();
                } catch (error) {
                    console.error('Error parsing session data:', error);
                    this.clearSession();
                }
            } else {
                console.log('No session cookie found, checking localStorage');
                
                // Không có cookie phiên - kiểm tra phương thức localStorage cũ
                // Xử lý di chuyển từ phương thức lưu trữ cũ
                const storedUser = localStorage.getItem(this.LOCAL_STORAGE_CURRENT_USER_KEY);
                
                if (storedUser) {
                    try {
                        const user = JSON.parse(storedUser);
                        if (user && user.id) {
                            console.log('Found user in localStorage, creating new session');
                            
                            // Tạo phiên mới dựa trên cookie
                            this.createSession(user, true);
                            return user;
                        }
                    } catch (error) {
                        console.error('Error parsing stored user:', error);
                        this.clearSession();
                    }
                } else {
                    console.log('No user found in localStorage');
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error in validateSession:', error);
            return null;
        }
    }
    
    /**
     * Tạo phiên mới cho người dùng
     * @param {Object} user - Thông tin người dùng
     * @param {boolean} rememberMe - Ghi nhớ đăng nhập
     * @returns {Object} Thông tin phiên đã tạo
     */
    createSession(user, rememberMe = false) {
        try {
            console.log(`Creating new session for user: ${user.email}, rememberMe: ${rememberMe}`);
            
            // Đảm bảo rằng người dùng có ID
            if (!user.id && user._id) {
                user.id = user._id;
                console.log('Using _id as id for session creation');
            }
            
            if (!user.id) {
                console.error('User has no ID, cannot create session');
                return null;
            }
            
            // Tính thời gian hết hạn - hoặc phiên (đóng trình duyệt) hoặc 24 giờ
            const expiry = rememberMe ? 
                new Date(Date.now() + this.sessionTimeout) : 
                null; // null = cookie phiên
                
            // Tạo đối tượng phiên
            const session = {
                userId: user.id,
                username: user.username || user.email,
                email: user.email,
                expiry: expiry ? expiry.toISOString() : 'session',
                created: new Date().toISOString()
            };
            
            // Lưu trong cookie với các tùy chọn phù hợp
            const cookieOptions = {
                path: '/',           // Đảm bảo cookie có sẵn cho toàn bộ trang web
                sameSite: 'lax',     // Cho phép gửi cookie khi điều hướng từ các trang khác
                secure: window.location.protocol === 'https:' // Chỉ dùng Secure khi là HTTPS
            };
            
            // Thêm thời gian hết hạn nếu cần
            if (expiry) {
                cookieOptions.expires = expiry;
            }
            
            // Đặt cookie phiên
            console.log('Setting session cookie with options:', cookieOptions);
            this.setCookie(
                'mediaVault_session',
                JSON.stringify(session),
                cookieOptions
            );
            
            // Lưu trong localStorage để tương thích ngược
            localStorage.setItem(this.LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
            
            // Kiểm tra xem cookie đã được đặt thành công chưa
            const verifySession = this.getCookie('mediaVault_session');
            if (verifySession) {
                console.log('Session cookie set successfully:', verifySession.substring(0, 50) + '...');
                
                // Phát sự kiện đăng nhập nếu cookie được thiết lập thành công
                this.dispatchLoginEvent(user);
            } else {
                console.error('Failed to set session cookie');
            }
            
            return session;
        } catch (error) {
            console.error('Error creating session:', error);
            return null;
        }
    }
    
    /**
     * Phát sự kiện đăng nhập
     * @param {Object} user - Thông tin người dùng đăng nhập
     */
    dispatchLoginEvent(user) {
        try {
            console.log('Dispatching login event for:', user.email);
            window.dispatchEvent(new CustomEvent('user-login', {
                detail: { user }
            }));
        } catch (error) {
            console.error('Error dispatching login event:', error);
        }
    }
    
    /**
     * Xóa phiên hiện tại
     */
    clearSession() {
        console.log('Clearing user session');
        
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
        try {
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
            
            // Sử dụng Lax thay vì strict để cho phép tương tác giữa các trang
            if (options.sameSite) {
                cookieString += `; samesite=${options.sameSite}`;
            } else {
                cookieString += '; samesite=lax'; // Thay đổi từ strict sang lax
            }
            
            console.log('Setting cookie:', cookieString);
            document.cookie = cookieString;
            
            // Kiểm tra xem cookie đã được đặt thành công chưa
            const verifyValue = this.getCookie(name);
            if (!verifyValue) {
                console.warn(`Cookie ${name} không được đặt thành công`);
            } else {
                console.log(`Cookie ${name} đặt thành công:`, verifyValue.length, 'bytes');
            }
        } catch (error) {
            console.error('Lỗi khi đặt cookie:', error);
        }
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
     * @returns {Promise<Object|null>} Thông tin người dùng hiện tại, null nếu chưa đăng nhập
     */
    async getCurrentUser() {
        try {
            console.log('Getting current user information');
            
            // Kiểm tra xem có phiên hợp lệ không
            const sessionUser = await this.validateSession();
            if (sessionUser) {
                console.log('Found valid session for user:', sessionUser.email);
                return sessionUser;
            }
            
            // Thử đọc dữ liệu từ localStorage
            const storedUser = localStorage.getItem(this.LOCAL_STORAGE_CURRENT_USER_KEY);
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    if (user && (user.id || user._id)) {
                        console.log('Found user data in localStorage:', user.email);
                        
                        // Kiểm tra dữ liệu nâng cao
                        if (!this.isUserValid(user)) {
                            console.warn('User data in localStorage appears to be invalid');
                            return null;
                        }
                        
                        // Tạo phiên mới từ dữ liệu localStorage
                        // Điều này đảm bảo đồng bộ giữa cookie và localStorage
                        this.createSession(user, true);
                        
                        return user;
                    }
                } catch (error) {
                    console.error('Error parsing stored user data:', error);
                    localStorage.removeItem(this.LOCAL_STORAGE_CURRENT_USER_KEY);
                    return null;
                }
            }
            
            console.log('No current user found');
            return null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }
    
    /**
     * Kiểm tra tính hợp lệ của dữ liệu người dùng
     * @param {Object} user - Dữ liệu người dùng
     * @returns {boolean} - true nếu hợp lệ
     */
    isUserValid(user) {
        // Kiểm tra các trường dữ liệu bắt buộc
        if (!user.email || !user.password) {
            return false;
        }
        
        // Kiểm tra định dạng email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user.email)) {
            return false;
        }
        
        // Thêm các kiểm tra khác nếu cần
        
        return true;
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
                id: this.generateUserId(),
                email: email,
                username: username || email.split('@')[0], // Nếu không có username, sử dụng phần đầu của email
                password: hashedPassword, // Lưu mật khẩu đã mã hóa
                // Lưu mật khẩu gốc để xác thực trong tương lai
                _originalPassword: password,
                role: 'user', // Mặc định role là user
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
            
            // Lưu vào MongoDB
            await this.saveUserToMongoDB(newUser);

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
        console.log('Login attempt:', email);
        
        try {
            // Lấy tất cả người dùng
            const users = this.getAllUsers();
            
            // Tìm người dùng với email này (không phân biệt hoa thường)
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            
            // Kiểm tra nếu tìm thấy người dùng
            if (!user) {
                console.error('User not found:', email);
                throw new Error('Tài khoản không tồn tại!');
            }
            
            // Kiểm tra mật khẩu
            let passwordValid = false;
            
            // Xử lý trường hợp người dùng có mật khẩu đã hash bcrypt
            if (user.password && user.password.startsWith('$2')) {
                passwordValid = await this.comparePassword(password, user.password);
            } 
            // Xử lý mật khẩu mặc định hoặc chưa được hash
            else if (user.password === password || user.password === this.simpleHash(password)) {
                passwordValid = true;
                
                // Di chuyển người dùng sang hệ thống mới với bcrypt hash
                user.password = await this.hashPassword(password);
                console.log('User password migrated to bcrypt hash');
            }
            
            if (!passwordValid) {
                console.error('Invalid password for user:', email);
                throw new Error('Mật khẩu không chính xác!');
            }
            
            // Đăng nhập thành công
            console.log('Login successful:', email);
            
            // Cập nhật thời gian đăng nhập
            user.lastLogin = new Date().toISOString();
            
            // Tạo phiên mới
            this.createSession(user, rememberMe);
            
            // Cập nhật người dùng trong localStorage
            this.saveUsers(users);
            
            // Cập nhật dữ liệu người dùng vào MongoDB
            try {
                // Đảm bảo kết nối MongoDB đã thiết lập
                if (!window.mongoDB) {
                    await this.connect();
                }
                
                // Lưu người dùng vào MongoDB
                const savedToMongoDB = await this.saveUserToMongoDB(user);
                console.log('User data saved to MongoDB:', savedToMongoDB);
                
                // Thử truy vấn lại từ MongoDB để xác nhận
                if (savedToMongoDB) {
                    try {
                        const collection = user.role === 'admin' || user.isAdmin ? 'Admin' : 'User';
                        const result = await window.mongoDB.find(collection, { Email: user.email });
                        console.log('Verification query result:', result);
                    } catch (verifyError) {
                        console.error('Error verifying user in MongoDB:', verifyError);
                    }
                }
            } catch (dbError) {
                console.error('Failed to update user in MongoDB after login:', dbError);
                // Không làm gián đoạn quy trình đăng nhập, chỉ ghi log lỗi
            }
            
            // Phát sự kiện đăng nhập toàn cục để đồng bộ với các tab/trang khác
            window.dispatchEvent(new CustomEvent('user-login', {
                detail: { user }
            }));
            
            console.log('Login process completed successfully');
            
            return user;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }
    
    /**
     * Lưu thông tin người dùng vào MongoDB
     * @param {Object} user - Thông tin người dùng cần lưu
     * @returns {Promise<Object|null>} - Thông tin người dùng đã lưu hoặc null nếu thất bại
     */
    async saveUserToMongoDB(user) {
        try {
            if (!user || !user.email) {
                console.error('Invalid user data provided to saveUserToMongoDB');
                return null;
            }
            
            console.log('Attempting to save user to MongoDB:', user.email);
            
            // Đảm bảo có kết nối MongoDB
            if (!window.mongoDB) {
                console.log('MongoDB instance not found, connecting...');
                const connected = await this.connect();
                
                if (!connected) {
                    console.error('Failed to establish MongoDB connection');
                    return null;
                }
            }
            
            // Deep clone user object để tránh vấn đề tham chiếu
            const userToSave = JSON.parse(JSON.stringify(user));
            
            // Xác định collection dựa vào role (Admin hoặc Users)
            // Đảm bảo tên collection đúng (Users, không phải User)
            const collection = userToSave.role === 'admin' || userToSave.isAdmin ? 'Admin' : 'Users';
            console.log(`Saving to ${collection} collection for user: ${userToSave.email}`);
            
            // Định dạng dữ liệu theo schema của MongoDB
            const formattedUser = this.formatUserDataForMongoDB(userToSave, collection);
            
            try {
                // Đảm bảo có trường _id cho MongoDB
                if (!formattedUser._id) {
                    formattedUser._id = userToSave.id || this.generateUserId();
                }
                
                // Kiểm tra xem người dùng đã tồn tại chưa, ưu tiên tìm theo email
                const queryFilter = { Email: userToSave.email };
                console.log(`Checking if user exists in ${collection} with filter:`, queryFilter);
                
                let existingUserResult = await window.mongoDB.find(collection, queryFilter);
                console.log('Find result:', existingUserResult);
                
                let existingUser = existingUserResult && existingUserResult.documents ? existingUserResult.documents : [];
                
                // Thêm trường lastSyncedWithMongoDB
                formattedUser.lastSyncedWithMongoDB = new Date().toISOString();
                
                let result;
                if (existingUser.length > 0) {
                    console.log(`Updating existing user in ${collection}: ${userToSave.email}`);
                    
                    // Lấy ID từ MongoDB nếu có
                    if (existingUser[0]._id) {
                        formattedUser._id = existingUser[0]._id;
                    }
                    
                    // Cập nhật với ID hợp lệ
                    result = await window.mongoDB.update(collection, { Email: formattedUser.Email }, formattedUser);
                    console.log('Update result:', result);
                } else {
                    console.log(`Creating new user in ${collection}: ${userToSave.email}`);
                    result = await window.mongoDB.request('insertOne', collection, { document: formattedUser });
                    console.log('Insert result:', result);
                }
                
                if (result && (result.modifiedCount > 0 || result.insertedId)) {
                    console.log(`User data for ${userToSave.email} successfully saved to MongoDB`);
                    
                    // Cập nhật user với thông tin MongoDB mới nhất
                    const updatedUser = {
                        ...userToSave,
                        _id: formattedUser._id || result.insertedId,
                        lastSyncedWithMongoDB: formattedUser.lastSyncedWithMongoDB
                    };
                    
                    // Lưu vào localStorage để đồng bộ
                    await this.saveUserToLocalStorage(updatedUser);
                    
                    return updatedUser;
                } else {
                    console.warn(`No changes made to ${userToSave.email} in MongoDB`);
                    return userToSave;
                }
            } catch (dbError) {
                console.error('MongoDB operation failed:', dbError);
                return null;
            }
        } catch (error) {
            console.error('Error in saveUserToMongoDB:', error);
            return null;
        }
    }
    
    /**
     * Định dạng dữ liệu người dùng theo schema MongoDB
     * @param {Object} user - Dữ liệu người dùng
     * @param {string} collection - Tên collection (Admin hoặc Users)
     * @returns {Object} - Dữ liệu đã định dạng
     */
    formatUserDataForMongoDB(user, collection) {
        // Giữ lại _id nếu có
        const _id = user._id || user.id || this.generateUserId();
        
        // Thông tin cơ bản chung cho mọi người dùng
        const baseUserData = {
            _id: _id,
            Username: user.username || user.email.split('@')[0],
            Email: user.email,
            Password: user.password,
            LastLogin: user.lastLogin || null,
            LastUpdated: new Date().toISOString(),
            CreatedDate: user.createdAt || user.created || new Date().toISOString()
        };
        
        // Cấu trúc dữ liệu cơ bản
        if (collection === 'Admin') {
            // Dữ liệu cho collection Admin
            return {
                ...baseUserData,
                Role: 'admin',
                Permissions: {
                    CanManageUsers: true,
                    CanManageContent: true,
                    CanManageSettings: true,
                    CanViewAnalytics: true
                }
            };
        } else {
            // Dữ liệu cho collection Users
            const planExpiryDate = user.expirationDate || 
                                  (user.subscription && user.subscription.expiryDate) || 
                                  this.calculateExpiryDate(user);
            
            return {
                ...baseUserData,
                Role: user.role || 'user',
                Plan: user.plan || (user.subscription && user.subscription.plan) || 'free',
                PlanStatus: user.planStatus || (user.subscription && user.subscription.status) || 'active',
                UsageCount: user.checksRemaining || 0,
                StorageQuota: user.storageQuota || this.getStorageQuotaForPlan(user.plan),
                StorageUsed: user.storageUsed || 0,
                ExpirationDate: planExpiryDate,
                Preferences: user.preferences || {
                    language: 'vi',
                    theme: 'light',
                    notifications: true
                }
            };
        }
    }
    
    /**
     * Lấy dung lượng lưu trữ cho gói đăng ký
     * @param {string} plan - Tên gói đăng ký
     * @returns {number} - Dung lượng lưu trữ (bytes)
     */
    getStorageQuotaForPlan(plan) {
        switch(plan) {
            case 'basic':
                return 5 * 1024 * 1024 * 1024; // 5GB
            case 'premium':
                return 50 * 1024 * 1024 * 1024; // 50GB
            case 'business':
                return 200 * 1024 * 1024 * 1024; // 200GB
            default:
                return 1024 * 1024 * 1024; // 1GB for free plan
        }
    }
    
    /**
     * Tính toán ngày hết hạn dựa trên gói dịch vụ
     * @param {Object} user - Dữ liệu người dùng
     * @returns {string} - Ngày hết hạn dạng ISO
     */
    calculateExpiryDate(user) {
        // Sử dụng ngày đăng ký hoặc ngày hiện tại
        const startDate = user.createdAt || user.created || new Date();
        const startDateObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
        
        // Mặc định thời hạn là 1 tháng
        let monthsToAdd = 1;
        
        // Xác định thời hạn dựa trên gói
        switch (user.plan) {
            case 'basic':
                monthsToAdd = 1;
                break;
            case 'premium':
                monthsToAdd = 3;
                break;
            case 'business':
                monthsToAdd = 12;
                break;
            default:
                monthsToAdd = 1;
        }
        
        // Tính ngày hết hạn
        const expiryDate = new Date(startDateObj);
        expiryDate.setMonth(expiryDate.getMonth() + monthsToAdd);
        
        return expiryDate.toISOString();
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
        
        // Phát sự kiện đăng xuất toàn cục để đồng bộ với các tab/trang khác
        window.dispatchEvent(new CustomEvent('user-logout'));
        
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
     * Cập nhật gói dịch vụ cho người dùng hiện tại
     * @param {string} plan - Tên gói dịch vụ
     * @returns {Promise<Object>} Người dùng đã cập nhật
     * @throws {Error} Lỗi nếu chưa đăng nhập hoặc không thể cập nhật
     */
    async updateSubscription(plan) {
        try {
            console.log(`Updating subscription to ${plan} plan`);
            
            // Kiểm tra người dùng đã đăng nhập chưa
            const currentUser = await this.getCurrentUser();
            
            if (!currentUser) {
                console.error('Cannot update subscription: Not logged in');
                throw new Error('Bạn cần đăng nhập để cập nhật gói dịch vụ');
            }
            
            // Lấy tất cả người dùng từ localStorage
            const users = this.getAllUsers();
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            
            if (userIndex === -1) {
                console.error('Cannot update subscription: User not found in localStorage');
                throw new Error('Không tìm thấy thông tin người dùng');
            }
            
            // Tạo bản sao của user để cập nhật
            const updatedUser = { ...users[userIndex] };
            
            // Cập nhật gói dịch vụ
            updatedUser.plan = plan;
            
            // Cập nhật số lần kiểm tra còn lại và dung lượng lưu trữ dựa trên gói
            switch (plan) {
                case 'free':
                    updatedUser.checksRemaining = 5;
                    updatedUser.storage = 1 * 1024 * 1024 * 1024; // 1GB
                    break;
                case 'basic':
                    updatedUser.checksRemaining = 50;
                    updatedUser.storage = 10 * 1024 * 1024 * 1024; // 10GB
                    break;
                case 'premium':
                    updatedUser.checksRemaining = 200;
                    updatedUser.storage = 50 * 1024 * 1024 * 1024; // 50GB
                    break;
                case 'business':
                    updatedUser.checksRemaining = 1000;
                    updatedUser.storage = 200 * 1024 * 1024 * 1024; // 200GB
                    break;
                default:
                    updatedUser.checksRemaining = 5;
                    updatedUser.storage = 1 * 1024 * 1024 * 1024; // 1GB
            }
            
            // Cập nhật ngày hết hạn dựa trên gói
            updatedUser.expirationDate = this.calculateExpiryDate(updatedUser);
            
            // Cập nhật thời gian
            updatedUser.updatedAt = new Date().toISOString();
            
            // Cập nhật người dùng trong mảng
            users[userIndex] = updatedUser;
            
            // Lưu danh sách người dùng vào localStorage
            this.saveUsers(users);
            
            // Cập nhật người dùng hiện tại trong localStorage
            localStorage.setItem(this.LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(updatedUser));
            
            // Cập nhật phiên hiện tại
            this.createSession(updatedUser, true);
            
            // Lưu vào MongoDB
            try {
                // Đảm bảo kết nối MongoDB đã thiết lập
                if (!window.mongoDB) {
                    await this.connect();
                }
                
                // Lưu người dùng vào MongoDB
                const savedToMongoDB = await this.saveUserToMongoDB(updatedUser);
                console.log('User data with updated subscription saved to MongoDB:', savedToMongoDB);
                
                // Phát sự kiện cập nhật gói dịch vụ
                window.dispatchEvent(new CustomEvent('subscription-updated', {
                    detail: { 
                        user: updatedUser, 
                        plan: plan,
                        previousPlan: currentUser.plan || 'free'
                    }
                }));
                
                console.log('Subscription updated successfully');
                
                return updatedUser;
            } catch (dbError) {
                console.error('Failed to update subscription in MongoDB:', dbError);
                // Phát sự kiện ngay cả khi MongoDB không khả dụng
                window.dispatchEvent(new CustomEvent('subscription-updated', {
                    detail: { 
                        user: updatedUser, 
                        plan: plan,
                        previousPlan: currentUser.plan || 'free',
                        offlineMode: true
                    }
                }));
                return updatedUser;
            }
        } catch (error) {
            console.error('Subscription update error:', error);
            throw error;
        }
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
    
    /**
     * Phương thức hỗ trợ để lưu dữ liệu vào localStorage
     * @param {string} collection - Tên bộ sưu tập
     * @param {object} data - Dữ liệu cần lưu
     * @returns {object} Dữ liệu đã lưu
     */
    saveLocal(collection, data) {
        try {
            const localData = JSON.parse(localStorage.getItem(collection) || '[]');
            
            // Chèn dữ liệu mới với ID nếu chưa có
            if (!data._id) {
                data._id = `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            }
            
            localData.push(data);
            localStorage.setItem(collection, JSON.stringify(localData));
            console.log(`Lưu vào bộ nhớ cục bộ: ${collection}`, data);
            
            return data;
        } catch (error) {
            console.error(`Lỗi khi lưu dữ liệu vào bộ nhớ cục bộ:`, error);
            return data;
        }
    }
    
    /**
     * Thiết lập kết nối MongoDB
     * @returns {Promise<boolean>} True nếu kết nối thành công, False nếu thất bại
     */
    async connect() {
        try {
            // Kiểm tra xem đã có kết nối MongoDB chưa
            if (window.mongoDB && window.mongoDB.isConnected) {
                console.log("Sử dụng kết nối MongoDB hiện có");
                return true;
            }
            
            // Tạo kết nối mới nếu cần
            if (typeof MongoDB !== 'undefined' && window.CONFIG) {
                console.log("Khởi tạo kết nối MongoDB mới");
                
                // Xóa mongoDB instance cũ nếu có
                if (window.mongoDB) {
                    console.log("Đang xóa kết nối MongoDB cũ");
                    window.mongoDB = null;
                }
                
                // Tạo instance mới
                window.mongoDB = new MongoDB({
                    apiKey: window.CONFIG.MONGODB_API_KEY,
                    privateKey: window.CONFIG.MONGODB_PRIVATE_KEY,
                    connectionString: window.CONFIG.MONGODB_CONNECTION_STRING,
                    database: window.CONFIG.MONGODB_DATABASE,
                    dataSource: window.CONFIG.MONGODB_DATA_SOURCE
                });
                
                // Đợi kết nối được thiết lập
                try {
                    // Kiểm tra kết nối
                    console.log("Kiểm tra kết nối MongoDB");
                    const testResult = await window.mongoDB.testConnection();
                    
                    if (testResult) {
                        console.log("Kết nối MongoDB thành công");
                        this.isConnected = true;
                        return true;
                    } else {
                        console.error("Kiểm tra kết nối MongoDB thất bại");
                        this.isConnected = false;
                        return false;
                    }
                } catch (connectionError) {
                    console.error("Lỗi kiểm tra kết nối MongoDB:", connectionError);
                    this.isConnected = false;
                    return false;
                }
            }
            
            console.warn("MongoDB class không khả dụng, đang sử dụng lưu trữ cục bộ");
            return false;
        } catch (error) {
            console.error("Lỗi kết nối MongoDB:", error);
            this.isConnected = false;
            return false;
        }
    }
    
    /**
     * Gửi yêu cầu đến MongoDB
     * @param {string} action - Hành động (insertOne, find, etc.)
     * @param {string} collection - Tên bộ sưu tập
     * @param {object} payload - Dữ liệu yêu cầu
     * @returns {Promise<object>} Kết quả từ MongoDB
     */
    async request(action, collection, payload) {
        try {
            if (!window.mongoDB) {
                await this.connect();
            }
            
            if (!window.mongoDB) {
                throw new Error("Không thể kết nối đến MongoDB");
            }
            
            return await window.mongoDB.request(action, collection, payload);
        } catch (error) {
            console.error(`Lỗi khi gửi yêu cầu MongoDB (${action}):`, error);
            throw error;
        }
    }

    /**
     * Lưu thông tin người dùng vào localStorage
     * @param {Object} user - Thông tin người dùng cần lưu
     * @returns {Promise<Object>} Thông tin người dùng đã lưu
     */
    async saveUserToLocalStorage(user) {
        try {
            if (!user || !user.id) {
                throw new Error('Invalid user data');
            }
            
            // Lấy danh sách người dùng hiện tại
            const users = this.getAllUsers();
            
            // Tìm và cập nhật người dùng
            const userIndex = users.findIndex(u => u.id === user.id);
            
            if (userIndex >= 0) {
                // Cập nhật người dùng hiện có
                users[userIndex] = {
                    ...users[userIndex],
                    ...user,
                    lastUpdated: new Date().toISOString()
                };
            } else {
                // Thêm người dùng mới
                users.push({
                    ...user,
                    lastUpdated: new Date().toISOString()
                });
            }
            
            // Lưu danh sách người dùng đã cập nhật
            this.saveUsers(users);
            
            // Cập nhật người dùng hiện tại nếu cần
            const currentUser = await this.getCurrentUser();
            if (currentUser && currentUser.id === user.id) {
                localStorage.setItem(this.LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify({
                    ...user,
                    lastUpdated: new Date().toISOString()
                }));
                
                // Phát sự kiện cập nhật người dùng
                this.dispatchUserUpdatedEvent(user);
            }
            
            return user;
        } catch (error) {
            console.error('Error saving user to localStorage:', error);
            throw error;
        }
    }
    
    /**
     * Phát sự kiện cập nhật thông tin người dùng
     * @param {Object} user - Thông tin người dùng đã cập nhật
     */
    dispatchUserUpdatedEvent(user) {
        const sanitizedUser = { ...user };
        
        // Xóa các trường nhạy cảm
        delete sanitizedUser.password;
        delete sanitizedUser._originalPassword;
        delete sanitizedUser.passwordResetToken;
        delete sanitizedUser.passwordResetExpires;
        
        // Phát sự kiện
        window.dispatchEvent(new CustomEvent('user-updated', {
            detail: { user: sanitizedUser }
        }));
    }

    /**
     * Tạo hash đơn giản cho mật khẩu
     * @param {string} input - Chuỗi đầu vào cần hash
     * @param {string} salt - Muối để tăng độ phức tạp
     * @returns {string} - Chuỗi đã được hash
     */
    simpleHash(input, salt = '') {
        if (!input) return '';
        
        // Sử dụng CryptoJS để hash
        try {
            return CryptoJS.SHA256(input + (salt || this.SECRET_KEY)).toString();
        } catch (error) {
            console.error('Lỗi khi hash mật khẩu:', error);
            // Fallback nếu CryptoJS không có sẵn
            let hash = 0;
            for (let i = 0; i < input.length; i++) {
                const char = input.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash.toString(16);
        }
    }
}
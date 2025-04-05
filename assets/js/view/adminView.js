class AdminView {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        // Dashboard elements
        this.dashboardContainer = document.getElementById('dashboard-container');
        this.userStatsContainer = document.getElementById('user-stats');
        this.checksStatsContainer = document.getElementById('checks-stats');
        this.revenueStatsContainer = document.getElementById('revenue-stats');
        
        // User management elements
        this.userManagementContainer = document.getElementById('user-management');
        this.userTable = document.getElementById('user-table');
        this.userTableBody = this.userTable ? this.userTable.querySelector('tbody') : null;
        
        // Feedback management elements
        this.feedbackContainer = document.getElementById('feedback-management');
        this.feedbackList = document.getElementById('feedback-list');
        
        // Create container elements if they don't exist
        this.createAdminInterface();
    }
    
    setupEventListeners() {
        // Listen for tab changes
        const adminTabs = document.querySelectorAll('.admin-tab');
        if (adminTabs) {
            adminTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = tab.getAttribute('data-target');
                    this.showTab(targetId);
                });
            });
        }
        
        // User management listeners
        document.addEventListener('click', (e) => {
            // Edit user
            if (e.target.matches('.edit-user-btn') || e.target.closest('.edit-user-btn')) {
                const userId = e.target.closest('tr').getAttribute('data-user-id');
                this.showEditUserModal(userId);
            }
            
            // Delete user
            if (e.target.matches('.delete-user-btn') || e.target.closest('.delete-user-btn')) {
                const userId = e.target.closest('tr').getAttribute('data-user-id');
                if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
                    const deleteEvent = new CustomEvent('admin:deleteUser', {
                        detail: { userId }
                    });
                    document.dispatchEvent(deleteEvent);
                }
            }
            
            // Feedback management
            if (e.target.matches('.mark-read-btn') || e.target.closest('.mark-read-btn')) {
                const feedbackId = e.target.closest('.feedback-item').getAttribute('data-feedback-id');
                const markReadEvent = new CustomEvent('admin:markFeedbackRead', {
                    detail: { feedbackId }
                });
                document.dispatchEvent(markReadEvent);
            }
            
            if (e.target.matches('.reply-feedback-btn') || e.target.closest('.reply-feedback-btn')) {
                const feedbackId = e.target.closest('.feedback-item').getAttribute('data-feedback-id');
                this.showReplyFeedbackModal(feedbackId);
            }
        });
        
        // Listen for form submissions
        document.addEventListener('submit', (e) => {
            // Edit user form
            if (e.target.id === 'edit-user-form') {
                e.preventDefault();
                const userId = e.target.getAttribute('data-user-id');
                const userData = {
                    username: document.getElementById('edit-username').value,
                    email: document.getElementById('edit-email').value,
                    plan: document.getElementById('edit-plan').value,
                    isAdmin: document.getElementById('edit-is-admin').checked
                };
                
                const updateEvent = new CustomEvent('admin:updateUser', {
                    detail: { userId, userData }
                });
                document.dispatchEvent(updateEvent);
                this.closeModal('edit-user-modal');
            }
            
            // Reply feedback form
            if (e.target.id === 'reply-feedback-form') {
                e.preventDefault();
                const feedbackId = e.target.getAttribute('data-feedback-id');
                const reply = document.getElementById('feedback-reply').value;
                
                const replyEvent = new CustomEvent('admin:replyFeedback', {
                    detail: { feedbackId, reply }
                });
                document.dispatchEvent(replyEvent);
                this.closeModal('reply-feedback-modal');
            }
        });
    }
    
    createAdminInterface() {
        const adminContainer = document.querySelector('.admin-container');
        if (!adminContainer) return;
        
        // Create tabs if they don't exist
        if (!document.querySelector('.admin-tabs')) {
            const tabsHtml = `
                <div class="admin-tabs">
                    <ul>
                        <li><a href="#" class="admin-tab active" data-target="dashboard-container">Tổng quan</a></li>
                        <li><a href="#" class="admin-tab" data-target="user-management">Quản lý người dùng</a></li>
                        <li><a href="#" class="admin-tab" data-target="revenue-management">Doanh thu</a></li>
                        <li><a href="#" class="admin-tab" data-target="feedback-management">Phản hồi</a></li>
                    </ul>
                </div>
            `;
            adminContainer.insertAdjacentHTML('afterbegin', tabsHtml);
        }
        
        // Create dashboard container if it doesn't exist
        if (!this.dashboardContainer) {
            const dashboardHtml = `
                <div id="dashboard-container" class="admin-panel active">
                    <h2>Tổng quan hệ thống</h2>
                    
                    <div class="dashboard-stats">
                        <div id="user-stats" class="stat-card">
                            <h3>Người dùng</h3>
                            <div class="stat-content">
                                <div class="stat-value">0</div>
                                <div class="stat-label">Tổng người dùng</div>
                            </div>
                            <div class="stat-detail">
                                <div class="stat-item">
                                    <span class="stat-item-label">Mới hôm nay:</span>
                                    <span class="stat-item-value">0</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-item-label">Đang hoạt động:</span>
                                    <span class="stat-item-value">0</span>
                                </div>
                            </div>
                        </div>
                        
                        <div id="checks-stats" class="stat-card">
                            <h3>Kiểm tra nội dung</h3>
                            <div class="stat-content">
                                <div class="stat-value">0</div>
                                <div class="stat-label">Tổng lượt kiểm tra</div>
                            </div>
                            <div class="stat-detail">
                                <div class="stat-item">
                                    <span class="stat-item-label">Hôm nay:</span>
                                    <span class="stat-item-value">0</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-item-label">Phát hiện trùng lặp:</span>
                                    <span class="stat-item-value">0</span>
                                </div>
                            </div>
                        </div>
                        
                        <div id="revenue-stats" class="stat-card">
                            <h3>Doanh thu</h3>
                            <div class="stat-content">
                                <div class="stat-value">0 đ</div>
                                <div class="stat-label">Tổng doanh thu</div>
                            </div>
                            <div class="stat-detail">
                                <div class="stat-item">
                                    <span class="stat-item-label">Tháng này:</span>
                                    <span class="stat-item-value">0 đ</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-item-label">Gói Premium:</span>
                                    <span class="stat-item-value">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <div class="chart-card">
                            <h3>Người dùng đăng ký</h3>
                            <canvas id="users-chart"></canvas>
                        </div>
                        <div class="chart-card">
                            <h3>Lượt kiểm tra</h3>
                            <canvas id="checks-chart"></canvas>
                        </div>
                    </div>
                </div>
            `;
            adminContainer.insertAdjacentHTML('beforeend', dashboardHtml);
            this.dashboardContainer = document.getElementById('dashboard-container');
        }
        
        // Create user management container if it doesn't exist
        if (!this.userManagementContainer) {
            const userManagementHtml = `
                <div id="user-management" class="admin-panel">
                    <h2>Quản lý người dùng</h2>
                    
                    <div class="admin-actions">
                        <div class="search-box">
                            <input type="text" id="user-search" placeholder="Tìm kiếm người dùng...">
                            <i class="fas fa-search"></i>
                        </div>
                        <div class="filters">
                            <select id="plan-filter">
                                <option value="">Tất cả gói</option>
                                <option value="free">Miễn phí</option>
                                <option value="basic">Cơ bản</option>
                                <option value="premium">Premium</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="table-container">
                        <table id="user-table" class="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tên người dùng</th>
                                    <th>Email</th>
                                    <th>Gói dịch vụ</th>
                                    <th>Ngày đăng ký</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- User rows will be inserted here -->
                            </tbody>
                        </table>
                        
                        <div class="pagination">
                            <button class="btn" id="prev-page"><i class="fas fa-chevron-left"></i></button>
                            <span class="page-info">Trang <span id="current-page">1</span> / <span id="total-pages">1</span></span>
                            <button class="btn" id="next-page"><i class="fas fa-chevron-right"></i></button>
                        </div>
                    </div>
                </div>
            `;
            adminContainer.insertAdjacentHTML('beforeend', userManagementHtml);
            this.userManagementContainer = document.getElementById('user-management');
            this.userTable = document.getElementById('user-table');
            this.userTableBody = this.userTable.querySelector('tbody');
        }
        
        // Create revenue management container if it doesn't exist
        if (!document.getElementById('revenue-management')) {
            const revenueHtml = `
                <div id="revenue-management" class="admin-panel">
                    <h2>Quản lý doanh thu</h2>
                    
                    <div class="revenue-filters">
                        <div class="date-range">
                            <label for="date-from">Từ:</label>
                            <input type="date" id="date-from">
                            
                            <label for="date-to">Đến:</label>
                            <input type="date" id="date-to">
                            
                            <button class="btn btn-primary" id="apply-filter">Áp dụng</button>
                        </div>
                        
                        <div class="chart-type">
                            <button class="btn btn-outline active" data-chart="daily">Ngày</button>
                            <button class="btn btn-outline" data-chart="monthly">Tháng</button>
                            <button class="btn btn-outline" data-chart="yearly">Năm</button>
                        </div>
                    </div>
                    
                    <div class="revenue-summary">
                        <div class="summary-card">
                            <h3>Tổng doanh thu</h3>
                            <div class="summary-value" id="total-revenue">0 đ</div>
                        </div>
                        
                        <div class="summary-card">
                            <h3>Gói Cơ bản</h3>
                            <div class="summary-value" id="basic-revenue">0 đ</div>
                        </div>
                        
                        <div class="summary-card">
                            <h3>Gói Premium</h3>
                            <div class="summary-value" id="premium-revenue">0 đ</div>
                        </div>
                    </div>
                    
                    <div class="big-chart-container">
                        <canvas id="revenue-chart"></canvas>
                    </div>
                    
                    <div class="recent-transactions">
                        <h3>Giao dịch gần đây</h3>
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Người dùng</th>
                                    <th>Gói</th>
                                    <th>Thời gian</th>
                                    <th>Số tiền</th>
                                    <th>Phương thức</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody id="transactions-body">
                                <!-- Transaction rows will be inserted here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            adminContainer.insertAdjacentHTML('beforeend', revenueHtml);
        }
        
        // Create feedback management container if it doesn't exist
        if (!this.feedbackContainer) {
            const feedbackHtml = `
                <div id="feedback-management" class="admin-panel">
                    <h2>Quản lý phản hồi</h2>
                    
                    <div class="admin-actions">
                        <div class="search-box">
                            <input type="text" id="feedback-search" placeholder="Tìm kiếm phản hồi...">
                            <i class="fas fa-search"></i>
                        </div>
                        <div class="filters">
                            <select id="feedback-filter">
                                <option value="">Tất cả phản hồi</option>
                                <option value="unread">Chưa đọc</option>
                                <option value="read">Đã đọc</option>
                                <option value="replied">Đã trả lời</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="feedback-list" class="feedback-container">
                        <!-- Feedback items will be inserted here -->
                    </div>
                </div>
            `;
            adminContainer.insertAdjacentHTML('beforeend', feedbackHtml);
            this.feedbackContainer = document.getElementById('feedback-management');
            this.feedbackList = document.getElementById('feedback-list');
        }
        
        // Add edit user modal
        if (!document.getElementById('edit-user-modal')) {
            const editUserModalHtml = `
                <div id="edit-user-modal" class="modal">
                    <div class="modal-content">
                        <span class="close-btn" onclick="adminView.closeModal('edit-user-modal')">
                            <i class="fas fa-times"></i>
                        </span>
                        <h3>Chỉnh sửa người dùng</h3>
                        <form id="edit-user-form">
                            <div class="form-group">
                                <label for="edit-username">Tên người dùng</label>
                                <input type="text" id="edit-username" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-email">Email</label>
                                <input type="email" id="edit-email" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-plan">Gói dịch vụ</label>
                                <select id="edit-plan">
                                    <option value="free">Miễn phí</option>
                                    <option value="basic">Cơ bản</option>
                                    <option value="premium">Premium</option>
                                </select>
                            </div>
                            <div class="form-group checkbox">
                                <input type="checkbox" id="edit-is-admin">
                                <label for="edit-is-admin">Quyền quản trị</label>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Lưu thay đổi</button>
                                <button type="button" class="btn btn-outline" onclick="adminView.closeModal('edit-user-modal')">Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', editUserModalHtml);
        }
        
        // Add reply feedback modal
        if (!document.getElementById('reply-feedback-modal')) {
            const replyFeedbackModalHtml = `
                <div id="reply-feedback-modal" class="modal">
                    <div class="modal-content">
                        <span class="close-btn" onclick="adminView.closeModal('reply-feedback-modal')">
                            <i class="fas fa-times"></i>
                        </span>
                        <h3>Trả lời phản hồi</h3>
                        <form id="reply-feedback-form">
                            <div class="feedback-info">
                                <p><strong>Từ:</strong> <span id="feedback-sender"></span></p>
                                <p><strong>Chủ đề:</strong> <span id="feedback-subject"></span></p>
                                <p><strong>Nội dung:</strong></p>
                                <div id="feedback-content" class="feedback-content-box"></div>
                            </div>
                            <div class="form-group">
                                <label for="feedback-reply">Trả lời</label>
                                <textarea id="feedback-reply" rows="6" required></textarea>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Gửi trả lời</button>
                                <button type="button" class="btn btn-outline" onclick="adminView.closeModal('reply-feedback-modal')">Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', replyFeedbackModalHtml);
        }
    }
    
    showTab(tabId) {
        // Hide all panels
        const panels = document.querySelectorAll('.admin-panel');
        panels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Show the selected panel
        const selectedPanel = document.getElementById(tabId);
        if (selectedPanel) {
            selectedPanel.classList.add('active');
        }
        
        // Update tabs active state
        const tabs = document.querySelectorAll('.admin-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-target') === tabId) {
                tab.classList.add('active');
            }
        });
    }
    
    // Dashboard methods
    updateDashboardStats(stats) {
        if (!this.dashboardContainer) return;
        
        // Update user stats
        if (this.userStatsContainer) {
            const userTotal = this.userStatsContainer.querySelector('.stat-value');
            const userToday = this.userStatsContainer.querySelector('.stat-item-value:first-of-type');
            const userActive = this.userStatsContainer.querySelector('.stat-item-value:last-of-type');
            
            if (userTotal) userTotal.textContent = stats.users.total || 0;
            if (userToday) userToday.textContent = stats.users.newToday || 0;
            if (userActive) userActive.textContent = stats.users.active || 0;
        }
        
        // Update checks stats
        if (this.checksStatsContainer) {
            const checksTotal = this.checksStatsContainer.querySelector('.stat-value');
            const checksToday = this.checksStatsContainer.querySelector('.stat-item-value:first-of-type');
            const duplicates = this.checksStatsContainer.querySelector('.stat-item-value:last-of-type');
            
            if (checksTotal) checksTotal.textContent = stats.checks.total || 0;
            if (checksToday) checksToday.textContent = stats.checks.today || 0;
            if (duplicates) duplicates.textContent = stats.checks.duplicates || 0;
        }
        
        // Update revenue stats
        if (this.revenueStatsContainer) {
            const revenueTotal = this.revenueStatsContainer.querySelector('.stat-value');
            const revenueMonth = this.revenueStatsContainer.querySelector('.stat-item-value:first-of-type');
            const premiumUsers = this.revenueStatsContainer.querySelector('.stat-item-value:last-of-type');
            
            if (revenueTotal) revenueTotal.textContent = this.formatCurrency(stats.revenue.total);
            if (revenueMonth) revenueMonth.textContent = this.formatCurrency(stats.revenue.thisMonth);
            if (premiumUsers) premiumUsers.textContent = stats.users.premium || 0;
        }
    }
    
    // User management methods
    renderUsers(users, page = 1, limit = 10) {
        if (!this.userTableBody) return;
        
        this.userTableBody.innerHTML = '';
        
        // Calculate pagination
        const totalPages = Math.ceil(users.length / limit);
        const start = (page - 1) * limit;
        const end = Math.min(start + limit, users.length);
        const paginatedUsers = users.slice(start, end);
        
        // Update pagination info
        const currentPageElement = document.getElementById('current-page');
        const totalPagesElement = document.getElementById('total-pages');
        
        if (currentPageElement) currentPageElement.textContent = page;
        if (totalPagesElement) totalPagesElement.textContent = totalPages;
        
        // Enable/disable pagination buttons
        const prevButton = document.getElementById('prev-page');
        const nextButton = document.getElementById('next-page');
        
        if (prevButton) prevButton.disabled = page <= 1;
        if (nextButton) nextButton.disabled = page >= totalPages;
        
        // Render user rows
        paginatedUsers.forEach(user => {
            const row = document.createElement('tr');
            row.setAttribute('data-user-id', user.id);
            
            const createdDate = new Date(user.createdAt).toLocaleDateString('vi-VN');
            const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('vi-VN') : 'Chưa đăng nhập';
            
            row.innerHTML = `
                <td>${user.id.substring(0, 8)}...</td>
                <td>${user.username || 'N/A'}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${user.plan === 'premium' ? 'badge-premium' : (user.plan === 'basic' ? 'badge-basic' : 'badge-free')}">
                        ${user.plan === 'premium' ? 'Premium' : (user.plan === 'basic' ? 'Cơ bản' : 'Miễn phí')}
                    </span>
                </td>
                <td>${createdDate}</td>
                <td>
                    <span class="status-indicator ${this.getLastLoginStatus(user.lastLogin)}"></span>
                    ${this.getLastLoginText(user.lastLogin)}
                </td>
                <td class="actions">
                    <button class="btn btn-sm edit-user-btn" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm delete-user-btn" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            this.userTableBody.appendChild(row);
        });
    }
    
    showEditUserModal(userId) {
        const modal = document.getElementById('edit-user-modal');
        const form = document.getElementById('edit-user-form');
        
        if (!modal || !form) return;
        
        // Get user data
        const getUserEvent = new CustomEvent('admin:getUser', {
            detail: { 
                userId,
                callback: (user) => {
                    if (!user) return;
                    
                    // Fill form
                    document.getElementById('edit-username').value = user.username || '';
                    document.getElementById('edit-email').value = user.email || '';
                    document.getElementById('edit-plan').value = user.plan || 'free';
                    document.getElementById('edit-is-admin').checked = user.isAdmin || false;
                    
                    // Set form user ID
                    form.setAttribute('data-user-id', userId);
                    
                    // Show modal
                    this.showModal('edit-user-modal');
                }
            }
        });
        
        document.dispatchEvent(getUserEvent);
    }
    
    // Feedback management methods
    renderFeedback(feedbackItems) {
        if (!this.feedbackList) return;
        
        this.feedbackList.innerHTML = '';
        
        if (feedbackItems.length === 0) {
            this.feedbackList.innerHTML = `
                <div class="empty-content">
                    <i class="fas fa-comments"></i>
                    <h3>Không có phản hồi</h3>
                    <p>Hiện tại chưa có phản hồi nào từ người dùng.</p>
                </div>
            `;
            return;
        }
        
        feedbackItems.forEach(feedback => {
            const feedbackDate = new Date(feedback.createdAt).toLocaleDateString('vi-VN');
            const feedbackTime = new Date(feedback.createdAt).toLocaleTimeString('vi-VN');
            
            const item = document.createElement('div');
            item.className = `feedback-item ${feedback.status}`;
            item.setAttribute('data-feedback-id', feedback.id);
            
            item.innerHTML = `
                <div class="feedback-header">
                    <div class="feedback-info">
                        <h4>${feedback.subject}</h4>
                        <span class="feedback-meta">
                            <span class="feedback-sender">${feedback.name} (${feedback.email})</span>
                            <span class="feedback-date">${feedbackDate} ${feedbackTime}</span>
                        </span>
                    </div>
                    <div class="feedback-status">
                        <span class="status-badge ${feedback.status}">
                            ${feedback.status === 'unread' ? 'Chưa đọc' : (feedback.status === 'read' ? 'Đã đọc' : 'Đã trả lời')}
                        </span>
                    </div>
                </div>
                <div class="feedback-body">
                    <p>${feedback.message}</p>
                </div>
                <div class="feedback-actions">
                    ${feedback.status === 'unread' ? 
                        `<button class="btn btn-outline mark-read-btn">
                            <i class="fas fa-check"></i> Đánh dấu đã đọc
                        </button>` : ''}
                    <button class="btn btn-primary reply-feedback-btn">
                        <i class="fas fa-reply"></i> Trả lời
                    </button>
                </div>
                ${feedback.reply ? 
                    `<div class="feedback-reply">
                        <div class="reply-header">
                            <strong>Trả lời của bạn:</strong>
                            <span class="reply-date">${new Date(feedback.replyDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p>${feedback.reply}</p>
                    </div>` : ''}
            `;
            
            this.feedbackList.appendChild(item);
        });
    }
    
    showReplyFeedbackModal(feedbackId) {
        const modal = document.getElementById('reply-feedback-modal');
        const form = document.getElementById('reply-feedback-form');
        
        if (!modal || !form) return;
        
        // Get feedback data
        const getFeedbackEvent = new CustomEvent('admin:getFeedback', {
            detail: { 
                feedbackId,
                callback: (feedback) => {
                    if (!feedback) return;
                    
                    // Fill form
                    document.getElementById('feedback-sender').textContent = `${feedback.name} (${feedback.email})`;
                    document.getElementById('feedback-subject').textContent = feedback.subject;
                    document.getElementById('feedback-content').textContent = feedback.message;
                    document.getElementById('feedback-reply').value = feedback.reply || '';
                    
                    // Set form feedback ID
                    form.setAttribute('data-feedback-id', feedbackId);
                    
                    // Show modal
                    this.showModal('reply-feedback-modal');
                }
            }
        });
        
        document.dispatchEvent(getFeedbackEvent);
    }
    
    // Revenue management methods
    renderRevenueStats(stats) {
        // Update summary cards
        const totalRevenueElement = document.getElementById('total-revenue');
        const basicRevenueElement = document.getElementById('basic-revenue');
        const premiumRevenueElement = document.getElementById('premium-revenue');
        
        if (totalRevenueElement) totalRevenueElement.textContent = this.formatCurrency(stats.total);
        if (basicRevenueElement) basicRevenueElement.textContent = this.formatCurrency(stats.basic);
        if (premiumRevenueElement) premiumRevenueElement.textContent = this.formatCurrency(stats.premium);
    }
    
    renderTransactions(transactions) {
        const tbody = document.getElementById('transactions-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            const txDate = new Date(tx.date).toLocaleDateString('vi-VN');
            const txTime = new Date(tx.date).toLocaleTimeString('vi-VN');
            
            row.innerHTML = `
                <td>${tx.id.substring(0, 8)}...</td>
                <td>${tx.userName}</td>
                <td>
                    <span class="badge ${tx.plan === 'premium' ? 'badge-premium' : 'badge-basic'}">
                        ${tx.plan === 'premium' ? 'Premium' : 'Cơ bản'}
                    </span>
                </td>
                <td>${txDate} ${txTime}</td>
                <td>${this.formatCurrency(tx.amount)}</td>
                <td>${tx.paymentMethod}</td>
                <td>
                    <span class="badge ${tx.status === 'completed' ? 'badge-success' : (tx.status === 'pending' ? 'badge-warning' : 'badge-danger')}">
                        ${tx.status === 'completed' ? 'Hoàn thành' : (tx.status === 'pending' ? 'Đang xử lý' : 'Thất bại')}
                    </span>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0
        }).format(amount);
    }
    
    getLastLoginStatus(lastLogin) {
        if (!lastLogin) return 'status-inactive';
        
        const lastLoginDate = new Date(lastLogin);
        const now = new Date();
        const diffDays = Math.floor((now - lastLoginDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1) return 'status-active';
        if (diffDays < 7) return 'status-recent';
        return 'status-inactive';
    }
    
    getLastLoginText(lastLogin) {
        if (!lastLogin) return 'Chưa đăng nhập';
        
        const lastLoginDate = new Date(lastLogin);
        const now = new Date();
        const diffDays = Math.floor((now - lastLoginDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1) return 'Hoạt động gần đây';
        if (diffDays === 1) return 'Hoạt động hôm qua';
        if (diffDays < 7) return `Hoạt động ${diffDays} ngày trước`;
        return new Date(lastLogin).toLocaleDateString('vi-VN');
    }
    
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
}

// Initialize the admin view
const adminView = new AdminView();
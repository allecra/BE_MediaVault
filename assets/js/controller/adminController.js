class AdminController {
    constructor(userModel, mongoDB) {
        this.userModel = userModel;
        this.mongoDB = mongoDB;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.usersCache = null;
        this.filterTimer = null;
        this.charts = {};
        
        // Thông tin thanh toán mặc định
        this.paymentInfo = {
            bank: 'MB Bank',
            accountNumber: '039175309',
            accountName: 'MediaVault',
            referenceFormat: {
                free: 'F{userId}',
                basic: 'B{userId}',
                premium: 'P{userId}'
            }
        };
        
        // Simulate some sample data for demo purposes
        this.mockData = {
            transactions: [
                {
                    id: 'txn_' + Date.now(),
                    userId: 'test-user',
                    userName: 'Test User',
                    plan: 'premium',
                    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    amount: 100000,
                    paymentMethod: 'Chuyển khoản ngân hàng',
                    status: 'completed'
                },
                {
                    id: 'txn_' + (Date.now() - 1000),
                    userId: 'another-user',
                    userName: 'Người dùng khác',
                    plan: 'basic',
                    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    amount: 50000,
                    paymentMethod: 'Ví điện tử MoMo',
                    status: 'completed'
                }
            ],
            feedback: [
                {
                    id: 'feedback-1',
                    name: 'Nguyễn Văn A',
                    email: 'nguyenvana@example.com',
                    subject: 'Góp ý về tính năng kiểm tra',
                    message: 'Tôi thấy tính năng kiểm tra nội dung hoạt động rất tốt, nhưng có thể cải thiện tốc độ xử lý của hệ thống. Đôi khi phải chờ khá lâu để nhận kết quả.',
                    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'unread',
                    reply: null,
                    replyDate: null
                },
                {
                    id: 'feedback-2',
                    name: 'Trần Thị B',
                    email: 'tranthib@example.com',
                    subject: 'Báo lỗi đăng nhập',
                    message: 'Tôi gặp vấn đề khi đăng nhập vào hệ thống. Sau khi nhập thông tin và nhấn đăng nhập, trang web không phản hồi gì cả.',
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'replied',
                    reply: 'Cảm ơn bạn đã báo cáo lỗi. Chúng tôi đã kiểm tra và khắc phục vấn đề. Vui lòng thử đăng nhập lại và cho chúng tôi biết kết quả.',
                    replyDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
                }
            ]
        };
        
        this.setupEventListeners();
        this.loadDashboard();
    }
    
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Cache frequently used DOM elements
            this.domElements = {
                tabLinks: document.querySelectorAll('.admin-tabs a'),
                adminPanels: document.querySelectorAll('.admin-panel'),
                usersTable: document.getElementById('users-table-body'),
                userSearchInput: document.getElementById('user-search'),
                userFilterSelect: document.getElementById('user-filter'),
                userPagination: document.getElementById('users-pagination'),
                feedbackContainer: document.getElementById('feedback-container'),
                feedbackSearchInput: document.getElementById('feedback-search'),
                feedbackFilterSelect: document.getElementById('feedback-filter'),
                revenueFromDate: document.getElementById('revenue-from-date'),
                revenueToDate: document.getElementById('revenue-to-date'),
                revenueChartType: document.querySelector('.chart-type')
            };
            
            // Tab switching
            this.domElements.tabLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tabId = e.target.getAttribute('href').substring(1);
                    this.switchTab(tabId);
                });
            });
            
            // Search inputs - apply debouncing using PerformanceUtils if available
            const debounce = window.PerformanceUtils ? 
                window.PerformanceUtils.debounce : 
                (fn, delay) => {
                    let timeout;
                    return function(...args) {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => fn.apply(this, args), delay);
                    };
                };
            
            // Debounce user search to improve performance
            if (this.domElements.userSearchInput) {
                this.domElements.userSearchInput.addEventListener('input', debounce(() => {
                    this.filterUsers();
                }, 300));
            }
            
            // User filters
            if (this.domElements.userFilterSelect) {
                this.domElements.userFilterSelect.addEventListener('change', () => {
                    this.filterUsers();
                });
            }
            
            // Debounce feedback search
            if (this.domElements.feedbackSearchInput) {
                this.domElements.feedbackSearchInput.addEventListener('input', debounce(() => {
                    this.filterFeedback();
                }, 300));
            }
            
            // Feedback filters
            if (this.domElements.feedbackFilterSelect) {
                this.domElements.feedbackFilterSelect.addEventListener('change', () => {
                    this.filterFeedback();
                });
            }
            
            // Revenue date filters
            if (this.domElements.revenueFromDate && this.domElements.revenueToDate) {
                const updateRevenueData = debounce(() => {
                    const fromDate = this.domElements.revenueFromDate.value;
                    const toDate = this.domElements.revenueToDate.value;
                    this.loadRevenueData(fromDate, toDate);
                }, 500);
                
                this.domElements.revenueFromDate.addEventListener('change', updateRevenueData);
                this.domElements.revenueToDate.addEventListener('change', updateRevenueData);
            }
            
            // Revenue chart type
            if (this.domElements.revenueChartType) {
                this.domElements.revenueChartType.addEventListener('click', (e) => {
                    if (e.target.tagName === 'BUTTON') {
                        const chartType = e.target.getAttribute('data-chart');
                        this.updateRevenueChart(chartType);
                    }
                });
            }
            
            // Display payment account info
            this.displayPaymentAccountInfo();
        });
    }
    
    // Switch between admin tabs
    switchTab(tabId) {
        // Use requestAnimationFrame for smoother UI updates
        requestAnimationFrame(() => {
            // Update active tab
            this.domElements.tabLinks.forEach(link => {
                if (link.getAttribute('href') === `#${tabId}`) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
            
            // Update visible panel
            this.domElements.adminPanels.forEach(panel => {
                if (panel.id === tabId) {
                    panel.classList.add('active');
                    
                    // Lazy load panel data
                    this.loadTabData(tabId);
                } else {
                    panel.classList.remove('active');
                }
            });
        });
    }
    
    // Lazy load data based on selected tab
    loadTabData(tabId) {
        switch (tabId) {
            case 'dashboard':
                if (!this.dashboardLoaded) {
                    this.loadDashboard();
                    this.dashboardLoaded = true;
                }
                break;
            case 'users':
                if (!this.usersLoaded) {
                    this.loadUsers();
                    this.usersLoaded = true;
                }
                break;
            case 'revenue':
                if (!this.revenueLoaded) {
                    this.loadRevenueData();
                    this.revenueLoaded = true;
                }
                break;
            case 'feedback':
                if (!this.feedbackLoaded) {
                    this.loadFeedback();
                    this.feedbackLoaded = true;
                }
                break;
        }
    }
    
    async loadDashboard() {
        try {
            // Show loading indicator
            const dashboardEl = document.getElementById('dashboard');
            if (dashboardEl) {
                dashboardEl.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
            }
            
            // Use Promise.all to load data concurrently for better performance
            const [users, stats] = await Promise.all([
                this.userModel.getAllUsers(),
                this.mongoDB.find('stats', {})
            ]);
            
            if (!users || users.length === 0) {
                return;
            }
            
            // Calculate dashboard statistics
            const totalUsers = users.length;
            const activeUsers = users.filter(user => user.lastLogin && 
                new Date(user.lastLogin) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
            const premiumUsers = users.filter(user => user.plan && user.plan !== 'free').length;
            
            // Generate HTML using document fragment for better performance
            const fragment = document.createDocumentFragment();
            
            // Create stats container
            const statsContainer = document.createElement('div');
            statsContainer.className = 'dashboard-stats';
            
            // Add user stats card
            this.appendStatCard(statsContainer, {
                title: 'Người dùng',
                value: totalUsers,
                label: 'Tổng số người dùng',
                details: [
                    { label: 'Người dùng hoạt động', value: activeUsers },
                    { label: 'Tỷ lệ hoạt động', value: `${Math.round((activeUsers / totalUsers) * 100)}%` }
                ]
            });
            
            // Add subscription stats card
            this.appendStatCard(statsContainer, {
                title: 'Gói dịch vụ',
                value: premiumUsers,
                label: 'Người dùng trả phí',
                details: [
                    { label: 'Tỷ lệ chuyển đổi', value: `${Math.round((premiumUsers / totalUsers) * 100)}%` },
                    { label: 'Doanh thu ước tính', value: this.formatCurrency(this.calculateEstimatedRevenue(users)) }
                ]
            });
            
            // Add usage stats card
            const totalChecks = users.reduce((sum, user) => sum + (user.totalChecks || 0), 0);
            const avgChecksPerUser = totalChecks > 0 ? Math.round(totalChecks / activeUsers) : 0;
            
            this.appendStatCard(statsContainer, {
                title: 'Sử dụng',
                value: totalChecks,
                label: 'Tổng lượt kiểm tra',
                details: [
                    { label: 'Trung bình/người dùng', value: avgChecksPerUser },
                    { label: 'Kiểm tra trong 7 ngày qua', value: this.getRecentChecks(users) }
                ]
            });
            
            fragment.appendChild(statsContainer);
            
            // Create charts container using document fragments
            const chartsContainer = document.createElement('div');
            chartsContainer.className = 'chart-container';
            
            // User growth chart container
            const userGrowthChart = document.createElement('div');
            userGrowthChart.className = 'chart-card';
            userGrowthChart.innerHTML = `
                <h3>Tăng trưởng người dùng</h3>
                <canvas id="userGrowthChart"></canvas>
            `;
            chartsContainer.appendChild(userGrowthChart);
            
            // Plan distribution chart container
            const planDistributionChart = document.createElement('div');
            planDistributionChart.className = 'chart-card';
            planDistributionChart.innerHTML = `
                <h3>Phân bố gói dịch vụ</h3>
                <canvas id="planDistributionChart"></canvas>
            `;
            chartsContainer.appendChild(planDistributionChart);
            
            fragment.appendChild(chartsContainer);
            
            // Big chart for usage over time
            const usageChartContainer = document.createElement('div');
            usageChartContainer.className = 'big-chart-container';
            usageChartContainer.innerHTML = `
                <h3>Lượt kiểm tra theo thời gian</h3>
                <canvas id="usageChart"></canvas>
            `;
            fragment.appendChild(usageChartContainer);
            
            // Clear dashboard and append the new content
            if (dashboardEl) {
                dashboardEl.innerHTML = '';
                dashboardEl.appendChild(fragment);
                
                // Initialize charts after the DOM is updated
                // Use requestAnimationFrame for better performance
                requestAnimationFrame(() => {
                    this.initializeCharts(users, stats);
                });
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            if (document.getElementById('dashboard')) {
                document.getElementById('dashboard').innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>
                    </div>
                `;
            }
        }
    }
    
    // Helper method to append stat cards efficiently
    appendStatCard(container, stat) {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <h3>${stat.title}</h3>
            <div class="stat-content">
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
            <div class="stat-detail">
                ${stat.details.map(detail => `
                    <div class="stat-item">
                        <span class="stat-item-label">${detail.label}</span>
                        <span class="stat-item-value">${detail.value}</span>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(card);
    }
    
    // User management methods
    async loadUsers(page = 1) {
        const users = await this.userModel.getAllUsers();
        this.allUsers = users; // Store for filtering
        this.adminView.renderUsers(users, page);
    }
    
    filterUsers() {
        if (!this.allUsers) return;
        
        const searchTerm = document.getElementById('user-search').value.toLowerCase();
        const planFilter = document.getElementById('plan-filter').value;
        
        let filteredUsers = this.allUsers;
        
        // Apply search term filter
        if (searchTerm) {
            filteredUsers = filteredUsers.filter(user => {
                return (
                    (user.username && user.username.toLowerCase().includes(searchTerm)) ||
                    (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                    (user.id && user.id.toLowerCase().includes(searchTerm))
                );
            });
        }
        
        // Apply plan filter
        if (planFilter) {
            filteredUsers = filteredUsers.filter(user => user.plan === planFilter);
        }
        
        // Render filtered users
        this.adminView.renderUsers(filteredUsers, 1);
    }
    
    handleGetUser(event) {
        const { userId, callback } = event.detail;
        
        if (!userId || !callback) return;
        
        // Find user
        const user = this.allUsers.find(u => u.id === userId);
        
        // Call callback with user data
        callback(user);
    }
    
    async handleUpdateUser(event) {
        const { userId, userData } = event.detail;
        
        if (!userId || !userData) return;
        
        try {
            // Get all users
            const users = await this.userModel.getAllUsers();
            
            // Find user index
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                throw new Error('Không tìm thấy người dùng');
            }
            
            // Update user data
            const updatedUser = {
                ...users[userIndex],
                ...userData,
                updatedAt: new Date().toISOString()
            };
            
            users[userIndex] = updatedUser;
            
            // Save updated users
            this.userModel.saveUsers(users);
            
            // Reload users list
            this.loadUsers();
            
            // Show success notification
            if (window.mainView) {
                window.mainView.showNotification('Cập nhật thông tin người dùng thành công', 'success');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            
            if (window.mainView) {
                window.mainView.showNotification('Lỗi khi cập nhật thông tin người dùng: ' + error.message, 'error');
            }
        }
    }
    
    async handleDeleteUser(event) {
        const { userId } = event.detail;
        
        if (!userId) return;
        
        try {
            // Get all users
            const users = await this.userModel.getAllUsers();
            
            // Remove user
            const updatedUsers = users.filter(u => u.id !== userId);
            
            // Save updated users
            this.userModel.saveUsers(updatedUsers);
            
            // Reload users list
            this.loadUsers();
            
            // Show success notification
            if (window.mainView) {
                window.mainView.showNotification('Xóa người dùng thành công', 'success');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            
            if (window.mainView) {
                window.mainView.showNotification('Lỗi khi xóa người dùng: ' + error.message, 'error');
            }
        }
    }
    
    // Feedback management methods
    loadFeedback() {
        // In a real app, this would load from MongoDB or similar
        this.allFeedback = this.mockData.feedback;
        this.adminView.renderFeedback(this.allFeedback);
    }
    
    filterFeedback() {
        if (!this.allFeedback) return;
        
        const searchTerm = document.getElementById('feedback-search').value.toLowerCase();
        const statusFilter = document.getElementById('feedback-filter').value;
        
        let filteredFeedback = this.allFeedback;
        
        // Apply search term filter
        if (searchTerm) {
            filteredFeedback = filteredFeedback.filter(feedback => {
                return (
                    (feedback.name && feedback.name.toLowerCase().includes(searchTerm)) ||
                    (feedback.email && feedback.email.toLowerCase().includes(searchTerm)) ||
                    (feedback.subject && feedback.subject.toLowerCase().includes(searchTerm)) ||
                    (feedback.message && feedback.message.toLowerCase().includes(searchTerm))
                );
            });
        }
        
        // Apply status filter
        if (statusFilter) {
            filteredFeedback = filteredFeedback.filter(feedback => feedback.status === statusFilter);
        }
        
        // Render filtered feedback
        this.adminView.renderFeedback(filteredFeedback);
    }
    
    handleGetFeedback(event) {
        const { feedbackId, callback } = event.detail;
        
        if (!feedbackId || !callback) return;
        
        // Find feedback
        const feedback = this.allFeedback.find(f => f.id === feedbackId);
        
        // Call callback with feedback data
        callback(feedback);
    }
    
    handleMarkFeedbackRead(event) {
        const { feedbackId } = event.detail;
        
        if (!feedbackId) return;
        
        // Find feedback
        const feedbackIndex = this.allFeedback.findIndex(f => f.id === feedbackId);
        
        if (feedbackIndex !== -1) {
            // Update status
            this.allFeedback[feedbackIndex].status = 'read';
            
            // Reload feedback list
            this.adminView.renderFeedback(this.allFeedback);
            
            // Show success notification
            if (window.mainView) {
                window.mainView.showNotification('Đánh dấu phản hồi đã đọc thành công', 'success');
            }
        }
    }
    
    handleReplyFeedback(event) {
        const { feedbackId, reply } = event.detail;
        
        if (!feedbackId || !reply) return;
        
        // Find feedback
        const feedbackIndex = this.allFeedback.findIndex(f => f.id === feedbackId);
        
        if (feedbackIndex !== -1) {
            // Update status and reply
            this.allFeedback[feedbackIndex].status = 'replied';
            this.allFeedback[feedbackIndex].reply = reply;
            this.allFeedback[feedbackIndex].replyDate = new Date().toISOString();
            
            // Reload feedback list
            this.adminView.renderFeedback(this.allFeedback);
            
            // Show success notification
            if (window.mainView) {
                window.mainView.showNotification('Gửi trả lời phản hồi thành công', 'success');
            }
        }
    }
    
    // Revenue management methods
    loadRevenueData(fromDate = null, toDate = null) {
        // In a real app, this would filter by date range
        const transactions = this.mockData.transactions;
        
        // Hiển thị thông tin tài khoản thanh toán
        this.displayPaymentAccountInfo();
        
        // Calculate revenue stats
        let totalRevenue = 0;
        let basicRevenue = 0;
        let premiumRevenue = 0;
        
        transactions.forEach(tx => {
            // Check date range if provided
            if (fromDate && toDate) {
                const txDate = new Date(tx.date);
                const fromDateTime = new Date(fromDate).getTime();
                const toDateTime = new Date(toDate).getTime();
                
                if (txDate.getTime() < fromDateTime || txDate.getTime() > toDateTime) {
                    return; // Skip this transaction
                }
            }
            
            totalRevenue += tx.amount;
            
            if (tx.plan === 'basic') {
                basicRevenue += tx.amount;
            } else if (tx.plan === 'premium') {
                premiumRevenue += tx.amount;
            }
        });
        
        // Update revenue stats
        this.adminView.renderRevenueStats({
            total: totalRevenue,
            basic: basicRevenue,
            premium: premiumRevenue
        });
        
        // Update transactions table
        this.adminView.renderTransactions(transactions);
        
        // Update chart
        this.updateRevenueChart('daily');
    }
    
    updateRevenueChart(chartType) {
        // This would update the chart based on the selected type
        // For demo purposes, we would just log this action
        console.log(`Updating revenue chart to ${chartType} view`);
    }
    
    displayPaymentAccountInfo() {
        // Kiểm tra nếu đã có phần hiển thị thông tin thanh toán
        let paymentInfoContainer = document.getElementById('admin-payment-info');
        
        if (!paymentInfoContainer) {
            // Tạo phần hiển thị mới nếu chưa có
            const revenueManagement = document.getElementById('revenue-management');
            
            if (revenueManagement) {
                // Tạo HTML cho thông tin thanh toán
                const paymentInfoHTML = `
                    <div id="admin-payment-info" class="payment-info-container">
                        <h3>Thông tin tài khoản thanh toán</h3>
                        <div class="bank-info">
                            <p><strong>Ngân hàng:</strong> ${this.paymentInfo.bank}</p>
                            <p><strong>Số tài khoản:</strong> ${this.paymentInfo.accountNumber}</p>
                            <p><strong>Chủ tài khoản:</strong> ${this.paymentInfo.accountName}</p>
                            <p><strong>Định dạng nội dung chuyển khoản:</strong></p>
                            <div class="reference-formats">
                                <p><span class="badge badge-basic">Gói Cơ bản:</span> <code>${this.paymentInfo.referenceFormat.basic}</code></p>
                                <p><span class="badge badge-premium">Gói Premium:</span> <code>${this.paymentInfo.referenceFormat.premium}</code></p>
                                <p><span class="badge badge-business">Gói Doanh nghiệp:</span> <code>${this.paymentInfo.referenceFormat.business}</code></p>
                            </div>
                            <div class="payment-note">
                                <i class="fas fa-info-circle"></i>
                                <p><strong>Lưu ý:</strong> {userId} sẽ được thay thế bằng mã số người dùng khi hiển thị cho khách hàng. Ví dụ: B001, P002, v.v.</p>
                            </div>
                        </div>
                    </div>
                `;
                
                // Chèn vào phần đầu của quản lý doanh thu
                const revenueFilters = revenueManagement.querySelector('.revenue-filters');
                if (revenueFilters) {
                    revenueFilters.insertAdjacentHTML('afterend', paymentInfoHTML);
                } else {
                    revenueManagement.querySelector('h2').insertAdjacentHTML('afterend', paymentInfoHTML);
                }
            }
        }
    }
    
    // Chart initialization
    initializeCharts(users, stats) {
        // Only attempt to initialize charts if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        // Destroy previous chart instances to prevent memory leaks
        for (const chartId in this.charts) {
            if (this.charts[chartId]) {
                this.charts[chartId].destroy();
            }
        }
        
        // Process user data for charts
        const usersByMonth = this.getUsersByMonth(users);
        const planDistribution = this.getPlanDistribution(users);
        
        // Prepare charts in separate methods to improve readability
        this.createUserGrowthChart(usersByMonth);
        this.createPlanDistributionChart(planDistribution);
        this.createUsageChart(users, stats);
    }
}

// Initialize the AdminController when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof UserModel !== 'undefined' && typeof MongoDB !== 'undefined') {
        const userModel = new UserModel();
        const mongoDB = new MongoDB(CONFIG.apiKey, CONFIG.privateKey, CONFIG.dbConnectionString);
        window.adminController = new AdminController(userModel, mongoDB);
    }
});
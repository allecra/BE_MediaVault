class SubscriptionController {
    constructor(userModel) {
        this.userModel = userModel;
        this.paymentView = window.paymentView;
        
        // Thông tin thanh toán
        this.paymentInfo = {
            bank: 'MB Bank',
            accountNumber: '039175309',
            accountName: 'MEDIAVAULT CO., LTD',
            referenceFormat: {
                free: 'F{userId}',
                basic: 'B{userId}',
                premium: 'P{userId}',
                business: 'BZ{userId}'
            }
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', async () => {
            // Thêm event listener cho nút chọn gói
            const selectPlanButtons = document.querySelectorAll('.select-plan-btn');
            selectPlanButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const planId = e.target.dataset.plan;
                    this.handleSelectPlan(planId);
                });
            });
            
            // Listen for form submission
            const paymentForm = document.getElementById('payment-form');
            if (paymentForm) {
                paymentForm.addEventListener('submit', this.handlePaymentSubmit.bind(this));
            }
            
            // Hiển thị gói dịch vụ hiện tại của người dùng
            await this.updateCurrentPlanDisplay();
        });
    }
    
    async handleSelectPlan(planId) {
        try {
            // Kiểm tra người dùng đã đăng nhập chưa
            const currentUser = await this.userModel.getCurrentUser();
            
            if (!currentUser) {
                // Hiển thị form đăng nhập nếu chưa đăng nhập
                if (window.authView) {
                    window.authView.showModal('login-modal');
                    
                    // Lưu planId để sau khi đăng nhập sẽ mở lại form thanh toán
                    sessionStorage.setItem('pendingPlanId', planId);
                }
                return;
            }
            
            // Tạo mã giao dịch dựa trên planId và userId
            const paymentRef = this.generatePaymentReference(planId, currentUser.id);
            
            // Lấy thông tin gói dịch vụ
            const plan = this.getPlanDetails(planId);
            
            if (!plan) {
                if (window.mainView) {
                    window.mainView.showNotification('Gói dịch vụ không hợp lệ', 'error');
                }
                return;
            }
            
            // Hiển thị form thanh toán
            if (window.paymentView) {
                window.paymentView.handlePlanSelection(planId);
                
                // Cập nhật mã giao dịch trong form
                const paymentRefElement = document.getElementById('payment-ref');
                if (paymentRefElement) {
                    paymentRefElement.textContent = paymentRef;
                }
            }
        } catch (error) {
            console.error('Error selecting plan:', error);
            if (window.mainView) {
                window.mainView.showNotification('Có lỗi xảy ra: ' + error.message, 'error');
            }
        }
    }
    
    async handlePaymentSubmit(event) {
        event.preventDefault();
        
        try {
            const form = event.target;
            const planId = form.querySelector('#selected-plan').value;
            const paymentMethod = form.querySelector('#payment-method').value;
            
            // Lấy thông tin người dùng hiện tại
            const currentUser = await this.userModel.getCurrentUser();
            if (!currentUser) {
                throw new Error('Bạn cần đăng nhập để thanh toán');
            }
            
            // Bỏ qua việc xử lý thanh toán thực tế - trong môi trường thực tế
            // sẽ tích hợp với cổng thanh toán hoặc xác minh giao dịch
            
            // Ghi nhận giao dịch giả định
            const transaction = {
                id: 'txn_' + Date.now(),
                userId: currentUser.id,
                planId: planId,
                amount: this.getPlanDetails(planId).price,
                paymentMethod: paymentMethod,
                status: 'pending',
                paymentRef: this.generatePaymentReference(planId, currentUser.id),
                createdAt: new Date().toISOString()
            };
            
            // Cập nhật gói dịch vụ của người dùng
            await this.userModel.updateSubscription(planId);
            
            // Đóng modal thanh toán
            if (window.paymentView) {
                window.paymentView.closeModal('payment-modal');
            }
            
            // Hiển thị thông báo thành công
            if (window.mainView) {
                window.mainView.showNotification('Nâng cấp gói dịch vụ thành công!', 'success');
            }
            
            // Cập nhật giao diện hiển thị gói dịch vụ
            this.updateCurrentPlanDisplay();
            
        } catch (error) {
            console.error('Error processing payment:', error);
            if (window.mainView) {
                window.mainView.showNotification('Lỗi thanh toán: ' + error.message, 'error');
            }
        }
    }
    
    async updateCurrentPlanDisplay() {
        try {
            const currentUser = await this.userModel.getCurrentUser();
            
            // Hiển thị/ẩn phần dành cho khách và người dùng đã đăng nhập
            const guestElements = document.querySelectorAll('.guest-only');
            const userElements = document.querySelectorAll('.user-only');
            
            if (currentUser) {
                // Người dùng đã đăng nhập
                guestElements.forEach(el => el.style.display = 'none');
                userElements.forEach(el => el.style.display = 'block');
                
                // Cập nhật thông tin gói dịch vụ hiện tại
                const planNameEl = document.getElementById('current-plan-name');
                const checksRemainingEl = document.getElementById('checks-remaining');
                const planFeaturesEl = document.getElementById('plan-features');
                
                if (planNameEl) {
                    const planDetails = this.getPlanDetails(currentUser.plan || 'free');
                    planNameEl.textContent = planDetails.name;
                }
                
                if (checksRemainingEl) {
                    checksRemainingEl.textContent = currentUser.checksRemaining || 0;
                }
                
                if (planFeaturesEl) {
                    const planDetails = this.getPlanDetails(currentUser.plan || 'free');
                    planFeaturesEl.textContent = planDetails.features.join(', ');
                }
                
                // Cập nhật nút "Gói hiện tại" cho gói hiện tại
                document.querySelectorAll('.plan-card').forEach(card => {
                    const cardPlanId = card.id.replace('-plan', '');
                    const selectButton = card.querySelector('.select-plan-btn');
                    const currentPlanButton = card.querySelector('#current-plan');
                    
                    if (cardPlanId === (currentUser.plan || 'free')) {
                        // Đây là gói hiện tại
                        if (selectButton) selectButton.style.display = 'none';
                        if (currentPlanButton) currentPlanButton.style.display = 'block';
                    } else {
                        // Không phải gói hiện tại
                        if (selectButton) selectButton.style.display = 'block';
                        if (currentPlanButton) currentPlanButton.style.display = 'none';
                    }
                });
            } else {
                // Khách chưa đăng nhập
                guestElements.forEach(el => el.style.display = 'block');
                userElements.forEach(el => el.style.display = 'none');
            }
        } catch (error) {
            console.error('Error updating current plan display:', error);
        }
    }
    
    generatePaymentReference(planId, userId) {
        // Xử lý userId để tạo mã ngắn gọn
        const shortUserId = userId.replace(/\D/g, '').slice(-3).padStart(3, '0');
        
        // Lấy định dạng mã giao dịch theo gói
        const format = this.paymentInfo.referenceFormat[planId] || 'U{userId}';
        
        // Thay thế userId vào định dạng
        return format.replace('{userId}', shortUserId);
    }
    
    getPlanDetails(planId) {
        const plans = {
            'free': {
                id: 'free',
                name: 'Gói Miễn phí',
                price: 0,
                features: ['10 lượt kiểm tra mỗi tháng', 'Kiểm tra văn bản', 'Lưu lịch sử 7 ngày']
            },
            'basic': {
                id: 'basic',
                name: 'Gói Cơ bản',
                price: 99000,
                features: ['50 lượt kiểm tra mỗi tháng', 'Kiểm tra văn bản', 'Kiểm tra tệp', 'Lưu lịch sử 30 ngày']
            },
            'premium': {
                id: 'premium',
                name: 'Gói Cao cấp',
                price: 199000,
                features: ['200 lượt kiểm tra mỗi tháng', 'Tất cả tính năng kiểm tra', 'Kiểm tra hình ảnh & video', 'Lưu lịch sử không giới hạn', 'Hỗ trợ qua email']
            },
            'business': {
                id: 'business',
                name: 'Gói Doanh nghiệp',
                price: 499000,
                features: ['1000 lượt kiểm tra mỗi tháng', 'Tất cả tính năng premium', 'API truy cập', 'Hỗ trợ ưu tiên 24/7', 'Báo cáo chi tiết']
            }
        };
        
        return plans[planId] || plans['free'];
    }

    /**
     * Xử lý nâng cấp gói dịch vụ
     * @param {Event} event - Sự kiện click
     */
    async handleUpgrade(event) {
        event.preventDefault();
        
        const planId = event.target.dataset.plan;
        if (!planId) {
            console.error('No plan ID specified');
            this.showNotification('Không tìm thấy thông tin gói dịch vụ. Vui lòng thử lại sau.', 'error');
            return;
        }
        
        try {
            console.log(`Upgrading to plan: ${planId}`);
            
            // Kiểm tra trạng thái đăng nhập
            const user = await this.userModel.getCurrentUser();
            if (!user) {
                console.log('User not logged in, showing login form');
                this.showNotification('Vui lòng đăng nhập để nâng cấp gói dịch vụ.', 'info');
                return;
            }
            
            // Hiển thị modal xác nhận
            const modalContent = `
                <h3>Xác nhận nâng cấp gói dịch vụ</h3>
                <p>Bạn đang chọn nâng cấp lên gói <strong>${this.getPlanName(planId)}</strong>.</p>
                <p>Giá: <strong>${this.getPlanPrice(planId)}</strong></p>
                <p>Xác nhận để tiếp tục thanh toán.</p>
            `;
            
            // Hiển thị xác nhận
            this.showConfirmation(modalContent, async () => {
                try {
                    this.showNotification('Đang xử lý...', 'info');
                    
                    // Cập nhật gói dịch vụ trong cơ sở dữ liệu
                    console.log('Updating subscription in database...');
                    const updatedUser = await this.userModel.updateSubscription(planId);
                    
                    if (updatedUser) {
                        console.log('Subscription updated successfully');
                        
                        // Hiển thị thông báo thành công
                        this.showNotification(`Đã nâng cấp thành công lên gói ${this.getPlanName(planId)}!`, 'success');
                        
                        // Cập nhật UI hiển thị thông tin gói dịch vụ
                        this.updateSubscriptionDisplay(updatedUser);
                        
                        // Chuyển hướng đến trang thanh toán nếu cần
                        if (planId !== 'free') {
                            setTimeout(() => {
                                window.location.href = `payment.html?plan=${planId}`;
                            }, 1500);
                        }
                    } else {
                        throw new Error('Failed to update subscription');
                    }
                } catch (error) {
                    console.error('Error during upgrade process:', error);
                    this.showNotification(`Lỗi khi nâng cấp: ${error.message}`, 'error');
                }
            });
            
        } catch (error) {
            console.error('Error handling upgrade:', error);
            this.showNotification(`Lỗi: ${error.message}`, 'error');
        }
    }
    
    /**
     * Lấy tên gói dịch vụ
     * @param {string} planId - ID của gói
     * @returns {string} - Tên gói dịch vụ
     */
    getPlanName(planId) {
        switch (planId) {
            case 'basic': return 'Cơ bản';
            case 'premium': return 'Cao cấp';
            case 'business': return 'Doanh nghiệp';
            default: return 'Miễn phí';
        }
    }
    
    /**
     * Lấy giá gói dịch vụ
     * @param {string} planId - ID của gói
     * @returns {string} - Giá gói dịch vụ
     */
    getPlanPrice(planId) {
        switch (planId) {
            case 'basic': return '50.000 VNĐ/tháng';
            case 'premium': return '150.000 VNĐ/tháng';
            case 'business': return '500.000 VNĐ/tháng';
            default: return 'Miễn phí';
        }
    }
    
    /**
     * Cập nhật hiển thị thông tin gói dịch vụ
     * @param {Object} user - Thông tin người dùng
     */
    updateSubscriptionDisplay(user) {
        const currentPlanElement = document.getElementById('current-plan');
        if (currentPlanElement) {
            currentPlanElement.textContent = this.getPlanName(user.plan || 'free');
        }
        
        const checksRemainingElement = document.getElementById('checks-remaining');
        if (checksRemainingElement && user.checksRemaining !== undefined) {
            checksRemainingElement.textContent = user.checksRemaining;
        }
    }

    /**
     * Khởi tạo trang gói dịch vụ
     */
    async initializePage() {
        try {
            console.log('Initializing subscription page...');
            
            // Đảm bảo kết nối MongoDB
            if (!window.mongoDB) {
                try {
                    console.log('Connecting to MongoDB...');
                    const connected = await this.userModel.connect();
                    console.log('MongoDB connection result:', connected);
                } catch (error) {
                    console.error('Failed to connect to MongoDB:', error);
                }
            }
            
            // Kiểm tra đăng nhập và hiển thị thông tin người dùng
            const currentUser = await this.userModel.getCurrentUser();
            
            if (currentUser) {
                console.log('User logged in:', currentUser.email);
                this.showUserUI();
                this.updateUserDisplay(currentUser);
                
                // Đánh dấu gói hiện tại
                this.highlightCurrentPlan(currentUser.plan || 'free');
            } else {
                console.log('No user logged in');
                this.showGuestUI();
            }
        } catch (error) {
            console.error('Error initializing subscription page:', error);
            this.showGuestUI();
        }
    }
    
    /**
     * Cập nhật hiển thị thông tin người dùng
     * @param {Object} user - Thông tin người dùng
     */
    updateUserDisplay(user) {
        if (!user) return;
        
        console.log('Updating user display for:', user.email);
        
        // Cập nhật tên người dùng
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = user.username || user.email;
        }
        
        // Cập nhật thông tin gói dịch vụ
        const currentPlanName = document.getElementById('current-plan-name');
        if (currentPlanName) {
            currentPlanName.textContent = this.getPlanName(user.plan || 'free');
        }
        
        // Cập nhật số lượt kiểm tra còn lại
        const checksRemaining = document.getElementById('checks-remaining');
        if (checksRemaining) {
            checksRemaining.textContent = user.checksRemaining || 0;
        }
        
        // Cập nhật tính năng
        const planFeatures = document.getElementById('plan-features');
        if (planFeatures) {
            switch (user.plan) {
                case 'basic':
                    planFeatures.textContent = 'Kiểm tra văn bản, tệp tin, lưu trữ 5GB';
                    break;
                case 'premium':
                    planFeatures.textContent = 'Tất cả tính năng, kiểm tra hình ảnh & video, lưu trữ 50GB';
                    break;
                case 'business':
                    planFeatures.textContent = 'Tất cả tính năng cao cấp, API, hỗ trợ 24/7, lưu trữ 200GB';
                    break;
                default:
                    planFeatures.textContent = 'Kiểm tra văn bản cơ bản, lưu trữ 1GB';
            }
        }
    }
    
    /**
     * Đánh dấu gói dịch vụ hiện tại
     * @param {string} planId - ID của gói dịch vụ
     */
    highlightCurrentPlan(planId) {
        console.log(`Highlighting current plan: ${planId}`);
        
        // Đặt lại tất cả các nút và hiển thị
        document.querySelectorAll('.plan-card').forEach(card => {
            const cardPlanId = card.id.replace('-plan', '');
            const selectBtn = card.querySelector('.select-plan-btn');
            const currentBtn = card.querySelector('#current-plan');
            
            if (cardPlanId === planId) {
                // Đây là gói hiện tại
                if (selectBtn) selectBtn.style.display = 'none';
                if (currentBtn) currentBtn.style.display = 'inline-block';
                card.classList.add('current-plan');
            } else {
                // Không phải gói hiện tại
                if (selectBtn) selectBtn.style.display = 'inline-block';
                if (currentBtn) currentBtn.style.display = 'none';
                card.classList.remove('current-plan');
            }
        });
    }
    
    /**
     * Hiển thị UI cho người dùng đã đăng nhập
     */
    showUserUI() {
        // Hiển thị các phần tử dành cho người dùng đã đăng nhập
        document.querySelectorAll('.user-only').forEach(el => {
            el.style.display = 'block';
        });
        
        // Ẩn các phần tử dành cho khách
        document.querySelectorAll('.guest-only').forEach(el => {
            el.style.display = 'none';
        });
    }
    
    /**
     * Hiển thị UI cho khách
     */
    showGuestUI() {
        // Hiển thị các phần tử dành cho khách
        document.querySelectorAll('.guest-only').forEach(el => {
            el.style.display = 'block';
        });
        
        // Ẩn các phần tử dành cho người dùng đã đăng nhập
        document.querySelectorAll('.user-only').forEach(el => {
            el.style.display = 'none';
        });
    }
    
    /**
     * Hiển thị thông báo xác nhận
     * @param {string} content - Nội dung xác nhận
     * @param {Function} onConfirm - Hàm xử lý khi xác nhận
     */
    showConfirmation(content, onConfirm) {
        // Tạo modal xác nhận nếu chưa tồn tại
        let confirmModal = document.getElementById('confirm-modal');
        
        if (!confirmModal) {
            confirmModal = document.createElement('div');
            confirmModal.id = 'confirm-modal';
            confirmModal.className = 'modal';
            
            confirmModal.innerHTML = `
                <div class="modal-content">
                    <span class="close-btn" id="confirm-close"><i class="fas fa-times"></i></span>
                    <div id="confirm-content"></div>
                    <div class="modal-actions">
                        <button id="confirm-cancel" class="btn btn-outline">Hủy</button>
                        <button id="confirm-ok" class="btn btn-primary">Xác nhận</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(confirmModal);
        }
        
        // Đặt nội dung
        const contentDiv = document.getElementById('confirm-content');
        contentDiv.innerHTML = content;
        
        // Hiển thị modal
        confirmModal.style.display = 'flex';
        
        // Xử lý sự kiện
        const closeBtn = document.getElementById('confirm-close');
        const cancelBtn = document.getElementById('confirm-cancel');
        const okBtn = document.getElementById('confirm-ok');
        
        const closeModal = () => {
            confirmModal.style.display = 'none';
        };
        
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;
        
        // Xử lý sự kiện xác nhận
        okBtn.onclick = () => {
            closeModal();
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        };
        
        // Đóng modal khi nhấp ngoài nội dung
        window.onclick = (event) => {
            if (event.target === confirmModal) {
                closeModal();
            }
        };
    }
    
    /**
     * Hiển thị thông báo
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại thông báo (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        // Tạo container nếu chưa tồn tại
        let notificationsContainer = document.querySelector('.notifications');
        
        if (!notificationsContainer) {
            notificationsContainer = document.createElement('div');
            notificationsContainer.className = 'notifications';
            document.body.appendChild(notificationsContainer);
        }
        
        // Tạo thông báo
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Chọn biểu tượng phù hợp
        let icon = 'info-circle';
        switch (type) {
            case 'success': icon = 'check-circle'; break;
            case 'error': icon = 'times-circle'; break;
            case 'warning': icon = 'exclamation-triangle'; break;
        }
        
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
            <button class="close-btn"><i class="fas fa-times"></i></button>
        `;
        
        // Thêm vào container
        notificationsContainer.appendChild(notification);
        
        // Xử lý nút đóng
        const closeBtn = notification.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notificationsContainer.removeChild(notification);
            }, 300);
        });
        
        // Tự động đóng sau 5 giây
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notificationsContainer.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
}

// Initialize controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const userModel = new UserModel();
    window.subscriptionController = new SubscriptionController(userModel);
}); 
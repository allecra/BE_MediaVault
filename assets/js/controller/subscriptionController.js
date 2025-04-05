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
}

// Initialize controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const userModel = new UserModel();
    window.subscriptionController = new SubscriptionController(userModel);
}); 
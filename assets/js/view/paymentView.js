class PaymentView {
    constructor() {
        // Cấu hình thanh toán
        this.paymentConfig = {
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
        
        // Store DOM references
        this.domElements = {};
        
        // Initialize event handler bindings
        this.boundHandlers = {
            handlePaymentMethodChange: this.handlePaymentMethodChange.bind(this),
            handlePaymentSubmit: this.handlePaymentSubmit.bind(this)
        };
        
        // Initialize
        this.initializeElements();
        this.initializeEvents();
    }
    
    initializeElements() {
        // This method will be called when the DOM is fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            // Cache DOM elements for better performance
            this.domElements = {
                paymentModal: document.getElementById('payment-modal'),
                selectedPlanInput: document.getElementById('selected-plan'),
                selectedPlanName: document.getElementById('selected-plan-name'),
                paymentAmount: document.getElementById('payment-amount'),
                paymentMethod: document.getElementById('payment-method'),
                paymentRef: document.getElementById('payment-ref'),
                paymentForm: document.getElementById('payment-form'),
                bankDetails: document.getElementById('bank-details'),
                cardDetails: document.getElementById('card-details'),
                ewalletDetails: document.getElementById('ewallet-details')
            };
            
            // Set up event listeners for payment method changes
            if (this.domElements.paymentMethod) {
                this.domElements.paymentMethod.addEventListener('change', this.boundHandlers.handlePaymentMethodChange);
            }
            
            // Set up payment form submission with debounce to prevent double submissions
            if (this.domElements.paymentForm) {
                // Use performance utils if available, otherwise create inline debounce
                const debounce = window.PerformanceUtils ? 
                    window.PerformanceUtils.debounce : 
                    (fn, delay) => {
                        let timeout;
                        return function(...args) {
                            clearTimeout(timeout);
                            timeout = setTimeout(() => fn.apply(this, args), delay);
                        };
                    };
                
                // Use debounced handler to prevent multiple submissions
                const debouncedSubmit = debounce(this.boundHandlers.handlePaymentSubmit, 500);
                this.domElements.paymentForm.addEventListener('submit', debouncedSubmit);
            }
        });
    }
    
    initializeEvents() {
        // Listen for plan selection
        document.addEventListener('DOMContentLoaded', () => {
            const selectPlanButtons = document.querySelectorAll('.select-plan-btn');
            if (selectPlanButtons && selectPlanButtons.length > 0) {
                selectPlanButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        const planId = e.target.getAttribute('data-plan');
                        this.handlePlanSelection(planId);
                    });
                });
            }
            
            // Listen for payment success to update UI
            document.addEventListener('payment:success', (e) => {
                this.updateUIAfterPayment(e.detail);
            });
        });
    }
    
    handlePlanSelection(planId) {
        // Get plan details
        const plan = this.getPlanDetails(planId);
        
        if (!plan) {
            mainView.showNotification('Gói dịch vụ không hợp lệ', 'error');
            return;
        }
        
        // Use requestAnimationFrame for UI updates to optimize performance
        requestAnimationFrame(() => {
            // Update selected plan and open payment modal
            this.updateSelectedPlan(plan);
            this.showModal('payment-modal');
            
            // Set default payment method
            if (this.domElements.paymentMethod) {
                this.domElements.paymentMethod.value = 'bank';
                this.handlePaymentMethodChange();
            }
        });
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
        
        return plans[planId];
    }
    
    handlePaymentMethodChange() {
        if (!this.domElements.paymentMethod) return;
        
        const method = this.domElements.paymentMethod.value;
        
        // Use requestAnimationFrame for DOM updates to optimize performance
        requestAnimationFrame(() => {
            // Hide all payment detail sections
            if (this.domElements.bankDetails) this.domElements.bankDetails.style.display = 'none';
            if (this.domElements.cardDetails) this.domElements.cardDetails.style.display = 'none';
            if (this.domElements.ewalletDetails) this.domElements.ewalletDetails.style.display = 'none';
            
            // Show the selected payment method details
            if (method === 'bank' && this.domElements.bankDetails) {
                this.domElements.bankDetails.style.display = 'block';
            } else if (method === 'card' && this.domElements.cardDetails) {
                this.domElements.cardDetails.style.display = 'block';
            } else if (this.domElements.ewalletDetails) {
                // For momo, vnpay, etc.
                this.domElements.ewalletDetails.style.display = 'block';
                
                // Generate QR code (in a real app, you would create an actual QR code)
                this.updateQRCode(method);
            }
        });
    }
    
    updateQRCode(method) {
        const qrImage = document.getElementById('payment-qr');
        if (qrImage) {
            // In a real application, you would generate a real QR code
            // For now, we just change the placeholder based on the method
            qrImage.src = `assets/img/${method}-qr-placeholder.png`;
            
            // If the image doesn't exist, use a fallback
            qrImage.onerror = function() {
                this.src = 'assets/img/qr-placeholder.png';
            };
        }
    }
    
    async handlePaymentSubmit(event) {
        event.preventDefault();
        
        // Get submit button
        const submitButton = this.domElements.paymentForm.querySelector('button[type="submit"]');
        
        try {
            const planId = this.domElements.selectedPlanInput.value;
            const paymentMethod = this.domElements.paymentMethod.value;
            
            // Get card details if card payment
            let cardDetails = {};
            if (paymentMethod === 'card') {
                cardDetails = {
                    cardNumber: document.getElementById('card-number').value,
                    expiry: document.getElementById('card-expiry').value,
                    cvc: document.getElementById('card-cvc').value
                };
                
                // Validate card details
                if (!this.validateCardDetails(cardDetails)) {
                    throw new Error('Thông tin thẻ không hợp lệ');
                }
            }
            
            // Use the withLoading helper if available
            const processPayment = () => {
                return new Promise((resolve) => {
                    // Simulate successful payment after delay
                    setTimeout(() => {
                        const result = {
                            success: true,
                            planId: planId,
                            transactionId: `txn_${Date.now()}`,
                            paymentMethod: paymentMethod,
                            amount: this.getPlanDetails(planId).price,
                            date: new Date().toISOString()
                        };
                        resolve(result);
                    }, 1000);
                });
            };
            
            let result;
            
            if (window.PerformanceUtils) {
                // Use the performance utility if available
                result = await window.PerformanceUtils.withLoading(
                    submitButton, 
                    processPayment(), 
                    'Đang xử lý...'
                );
            } else {
                // Fallback to manual handling
                const originalText = submitButton.textContent;
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
                
                result = await processPayment();
                
                // Restore button state
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
            
            // Process successful payment
            mainView.showNotification('Thanh toán thành công! Gói dịch vụ của bạn đã được nâng cấp.', 'success');
            this.closeModal('payment-modal');
            
            // Show receipt modal
            this.showReceiptModal(result);
            
            // Trigger an event to update UI
            const event = new CustomEvent('payment:success', { detail: result });
            document.dispatchEvent(event);
            
        } catch (error) {
            mainView.showNotification(`Lỗi thanh toán: ${error.message}`, 'error');
            
            // Restore button state if not using PerformanceUtils
            if (!window.PerformanceUtils) {
                submitButton.disabled = false;
                submitButton.textContent = 'Xác nhận thanh toán';
            }
        }
    }
    
    validateCardDetails(details) {
        // Simple validation
        if (!details.cardNumber || !details.expiry || !details.cvc) {
            return false;
        }
        
        // Card number should be 16 digits (simplified validation)
        if (details.cardNumber.replace(/\s/g, '').length !== 16) {
            return false;
        }
        
        // CVC should be 3 or 4 digits
        if (!/^\d{3,4}$/.test(details.cvc)) {
            return false;
        }
        
        // Expiry should be in MM/YY format
        if (!/^\d{2}\/\d{2}$/.test(details.expiry)) {
            return false;
        }
        
        return true;
    }
    
    showReceiptModal(paymentData) {
        // Create receipt modal HTML
        const modalId = 'receipt-modal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            
            const plan = this.getPlanDetails(paymentData.planId);
            const date = new Date(paymentData.date);
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-btn" onclick="paymentView.closeModal('${modalId}')"><i class="fas fa-times"></i></span>
                    <div class="receipt-container">
                        <div class="receipt-header">
                            <img src="assets/img/logo.webp" alt="MediaVault Logo" class="receipt-logo">
                            <h3>Hóa đơn thanh toán</h3>
                        </div>
                        <div class="receipt-details">
                            <div class="receipt-item">
                                <span class="receipt-label">Mã giao dịch:</span>
                                <span class="receipt-value">${paymentData.transactionId}</span>
                            </div>
                            <div class="receipt-item">
                                <span class="receipt-label">Ngày thanh toán:</span>
                                <span class="receipt-value">${formattedDate}</span>
                            </div>
                            <div class="receipt-item">
                                <span class="receipt-label">Gói dịch vụ:</span>
                                <span class="receipt-value">${plan.name}</span>
                            </div>
                            <div class="receipt-item">
                                <span class="receipt-label">Phương thức:</span>
                                <span class="receipt-value">${this.getPaymentMethodName(paymentData.paymentMethod)}</span>
                            </div>
                            <div class="receipt-divider"></div>
                            <div class="receipt-total">
                                <span class="receipt-label">Tổng thanh toán:</span>
                                <span class="receipt-amount">${paymentData.amount.toLocaleString('vi-VN')} VNĐ</span>
                            </div>
                        </div>
                        <div class="receipt-footer">
                            <p>Cảm ơn bạn đã sử dụng dịch vụ của MediaVault!</p>
                            <button class="btn btn-primary" onclick="paymentView.downloadReceipt(${JSON.stringify(paymentData).replace(/"/g, '&quot;')})">
                                <i class="fas fa-download"></i> Tải hóa đơn
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
        
        this.showModal(modalId);
    }
    
    downloadReceipt(paymentData) {
        // In a real application, this would generate a PDF receipt
        // For now, we'll just show a notification
        mainView.showNotification('Đang tải xuống hóa đơn...', 'info');
        
        // Simulate download after a short delay
        setTimeout(() => {
            mainView.showNotification('Đã tải xuống hóa đơn thành công!', 'success');
        }, 1500);
    }
    
    updateUIAfterPayment(result) {
        // Update the current plan display
        const planData = this.getPlanDetails(result.planId);
        
        // Hide all "current plan" labels and show only for the selected plan
        document.querySelectorAll('#current-plan').forEach(button => {
            button.style.display = 'none';
        });
        
        // Show "current plan" for the selected plan
        const planElement = document.getElementById(`${result.planId}-plan`);
        if (planElement) {
            const currentPlanButton = planElement.querySelector('#current-plan');
            const selectPlanButton = planElement.querySelector('.select-plan-btn');
            
            if (currentPlanButton) currentPlanButton.style.display = 'inline-block';
            if (selectPlanButton) selectPlanButton.style.display = 'none';
        }
        
        // Update plan info in the subscription info section
        const currentPlanName = document.getElementById('current-plan-name');
        const checksRemaining = document.getElementById('checks-remaining');
        const planFeatures = document.getElementById('plan-features');
        
        if (currentPlanName) currentPlanName.textContent = planData.name;
        
        // Simulate remaining checks based on plan
        const checksLimit = {
            'free': 10,
            'basic': 50,
            'premium': 200,
            'business': 1000
        };
        
        if (checksRemaining) checksRemaining.textContent = checksLimit[result.planId] || 0;
        
        // Display plan features
        if (planFeatures && planData.features) {
            planFeatures.textContent = planData.features.join(', ');
        }
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
    
    updateSelectedPlan(plan) {
        if (!this.domElements.selectedPlanInput || !this.domElements.selectedPlanName || !this.domElements.paymentAmount || !this.domElements.paymentRef) {
            console.error('Payment elements not found');
            return;
        }
        
        // Set selected plan info
        this.domElements.selectedPlanInput.value = plan.id;
        this.domElements.selectedPlanName.textContent = plan.name;
        
        // Format the price
        this.domElements.paymentAmount.textContent = new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(plan.price);
        
        // Generate payment reference
        const userId = '001'; // In a real app, get the current user ID
        const paymentRef = this.generatePaymentReference(plan.id, userId);
        this.domElements.paymentRef.textContent = paymentRef;
    }
    
    generatePaymentReference(planId, userId) {
        // Lấy định dạng mã giao dịch theo gói
        const format = this.paymentConfig.referenceFormat[planId] || 'U{userId}';
        
        // Ví dụ: B001, P002, BZ003 (với 001, 002, 003 là userId được mã hóa)
        const encodedUserId = userId.toString().padStart(3, '0');
        return format.replace('{userId}', encodedUserId);
    }
    
    displayPaymentHistory(payments) {
        const historyContainer = document.getElementById('payment-history');
        if (!historyContainer) return;
        
        if (!payments || payments.length === 0) {
            historyContainer.innerHTML = '<p class="empty-message">Bạn chưa có giao dịch nào.</p>';
            return;
        }
        
        let historyHTML = '<div class="payment-history-list">';
        
        payments.forEach(payment => {
            const date = new Date(payment.date);
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            
            historyHTML += `
                <div class="payment-history-item">
                    <div class="payment-history-details">
                        <p class="payment-plan">${payment.planName}</p>
                        <p class="payment-date">${formattedDate}</p>
                    </div>
                    <div class="payment-amount">${payment.amount.toLocaleString('vi-VN')} VNĐ</div>
                    <div class="payment-method">
                        <span class="payment-method-icon">
                            <i class="fas ${this.getPaymentIcon(payment.paymentMethod)}"></i>
                        </span>
                        <span class="payment-method-name">${this.getPaymentMethodName(payment.paymentMethod)}</span>
                    </div>
                </div>
            `;
        });
        
        historyHTML += '</div>';
        historyContainer.innerHTML = historyHTML;
    }
    
    getPaymentMethodName(method) {
        switch (method) {
            case 'bank': return 'Chuyển khoản ngân hàng';
            case 'momo': return 'Ví MoMo';
            case 'vnpay': return 'VNPay';
            case 'card': return 'Thẻ tín dụng/ghi nợ';
            default: return 'Khác';
        }
    }
    
    getPaymentIcon(method) {
        switch (method) {
            case 'bank': return 'fa-university';
            case 'momo': return 'fa-wallet';
            case 'vnpay': return 'fa-credit-card';
            case 'card': return 'fa-credit-card';
            default: return 'fa-money-bill';
        }
    }
}

// Initialize the payment view
const paymentView = new PaymentView(); 
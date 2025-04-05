class PaymentController {
    constructor(userModel) {
        this.userModel = userModel;
    }
    
    async processPayment(planId, paymentDetails) {
        try {
            if (!this.userModel.isLoggedIn()) {
                throw new Error("Bạn cần đăng nhập để thanh toán");
            }
            
            const plans = this.userModel.getSubscriptionPlans();
            const selectedPlan = plans[planId];
            
            if (!selectedPlan) {
                throw new Error("Gói dịch vụ không tồn tại");
            }
            
            // In a real application, you would integrate with a payment gateway here
            // For this demo, we'll simulate a successful payment
            
            const result = await this.simulatePaymentProcessing(selectedPlan, paymentDetails);
            
            if (result.success) {
                // Update user's plan
                const upgradedPlan = await this.userModel.upgradePlan(planId, paymentDetails);
                return upgradedPlan;
            } else {
                throw new Error(result.message || "Lỗi thanh toán");
            }
        } catch (error) {
            console.error("Payment error:", error);
            mainView.showNotification(`Lỗi thanh toán: ${error.message}`, "error");
            throw error;
        }
    }
    
    async simulatePaymentProcessing(plan, paymentDetails) {
        return new Promise((resolve) => {
            // Simulate network delay
            setTimeout(() => {
                // Simulate 95% success rate
                const isSuccessful = Math.random() < 0.95;
                
                if (isSuccessful) {
                    resolve({
                        success: true,
                        transactionId: paymentDetails.transactionId || `txn_${Date.now()}`,
                        amount: plan.price,
                        currency: "VND",
                        paymentMethod: paymentDetails.method,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    resolve({
                        success: false,
                        message: "Giao dịch không thành công. Vui lòng thử lại sau."
                    });
                }
            }, 1500);
        });
    }
    
    async getPaymentHistory() {
        if (!this.userModel.isLoggedIn()) {
            throw new Error("Bạn cần đăng nhập để xem lịch sử thanh toán");
        }
        
        return await this.userModel.getPaymentHistory();
    }
}

// Initialize the payment controller
const paymentController = new PaymentController(userModel); 
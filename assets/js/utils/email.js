/**
 * Tiện ích gửi email - mô phỏng chức năng gửi email
 * Trong ứng dụng thực tế, bạn sẽ kết nối với dịch vụ email bên thứ ba như:
 * - SendGrid
 * - Mailgun
 * - AWS SES
 * - SMTP/Nodemailer (nếu sử dụng Node.js)
 */

class EmailService {
    constructor() {
        // Khóa API - Trong ứng dụng thực tế, sẽ lưu trong biến môi trường (env)
        this.apiKey = 'mock-api-key-for-demo';
        this.fromEmail = 'no-reply@mediavault.com';
        this.fromName = 'MediaVault Support';
        
        // Cờ để xác định môi trường (dev/prod)
        this.isDevelopment = true;
    }
    
    /**
     * Gửi email OTP đặt lại mật khẩu
     * @param {string} to - Email người nhận
     * @param {string} otp - Mã OTP
     * @returns {Promise<Object>} Kết quả gửi
     */
    async sendPasswordResetOTP(to, otp) {
        const subject = 'Mã xác thực đặt lại mật khẩu MediaVault';
        const body = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://example.com/mediavault-logo.png" alt="MediaVault Logo" style="max-width: 150px;">
                </div>
                <h2 style="color: #333;">Đặt lại mật khẩu</h2>
                <p>Chào bạn,</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại MediaVault. Mã xác thực của bạn là:</p>
                <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 4px;">
                    ${otp}
                </div>
                <p>Mã xác thực này sẽ hết hạn sau 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                <p>Trân trọng,<br>Đội ngũ MediaVault</p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777; text-align: center;">
                    <p>Email này được gửi tự động, vui lòng không trả lời. Nếu bạn cần hỗ trợ, hãy liên hệ với chúng tôi qua <a href="mailto:support@mediavault.com">support@mediavault.com</a></p>
                </div>
            </div>
        `;
        
        return this.sendEmail(to, subject, body);
    }
    
    /**
     * Phương thức gửi email tổng quát
     * @param {string} to - Email người nhận
     * @param {string} subject - Tiêu đề email
     * @param {string} htmlBody - Nội dung HTML
     * @returns {Promise<Object>} Kết quả gửi
     */
    async sendEmail(to, subject, htmlBody) {
        // Trong ứng dụng thực tế, đây là nơi kết nối API gửi email
        
        if (this.isDevelopment) {
            console.log('====== EMAIL SIMULATION ======');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log('Body:', htmlBody);
            console.log('====== END EMAIL ======');
            
            // Mô phỏng độ trễ gửi email
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                success: true,
                messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
                message: 'Email đã được gửi thành công (mô phỏng)'
            };
        }
        
        // Mã xử lý API thực tế sẽ được viết ở đây
        try {
            // Ví dụ với SendGrid:
            // const response = await sendgrid.send({
            //     to,
            //     from: { email: this.fromEmail, name: this.fromName },
            //     subject,
            //     html: htmlBody,
            // });
            
            return {
                success: true,
                messageId: `real-${Date.now()}`,
                message: 'Email đã được gửi thành công'
            };
        } catch (error) {
            console.error('Email sending error:', error);
            return {
                success: false,
                error: error.message,
                message: 'Không thể gửi email. Vui lòng thử lại sau.'
            };
        }
    }
}

// Tạo instance toàn cục để sử dụng trong ứng dụng
const emailService = new EmailService();

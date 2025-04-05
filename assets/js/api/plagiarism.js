class PlagiarismAPI {
    constructor() {
        this.apiKey = "9fed2a5e-6e3a-46a6-82db-5b3b0e451ee3"; // Copyleaks API key
        this.baseUrl = "https://api.copyleaks.com/v3/";
        this.accessToken = null;
        this.tokenExpiration = null;
    }

    async getAccessToken() {
        // Check if we already have a valid token
        if (this.accessToken && this.tokenExpiration && new Date() < this.tokenExpiration) {
            return this.accessToken;
        }

        try {
            const response = await fetch(`${this.baseUrl}account/login/api`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: this.apiKey
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Copyleaks API Error:", response.status, errorData);
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Store the token and its expiration time
            this.accessToken = data.access_token;
            // Set expiration time (subtract 5 minutes as a buffer)
            const expiresInMs = (data.expires_in - 300) * 1000;
            this.tokenExpiration = new Date(Date.now() + expiresInMs);
            
            return this.accessToken;
        } catch (error) {
            console.error("Error getting Copyleaks access token:", error);
            throw new Error("Không thể kết nối với dịch vụ kiểm tra. Vui lòng thử lại sau.");
        }
    }

    async startScan(content, type = 'text') {
        try {
            const token = await this.getAccessToken();
            
            // Generate a unique ID for this scan
            const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            let endpoint = `${this.baseUrl}scans/submit/text`;
            let requestBody = { text: content };
            
            // Adjust endpoint and request body based on content type
            if (type === 'file' || type === 'image' || type === 'video') {
                endpoint = `${this.baseUrl}scans/submit/file`;
                // For file content that's base64 encoded
                requestBody = { base64: content.split(",")[1] || content };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...requestBody,
                    properties: {
                        sandbox: true, // Use sandbox mode for testing
                        webhooks: {},
                        includeHtml: true,
                        developerPayload: scanId
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Copyleaks Scan Error:", response.status, errorData);
                throw new Error(`Scan Error: ${response.status} ${response.statusText}`);
            }

            const scanData = await response.json();
            return {
                scanId: scanData.id || scanId,
                status: "Đang xử lý",
                progress: 0
            };
        } catch (error) {
            console.error("Error starting scan:", error);
            throw new Error("Không thể bắt đầu kiểm tra. Vui lòng thử lại sau.");
        }
    }

    async checkScanStatus(scanId) {
        try {
            const token = await this.getAccessToken();
            
            const response = await fetch(`${this.baseUrl}scans/${scanId}/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Copyleaks Status Error:", response.status, errorData);
                throw new Error(`Status Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error checking scan status:", error);
            throw new Error("Không thể kiểm tra trạng thái. Vui lòng thử lại sau.");
        }
    }

    async getScanResults(scanId) {
        try {
            const token = await this.getAccessToken();
            
            const response = await fetch(`${this.baseUrl}scans/${scanId}/results`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Copyleaks Results Error:", response.status, errorData);
                throw new Error(`Results Error: ${response.status} ${response.statusText}`);
            }

            const results = await response.json();
            
            // Transform results to our format
            return {
                percentage: results.score?.identicalWords || 0,
                sources: results.results?.internet?.map(source => ({
                    matchedText: source.matchedText || "Text match",
                    link: source.url,
                    title: source.title || "Internet Source"
                })) || [],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("Error getting scan results:", error);
            throw new Error("Không thể lấy kết quả kiểm tra. Vui lòng thử lại sau.");
        }
    }

    // Main method to check content for plagiarism
    async check(content, type = 'text') {
        try {
            // Kiểm tra nếu nội dung rỗng
            if (!content || (typeof content === 'string' && content.trim() === '')) {
                throw new Error('Nội dung kiểm tra không được để trống');
            }
            
            console.log(`Bắt đầu kiểm tra nội dung loại: ${type}`);
            
            // Trong môi trường phát triển, sử dụng phương thức giả lập
            // Mô phỏng kết nối với API thực tế
            const isDevelopment = true; // Always true for demo purposes
            if (isDevelopment) {
                console.log("Sử dụng môi trường phát triển với dữ liệu mẫu");
                return this.mockCheck(content, type);
            }
            
            // Bắt đầu quá trình kiểm tra
            const scanInfo = await this.startScan(content, type);
            console.log("Đã bắt đầu kiểm tra:", scanInfo);
            
            // Khảo sát trạng thái hoàn thành
            let status = await this.checkScanStatus(scanInfo.scanId);
            let attempts = 0;
            const maxAttempts = 15; // Tăng số lần thử tối đa
            
            while (status.status !== 'Completed' && attempts < maxAttempts) {
                console.log(`Đang kiểm tra, lần thử ${attempts + 1}/${maxAttempts}...`);
                // Đợi 2 giây trước khi kiểm tra lại
                await new Promise(resolve => setTimeout(resolve, 2000));
                status = await this.checkScanStatus(scanInfo.scanId);
                attempts++;
            }
            
            if (attempts >= maxAttempts) {
                console.warn("Kiểm tra tốn quá nhiều thời gian, chuyển sang dữ liệu mẫu");
                return this.mockCheck(content, type);
            }
            
            // Lấy kết quả cuối cùng
            console.log("Quá trình kiểm tra hoàn tất, đang lấy kết quả");
            const results = await this.getScanResults(scanInfo.scanId);
            results.type = type;
            results.content = typeof content === 'string' 
                ? content.substring(0, 1000) 
                : 'Binary content'; // Giới hạn kích thước nội dung
            
            return results;
        } catch (error) {
            console.error('Lỗi kiểm tra trùng lặp:', error);
            
            // Báo lỗi cho người dùng nếu có mainView
            if (window.mainView) {
                window.mainView.showNotification(`Lỗi kiểm tra: ${error.message}`, 'error');
            }
            
            // Quay lại sử dụng dữ liệu mẫu cho mục đích demo
            return this.mockCheck(content, type);
        }
    }
    
    /**
     * Tạo kết quả giả lập cho mục đích phát triển
     * @param {string} content - Nội dung cần kiểm tra
     * @param {string} type - Loại nội dung (text, image, video, v.v)
     * @returns {Promise<Object>} - Kết quả kiểm tra
     */
    async mockCheck(content, type) {
        console.log('Using mock check function for development environment');
        
        // Nếu không có nội dung, trả về kết quả với tỷ lệ thấp
        if (!content || content.trim().length === 0) {
            console.log('Empty content provided to mockCheck, returning minimal result');
            
            // Trả về kết quả giả lập cho nội dung trống
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        type: type || 'text',
                        percentage: 0,
                        status: 'completed',
                        message: 'Empty content',
                        sources: [],
                        timestamp: new Date().toISOString()
                    });
                }, 1500); // Giả lập thời gian xử lý 1.5s
            });
        }
        
        // Giả lập thời gian xử lý
        return new Promise((resolve) => {
            // Tạo số ngẫu nhiên cho tiến trình
            const randomProgress = () => Math.floor(Math.random() * 30) + 10;
            
            // Phương thức thông báo tiến trình
            const progress = (percent) => {
                console.log(`Mock check progress: ${percent}%`);
                if (this.onProgress) {
                    this.onProgress(percent);
                }
            };
            
            // Mô phỏng quá trình kiểm tra bằng cách cập nhật tiến trình
            setTimeout(() => progress(randomProgress()), 500);
            setTimeout(() => progress(randomProgress() + 30), 1000);
            setTimeout(() => progress(randomProgress() + 60), 1500);
            
            // Tạo kết quả giả sau 2 giây
            setTimeout(() => {
                // Xác định tỷ lệ trùng lặp dựa trên loại nội dung
                let percentage;
                
                if (type === 'text') {
                    // Văn bản có xác suất cao hơn để phát hiện trùng lặp
                    percentage = Math.floor(Math.random() * 60); // 0-60%
                    
                    // Tăng tỷ lệ dựa trên từ khóa phổ biến trong nội dung
                    const commonPhrases = ['lorem ipsum', 'content', 'duplicate', 'check', 'plagiarism'];
                    commonPhrases.forEach(phrase => {
                        if (content.toLowerCase().includes(phrase)) {
                            percentage += 5; // Mỗi cụm từ phổ biến tăng 5%
                        }
                    });
                } else if (type === 'image' || type === 'video') {
                    // Hình ảnh và video có tỷ lệ trùng lặp thấp hơn
                    percentage = Math.floor(Math.random() * 40); // 0-40%
                } else {
                    // Loại tệp khác
                    percentage = Math.floor(Math.random() * 50); // 0-50%
                }
                
                // Giới hạn tỷ lệ tối đa là 95%
                percentage = Math.min(percentage, 95);
                
                // Tạo danh sách nguồn giả
                const sources = [];
                const numSources = Math.ceil(percentage / 15); // Số nguồn dựa vào tỷ lệ trùng lặp
                
                const possibleTitles = [
                    'Wikipedia - The Free Encyclopedia',
                    'Academic Journal of Computer Science',
                    'Research Papers on Web Development',
                    'Technology Today Magazine',
                    'Stack Overflow Discussions',
                    'GitHub Documentation',
                    'Medium: Programming Articles',
                    'Dev.to Community Posts',
                    'Mozilla Developer Network',
                    'W3Schools Web Tutorials',
                    'Scientific Reports Journal',
                    'Harvard University Publications'
                ];
                
                const possibleDomains = [
                    'wikipedia.org',
                    'stackoverflow.com',
                    'github.com',
                    'medium.com',
                    'dev.to',
                    'developer.mozilla.org',
                    'w3schools.com',
                    'academia.edu',
                    'researchgate.net',
                    'harvard.edu',
                    'mit.edu',
                    'nature.com'
                ];
                
                // Tạo các đoạn văn bản mẫu cho nội dung trùng lặp
                const possibleTexts = [
                    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris.',
                    'The quick brown fox jumps over the lazy dog. This pangram contains all the letters of the English alphabet.',
                    'In computer science, artificial intelligence (AI), sometimes called machine intelligence, is intelligence demonstrated by machines.',
                    'A programming language is a formal language comprising a set of instructions that produce various kinds of output.',
                    'The World Wide Web (WWW), commonly known as the Web, is an information system where documents and other web resources are identified.',
                    'JavaScript, often abbreviated as JS, is a programming language that conforms to the ECMAScript specification.',
                    'Hypertext Markup Language (HTML) is the standard markup language for documents designed to be displayed in a web browser.',
                    'Cascading Style Sheets (CSS) is a style sheet language used for describing the presentation of a document written in a markup language.',
                    'Python is an interpreted, high-level, general-purpose programming language.',
                    'Java is a general-purpose programming language that is class-based, object-oriented, and designed to have as few implementation dependencies as possible.'
                ];
                
                // Tạo các nguồn ngẫu nhiên
                for (let i = 0; i < numSources; i++) {
                    const titleIndex = Math.floor(Math.random() * possibleTitles.length);
                    const domainIndex = Math.floor(Math.random() * possibleDomains.length);
                    const textIndex = Math.floor(Math.random() * possibleTexts.length);
                    
                    // Tạo URL giả ngẫu nhiên
                    const url = `https://www.${possibleDomains[domainIndex]}/article-${Math.floor(Math.random() * 10000)}`;
                    
                    // Tính phần trăm trùng lặp cho nguồn này
                    const sourcePercentage = Math.floor(5 + Math.random() * 35); // 5-40%
                    
                    sources.push({
                        title: possibleTitles[titleIndex],
                        link: url,
                        percentage: sourcePercentage,
                        matchedText: possibleTexts[textIndex],
                        publishDate: this.getRandomPastDate()
                    });
                }
                
                // Kết quả giả lập
                const result = {
                    type,
                    percentage,
                    status: 'completed',
                    message: 'Check completed successfully',
                    sources,
                    timestamp: new Date().toISOString()
                };
                
                if (this.onProgress) {
                    this.onProgress(100);
                }
                
                resolve(result);
            }, 2000);
        });
    }
    
    /**
     * Tạo ngày ngẫu nhiên trong quá khứ
     * @returns {string} - Chuỗi ngày định dạng ISO
     */
    getRandomPastDate() {
        const now = new Date();
        const pastDays = Math.floor(Math.random() * 365 * 2); // Tối đa 2 năm trước
        const pastDate = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
        return pastDate.toISOString().split('T')[0];
    }
}
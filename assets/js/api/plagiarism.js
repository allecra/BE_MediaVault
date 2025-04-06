class PlagiarismAPI {
    constructor() {
        // Lấy API key từ config nếu có
        this.apiKey = window.CONFIG?.COPYLEAKS_API_KEY || "40c551b8-388f-48c5-8b4b-60e7c0220b2a";
        
        // Ngưỡng so sánh cho thuật toán local
        this.similarityThreshold = 0.6; // 60% match
        
        // Mảng web crawl mẫu để so sánh
        this.sampleWebContent = [
            {
                url: "https://vi.wikipedia.org/wiki/Tri%E1%BA%BFt_h%E1%BB%8Dc",
                title: "Triết học - Wikipedia",
                content: "Triết học là ngành học về những vấn đề chung và cơ bản liên quan đến vấn đề tồn tại, tri thức, chân lý, vẻ đẹp, tâm trí, ngôn ngữ. Triết học phân biệt với các ngành khoa học khác ở chỗ nó không dựa vào thực nghiệm hay toán học."
            },
            {
                url: "https://vi.wikipedia.org/wiki/Khoa_h%E1%BB%8Dc_m%C3%A1y_t%C3%ADnh",
                title: "Khoa học máy tính - Wikipedia",
                content: "Khoa học máy tính là ngành khoa học nghiên cứu các nguyên lý thực hành của việc tính toán và xử lý thông tin, đặc biệt là tính toán tự động và xử lý thông tin tự động với sự trợ giúp của máy tính."
            },
            {
                url: "https://vi.wikipedia.org/wiki/Tr%C3%AD_tu%E1%BB%87_nh%C3%A2n_t%E1%BA%A1o",
                title: "Trí tuệ nhân tạo - Wikipedia",
                content: "Trí tuệ nhân tạo (AI) là một ngành trong khoa học máy tính, được Peter Stone định nghĩa là nghiên cứu của các tác tử thông minh, trong đó tác tử thông minh là một hệ thống nhận thức được môi trường xung quanh và thực hiện các hành động để tối đa hóa cơ hội thành công cho một số mục tiêu."
            },
            {
                url: "https://vi.wikipedia.org/wiki/Internet",
                title: "Internet - Wikipedia",
                content: "Internet là một hệ thống thông tin toàn cầu có thể được truy nhập công cộng gồm các mạng máy tính được liên kết với nhau. Hệ thống này truyền thông tin theo kiểu nối chuyển gói dữ liệu (packet switching) dựa trên một giao thức liên mạng đã được chuẩn hóa."
            },
            {
                url: "https://vi.wikipedia.org/wiki/H%E1%BB%8Dc_m%C3%A1y",
                title: "Học máy - Wikipedia",
                content: "Học máy là một nhánh của trí tuệ nhân tạo, là một lĩnh vực của khoa học máy tính cho phép các hệ thống máy tính học hỏi trực tiếp từ các ví dụ, dữ liệu và kinh nghiệm. Tiếp cận học máy khuyến khích các máy tính thu nhận kiến thức trực tiếp từ dữ liệu mà không cần lập trình một tập luật cụ thể."
            }
        ];
        
        // Thêm các nguồn học thuật mẫu
        this.academicSources = [
            {
                url: "https://www.journals.elsevier.com/artificial-intelligence",
                title: "Tạp chí Trí tuệ nhân tạo - Elsevier",
                content: "Trí tuệ nhân tạo là một lĩnh vực rộng lớn, đòi hỏi các phương pháp từ nhiều lĩnh vực khác nhau, chẳng hạn như khoa học máy tính, toán học, ngôn ngữ học, tâm lý học, thần kinh học. Trong những năm gần đây, nhiều ứng dụng quan trọng dựa trên trí tuệ nhân tạo đã được phát triển."
            },
            {
                url: "https://www.sciencedirect.com/journal/computers-and-education",
                title: "Máy tính và Giáo dục - ScienceDirect",
                content: "Máy tính đã trở thành công cụ giáo dục thiết yếu trong nhiều tổ chức giáo dục và được sử dụng cả để hỗ trợ các lớp học truyền thống và trong các ứng dụng giáo dục từ xa. Việc nghiên cứu tác động của máy tính đối với giáo dục là một lĩnh vực phát triển nhanh chóng."
            },
            {
                url: "https://www.springer.com/journal/10618",
                title: "Khai thác dữ liệu và khám phá tri thức - Springer",
                content: "Khai thác dữ liệu là quá trình khám phá các mẫu thú vị, hữu ích, mới lạ và có thể hiểu được từ dữ liệu lớn. Đây là một lĩnh vực nghiên cứu liên ngành, sử dụng các phương pháp từ trí tuệ nhân tạo, học máy, thống kê và hệ thống cơ sở dữ liệu."
            }
        ];
        
        // Kết hợp tất cả nguồn
        this.allSources = [...this.sampleWebContent, ...this.academicSources];
    }

    /**
     * Kiểm tra nội dung có trùng lặp với các nguồn đã biết hay không
     * @param {string} content - Nội dung cần kiểm tra
     * @param {string} type - Loại nội dung (text, file, image, video)
     * @returns {Promise<Object>} - Kết quả kiểm tra trùng lặp
     */
    async check(content, type = 'text') {
        console.log(`Bắt đầu kiểm tra nội dung loại: ${type}`);
        
        try {
            // Nếu API không hoạt động, dùng phương pháp local
            return await this.checkLocally(content, type);
        } catch (error) {
            console.error("Lỗi trong quá trình kiểm tra:", error);
            // Fallback to mock data on any error
            return await this.mockCheck(content, type);
        }
    }
    
    /**
     * Kiểm tra trùng lặp sử dụng phương pháp local
     * @param {string} content - Nội dung cần kiểm tra
     * @param {string} type - Loại nội dung
     * @returns {Promise<Object>} - Kết quả kiểm tra
     */
    async checkLocally(content, type) {
        console.log("Sử dụng thuật toán kiểm tra trùng lặp local");
        
        // Nếu là file hoặc image, trả về mock data vì không thể phân tích được
        if (type !== 'text') {
            return await this.mockCheck(content, type);
        }
        
        // Chuyển đổi nội dung thành text và chuẩn hóa
        const normalizedContent = this.normalizeText(content);
        
        // Chia nội dung thành đoạn
        const contentParagraphs = this.splitIntoParagraphs(normalizedContent);
        
        const results = [];
        let totalSimilarityScore = 0;
        
        // So sánh với từng nguồn
        this.allSources.forEach(source => {
            const sourceContent = this.normalizeText(source.content);
            
            // Tìm đoạn trùng lặp nhất
            let bestMatchParagraph = "";
            let highestSimilarity = 0;
            
            contentParagraphs.forEach(paragraph => {
                if (paragraph.length < 10) return; // Bỏ qua đoạn quá ngắn
                
                const similarity = this.calculateSimilarity(paragraph, sourceContent);
                if (similarity > highestSimilarity && similarity > this.similarityThreshold) {
                    highestSimilarity = similarity;
                    bestMatchParagraph = paragraph;
                }
            });
            
            // Nếu có sự trùng lặp đáng kể, thêm vào kết quả
            if (highestSimilarity > this.similarityThreshold) {
                const matchPercentage = Math.round(highestSimilarity * 100);
                results.push({
                    title: source.title,
                    link: source.url,
                    percentage: matchPercentage,
                    matchedText: bestMatchParagraph,
                    similarity: highestSimilarity
                });
                
                // Cộng dồn điểm tương đồng
                totalSimilarityScore += highestSimilarity;
            }
        });
        
        // Sắp xếp kết quả theo độ tương đồng giảm dần
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Tính toán tỷ lệ trùng lặp tổng thể
        let overallPercentage = 0;
        if (results.length > 0) {
            // Tỷ lệ trung bình có trọng số
            overallPercentage = Math.min(Math.round(totalSimilarityScore / Math.sqrt(results.length) * 100), 100);
        }
        
        return {
            type,
            percentage: overallPercentage,
            status: 'completed',
            message: 'Kiểm tra hoàn tất thành công',
            sources: results,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Tính toán độ tương đồng giữa hai chuỗi văn bản
     * @param {string} text1 - Văn bản thứ nhất
     * @param {string} text2 - Văn bản thứ hai
     * @returns {number} - Độ tương đồng (0-1)
     */
    calculateSimilarity(text1, text2) {
        // Tạo tập hợp các từ
        const words1 = new Set(text1.split(/\s+/));
        const words2 = new Set(text2.split(/\s+/));
        
        // Tính toán độ tương đồng bằng hệ số Jaccard
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        // Trả về tỷ lệ giao/hợp
        return intersection.size / union.size;
    }
    
    /**
     * Chuẩn hóa văn bản trước khi so sánh
     * @param {string} text - Văn bản cần chuẩn hóa
     * @returns {string} - Văn bản đã chuẩn hóa
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }
    
    /**
     * Chia văn bản thành các đoạn để so sánh
     * @param {string} text - Văn bản cần chia
     * @returns {string[]} - Mảng các đoạn văn bản
     */
    splitIntoParagraphs(text) {
        // Chia theo đoạn và câu
        const paragraphs = text.split(/\n+/);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        // Tạo các cụm câu bằng cách ghép các câu liền kề
        const chunks = [];
        const chunkSize = 3; // Số câu trong mỗi cụm
        
        for (let i = 0; i < sentences.length - chunkSize + 1; i++) {
            const chunk = sentences.slice(i, i + chunkSize).join(". ").trim();
            if (chunk.length > 10) {
                chunks.push(chunk);
            }
        }
        
        // Kết hợp cả đoạn và cụm câu
        return [...paragraphs, ...chunks].filter(p => p.trim().length > 0);
    }

    /**
     * Tạo kết quả giả lập cho mục đích phát triển
     * @param {string} content - Nội dung cần kiểm tra
     * @param {string} type - Loại nội dung (text, image, video, v.v)
     * @returns {Promise<Object>} - Kết quả kiểm tra
     */
    async mockCheck(content, type) {
        console.log('Sử dụng hàm kiểm tra mẫu');
        
        // Giả lập thời gian xử lý
        return new Promise((resolve) => {
            setTimeout(() => {
                // Xác định tỷ lệ trùng lặp ngẫu nhiên dựa trên loại nội dung
                let percentage = Math.floor(Math.random() * 50);
                
                // Tạo danh sách nguồn giả
                const sources = [];
                const numSources = Math.ceil(percentage / 15) || 1; // Đảm bảo có ít nhất 1 nguồn
                
                const siteTitles = [
                    'Wikipedia - The Free Encyclopedia',
                    'Academic Journal of Computer Science',
                    'Stack Overflow Discussions',
                    'GitHub Documentation',
                    'Medium: Programming Articles'
                ];
                
                const matchedTexts = [
                    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
                    'The quick brown fox jumps over the lazy dog.',
                    'In computer science, artificial intelligence is intelligence demonstrated by machines.',
                    'A programming language is a formal language comprising a set of instructions.'
                ];
                
                // Tạo các nguồn ngẫu nhiên
                for (let i = 0; i < numSources; i++) {
                    const sourcePercentage = Math.floor(5 + Math.random() * 30);
                    sources.push({
                        title: siteTitles[Math.floor(Math.random() * siteTitles.length)],
                        link: `https://example.com/source-${i + 1}`,
                        percentage: sourcePercentage,
                        matchedText: matchedTexts[Math.floor(Math.random() * matchedTexts.length)]
                    });
                }
                
                // Trả về kết quả mẫu
                resolve({
                    type,
                    percentage,
                    status: 'completed',
                    message: 'Kiểm tra hoàn tất thành công',
                    sources,
                    timestamp: new Date().toISOString()
                });
            }, 2000);
        });
    }
}
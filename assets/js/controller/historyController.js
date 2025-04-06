/**
 * Lớp HistoryController - Xử lý hiển thị và quản lý lịch sử kiểm tra
 */
class HistoryController {
    /**
     * Khởi tạo controller lịch sử
     * @param {UserModel} userModel - Model quản lý người dùng
     * @param {FileModel} fileModel - Model quản lý file
     */
    constructor(userModel, fileModel) {
        this.userModel = userModel;
        this.fileModel = fileModel;
        this.mainView = window.mainView || new MainView();
        
        // Khởi tạo các thuộc tính
        this.historyItems = [];
        this.currentFilter = {
            text: true,
            file: true,
            image: true,
            video: true
        };
        this.currentSort = 'newest';
        this.searchTerm = '';
        
        // Khởi tạo các sự kiện
        this.initEventListeners();
    }
    
    /**
     * Đăng ký các sự kiện cho trang lịch sử
     */
    initEventListeners() {
        // Sự kiện tìm kiếm
        const searchInput = document.getElementById('search-history');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAndSortHistory();
            });
        }
        
        // Sự kiện lọc
        const filterCheckboxes = document.querySelectorAll('.filter-dropdown input[type="checkbox"]');
        filterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.currentFilter = {
                    text: document.getElementById('filter-text').checked,
                    file: document.getElementById('filter-file').checked,
                    image: document.getElementById('filter-image').checked,
                    video: document.getElementById('filter-video').checked
                };
                this.filterAndSortHistory();
            });
        });
        
        // Sự kiện sắp xếp
        const sortItems = document.querySelectorAll('.sort-dropdown .dropdown-item');
        sortItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Cập nhật trạng thái active
                sortItems.forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                
                this.currentSort = item.dataset.sort;
                this.filterAndSortHistory();
            });
        });
        
        // Sự kiện đóng/mở dropdown
        document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', function () {
                const dropdownMenu = this.nextElementSibling;
                if (dropdownMenu.style.display === 'block') {
                    dropdownMenu.style.display = 'none';
                } else {
                    // Đóng tất cả các dropdown khác
                    document.querySelectorAll('.dropdown-menu').forEach(menu => {
                        menu.style.display = 'none';
                    });
                    dropdownMenu.style.display = 'block';
                }
            });
        });

        // Đóng dropdown khi click ra ngoài
        document.addEventListener('click', function (event) {
            if (!event.target.closest('.dropdown-toggle') && !event.target.closest('.dropdown-menu')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });
    }
    
    /**
     * Tải lịch sử kiểm tra của người dùng
     */
    async loadHistory() {
            if (!this.userModel.isLoggedIn()) {
            // Hiển thị thông báo yêu cầu đăng nhập
            document.querySelector('.guest-only').style.display = 'block';
            document.querySelector('.user-only').style.display = 'none';
                return;
            }
            
        // Hiển thị khu vực người dùng
        document.querySelector('.guest-only').style.display = 'none';
        document.querySelector('.user-only').style.display = 'block';
        
        try {
            const currentUser = this.userModel.getCurrentUser();
            
            // Tải lịch sử kiểm tra từ cơ sở dữ liệu hoặc localStorage
            const historyItems = await this.fileModel.getFilesByUserId(currentUser.id);
            
            this.historyItems = historyItems.filter(item => item.checkCount > 0);
            
            // Hiển thị lịch sử
            this.renderHistory();
        } catch (error) {
            console.error('Error loading history:', error);
            if (this.mainView) {
                this.mainView.showNotification('Lỗi khi tải lịch sử kiểm tra', 'error');
            }
        }
    }
    
    /**
     * Hiển thị lịch sử kiểm tra
     */
    renderHistory() {
        // Lọc và sắp xếp dữ liệu
        this.filterAndSortHistory();
    }
    
    /**
     * Lọc và sắp xếp lịch sử kiểm tra
     */
    filterAndSortHistory() {
        const historyList = document.getElementById('history-list');
        
        // Xóa tất cả các mục hiện tại (trừ mẫu và empty state)
        const currentItems = historyList.querySelectorAll('.history-item:not([style="display: none;"])');
        currentItems.forEach(item => item.remove());
        
        // Lọc dữ liệu theo bộ lọc hiện tại
        let filteredItems = this.historyItems.filter(item => {
            // Kiểm tra loại
            const type = this.getItemType(item);
            if (!this.currentFilter[type]) return false;
            
            // Kiểm tra từ khóa tìm kiếm
            if (this.searchTerm) {
                const searchableText = `${item.name || ''} ${item.summary || ''} ${item.content || ''}`.toLowerCase();
                return searchableText.includes(this.searchTerm);
            }
            
            return true;
        });
        
        // Sắp xếp dữ liệu
        filteredItems = this.sortItems(filteredItems, this.currentSort);
        
        // Hiển thị empty state nếu không có dữ liệu
        const emptyState = document.getElementById('empty-history');
        
        if (filteredItems.length === 0) {
            emptyState.style.display = 'block';
            
            // Cập nhật thông báo dựa vào tình huống
            const emptyTitle = emptyState.querySelector('h3');
            const emptyText = emptyState.querySelector('p');
            
            if (this.searchTerm) {
                emptyState.setAttribute('data-type', 'search');
                emptyState.querySelector('i').className = 'fas fa-search';
                emptyTitle.textContent = 'Không tìm thấy kết quả';
                emptyText.textContent = 'Không có kết quả nào phù hợp với từ khóa tìm kiếm của bạn.';
            } else if (Object.values(this.currentFilter).every(value => !value)) {
                emptyState.setAttribute('data-type', 'filter');
                emptyState.querySelector('i').className = 'fas fa-filter';
                emptyTitle.textContent = 'Không có kết quả nào';
                emptyText.textContent = 'Vui lòng chọn ít nhất một loại tài liệu để hiển thị.';
            } else {
                emptyState.setAttribute('data-type', 'empty');
                emptyState.querySelector('i').className = 'fas fa-history';
                emptyTitle.textContent = 'Chưa có lịch sử kiểm tra nào';
                emptyText.textContent = 'Bạn chưa thực hiện kiểm tra trùng lặp nào. Hãy bắt đầu kiểm tra ngay!';
            }
        } else {
            emptyState.style.display = 'none';
            
            // Hiển thị dữ liệu
            filteredItems.forEach(item => {
                const historyItem = this.createHistoryItem(item);
                historyList.appendChild(historyItem);
            });
        }
    }
    
    /**
     * Tạo một mục lịch sử
     * @param {Object} item - Dữ liệu mục lịch sử
     * @returns {HTMLElement} - Phần tử HTML cho mục lịch sử
     */
    createHistoryItem(item) {
        // Lấy mẫu từ DOM và sao chép
        const template = document.querySelector('.history-item[style="display: none;"]');
        const historyItem = template.cloneNode(true);
        
        // Bỏ ẩn
        historyItem.style.display = '';
        
        // Cập nhật ngày và phần trăm cho thuộc tính dữ liệu 
        historyItem.dataset.date = item.checkDate || item.uploadDate || new Date().toISOString();
        historyItem.dataset.percent = item.percentage || '0';
        
        // Cập nhật tiêu đề
        const title = historyItem.querySelector('.history-item-title h3');
        title.textContent = item.name || 'Tài liệu không có tiêu đề';
        
        // Cập nhật kích thước/số từ
        const subtitle = historyItem.querySelector('.history-item-title p');
        if (item.wordCount) {
            subtitle.textContent = `${item.wordCount} từ`;
        } else if (item.size) {
            subtitle.textContent = this.formatFileSize(item.size);
        } else {
            subtitle.textContent = '';
        }
        
        // Cập nhật icon và loại
        const icon = historyItem.querySelector('.history-item-icon i');
        const typeLabel = historyItem.querySelector('.history-item-type');
        const itemType = this.getItemType(item);
        
        typeLabel.className = 'history-item-type ' + itemType;
        
        if (itemType === 'text') {
            icon.className = 'fas fa-file-alt';
            typeLabel.textContent = 'Văn bản';
        } else if (itemType === 'file') {
            icon.className = 'fas fa-file';
            typeLabel.textContent = 'Tệp';
        } else if (itemType === 'image') {
            icon.className = 'fas fa-image';
            typeLabel.textContent = 'Hình ảnh';
        } else if (itemType === 'video') {
            icon.className = 'fas fa-video';
            typeLabel.textContent = 'Video';
        }
        
        // Cập nhật ngày
        const dateElement = historyItem.querySelector('.history-item-date');
        const date = new Date(item.checkDate || item.uploadDate || new Date());
        dateElement.innerHTML = `<i class="far fa-calendar"></i> ${this.formatDate(date)}`;
        
        // Cập nhật tiến trình
        const progressFill = historyItem.querySelector('.history-progress-fill');
        const percentage = item.percentage || 0;
        progressFill.style.width = `${percentage}%`;
        
        // Cập nhật class dựa trên phần trăm
        progressFill.className = 'history-progress-fill';
        if (percentage < 30) {
            progressFill.classList.add('low');
        } else if (percentage < 70) {
            progressFill.classList.add('medium');
        } else {
            progressFill.classList.add('high');
        }
        
        // Cập nhật giá trị phần trăm
        const percentValue = historyItem.querySelector('.history-percentage .value');
        percentValue.textContent = `${percentage}%`;
        
        // Thêm sự kiện cho nút
        const viewButton = historyItem.querySelector('.view-btn');
        viewButton.addEventListener('click', () => this.viewHistoryDetails(item));
        
        const deleteButton = historyItem.querySelector('.delete-btn');
        deleteButton.addEventListener('click', () => this.deleteHistoryItem(item));
        
        return historyItem;
    }
    
    /**
     * Xem chi tiết lịch sử kiểm tra
     * @param {Object} item - Mục lịch sử cần xem
     */
    viewHistoryDetails(item) {
        if (this.mainView) {
            // Sử dụng mainView để hiển thị modal chi tiết
            this.mainView.showModal('history-detail-modal');
            
            // Cập nhật nội dung modal
            const modalContent = document.getElementById('history-detail-content');
            
            // TODO: Hiển thị chi tiết kết quả kiểm tra
            modalContent.innerHTML = `<p>Đang tải chi tiết kiểm tra...</p>`;
            
            // Tải kết quả kiểm tra
            this.loadCheckResult(item);
        }
    }
    
    /**
     * Tải kết quả kiểm tra
     * @param {Object} item - Mục lịch sử cần tải kết quả
     */
    async loadCheckResult(item) {
        try {
            // TODO: Tải kết quả từ cơ sở dữ liệu
            // ...
            
            // Hiển thị kết quả giả
            setTimeout(() => {
                const modalContent = document.getElementById('history-detail-content');
                
                if (!modalContent) return;
                
                const percentage = item.percentage || Math.floor(Math.random() * 100);
                let statusClass, statusText;
                
                if (percentage < 30) {
                    statusClass = 'success';
                    statusText = 'Ít trùng lặp';
                } else if (percentage < 70) {
                    statusClass = 'warning';
                    statusText = 'Trùng lặp vừa phải';
                } else {
                    statusClass = 'danger';
                    statusText = 'Trùng lặp nghiêm trọng';
                }
                
                // Tạo HTML cho kết quả
                const resultHtml = `
                    <div class="result-header">
                        <div class="result-info">
                            <h3 class="result-status">${statusText}</h3>
                            <p class="result-date">Kiểm tra lúc: ${this.formatDate(new Date(item.checkDate || item.uploadDate))}</p>
                        </div>
                        <div class="result-percentage">
                            <div class="circular-progress ${statusClass}" style="--percentage: ${percentage}%">
                                <span class="progress-value">${percentage}%</span>
                            </div>
                        </div>
                    </div>
                    <div class="result-details">
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill ${statusClass}" style="width: ${percentage}%"></div>
                            </div>
                            <div class="progress-labels">
                                <span>Tỷ lệ trùng lặp</span>
                                <span class="progress-value">${percentage}%</span>
                            </div>
                        </div>
                        <div class="result-sources">
                            <h3>Nguồn trùng lặp</h3>
                            <div class="sources-list">
                                ${this.generateMockSources(percentage)}
                            </div>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-outline" onclick="mainView.closeModal('history-detail-modal')">Đóng</button>
                            <button class="btn btn-primary" onclick="mainView.downloadReport('${item.id}')">Tải báo cáo</button>
                        </div>
                    </div>
                `;
                
                modalContent.innerHTML = resultHtml;
            }, 500);
        } catch (error) {
            console.error('Error loading check result:', error);
            
            const modalContent = document.getElementById('history-detail-content');
            modalContent.innerHTML = `<p class="error-message">Có lỗi xảy ra khi tải kết quả. Vui lòng thử lại sau.</p>`;
        }
    }
    
    /**
     * Tạo các nguồn giả cho kết quả kiểm tra
     * @param {number} percentage - Phần trăm trùng lặp
     * @returns {string} - HTML cho các nguồn
     */
    generateMockSources(percentage) {
        // Số lượng nguồn dựa trên phần trăm
        const numSources = Math.max(1, Math.min(5, Math.ceil(percentage / 20)));
        
        // Danh sách nguồn mẫu
        const sampleSources = [
            {
                title: 'Wikipedia - Trí tuệ nhân tạo',
                url: 'https://vi.wikipedia.org/wiki/Tr%C3%AD_tu%E1%BB%87_nh%C3%A2n_t%E1%BA%A1o',
                text: 'Trí tuệ nhân tạo (AI) là một ngành trong khoa học máy tính, được định nghĩa là nghiên cứu của các tác tử thông minh, trong đó tác tử thông minh là một hệ thống nhận thức được môi trường xung quanh.'
            },
            {
                title: 'Tạp chí Khoa học Việt Nam',
                url: 'https://example.com/article1',
                text: 'Công nghệ thông tin đã và đang phát triển mạnh mẽ trong những năm gần đây, với sự xuất hiện của các công nghệ mới như trí tuệ nhân tạo, blockchain và Internet of Things.'
            },
            {
                title: 'Đại học Quốc gia Hà Nội',
                url: 'https://example.com/article2',
                text: 'Trong bối cảnh chuyển đổi số, các ngành nghề đang có sự thay đổi mạnh mẽ, đòi hỏi người lao động phải liên tục cập nhật kiến thức và kỹ năng.'
            },
            {
                title: 'Báo Khoa học và Phát triển',
                url: 'https://example.com/article3',
                text: 'Các nhà khoa học Việt Nam đã có nhiều đóng góp quan trọng trong lĩnh vực công nghệ thông tin và trí tuệ nhân tạo, được ghi nhận trên các tạp chí quốc tế uy tín.'
            },
            {
                title: 'Luận văn của Nguyễn Văn A',
                url: 'https://example.com/article4',
                text: 'Nghiên cứu này tập trung vào việc ứng dụng deep learning trong nhận dạng hình ảnh, một lĩnh vực đang phát triển nhanh chóng trong cộng đồng khoa học.'
            }
        ];
        
        let sourcesHtml = '';
        
        // Tạo HTML cho từng nguồn
        for (let i = 0; i < numSources; i++) {
            const source = sampleSources[i];
            const matchPercent = Math.floor(Math.random() * 30) + 10; // 10-40%
            
            let matchClass;
            if (matchPercent < 20) {
                matchClass = 'success';
            } else if (matchPercent < 30) {
                matchClass = 'warning';
            } else {
                matchClass = 'danger';
            }
            
            sourcesHtml += `
                <div class="source-item">
                    <div class="source-header">
                        <div class="source-index">${i + 1}</div>
                        <h4 class="source-title">${source.title}</h4>
                    </div>
                    <div class="source-content">
                        <div class="match-info">
                            <div class="match-progress">
                                <div class="match-progress-bar ${matchClass}" style="width: ${matchPercent}%"></div>
                            </div>
                            <div class="match-percentage">${matchPercent}%</div>
                        </div>
                        <div class="matched-text">
                            <p>Đoạn trùng lặp:</p>
                            <div class="matched-content">${source.text}</div>
                        </div>
                        <div class="source-link">
                            <a href="${source.url}" target="_blank" class="btn btn-sm btn-outline">
                                <i class="fas fa-external-link-alt"></i> Xem nguồn
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return sourcesHtml || '<div class="no-sources">Không tìm thấy nguồn trùng lặp nào.</div>';
    }
    
    /**
     * Xóa một mục lịch sử
     * @param {Object} item - Mục lịch sử cần xóa
     */
    async deleteHistoryItem(item) {
        try {
            // Hiển thị thông báo xác nhận
            const confirmed = confirm(`Bạn có chắc chắn muốn xóa mục "${item.name || 'Tài liệu không có tiêu đề'}" khỏi lịch sử không?`);
            
            if (!confirmed) return;
            
            // Xóa khỏi danh sách
            this.historyItems = this.historyItems.filter(i => i.id !== item.id);
            
            // Cập nhật giao diện
            this.filterAndSortHistory();
            
            // TODO: Xóa từ cơ sở dữ liệu
            // ...
            
            // Hiển thị thông báo
            if (this.mainView) {
                this.mainView.showNotification('Đã xóa mục khỏi lịch sử', 'success');
            }
        } catch (error) {
            console.error('Error deleting history item:', error);
            
            if (this.mainView) {
                this.mainView.showNotification('Lỗi khi xóa mục lịch sử', 'error');
            }
        }
    }
    
    /**
     * Sắp xếp các mục lịch sử
     * @param {Array} items - Danh sách mục cần sắp xếp
     * @param {string} sortType - Loại sắp xếp
     * @returns {Array} - Danh sách đã sắp xếp
     */
    sortItems(items, sortType) {
        return [...items].sort((a, b) => {
            const dateA = new Date(a.checkDate || a.uploadDate || 0);
            const dateB = new Date(b.checkDate || b.uploadDate || 0);
            const percentA = a.percentage || 0;
            const percentB = b.percentage || 0;
            
            if (sortType === 'newest') {
                return dateB - dateA;
            } else if (sortType === 'oldest') {
                return dateA - dateB;
            } else if (sortType === 'highest') {
                return percentB - percentA;
            } else if (sortType === 'lowest') {
                return percentA - percentB;
            }
            
            return 0;
        });
    }
    
    /**
     * Lấy loại của mục lịch sử
     * @param {Object} item - Mục lịch sử
     * @returns {string} - Loại mục (text, file, image, video)
     */
    getItemType(item) {
        if (!item.type) return 'text';
        
        if (item.type.includes('image')) {
            return 'image';
        } else if (item.type.includes('video')) {
            return 'video';
        } else if (item.type.includes('text') || item.type.includes('pdf') || item.type.includes('doc')) {
            return 'text';
        } else {
            return 'file';
        }
    }
    
    /**
     * Định dạng kích thước file
     * @param {number} bytes - Kích thước file (bytes)
     * @returns {string} - Chuỗi đã định dạng
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Định dạng ngày tháng
     * @param {Date} date - Đối tượng Date
     * @returns {string} - Chuỗi đã định dạng
     */
    formatDate(date) {
        if (!date || isNaN(date)) return '';
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }
} 
/**
 * Lớp MainView - xử lý hiển thị giao diện chính
 * Cung cấp các phương thức để hiển thị thông báo, modal và kết quả kiểm tra
 */
class MainView {
    constructor() {
        // Thiết lập container thông báo nếu chưa tồn tại
        this.initializeNotificationContainer();
    }
    
    /**
     * Khởi tạo container chứa thông báo
     */
    initializeNotificationContainer() {
        // Tạo container thông báo nếu chưa tồn tại
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
    }
    
    /**
     * Phương thức instance để hiển thị thông báo
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại thông báo (info, success, warning, error)
     */
    showNotification(message, type = 'info') {
        // Gọi phương thức static
        MainView.showNotification(message, type);
    }
    
    /**
     * Phương thức instance để hiển thị modal
     * @param {string} modalId - ID của modal cần hiển thị
     */
    showModal(modalId) {
        MainView.showModal(modalId);
    }
    
    /**
     * Phương thức instance để đóng modal
     * @param {string} modalId - ID của modal cần đóng
     */
    closeModal(modalId) {
        MainView.closeModal(modalId);
    }

    /**
     * Hiển thị section theo ID
     * @param {string} sectionId - ID của section cần hiển thị
     */
    static showSection(sectionId) {
        document.querySelectorAll('section').forEach(section => {
            section.style.display = 'none';
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
    }

    /**
     * Hiển thị modal theo ID
     * @param {string} modalId - ID của modal cần hiển thị
     */
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Đóng modal theo ID
     * @param {string} modalId - ID của modal cần đóng
     */
    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Hiển thị kết quả kiểm tra trùng lặp
     * @param {Object} result - Kết quả kiểm tra từ API
     */
    displayDuplicateResult(result) {
        // Gọi phương thức static
        MainView.displayDuplicateResult(result);
    }

    /**
     * Hiển thị kết quả kiểm tra trùng lặp (phương thức static)
     * @param {Object} result - Kết quả kiểm tra từ API
     */
    static displayDuplicateResult(result) {
        try {
            console.log('Displaying result:', result);
            
            if (!result) {
                console.error('Không có kết quả để hiển thị');
                return;
            }
            
            // Đảm bảo tỷ lệ phần trăm luôn có giá trị hợp lệ
            const percentage = typeof result.percentage === 'number' ? 
                result.percentage : 0;
            
            const resultContentElement = document.getElementById('duplicate-result-content');
            if (!resultContentElement) {
                console.error('Không tìm thấy phần tử hiển thị kết quả');
                return;
            }
            
            // Xác định lớp trạng thái dựa trên phần trăm
            let statusClass = 'success';
            let statusText = 'Nội dung nguyên bản';
            
            if (percentage > 50) {
                statusClass = 'danger';
                statusText = 'Trùng lặp đáng kể';
            } else if (percentage > 20) {
                statusClass = 'warning';
                statusText = 'Có một số trùng lặp';
            }
            
            // Tạo HTML cho phần tóm tắt kết quả
            let resultHTML = `
                <div class="result-summary">
                    <div class="result-header ${statusClass}">
                        <div class="result-percentage">
                            <div class="progress-circle">
                                <div class="progress-circle-fill" style="--percentage: ${percentage}%"></div>
                                <div class="progress-circle-value">${percentage}%</div>
                            </div>
                        </div>
                        <div class="result-info">
                            <h3 class="result-status">${statusText}</h3>
                            <p class="result-date">Kiểm tra lúc: ${new Date().toLocaleString('vi-VN')}</p>
                        </div>
                    </div>
                    
                    <div class="result-details">
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill ${statusClass}" style="width: ${percentage}%"></div>
                            </div>
                            <div class="progress-labels">
                                <span class="progress-label">Nguyên bản</span>
                                <span class="progress-value">${100 - percentage}%</span>
                                <span class="progress-label">Trùng lặp</span>
                                <span class="progress-value">${percentage}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Thêm phần nguồn trùng lặp
            resultHTML += '<div class="result-sources"><h3>Nguồn trùng lặp</h3>';
            
            if (result.sources && Array.isArray(result.sources) && result.sources.length > 0) {
                resultHTML += '<div class="sources-list">';
                result.sources.forEach((source, index) => {
                    const sourcePercentage = source.percentage || source.similarity || 10;
                    const sourceClass = sourcePercentage > 50 ? 'danger' : 
                                       sourcePercentage > 20 ? 'warning' : 'success';
                    
                    resultHTML += `
                        <div class="source-item">
                            <div class="source-header">
                                <div class="source-index">${index + 1}</div>
                                <h4 class="source-title">${source.title || 'Nguồn không xác định'}</h4>
                            </div>
                            <div class="source-content">
                                <div class="match-info">
                                    <div class="match-progress">
                                        <div class="match-progress-bar ${sourceClass}" style="width: ${sourcePercentage}%"></div>
                                    </div>
                                    <span class="match-percentage">${sourcePercentage}%</span>
                                </div>
                                <div class="matched-text">
                                    <p><strong>Đoạn trùng lặp:</strong></p>
                                    <div class="matched-content">${source.matchedText || 'Không có thông tin chi tiết'}</div>
                                </div>
                                <div class="source-link">
                                    <a href="${source.link || source.url || '#'}" target="_blank" class="btn btn-primary btn-sm">
                                        <i class="fas fa-external-link-alt"></i> Xem nguồn
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                });
                resultHTML += '</div>';
            } else {
                resultHTML += '<div class="no-sources">Không tìm thấy nguồn trùng lặp</div>';
            }
            
            resultHTML += '</div>';
            
            // Thêm phần nút hành động
            resultHTML += `
                <div class="result-actions">
                    <button id="download-result" class="btn btn-primary">
                        <i class="fas fa-download"></i> Tải xuống báo cáo
                    </button>
                    <button id="save-result" class="btn btn-success">
                        <i class="fas fa-save"></i> Lưu vào lịch sử
                    </button>
                    <button id="close-result" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Đóng
                    </button>
                </div>
            `;
            
            // Cập nhật nội dung
            resultContentElement.innerHTML = resultHTML;
            
            // Thêm sự kiện cho các nút
            const downloadButton = document.getElementById('download-result');
            const saveButton = document.getElementById('save-result');
            const closeButton = document.getElementById('close-result');
            
            if (downloadButton) {
                downloadButton.addEventListener('click', () => this.downloadResult(result));
            }
            
            if (saveButton) {
                saveButton.addEventListener('click', () => {
                    if (window.mainController && typeof window.mainController.saveResult === 'function') {
                        window.mainController.saveResult(result);
                    } else {
                        console.error('mainController hoặc saveResult không tồn tại');
                    }
                });
            }
            
            if (closeButton) {
                closeButton.addEventListener('click', () => this.closeModal('duplicate-result-modal'));
            }
        } catch (error) {
            console.error('Error in displayDuplicateResult:', error);
            const resultContentElement = document.getElementById('duplicate-result-content');
            if (resultContentElement) {
                resultContentElement.innerHTML = `
                    <div class="error-message">
                        <h3>Có lỗi xảy ra khi hiển thị kết quả</h3>
                        <p>Vui lòng thử lại hoặc liên hệ hỗ trợ</p>
                        <button id="close-error" class="btn btn-secondary">Đóng</button>
                    </div>
                `;
                
                const closeErrorButton = document.getElementById('close-error');
                if (closeErrorButton) {
                    closeErrorButton.addEventListener('click', () => this.closeModal('duplicate-result-modal'));
                }
            }
        }
    }

    /**
     * Hiển thị lịch sử kiểm tra (phương thức instance)
     * @param {Array} historyItems - Danh sách các mục lịch sử
     */
    displayHistory(historyItems) {
        // Xóa thông báo lịch sử trống nếu có mục
        const emptyContainer = document.querySelector('.empty-history');
        if (emptyContainer) {
            emptyContainer.style.display = historyItems.length > 0 ? 'none' : 'block';
            
            // Nếu không có mục nào, cập nhật trạng thái hiển thị
            if (historyItems.length === 0) {
                emptyContainer.setAttribute('data-type', 'empty');
                emptyContainer.querySelector('i').className = 'fas fa-history';
                emptyContainer.querySelector('h3').textContent = 'Chưa có lịch sử kiểm tra nào';
                emptyContainer.querySelector('p').textContent = 'Bạn chưa thực hiện kiểm tra trùng lặp nào. Hãy bắt đầu kiểm tra ngay!';
            }
        }
        
        // Lấy container lịch sử
        const historyContainer = document.getElementById('history-items');
        if (!historyContainer) return;
        
        // Xóa các mục lịch sử hiện tại
        historyContainer.innerHTML = '';
        
        // Sắp xếp theo ngày, mới nhất trước
        historyItems.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.id);
            const dateB = new Date(b.timestamp || b.id);
            return dateB - dateA;
        });
        
        // Tạo phần tử cho mỗi mục lịch sử
        historyItems.forEach(item => {
            // Định dạng ngày và giờ
            const date = new Date(item.timestamp || item.id);
            const formattedDate = date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const formattedTime = date.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Xác định loại mục và biểu tượng
            let icon = 'fa-file-alt';
            let typeName = 'Văn bản';
            if (item.type === 'image') {
                icon = 'fa-image';
                typeName = 'Hình ảnh';
            } else if (item.type === 'video') {
                icon = 'fa-video';
                typeName = 'Video';
            } else if (item.type === 'file') {
                icon = 'fa-file';
                typeName = 'Tệp';
            }
            
            // Xác định lớp kết quả dựa trên phần trăm
            const percentage = item.result ? item.result.percentage : 0;
            let resultClass = 'success';
            let resultText = 'Nguyên bản';
            
            if (percentage >= 50) {
                resultClass = 'danger';
                resultText = 'Trùng lặp đáng kể';
            } else if (percentage >= 20) {
                resultClass = 'warning';
                resultText = 'Có một số trùng lặp';
            }
            
            // Tạo phần tử mục lịch sử
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-item-header">
                    <div class="history-item-type">
                        <i class="fas ${icon}"></i>
                        <span>${typeName}</span>
                    </div>
                    <div class="history-item-date">
                        <i class="fas fa-calendar"></i>
                        <span>${formattedDate}</span>
                        <i class="fas fa-clock"></i>
                        <span>${formattedTime}</span>
                    </div>
                </div>
                <div class="history-item-content">
                    ${this.formatContent(item.content || '')}
                </div>
                <div class="history-item-footer">
                    <div class="history-item-result ${resultClass}">
                        <span class="percentage">${percentage}%</span>
                        <span class="result-text">${resultText}</span>
                    </div>
                    <div class="history-item-actions">
                        <button class="btn btn-sm btn-outline view-details" data-id="${item.id}">
                            <i class="fas fa-eye"></i> Chi tiết
                        </button>
                        <button class="btn btn-sm btn-danger delete-history" data-id="${item.id}">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </div>
                </div>
            `;
            
            // Thêm vào container
            historyContainer.appendChild(historyItem);
        });
        
        // Thêm sự kiện lắng nghe cho các nút
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.showHistoryDetail(id);
            });
        });
        
        document.querySelectorAll('.delete-history').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                
                // Hiển thị hộp thoại xác nhận
                const confirmed = confirm('Bạn có chắc chắn muốn xóa kết quả kiểm tra này?');
                
                if (confirmed) {
                    // Phát sự kiện để controller xử lý xóa
                    const event = new CustomEvent('history:delete', { detail: { id } });
                    document.dispatchEvent(event);
                }
            });
        });
    }

    /**
     * Hiển thị chi tiết một mục lịch sử
     * @param {Object} file - Thông tin mục lịch sử
     */
    static showHistoryDetail(file) {
        const modal = document.getElementById('history-detail-modal');
        const dateElement = document.getElementById('detail-date');
        const typeElement = document.getElementById('detail-type');
        const progressCircle = document.getElementById('detail-progress-circle');
        const progressValue = document.getElementById('detail-progress-value');
        const contentElement = document.getElementById('detail-content');
        const sourcesElement = document.getElementById('detail-sources');
        
        if (modal) {
            // Định dạng ngày
            const date = new Date(file.timestamp || file.id);
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            
            // Đặt giá trị
            if (dateElement) dateElement.textContent = formattedDate;
            if (typeElement) typeElement.textContent = file.type.charAt(0).toUpperCase() + file.type.slice(1);
            
            // Cập nhật vòng tròn tiến trình
            const percentage = file.result?.percentage || 0;
            if (progressCircle && progressValue) {
                progressCircle.style.background = `conic-gradient(var(--primary-color) 0% ${percentage}%, var(--gray-200) ${percentage}% 100%)`;
                progressValue.textContent = `${percentage}%`;
            }
            
            // Hiển thị nội dung
            if (contentElement) {
                if (file.type === 'text') {
                    contentElement.innerHTML = `<pre>${file.content}</pre>`;
                } else if (file.type === 'image') {
                    contentElement.innerHTML = `<img src="${file.content}" alt="Uploaded Image">`;
                } else if (file.type === 'video') {
                    contentElement.innerHTML = `<video controls src="${file.content}"></video>`;
                } else if (file.type === 'file') {
                    contentElement.innerHTML = `<div class="file-info"><i class="fas fa-file-alt"></i> <span>File uploaded</span></div>`;
                }
            }
            
            // Hiển thị nguồn
            if (sourcesElement) {
                if (file.result?.sources && file.result.sources.length > 0) {
                    sourcesElement.innerHTML = file.result.sources.map(s => `
                        <div class="source-item">
                            <p><strong>Đoạn trùng:</strong> "${s.matchedText.slice(0, 100)}${s.matchedText.length > 100 ? '...' : ''}"</p>
                            <p><strong>Nguồn:</strong> <a href="${s.link}" target="_blank">${s.title}</a></p>
                        </div>
                    `).join('');
                } else {
                    sourcesElement.innerHTML = '<p>Không tìm thấy nội dung trùng lặp.</p>';
                }
            }
            
            // Thêm sự kiện lắng nghe cho các nút
            const downloadButton = document.getElementById('download-detail');
            const deleteButton = document.getElementById('delete-history');
            const recheckButton = document.getElementById('recheck-history');
            
            if (downloadButton) {
                downloadButton.onclick = () => this.downloadResult(file);
            }
            
            if (deleteButton) {
                deleteButton.onclick = () => {
                    mainController.deleteHistory(file.id);
                    this.closeModal('history-detail-modal');
                    this.showNotification('Đã xóa kết quả khỏi lịch sử', 'success');
                };
            }
            
            if (recheckButton) {
                recheckButton.onclick = () => {
                    this.closeModal('history-detail-modal');
                    mainController.checkDuplicate(file.content, file.type);
                };
            }
            
            this.showModal('history-detail-modal');
        }
    }

    /**
     * Tải xuống kết quả kiểm tra dưới dạng tệp văn bản
     * @param {Object} result - Thông tin kết quả kiểm tra
     */
    static downloadResult(result) {
        // Tạo tóm tắt văn bản để tải xuống
        const content = `
MediaVault - Kết quả kiểm tra trùng lặp
Thời gian: ${new Date(result.timestamp || Date.now()).toLocaleString('vi-VN')}
Tỷ lệ trùng lặp: ${result.percentage}%
Loại nội dung: ${result.type}

Nội dung kiểm tra:
${result.content.substring(0, 1000)}${result.content.length > 1000 ? '...' : ''}

Nguồn trùng lặp:
${result.sources && result.sources.length > 0 
  ? result.sources.map(s => `- ${s.title} (${s.link})`).join('\n') 
  : 'Không tìm thấy nội dung trùng lặp.'}
        `;
        
        // Tạo liên kết tải xuống
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mediavault-report-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Hiển thị thông báo
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại thông báo (success, error, info, warning)
     */
    static showNotification(message, type = 'info') {
        // Tạo container thông báo nếu chưa tồn tại
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Tạo thông báo mới
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Xác định icon phù hợp theo loại thông báo
        let iconClass = 'fa-info-circle';
        if (type === 'success') {
            iconClass = 'fa-check-circle';
        } else if (type === 'error') {
            iconClass = 'fa-exclamation-circle';
        } else if (type === 'warning') {
            iconClass = 'fa-exclamation-triangle';
        }
        
        notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                <i class="fas ${iconClass}"></i>
            </div>
            <div class="notification-text">${message}</div>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        </div>
        `;
        
        notificationContainer.appendChild(notification);
        
        // Thêm sự kiện đóng thông báo
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s forwards';
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Tự động đóng thông báo sau 5 giây
        setTimeout(() => {
            if (notificationContainer.contains(notification)) {
                notification.style.animation = 'slideOut 0.3s forwards';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
    }

    /**
     * Định dạng nội dung để hiển thị
     * @param {string} content - Nội dung cần định dạng
     * @returns {string} Nội dung đã định dạng
     */
    formatContent(content) {
        if (!content) return '';
        
        // Nếu nội dung quá dài, cắt bớt
        const maxLength = 200;
        if (content.length > maxLength) {
            return this.escapeHtml(content.substring(0, maxLength)) + '...';
        }
        
        return this.escapeHtml(content);
    }

    /**
     * Escape HTML để tránh XSS
     * @param {string} text - Văn bản cần escape
     * @returns {string} Văn bản đã escape
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Định dạng kích thước tệp
     * @param {number} bytes - Kích thước tính bằng byte
     * @returns {string} Kích thước đã định dạng
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
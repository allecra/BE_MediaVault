/**
 * Lớp xử lý giao diện và tương tác người dùng cho trang lưu trữ
 * Hiển thị thông tin tệp, modal xem trước và các tương tác
 */
class StorageView {
    constructor() {
        // Các phần tử UI chính
        this.filePreviewModal = document.getElementById('file-preview-modal');
        this.filePreviewContent = document.getElementById('file-preview-content');
        this.filePreviewName = document.getElementById('file-preview-name');
        this.filePreviewInfo = document.getElementById('file-preview-info');
        this.filePreviewDownload = document.getElementById('file-preview-download');
        this.filePreviewCheck = document.getElementById('file-preview-check');
        this.filePreviewClose = document.getElementById('file-preview-close');
        
        // Phần tử upload và danh sách tệp
        this.uploadArea = document.getElementById('upload-area');
        this.fileUploadInput = document.getElementById('file-upload');
        this.uploadBtn = document.getElementById('upload-btn');
        this.filesList = document.getElementById('files-list');
        this.noFilesMessage = document.getElementById('no-files');
        this.filesPagination = document.getElementById('files-pagination');
        
        // Bộ lọc và sắp xếp
        this.searchInput = document.getElementById('search-files');
        this.sortSelect = document.getElementById('sort-files');
        this.filterTypeSelect = document.getElementById('filter-filetype');
        
        // Thống kê lưu trữ
        this.usedStorage = document.getElementById('used-storage');
        this.totalStorage = document.getElementById('total-storage');
        this.percentageStorage = document.getElementById('percentage-storage');
        this.storageBar = document.getElementById('storage-bar');
        
        // Thống kê loại tệp
        this.pdfCount = document.getElementById('pdf-count');
        this.docCount = document.getElementById('doc-count');
        this.imageCount = document.getElementById('image-count');
        this.videoCount = document.getElementById('video-count');
        this.otherCount = document.getElementById('other-count');
        
        // Hoạt động gần đây
        this.recentActivityList = document.getElementById('recent-activity-list');
        
        // Thiết lập trạng thái
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.isDragging = false;
        
        // Khởi tạo sự kiện
        this.initEvents();
    }

    /**
     * Khởi tạo sự kiện cho các phần tử UI
     */
    initEvents() {
        // Đóng modal khi nhấp vào nút đóng
        if (this.filePreviewClose) {
            this.filePreviewClose.addEventListener('click', () => {
                this.hideModal('file-preview-modal');
            });
        }
        
        // Đóng modal khi nhấp vào nền
        if (this.filePreviewModal) {
            this.filePreviewModal.addEventListener('click', (e) => {
                if (e.target === this.filePreviewModal) {
                    this.hideModal('file-preview-modal');
                }
            });
        }
        
        // Phím tắt để đóng modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
        
        // Sự kiện kéo và thả tệp
        if (this.uploadArea) {
            // Ngăn hành vi mặc định cho drag-over để cho phép thả tệp
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                this.uploadArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            
            // Thêm lớp active khi kéo tệp vào
            ['dragenter', 'dragover'].forEach(eventName => {
                this.uploadArea.addEventListener(eventName, () => {
                    this.uploadArea.classList.add('active');
                });
            });
            
            // Xóa lớp active khi kéo tệp ra ngoài
            ['dragleave', 'drop'].forEach(eventName => {
                this.uploadArea.addEventListener(eventName, () => {
                    this.uploadArea.classList.remove('active');
                });
            });
            
            // Xử lý khi thả tệp
            this.uploadArea.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileUpload(files);
                }
            });
            
            // Xử lý khi nhấp vào nút tải lên
            if (this.uploadBtn && this.fileUploadInput) {
                this.uploadBtn.addEventListener('click', () => {
                    this.fileUploadInput.click();
                });
                
                this.fileUploadInput.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        this.handleFileUpload(e.target.files);
                    }
                });
            }
        }
        
        // Sự kiện tìm kiếm, lọc và sắp xếp
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                this.currentPage = 1; // Reset về trang đầu khi tìm kiếm
                this.triggerFilesUpdate();
            });
        }
        
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', () => {
                this.triggerFilesUpdate();
            });
        }
        
        if (this.filterTypeSelect) {
            this.filterTypeSelect.addEventListener('change', () => {
                this.currentPage = 1; // Reset về trang đầu khi lọc
                this.triggerFilesUpdate();
            });
        }
    }
    
    /**
     * Trigger cập nhật danh sách tệp khi filter/sort thay đổi
     */
    triggerFilesUpdate() {
        // Method này sẽ được ghi đè bởi controller
        console.log('triggerFilesUpdate should be overridden by controller');
    }
    
    /**
     * Xử lý tải lên tệp
     * @param {FileList} files - Danh sách tệp
     */
    handleFileUpload(files) {
        // Method này sẽ được ghi đè bởi controller
        console.log('handleFileUpload should be overridden by controller');
    }

    /**
     * Hiển thị modal
     * @param {string} modalId - ID của modal cần hiển thị
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
            
            // Ngăn cuộn trang
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Ẩn modal
     * @param {string} modalId - ID của modal cần ẩn
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
            
            // Cho phép cuộn trang
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * Ẩn tất cả các modal
     */
    hideAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        });
        
        // Cho phép cuộn trang
        document.body.style.overflow = 'auto';
    }

    /**
     * Hiển thị danh sách tệp
     * @param {Array} files - Danh sách tệp
     */
    displayFiles(files) {
        if (!this.filesList) return;
        
        // Xóa danh sách tệp cũ
        this.filesList.innerHTML = '';
        
        // Lọc tệp theo bộ tìm kiếm và bộ lọc
        const filteredFiles = this.filterFiles(files);
        
        // Nếu không có tệp nào, hiển thị thông báo
        if (filteredFiles.length === 0) {
            if (this.noFilesMessage) {
                this.noFilesMessage.style.display = 'block';
            }
            if (this.filesPagination) {
                this.filesPagination.innerHTML = '';
            }
            return;
        }
        
        // Ẩn thông báo không có tệp
        if (this.noFilesMessage) {
            this.noFilesMessage.style.display = 'none';
        }
        
        // Tính toán vị trí bắt đầu và kết thúc cho trang hiện tại
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, filteredFiles.length);
        
        // Lấy tệp cho trang hiện tại
        const filesForCurrentPage = filteredFiles.slice(startIndex, endIndex);
        
        // Hiển thị từng tệp
        filesForCurrentPage.forEach((file) => {
            const fileElement = this.createFileElement(file);
            this.filesList.appendChild(fileElement);
        });
        
        // Tạo phân trang
        this.createPagination(filteredFiles.length);
    }
    
    /**
     * Lọc tệp theo các bộ lọc
     * @param {Array} files - Danh sách tệp gốc
     * @returns {Array} - Danh sách tệp đã lọc
     */
    filterFiles(files) {
        if (!files || !Array.isArray(files)) return [];
        
        let filteredFiles = [...files];
        
        // Lọc theo từ khóa tìm kiếm
        if (this.searchInput && this.searchInput.value.trim() !== '') {
            const searchTerm = this.searchInput.value.trim().toLowerCase();
            filteredFiles = filteredFiles.filter(file => 
                file.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Lọc theo loại tệp
        if (this.filterTypeSelect && this.filterTypeSelect.value !== 'all') {
            const fileType = this.filterTypeSelect.value;
            
            switch (fileType) {
                case 'document':
                    filteredFiles = filteredFiles.filter(file => 
                        file.type && (file.type.includes('pdf') || 
                                    file.type.includes('doc') || 
                                    file.type.includes('txt'))
                    );
                    break;
                    
                case 'image':
                    filteredFiles = filteredFiles.filter(file => 
                        file.type && file.type.includes('image')
                    );
                    break;
                    
                case 'video':
                    filteredFiles = filteredFiles.filter(file => 
                        file.type && file.type.includes('video')
                    );
                    break;
            }
        }
        
        // Sắp xếp tệp
        if (this.sortSelect) {
            const sortBy = this.sortSelect.value;
            
            switch (sortBy) {
                case 'newest':
                    filteredFiles.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
                    break;
                    
                case 'oldest':
                    filteredFiles.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
                    break;
                    
                case 'name':
                    filteredFiles.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                    
                case 'size':
                    filteredFiles.sort((a, b) => b.size - a.size);
                    break;
            }
        }
        
        return filteredFiles;
    }
    
    /**
     * Tạo phần tử HTML cho tệp
     * @param {Object} file - Thông tin tệp
     * @returns {HTMLElement} - Phần tử HTML
     */
    createFileElement(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileId = file.id;
        
        // Xác định icon dựa vào loại tệp
        let iconClass = 'fas fa-file';
        let iconColor = 'text-secondary';
        
        if (file.type) {
            if (file.type.includes('pdf')) {
                iconClass = 'fas fa-file-pdf';
                iconColor = 'text-danger';
            } else if (file.type.includes('doc')) {
                iconClass = 'fas fa-file-word';
                iconColor = 'text-primary';
            } else if (file.type.includes('image')) {
                iconClass = 'fas fa-file-image';
                iconColor = 'text-success';
            } else if (file.type.includes('video')) {
                iconClass = 'fas fa-file-video';
                iconColor = 'text-warning';
            } else if (file.type.includes('text')) {
                iconClass = 'fas fa-file-alt';
                iconColor = 'text-info';
            }
        }
        
        // Thông tin thời gian
        const uploadDate = new Date(file.uploadDate || Date.now());
        const dateStr = `${uploadDate.getDate()}/${uploadDate.getMonth() + 1}/${uploadDate.getFullYear()}`;
        
        // Thông tin kích thước
        const fileSize = this.formatFileSize(file.size || 0);
        
        fileItem.innerHTML = `
            <div class="file-icon ${iconColor}">
                <i class="${iconClass}"></i>
            </div>
            <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">
                    <span>${fileSize}</span>
                    <span>${dateStr}</span>
                </div>
            </div>
            <div class="file-actions">
                <button class="btn-icon preview-btn" title="Xem trước">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon download-btn" title="Tải xuống">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-icon delete-btn" title="Xóa">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        // Sự kiện xem trước tệp
        const previewBtn = fileItem.querySelector('.preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.showFilePreview(file);
            });
        }
        
        // Sự kiện tải xuống tệp
        const downloadBtn = fileItem.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadFile(file);
            });
        }
        
        // Sự kiện xóa tệp
        const deleteBtn = fileItem.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.confirmDeleteFile(file);
            });
        }
        
        return fileItem;
    }
    
    /**
     * Tạo phân trang
     * @param {number} totalItems - Tổng số tệp
     */
    createPagination(totalItems) {
        if (!this.filesPagination) return;
        
        this.filesPagination.innerHTML = '';
        
        // Tính tổng số trang
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        // Không hiển thị phân trang nếu chỉ có 1 trang
        if (totalPages <= 1) return;
        
        const pagination = document.createElement('ul');
        pagination.className = 'pagination';
        
        // Nút Trang trước
        if (this.currentPage > 1) {
            const prevItem = document.createElement('li');
            prevItem.className = 'page-item';
            const prevLink = document.createElement('a');
            prevLink.className = 'page-link';
            prevLink.innerHTML = '<i class="fas fa-chevron-left"></i>';
            prevLink.href = '#';
            prevLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.changePage(this.currentPage - 1);
            });
            prevItem.appendChild(prevLink);
            pagination.appendChild(prevItem);
        }
        
        // Hiển thị tối đa 5 trang
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Điều chỉnh lại startPage nếu endPage đã đạt giới hạn
        if (endPage === totalPages) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // Các nút trang
        for (let i = startPage; i <= endPage; i++) {
            const pageItem = document.createElement('li');
            pageItem.className = i === this.currentPage ? 'page-item active' : 'page-item';
            
            const pageLink = document.createElement('a');
            pageLink.className = 'page-link';
            pageLink.textContent = i;
            pageLink.href = '#';
            
            if (i !== this.currentPage) {
                pageLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.changePage(i);
                });
            }
            
            pageItem.appendChild(pageLink);
            pagination.appendChild(pageItem);
        }
        
        // Nút Trang sau
        if (this.currentPage < totalPages) {
            const nextItem = document.createElement('li');
            nextItem.className = 'page-item';
            const nextLink = document.createElement('a');
            nextLink.className = 'page-link';
            nextLink.innerHTML = '<i class="fas fa-chevron-right"></i>';
            nextLink.href = '#';
            nextLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.changePage(this.currentPage + 1);
            });
            nextItem.appendChild(nextLink);
            pagination.appendChild(nextItem);
        }
        
        this.filesPagination.appendChild(pagination);
    }
    
    /**
     * Đổi trang
     * @param {number} page - Số trang cần đổi
     */
    changePage(page) {
        this.currentPage = page;
        this.triggerFilesUpdate();
    }
    
    /**
     * Xác nhận xóa tệp
     * @param {Object} file - Thông tin tệp cần xóa
     */
    confirmDeleteFile(file) {
        if (!confirm(`Bạn có chắc chắn muốn xóa tệp "${file.name}"?`)) {
            return;
        }
        
        // Method này sẽ được ghi đè bởi controller
        console.log('deleteFile should be overridden by controller', file);
    }

    /**
     * Hiển thị modal xem trước tệp
     * @param {Object} file - Thông tin tệp cần xem trước
     */
    showFilePreview(file) {
        if (!this.filePreviewModal || !this.filePreviewContent) {
            console.error('File preview elements not found');
            return;
        }
        
        // Đặt tên tệp
        if (this.filePreviewName) {
            this.filePreviewName.textContent = file.name;
        }
        
        // Định dạng và hiển thị thông tin tệp
        if (this.filePreviewInfo) {
            const fileSize = this.formatFileSize(file.size || 0);
            const date = new Date(file.uploadDate || Date.now());
            const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            
            this.filePreviewInfo.textContent = `${fileSize} • ${dateStr}`;
        }
        
        // Đặt file ID cho các nút hành động
        const downloadFileBtn = document.getElementById('download-file');
        if (downloadFileBtn) {
            downloadFileBtn.dataset.fileId = file.id;
            downloadFileBtn.onclick = () => {
                this.downloadFile(file);
            };
        }
        
        const deleteFileBtn = document.getElementById('delete-file');
        if (deleteFileBtn) {
            deleteFileBtn.dataset.fileId = file.id;
        }
        
        // Đặt file ID cho nút kiểm tra
        const checkFileBtn = document.getElementById('file-preview-check');
        if (checkFileBtn) {
            checkFileBtn.dataset.fileId = file.id;
            checkFileBtn.onclick = () => {
                // Chuyển hướng đến trang kiểm tra trùng lặp với ID tệp
                window.location.href = `check.html?fileId=${file.id}`;
            };
        }
        
        // Cập nhật metadata hiển thị
        const fileTypeElem = document.getElementById('file-type');
        const fileSizeElem = document.getElementById('file-size');
        const fileDateElem = document.getElementById('file-date');
        
        if (fileTypeElem) {
            fileTypeElem.textContent = this.getFileTypeDisplay(file.type);
        }
        
        if (fileSizeElem) {
            fileSizeElem.textContent = this.formatFileSize(file.size || 0);
        }
        
        if (fileDateElem) {
            const uploadDate = new Date(file.uploadDate || Date.now());
            fileDateElem.textContent = uploadDate.toLocaleDateString('vi-VN');
        }
        
        // Xóa nội dung cũ
        this.filePreviewContent.innerHTML = '';
        
        // Hiển thị nội dung tệp dựa trên loại
        if (file.type && file.base64Content) {
            this.renderFileContent(file);
        } else {
            this.filePreviewContent.innerHTML = '<div class="preview-error">Không thể hiển thị xem trước</div>';
        }
        
        // Hiển thị modal
        this.showModal('file-preview-modal');
    }

    /**
     * Hiển thị nội dung tệp dựa trên loại
     * @param {Object} file - Thông tin tệp
     */
    renderFileContent(file) {
        const dataUrl = `data:${file.type};base64,${file.base64Content}`;
        
        // Xác định cách hiển thị dựa trên loại tệp
        if (file.type.includes('image')) {
            // Hiển thị hình ảnh
            this.filePreviewContent.innerHTML = `
                <div class="image-preview">
                    <img src="${dataUrl}" alt="${file.name}">
                </div>
            `;
            
        } else if (file.type.includes('video')) {
            // Hiển thị video
            this.filePreviewContent.innerHTML = `
                <div class="video-preview">
                    <video controls>
                        <source src="${dataUrl}" type="${file.type}">
                        Trình duyệt của bạn không hỗ trợ thẻ video.
                    </video>
                </div>
            `;
            
        } else if (file.type.includes('pdf')) {
            // Hiển thị PDF
            this.filePreviewContent.innerHTML = `
                <div class="pdf-preview">
                    <iframe src="${dataUrl}" frameborder="0"></iframe>
                </div>
            `;
            
        } else if (file.type.includes('text') || file.type.includes('javascript') || file.type.includes('json') || file.type.includes('html') || file.type.includes('css')) {
            // Hiển thị tệp văn bản
            // Đọc nội dung base64 thành văn bản
            try {
                const textContent = atob(file.base64Content);
                this.filePreviewContent.innerHTML = `
                    <div class="text-preview">
                        <pre>${this.escapeHtml(textContent)}</pre>
                    </div>
                `;
            } catch (error) {
                this.filePreviewContent.innerHTML = `
                    <div class="preview-error">
                        Không thể hiển thị nội dung tệp văn bản
                    </div>
                `;
            }
            
        } else if (file.type.includes('word') || file.type.includes('document')) {
            // Thông báo không hỗ trợ xem trước cho tài liệu Word
            this.filePreviewContent.innerHTML = `
                <div class="preview-not-supported">
                    <i class="fas fa-file-word fa-4x"></i>
                    <p>Không thể hiển thị xem trước cho tài liệu Microsoft Word.</p>
                    <p>Vui lòng tải tệp xuống để xem nội dung.</p>
                </div>
            `;
            
        } else {
            // Loại tệp không được hỗ trợ
            this.filePreviewContent.innerHTML = `
                <div class="preview-not-supported">
                    <i class="fas fa-file fa-4x"></i>
                    <p>Không hỗ trợ xem trước cho loại tệp này.</p>
                    <p>Vui lòng tải tệp xuống để xem nội dung.</p>
                </div>
            `;
        }
    }

    /**
     * Escape HTML để ngăn ngừa XSS
     * @param {string} html - Chuỗi HTML cần escape
     * @returns {string} - Chuỗi đã được escape
     */
    escapeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    /**
     * Tải xuống tệp
     * @param {Object} file - Thông tin tệp cần tải xuống
     */
    downloadFile(file) {
        if (!file.base64Content) {
            console.error('No file content available for download');
            return;
        }
        
        try {
            // Tạo URL dữ liệu
            const contentType = file.type || 'application/octet-stream';
            const dataUrl = `data:${contentType};base64,${file.base64Content}`;
            
            // Tạo liên kết tải xuống
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = file.name;
            document.body.appendChild(link);
            
            // Nhấp vào liên kết để tải xuống
            link.click();
            
            // Dọn dẹp
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Không thể tải xuống tệp. Vui lòng thử lại sau.');
        }
    }

    /**
     * Định dạng kích thước tệp
     * @param {number} size - Kích thước tệp tính bằng byte
     * @returns {string} - Chuỗi đã định dạng
     */
    formatFileSize(size) {
        if (size < 1024) {
            return size + ' B';
        } else if (size < 1024 * 1024) {
            return (size / 1024).toFixed(1) + ' KB';
        } else if (size < 1024 * 1024 * 1024) {
            return (size / (1024 * 1024)).toFixed(1) + ' MB';
        } else {
            return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
        }
    }
    
    /**
     * Cập nhật hiển thị thông tin lưu trữ
     * @param {Object} storage - Thông tin lưu trữ
     */
    updateStorageInfo(storage) {
        const { used, total, percentage } = storage;
        
        if (this.usedStorage) {
            this.usedStorage.textContent = this.formatFileSize(used);
        }
        
        if (this.totalStorage) {
            this.totalStorage.textContent = this.formatFileSize(total);
        }
        
        if (this.percentageStorage) {
            this.percentageStorage.textContent = `${percentage.toFixed(1)}%`;
        }
        
        if (this.storageBar) {
            this.storageBar.style.width = `${percentage}%`;
            
            // Đổi màu thanh tiến trình dựa vào phần trăm sử dụng
            this.storageBar.className = 'storage-bar';
            if (percentage > 90) {
                this.storageBar.classList.add('danger');
            } else if (percentage > 70) {
                this.storageBar.classList.add('warning');
            }
        }
    }
    
    /**
     * Cập nhật thống kê loại tệp
     * @param {Object} counts - Số lượng các loại tệp
     */
    updateFileTypeCounts(counts) {
        const { pdf, doc, image, video, other } = counts;
        
        if (this.pdfCount) this.pdfCount.textContent = pdf;
        if (this.docCount) this.docCount.textContent = doc;
        if (this.imageCount) this.imageCount.textContent = image;
        if (this.videoCount) this.videoCount.textContent = video;
        if (this.otherCount) this.otherCount.textContent = other;
    }
    
    /**
     * Hiển thị hoạt động gần đây
     * @param {Array} activities - Danh sách hoạt động
     */
    displayRecentActivities(activities) {
        if (!this.recentActivityList) return;
        
        if (!activities || activities.length === 0) {
            this.recentActivityList.innerHTML = '<p class="text-center text-muted">Chưa có hoạt động nào</p>';
            return;
        }
        
        this.recentActivityList.innerHTML = '';
        
        // Giới hạn hiển thị 5 hoạt động gần nhất
        const recentActivities = activities.slice(0, 5);
        
        recentActivities.forEach(activity => {
            const date = new Date(activity.timestamp);
            const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item d-flex justify-content-between align-items-center';
            
            let actionIcon;
            switch (activity.action) {
                case 'upload':
                    actionIcon = '<i class="fas fa-upload text-success"></i>';
                    break;
                case 'download':
                    actionIcon = '<i class="fas fa-download text-primary"></i>';
                    break;
                case 'delete':
                    actionIcon = '<i class="fas fa-trash-alt text-danger"></i>';
                    break;
                case 'check':
                    actionIcon = '<i class="fas fa-search text-info"></i>';
                    break;
                default:
                    actionIcon = '<i class="fas fa-file-alt text-secondary"></i>';
            }
            
            activityItem.innerHTML = `
                <div>
                    <div class="d-flex align-items-center">
                        ${actionIcon}
                        <span class="ms-2 activity-name">${activity.fileName}</span>
                    </div>
                    <small class="text-muted">${dateStr}</small>
                </div>
                <span class="badge ${activity.action === 'delete' ? 'bg-danger' : 'bg-primary'}">${this.getActionLabel(activity.action)}</span>
            `;
            
            this.recentActivityList.appendChild(activityItem);
        });
    }
    
    /**
     * Lấy nhãn cho hành động
     * @param {string} action - Loại hành động
     * @returns {string} - Nhãn hành động
     */
    getActionLabel(action) {
        switch (action) {
            case 'upload': return 'Tải lên';
            case 'download': return 'Tải xuống';
            case 'delete': return 'Xóa';
            case 'check': return 'Kiểm tra';
            default: return 'Hoạt động';
        }
    }

    /**
     * Lấy tên hiển thị cho loại tệp
     * @param {string} mimeType - MIME type của tệp tin
     * @returns {string} - Tên hiển thị của loại tệp
     */
    getFileTypeDisplay(mimeType) {
        if (!mimeType) return 'Không xác định';
        
        if (mimeType.includes('pdf')) {
            return 'PDF Document';
        } else if (mimeType.includes('word') || mimeType.includes('document')) {
            return 'Word Document';
        } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
            return 'Excel Spreadsheet';
        } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
            return 'PowerPoint Presentation';
        } else if (mimeType.includes('image')) {
            return 'Image';
        } else if (mimeType.includes('video')) {
            return 'Video';
        } else if (mimeType.includes('audio')) {
            return 'Audio';
        } else if (mimeType.includes('text')) {
            return 'Text Document';
        } else if (mimeType.includes('zip') || mimeType.includes('compressed')) {
            return 'Archive';
        } else {
            return mimeType.split('/')[1]?.toUpperCase() || 'Unknown';
        }
    }

    /**
     * Hiển thị modal upload
     * @param {string} fileName - Tên tệp đang được tải lên
     */
    showUploadModal(fileName) {
        // Kiểm tra xem modal đã tồn tại chưa
        let uploadModal = document.getElementById('upload-progress-modal');
        
        // Nếu chưa có, tạo modal mới
        if (!uploadModal) {
            uploadModal = document.createElement('div');
            uploadModal.id = 'upload-progress-modal';
            uploadModal.className = 'modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            const header = document.createElement('h3');
            header.textContent = 'Đang tải lên';
            
            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            
            const progressFill = document.createElement('div');
            progressFill.id = 'upload-progress-fill';
            progressFill.className = 'progress-fill success';
            progressFill.style.width = '0%';
            
            const fileNameElement = document.createElement('div');
            fileNameElement.id = 'upload-file-name';
            fileNameElement.className = 'mt-2 text-center';
            
            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressBar);
            modalContent.appendChild(header);
            modalContent.appendChild(progressContainer);
            modalContent.appendChild(fileNameElement);
            uploadModal.appendChild(modalContent);
            
            document.body.appendChild(uploadModal);
        }
        
        // Cập nhật tên tệp
        const fileNameElement = document.getElementById('upload-file-name');
        if (fileNameElement) {
            fileNameElement.textContent = fileName || 'Đang tải lên tệp...';
        }
        
        // Reset progress bar
        const progressFill = document.getElementById('upload-progress-fill');
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        
        // Hiển thị modal
        this.showModal('upload-progress-modal');
        
        // Bắt đầu animation giả lập tiến trình
        this.simulateUploadProgress();
    }
    
    /**
     * Giả lập tiến trình tải lên
     */
    simulateUploadProgress() {
        let progress = 0;
        const progressFill = document.getElementById('upload-progress-fill');
        
        if (!progressFill) return;
        
        // Xóa interval cũ nếu có
        if (this.uploadProgressInterval) {
            clearInterval(this.uploadProgressInterval);
        }
        
        // Cập nhật tiến trình mỗi 100ms
        this.uploadProgressInterval = setInterval(() => {
            // Tăng tiến trình nhanh lúc đầu, chậm dần về sau
            if (progress < 30) {
                progress += 2;
            } else if (progress < 60) {
                progress += 1;
            } else if (progress < 90) {
                progress += 0.5;
            } else if (progress < 98) {
                progress += 0.1;
            }
            
            if (progress >= 98) {
                progress = 98; // Giữ ở 98% cho đến khi hoàn tất
                clearInterval(this.uploadProgressInterval);
            }
            
            progressFill.style.width = `${progress}%`;
        }, 100);
    }
    
    /**
     * Ẩn modal upload
     * @param {boolean} success - Trạng thái tải lên thành công hay thất bại
     */
    hideUploadModal(success = true) {
        // Dừng interval tiến trình
        if (this.uploadProgressInterval) {
            clearInterval(this.uploadProgressInterval);
        }
        
        // Cập nhật tiến trình thành công/thất bại
        const progressFill = document.getElementById('upload-progress-fill');
        if (progressFill) {
            progressFill.style.width = success ? '100%' : '0%';
            
            if (!success) {
                progressFill.classList.remove('success');
                progressFill.classList.add('error');
            }
        }
        
        // Đợi 500ms để hoàn tất animation
        setTimeout(() => {
            this.hideModal('upload-progress-modal');
        }, 500);
    }
} 
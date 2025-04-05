/**
 * Performance utilities for MediaVault
 */
class PerformanceUtils {
    /**
     * Creates a debounced function that delays invoking func until after wait milliseconds
     * @param {Function} func - The function to debounce
     * @param {number} wait - The number of milliseconds to delay
     * @returns {Function} - The debounced function
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Creates a throttled function that only invokes func at most once per every limit milliseconds
     * @param {Function} func - The function to throttle
     * @param {number} limit - The number of milliseconds to throttle invocations to
     * @returns {Function} - The throttled function
     */
    static throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Lazily loads images when they come into viewport
     * Automatically finds all images with data-src attribute and loads them when visible
     */
    static setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const lazyImageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const lazyImage = entry.target;
                        if (lazyImage.dataset.src) {
                            lazyImage.src = lazyImage.dataset.src;
                            lazyImage.removeAttribute('data-src');
                            lazyObserver.unobserve(lazyImage);
                        }
                    }
                });
            });

            // Find all images with data-src attribute
            document.querySelectorAll('img[data-src]').forEach(img => {
                lazyImageObserver.observe(img);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }
    }

    /**
     * Adds loading indicator to an element during async operations
     * @param {HTMLElement} element - The element to add loading indicator to
     * @param {Promise} promise - The promise to wait for
     * @param {string} loadingText - Optional loading text
     * @returns {Promise} - The original promise
     */
    static async withLoading(element, promise, loadingText = 'Đang xử lý...') {
        const originalContent = element.innerHTML;
        const originalDisabled = element.disabled;
        
        try {
            // Add loading state
            element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
            element.disabled = true;
            
            // Wait for the promise to resolve
            const result = await promise;
            return result;
        } finally {
            // Restore original state
            element.innerHTML = originalContent;
            element.disabled = originalDisabled;
        }
    }
    
    /**
     * Optimizes animations by using requestAnimationFrame
     * @param {Function} callback - The animation callback
     */
    static optimizeAnimation(callback) {
        return window.requestAnimationFrame(callback);
    }
    
    /**
     * Efficiently updates multiple DOM elements in a batch to reduce repaints
     * @param {Function} updateFunc - Function containing DOM updates
     */
    static batchDomUpdates(updateFunc) {
        // Read any measurements before updates
        const measurements = {};
        
        // Schedule visual updates
        window.requestAnimationFrame(() => {
            updateFunc(measurements);
        });
    }
    
    /**
     * Analyzes and logs performance issues
     */
    static monitorPerformance() {
        if (window.performance && console && console.log) {
            // Log navigation timing
            const perfData = window.performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            
            console.log('⚡ Page load time:', pageLoadTime + 'ms');
            
            // Monitor long tasks
            if ('PerformanceObserver' in window) {
                try {
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            console.warn('🔴 Long task detected:', entry.duration + 'ms', entry);
                        }
                    });
                    
                    observer.observe({entryTypes: ['longtask']});
                } catch (e) {
                    console.error('PerformanceObserver error:', e);
                }
            }
        }
    }
}

// Initialize performance monitoring
document.addEventListener('DOMContentLoaded', () => {
    PerformanceUtils.setupLazyLoading();
    PerformanceUtils.monitorPerformance();
});

// Export to global scope
window.PerformanceUtils = PerformanceUtils; 
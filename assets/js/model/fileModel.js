class FileModel {
    constructor(mongoDB) {
        this.mongoDB = mongoDB;
        this.files = [];
        this.shares = [];
        this.loadFiles();
        this.loadShares();
    }

    async loadFiles() {
        try {
            this.files = await this.mongoDB.find('files');
            console.log('Loaded files:', this.files.length);
        } catch (error) {
            console.error('Lỗi khi tải files:', error);
            this.files = JSON.parse(localStorage.getItem('files')) || [];
        }
    }

    async loadShares() {
        try {
            this.shares = await this.mongoDB.find('shares');
        } catch (error) {
            console.error('Lỗi khi tải shares:', error);
            this.shares = JSON.parse(localStorage.getItem('shares')) || [];
        }
    }

    async saveFile(file) {
        try {
            // Add timestamp if not present
            if (!file.timestamp) {
                file.timestamp = new Date().toISOString();
            }
            
            // Save to MongoDB
            const result = await this.mongoDB.save('files', file);
            if (result && result.insertedId) {
                file._id = result.insertedId;
            }
            
            // Add to local cache
            this.files.push(file);
            localStorage.setItem('files', JSON.stringify(this.files));
            return file;
        } catch (error) {
            console.error('Error saving file:', error);
            // Fall back to local storage only
            this.files.push(file);
            localStorage.setItem('files', JSON.stringify(this.files));
            return file;
        }
    }

    async saveShare(share) {
        try {
            // Add timestamp if not present
            if (!share.timestamp) {
                share.timestamp = new Date().toISOString();
            }
            
            // Save to MongoDB
            const result = await this.mongoDB.save('shares', share);
            if (result && result.insertedId) {
                share._id = result.insertedId;
            }
            
            // Add to local cache
            this.shares.push(share);
            localStorage.setItem('shares', JSON.stringify(this.shares));
            return share;
        } catch (error) {
            console.error('Error saving share:', error);
            // Fall back to local storage only
            this.shares.push(share);
            localStorage.setItem('shares', JSON.stringify(this.shares));
            return share;
        }
    }

    getFiles() {
        return this.files;
    }

    getShares() {
        return this.shares;
    }
    
    async getUserFiles(userId) {
        try {
            // First check if we need to reload files (they might have changed)
            await this.loadFiles();
            
            // Filter files by userId
            return this.files.filter(file => 
                file.userId === userId || 
                file.userEmail === userId ||  // Support for legacy files that might use email as identifier
                file._id === userId           // Support for searching by file ID
            );
        } catch (error) {
            console.error('Error getting user files:', error);
            // Fall back to local cache
            return this.files.filter(file => 
                file.userId === userId || 
                file.userEmail === userId || 
                file._id === userId
            );
        }
    }
    
    async getFileById(fileId) {
        try {
            // First check local cache
            const cachedFile = this.files.find(file => file.id === fileId || file._id === fileId);
            if (cachedFile) return cachedFile;
            
            // If not found in cache, query database
            const files = await this.mongoDB.find('files', { id: fileId });
            if (files && files.length > 0) {
                return files[0];
            }
            
            // If still not found, try searching by MongoDB _id
            const filesById = await this.mongoDB.find('files', { _id: fileId });
            if (filesById && filesById.length > 0) {
                return filesById[0];
            }
            
            return null;
        } catch (error) {
            console.error('Error getting file by ID:', error);
            // Fall back to local cache only
            return this.files.find(file => file.id === fileId || file._id === fileId) || null;
        }
    }
    
    async deleteFile(fileId) {
        try {
            // Delete from MongoDB
            await this.mongoDB.delete('files', { 
                $or: [{ id: fileId }, { _id: fileId }]
            });
            
            // Remove from local cache
            this.files = this.files.filter(file => file.id !== fileId && file._id !== fileId);
            localStorage.setItem('files', JSON.stringify(this.files));
            
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            // Fall back to modifying local cache only
            this.files = this.files.filter(file => file.id !== fileId && file._id !== fileId);
            localStorage.setItem('files', JSON.stringify(this.files));
            return true;
        }
    }
    
    async deleteOldFiles(userId, daysToKeep) {
        try {
            const userFiles = await this.getUserFiles(userId);
            const now = new Date();
            const cutoffDate = new Date(now.setDate(now.getDate() - daysToKeep));
            
            const oldFiles = userFiles.filter(file => {
                const fileDate = new Date(file.timestamp);
                return fileDate < cutoffDate;
            });
            
            // Delete old files
            for (const file of oldFiles) {
                await this.deleteFile(file.id || file._id);
            }
            
            return {
                deleted: oldFiles.length,
                remaining: (await this.getUserFiles(userId)).length
            };
        } catch (error) {
            console.error('Error cleaning up old files:', error);
            return { error: error.message };
        }
    }
    
    async cleanupBasedOnPlan(userId, userPlan) {
        try {
            let daysToKeep = 365; // Default to keeping files for a year
            
            // Adjust days to keep based on plan
            if (userPlan === 'free') {
                daysToKeep = 7; // Free users: 7 days
            } else if (userPlan === 'basic') {
                daysToKeep = 30; // Basic users: 30 days
            } else if (userPlan === 'premium') {
                daysToKeep = 365; // Premium users: 1 year
            } else if (userPlan === 'business') {
                daysToKeep = 1825; // Business users: 5 years
            }
            
            return await this.deleteOldFiles(userId, daysToKeep);
        } catch (error) {
            console.error('Error during plan-based cleanup:', error);
            return { error: error.message };
        }
    }
}
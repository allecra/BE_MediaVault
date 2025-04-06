/**
 * MediaVault Configuration
 */
const CONFIG = {
    // MongoDB Configuration
    MONGODB_API_KEY: "xrbsk", // MongoDB Atlas Data API App ID (without "data-" prefix)
    MONGODB_PRIVATE_KEY: "603be368-8b71-4e66-8b30-d1cacb64ac50",
    MONGODB_CONNECTION_STRING: "mongodb+srv://tam2632005:123@tamtam.0fe2k.mongodb.net/MediaVault?retryWrites=true&w=majority&appName=tamtam",
    MONGODB_DATABASE: "MediaVault",
    MONGODB_DATA_SOURCE: "Cluster0",
    
    // Copyleaks API Configuration (currently inactive - using alternative method)
    COPYLEAKS_API_KEY: "40c551b8-388f-48c5-8b4b-60e7c0220b2a",
    
    // Application Settings
    DEBUG_MODE: true,
    LOCAL_STORAGE_FALLBACK: true,
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
};

// Make configuration available globally
window.CONFIG = CONFIG; 
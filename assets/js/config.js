/**
 * MediaVault Configuration
 */
const CONFIG = {
    // MongoDB Configuration
    MONGODB_API_KEY: "data-mtmeo", // Updated to correct Atlas App ID
    MONGODB_PRIVATE_KEY: "603be368-8b71-4e66-8b30-d1cacb64ac50",
    MONGODB_CONNECTION_STRING: "mongodb+srv://tam2632005:123@tamtam.0fe2k.mongodb.net/MediaVault?retryWrites=true&w=majority&appName=tamtam",
    MONGODB_DATABASE: "MediaVault", // Updated to match actual database name
    MONGODB_DATA_SOURCE: "tamtam",
    
    // Copyleaks API Configuration
    COPYLEAKS_API_KEY: "514fdab5-17a4-4cc7-94c5-90b8f5a25618",
    
    // Application Settings
    DEBUG_MODE: true,
    LOCAL_STORAGE_FALLBACK: true,
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
};

// Make configuration available globally
window.CONFIG = CONFIG; 
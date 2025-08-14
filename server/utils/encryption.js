const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits

/**
 * Generate a secure encryption key from password and salt
 * @param {string} password - Master password from environment
 * @param {Buffer} salt - Random salt
 * @returns {Buffer} Derived key
 */
function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt sensitive data (like SMTP passwords)
 * @param {string} text - Plain text to encrypt
 * @param {string} masterPassword - Master password from environment
 * @returns {string} Encrypted data as base64 string
 */
function encrypt(text, masterPassword) {
    try {
        if (!text || !masterPassword) {
            throw new Error('Text and master password are required');
        }

        // Generate random salt and IV
        const salt = crypto.randomBytes(SALT_LENGTH);
        const iv = crypto.randomBytes(IV_LENGTH);
        
        // Derive key from master password and salt
        const key = deriveKey(masterPassword, salt);
        
        // Create cipher
        const cipher = crypto.createCipher(ALGORITHM, key);
        cipher.setAAD(salt); // Additional authenticated data
        
        // Encrypt the text
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Get authentication tag
        const tag = cipher.getAuthTag();
        
        // Combine salt + iv + tag + encrypted data
        const combined = Buffer.concat([
            salt,
            iv,
            tag,
            Buffer.from(encrypted, 'hex')
        ]);
        
        return combined.toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Base64 encrypted string
 * @param {string} masterPassword - Master password from environment
 * @returns {string} Decrypted plain text
 */
function decrypt(encryptedData, masterPassword) {
    try {
        if (!encryptedData || !masterPassword) {
            throw new Error('Encrypted data and master password are required');
        }

        // Convert from base64
        const combined = Buffer.from(encryptedData, 'base64');
        
        // Extract components
        const salt = combined.slice(0, SALT_LENGTH);
        const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
        const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
        
        // Derive key from master password and salt
        const key = deriveKey(masterPassword, salt);
        
        // Create decipher
        const decipher = crypto.createDecipher(ALGORITHM, key);
        decipher.setAAD(salt); // Additional authenticated data
        decipher.setAuthTag(tag);
        
        // Decrypt the data
        let decrypted = decipher.update(encrypted, null, 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Generate a secure random master password
 * @param {number} length - Password length (default: 32)
 * @returns {string} Random password
 */
function generateMasterPassword(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, charset.length);
        password += charset[randomIndex];
    }
    
    return password;
}

/**
 * Hash a password for storage (one-way)
 * @param {string} password - Plain text password
 * @param {string} salt - Optional salt (will generate if not provided)
 * @returns {object} Object with hash and salt
 */
function hashPassword(password, salt = null) {
    try {
        if (!salt) {
            salt = crypto.randomBytes(32).toString('hex');
        }
        
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        
        return {
            hash,
            salt
        };
    } catch (error) {
        console.error('Password hashing error:', error);
        throw new Error('Failed to hash password');
    }
}

/**
 * Verify a password against its hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored hash
 * @param {string} salt - Stored salt
 * @returns {boolean} True if password matches
 */
function verifyPassword(password, hash, salt) {
    try {
        const hashToVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return hash === hashToVerify;
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Random token as hex string
 */
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Create HMAC signature for data integrity
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} HMAC signature
 */
function createHMAC(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - HMAC signature to verify
 * @param {string} secret - Secret key
 * @returns {boolean} True if signature is valid
 */
function verifyHMAC(data, signature, secret) {
    const expectedSignature = createHMAC(data, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}

module.exports = {
    encrypt,
    decrypt,
    generateMasterPassword,
    hashPassword,
    verifyPassword,
    generateSecureToken,
    createHMAC,
    verifyHMAC
};

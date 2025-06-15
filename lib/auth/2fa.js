import speakeasy from 'speakeasy';
import crypto from 'crypto';
import qrcode from 'qrcode';

/**
 * Generate a new TOTP secret for a user
 * @param {string} userId - The user's ID
 * @param {string} email - The user's email
 * @param {string} appName - The application name for the TOTP
 * @returns {Object} - The generated secret and otpauthURL
 */
export function generateTOTPSecret(userId, email, appName = 'TeamSync') {
  // Generate a secret
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `${appName}:${email}`
  });

  return {
    userId,
    secret: secret.base32,
    otpauthURL: secret.otpauth_url
  };
}

/**
 * Generate a QR code for the TOTP setup
 * @param {string} otpauthURL - The otpauth URL
 * @returns {Promise<string>} - The QR code data URL
 */
export async function generateQRCode(otpauthURL) {
  try {
    const qrCodeData = await qrcode.toDataURL(otpauthURL);
    return qrCodeData;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Validate a TOTP token
 * @param {string} token - The token to validate
 * @param {string} secret - The user's TOTP secret
 * @returns {boolean} - True if the token is valid
 */
export function validateTOTP(token, secret) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1 // Allow a window of 1 step (±30 seconds) to account for time drift
  });
}

/**
 * Generate a random 6-digit code for email verification
 * @returns {string} - A 6-digit verification code
 */
export function generateEmailVerificationCode() {
  // Generate a secure random 6-digit code
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Encrypt sensitive data like TOTP secrets
 * @param {string} text - The text to encrypt
 * @param {string} encryptionKey - The encryption key
 * @returns {string} - The encrypted text
 */
export function encrypt(text, encryptionKey) {
  if (!encryptionKey) {
    throw new Error('Encryption key is required');
  }
  
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(encryptionKey).digest('base64').substr(0, 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt sensitive data like TOTP secrets
 * @param {string} encryptedText - The text to decrypt
 * @param {string} encryptionKey - The encryption key
 * @returns {string} - The decrypted text
 */
export function decrypt(encryptedText, encryptionKey) {
  if (!encryptionKey) {
    throw new Error('Encryption key is required');
  }
  
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedData = Buffer.from(textParts.join(':'), 'hex');
  const key = crypto.createHash('sha256').update(encryptionKey).digest('base64').substr(0, 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
} 
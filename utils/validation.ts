/**
 * Input Validation and Sanitization Utilities
 * Client-side validation for Mohamed Atta Education Platform
 */

// Maximum lengths for various input types
const MAX_LENGTHS = {
  searchQuery: 100,
  name: 100,
  email: 254, // RFC 5321
  phone: 20,
  nationalId: 14,
  bio: 2000,
  title: 200,
  description: 5000,
  password: 128,
};

// Arabic error messages
export const ERROR_MESSAGES = {
  invalidEmail: 'البريد الإلكتروني غير صالح',
  invalidPhone: 'رقم الهاتف غير صالح. يجب أن يبدأ بـ +20 أو 01 ويتكون من 10-11 رقماً',
  invalidNationalId: 'الرقم القومي غير صالح. يجب أن يتكون من 14 رقماً',
  inputTooLong: (field: string) => `${field} طويل جداً`,
  invalidCharacters: 'يحتوي على أحرف غير مسموح بها',
  required: 'هذا الحقل مطلوب',
  invalidPrice: 'السعر غير صالح',
  invalidId: 'معرف غير صالح',
};

/**
 * Sanitize search query by removing special characters and limiting length
 * @param query - Raw search query string
 * @returns Sanitized query string
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = query.trim();

  // Limit length
  if (sanitized.length > MAX_LENGTHS.searchQuery) {
    sanitized = sanitized.substring(0, MAX_LENGTHS.searchQuery);
  }

  // Remove potentially dangerous characters but keep Arabic, English, numbers, and basic punctuation
  // Allow: Arabic chars (\u0600-\u06FF), English letters, numbers, spaces, hyphens, underscores
  sanitized = sanitized.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9\s\-_.,]/g, '');

  // Remove multiple consecutive spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * General input sanitization
 * @param input - Raw input string
 * @param maxLength - Optional maximum length (defaults to 1000)
 * @returns Sanitized string
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  const limit = Math.min(maxLength, 10000); // Hard cap at 10000
  if (sanitized.length > limit) {
    sanitized = sanitized.substring(0, limit);
  }

  // Remove control characters and null bytes
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Escape HTML special characters to prevent XSS
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}

/**
 * Sanitize without HTML escaping (for non-HTML content)
 * @param input - Raw input string
 * @param maxLength - Optional maximum length
 * @returns Sanitized string
 */
export function sanitizePlainText(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  const limit = Math.min(maxLength, 10000);
  if (sanitized.length > limit) {
    sanitized = sanitized.substring(0, limit);
  }

  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns Boolean indicating if email is valid
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmed = email.trim();

  // Check length
  if (trimmed.length > MAX_LENGTHS.email || trimmed.length < 5) {
    return false;
  }

  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(trimmed);
}

/**
 * Validate Egyptian phone number
 * Supports formats: +20xxxxxxxxxx, 01xxxxxxxx (10-11 digits after prefix)
 * @param phone - Phone number string
 * @returns Boolean indicating if phone is valid
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Check if it starts with +20 or 01 or 1
  if (cleaned.startsWith('+20')) {
    cleaned = cleaned.substring(3); // Remove +20
  } else if (cleaned.startsWith('20') && cleaned.length === 12) {
    cleaned = cleaned.substring(2); // Remove 20 prefix
  } else if (cleaned.startsWith('01')) {
    cleaned = cleaned.substring(2); // Remove 01
  } else if (cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = cleaned.substring(1); // Remove 1 prefix
  }

  // Should have 9-10 digits remaining (total 10-11 including prefix)
  if (cleaned.length < 9 || cleaned.length > 10) {
    return false;
  }

  // Check that all remaining characters are digits
  return /^\d{9,10}$/.test(cleaned);
}

/**
 * Format phone number to standard format
 * @param phone - Phone number string
 * @returns Formatted phone number or empty string if invalid
 */
export function formatPhoneNumber(phone: string): string {
  if (!validatePhoneNumber(phone)) {
    return '';
  }

  let cleaned = phone.replace(/[^\d+]/g, '');

  // Convert to +20 format
  if (cleaned.startsWith('+20')) {
    return cleaned;
  } else if (cleaned.startsWith('20') && cleaned.length === 12) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('01')) {
    return '+20' + cleaned.substring(1);
  } else if (cleaned.startsWith('1') && cleaned.length === 10) {
    return '+20' + cleaned;
  } else if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return '+20' + cleaned.substring(1);
  }

  return '+20' + cleaned;
}

/**
 * Validate Egyptian National ID
 * Egyptian National ID is 14 digits with specific validation rules
 * @param id - National ID string
 * @returns Boolean indicating if ID is valid
 */
export function validateNationalId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Remove any non-digit characters
  const cleaned = id.replace(/\D/g, '');

  // Must be exactly 14 digits
  if (cleaned.length !== MAX_LENGTHS.nationalId) {
    return false;
  }

  // First digit must be 2 or 3 (representing birth century: 1900s or 2000s)
  const century = parseInt(cleaned[0], 10);
  if (century !== 2 && century !== 3) {
    return false;
  }

  // Next 2 digits are birth year (00-99)
  const year = parseInt(cleaned.substring(1, 3), 10);
  if (year < 0 || year > 99) {
    return false;
  }

  // Next 2 digits are birth month (01-12)
  const month = parseInt(cleaned.substring(3, 5), 10);
  if (month < 1 || month > 12) {
    return false;
  }

  // Next 2 digits are birth day (01-31)
  const day = parseInt(cleaned.substring(5, 7), 10);
  if (day < 1 || day > 31) {
    return false;
  }

  // Basic date validation
  const daysInMonth = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month]) {
    return false;
  }

  // Next 2 digits are governorate code (01-35, with some gaps)
  const governorate = parseInt(cleaned.substring(7, 9), 10);
  const validGovernorates = [
    1, 2, 3, 4, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29,
    31, 32, 33, 34, 35, 88
  ];
  if (!validGovernorates.includes(governorate)) {
    return false;
  }

  return true;
}

/**
 * Validate numeric ID (for API calls)
 * @param id - ID to validate (string or number)
 * @returns Boolean indicating if ID is valid
 */
export function validateNumericId(id: string | number): boolean {
  if (id === null || id === undefined) {
    return false;
  }

  const str = String(id).trim();

  // Must be a positive integer
  return /^\d+$/.test(str) && parseInt(str, 10) > 0;
}

/**
 * Validate GUID/UUID format
 * @param guid - GUID string to validate
 * @returns Boolean indicating if GUID is valid
 */
export function validateGuid(guid: string): boolean {
  if (!guid || typeof guid !== 'string') {
    return false;
  }

  const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return guidRegex.test(guid.trim());
}

/**
 * Validate price (non-negative number with max 2 decimal places)
 * @param price - Price value to validate
 * @returns Boolean indicating if price is valid
 */
export function validatePrice(price: number): boolean {
  if (typeof price !== 'number' || isNaN(price)) {
    return false;
  }

  // Must be non-negative
  if (price < 0) {
    return false;
  }

  // Max reasonable price (1 million EGP)
  if (price > 1000000) {
    return false;
  }

  // Check decimal places (max 2)
  const decimalPart = price.toString().split('.')[1];
  if (decimalPart && decimalPart.length > 2) {
    return false;
  }

  return true;
}

/**
 * Validate URL format
 * @param url - URL string to validate
 * @returns Boolean indicating if URL is valid
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize URL - ensure it's a safe URL
 * @param url - URL string to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();

  // Reject javascript: and data: protocols
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return '';
  }

  if (!validateUrl(trimmed)) {
    return '';
  }

  return trimmed;
}

/**
 * Validate name (first and last name)
 * @param name - Name string to validate
 * @returns Boolean indicating if name is valid
 */
export function validateName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const trimmed = name.trim();

  // Length check
  if (trimmed.length < 2 || trimmed.length > MAX_LENGTHS.name) {
    return false;
  }

  // Allow Arabic, English letters, spaces, and common name characters
  const nameRegex = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z\s\-'.]+$/;
  return nameRegex.test(trimmed);
}

/**
 * Comprehensive validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate form data object
 * @param data - Object containing form data
 * @param rules - Validation rules
 * @returns ValidationResult
 */
export function validateForm(
  data: Record<string, any>,
  rules: Record<string, 'email' | 'phone' | 'nationalId' | 'name' | 'required' | 'price' | 'url'>
): ValidationResult {
  const errors: string[] = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    if (rule === 'required') {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${field} ${ERROR_MESSAGES.required}`);
      }
      continue;
    }

    if (!value) continue; // Skip validation for empty optional fields

    switch (rule) {
      case 'email':
        if (!validateEmail(value)) {
          errors.push(ERROR_MESSAGES.invalidEmail);
        }
        break;
      case 'phone':
        if (!validatePhoneNumber(value)) {
          errors.push(ERROR_MESSAGES.invalidPhone);
        }
        break;
      case 'nationalId':
        if (!validateNationalId(value)) {
          errors.push(ERROR_MESSAGES.invalidNationalId);
        }
        break;
      case 'name':
        if (!validateName(value)) {
          errors.push(`الاسم ${ERROR_MESSAGES.invalidCharacters}`);
        }
        break;
      case 'price':
        if (!validatePrice(value)) {
          errors.push(ERROR_MESSAGES.invalidPrice);
        }
        break;
      case 'url':
        if (!validateUrl(value)) {
          errors.push('الرابط غير صالح');
        }
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

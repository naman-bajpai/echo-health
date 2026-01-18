/**
 * Utility functions for validations and unit conversions
 */

/**
 * Validate email address
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { valid: false, error: "Email is required" };
  }
  
  // More comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: "Please enter a valid email address" };
  }
  
  return { valid: true };
}

/**
 * Validate phone number (supports various formats)
 */
export function validatePhone(phone: string, required: boolean = false): { valid: boolean; error?: string } {
  if (!phone || !phone.trim()) {
    if (required) {
      return { valid: false, error: "Phone number is required" };
    }
    return { valid: true }; // Optional field
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // US phone numbers: 10 digits (with optional country code)
  // International: 7-15 digits
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return { valid: false, error: "Please enter a valid phone number (7-15 digits)" };
  }
  
  // If it looks like a US number (10 or 11 digits starting with 1)
  if (digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly[0] === '1')) {
    return { valid: true };
  }
  
  // International format
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return { valid: true };
  }
  
  return { valid: false, error: "Please enter a valid phone number" };
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  }
  
  return phone; // Return as-is for international numbers
}

/**
 * Convert pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

/**
 * Convert kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

/**
 * Convert feet and inches to centimeters
 */
export function feetInchesToCm(feet: number, inches: number = 0): number {
  const totalInches = feet * 12 + inches;
  return totalInches * 2.54;
}

/**
 * Convert centimeters to feet and inches
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

/**
 * Format height for display (feet and inches)
 */
export function formatHeight(feet: number, inches: number): string {
  if (feet === 0 && inches === 0) return "--";
  return `${feet}'${inches}"`;
}

/**
 * Format weight for display (lbs)
 */
export function formatWeight(lbs: number): string {
  if (!lbs || lbs === 0) return "--";
  return `${Math.round(lbs)} lbs`;
}

/**
 * Parse height string (e.g., "5'10"") to feet and inches
 */
export function parseHeight(heightStr: string): { feet: number; inches: number } | null {
  if (!heightStr) return null;
  
  // Try format: 5'10" or 5'10
  const match = heightStr.match(/(\d+)'(\d+)/);
  if (match) {
    return { feet: parseInt(match[1]), inches: parseInt(match[2]) };
  }
  
  // Try format: 5.10 (feet.decimal)
  const decimalMatch = heightStr.match(/(\d+)\.(\d+)/);
  if (decimalMatch) {
    return { feet: parseInt(decimalMatch[1]), inches: Math.round(parseFloat(decimalMatch[2]) * 12) };
  }
  
  return null;
}

/**
 * Billing and Contact Information Validation Utilities
 * Validates US phone numbers, ZIP codes, email addresses, and state codes
 */

export interface USState {
  code: string;
  name: string;
}

/**
 * US States and territories (50 states + DC)
 */
export const US_STATES: USState[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

/**
 * Validates US phone number format
 * Accepts: (XXX) XXX-XXXX or XXX-XXX-XXXX
 * @param phone - Phone number string
 * @returns true if valid format
 */
export function validateUSPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all spaces for validation
  const cleaned = phone.trim();
  
  // Format: (XXX) XXX-XXXX
  const format1 = /^\(\d{3}\)\s?\d{3}-\d{4}$/;
  
  // Format: XXX-XXX-XXXX
  const format2 = /^\d{3}-\d{3}-\d{4}$/;
  
  return format1.test(cleaned) || format2.test(cleaned);
}

/**
 * Formats a US phone number to (XXX) XXX-XXXX format
 * Accepts input in various formats and normalizes it
 * @param phone - Phone number string
 * @returns Formatted phone number or original string if invalid
 */
export function formatUSPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }

  // Extract only digits
  const digits = phone.replace(/\D/g, '');
  
  // Must have exactly 10 digits
  if (digits.length !== 10) {
    return phone; // Return original if not 10 digits
  }

  // Format as (XXX) XXX-XXXX
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Validates US ZIP code (5 digits)
 * @param zip - ZIP code string
 * @returns true if valid 5-digit ZIP
 */
export function validateUSZip(zip: string): boolean {
  if (!zip || typeof zip !== 'string') {
    return false;
  }

  const cleaned = zip.trim();
  return /^\d{5}$/.test(cleaned);
}

/**
 * Validates email address format (basic validation)
 * @param email - Email address string
 * @returns true if valid email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const cleaned = email.trim();
  // Basic email regex - RFC 5322 compliant
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  
  return emailRegex.test(cleaned);
}

/**
 * Validates US state code (2-letter code)
 * @param state - State code string (e.g., 'CA', 'NY')
 * @returns true if valid US state code
 */
export function isValidUSState(state: string): boolean {
  if (!state || typeof state !== 'string') {
    return false;
  }

  const cleaned = state.trim().toUpperCase();
  return US_STATES.some(s => s.code === cleaned);
}

/**
 * Gets state name from state code
 * @param code - 2-letter state code
 * @returns State name or undefined if not found
 */
export function getStateName(code: string): string | undefined {
  if (!code) return undefined;
  const state = US_STATES.find(s => s.code === code.toUpperCase());
  return state?.name;
}

/**
 * Normalizes phone input by removing extra characters
 * Useful for onChange handlers
 * @param input - Raw phone input
 * @returns Cleaned phone string with only valid characters
 */
export function normalizePhoneInput(input: string): string {
  if (!input) return '';
  
  // Keep only digits, spaces, hyphens, and parentheses
  return input.replace(/[^\d\s\-()]/g, '');
}

/**
 * Validates all billing contact fields
 * @param fields - Object containing billing contact fields
 * @returns Object with validation errors (empty if all valid)
 */
export interface BillingContactFields {
  billing_phone: string;
  billing_email: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  admin_contact_email: string;
  admin_contact_phone: string;
}

export interface BillingValidationErrors {
  billing_phone?: string;
  billing_email?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  admin_contact_email?: string;
  admin_contact_phone?: string;
}

export function validateBillingContactFields(
  fields: Partial<BillingContactFields>
): BillingValidationErrors {
  const errors: BillingValidationErrors = {};

  // Billing phone
  if (fields.billing_phone !== undefined) {
    if (!fields.billing_phone?.trim()) {
      errors.billing_phone = 'Billing phone is required';
    } else if (!validateUSPhone(fields.billing_phone)) {
      errors.billing_phone = 'Invalid phone format. Use (XXX) XXX-XXXX or XXX-XXX-XXXX';
    }
  }

  // Billing email
  if (fields.billing_email !== undefined) {
    if (!fields.billing_email?.trim()) {
      errors.billing_email = 'Billing email is required';
    } else if (!validateEmail(fields.billing_email)) {
      errors.billing_email = 'Invalid email address';
    }
  }

  // Billing address
  if (fields.billing_address !== undefined) {
    if (!fields.billing_address?.trim()) {
      errors.billing_address = 'Billing address is required';
    } else if (fields.billing_address.trim().length < 5) {
      errors.billing_address = 'Address must be at least 5 characters';
    }
  }

  // Billing city
  if (fields.billing_city !== undefined) {
    if (!fields.billing_city?.trim()) {
      errors.billing_city = 'City is required';
    } else if (fields.billing_city.trim().length < 2) {
      errors.billing_city = 'City must be at least 2 characters';
    }
  }

  // Billing state
  if (fields.billing_state !== undefined) {
    if (!fields.billing_state?.trim()) {
      errors.billing_state = 'State is required';
    } else if (!isValidUSState(fields.billing_state)) {
      errors.billing_state = 'Invalid US state code';
    }
  }

  // Billing ZIP
  if (fields.billing_zip !== undefined) {
    if (!fields.billing_zip?.trim()) {
      errors.billing_zip = 'ZIP code is required';
    } else if (!validateUSZip(fields.billing_zip)) {
      errors.billing_zip = 'ZIP code must be 5 digits';
    }
  }

  // Admin contact email
  if (fields.admin_contact_email !== undefined) {
    if (!fields.admin_contact_email?.trim()) {
      errors.admin_contact_email = 'Admin contact email is required';
    } else if (!validateEmail(fields.admin_contact_email)) {
      errors.admin_contact_email = 'Invalid email address';
    }
  }

  // Admin contact phone
  if (fields.admin_contact_phone !== undefined) {
    if (!fields.admin_contact_phone?.trim()) {
      errors.admin_contact_phone = 'Admin contact phone is required';
    } else if (!validateUSPhone(fields.admin_contact_phone)) {
      errors.admin_contact_phone = 'Invalid phone format. Use (XXX) XXX-XXXX or XXX-XXX-XXXX';
    }
  }

  return errors;
}


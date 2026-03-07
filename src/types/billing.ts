/**
 * Billing Address Types
 *
 * Types for comprehensive billing address collection
 * Used for payment processing with AVS (Address Verification Service)
 */

/**
 * Input type for collecting billing address from forms
 */
export interface BillingAddressInput {
  firstName: string;
  lastName: string;
  streetAddress: string;
  streetAddress2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

/**
 * Complete billing address record with database fields
 */
export interface BillingAddressWithId extends BillingAddressInput {
  id: string;
  userId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Validation errors for billing address fields
 */
export interface BillingAddressErrors {
  firstName?: string;
  lastName?: string;
  streetAddress?: string;
  streetAddress2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Validates a billing address field
 * @param field - The field name to validate
 * @param value - The field value
 * @returns Error message if invalid, null if valid
 */
export function validateBillingAddressField(
  field: keyof BillingAddressInput,
  value: string
): string | null {
  switch (field) {
    case 'firstName':
    case 'lastName':
      return value.trim().length >= 2
        ? null
        : 'Must be at least 2 characters';

    case 'streetAddress':
      return value.trim().length >= 5
        ? null
        : 'Must be at least 5 characters';

    case 'city':
      return value.trim().length >= 2
        ? null
        : 'Must be at least 2 characters';

    case 'state':
      return value.length === 2
        ? null
        : 'Please select a state';

    case 'postalCode':
      return /^\d{5}(-\d{4})?$/.test(value)
        ? null
        : 'Invalid ZIP code (e.g., 12345 or 12345-6789)';

    case 'country':
      return value.length === 2
        ? null
        : 'Invalid country code';

    default:
      return null;
  }
}

/**
 * Validates all required fields in a billing address
 * @param address - The billing address to validate
 * @returns Object with validation errors, empty if valid
 */
export function validateBillingAddress(
  address: Partial<BillingAddressInput>
): BillingAddressErrors {
  const errors: BillingAddressErrors = {};

  const requiredFields: (keyof BillingAddressInput)[] = [
    'firstName',
    'lastName',
    'streetAddress',
    'city',
    'state',
    'postalCode',
  ];

  for (const field of requiredFields) {
    const value = address[field];
    if (!value || !value.trim()) {
      errors[field] = 'This field is required';
    } else {
      const fieldError = validateBillingAddressField(field, value);
      if (fieldError) {
        errors[field] = fieldError;
      }
    }
  }

  return errors;
}

/**
 * Checks if a billing address is complete and valid
 * @param address - The billing address to check
 * @returns True if valid, false otherwise
 */
export function isBillingAddressValid(
  address: Partial<BillingAddressInput> | null
): address is BillingAddressInput {
  if (!address) return false;

  const errors = validateBillingAddress(address);
  return Object.keys(errors).length === 0;
}

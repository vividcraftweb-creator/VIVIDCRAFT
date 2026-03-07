"use client";

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import type { HostedFields } from 'braintree-web/hosted-fields';

interface UnifiedPaymentFormProps {
  amount: string;
  planName: string;
  subscriptionPlan: string;
  onSuccess: (paymentMethodNonce: string, billingAddress: BillingAddressData) => void;
  onError: (error: unknown) => void;
}

interface BillingAddressData {
  firstName: string;
  lastName: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface FieldErrors {
  name?: string;
  billingAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export default function UnifiedPaymentForm({
  amount,
  planName,
  subscriptionPlan,
  onSuccess,
  onError,
}: UnifiedPaymentFormProps) {
  const hostedFieldsInstanceRef = useRef<HostedFields | null>(null);
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [rememberCard, setRememberCard] = useState(true);

  // Billing form state
  const [name, setName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});


  // Get client token from server
  const { data: tokenData, isLoading: isLoadingToken, error: tokenError } = trpc.braintree.getClientToken.useQuery(
    undefined
  );

  useEffect(() => {
    if (!tokenData?.clientToken) return;

    // Prevent re-initialization if already initialized successfully
    if (hasInitializedRef.current) {
      return;
    }

    // Prevent concurrent initializations
    if (isInitializingRef.current) {
      return;
    }

    let mounted = true;

    const initializeHostedFields = async () => {
      try {
        isInitializingRef.current = true;
        setIsLoading(true);
        setInitError(null);

        // Clean up any existing instance first
        if (hostedFieldsInstanceRef.current) {
          try {
            await hostedFieldsInstanceRef.current.teardown();
          } catch (err) {
            // Ignore teardown errors
          }
          hostedFieldsInstanceRef.current = null;
        }

        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!mounted) return;

        // Dynamically import braintree-web modules
        const clientModule = await import('braintree-web/client');
        const hostedFieldsModule = await import('braintree-web/hosted-fields');

        // Create Braintree client
        const clientInstance = await clientModule.create({
          authorization: tokenData.clientToken,
        });

        if (!mounted) return;

        // Create hosted fields
        const hostedFieldsInstance = await hostedFieldsModule.create({
          client: clientInstance,
          styles: {
            'input': {
              'font-size': '16px',
              'color': '#f5f5f5',
              'background-color': 'transparent',
              'font-family': 'inherit',
            },
            ':focus': {
              'color': '#ffffff',
            },
            '.valid': {
              'color': '#4ade80',
            },
            '.invalid': {
              'color': '#f87171',
            },
            '::placeholder': {
              'color': '#6b7280',
            },
          },
          fields: {
            number: {
              selector: '#card-number',
              placeholder: '4111 1111 1111 1111',
            },
            expirationDate: {
              selector: '#expiration-date',
              placeholder: 'MM / YY',
            },
            cvv: {
              selector: '#cvv',
              placeholder: '123',
            },
          },
        });

        if (mounted) {
          hostedFieldsInstanceRef.current = hostedFieldsInstance;
          hasInitializedRef.current = true;
          setIsLoading(false);
          isInitializingRef.current = false;
        } else {
          // Component unmounted during initialization, clean up
          isInitializingRef.current = false;
          hasInitializedRef.current = false;
          hostedFieldsInstance.teardown().catch(() => {
            // Ignore teardown errors
          });
        }
      } catch (error) {
        isInitializingRef.current = false;

        // In development with React Strict Mode, ignore errors from double-mounting
        if (process.env.NODE_ENV === 'development') {
          return;
        }

        if (mounted) {
          setIsLoading(false);
          const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment form';
          setInitError(errorMessage);
          toast.error('Failed to load payment form. Please try again.');
          onError(error);
        }
      }
    };

    initializeHostedFields();

    return () => {
      mounted = false;
      isInitializingRef.current = false;
      hasInitializedRef.current = false;

      if (hostedFieldsInstanceRef.current) {
        const instance = hostedFieldsInstanceRef.current;

        setTimeout(() => {
          instance.teardown().catch(() => {
            // Silently ignore teardown errors
          });
        }, 0);

        hostedFieldsInstanceRef.current = null;
      }
    };
  }, [tokenData?.clientToken, onError]);

  const validateField = (field: keyof FieldErrors, value: string): string | null => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return null;
      case 'billingAddress':
        if (!value.trim()) return 'Billing address is required';
        if (value.trim().length < 5) return 'Address must be at least 5 characters';
        return null;
      case 'city':
        if (!value.trim()) return 'City is required';
        if (value.trim().length < 2) return 'City must be at least 2 characters';
        return null;
      case 'state':
        if (!value.trim()) return 'State/Province is required';
        if (value.trim().length < 2) return 'State/Province must be at least 2 characters';
        if (value.trim().length > 100) return 'State/Province is too long';
        return null;
      case 'postalCode':
        if (!value.trim()) return 'Postal code is required';
        if (value.trim().length < 3) return 'Postal code must be at least 3 characters';
        if (value.trim().length > 20) return 'Postal code is too long';
        return null;
      default:
        return null;
    }
  };

  const validateAllFields = (): boolean => {
    const errors: FieldErrors = {};

    const nameError = validateField('name', name);
    if (nameError) errors.name = nameError;

    const addressError = validateField('billingAddress', billingAddress);
    if (addressError) errors.billingAddress = addressError;

    const cityError = validateField('city', city);
    if (cityError) errors.city = cityError;

    const stateError = validateField('state', state);
    if (stateError) errors.state = stateError;

    const postalCodeError = validateField('postalCode', postalCode);
    if (postalCodeError) errors.postalCode = postalCodeError;

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error('Please fill in all required fields correctly');
      return false;
    }

    return true;
  };

  const handleFieldBlur = (field: keyof FieldErrors, value: string) => {
    const error = validateField(field, value);
    setFieldErrors(prev => ({
      ...prev,
      [field]: error || undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hostedFieldsInstanceRef.current || isProcessing) return;

    if (!validateAllFields()) {
      return;
    }

    setIsProcessing(true);

    try {
      // Tokenize payment method using hosted fields
      const payload = await hostedFieldsInstanceRef.current.tokenize();

      toast.success('Payment method validated. Processing payment...');

      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      const billingAddressData: BillingAddressData = {
        firstName,
        lastName,
        streetAddress: billingAddress.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        postalCode: postalCode.trim(),
        country: 'US',
      };

      // Call the success callback with the payment method nonce and billing address
      onSuccess(payload.nonce, billingAddressData);
    } catch (error) {
      // Handle validation errors
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'HOSTED_FIELDS_FIELDS_INVALID'
      ) {
        toast.error('Please check your payment details');
      } else {
        toast.error('Payment failed. Please try again.');
        onError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (tokenError) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="text-sm">Failed to load payment system</p>
          <p className="text-xs mt-2">Please refresh the page and try again</p>
        </div>
      </div>
    );
  }

  if (isLoadingToken) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading payment form...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-red-500 mb-2">Payment form failed to load</p>
          <p className="text-xs text-muted-foreground">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card Number - Full Width */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Card Number
          </label>
          <div
            id="card-number"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg h-[50px] flex items-center"
            style={{ opacity: isLoading ? 0.5 : 1 }}
          />
        </div>

        {/* Name - Full Width */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => handleFieldBlur('name', e.target.value)}
            placeholder="Full name on card"
            className={`w-full px-4 py-3 bg-gray-800 border ${
              fieldErrors.name ? 'border-red-500' : 'border-gray-700'
            } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.name}</p>
          )}
        </div>

        {/* Expiration + CVV - 2 Columns */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expiration
            </label>
            <div
              id="expiration-date"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg h-[50px] flex items-center"
              style={{ opacity: isLoading ? 0.5 : 1 }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              CVV
            </label>
            <div
              id="cvv"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg h-[50px] flex items-center"
              style={{ opacity: isLoading ? 0.5 : 1 }}
            />
          </div>
        </div>

        {/* Billing Address - Full Width */}
        <div>
          <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-300 mb-2">
            Billing Address
          </label>
          <input
            id="billingAddress"
            type="text"
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
            onBlur={(e) => handleFieldBlur('billingAddress', e.target.value)}
            placeholder="Street address"
            className={`w-full px-4 py-3 bg-gray-800 border ${
              fieldErrors.billingAddress ? 'border-red-500' : 'border-gray-700'
            } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
          />
          {fieldErrors.billingAddress && (
            <p className="mt-1 text-sm text-red-500">{fieldErrors.billingAddress}</p>
          )}
        </div>

        {/* City, State, Zip - 3 Columns */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">
              City
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onBlur={(e) => handleFieldBlur('city', e.target.value)}
              placeholder="City"
              className={`w-full px-4 py-3 bg-gray-800 border ${
                fieldErrors.city ? 'border-red-500' : 'border-gray-700'
              } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
            />
            {fieldErrors.city && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.city}</p>
            )}
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-2">
              State / Province
            </label>
            <input
              id="state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              onBlur={(e) => handleFieldBlur('state', e.target.value)}
              placeholder="State or Province"
              maxLength={100}
              className={`w-full px-4 py-3 bg-gray-800 border ${
                fieldErrors.state ? 'border-red-500' : 'border-gray-700'
              } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
            />
            {fieldErrors.state && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.state}</p>
            )}
          </div>
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-300 mb-2">
              Postal Code
            </label>
            <input
              id="postalCode"
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              onBlur={(e) => handleFieldBlur('postalCode', e.target.value)}
              placeholder="Postal code"
              maxLength={20}
              className={`w-full px-4 py-3 bg-gray-800 border ${
                fieldErrors.postalCode ? 'border-red-500' : 'border-gray-700'
              } rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
            />
            {fieldErrors.postalCode && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.postalCode}</p>
            )}
          </div>
        </div>

        {/* Remember this card checkbox */}
        <div className="flex items-center pt-2">
          <input
            id="remember-card"
            type="checkbox"
            checked={rememberCard}
            onChange={(e) => setRememberCard(e.target.checked)}
            className="w-4 h-4 text-primary bg-gray-800 border-gray-700 rounded focus:ring-primary focus:ring-2"
          />
          <label htmlFor="remember-card" className="ml-2 text-sm text-gray-300">
            Remember this card for future payments
          </label>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Initializing payment options...</p>
          </div>
        )}

        {/* Submit Button */}
        {!isLoading && (
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              `Pay $${amount}/month for ${planName}`
            )}
          </button>
        )}

        {/* Legal Text */}
        <p className="text-xs text-center text-gray-400 mt-4">
          By clicking the button above, you agree to the Terms & Conditions and authorize recurring monthly charges.
        </p>

        {/* Payment Info */}
        <div className="mt-4 text-sm text-muted-foreground text-center space-y-1 border-t border-gray-700 pt-4">
          <p>Secure payment powered by Braintree (A PayPal Service)</p>
          <p className="text-xs">
            Your payment information is encrypted and secure
          </p>
        </div>
      </form>
    </div>
  );
}

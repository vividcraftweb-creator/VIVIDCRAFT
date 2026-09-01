'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SkillsSelector from '@/components/ui/skills-selector';
import LocationAutocompleteInput from '@/components/ui/LocationAutocompleteInput';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, Users, Briefcase, CheckCircle, Check, X, Building2, Globe, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { analytics } from '@/utils/analytics';
import { COUNTRIES, TIMEZONES, INDUSTRIES, getTimezoneForCountry } from '@/lib/countries-timezones';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
    role: 'CLIENT',
    title: '',
    bio: '',
    experience: '',
    companyName: '',
    companyInfo: '',
    industry: '',
    country: '',
    timezone: '',
    website: ''
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [validationError, setValidationError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [customCountry, setCustomCountry] = useState('');
  const router = useRouter();

  // Password requirements state
  const [passwordRequirements, setPasswordRequirements] = useState({
    hasLowercase: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasMinLength: false,
  });

  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Check password requirements whenever password changes
  useEffect(() => {
    const password = formData.password;
    const requirements = {
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      hasMinLength: password.length >= 12,
    };

    setPasswordRequirements(requirements);

    // Calculate password strength
    if (password.length === 0) {
      setPasswordStrength(null);
    } else {
      const requirementsMet = Object.values(requirements).filter(Boolean).length;
      if (requirementsMet <= 2) {
        setPasswordStrength('weak');
      } else if (requirementsMet <= 4) {
        setPasswordStrength('medium');
      } else {
        setPasswordStrength('strong');
      }
    }
  }, [formData.password]);

  // Check if passwords match
  useEffect(() => {
    if (formData.confirmPassword.length === 0) {
      setPasswordsMatch(null);
    } else {
      setPasswordsMatch(formData.password === formData.confirmPassword);
    }
  }, [formData.password, formData.confirmPassword]);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationError) setValidationError('');
    // Clear field-specific error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle country selection and auto-fill timezone
  const handleCountryChange = (countryName: string) => {
    updateFormData('country', countryName);

    // Clear custom country if switching away from "Other"
    if (countryName !== 'Other' && customCountry) {
      setCustomCountry('');
    }

    // Auto-fill timezone based on country
    const timezone = getTimezoneForCountry(countryName);
    if (timezone) {
      setFormData(prev => ({ ...prev, timezone }));
      // Clear timezone error if it exists
      if (fieldErrors.timezone) {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.timezone;
          return newErrors;
        });
      }
    } else if (countryName === 'Other') {
      // For "Other", default to UTC
      setFormData(prev => ({ ...prev, timezone: 'UTC+00:00 (London, Dublin, Lisbon)' }));
    }
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.role;
      case 2:
        return formData.firstName && formData.lastName && formData.email && formData.password && formData.confirmPassword && formData.phone && formData.location;
      case 3:
        if (formData.role === 'CLIENT') {
          const isCountryValid = formData.country === 'Other'
            ? customCountry.trim().length > 0
            : !!(formData.country || formData.location);
          return !!formData.companyName && !!formData.industry && isCountryValid && !!(formData.timezone || 'UTC');
        } else {
          return !!formData.bio && selectedSkills.length > 0 && !!formData.experience;
        }
      default:
        return true;
    }
  };

  const handleNext = () => {
    setValidationError('');
    setFieldErrors({});
    const errors: {[key: string]: string} = {};

    // Step 1 validations (Choose Your Role)
    if (currentStep === 1) {
      if (!formData.role) {
        toast.error('Please select your role', {
          description: 'Please choose whether you are a Client or Freelancer.'
        });
        return;
      }
    }

    // Step 2 validations (Personal Information)
    if (currentStep === 2) {
      if (!formData.firstName) {
        errors.firstName = 'First name is required';
      }

      if (!formData.lastName) {
        errors.lastName = 'Last name is required';
      }

      if (!formData.email) {
        errors.email = 'Email address is required';
      } else {
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          errors.email = 'Please enter a valid email address';
        }
      }

      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 12) {
        errors.password = 'Password must be at least 12 characters long';
      } else if (!Object.values(passwordRequirements).every(req => req)) {
        errors.password = 'Password does not meet all requirements';
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }

      if (!formData.phone) {
        errors.phone = 'Phone number is required';
      }

      if (!formData.location) {
        errors.location = 'Location is required';
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }

    // Step 3 validations (Profile Details)
    if (currentStep === 3) {
      if (formData.role === 'FREELANCER') {
        if (!formData.bio) {
          errors.bio = 'Professional bio is required';
        }
        if (selectedSkills.length === 0) {
          errors.skills = 'Please select at least one skill';
        }
        if (!formData.experience) {
          errors.experience = 'Years of experience is required';
        }
      } else if (formData.role === 'CLIENT') {
        if (!formData.bio || !formData.bio.trim()) {
          errors.bio = 'Bio or company overview is required';
        }
        if (!formData.companyName) {
          errors.companyName = 'Company or business name is required';
        }
        if (!formData.industry) {
          errors.industry = 'Industry or company type is required';
        }
        if (!formData.country && !formData.location) {
          errors.country = 'Country is required';
        }
        if (formData.country === 'Other' && !customCountry.trim()) {
          errors.customCountry = 'Please enter your country name';
        }
        if (!formData.timezone) {
          setFormData(prev => ({ ...prev, timezone: 'UTC' }));
        }
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSignUp = async () => {
    if (!validateStep(3)) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const resolvedCountry = (formData.country === 'Other' ? customCountry.trim() : formData.country) || formData.location || 'Sri Lanka';
      const resolvedTimezone = formData.timezone || 'UTC';
      const resolvedIndustry = formData.industry || 'Art & Creative';
      const resolvedCompanyName = formData.companyName || `${formData.firstName || 'Client'}'s Studio`;

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          country: resolvedCountry,
          timezone: resolvedTimezone,
          industry: resolvedIndustry,
          companyName: resolvedCompanyName,
          skills: selectedSkills.join(', ')
        }),
      });

      const responseData = await res.json();

      if (res.ok) {
        // Check if user already exists (200 status with userExists flag)
        if (responseData.userExists) {
          toast.error('Account already exists', {
            description: 'Redirecting to sign in...',
            duration: 2000,
          });
          setTimeout(() => {
            router.push(`/auth/signin?email=${encodeURIComponent(formData.email)}&message=account_exists`);
          }, 1500);
        } else {
          // Successful signup
          toast.success('Account created successfully!', {
            description: 'Please check your email to verify your account.'
          });

          // Track successful sign up
          analytics.signUp('email');

          // Redirect to verify email page
          router.push(`/auth/verify-email-sent?email=${encodeURIComponent(formData.email)}`);
        }
      } else {
        // Handle other errors
        const errMsg = typeof responseData?.message === 'string'
          ? responseData.message
          : 'Please check your information and try again.';
        toast.error('Sign up failed', {
          description: errMsg
        });
      }
    } catch (error: any) {
      const errMsg = typeof error === 'string'
        ? error
        : error?.message || 'Please try again later.';
      toast.error('Something went wrong', {
        description: errMsg
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">Personal Information</h2>
        <p className="text-gray-400 text-sm">Let&apos;s start with the basics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-gray-200 text-sm font-medium">First Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => updateFormData('firstName', e.target.value)}
              className={`pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg ${fieldErrors.firstName ? 'border-red-500/50' : ''}`}
            />
          </div>
          {fieldErrors.firstName && (
            <p className="text-red-400 text-xs mt-1">{fieldErrors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-gray-200 text-sm font-medium">Last Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => updateFormData('lastName', e.target.value)}
              className={`pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg ${fieldErrors.lastName ? 'border-red-500/50' : ''}`}
            />
          </div>
          {fieldErrors.lastName && (
            <p className="text-red-400 text-xs mt-1">{fieldErrors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-gray-200 text-sm font-medium">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => updateFormData('email', e.target.value)}
            className={`pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg ${fieldErrors.email ? 'border-red-500/50' : ''}`}
          />
        </div>
        {fieldErrors.email && (
          <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-200 text-sm font-medium">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create password"
              value={formData.password}
              onChange={(e) => updateFormData('password', e.target.value)}
              className={`pl-10 pr-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg ${fieldErrors.password ? 'border-red-500/50' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>
          )}
          {/* Password Strength Indicator */}
          {passwordStrength && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                <div className={`h-1 flex-1 rounded ${passwordStrength === 'weak' ? 'bg-red-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                <div className={`h-1 flex-1 rounded ${passwordStrength === 'medium' || passwordStrength === 'strong' ? passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500' : 'bg-white/10'}`} />
                <div className={`h-1 flex-1 rounded ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-white/10'}`} />
              </div>
              <p className={`text-xs ${passwordStrength === 'weak' ? 'text-red-400' : passwordStrength === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                Password strength: {passwordStrength}
              </p>
            </div>
          )}
          {/* Password Requirements Checklist */}
          {formData.password && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5">
                {passwordRequirements.hasMinLength ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <X className="h-3 w-3 text-gray-500" />
                )}
                <span className={`text-xs ${passwordRequirements.hasMinLength ? 'text-green-400' : 'text-gray-400'}`}>
                  At least 12 characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {passwordRequirements.hasLowercase ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <X className="h-3 w-3 text-gray-500" />
                )}
                <span className={`text-xs ${passwordRequirements.hasLowercase ? 'text-green-400' : 'text-gray-400'}`}>
                  Lowercase letter
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {passwordRequirements.hasUppercase ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <X className="h-3 w-3 text-gray-500" />
                )}
                <span className={`text-xs ${passwordRequirements.hasUppercase ? 'text-green-400' : 'text-gray-400'}`}>
                  Uppercase letter
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {passwordRequirements.hasNumber ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <X className="h-3 w-3 text-gray-500" />
                )}
                <span className={`text-xs ${passwordRequirements.hasNumber ? 'text-green-400' : 'text-gray-400'}`}>
                  Number
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {passwordRequirements.hasSpecialChar ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <X className="h-3 w-3 text-gray-500" />
                )}
                <span className={`text-xs ${passwordRequirements.hasSpecialChar ? 'text-green-400' : 'text-gray-400'}`}>
                  Special character
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-gray-200 text-sm font-medium">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) => updateFormData('confirmPassword', e.target.value)}
              className={`pl-10 pr-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg ${fieldErrors.confirmPassword ? 'border-red-500/50' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-red-400 text-xs mt-1">{fieldErrors.confirmPassword}</p>
          )}
          {/* Password Match Indicator */}
          {passwordsMatch !== null && formData.confirmPassword && (
            <div className="flex items-center gap-1.5 mt-1">
              {passwordsMatch ? (
                <>
                  <Check className="h-3 w-3 text-green-400" />
                  <span className="text-xs text-green-400">Passwords match</span>
                </>
              ) : (
                <>
                  <X className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-400">Passwords do not match</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-gray-200 text-sm font-medium">Phone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.phone}
              onChange={(e) => updateFormData('phone', e.target.value)}
              className={`pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg ${fieldErrors.phone ? 'border-red-500/50' : ''}`}
            />
          </div>
          {fieldErrors.phone && (
            <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="text-gray-200 text-sm font-medium">Location</Label>
          <LocationAutocompleteInput
            id="location"
            value={formData.location}
            onChange={(value) => updateFormData('location', value)}
            placeholder="New York, USA"
            className={`h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg ${fieldErrors.location ? 'border-red-500/50' : ''}`}
            types={['(cities)']}
          />
          {fieldErrors.location && (
            <p className="text-red-400 text-xs mt-1">{fieldErrors.location}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Choose Your Role</h2>
        <p className="text-gray-400 text-sm">How do you plan to use JobHorizons?</p>
      </div>

      <div className="space-y-4">
        <div
          className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 ${
            formData.role === 'CLIENT'
              ? 'border-white bg-white/10'
              : 'border-white/20 bg-white/5 hover:bg-white/10'
          }`}
          data-testid="role-client"
          onClick={() => updateFormData('role', 'CLIENT')}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${formData.role === 'CLIENT' ? 'bg-white/20' : 'bg-white/10'}`}>
              <Users className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white">Client</h3>
              <p className="text-gray-400 text-sm">Hire talented freelancers for projects</p>
            </div>
            {formData.role === 'CLIENT' && (
              <CheckCircle className="h-5 w-5 text-white" />
            )}
          </div>
        </div>

        <div
          className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 ${
            formData.role === 'FREELANCER'
              ? 'border-white bg-white/10'
              : 'border-white/20 bg-white/5 hover:bg-white/10'
          }`}
          data-testid="role-freelancer"
          onClick={() => updateFormData('role', 'FREELANCER')}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${formData.role === 'FREELANCER' ? 'bg-white/20' : 'bg-white/10'}`}>
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white">Freelancer</h3>
              <p className="text-gray-400 text-sm">Find projects and grow your career</p>
            </div>
            {formData.role === 'FREELANCER' && (
              <CheckCircle className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">
          {formData.role === 'CLIENT' ? 'Company Information' : 'Tell Us About Yourself'}
        </h2>
        <p className="text-gray-400 text-sm">
          {formData.role === 'CLIENT'
            ? 'Complete your company profile to get started'
            : 'Help others understand your expertise'
          }
        </p>
      </div>
      
      {formData.role === 'FREELANCER' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-gray-200 text-sm font-medium">Professional Bio</Label>
            <textarea
              id="bio"
              placeholder="Tell clients about your experience, passion, and what makes you unique..."
              value={formData.bio}
              onChange={(e) => updateFormData('bio', e.target.value)}
              rows={4}
              className={`w-full p-3 bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg resize-none ${fieldErrors.bio ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.bio && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.bio}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-200 text-sm font-medium">Skills & Expertise</Label>
            <SkillsSelector
              selectedSkills={selectedSkills}
              onSkillsChange={setSelectedSkills}
              placeholder="Select your skills..."
              className="text-white"
            />
            {fieldErrors.skills && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.skills}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="experience" className="text-gray-200 text-sm font-medium">Years of Experience</Label>
            <Input
              id="experience"
              type="text"
              placeholder="e.g., 5 years"
              value={formData.experience}
              onChange={(e) => updateFormData('experience', e.target.value)}
              className={`h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg ${fieldErrors.experience ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.experience && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.experience}</p>
            )}
          </div>
        </>
      )}
      
      {formData.role === 'CLIENT' && (
        <>
          {/* Professional Title Field - OPTIONAL */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-200 text-sm font-medium">
              Professional Title <span className="text-gray-400 font-normal">(Optional)</span>
            </Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="title"
                type="text"
                placeholder="e.g., CEO, Founder, Product Manager"
                value={formData.title}
                onChange={(e) => updateFormData('title', e.target.value)}
                className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg"
                maxLength={100}
              />
            </div>
          </div>

          {/* Bio/Company Overview Field - REQUIRED */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-gray-200 text-sm font-medium">
              Bio / Company Overview
            </Label>
            <textarea
              id="bio"
              placeholder="Tell us about yourself and your role..."
              value={formData.bio}
              onChange={(e) => updateFormData('bio', e.target.value)}
              rows={4}
              maxLength={1000}
              className={`w-full p-3 bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg resize-none ${fieldErrors.bio ? 'border-red-500/50' : ''}`}
            />
            {fieldErrors.bio && (
              <p className="text-red-400 text-xs mt-1">{fieldErrors.bio}</p>
            )}
            <p className="text-gray-400 text-xs">{formData.bio.length}/1000 characters</p>
          </div>

          {/* Company Details Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="companyName" className="text-gray-200 text-sm font-medium">Company or Business Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="companyName"
                  type="text"
                  placeholder="e.g., Acme Corporation"
                  value={formData.companyName}
                  onChange={(e) => updateFormData('companyName', e.target.value)}
                  className={`pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg ${fieldErrors.companyName ? 'border-red-500/50' : ''}`}
                />
              </div>
              {fieldErrors.companyName && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.companyName}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="industry" className="text-gray-200 text-sm font-medium">Industry or Company Type</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                <Select value={formData.industry} onValueChange={(value) => updateFormData('industry', value)}>
                  <SelectTrigger className={`h-12 bg-white/5 border-white/10 text-white focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg overflow-hidden ${fieldErrors.industry ? 'border-red-500/50' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}>
                    <SelectValue placeholder="Select your industry" className="block truncate w-full text-left" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10 max-h-[300px]">
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry} className="text-white">
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {fieldErrors.industry && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.industry}</p>
              )}
            </div>
          </div>

          {/* Company Info Field - OPTIONAL */}
          <div className="space-y-2">
            <Label htmlFor="companyInfo" className="text-gray-200 text-sm font-medium">
              Company Info <span className="text-gray-400 font-normal">(Optional)</span>
            </Label>
            <textarea
              id="companyInfo"
              placeholder="Describe your company, mission, and what you do..."
              value={formData.companyInfo}
              onChange={(e) => updateFormData('companyInfo', e.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full p-3 bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg resize-none"
            />
            <p className="text-gray-400 text-xs">{formData.companyInfo.length}/1000 characters</p>
          </div>

          {/* Location Details Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="country" className="text-gray-200 text-sm font-medium">Country</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                <Select value={formData.country} onValueChange={handleCountryChange}>
                  <SelectTrigger className={`h-12 bg-white/5 border-white/10 text-white focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg overflow-hidden ${fieldErrors.country ? 'border-red-500/50' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}>
                    <SelectValue placeholder="Select your country" className="block truncate w-full text-left" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10 max-h-[300px]">
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.name} value={country.name} className="text-white">
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {fieldErrors.country && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.country}</p>
              )}
              {/* Custom country input when "Other" is selected */}
              {formData.country === 'Other' && (
                <div className="mt-3">
                  <Label htmlFor="customCountry" className="text-gray-200 text-sm font-medium">
                    Enter Your Country
                  </Label>
                  <Input
                    id="customCountry"
                    type="text"
                    value={customCountry}
                    onChange={(e) => setCustomCountry(e.target.value)}
                    placeholder="Enter your country name"
                    className={`h-12 bg-white/5 border-white/10 text-white focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg mt-2 ${fieldErrors.customCountry ? 'border-red-500/50' : ''}`}
                    required
                  />
                  {fieldErrors.customCountry ? (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.customCountry}</p>
                  ) : (
                    <p className="text-gray-400 text-xs mt-1">Please enter your country name</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="timezone" className="text-gray-200 text-sm font-medium">
                Timezone
                {formData.country && formData.timezone && (
                  <span className="text-green-400 text-xs ml-2">✓ Auto-filled</span>
                )}
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                <Select value={formData.timezone} onValueChange={(value) => updateFormData('timezone', value)}>
                  <SelectTrigger className={`h-12 bg-white/5 border-white/10 text-white focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg overflow-hidden ${fieldErrors.timezone ? 'border-red-500/50' : ''}`} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}>
                    <SelectValue placeholder="Select your timezone" className="block truncate w-full text-left" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10 max-h-[300px]">
                    {TIMEZONES.map((timezone) => (
                      <SelectItem key={timezone} value={timezone} className="text-white">
                        {timezone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {fieldErrors.timezone && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.timezone}</p>
              )}
            </div>
          </div>

          {/* Website Section */}
          <div className="space-y-3">
            <Label htmlFor="website" className="text-gray-200 text-sm font-medium">
              Company Website <span className="text-gray-400 font-normal">(Optional)</span>
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="website"
                type="url"
                placeholder="https://www.example.com"
                value={formData.website}
                onChange={(e) => updateFormData('website', e.target.value)}
                className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 focus:bg-white/10 transition-colors rounded-lg"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Main Content */}
      <div className={`w-full max-w-sm sm:max-w-md lg:max-w-lg transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/jobhorizons-logo.webp"
              alt="JobHorizons"
              width={180}
              height={36}
              priority
            />
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2">Create account</h1>
          <p className="text-sm sm:text-base text-gray-400">Get started with JobHorizons</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  currentStep >= step
                    ? 'bg-white text-gray-900'
                    : 'bg-white/10 text-gray-400'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-8 h-0.5 mx-2 rounded transition-all duration-300 ${
                    currentStep > step ? 'bg-white' : 'bg-white/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sign Up Form */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-4 py-6 sm:px-6 sm:py-8 shadow-xl">
          {currentStep === 1 && renderStep2()}
          {currentStep === 2 && renderStep1()}
          {currentStep === 3 && renderStep3()}

          {/* Validation Error */}
          {validationError && (
            <div
              className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg mt-6"
              data-testid="validation-error"
            >
              {validationError}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
            {currentStep > 1 && (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleBack();
                }}
                variant="outline"
                className="h-11 px-6 bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors rounded-lg"
              >
                Back
              </Button>
            )}
            
            <div className={currentStep === 1 ? 'ml-auto' : ''}>
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNext();
                  }}
                  data-testid="continue-button"
                  className="h-11 px-8 bg-white text-gray-900 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSignUp();
                  }}
                  disabled={isLoading}
                  data-testid="create-account-button"
                  className="h-11 px-8 bg-white text-gray-900 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-900 rounded-full animate-spin" />
                      Creating account...
                    </div>
                  ) : (
                    'Create account'
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Sign In Link */}
          <div className="text-center pt-6 border-t border-white/10 mt-6">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link 
                href="/auth/signin" 
                className="text-white hover:text-gray-200 transition-colors font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 JobHorizons</p>
        </div>
      </div>
    </div>
  );
}

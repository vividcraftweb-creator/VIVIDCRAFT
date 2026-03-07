import { FIELD_LIMITS, type ValidationResult, type ValidationStatus } from '@/types/profile-editor.types';

export function useFieldValidation() {
  const getColorClass = (status: ValidationStatus): string => {
    const colors = {
      error: 'text-destructive',
      ideal: 'text-chart-2',
      warning: 'text-amber-500',
      normal: 'text-muted-foreground',
    };
    return colors[status];
  };

  const validateTitle = (title: string): ValidationResult => {
    const length = title.trim().length;

    if (length === 0) {
      return {
        valid: false,
        message: 'Professional title is required',
        color: getColorClass('error'),
        status: 'error',
      };
    }

    if (length < FIELD_LIMITS.TITLE.min) {
      return {
        valid: false,
        message: `At least ${FIELD_LIMITS.TITLE.min - length} more characters needed`,
        color: getColorClass('error'),
        status: 'error',
      };
    }

    if (length >= FIELD_LIMITS.TITLE.ideal && length <= FIELD_LIMITS.TITLE.max) {
      return {
        valid: true,
        message: 'Perfect length!',
        color: getColorClass('ideal'),
        status: 'ideal',
      };
    }

    if (length > FIELD_LIMITS.TITLE.max * 0.9) {
      return {
        valid: true,
        message: 'Getting close to the limit',
        color: getColorClass('warning'),
        status: 'warning',
      };
    }

    return {
      valid: true,
      message: 'Looking good',
      color: getColorClass('normal'),
      status: 'normal',
    };
  };

  const validateBio = (bio: string): ValidationResult => {
    const length = bio.trim().length;

    if (length === 0) {
      return {
        valid: false,
        message: 'Bio helps clients understand your expertise',
        color: getColorClass('error'),
        status: 'error',
      };
    }

    if (length < FIELD_LIMITS.BIO.min) {
      return {
        valid: false,
        message: `At least ${FIELD_LIMITS.BIO.min - length} more characters needed`,
        color: getColorClass('error'),
        status: 'error',
      };
    }

    if (length >= FIELD_LIMITS.BIO.ideal && length <= FIELD_LIMITS.BIO.max * 0.8) {
      return {
        valid: true,
        message: 'Excellent! This gives clients a great overview',
        color: getColorClass('ideal'),
        status: 'ideal',
      };
    }

    if (length > FIELD_LIMITS.BIO.max * 0.9) {
      return {
        valid: true,
        message: `${FIELD_LIMITS.BIO.max - length} characters remaining`,
        color: getColorClass('warning'),
        status: 'warning',
      };
    }

    return {
      valid: true,
      message: 'Good start! Consider adding more detail',
      color: getColorClass('normal'),
      status: 'normal',
    };
  };

  const validateSkills = (skills: string[]): ValidationResult => {
    const count = skills.length;

    if (count === 0) {
      return {
        valid: false,
        message: 'Select at least 1 skill',
        color: getColorClass('error'),
        status: 'error',
      };
    }

    if (count >= 3 && count <= 6) {
      return {
        valid: true,
        message: `✨ Perfect balance! ${count} skills is ideal for attracting the right clients`,
        color: getColorClass('ideal'),
        status: 'ideal',
      };
    }

    if (count > FIELD_LIMITS.SKILLS.ideal && count <= FIELD_LIMITS.SKILLS.max) {
      return {
        valid: true,
        message: 'Good selection, but consider focusing on your core strengths',
        color: getColorClass('warning'),
        status: 'warning',
      };
    }

    if (count > FIELD_LIMITS.SKILLS.max) {
      return {
        valid: false,
        message: `Too many skills selected. Maximum is ${FIELD_LIMITS.SKILLS.max}`,
        color: getColorClass('error'),
        status: 'error',
      };
    }

    return {
      valid: true,
      message: `${count} skill${count !== 1 ? 's' : ''} selected`,
        color: getColorClass('normal'),
        status: 'normal',
      };
    };

    const validateDescription = (description: string, maxLength: number): ValidationResult => {
      const length = description.trim().length;

      if (length === 0) {
        return {
          valid: true,
          message: 'Add a description to provide context',
          color: getColorClass('normal'),
          status: 'normal',
        };
      }

      if (length > maxLength * 0.9) {
        return {
          valid: true,
          message: `${maxLength - length} characters remaining`,
          color: getColorClass('warning'),
          status: 'warning',
        };
      }

      if (length > maxLength) {
        return {
          valid: false,
          message: `Exceeds maximum by ${length - maxLength} characters`,
          color: getColorClass('error'),
          status: 'error',
        };
      }

      return {
        valid: true,
        message: 'Looking good',
        color: getColorClass('normal'),
        status: 'normal',
      };
    };

  const validateRate = (rate: string): ValidationResult => {
    if (!rate) {
      return {
        valid: false,
        message: 'Hourly rate helps clients understand your pricing',
        color: getColorClass('normal'),
        status: 'normal',
      };
    }

    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate <= 0) {
      return {
        valid: false,
        message: 'Please enter a valid hourly rate',
        color: getColorClass('error'),
        status: 'error',
      };
    }

    if (numRate < 10) {
      return {
        valid: true,
        message: 'Consider if this rate reflects your expertise',
        color: getColorClass('warning'),
        status: 'warning',
      };
    }

    return {
      valid: true,
      message: 'Rate looks good',
      color: getColorClass('ideal'),
      status: 'ideal',
    };
  };

  const validateSocialLink = (url: string): ValidationResult => {
    if (!url) {
      return {
        valid: true,
        message: 'Optional',
        color: getColorClass('normal'),
        status: 'normal',
      };
    }

    // Basic URL validation
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return {
          valid: false,
          message: 'URL must start with http:// or https://',
          color: getColorClass('error'),
          status: 'error',
        };
      }
      return {
        valid: true,
        message: 'Valid link',
        color: getColorClass('ideal'),
        status: 'ideal',
      };
    } catch {
      return {
        valid: false,
        message: 'Please enter a valid URL',
        color: getColorClass('error'),
        status: 'error',
      };
    }
  };

  return {
    validateTitle,
    validateBio,
    validateSkills,
    validateDescription,
    validateRate,
    validateSocialLink,
  };
}

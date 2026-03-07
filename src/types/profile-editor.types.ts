export interface ProfileEditorFormData {
  // Basic Info
  firstName: string;
  lastName: string;
  title: string;
  bio: string;
  location: string;
  skills: string[];
  rate: string;
  profilePicture: string;
  // Social links
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    portfolio?: string;
  };
  // Availability
  availabilityStatus?: 'available' | 'busy' | 'unavailable';
}

export const FIELD_LIMITS = {
  TITLE: { min: 10, max: 70, ideal: 30 },
  BIO: { min: 50, max: 2000, ideal: 150 },
  SKILLS: { min: 1, max: 10, ideal: 5 },
  EXPERIENCE_DESCRIPTION: { max: 500 },
  EDUCATION_DESCRIPTION: { max: 300 },
  PORTFOLIO_DESCRIPTION: { max: 400 },
  PORTFOLIO_TITLE: { min: 5, max: 100 },
  CERTIFICATION_NAME: { min: 3, max: 200 },
} as const;

export const TITLE_EXAMPLES = {
  'Design & Creative': [
    'UI/UX Designer specializing in Mobile Apps',
    'Brand Identity Designer with 5+ years experience',
    'Motion Graphics Artist for Social Media',
    'Graphic Designer focused on Print & Digital',
    '3D Artist & Product Visualization Specialist',
  ],
  'Development & IT': [
    'Full-Stack Developer (React, Node.js, PostgreSQL)',
    'Mobile App Developer (iOS & Android)',
    'WordPress Developer & Theme Customization Expert',
    'Python Developer specializing in Data Analytics',
    'DevOps Engineer with AWS & Kubernetes expertise',
  ],
  'Writing & Translation': [
    'Content Writer specializing in Tech & SaaS',
    'SEO Copywriter with proven conversion results',
    'Technical Writer for Software Documentation',
    'Creative Copywriter for Marketing Campaigns',
    'Professional Translator (English ↔ Spanish)',
  ],
  'Marketing & Sales': [
    'Digital Marketing Specialist (SEO, PPC, Social)',
    'Social Media Manager with Community Building focus',
    'Email Marketing Expert with automation skills',
    'Growth Marketing Consultant for Startups',
    'Sales Funnel Optimizer & Conversion Specialist',
  ],
  'Business & Consulting': [
    'Business Consultant for Small Businesses',
    'Project Manager with Agile & Scrum expertise',
    'Financial Analyst specializing in Startups',
    'HR Consultant for Remote Teams',
    'Strategic Planning & Operations Consultant',
  ],
  'Video & Animation': [
    'Video Editor for YouTube & Social Media',
    'Animator specializing in Explainer Videos',
    'Motion Designer for Brand Storytelling',
    'Video Producer & Content Creator',
    'After Effects Specialist for Visual Effects',
  ],
} as const;

export const BIO_TIPS = [
  "Highlight your unique value proposition and what sets you apart",
  "Mention years of experience and your area of specialization",
  "Include specific achievements or results you've delivered",
  "Describe your approach or methodology that clients appreciate",
  "Share what types of clients or projects you work best with",
] as const;

export const POSITION_EXAMPLES = [
  'Senior Software Engineer',
  'Marketing Manager',
  'Graphic Designer',
  'Product Manager',
  'Content Writer',
  'Business Analyst',
  'UX Designer',
  'Sales Executive',
] as const;

export const INSTITUTION_EXAMPLES = [
  'Stanford University',
  'MIT',
  'University of California, Berkeley',
  'Harvard University',
  'Online Course (Coursera, Udemy, etc.)',
  'Bootcamp or Training Program',
] as const;

export type ValidationStatus = 'error' | 'ideal' | 'warning' | 'normal';

export interface ValidationResult {
  valid: boolean;
  message: string;
  color: string;
  status: ValidationStatus;
}

export interface SectionStrength {
  percentage: number;
  label: 'Strong' | 'Good' | 'Needs Work';
  color: string;
  badge: 'success' | 'warning' | 'default';
}

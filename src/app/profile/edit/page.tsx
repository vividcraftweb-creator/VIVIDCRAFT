'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DangerZone } from '@/components/settings/DangerZone';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Save,
  Loader2,
  ChevronDown,
} from 'lucide-react';

interface ClientProfileForm {
  firstName: string;
  lastName: string;
  address: string;
  whatsappNumber: string;
  email: string;
  bannerUrl: string;
}

export interface CountryCodeOption {
  code: string;       // e.g. "+94"
  dialCode: string;   // e.g. "94"
  country: string;    // e.g. "Sri Lanka"
  flag: string;       // e.g. "🇱🇰"
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { flag: '🇱🇰', country: 'Sri Lanka', code: '+94', dialCode: '94' },
  { flag: '🇮🇳', country: 'India', code: '+91', dialCode: '91' },
  { flag: '🇬🇧', country: 'United Kingdom', code: '+44', dialCode: '44' },
  { flag: '🇺🇸', country: 'United States', code: '+1', dialCode: '1' },
  { flag: '🇦🇺', country: 'Australia', code: '+61', dialCode: '61' },
  { flag: '🇦🇪', country: 'United Arab Emirates', code: '+971', dialCode: '971' },
  { flag: '🇸🇬', country: 'Singapore', code: '+65', dialCode: '65' },
  { flag: '🇨🇦', country: 'Canada', code: '+1', dialCode: '1' },
  { flag: '🇲🇻', country: 'Maldives', code: '+960', dialCode: '960' },
  { flag: '🇲🇾', country: 'Malaysia', code: '+60', dialCode: '60' },
  { flag: '🇵🇰', country: 'Pakistan', code: '+92', dialCode: '92' },
  { flag: '🇧🇩', country: 'Bangladesh', code: '+880', dialCode: '880' },
  { flag: '🇸🇦', country: 'Saudi Arabia', code: '+966', dialCode: '966' },
  { flag: '🇶🇦', country: 'Qatar', code: '+974', dialCode: '974' },
  { flag: '🇩🇪', country: 'Germany', code: '+49', dialCode: '49' },
  { flag: '🇫🇷', country: 'France', code: '+33', dialCode: '33' },
  { flag: '🇮🇹', country: 'Italy', code: '+39', dialCode: '39' },
  { flag: '🇳🇱', country: 'Netherlands', code: '+31', dialCode: '31' },
  { flag: '🇳🇿', country: 'New Zealand', code: '+64', dialCode: '64' },
  { flag: '🇯🇵', country: 'Japan', code: '+81', dialCode: '81' },
  { flag: '🇿🇦', country: 'South Africa', code: '+27', dialCode: '27' },
];

function parsePhoneAndCountry(rawPhone: string) {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) {
    return { dialCode: '94', countryCode: '+94', localNumber: '' };
  }
  // Sort descending by dialCode length to match longest prefix first (+971 before +9)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (digits.startsWith(c.dialCode)) {
      return {
        dialCode: c.dialCode,
        countryCode: c.code,
        localNumber: digits.slice(c.dialCode.length),
      };
    }
  }
  return { dialCode: '94', countryCode: '+94', localNumber: digits };
}

export default function EditProfilePage() {
  const supabase = createClient();
  const [formData, setFormData] = useState<ClientProfileForm>({
    firstName: '',
    lastName: '',
    address: '',
    whatsappNumber: '',
    email: '',
    bannerUrl: '',
  });

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('+94');
  const [localPhoneNumber, setLocalPhoneNumber] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [userRole, setUserRole] = useState<string>('CLIENT');
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch from 'profiles' table strictly by id
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const p = profilesData || {};

        const role = (
          p.role ||
          user.user_metadata?.role ||
          user.user_metadata?.userRole ||
          user.app_metadata?.role ||
          'CLIENT'
        ).toString().trim().toUpperCase();
        setUserRole(role);

        const rawPhone = p.whatsapp_number || p.phone || p.businessPhone || '';
        const parsed = parsePhoneAndCountry(rawPhone);
        setSelectedCountryCode(parsed.countryCode);
        setLocalPhoneNumber(parsed.localNumber);

        setFormData({
          firstName: p.first_name || p.firstName || user.user_metadata?.name?.split(' ')[0] || user.user_metadata?.firstName || '',
          lastName: p.last_name || p.lastName || user.user_metadata?.name?.split(' ').slice(1).join(' ') || user.user_metadata?.lastName || '',
          address: p.address || p.location || p.businessAddressLine1 || '',
          whatsappNumber: rawPhone,
          email: p.email || p.businessEmail || user.email || '',
          bannerUrl: p.banner_url || user.user_metadata?.banner_url || '',
        });

        hasInitializedRef.current = true;
      } catch (err) {
        console.warn('Error fetching profile data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!hasInitializedRef.current) {
      loadUserData();
    }
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Banner image must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error('Only JPG, PNG, and WebP images are allowed');
      return;
    }

    setIsUploadingBanner(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User session not found');

      let publicBannerUrl = '';

      // Direct upload to Supabase storage 'banners' bucket
      try {
        const fileExt = file.name ? file.name.split('.').pop() || 'png' : 'png';
        const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
        const filePath = `user-banners/${user.id}/${Date.now()}.${cleanExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('banners')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: pubData } = supabase.storage.from('banners').getPublicUrl(filePath);
          if (pubData?.publicUrl) {
            publicBannerUrl = pubData.publicUrl;
          }
        } else if (uploadError) {
          console.warn('Storage banners upload notice:', uploadError.message);
        }
      } catch (directErr) {
        console.warn('Direct banner upload notice:', directErr);
      }

      // Fallback via /api/admin/banners/upload
      if (!publicBannerUrl) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          uploadFormData.append('userId', user.id);

          const response = await fetch('/api/admin/banners/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          if (response.ok) {
            const resJson = await response.json();
            publicBannerUrl = resJson.url;
          }
        } catch (fbErr) {
          console.warn('Banner admin upload fallback notice:', fbErr);
        }
      }

      if (!publicBannerUrl) {
        throw new Error('Failed to upload banner image');
      }

      setFormData((prev) => ({ ...prev, bannerUrl: publicBannerUrl }));

      // Automatically update profiles.banner_url directly in database
      await supabase
        .from('profiles')
        .update({
          banner_url: publicBannerUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      try {
        await supabase.auth.updateUser({
          data: { banner_url: publicBannerUrl },
        });
      } catch {}

      toast.success('Cover banner image uploaded and saved successfully!');
    } catch (err: any) {
      console.error('Banner upload error:', err);
      toast.error('Failed to upload cover banner: ' + (err.message || 'Please try again.'));
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    try {
      setIsUploadingBanner(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({
            banner_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        try {
          await supabase.auth.updateUser({
            data: { banner_url: null },
          });
        } catch {}
      }

      setFormData((prev) => ({ ...prev, bannerUrl: '' }));
      toast.success('Cover banner removed');
    } catch (err: any) {
      toast.error('Failed to remove banner: ' + err.message);
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Build international phone number from country code + sanitized local digits
      const currentCountry = COUNTRY_CODES.find((c) => c.code === selectedCountryCode) || COUNTRY_CODES[0];
      const cleanLocal = localPhoneNumber.replace(/\D/g, '').replace(/^0+/, ''); // strip non-digits and leading 0
      let fullPhone = '';

      if (cleanLocal) {
        fullPhone = `${currentCountry.dialCode}${cleanLocal}`;
        const internationalPhoneRegex = /^[1-9]\d{7,14}$/;
        if (!internationalPhoneRegex.test(fullPhone)) {
          toast.error('Invalid phone number format', {
            description: 'Please enter a valid phone number (between 7 and 14 digits after country code).',
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Direct upsert to profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          address: formData.address.trim(),
          location: formData.address.trim(),
          whatsapp_number: fullPhone || null,
          phone: fullPhone || null,
          email: formData.email.trim(),
          banner_url: formData.bannerUrl ? formData.bannerUrl.trim() : null,
          updated_at: new Date().toISOString(),
        });

      try {
        await supabase.auth.updateUser({
          data: {
            banner_url: formData.bannerUrl ? formData.bannerUrl.trim() : null,
            location: formData.address.trim(),
            address: formData.address.trim(),
          },
        });
      } catch {}

      if (error) {
        throw error;
      }

      setFormData((prev) => ({ ...prev, whatsappNumber: fullPhone }));
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      console.error("Profile update error:", err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#A2694E]" />
          <p className="text-slate-600 dark:text-slate-400 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const isClient = userRole === 'CLIENT' || userRole === 'BUYER';
  const isFreelancer = userRole === 'FREELANCER' || userRole === 'ARTIST' || userRole === 'CREATOR';
  const showCoverBanner = isFreelancer && !isClient;
  const currentSelectedCountry = COUNTRY_CODES.find((c) => c.code === selectedCountryCode) || COUNTRY_CODES[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Title Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>Edit Profile</span>
              {isClient && (
                <Badge variant="outline" className="border-blue-500/40 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 text-xs font-semibold">
                  Buyer Account
                </Badge>
              )}
              {isFreelancer && (
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 text-xs font-semibold">
                  Artist / Creator
                </Badge>
              )}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Manage your personal details and contact information.
            </p>
          </div>
          {isFreelancer && (
            <Button asChild className="bg-[#A2694E] hover:bg-[#8B5A3C] text-white text-xs font-semibold shrink-0 shadow-sm">
              <a href="/profile-editor">
                Artist Mediums & Setup →
              </a>
            </Button>
          )}
        </div>

        {/* Profile Form Card */}
        <Card className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl">
          <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5 text-[#A2694E]" />
              <span>Personal Information</span>
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 text-xs">
              Keep your contact details up to date for order updates and verification.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    First Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      className="pl-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#A2694E]/20 focus-visible:border-[#A2694E] shadow-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Last Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      className="pl-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#A2694E]/20 focus-visible:border-[#A2694E] shadow-sm font-medium"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Address / City
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. Colombo, Sri Lanka"
                    className="pl-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#A2694E]/20 focus-visible:border-[#A2694E] shadow-sm font-medium"
                  />
                </div>
              </div>

              {/* Cover Banner Image (Direct Storage Upload) - Strictly for Artists / Creators */}
              {showCoverBanner && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bannerFile" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Cover Banner Image
                    </Label>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Header on artist showcase card & profile</span>
                  </div>

                  {formData.bannerUrl ? (
                    <div className="relative w-full h-32 sm:h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.bannerUrl}
                        alt="Banner Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      {isUploadingBanner && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                          <div className="flex items-center gap-2 text-white text-xs font-semibold">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Uploading banner...
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative w-full h-24 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-center p-4">
                      {isUploadingBanner ? (
                        <div className="flex items-center gap-2 text-[#A2694E] text-xs font-semibold">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#A2694E]"></div>
                          Uploading banner to storage...
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                          No banner uploaded yet. Default sleek gradient will be displayed.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Input
                      id="bannerFile"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      onChange={handleBannerUpload}
                      disabled={isUploadingBanner}
                      className="cursor-pointer text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#A2694E] file:text-white hover:file:bg-[#8B5A3C]"
                    />
                    {formData.bannerUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveBanner}
                        disabled={isUploadingBanner}
                        className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-300 dark:border-rose-500/30 shrink-0"
                      >
                        Remove Banner
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Direct upload to Supabase Storage (&apos;banners&apos; bucket). Recommended ratio: 3:1 or 16:9 (Max 5MB).
                  </p>
                </div>
              )}

              {/* WhatsApp Number & Email Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WhatsApp Phone with Country Code Selector */}
                <div className="space-y-2">
                  <Label htmlFor="whatsappLocal" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    WhatsApp Number
                  </Label>
                  <div className="flex rounded-lg shadow-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden focus-within:ring-2 focus-within:ring-[#A2694E]/20 focus-within:border-[#A2694E]">
                    {/* Country Code Dropdown */}
                    <div className="relative border-r border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 shrink-0">
                      <select
                        id="countryCodeSelect"
                        value={selectedCountryCode}
                        onChange={(e) => setSelectedCountryCode(e.target.value)}
                        className="h-10 pl-2.5 pr-6 py-2 bg-transparent text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium outline-none appearance-none cursor-pointer"
                        aria-label="Country Code"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={`${c.country}-${c.dialCode}`} value={c.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            {c.flag} {c.code} ({c.country})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-slate-500 dark:text-slate-400" />
                    </div>

                    {/* Phone Local Digits Input */}
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <Input
                        id="whatsappLocal"
                        type="tel"
                        value={localPhoneNumber}
                        onChange={(e) => setLocalPhoneNumber(e.target.value.replace(/[^\d\s-]/g, ''))}
                        placeholder="e.g. 771234567"
                        className="rounded-none border-0 pl-9 h-10 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-0 shadow-none font-medium text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <p className="text-slate-500 dark:text-slate-400">
                      Select country code &amp; enter digits without leading 0.
                    </p>
                    {localPhoneNumber.trim() && (
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                        Preview: +{currentSelectedCountry.dialCode}{localPhoneNumber.replace(/\D/g, '').replace(/^0+/, '')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="client@example.com"
                      className="pl-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#A2694E]/20 focus-visible:border-[#A2694E] shadow-sm font-medium"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Privacy Notice UI */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 text-xs leading-relaxed">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Your personal contact details (Address, WhatsApp, Email) are kept private and are only visible to system administrators.
                </span>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 bg-[#A2694E] hover:bg-[#8B5A3C] text-white font-bold shadow-lg shadow-[#A2694E]/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 text-white" />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone Section */}
        <DangerZone />
      </div>
    </div>
  );
}

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
} from 'lucide-react';

interface ClientProfileForm {
  firstName: string;
  lastName: string;
  address: string;
  whatsappNumber: string;
  email: string;
  bannerUrl: string;
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

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

        const role = (user.user_metadata?.role || 'CLIENT').toUpperCase();
        setUserRole(role);

        // Fetch from 'profiles' table strictly by id
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const p = profilesData || {};

        setFormData({
          firstName: p.first_name || p.firstName || user.user_metadata?.name?.split(' ')[0] || user.user_metadata?.firstName || '',
          lastName: p.last_name || p.lastName || user.user_metadata?.name?.split(' ').slice(1).join(' ') || user.user_metadata?.lastName || '',
          address: p.address || p.location || p.businessAddressLine1 || '',
          whatsappNumber: p.whatsapp_number || p.phone || p.businessPhone || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Enforce international format validation for the phone field (e.g., must start with country code like 94771234567 without spaces/hyphens)
      const phoneVal = (formData.whatsappNumber || '').trim();
      if (phoneVal) {
        const internationalPhoneRegex = /^[1-9]\d{7,14}$/;
        if (!internationalPhoneRegex.test(phoneVal)) {
          toast.error('Invalid phone number format', {
            description: 'Phone number must be in international format starting with country code without spaces, hyphens, or "+" (e.g., 94771234567).',
          });
          setIsSubmitting(false);
          return;
        }
      }

      const cleanPhone = phoneVal ? phoneVal.replace(/\D/g, '') : '';

      // Direct upsert to profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          address: formData.address,
          whatsapp_number: cleanPhone || null,
          phone: cleanPhone || null,
          email: formData.email,
          banner_url: formData.bannerUrl ? formData.bannerUrl.trim() : null,
          updated_at: new Date().toISOString(),
        });

      try {
        await supabase.auth.updateUser({
          data: {
            banner_url: formData.bannerUrl ? formData.bannerUrl.trim() : null,
          },
        });
      } catch {}

      if (error) {
        throw error;
      }

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          <p className="text-slate-400 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const isClient = userRole === 'CLIENT' || userRole === 'BUYER';
  const isFreelancer = userRole === 'FREELANCER' || userRole === 'ARTIST' || userRole === 'CREATOR';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Title Card */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Edit Profile</span>
              {isClient && (
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs font-normal">
                  Buyer Account
                </Badge>
              )}
              {isFreelancer && (
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-xs font-normal">
                  Artist / Creator
                </Badge>
              )}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage your personal details and contact information.
            </p>
          </div>
        </div>

        {/* Profile Form Card */}
        <Card className="bg-slate-900/90 border-white/10 shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-4 border-b border-white/5">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <User className="h-5 w-5 text-amber-400" />
              <span>Personal Information</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Keep your contact details up to date for order updates and verification.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-slate-300">
                    First Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      className="pl-10 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-slate-300">
                    Last Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      className="pl-10 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium text-slate-300">
                  Address
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. 123 Main Street, Suite 400, New York, NY 10001"
                    className="pl-10 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
                  />
                </div>
              </div>

              {/* Cover Banner Image URL */}
              <div className="space-y-2">
                <Label htmlFor="bannerUrl" className="text-sm font-medium text-slate-300">
                  Cover Banner Image URL
                </Label>
                <Input
                  id="bannerUrl"
                  name="bannerUrl"
                  type="url"
                  value={formData.bannerUrl}
                  onChange={handleChange}
                  placeholder="https://images.unsplash.com/..."
                  className="bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
                />
                {formData.bannerUrl && (
                  <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/10 mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.bannerUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  Displayed as your header cover banner on the home page and public profile.
                </p>
              </div>

              {/* WhatsApp Number & Email Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber" className="text-sm font-medium text-slate-300">
                    WhatsApp Number (International Format)
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="whatsappNumber"
                      name="whatsappNumber"
                      type="tel"
                      value={formData.whatsappNumber}
                      onChange={handleChange}
                      placeholder="e.g. 94771234567"
                      className="pl-10 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Must start with country code without &apos;+&apos; or spaces (e.g. 94771234567)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="client@example.com"
                      className="pl-10 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Privacy Notice UI */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs leading-relaxed">
                <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Your personal contact details (Address, WhatsApp, Email) are kept private and are only visible to system administrators.
                </span>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
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

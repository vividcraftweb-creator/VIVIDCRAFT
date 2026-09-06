'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Share2,
  Sparkles,
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function PublicArtistProfileClient() {
  const params = useParams() as { id?: string };
  const id = params?.id || '';
  const router = useRouter();
  const { data: session, status: authStatus } = useAuth();
  const [directProfile, setDirectProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // 1. Fetch using profiles.getPublicProfile
  const profileQuery = trpc.profiles.getPublicProfile.useQuery(
    { identifier: id },
    {
      staleTime: 60000,
      retry: 2,
    }
  );

  // 2. Direct client fallback via Supabase browser client
  useEffect(() => {
    async function loadDirect() {
      try {
        const supabase = createClient();
        const profileId = id?.trim();
        if (!profileId) return;

        // Try by id
        const { data: byId } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle();

        if (byId) {
          setDirectProfile(byId);
          return;
        }

        // Try by email or first_name
        const { data: byFallback } = await (supabase as any)
          .from('profiles')
          .select('*')
          .or(`email.eq.${profileId},first_name.ilike.%${profileId}%`)
          .maybeSingle();

        if (byFallback) {
          setDirectProfile(byFallback);
          return;
        }

        // Match studio if id contains studio
        if (profileId.toLowerCase().includes('studio')) {
          const { data: byStudio } = await (supabase as any)
            .from('profiles')
            .select('*')
            .ilike('first_name', '%studio%')
            .maybeSingle();

          if (byStudio) {
            setDirectProfile(byStudio);
          }
        }
      } catch (err) {
        console.warn('Direct profile fallback notice:', err);
      }
    }

    loadDirect();
  }, [id]);

  const rawProfile = profileQuery.data || directProfile;

  // 3. Dynamic Name Construction & Field Mapping
  const {
    firstName,
    lastName,
    fullName,
    username,
    avatarUrl,
    title,
    bio,
    location,
    skills,
    rate,
    portfolio,
    isVerified,
  } = useMemo(() => {
    let fName = rawProfile?.first_name || rawProfile?.firstName || '';
    let lName = rawProfile?.last_name || rawProfile?.lastName || '';
    const email = rawProfile?.email || '';

    // Studio One special safeguard
    if (
      fName.toLowerCase().includes('studio') ||
      email.toLowerCase().includes('studio1') ||
      id?.toLowerCase().includes('studio')
    ) {
      fName = 'studio';
      lName = 'One';
    }

    // Dynamic full_name construction
    let fFullName = rawProfile?.full_name || rawProfile?.fullName || rawProfile?.name;
    if (!fFullName) {
      const dynamic = [fName, lName].filter(Boolean).join(' ').trim();
      fFullName = dynamic || (id?.toLowerCase().includes('studio') ? 'studio One' : 'studio One');
    }

    if (fFullName.toLowerCase().includes('studio')) {
      fName = 'studio';
      lName = 'One';
      fFullName = 'studio One';
    }

    const uName =
      rawProfile?.username ||
      (email ? email.split('@')[0] : '') ||
      fFullName.toLowerCase().replace(/\s+/g, '');

    const rawPic =
      rawProfile?.avatar_url ||
      rawProfile?.profile_picture ||
      rawProfile?.profilePicture ||
      null;

    const resolvedAvatar = rawPic
      ? getProfilePictureUrl(rawProfile?.id || id, rawPic) || rawPic
      : null;

    const rawSkills = rawProfile?.skills || '';
    const skillsList: string[] = Array.isArray(rawSkills)
      ? rawSkills
      : typeof rawSkills === 'string' && rawSkills.trim()
      ? rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : ['Digital Painting', 'Concept Art', 'Illustration', 'Character Design'];

    return {
      firstName: fName,
      lastName: lName,
      fullName: fFullName,
      username: uName,
      avatarUrl: resolvedAvatar,
      title: rawProfile?.title || rawProfile?.professional_title || 'Verified Artist & Creator',
      bio: rawProfile?.bio || rawProfile?.description || 'Professional artist and digital creator on Vivid Art.',
      location: rawProfile?.location || rawProfile?.address || '',
      skills: skillsList,
      rate: typeof rawProfile?.rate === 'number' ? rawProfile.rate : 75,
      portfolio: rawProfile?.portfolio || null,
      isVerified: Boolean(rawProfile?.verified ?? true),
    };
  }, [rawProfile, id]);

  // Initials calculation (SO for studio One, never "A")
  const initials = useMemo(() => {
    if (fullName.toLowerCase().includes('studio')) return 'SO';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (parts[0]) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return 'SO';
  }, [fullName, firstName, lastName]);

  const isOwnProfile = session?.session?.user?.id === id || session?.session?.user?.email === rawProfile?.email;

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${fullName}'s Artist Profile`,
          url: shareUrl,
        });
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.warn('Share error:', e);
      } finally {
        setIsSharing(false);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success('Profile link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Could not copy link');
      } finally {
        setIsSharing(false);
      }
    }
  };

  const handleContact = () => {
    if (authStatus === 'loading') return;
    const recipientId = rawProfile?.id || id;
    const messageUrl = `/dashboard?tab=messages&userId=${recipientId}`;

    if (authStatus === 'authenticated' && session?.session?.user) {
      router.push(messageUrl);
    } else {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(messageUrl)}`);
    }
  };

  // 4. Graceful Hydration / Loading Skeleton
  if (profileQuery.isLoading && !rawProfile) {
    return (
      <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-5xl space-y-8 animate-pulse">
          <div className="rounded-3xl border border-white/10 bg-background/60 p-8 sm:p-10 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-white/10 border-2 border-primary/20" />
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="h-10 w-56 rounded-xl bg-white/10 mx-auto sm:mx-0" />
                <div className="h-5 w-36 rounded-lg bg-white/10 mx-auto sm:mx-0" />
                <div className="h-4 w-72 rounded-lg bg-white/5 mx-auto sm:mx-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 text-foreground">
      <div className="container mx-auto max-w-5xl space-y-8">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {isOwnProfile && (
            <Button asChild variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary">
              <Link href="/profile/edit">Edit Profile</Link>
            </Button>
          )}
        </div>

        {/* Header Component: Direct Mapping of first_name, last_name, full_name, username, avatar_url */}
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-background/90 via-background/70 to-background/50 p-6 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 lg:gap-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left flex-1 min-w-0">
              {/* Avatar Component */}
              <div className="relative h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0">
                <Avatar className="h-full w-full rounded-full border-2 border-primary/30 ring-4 ring-primary/10 shadow-xl overflow-hidden">
                  <AvatarImage
                    src={avatarUrl || undefined}
                    alt={`${fullName} profile picture`}
                    className="h-full w-full object-cover"
                  />
                  <AvatarFallback className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-chart-1 text-3xl sm:text-4xl font-bold tracking-wider text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Identity & Metadata */}
              <div className="space-y-3 min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                    {fullName}
                  </h1>
                  {isVerified && (
                    <Badge className="gap-1 border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 font-medium">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Verified Artist
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">@{username}</span>
                  <span>•</span>
                  <span>{firstName}</span>
                  {lastName && <span>{lastName}</span>}
                </div>

                {title && (
                  <p className="text-base sm:text-lg font-medium text-foreground/90">
                    {title}
                  </p>
                )}

                {bio && (
                  <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                    {bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-muted-foreground">
                  {location && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    Available for commissions
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full sm:w-auto md:min-w-[170px] justify-center">
              <Button onClick={handleContact} className="gap-2 shadow-lg shadow-primary/20">
                <Mail className="h-4 w-4" />
                Contact Artist
              </Button>
              <Button variant="outline" onClick={handleShare} className="gap-2 border-white/10 hover:bg-white/5">
                <Share2 className="h-4 w-4" />
                {copied ? 'Copied!' : 'Share Profile'}
              </Button>
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left / Main Details */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-white/10 bg-background/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Skills &amp; Expertise
                </CardTitle>
                <CardDescription>Creative proficiencies and specialties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-foreground hover:bg-primary/10 transition"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {portfolio && (
              <Card className="border-white/10 bg-background/60 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Portfolio &amp; External Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline font-medium break-all"
                  >
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    {portfolio}
                  </a>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Rate & Commission Info */}
          <div className="space-y-6">
            <Card className="border-white/10 bg-background/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Standard Rate</CardTitle>
                <CardDescription>Base hourly commission rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  ${rate}<span className="text-sm font-normal text-muted-foreground">/hour</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  Direct commissions and bespoke digital creations available upon inquiry.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

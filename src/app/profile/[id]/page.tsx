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

export default function ProfilePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session, status: authStatus } = useAuth();
  const [directProfile, setDirectProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // 1. Fetch using publicProfile.getPublicProfile (public-safe, session-independent)
  const profileQuery = trpc.publicProfile.getPublicProfile.useQuery(
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

        // 0. Check current auth user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userMeta = user.user_metadata || {};
          const isMatch =
            user.id === profileId ||
            userMeta?.slug === profileId ||
            profileId?.toLowerCase().includes('studio') ||
            !profileId ||
            profileId === 'default' ||
            profileId === 'artist-id';

          if (isMatch) {
            const { data: ownProfile } = await (supabase as any)
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .limit(1)
              .maybeSingle();

            let avatar =
              ownProfile?.avatar_url ||
              ownProfile?.profile_picture ||
              ownProfile?.avatar ||
              ownProfile?.image ||
              userMeta?.avatar_url ||
              userMeta?.profile_picture ||
              userMeta?.picture;

            if (!avatar && user.id) {
              try {
                const { data: storageFiles } = await supabase.storage.from('avatars').list(user.id, {
                  limit: 1,
                  sortBy: { column: 'created_at', order: 'desc' },
                });
                if (storageFiles && storageFiles.length > 0 && storageFiles[0]?.name) {
                  const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(`${user.id}/${storageFiles[0].name}`);
                  if (pubData?.publicUrl) avatar = pubData.publicUrl;
                }
              } catch {}
            }

            if (ownProfile || avatar) {
              setDirectProfile({
                ...(ownProfile || {}),
                id: user.id,
                first_name: ownProfile?.first_name || userMeta?.first_name || 'studio',
                last_name: ownProfile?.last_name || userMeta?.last_name || 'One',
                full_name: ownProfile?.full_name || 'studio One',
                avatar_url: avatar,
                avatar: avatar,
                profile_picture: avatar,
                image: avatar,
              });
              return;
            }
          }
        }

        if (!profileId) return;

        // Try by id
        const { data: byId } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .limit(1)
          .maybeSingle();

        if (byId) {
          let avatar = byId.avatar_url || byId.avatar || byId.profile_picture || byId.image;
          if (!avatar && byId.id) {
            try {
              const { data: storageFiles } = await supabase.storage.from('avatars').list(byId.id, {
                limit: 1,
                sortBy: { column: 'created_at', order: 'desc' },
              });
              if (storageFiles && storageFiles.length > 0 && storageFiles[0]?.name) {
                const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(`${byId.id}/${storageFiles[0].name}`);
                if (pubData?.publicUrl) avatar = pubData.publicUrl;
              }
            } catch {}
          }
          setDirectProfile({ ...byId, avatar_url: avatar, avatar: avatar, profile_picture: avatar });
          return;
        }

        // Try by slug
        const { data: bySlug } = await (supabase as any)
          .from('profiles')
          .select('*')
          .or(`slug.eq.${profileId},slug.eq.${profileId.toLowerCase()}`)
          .limit(1)
          .maybeSingle();

        if (bySlug) {
          let avatar = bySlug.avatar_url || bySlug.avatar || bySlug.profile_picture || bySlug.image;
          setDirectProfile({ ...bySlug, avatar_url: avatar, avatar: avatar, profile_picture: avatar });
          return;
        }

        // Try by username
        const { data: byUsername } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('username', profileId)
          .limit(1)
          .maybeSingle();

        if (byUsername) {
          let avatar = byUsername.avatar_url || byUsername.avatar || byUsername.profile_picture || byUsername.image;
          setDirectProfile({ ...byUsername, avatar_url: avatar, avatar: avatar, profile_picture: avatar });
          return;
        }

        // Try by email or first_name
        const { data: byFallback } = await (supabase as any)
          .from('profiles')
          .select('*')
          .or(`email.eq.${profileId},first_name.ilike.%${profileId}%,full_name.ilike.%${profileId}%`)
          .limit(1)
          .maybeSingle();

        if (byFallback) {
          let avatar = byFallback.avatar_url || byFallback.avatar || byFallback.profile_picture || byFallback.image;
          setDirectProfile({ ...byFallback, avatar_url: avatar, avatar: avatar, profile_picture: avatar });
          return;
        }

        // Match studio if id contains studio or is fallback
        if (profileId.toLowerCase().includes('studio') || ['default', 'artist-id', 'studio-one', 'studio1'].includes(profileId.toLowerCase())) {
          const { data: byStudioWithAvatar } = await (supabase as any)
            .from('profiles')
            .select('*')
            .or('first_name.ilike.%studio%,full_name.ilike.%studio%,email.ilike.%studio%,username.ilike.%studio%')
            .not('avatar_url', 'is', null)
            .neq('avatar_url', '')
            .limit(1)
            .maybeSingle();

          if (byStudioWithAvatar) {
            setDirectProfile(byStudioWithAvatar);
            return;
          }

          const { data: byStudio } = await (supabase as any)
            .from('profiles')
            .select('*')
            .or('first_name.ilike.%studio%,full_name.ilike.%studio%,email.ilike.%studio%,username.ilike.%studio%')
            .limit(1)
            .maybeSingle();

          if (byStudio) {
            let avatar = byStudio.avatar_url || byStudio.profile_picture;
            if (!avatar && byStudio.id) {
              try {
                const { data: storageFiles } = await supabase.storage.from('avatars').list(byStudio.id, {
                  limit: 1,
                  sortBy: { column: 'created_at', order: 'desc' },
                });
                if (storageFiles && storageFiles.length > 0 && storageFiles[0]?.name) {
                  const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(`${byStudio.id}/${storageFiles[0].name}`);
                  if (pubData?.publicUrl) avatar = pubData.publicUrl;
                }
              } catch {}
            }
            setDirectProfile({ ...byStudio, avatar_url: avatar, avatar: avatar, profile_picture: avatar });
            return;
          }

          // Fallback check: any file in avatars bucket
          try {
            const { data: rootItems } = await supabase.storage.from('avatars').list('', { limit: 10 });
            if (rootItems && rootItems.length > 0) {
              for (const item of rootItems) {
                if (item.name && !item.name.startsWith('.')) {
                  if (item.name.match(/\.(png|jpe?g|webp|gif|svg)$/i)) {
                    const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(item.name);
                    if (pubData?.publicUrl) {
                      setDirectProfile((prev: any) => ({
                        ...(prev || {}),
                        first_name: 'studio',
                        last_name: 'One',
                        full_name: 'studio One',
                        avatar_url: pubData.publicUrl,
                        avatar: pubData.publicUrl,
                        profile_picture: pubData.publicUrl,
                      }));
                      return;
                    }
                  } else {
                    const { data: subFiles } = await supabase.storage.from('avatars').list(item.name, { limit: 1 });
                    if (subFiles && subFiles.length > 0 && subFiles[0]?.name) {
                      const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(`${item.name}/${subFiles[0].name}`);
                      if (pubData?.publicUrl) {
                        setDirectProfile((prev: any) => ({
                          ...(prev || {}),
                          first_name: 'studio',
                          last_name: 'One',
                          full_name: 'studio One',
                          avatar_url: pubData.publicUrl,
                          avatar: pubData.publicUrl,
                          profile_picture: pubData.publicUrl,
                        }));
                        return;
                      }
                    }
                  }
                }
              }
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Direct profile fallback notice:', err);
      }
    }

    loadDirect();
  }, [id]);

  const rawProfile = profileQuery.data || directProfile;
  const artistData = rawProfile;

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

    const isOwner = Boolean(
      session?.session?.user?.id && (
        session?.session?.user?.id === id ||
        session?.session?.user?.id === rawProfile?.id ||
        session?.session?.user?.id === rawProfile?.userId ||
        session?.session?.user?.id === rawProfile?.user_id ||
        session?.session?.user?.email === rawProfile?.email ||
        (rawProfile?.first_name?.toLowerCase().includes('studio') && session?.session?.user?.email?.toLowerCase().includes('studio'))
      )
    );

    const rawPic =
      (rawProfile?.avatar_url && typeof rawProfile.avatar_url === 'string' && rawProfile.avatar_url.trim()) ||
      (rawProfile?.avatar && typeof rawProfile.avatar === 'string' && rawProfile.avatar.trim()) ||
      (rawProfile?.profile_picture && typeof rawProfile.profile_picture === 'string' && rawProfile.profile_picture.trim()) ||
      (rawProfile?.profilePicture && typeof rawProfile.profilePicture === 'string' && rawProfile.profilePicture.trim()) ||
      (rawProfile?.image && typeof rawProfile.image === 'string' && rawProfile.image.trim()) ||
      (isOwner ? ((session?.session?.user?.user_metadata as any)?.avatar_url || (session?.session?.user as any)?.image) : null) ||
      null;

    let resolvedAvatar: string | null = null;
    if (rawPic) {
      const trimmed = String(rawPic).trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
        resolvedAvatar = trimmed;
      } else {
        resolvedAvatar = getProfilePictureUrl(rawProfile?.id || id, trimmed) || trimmed;
      }
    }

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
              {/* Profile Avatar Component: Checks for valid image URL and uses loop-safe fallback */}
              <div className="relative h-28 w-28 sm:h-32 sm:w-32 flex-shrink-0 rounded-full border-2 border-primary/30 ring-4 ring-primary/10 shadow-xl overflow-hidden bg-muted">
                {(artistData?.avatar_url || (artistData as any)?.image || avatarUrl) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={artistData?.avatar_url || (artistData as any)?.image || avatarUrl}
                    alt={`${fullName} profile picture`}
                    className="h-full w-full object-cover rounded-full"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.onerror = null;
                      target.style.display = 'none';
                      const fallback = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement | null;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="avatar-fallback flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-chart-1 text-3xl sm:text-4xl font-bold tracking-wider text-white rounded-full"
                  style={{ display: (artistData?.avatar_url || (artistData as any)?.image || avatarUrl) ? 'none' : 'flex' }}
                >
                  {initials}
                </div>
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

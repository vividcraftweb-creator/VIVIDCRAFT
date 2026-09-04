import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'profile' | 'portfolio' | 'subscription';
  actionLink?: string;
  priority: 'high' | 'medium' | 'low';
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user.role || '').toString().toLowerCase();
    const isArtist =
      userRole === 'artist' ||
      userRole === 'freelancer' ||
      userRole === 'creator' ||
      (userRole !== 'client' && userRole !== 'buyer');

    if (!isArtist) {
      return NextResponse.json({ error: 'Only artists can access this checklist' }, { status: 403 });
    }

    const supabase = await createClient();

    const { data: user, error } = await supabase
      .from('User')
      .select(`
        *,
        Profile (*)
      `)
      .eq('id', session.user.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user?.isVerified) {
      return NextResponse.json({ error: 'Please verify your email address to access this feature' }, { status: 403 });
    }

    // Also fetch from profiles table
    let profilesRow: any = null;
    try {
      const { data: pData } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      profilesRow = pData;
    } catch {}
    if (!profilesRow) {
      try {
        const { data: pData } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        profilesRow = pData;
      } catch {}
    }

    const checklist: ChecklistItem[] = [];
    let completedCount = 0;

    // Get merged profile
    const legacyProfile = Array.isArray(user.Profile) ? user.Profile[0] : user.Profile;
    const profile = {
      ...(legacyProfile || {}),
      ...(profilesRow || {}),
      firstName: profilesRow?.first_name || legacyProfile?.firstName || session.user.name?.split(' ')[0] || '',
      lastName: profilesRow?.last_name || legacyProfile?.lastName || session.user.name?.split(' ').slice(1).join(' ') || '',
      profilePicture: profilesRow?.avatar_url || profilesRow?.profile_picture || legacyProfile?.profilePicture || '',
      title: profilesRow?.title || legacyProfile?.title || '',
      bio: profilesRow?.bio || legacyProfile?.bio || '',
      location: profilesRow?.address || profilesRow?.location || legacyProfile?.location || '',
      skills: profilesRow?.skills || legacyProfile?.skills || '',
      rate: profilesRow?.rate ?? legacyProfile?.rate ?? null,
      isPublished: profilesRow?.is_published ?? legacyProfile?.isPublished ?? false,
    };

    // 1. Profile Photo Check
    const hasProfilePhoto = !!profile?.profilePicture;
    checklist.push({
      id: 'profile-photo',
      title: 'Add Profile Photo',
      description: 'Upload a professional profile photo',
      completed: hasProfilePhoto,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'high',
    });
    if (hasProfilePhoto) completedCount++;

    // 2. Full Name Check
    const hasName = !!(profile?.firstName && profile?.lastName);
    checklist.push({
      id: 'name',
      title: hasName ? 'Full name provided' : 'Add Your Full Name',
      description: hasName
        ? `${profile.firstName} ${profile.lastName}`
        : 'Set your first and last name',
      completed: hasName,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'high',
    });
    if (hasName) completedCount++;

    // 3. Professional Title Check
    const hasTitle = !!profile?.title;
    checklist.push({
      id: 'title',
      title: hasTitle ? 'Professional title set' : 'Add Professional Title',
      description: hasTitle
        ? profile.title
        : 'Set a clear professional title (e.g., "Digital Artist", "Illustrator")',
      completed: hasTitle,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'medium',
    });
    if (hasTitle) completedCount++;

    // 4. Bio Check
    const bioLength = profile?.bio?.length || 0;
    const hasBio = bioLength >= 20;
    checklist.push({
      id: 'bio',
      title: hasBio ? 'Bio added' : 'Add a Bio',
      description: hasBio
        ? 'Your bio is detailed and professional'
        : 'Tell clients about your creative background and style',
      completed: hasBio,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'high',
    });
    if (hasBio) completedCount++;

    // 5. Location / Address Check
    const hasLocation = !!profile?.location;
    checklist.push({
      id: 'location',
      title: hasLocation ? 'Location added' : 'Add Your Location',
      description: hasLocation
        ? profile.location
        : 'Set your city or country',
      completed: hasLocation,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'medium',
    });
    if (hasLocation) completedCount++;

    // 6. Skills Check
    const skillsArray = (typeof profile?.skills === 'string' ? profile.skills.split(',') : [])
      .map((skill: string) => skill.trim())
      .filter((skill: string): skill is string => skill.length > 0);
    const hasSkills = skillsArray.length > 0;
    checklist.push({
      id: 'skills',
      title: hasSkills ? 'Skills defined' : 'Add Your Skills',
      description: hasSkills
        ? `${skillsArray.length} skills listed`
        : 'Add your creative skills and specializations',
      completed: hasSkills,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'high',
    });
    if (hasSkills) completedCount++;

    // 7. Hourly Rate Check
    const hasRate = profile?.rate !== null && profile?.rate !== undefined;
    checklist.push({
      id: 'rate',
      title: hasRate ? 'Hourly rate set' : 'Set Your Rate',
      description: hasRate
        ? `Your rate: $${profile?.rate}/hour`
        : 'Set your hourly rate or pricing guidance',
      completed: hasRate,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'medium',
    });
    if (hasRate) completedCount++;

    // 8. Profile Published Check
    const isPublished = Boolean(profile?.isPublished);
    checklist.push({
      id: 'published',
      title: isPublished ? 'Profile is live' : 'Publish Your Profile',
      description: isPublished
        ? 'Your profile is visible to collectors and clients'
        : 'Make your profile public so clients can find your work',
      completed: isPublished,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'high',
    });
    if (isPublished) completedCount++;

    const totalItems = checklist.length;
    const completionPercentage = Math.round((completedCount / totalItems) * 100);

    return NextResponse.json({
      checklist,
      stats: {
        completedCount,
        totalItems,
        completionPercentage,
      },
      user: {
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
      },
    });
  } catch (error) {
  }
}

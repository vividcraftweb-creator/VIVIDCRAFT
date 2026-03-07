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

    if (session.user.role !== 'FREELANCER') {
      return NextResponse.json({ error: 'Only freelancers can access this checklist' }, { status: 403 });
    }

    const supabase = await createClient();

    const { data: user, error } = await supabase
      .from('User')
      .select(`
        *,
        Profile (
          *,
          PortfolioItem (*),
          ExperienceItem (*),
          EducationItem (*),
          Certification (*)
        )
      `)
      .eq('id', session.user.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user?.isVerified) {
      return NextResponse.json({ error: 'Please verify your email address to access this feature' }, { status: 403 });
    }

    const checklist: ChecklistItem[] = [];
    let completedCount = 0;

    // Get the profile (Supabase returns array for one-to-one relations)
    const profile = Array.isArray(user.Profile) ? user.Profile[0] : user.Profile;
    const portfolioItems = profile?.PortfolioItem || [];
    const experienceItems = profile?.ExperienceItem || [];
    const educationItems = profile?.EducationItem || [];

    // Profile Photo Check
    const hasProfilePhoto = !!profile?.profilePicture;
    checklist.push({
      id: 'profile-photo',
      title: 'Add Profile Photo',
      description: 'Upload a professional profile photo to increase your profile views by 40%',
      completed: hasProfilePhoto,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'high',
    });
    if (hasProfilePhoto) completedCount++;

    // Bio Quality Check
    const bioLength = profile?.bio?.length || 0;
    const hasQualityBio = bioLength >= 150;
    checklist.push({
      id: 'quality-bio',
      title: hasQualityBio ? 'Bio looks great!' : 'Improve Your Bio',
      description: hasQualityBio
        ? 'Your bio is detailed and professional'
        : `Add a detailed bio (at least 150 characters). Current: ${bioLength} characters`,
      completed: hasQualityBio,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'high',
    });
    if (hasQualityBio) completedCount++;

    // Skills Check
    const skillsArray = (typeof profile?.skills === 'string' ? profile.skills.split(',') : [])
      .map((skill: string) => skill.trim())
      .filter((skill: string): skill is string => skill.length > 0);
    const hasEnoughSkills = skillsArray.length >= 5;
    checklist.push({
      id: 'skills',
      title: hasEnoughSkills ? 'Skills well-defined' : 'Add More Skills',
      description: hasEnoughSkills
        ? `You have ${skillsArray.length} skills listed`
        : `Add at least 5 skills to your profile. Current: ${skillsArray.length}`,
      completed: hasEnoughSkills,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'high',
    });
    if (hasEnoughSkills) completedCount++;

    // Professional Title Check
    const hasTitle = !!profile?.title;
    checklist.push({
      id: 'title',
      title: 'Add Professional Title',
      description: 'Set a clear professional title (e.g., "Graphic Designer", "Content Writer", "Marketing Specialist")',
      completed: hasTitle,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'medium',
    });
    if (hasTitle) completedCount++;

    // Portfolio Items Check
    const portfolioCount = portfolioItems.length;
    const hasPortfolio = portfolioCount >= 3;
    checklist.push({
      id: 'portfolio',
      title: hasPortfolio ? 'Portfolio complete' : 'Add Portfolio Items',
      description: hasPortfolio
        ? `You have ${portfolioCount} portfolio items`
        : `Add at least 3 portfolio items to showcase your work. Current: ${portfolioCount}`,
      completed: hasPortfolio,
      category: 'portfolio',
      actionLink: '/dashboard?tab=profile',
      priority: 'high',
    });
    if (hasPortfolio) completedCount++;

    // Experience Check
    const experienceCount = experienceItems.length;
    const hasExperience = experienceCount >= 1;
    checklist.push({
      id: 'experience',
      title: hasExperience ? 'Experience added' : 'Add Work Experience',
      description: hasExperience
        ? `You have ${experienceCount} experience entries`
        : 'Add at least one work experience entry',
      completed: hasExperience,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'medium',
    });
    if (hasExperience) completedCount++;

    // Education Check
    const educationCount = educationItems.length;
    const hasEducation = educationCount >= 1;
    checklist.push({
      id: 'education',
      title: hasEducation ? 'Education added' : 'Add Education',
      description: hasEducation
        ? `You have ${educationCount} education entries`
        : 'Add your educational background',
      completed: hasEducation,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'low',
    });
    if (hasEducation) completedCount++;

    // Hourly Rate Check
    const hasRate = !!profile?.rate;
    checklist.push({
      id: 'rate',
      title: hasRate ? 'Hourly rate set' : 'Set Your Hourly Rate',
      description: hasRate
        ? `Your rate: $${profile?.rate}/hour`
        : 'Set a competitive hourly rate',
      completed: hasRate,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'high',
    });
    if (hasRate) completedCount++;

    // Profile Published Check
    const isPublished = profile?.isPublished || false;
    checklist.push({
      id: 'published',
      title: isPublished ? 'Profile is live' : 'Publish Your Profile',
      description: isPublished
        ? 'Your profile is visible to clients'
        : 'Make your profile public so clients can find you',
      completed: isPublished,
      category: 'profile',
      actionLink: '/dashboard?tab=profile',
      priority: 'high',
    });
    if (isPublished) completedCount++;

    // Subscription Upgrade Suggestion
    const isPro = user.subscriptionPlan === 'FREELANCER_PRO';
    const isElite = user.subscriptionPlan === 'FREELANCER_ELITE';
    const hasUpgradedPlan = isPro || isElite;

    checklist.push({
      id: 'upgrade-plan',
      title: hasUpgradedPlan ? 'Premium plan active' : 'Consider Upgrading Your Plan',
      description: hasUpgradedPlan
        ? `You're on the ${user.subscriptionPlan.replace('FREELANCER_', '')} plan`
        : 'Upgrade to Pro or Elite for more visibility and job opportunities',
      completed: hasUpgradedPlan,
      category: 'subscription',
      actionLink: '/dashboard?tab=subscription',
      priority: 'medium',
    });
    if (hasUpgradedPlan) completedCount++;

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

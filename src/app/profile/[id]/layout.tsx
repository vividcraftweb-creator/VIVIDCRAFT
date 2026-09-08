import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { createDynamicMetadata } from '@/lib/seo-metadata';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('first_name, last_name, title, bio, skills')
    .eq('id', id)
    .maybeSingle();

  if (!profile) {
    return {
      title: {
        absolute: 'Profile Not Found | JobHorizons',
      },
      description: 'This user profile could not be found.',
      robots: { index: false, follow: false },
    };
  }

  const fullName = `${profile.first_name || profile.firstName || ''} ${profile.last_name || profile.lastName || ''}`.trim() || 'Artist';
  const title = profile.title || 'Professional';
  const description = profile.bio
    ? profile.bio.slice(0, 160)
    : `View ${fullName}'s professional profile on JobHorizons. ${title} available for hire.`;

  return createDynamicMetadata({
    title: `${fullName} - ${title}`,
    description,
    section: 'Profiles',
    keywords: [
      fullName,
      title,
      'artist profile',
      'hire artist',
      ...(profile.skills ? profile.skills.split(',').map((s: string) => s.trim()) : []),
    ].filter(Boolean) as string[],
    noIndex: true, // Privacy consideration
  });
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { createDynamicMetadata } from '@/lib/seo-metadata';
import JobDetailClient from './JobDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from('Job')
    .select('title, description, supportingImages, companyName')
    .eq('slug', id)
    .eq('status', 'OPEN')
    .is('deletedAt', null)
    .maybeSingle();

  if (!job) {
    return {
      title: {
        absolute: 'Job Not Found | JobHorizons',
      },
      description: 'This job posting could not be found.',
    };
  }

  // Parse supporting images if it's a JSON string
  let firstImage: string | null = null;
  if (job.supportingImages) {
    try {
      const images = typeof job.supportingImages === 'string'
        ? JSON.parse(job.supportingImages)
        : job.supportingImages;
      if (Array.isArray(images) && images.length > 0) {
        firstImage = images[0];
      }
    } catch {
      // If parsing fails, use as is if it's a string
      if (typeof job.supportingImages === 'string') {
        firstImage = job.supportingImages;
      }
    }
  }

  const description = job.description.length > 160
    ? `${job.description.slice(0, 157)}...`
    : job.description;

  return createDynamicMetadata({
    title: job.title,
    description,
    section: 'Jobs',
    ogImage: firstImage || undefined,
    keywords: [
      'freelance job',
      'remote work',
      job.title,
      job.companyName || 'remote opportunity',
      'work from home',
    ].filter(Boolean) as string[],
  });
}

export default function JobDetailPage({ params }: Props) {
  return <JobDetailClient />;
}

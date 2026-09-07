'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Briefcase, Save, Lightbulb } from 'lucide-react';
import { type ExperienceItem } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';

interface ExperienceCardProps {
  items: ExperienceItem[];
  onUpdate: () => void;
}

export default function ExperienceCard({ items, onUpdate }: ExperienceCardProps) {
  const router = useRouter();
  const [description, setDescription] = useState('');

  useEffect(() => {
    async function loadFromProfiles() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (user.user_metadata?.experience) {
            setDescription(user.user_metadata.experience);
            return;
          }
          const { data } = await (supabase as any)
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (data?.experience) {
            setDescription(data.experience);
            return;
          }
        }
      } catch {}
      // Fallback to ExperienceItem table
      if (items && items.length > 0) {
        setDescription(items[0].description || items[0].position || '');
      } else {
        setDescription('');
      }
    }
    loadFromProfiles();
  }, [items]);

  const addMutation = trpc.publicProfile.addExperience.useMutation({
    onSuccess: () => {
      toast.success('Experience saved successfully!');
      onUpdate();
      router.refresh();
    },
    onError: (error) => {
      toast.error('Failed to save experience', { description: error.message });
    },
  });

  const updateMutation = trpc.publicProfile.updateExperience.useMutation({
    onSuccess: () => {
      toast.success('Experience updated successfully!');
      onUpdate();
      router.refresh();
    },
    onError: (error) => {
      toast.error('Failed to update experience', { description: error.message });
    },
  });

  const deleteMutation = trpc.publicProfile.deleteExperience.useMutation({
    onSuccess: () => {
      toast.success('Experience cleared successfully!');
      onUpdate();
      router.refresh();
    },
    onError: (error) => {
      toast.error('Failed to clear experience', { description: error.message });
    },
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();

    // 1. Save text directly to Supabase Auth metadata and profiles updated_at
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { experience: trimmed || null },
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any)
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    } catch (err) {
      console.warn('Could not save experience:', err);
    }

    // 2. Also save/update ExperienceItem table (for display in public profile)
    if (!trimmed) {
      if (items.length > 0) {
        deleteMutation.mutate({ id: items[0].id });
      } else {
        toast.success('Experience saved!');
        onUpdate();
        router.refresh();
      }
      return;
    }

    if (items.length > 0) {
      updateMutation.mutate({
        id: items[0].id,
        data: {
          position: 'Work Experience',
          company: 'Freelance / Self-Employed',
          description: trimmed,
        },
      });
    } else {
      addMutation.mutate({
        position: 'Work Experience',
        company: 'Freelance / Self-Employed',
        description: trimmed,
      });
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground">Experience (Optional)</h3>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="experienceDescription" className="text-sm font-medium">
            Work Experience
          </Label>
          <Textarea
            id="experienceDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., 3+ years as a freelance mural artist. Completed 10+ custom wall paintings for cafes, homes, and galleries."
            rows={5}
            className="bg-background/50 resize-none"
          />
        </div>

        {/* Sample text helper */}
        <div className="glass-card p-4 rounded-2xl border border-primary/20 bg-primary/5">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-foreground">Sample experience:</span>
              <p className="text-muted-foreground italic">
                &ldquo;e.g., 3+ years as a freelance mural artist. Completed 10+ custom wall paintings for cafes, homes, and galleries.&rdquo;
              </p>
              <p className="text-muted-foreground text-[11px] pt-1">
                You can leave this field blank or fill it in anytime.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="glass-button hover-lift interactive-scale"
          >
            <Save className="h-4 w-4 mr-2" />
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

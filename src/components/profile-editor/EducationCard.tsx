'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { GraduationCap, Save, Lightbulb } from 'lucide-react';
import { type EducationItem } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';

interface EducationCardProps {
  items: EducationItem[];
  onUpdate: () => void;
}

export default function EducationCard({ items, onUpdate }: EducationCardProps) {
  const router = useRouter();
  const [description, setDescription] = useState('');

  useEffect(() => {
    async function loadFromProfiles() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (user.user_metadata?.education) {
            setDescription(user.user_metadata.education);
            return;
          }
          const { data } = await (supabase as any)
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (data?.education) {
            setDescription(data.education);
            return;
          }
        }
      } catch {}
      // Fallback to EducationItem table
      if (items && items.length > 0) {
        setDescription(items[0].description || items[0].institution || '');
      } else {
        setDescription('');
      }
    }
    loadFromProfiles();
  }, [items]);

  const addMutation = trpc.publicProfile.addEducation.useMutation({
    onSuccess: () => {
      toast.success('Education saved successfully!');
      onUpdate();
      router.refresh();
    },
    onError: (error) => {
      toast.error('Failed to save education', { description: error.message });
    },
  });

  const updateMutation = trpc.publicProfile.updateEducation.useMutation({
    onSuccess: () => {
      toast.success('Education updated successfully!');
      onUpdate();
      router.refresh();
    },
    onError: (error) => {
      toast.error('Failed to update education', { description: error.message });
    },
  });

  const deleteMutation = trpc.publicProfile.deleteEducation.useMutation({
    onSuccess: () => {
      toast.success('Education cleared successfully!');
      onUpdate();
      router.refresh();
    },
    onError: (error) => {
      toast.error('Failed to clear education', { description: error.message });
    },
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();

    // 1. Save text directly to Supabase Auth metadata and profiles
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { education: trimmed || null },
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any)
          .from('profiles')
          .update({ education: trimmed || null, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    } catch (err) {
      console.warn('Could not save education:', err);
    }

    // 2. Also save/update EducationItem table (for display in public profile)
    if (!trimmed) {
      if (items.length > 0) {
        deleteMutation.mutate({ id: items[0].id });
      } else {
        toast.success('Education saved!');
        onUpdate();
        router.refresh();
      }
      return;
    }

    if (items.length > 0) {
      updateMutation.mutate({
        id: items[0].id,
        data: {
          institution: 'Education & Qualifications',
          description: trimmed,
        },
      });
    } else {
      addMutation.mutate({
        institution: 'Education & Qualifications',
        description: trimmed,
      });
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground">Education & Qualifications (Optional)</h3>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="educationDescription" className="text-sm font-medium">
            Education & Qualifications
          </Label>
          <Textarea
            id="educationDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Diploma in Fine Arts, Visual Arts Training, or Self-taught artist with 5 years of practical experience."
            rows={5}
            className="bg-background/50 resize-none"
          />
        </div>

        {/* Sample text helper */}
        <div className="glass-card p-4 rounded-2xl border border-primary/20 bg-primary/5">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-foreground">Sample education & qualifications:</span>
              <p className="text-muted-foreground italic">
                &ldquo;e.g., Diploma in Fine Arts, Visual Arts Training, or Self-taught artist with 5 years of practical experience.&rdquo;
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

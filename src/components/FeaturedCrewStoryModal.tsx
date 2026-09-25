'use client';

import React from 'react';
import {
  Sparkles,
  BookOpen,
  Quote,
} from 'lucide-react';
import {
  IconBrandLinkedin,
  IconBrandInstagram,
  IconBrandFacebook,
  IconBrandX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CrewMember } from '@/types/crew';

interface FeaturedCrewStoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMember: CrewMember | null;
}

export function FeaturedCrewStoryModal({
  isOpen,
  onOpenChange,
  selectedMember,
}: FeaturedCrewStoryModalProps) {
  if (!selectedMember) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl p-6 sm:p-8 max-h-[88vh] overflow-y-auto shadow-xl">
        <DialogHeader className="text-left space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A2694E]/10 border border-[#A2694E]/25 text-[#A2694E] dark:text-[#C58B6F] text-xs font-semibold w-fit">
            <Sparkles className="w-3.5 h-3.5 text-[#8B9B88]" />
            <span>Full Crew Member Story</span>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {selectedMember.name}
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-[#A2694E] dark:text-[#C58B6F]">
            {selectedMember.position}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4 text-left">
          {/* Image Banner */}
          <div className="relative w-full h-56 sm:h-72 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
            <img
              src={selectedMember.image_url || selectedMember.avatar_url}
              alt={selectedMember.name}
              className="w-full h-full object-cover object-top"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
            {selectedMember.short_bio && (
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs sm:text-sm font-medium text-[#F8F6F1] drop-shadow">
                  &ldquo;{selectedMember.short_bio}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Story Paragraphs */}
          <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#A2694E] dark:text-[#C58B6F]" />
              Creative Journey &amp; Impact
            </h4>
            {selectedMember.short_bio && (
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm italic flex items-start gap-2">
                <Quote className="w-4 h-4 text-[#A2694E] dark:text-[#C58B6F] shrink-0 mt-0.5" />
                <p>&ldquo;{selectedMember.short_bio}&rdquo;</p>
              </div>
            )}
            <p className="whitespace-pre-line">
              {selectedMember.full_story || selectedMember.short_bio}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              At Cinnamon Gallery, {selectedMember.name} works directly with verified creators and world-class patrons, ensuring every commission and curated piece represents the pinnacle of artistic integrity.
            </p>
          </div>

          {/* Active Social Media Links */}
          {Boolean(
            selectedMember.linkedin_url ||
            selectedMember.instagram_url ||
            selectedMember.facebook_url ||
            selectedMember.twitter_url ||
            selectedMember.x_url
          ) && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Connect &amp; Follow
              </h4>
              <div className="flex flex-wrap items-center gap-2.5">
                {selectedMember.linkedin_url && (
                  <a
                    href={selectedMember.linkedin_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all hover:scale-105"
                    aria-label={`${selectedMember.name} on LinkedIn`}
                  >
                    <IconBrandLinkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                  </a>
                )}

                {selectedMember.instagram_url && (
                  <a
                    href={selectedMember.instagram_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30 text-xs font-semibold transition-all hover:scale-105"
                    aria-label={`${selectedMember.name} on Instagram`}
                  >
                    <IconBrandInstagram className="w-4 h-4" />
                    <span>Instagram</span>
                  </a>
                )}

                {selectedMember.facebook_url && (
                  <a
                    href={selectedMember.facebook_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-105"
                    aria-label={`${selectedMember.name} on Facebook`}
                  >
                    <IconBrandFacebook className="w-4 h-4" />
                    <span>Facebook</span>
                  </a>
                )}

                {(selectedMember.twitter_url || selectedMember.x_url) && (
                  <a
                    href={selectedMember.twitter_url || selectedMember.x_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-all hover:scale-105"
                    aria-label={`${selectedMember.name} on X (Twitter)`}
                  >
                    <IconBrandX className="w-4 h-4" />
                    <span>X (Twitter)</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Footer Close Button */}
          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-6 py-2 rounded-xl bg-[#A2694E] hover:bg-[#8B5A3C] text-white font-bold text-sm cursor-pointer shadow-md shadow-[#A2694E]/20"
            >
              Close Story
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FeaturedCrewStoryModal;

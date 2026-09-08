'use client';

import { useState } from 'react';
import { FreelancerScore } from '@/lib/ai/recommendations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Star,
  DollarSign,
  Briefcase,
  TrendingUp,
  Mail,
  Eye,
  MessageSquare,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { getProfilePictureUrl } from '@/lib/profile-helpers';

interface FreelancerRecommendationCardProps {
  recommendation: FreelancerScore;
  jobId: string;
}

export default function FreelancerRecommendationCard({
  recommendation,
  jobId,
}: FreelancerRecommendationCardProps) {
  const { freelancer, matchPercentage, breakdown } = recommendation;
  const profile = freelancer.profile;

  // Get initials for avatar fallback
  const getInitials = () => {
    if (freelancer.name) {
      return freelancer.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'FL';
  };

  // Get match percentage color
  const getMatchColor = () => {
    if (matchPercentage >= 90) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (matchPercentage >= 70) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (matchPercentage >= 50) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  // Get progress bar color
  const getProgressColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const freelancerSlug = profile?.slug;
  const freelancerName = freelancer.name || 'Freelancer';
  const rawAvatar = profile?.avatar || (profile as any)?.avatar_url || (profile as any)?.profilePicture || (freelancer as any)?.image;
  const avatarSrc = getProfilePictureUrl(freelancer.id, rawAvatar);

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm">
      <CardContent className="p-6">
        {/* Header: Avatar, Name, Match Percentage */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={avatarSrc} alt={freelancerName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg">{freelancerName}</h3>
              {profile?.title && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{profile.title}</p>
              )}
              {profile?.rating && profile.rating > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: Math.min(Math.round(profile.rating), 5) }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 text-amber-500 fill-amber-500" />
                  ))}
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                    ({profile.rating.toFixed(1)})
                  </span>
                </div>
              )}
            </div>
          </div>
          <Badge className={getMatchColor()}>
            {matchPercentage}% Match
          </Badge>
        </div>

        {/* Hourly Rate & Availability */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          {profile?.hourlyRate && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold">${profile.hourlyRate}/hr</span>
            </div>
          )}
          {profile?.availability && (
            <Badge
              variant="outline"
              className={
                profile.availability === 'AVAILABLE'
                  ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30'
                  : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30'
              }
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {profile.availability.charAt(0) + profile.availability.slice(1).toLowerCase()}
            </Badge>
          )}
          {freelancer.subscriptionTier === 'FREELANCER_ELITE' && (
            <Badge className="bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-500/30">
              Elite
            </Badge>
          )}
          {freelancer.subscriptionTier === 'FREELANCER_PRO' && (
            <Badge className="bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-500/30">
              Pro
            </Badge>
          )}
        </div>

        {/* Skills */}
        {profile?.skills && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {profile.skills
                .split(/[,\s]+/)
                .filter((s) => s.length > 0)
                .slice(0, 6)
                .map((skill, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                  >
                    {skill}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="space-y-3 mb-4">
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Match Breakdown
          </div>

          {/* Skills Match */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-700 dark:text-zinc-300">Skills Match</span>
              <span className="text-zinc-500 dark:text-zinc-400">{breakdown.skills}/25</span>
            </div>
            <Progress
              value={(breakdown.skills / 25) * 100}
              className="h-2"
            />
          </div>

          {/* Budget Alignment */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-700 dark:text-zinc-300">Budget Alignment</span>
              <span className="text-zinc-500 dark:text-zinc-400">{breakdown.budget}/20</span>
            </div>
            <Progress
              value={(breakdown.budget / 20) * 100}
              className="h-2"
            />
          </div>

          {/* Rating */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-700 dark:text-zinc-300">Rating Score</span>
              <span className="text-zinc-500 dark:text-zinc-400">{breakdown.rating}/15</span>
            </div>
            <Progress
              value={(breakdown.rating / 15) * 100}
              className="h-2"
            />
          </div>

          {/* Past Success */}
          {breakdown.history > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  Past Success with You
                  <TrendingUp className="h-3 w-3" />
                </span>
                <span className="text-green-600 dark:text-green-400 font-semibold">{breakdown.history}/40</span>
              </div>
              <Progress
                value={(breakdown.history / 40) * 100}
                className="h-2 bg-green-500/20"
              />
            </div>
          )}

          {/* Availability */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-700 dark:text-zinc-300">Availability</span>
              <span className="text-zinc-500 dark:text-zinc-400">{breakdown.availability}/10</span>
            </div>
            <Progress
              value={(breakdown.availability / 10) * 100}
              className="h-2"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1 glass-button"
          >
            <Link href={`/freelancers/${freelancerSlug}`}>
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1 glass-button"
          >
            <Link href={`/messages?userId=${freelancer.id}`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

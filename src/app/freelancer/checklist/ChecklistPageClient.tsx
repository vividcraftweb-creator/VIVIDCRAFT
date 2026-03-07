'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Circle,
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Crown,
  Target,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'profile' | 'portfolio' | 'subscription';
  actionLink?: string;
  priority: 'high' | 'medium' | 'low';
}

interface ChecklistData {
  checklist: ChecklistItem[];
  stats: {
    completedCount: number;
    totalItems: number;
    completionPercentage: number;
  };
  user: {
    email: string;
    subscriptionPlan: string;
  };
}

export default function FreelancerChecklistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only proceed when status is not loading
    if (status === 'loading') {
      return;
    }

    // Prevent multiple redirects
    if (hasRedirected.current) {
      return;
    }

    if (status === 'unauthenticated') {
      hasRedirected.current = true;
      router.push('/auth/signin?callbackUrl=/freelancer/checklist');
      return;
    }

    if (status === 'authenticated' && session?.session?.user?.role !== 'FREELANCER') {
      hasRedirected.current = true;
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated' && session?.session?.user?.role === 'FREELANCER') {
      fetchChecklist();
    }
  }, [status, session?.session?.user?.role, router]);

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/freelancer/checklist');

      if (!response.ok) {
        throw new Error('Failed to fetch checklist');
      }

      const data = await response.json();
      setChecklistData(data);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your checklist...</p>
        </div>
      </div>
    );
  }

  if (error || !checklistData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card p-8 rounded-2xl">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Checklist</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchChecklist}>Try Again</Button>
        </div>
      </div>
    );
  }

  const { checklist, stats } = checklistData;
  const { completionPercentage, completedCount, totalItems } = stats;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getCompletionMessage = () => {
    if (completionPercentage === 100) {
      return {
        title: "🎉 Profile Perfect!",
        description: "Your profile is complete and optimized. You're ready to land great jobs!",
        color: "from-green-500 to-emerald-600"
      };
    } else if (completionPercentage >= 75) {
      return {
        title: "Almost There!",
        description: "Your profile is looking great. Complete a few more items to maximize your success.",
        color: "from-blue-500 to-cyan-600"
      };
    } else if (completionPercentage >= 50) {
      return {
        title: "Good Progress!",
        description: "You're halfway there. Keep going to make your profile stand out.",
        color: "from-yellow-500 to-orange-600"
      };
    } else {
      return {
        title: "Let's Get Started!",
        description: "Complete these tasks to make your profile more attractive to clients.",
        color: "from-purple-500 to-pink-600"
      };
    }
  };

  const message = getCompletionMessage();

  const groupedChecklist = {
    profile: checklist.filter(item => item.category === 'profile'),
    portfolio: checklist.filter(item => item.category === 'portfolio'),
    subscription: checklist.filter(item => item.category === 'subscription'),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/90 py-12">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">
              Freelancer <span className="text-gradient">Checklist</span>
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Complete these tasks to optimize your profile and increase your chances of landing jobs
          </p>
        </div>

        {/* Progress Card */}
        <div className={`glass-card p-8 rounded-2xl mb-12 bg-gradient-to-br ${message.color} bg-opacity-10 border-2`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2">{message.title}</h2>
              <p className="text-muted-foreground mb-4">{message.description}</p>
              <div className="flex items-center gap-4 justify-center md:justify-start">
                <div className="text-sm text-muted-foreground">
                  {completedCount} of {totalItems} completed
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-primary">{completionPercentage}%</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted-foreground opacity-20"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - completionPercentage / 100)}`}
                  className="text-primary transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{completionPercentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist Sections */}
        <div className="space-y-8">
          {/* Profile Tasks */}
          {groupedChecklist.profile.length > 0 && (
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Target className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">Profile Essentials</h3>
              </div>
              <div className="space-y-4">
                {groupedChecklist.profile.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-all ${
                      item.completed
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-muted/30 border border-glass-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {item.completed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className={`h-6 w-6 ${getPriorityColor(item.priority)}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold mb-1 ${item.completed ? 'text-foreground' : 'text-foreground'}`}>
                        {item.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      {item.priority === 'high' && !item.completed && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
                          <Zap className="h-3 w-3" />
                          High Priority
                        </span>
                      )}
                    </div>
                    {!item.completed && item.actionLink && (
                      <Link href={item.actionLink}>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          Complete
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio Tasks */}
          {groupedChecklist.portfolio.length > 0 && (
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Award className="h-6 w-6 text-chart-1" />
                <h3 className="text-xl font-semibold">Portfolio & Experience</h3>
              </div>
              <div className="space-y-4">
                {groupedChecklist.portfolio.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-all ${
                      item.completed
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-muted/30 border border-glass-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {item.completed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className={`h-6 w-6 ${getPriorityColor(item.priority)}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold mb-1 ${item.completed ? 'text-foreground' : 'text-foreground'}`}>
                        {item.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                    </div>
                    {!item.completed && item.actionLink && (
                      <Link href={item.actionLink}>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          Complete
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscription Tasks */}
          {groupedChecklist.subscription.length > 0 && (
            <div className="glass-card p-6 rounded-2xl border-2 border-yellow-500/20">
              <div className="flex items-center gap-3 mb-6">
                <Crown className="h-6 w-6 text-yellow-500" />
                <h3 className="text-xl font-semibold">Boost Your Success</h3>
              </div>
              <div className="space-y-4">
                {groupedChecklist.subscription.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-all ${
                      item.completed
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {item.completed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <Crown className="h-6 w-6 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      {!item.completed && (
                        <p className="text-xs text-yellow-600">
                          ⭐ Premium plans get 3x more profile views and priority support
                        </p>
                      )}
                    </div>
                    {!item.completed && item.actionLink && (
                      <Link href={item.actionLink}>
                        <Button
                          variant="default"
                          size="sm"
                          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600"
                        >
                          Upgrade
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 text-center glass-card p-8 rounded-2xl">
          <h3 className="text-2xl font-bold mb-4">
            Ready to find your next opportunity?
          </h3>
          <p className="text-muted-foreground mb-6">
            Browse available jobs and start applying with your tokens
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/jobs">
              <Button size="lg" className="w-full sm:w-auto">
                Browse Jobs
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

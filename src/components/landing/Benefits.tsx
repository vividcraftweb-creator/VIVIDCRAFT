'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import createGlobe from 'cobe';
import { motion } from 'motion/react';
import {
  Shield,
  Lock,
  UserCheck,
  ShieldCheck,
  MessageSquareWarning,
  FileText,
  CheckCircle2,
  Coins,
  Search,
  Send,
  Handshake,
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  Settings,
  CreditCard,
  BarChart3,
  TrendingUp,
  Award,
  Target
} from 'lucide-react';

export default function Benefits() {
  const features = [
    {
      title: 'Advanced Freelancer Dashboard',
      description:
        'Track proposals, manage applications with token system, and monitor your career growth with detailed analytics.',
      skeleton: <SkeletonOne />,
      className:
        'col-span-1 lg:col-span-4 border-b lg:border-r dark:border-neutral-800',
    },
    {
      title: 'Trust & Safety',
      description:
        'ID verification, fraud detection, and secure payments protect every transaction on the platform.',
      skeleton: <SkeletonTwo />,
      className: 'border-b col-span-1 lg:col-span-2 dark:border-neutral-800',
    },
    {
      title: 'Global Opportunities',
      description:
        'Access remote work opportunities worldwide. From local projects to international collaborations.',
      skeleton: <SkeletonThree />,
      className:
        'col-span-1 lg:col-span-3 lg:border-r dark:border-neutral-800',
    },
    {
      title: 'Token-Based Proposals',
      description:
        'Bid tokens on proposals to rank higher in client views. The more you bid, the more visible your proposal becomes.',
      skeleton: <SkeletonFour />,
      className: 'col-span-1 lg:col-span-3 border-b lg:border-none',
    },
  ];

  return (
    <div className="relative z-20 py-10 sm:py-16 lg:py-40 max-w-7xl mx-auto">
      <div className="px-4 sm:px-6 lg:px-8">
        <h4 className="text-2xl sm:text-3xl lg:text-5xl lg:leading-tight max-w-5xl mx-auto text-center tracking-tight font-medium text-black dark:text-white">
          Everything you need to succeed
        </h4>

        <p className="text-sm sm:text-base lg:text-lg max-w-2xl my-3 sm:my-4 mx-auto text-neutral-500 text-center font-normal dark:text-neutral-300">
          From powerful dashboards to global reach, Vivid Art provides all the tools freelancers and clients need to connect, collaborate, and grow.
        </p>
      </div>

      <div className="relative px-4 sm:px-6 lg:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-6 mt-8 sm:mt-12 xl:border rounded-md dark:border-neutral-800">
          {features.map((feature) => (
            <FeatureCard key={feature.title} className={feature.className}>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
              <div className="h-full w-full">{feature.skeleton}</div>
            </FeatureCard>
          ))}
        </div>
      </div>
    </div>
  );
}

const FeatureCard = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn(`p-4 sm:p-8 relative overflow-hidden`, className)}>
      {children}
    </div>
  );
};

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p className="max-w-5xl mx-auto text-left tracking-tight text-black dark:text-white text-xl md:text-2xl md:leading-snug">
      {children}
    </p>
  );
};

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p
      className={cn(
        'text-sm md:text-base max-w-4xl text-left mx-auto',
        'text-neutral-500 text-center font-normal dark:text-neutral-300',
        'text-left max-w-sm mx-0 md:text-sm my-2'
      )}
    >
      {children}
    </p>
  );
};

export const SkeletonOne = () => {
  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: MessageSquare, label: 'Messages' },
    { icon: Briefcase, label: 'My Proposals' },
    { icon: CreditCard, label: 'Subscription' },
    { icon: Settings, label: 'Settings' },
  ];

  const recentActivity = [
    { title: 'Full Stack Development', rate: '$45/hr', tokens: 45, status: 'ACCEPTED', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
    { title: 'Mobile App UI Design', rate: '$2,500 fixed', tokens: 35, status: 'PENDING', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    { title: 'E-commerce Platform', rate: '$35/hr', tokens: 50, status: 'PENDING', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  ];

  return (
    <div className="relative flex py-8 px-2 gap-10 h-full">
      <div className="w-full mx-auto bg-neutral-900 shadow-2xl group h-full rounded-xl border border-neutral-800 overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-16 bg-neutral-950 border-r border-white/10 py-4 px-2 flex flex-col shrink-0">
          {/* User Avatar */}
          <div className="mb-4 mx-auto">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=b6e3f4"
              alt="User avatar"
              className="w-10 h-10 rounded-full border-2 border-primary/50"
            />
          </div>
          {/* Nav Items */}
          <div className="space-y-2">
            {sidebarItems.map((item, idx) => (
              <div
                key={idx}
                className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto cursor-pointer transition-all ${
                  item.active
                    ? 'bg-primary/20 text-primary'
                    : 'text-neutral-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="h-4 w-4" />
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
          {/* Stats Overview - 4 cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-sky-500/5 border border-indigo-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-indigo-300 font-medium">Proposals</p>
                  <p className="text-lg font-bold text-white">12</p>
                </div>
                <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                  <Send className="h-3.5 w-3.5 text-indigo-300" />
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-blue-300 font-medium">Accepted</p>
                  <p className="text-lg font-bold text-white">3</p>
                </div>
                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                  <Briefcase className="h-3.5 w-3.5 text-blue-300" />
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-purple-300 font-medium">Success</p>
                  <p className="text-lg font-bold text-white">25%</p>
                </div>
                <div className="p-1.5 bg-purple-500/20 rounded-lg">
                  <Award className="h-3.5 w-3.5 text-purple-300" />
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-orange-300 font-medium">Tokens</p>
                  <p className="text-lg font-bold text-orange-400">150</p>
                </div>
                <div className="p-1.5 bg-orange-500/20 rounded-lg">
                  <Coins className="h-3.5 w-3.5 text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid - 2 columns */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1 min-h-0">
            {/* Left Column - Activity & Analytics */}
            <div className="flex-[2] flex flex-col gap-3">
              {/* Recent Activity - reduced height */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white">Recent Activity</p>
                  <span className="text-[10px] text-primary px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10">View All</span>
                </div>
                <div className="space-y-1.5">
                  {recentActivity.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 border border-white/10">
                      <div className="p-1 bg-blue-500/20 rounded">
                        <FileText className="h-3 w-3 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate text-white">{item.title}</p>
                        <p className="text-[9px] text-neutral-400">{item.rate} • {item.tokens} tokens</p>
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border font-medium ${item.color}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proposal Pipeline - PRO */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-bold text-white">Proposal Pipeline</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-medium">PRO</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Accepted', count: 3, gradient: 'from-green-500 to-emerald-500', percent: 25 },
                    { label: 'Pending', count: 5, gradient: 'from-yellow-500 to-amber-500', percent: 42 },
                    { label: 'Rejected', count: 2, gradient: 'from-rose-500 to-pink-500', percent: 17 },
                    { label: 'Withdrawn', count: 2, gradient: 'from-slate-500 to-slate-600', percent: 16 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-400 w-16">{item.label}</span>
                      <div className="flex-1 bg-white/10 rounded-full h-2">
                        <div className={`bg-gradient-to-r ${item.gradient} h-2 rounded-full`} style={{ width: `${item.percent}%` }} />
                      </div>
                      <span className="text-[10px] text-white font-medium w-4 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Profile & Stats */}
            <div className="flex-1 flex flex-col gap-3">
              {/* Profile Status */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white">Profile</p>
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-neutral-400">Completion</span>
                      <span className="text-[10px] font-semibold text-white">92%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                  <button className="w-full text-[10px] py-1.5 rounded-lg bg-blue-600 text-white font-medium">
                    Edit Profile →
                  </button>
                </div>
              </div>

              {/* Market Insights - ELITE */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-purple-300" />
                    <p className="text-sm font-bold text-white">Insights</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">ELITE</span>
                </div>
                <div className="space-y-2">
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <p className="text-[9px] text-neutral-400 uppercase">Top Demand</p>
                    <p className="text-[11px] text-white font-medium">AI & ML</p>
                    <p className="text-[9px] text-green-400">+18% this week</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <p className="text-[9px] text-neutral-400 uppercase">Top Rate</p>
                    <p className="text-[11px] text-white font-medium">React Dev</p>
                    <p className="text-[9px] text-green-400">$65/hr avg</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 z-40 inset-x-0 h-60 bg-gradient-to-t from-white dark:from-black via-white dark:via-black to-transparent w-full pointer-events-none" />
      <div className="absolute top-0 z-40 inset-x-0 h-60 bg-gradient-to-b from-white dark:from-black via-transparent to-transparent w-full pointer-events-none" />
    </div>
  );
};

export const SkeletonTwo = () => {
  const trustFeatures = [
    {
      icon: UserCheck,
      title: 'ID Verification',
      description: 'Government ID verification ensures every user is who they claim to be',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30',
    },
    {
      icon: ShieldCheck,
      title: 'Fraud Detection',
      description: 'Continuous monitoring and smart checks protect against fraud and scams',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30',
    },
    {
      icon: Lock,
      title: 'Secure Payments',
      description: 'All transactions are encrypted and processed via Braintree',
      color: 'from-purple-500 to-violet-500',
      bgColor: 'from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30',
    },
    {
      icon: MessageSquareWarning,
      title: 'Report System',
      description: 'Easily report suspicious activity for quick review',
      color: 'from-orange-500 to-amber-500',
      bgColor: 'from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30',
    },
  ];

  return (
    <div className="relative flex py-8 px-2 gap-10 h-full">
      <div className="w-full p-6 mx-auto bg-white dark:bg-neutral-900 shadow-2xl group h-full rounded-lg border border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-1 w-full h-full flex-col space-y-4">
          {/* Header with Shield */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/20"
              >
                <Shield className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <div className="font-semibold text-sm">Platform Security</div>
                <div className="text-xs text-neutral-500">Multiple layers of protection</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-medium text-green-600 dark:text-green-400">Active</span>
            </div>
          </div>

          {/* Trust Features List */}
          <div className="space-y-3 flex-1">
            {trustFeatures.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
                className={`p-3 rounded-xl bg-gradient-to-br ${feature.bgColor} border border-neutral-200/50 dark:border-neutral-700/50 hover:border-primary/30 transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-sm shrink-0`}>
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      {feature.title}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      {feature.description}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20"
          >
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Your safety is our priority</span>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 z-40 inset-x-0 h-60 bg-gradient-to-t from-white dark:from-black via-white dark:via-black to-transparent w-full pointer-events-none" />
      <div className="absolute top-0 z-40 inset-x-0 h-60 bg-gradient-to-b from-white dark:from-black via-transparent to-transparent w-full pointer-events-none" />
    </div>
  );
};

export const SkeletonThree = () => {
  return (
    <div className="h-60 md:h-60 flex flex-col items-center relative bg-transparent dark:bg-transparent mt-10">
      <Globe className="absolute right-1/2 translate-x-1/2 sm:translate-x-0 sm:-right-10 md:-right-10 -bottom-80 md:-bottom-72" />
    </div>
  );
};

export const SkeletonFour = () => {
  const flowSteps = [
    { title: 'Find Job', icon: Search, color: 'bg-blue-500' },
    { title: 'Apply', icon: Send, color: 'bg-purple-500' },
    { title: 'Bid Tokens', icon: Coins, color: 'bg-yellow-500' },
    { title: 'Get Hired', icon: Handshake, color: 'bg-green-500' },
  ];

  return (
    <div className="relative flex py-8 px-2 gap-10 h-full">
      <div className="w-full p-6 mx-auto bg-white dark:bg-neutral-900 shadow-2xl group h-full rounded-lg border border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-1 w-full h-full flex-col space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/20"
              >
                <Coins className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <div className="font-semibold text-sm">Token System</div>
                <div className="text-xs text-neutral-500">Higher bid = Higher visibility</div>
              </div>
            </div>
          </div>

          {/* Progress Flow */}
          <div className="flex flex-col justify-center mt-2">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide text-center">How It Works</div>

            {/* Progress Bar */}
            <div className="relative px-4">
              {/* Connection Line */}
              <div className="absolute top-5 left-[12%] right-[12%] h-1 bg-gradient-to-r from-blue-500 via-purple-500 via-yellow-500 to-green-500 rounded-full" />

              {/* Steps */}
              <div className="relative flex justify-between">
                {flowSteps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className={`w-10 h-10 rounded-full ${step.color} flex items-center justify-center shadow-lg z-10`}>
                      <step.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400 text-center whitespace-nowrap">
                      {step.title}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="text-center space-y-3 mt-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xs mx-auto">
                Bid tokens on your proposals to rank higher in the client&apos;s view. The more you bid, the more visible you become.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 z-40 inset-x-0 h-40 bg-gradient-to-t from-white dark:from-black via-white dark:via-black to-transparent w-full pointer-events-none" />
      <div className="absolute top-0 z-40 inset-x-0 h-40 bg-gradient-to-b from-white dark:from-black via-transparent to-transparent w-full pointer-events-none" />
    </div>
  );
};

export const Globe = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.1, 0.8, 1],
      glowColor: [1, 1, 1],
      markers: [
        // North America
        { location: [37.7595, -122.4367], size: 0.04 }, // San Francisco
        { location: [40.7128, -74.006], size: 0.08 }, // New York
        { location: [34.0522, -118.2437], size: 0.05 }, // Los Angeles
        { location: [43.6532, -79.3832], size: 0.05 }, // Toronto
        { location: [19.4326, -99.1332], size: 0.04 }, // Mexico City
        // Europe
        { location: [51.5074, -0.1278], size: 0.07 }, // London
        { location: [48.8566, 2.3522], size: 0.06 }, // Paris
        { location: [52.52, 13.405], size: 0.05 }, // Berlin
        { location: [41.9028, 12.4964], size: 0.04 }, // Rome
        { location: [55.7558, 37.6173], size: 0.05 }, // Moscow
        { location: [59.3293, 18.0686], size: 0.03 }, // Stockholm
        // Asia
        { location: [35.6762, 139.6503], size: 0.07 }, // Tokyo
        { location: [1.3521, 103.8198], size: 0.05 }, // Singapore
        { location: [22.3193, 114.1694], size: 0.05 }, // Hong Kong
        { location: [31.2304, 121.4737], size: 0.06 }, // Shanghai
        { location: [37.5665, 126.978], size: 0.05 }, // Seoul
        { location: [28.6139, 77.209], size: 0.06 }, // New Delhi
        { location: [19.076, 72.8777], size: 0.05 }, // Mumbai
        { location: [13.7563, 100.5018], size: 0.04 }, // Bangkok
        { location: [25.2048, 55.2708], size: 0.05 }, // Dubai
        // South America
        { location: [-23.5505, -46.6333], size: 0.06 }, // São Paulo
        { location: [-34.6037, -58.3816], size: 0.04 }, // Buenos Aires
        { location: [-33.4489, -70.6693], size: 0.03 }, // Santiago
        // Africa
        { location: [-33.9249, 18.4241], size: 0.04 }, // Cape Town
        { location: [6.5244, 3.3792], size: 0.04 }, // Lagos
        { location: [30.0444, 31.2357], size: 0.04 }, // Cairo
        // Oceania
        { location: [-33.8688, 151.2093], size: 0.05 }, // Sydney
        { location: [-37.8136, 144.9631], size: 0.04 }, // Melbourne
        { location: [-36.8485, 174.7633], size: 0.03 }, // Auckland
      ],
      onRender: (state) => {
        state.phi = phi;
        phi += 0.005;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 600, height: 600, maxWidth: '100%', aspectRatio: 1 }}
      className={className}
    />
  );
};

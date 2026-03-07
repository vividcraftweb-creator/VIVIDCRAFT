'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sparkles,
  FileText,
  Award,
  Globe,
  Lightbulb,
  Target,
  HelpCircle,
  Calendar,
  Clock,
  DollarSign,
  Star,
  User,
  AlertCircle,
  Send,
  Plus,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { analytics } from '@/utils/analytics';

type ProposalModalProps = {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function ProposalModal({ jobId, isOpen, onClose }: ProposalModalProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const createProposalMutation = trpc.proposals.createProposal.useMutation({
    onSuccess: (proposal) => {
      // Track proposal submitted event
      analytics.proposalSubmitted(jobId, proposal.id);
    },
  });

  const { data: job } = trpc.jobs.getJobById.useQuery({ id: jobId }, { enabled: isOpen });
  const {
    data: currentUser,
    isLoading: isCurrentUserLoading,
  } = trpc.user.getCurrentUser.useQuery(undefined, { enabled: isOpen });
  const tokensAvailable =
    typeof currentUser?.tokens === 'number' ? currentUser.tokens : null;
  const hasTokenData = !isCurrentUserLoading && tokensAvailable !== null;
  const effectiveTokens = tokensAvailable ?? 0;

  const [coverLetter, setCoverLetter] = useState('');
  const [proposedRate, setProposedRate] = useState(0);
  const [timeline, setTimeline] = useState('');
  const [experience, setExperience] = useState('');
  const [approach, setApproach] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>(['']);
  const [availability, setAvailability] = useState('');
  const [milestones, setMilestones] = useState('');
  const [whyMe, setWhyMe] = useState('');
  const [questionsOrConcerns, setQuestionsOrConcerns] = useState('');
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [tokenBid, setTokenBid] = useState<string>('');
  const parsedTokenBid = tokenBid === '' ? null : Number(tokenBid);
  const tokenBidInvalid = hasTokenData
    ? parsedTokenBid === null ||
      Number.isNaN(parsedTokenBid) ||
      !Number.isInteger(parsedTokenBid) ||
      parsedTokenBid < 1 ||
      parsedTokenBid > effectiveTokens
    : false;
  const remainingTokensAfterBid = hasTokenData && parsedTokenBid !== null && !Number.isNaN(parsedTokenBid)
    ? Math.max(effectiveTokens - parsedTokenBid, 0)
    : null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setTokenBid('');
  }, [isOpen]);

  const premiumLabel = useMemo(() => {
    switch (currentUser?.subscriptionPlan) {
      case 'FREELANCER_ELITE':
        return 'Elite visibility boost';
      case 'FREELANCER_PRO':
        return 'Pro visibility boost';
      default:
        return null;
    }
  }, [currentUser?.subscriptionPlan]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updatePortfolioLink = (index: number, value: string) => {
    setPortfolioLinks(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addPortfolioLink = () => {
    setPortfolioLinks(prev => [...prev, '']);
  };

  const removePortfolioLink = (index: number) => {
    setPortfolioLinks(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const screeningQuestions = useMemo(() => {
    const raw = job?.screeningQuestions;
    if (!raw) return [] as string[];
    if (Array.isArray(raw)) {
      return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
        }
      } catch {
        return [];
      }
    }
    if (typeof raw === 'object' && raw !== null) {
      return Object.values(raw).filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
    return [];
  }, [job?.screeningQuestions]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!coverLetter.trim() || coverLetter.length < 100) {
      newErrors.coverLetter = 'Cover letter must be at least 100 characters';
    }
    if (!proposedRate || proposedRate < 1) {
      newErrors.proposedRate = 'Please enter a valid rate';
    }
    if (!timeline.trim()) {
      newErrors.timeline = 'Please specify your timeline';
    }
    if (!experience.trim()) {
      newErrors.experience = 'Please describe your relevant experience';
    }
    if (!approach.trim()) {
      newErrors.approach = 'Please describe your approach';
    }
    if (!availability.trim()) {
      newErrors.availability = 'Please specify your availability';
    }

    if (hasTokenData && effectiveTokens <= 0) {
      newErrors.tokenBid =
        'You have no tokens available. Please wait for the weekly reset or upgrade your plan.';
    } else if (hasTokenData) {
      if (parsedTokenBid === null || Number.isNaN(parsedTokenBid)) {
        newErrors.tokenBid = 'Please enter how many tokens you want to bid.';
      } else if (!Number.isInteger(parsedTokenBid) || parsedTokenBid < 1) {
        newErrors.tokenBid = 'Enter a whole number of tokens (minimum 1).';
      } else if (parsedTokenBid > effectiveTokens) {
        newErrors.tokenBid = `You only have ${effectiveTokens} token${effectiveTokens === 1 ? '' : 's'} remaining.`;
      }
    }

    if (screeningQuestions.length > 0) {
      screeningQuestions.forEach((_, index) => {
        const answer = screeningAnswers[`q${index}`];
        if (!answer || answer.trim().length < 20) {
          newErrors[`screening_${index}`] = 'Please provide a detailed answer (minimum 20 characters)';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    if (!hasTokenData) {
      toast.error('Still loading your token balance. Please try again in a moment.');
      return;
    }

    if (parsedTokenBid === null || Number.isNaN(parsedTokenBid)) {
      toast.error('Please enter how many tokens you want to bid.');
      return;
    }

    try {
      const bidSpent = parsedTokenBid as number;
      const portfolioSection = portfolioLinks
        .map(link => link.trim())
        .filter(Boolean)
        .join('\n');
      const fullCoverLetter = `${coverLetter}

** EXPERIENCE **
${experience}

** APPROACH **
${approach}

** TIMELINE **
${timeline}

** AVAILABILITY **
${availability}

** MILESTONES **
${milestones}

** WHY CHOOSE ME **
${whyMe}

** PORTFOLIO/REFERENCES **
${portfolioSection || 'Provided upon request.'}

** QUESTIONS/CONCERNS **
${questionsOrConcerns || 'None at this time.'}`;

      const formattedScreeningAnswers =
        screeningQuestions.length > 0
          ? screeningQuestions.map((question: string, index: number) => ({
              question,
              answer: screeningAnswers[`q${index}`] || '',
            }))
          : [];

      await createProposalMutation.mutateAsync({
        jobId,
        coverLetter: fullCoverLetter,
        proposedRate,
        tokenBid: bidSpent,
        screeningAnswers: formattedScreeningAnswers,
      });

      await Promise.all([
        utils.user.getCurrentUser.invalidate(),
        utils.proposals.getProposalsForFreelancer.invalidate(),
      ]);

      setCoverLetter('');
      setProposedRate(0);
      setTimeline('');
      setExperience('');
      setApproach('');
      setPortfolioLinks(['']);
      setAvailability('');
      setMilestones('');
      setWhyMe('');
      setQuestionsOrConcerns('');
      setErrors({});
      setTokenBid('');

      onClose();
      toast.success(`Proposal submitted! You spent ${bidSpent} token${bidSpent === 1 ? '' : 's'} boosting your application.`);
      router.refresh();
    } catch (error) {
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/75 p-0 shadow-[0_45px_120px_rgba(15,23,42,0.55)] backdrop-blur-2xl"
      >
        <div className="border-b border-white/10 bg-slate-950/60 px-6 py-5">
          <DialogHeader className="space-y-2 text-left text-white">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Submit Proposal</DialogTitle>
            <DialogDescription className="text-sm text-white/70">
              Keep it concise, outcome-focused, and let your expertise shine.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 px-6 py-7"
        >
          <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-white">Boost visibility</h3>
                  <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/70">
                    Tokens remaining:{' '}
                    <span className="font-semibold text-white">
                      {hasTokenData ? effectiveTokens : '—'}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-white/70">
                  Bid tokens to surface higher in the client review queue. Premium plans break ties in your favor, but the bid amount is entirely your call.
                </p>
                {premiumLabel && (
                  <p className="mt-2 text-xs text-primary/80">
                    {premiumLabel}: tied bids get an extra nudge for your plan.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tokenBid" className="flex items-center gap-2 text-sm font-semibold text-white">
                Tokens to spend <span className="text-red-400">*</span>
              </Label>
              <Input
                id="tokenBid"
                type="number"
                min={1}
                step={1}
                max={hasTokenData && effectiveTokens > 0 ? effectiveTokens : undefined}
                value={tokenBid}
                onChange={(event) => {
                  const { value } = event.target;
                  if (value === '') {
                    setTokenBid('');
                    return;
                  }
                  const parsed = Number(value);
                  if (Number.isNaN(parsed)) {
                    return;
                  }
                  setTokenBid(String(Math.max(1, Math.floor(parsed))));
                }}
                className={`text-white placeholder:text-slate-400 ${errors.tokenBid ? 'border-red-500' : 'border-white/20'}`}
                disabled={hasTokenData && effectiveTokens <= 0}
              />
              <p className="text-xs text-white/60">
                Choose the bid that matches how strongly you want this role. Higher bids improve placement but use more of your weekly balance.
              </p>
              {hasTokenData && effectiveTokens <= 0 && (
                <p className="text-amber-300 text-sm mt-2">
                  You&apos;re out of tokens. Wait for the weekly refresh or upgrade to add more.
                </p>
              )}
              {errors.tokenBid && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.tokenBid}
                </p>
              )}
              <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3 text-xs text-white/70">
                <p className="uppercase tracking-wide text-white/45">How Proposal Ranking Works</p>
                <div className="mt-2 space-y-2">
                  <div className="rounded bg-white/5 p-2 border border-white/10">
                    <p className="font-semibold text-white/90 mb-1">Ranking Priority:</p>
                    <ol className="space-y-1 ml-3">
                      <li>1. <strong className="text-primary">Subscription Plan</strong> (Elite → Pro → Free)</li>
                      <li>2. <strong className="text-primary">Token Bid</strong> (higher bids within same tier)</li>
                      <li>3. <strong className="text-primary">Submission Time</strong> (earlier submissions win)</li>
                    </ol>
                  </div>
                  <ul className="space-y-1.5">
                    <li>• Your subscription plan determines your primary ranking position.</li>
                    <li>• Token bids help you rank higher <strong>within your subscription tier</strong>.</li>
                    <li>• Elite users always appear above Pro and Free users, regardless of token bid.</li>
                    <li>• Prioritize roles where you deliver standout value before bidding high.</li>
                    <li>• Keep a reserve of tokens for late-week opportunities.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/20 p-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white">Introduction & overview</h3>
            </div>
            <div>
              <Label htmlFor="coverLetter" className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                Project introduction <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="coverLetter"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={6}
                placeholder="Introduce yourself and explain why this project is a fit. Mention a specific outcome you can deliver."
                className={`text-white placeholder:text-slate-400 ${errors.coverLetter ? 'border-red-500' : 'border-white/20'}`}
              />
              {errors.coverLetter && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.coverLetter}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-chart-1/20 p-2">
                <Award className="h-5 w-5 text-chart-1" />
              </div>
              <h3 className="text-lg font-semibold text-white">Experience & expertise</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="experience" className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  Relevant experience <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="experience"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  rows={5}
                  placeholder="Highlight previous work or case studies that mirror this project."
                  className={`text-white placeholder:text-slate-400 ${errors.experience ? 'border-red-500' : 'border-white/20'}`}
                />
                {errors.experience && (
                  <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.experience}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium text-white">
                  <Globe className="h-4 w-4" />
                  Portfolio or references
                </Label>
                <div className="space-y-2">
                  {portfolioLinks.map((link, index) => (
                    <div key={`portfolio-${index}`} className="flex items-center gap-2">
                      <Input
                        value={link}
                        onChange={(e) => updatePortfolioLink(index, e.target.value)}
                        placeholder="Link to a portfolio, GitHub repo, or relevant samples."
                        className="text-white placeholder:text-slate-400 border-white/20"
                      />
                      {portfolioLinks.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 border border-white/10 text-white/70 hover:bg-white/10"
                          onClick={() => removePortfolioLink(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm font-medium text-primary hover:text-primary/80"
                  onClick={addPortfolioLink}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add another link
                </Button>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-chart-2/20 p-2">
                <Lightbulb className="h-5 w-5 text-chart-2" />
              </div>
              <h3 className="text-lg font-semibold text-white">Approach & strategy</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="approach" className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  Project approach <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="approach"
                  value={approach}
                  onChange={(e) => setApproach(e.target.value)}
                  rows={5}
                  placeholder="Outline your methodology and the steps you’d take to deliver."
                  className={`text-white placeholder:text-slate-400 ${errors.approach ? 'border-red-500' : 'border-white/20'}`}
                />
                {errors.approach && (
                  <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.approach}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="milestones" className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <Target className="h-4 w-4" />
                  Key milestones
                </Label>
                <Textarea
                  id="milestones"
                  value={milestones}
                  onChange={(e) => setMilestones(e.target.value)}
                  rows={4}
                  placeholder="Optional: break down major deliverables and checkpoints."
                  className="text-white placeholder:text-slate-400 border-white/20"
                />
              </div>
            </div>
          </section>

          {screeningQuestions.length > 0 && (
            <section className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/30 p-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Screening questions</h3>
                  <p className="text-sm text-white/70">Show how your experience maps to what the client needs.</p>
                </div>
              </div>
              <div className="space-y-4">
                {screeningQuestions.map((question: string, index: number) => (
                  <div key={index} className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-white">
                      <span className="text-primary">Q{index + 1}.</span>
                      {question}
                      <span className="text-red-400">*</span>
                    </Label>
                    <Textarea
                      value={screeningAnswers[`q${index}`] || ''}
                      onChange={(e) => setScreeningAnswers({ ...screeningAnswers, [`q${index}`]: e.target.value })}
                      rows={4}
                      placeholder="Provide a detailed answer (minimum 20 characters)..."
                      className={`text-white placeholder:text-slate-400 ${errors[`screening_${index}`] ? 'border-red-500' : 'border-white/30'}`}
                    />
                    {errors[`screening_${index}`] && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors[`screening_${index}`]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {job.autoScreening && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/40 bg-primary/15 p-3 text-xs text-white/80">
                  <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                  <p>
                    AI-powered screening is enabled. Provide thoughtful responses because the client sees the score alongside your proposal.
                  </p>
                </div>
              )}
            </section>
          )}

          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-chart-3/20 p-2">
                <Calendar className="h-5 w-5 text-chart-3" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Timeline</h3>
            </div>
            <div>
              <Label htmlFor="timeline" className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                Estimated timeline <span className="text-red-400">*</span>
              </Label>
              <Input
                id="timeline"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="e.g., 2-3 weeks, 1 month"
                className={`text-white placeholder:text-slate-400 ${errors.timeline ? 'border-red-500' : 'border-white/20'}`}
              />
              {errors.timeline && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.timeline}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-chart-4/20 p-2">
                <Clock className="h-5 w-5 text-chart-4" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Availability</h3>
            </div>
            <div>
              <Label htmlFor="availability" className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                Weekly availability <span className="text-red-400">*</span>
              </Label>
              <Input
                id="availability"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder="e.g., 20-30 hours/week"
                className={`text-white placeholder:text-slate-400 ${errors.availability ? 'border-red-500' : 'border-white/20'}`}
              />
              {errors.availability && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.availability}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/20 p-2">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Pricing & value</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="proposedRate" className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  Your rate (USD) <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="proposedRate"
                  type="number"
                  value={proposedRate || ''}
                  onChange={(e) => setProposedRate(Number(e.target.value))}
                  min="1"
                  step="1"
                  placeholder="Hourly or project rate"
                  className={`text-white placeholder:text-slate-400 text-lg font-semibold ${errors.proposedRate ? 'border-red-500' : 'border-white/20'}`}
                />
                {errors.proposedRate && (
                  <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.proposedRate}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="whyMe" className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <Star className="h-4 w-4" />
                  Why choose me?
                </Label>
                <Textarea
                  id="whyMe"
                  value={whyMe}
                  onChange={(e) => setWhyMe(e.target.value)}
                  rows={4}
                  placeholder="Explain your edge—unique process, certifications, or results."
                  className="text-white placeholder:text-slate-400 border-white/20"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-2">
                <User className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Questions & communication</h3>
            </div>
            <div>
              <Label htmlFor="questionsOrConcerns" className="mb-2 text-sm font-medium text-white">
                Questions or clarifications
              </Label>
              <Textarea
                id="questionsOrConcerns"
                value={questionsOrConcerns}
                onChange={(e) => setQuestionsOrConcerns(e.target.value)}
                rows={4}
                placeholder="Anything you need confirmed about scope, access, or milestones? (Optional)"
                className="text-white placeholder:text-slate-400 border-white/20"
              />
            </div>
          </section>

          <section className="space-y-3 border-t border-white/15 pt-6">
            <Button
              type="submit"
              disabled={createProposalMutation.isPending || tokenBidInvalid || !hasTokenData}
              className="w-full rounded-xl bg-primary py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90"
            >
              {createProposalMutation.isPending ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Submit Proposal
                </>
              )}
            </Button>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-white/70">
            <p>
              Tokens refresh weekly. Pace your bids so you can respond to high-signal opportunities later in the cycle.
              Remaining tokens after this bid:{' '}
              <span className="font-semibold text-white">
                {remainingTokensAfterBid !== null ? remainingTokensAfterBid : '—'}
              </span>
            </p>
          </section>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full rounded-xl border-white/30 py-3 text-white transition-all duration-300 hover:bg-white/10 hover:border-white/50"
            >
              Cancel
            </Button>
          </section>
        </form>
      </DialogContent>
    </Dialog>
  );
}

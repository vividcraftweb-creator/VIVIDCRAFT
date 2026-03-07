'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Video, Clock, Link as LinkIcon, Loader2, Globe } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { formatCalendarDateToISO, getTodayCalendarDate } from '@/lib/date-utils';
import type { DateValue } from '@internationalized/date';

interface ScheduleInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freelancerId: string;
  freelancerName: string;
  jobId: string;
  jobTitle: string;
  proposalId: string;
}

export default function ScheduleInterviewModal({
  open,
  onOpenChange,
  freelancerId,
  freelancerName,
  jobId,
  jobTitle,
  proposalId,
}: ScheduleInterviewModalProps) {
  const [platform, setPlatform] = useState<'GOOGLE_MEET' | 'ZOOM' | 'MICROSOFT_TEAMS' | 'OTHER'>('GOOGLE_MEET');
  const [scheduledDate, setScheduledDate] = useState<DateValue | null>(null);
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('AM');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');

  // Most commonly used timezones worldwide
  const timezones = [
    // UTC
    { value: 'UTC', label: 'UTC - Coordinated Universal Time', offset: 'UTC±00:00' },

    // North America
    { value: 'America/New_York', label: 'Eastern Time - US & Canada', offset: 'UTC-05:00' },
    { value: 'America/Chicago', label: 'Central Time - US & Canada', offset: 'UTC-06:00' },
    { value: 'America/Denver', label: 'Mountain Time - US & Canada', offset: 'UTC-07:00' },
    { value: 'America/Los_Angeles', label: 'Pacific Time - US & Canada', offset: 'UTC-08:00' },
    { value: 'America/Anchorage', label: 'Alaska Time', offset: 'UTC-09:00' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time', offset: 'UTC-10:00' },
    { value: 'America/Phoenix', label: 'Arizona Time', offset: 'UTC-07:00' },
    { value: 'America/Toronto', label: 'Toronto, Ottawa', offset: 'UTC-05:00' },
    { value: 'America/Mexico_City', label: 'Mexico City', offset: 'UTC-06:00' },

    // South America
    { value: 'America/Sao_Paulo', label: 'São Paulo, Brasília', offset: 'UTC-03:00' },
    { value: 'America/Buenos_Aires', label: 'Buenos Aires', offset: 'UTC-03:00' },
    { value: 'America/Santiago', label: 'Santiago', offset: 'UTC-03:00' },

    // Europe
    { value: 'Europe/London', label: 'London, Dublin, Lisbon', offset: 'UTC±00:00' },
    { value: 'Europe/Paris', label: 'Paris, Madrid, Brussels', offset: 'UTC+01:00' },
    { value: 'Europe/Berlin', label: 'Berlin, Rome, Amsterdam', offset: 'UTC+01:00' },
    { value: 'Europe/Athens', label: 'Athens, Helsinki, Istanbul', offset: 'UTC+02:00' },
    { value: 'Europe/Moscow', label: 'Moscow, St. Petersburg', offset: 'UTC+03:00' },

    // Middle East
    { value: 'Asia/Dubai', label: 'Dubai, Abu Dhabi', offset: 'UTC+04:00' },
    { value: 'Asia/Tehran', label: 'Tehran', offset: 'UTC+03:30' },
    { value: 'Asia/Jerusalem', label: 'Jerusalem', offset: 'UTC+02:00' },

    // Asia
    { value: 'Asia/Kolkata', label: 'Mumbai, Delhi, Bangalore', offset: 'UTC+05:30' },
    { value: 'Asia/Dhaka', label: 'Dhaka', offset: 'UTC+06:00' },
    { value: 'Asia/Bangkok', label: 'Bangkok, Hanoi, Jakarta', offset: 'UTC+07:00' },
    { value: 'Asia/Singapore', label: 'Singapore, Kuala Lumpur', offset: 'UTC+08:00' },
    { value: 'Asia/Shanghai', label: 'Beijing, Shanghai, Hong Kong', offset: 'UTC+08:00' },
    { value: 'Asia/Tokyo', label: 'Tokyo, Osaka', offset: 'UTC+09:00' },
    { value: 'Asia/Seoul', label: 'Seoul', offset: 'UTC+09:00' },
    { value: 'Asia/Manila', label: 'Manila', offset: 'UTC+08:00' },

    // Pacific
    { value: 'Australia/Sydney', label: 'Sydney, Melbourne, Canberra', offset: 'UTC+11:00' },
    { value: 'Australia/Brisbane', label: 'Brisbane', offset: 'UTC+10:00' },
    { value: 'Australia/Perth', label: 'Perth', offset: 'UTC+08:00' },
    { value: 'Pacific/Auckland', label: 'Auckland, Wellington', offset: 'UTC+13:00' },
    { value: 'Pacific/Fiji', label: 'Fiji', offset: 'UTC+12:00' },

    // Africa
    { value: 'Africa/Cairo', label: 'Cairo', offset: 'UTC+02:00' },
    { value: 'Africa/Johannesburg', label: 'Johannesburg, Cape Town', offset: 'UTC+02:00' },
    { value: 'Africa/Lagos', label: 'Lagos, Accra', offset: 'UTC+01:00' },
    { value: 'Africa/Nairobi', label: 'Nairobi, Addis Ababa', offset: 'UTC+03:00' },
  ];

  // Generate hour options (1-12)
  const hourOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const h = (i + 1).toString().padStart(2, '0');
      return { value: h, label: h };
    });
  }, []);

  // Generate minute options (00, 15, 30, 45)
  const minuteOptions = useMemo(() => {
    return ['00', '15', '30', '45'].map(m => ({ value: m, label: m }));
  }, []);

  // AM/PM options
  const ampmOptions = [
    { value: 'AM', label: 'AM' },
    { value: 'PM', label: 'PM' }
  ];

  // Convert 12-hour time to 24-hour format
  const convertTo24Hour = (hour12: string, minute: string, ampm: string) => {
    let hour24 = parseInt(hour12, 10);
    if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  const scheduleInterviewMutation = trpc.interviews.scheduleInterview.useMutation({
    onSuccess: () => {
      toast.success('Interview invitation sent successfully!', {
        description: `Calendar invite sent to ${freelancerName}`,
      });
      onOpenChange(false);
      // Reset form
      setScheduledDate(null);
      setHour('09');
      setMinute('00');
      setAmpm('AM');
      setMeetingLink('');
      setNotes('');
      setPlatform('GOOGLE_MEET');
    },
    onError: (error) => {
      toast.error('Failed to schedule interview', {
        description: error.message,
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scheduledDate || !hour || !minute || !ampm || !meetingLink || !timezone) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Convert 12-hour time to 24-hour format
    const scheduledTime = convertTo24Hour(hour, minute, ampm);

    // Combine date and time with selected timezone
    const dateString = formatCalendarDateToISO(scheduledDate);
    if (!dateString) {
      toast.error('Invalid date selected');
      return;
    }
    const dateTimeString = `${dateString}T${scheduledTime}`;
    const dateTime = new Date(new Date(dateTimeString).toLocaleString('en-US', { timeZone: timezone }));

    if (dateTime < new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    await scheduleInterviewMutation.mutateAsync({
      freelancerId,
      jobId,
      proposalId,
      platform,
      scheduledAt: dateTime.toISOString(),
      meetingLink,
      notes: notes || undefined,
    });
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'GOOGLE_MEET':
        return 'Google Meet';
      case 'ZOOM':
        return 'Zoom';
      case 'MICROSOFT_TEAMS':
        return 'Microsoft Teams';
      case 'OTHER':
        return 'Other Platform';
      default:
        return platform;
    }
  };

  const getPlatformPlaceholder = (platform: string) => {
    switch (platform) {
      case 'GOOGLE_MEET':
        return 'https://meet.google.com/xxx-xxxx-xxx';
      case 'ZOOM':
        return 'https://zoom.us/j/xxxxxxxxxx';
      case 'MICROSOFT_TEAMS':
        return 'https://teams.microsoft.com/l/meetup-join/...';
      default:
        return 'https://...';
    }
  };

  // Get minimum date/time (current time + 1 hour)
  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return {
      date: now,
      time: now.toTimeString().slice(0, 5),
    };
  };

  const minDateTime = getMinDateTime();

  // Preview the selected time in selected timezone and UTC
  const timePreview = useMemo(() => {
    if (!scheduledDate || !hour || !minute || !ampm || !timezone) return null;

    try {
      // Convert 12-hour time to 24-hour format
      const scheduledTime = convertTo24Hour(hour, minute, ampm);
      const dateString = formatCalendarDateToISO(scheduledDate);
      if (!dateString) return null;
      const dateTimeString = `${dateString}T${scheduledTime}`;
      const dateTime = new Date(dateTimeString);
      if (isNaN(dateTime.getTime())) return null;

      const selectedTimezoneTime = dateTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
        timeZoneName: 'short',
      });

      const utcTime = dateTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
      });

      return { selectedTimezoneTime, utcTime };
    } catch {
      return null;
    }
  }, [scheduledDate, hour, minute, ampm, timezone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[95vw] sm:!w-[90vw] md:!w-[750px] lg:!w-[850px] !max-w-[850px] glass-card bg-slate-900/95 border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Schedule Interview
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Send a calendar invitation to <span className="text-white font-semibold">{freelancerName}</span> for{' '}
            <span className="text-white font-semibold">{jobTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Platform Selection */}
          <div className="space-y-3">
            <Label className="text-white font-semibold flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              Meeting Platform
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {(['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS', 'OTHER'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`p-4 rounded-lg border-2 transition-all text-center font-semibold ${
                    platform === p
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {getPlatformLabel(p)}
                </button>
              ))}
            </div>
          </div>

          {/* Date, Time, and Timezone - Responsive Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Field */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-white font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Date
              </Label>
              <DatePicker
                value={scheduledDate}
                onChange={(date) => setScheduledDate(date)}
                placeholder="Select interview date"
                minValue={getTodayCalendarDate()}
                required
                className="bg-white/5 border-white/10"
              />
            </div>

            {/* Time Field - Hour, Minute, AM/PM */}
            <div className="space-y-2">
              <Label className="text-white font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Time
              </Label>
              <div className="flex gap-1">
                {/* Hour */}
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white flex-1">
                    <SelectValue placeholder="HH" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[200px]">
                    {hourOptions.map((h) => (
                      <SelectItem key={h.value} value={h.value} className="text-white hover:bg-white/10 cursor-pointer">
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-white flex items-center">:</span>

                {/* Minute */}
                <Select value={minute} onValueChange={setMinute}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white flex-1">
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    {minuteOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-white hover:bg-white/10 cursor-pointer">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* AM/PM */}
                <Select value={ampm} onValueChange={setAmpm}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white flex-1">
                    <SelectValue placeholder="AM" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    {ampmOptions.map((ap) => (
                      <SelectItem key={ap.value} value={ap.value} className="text-white hover:bg-white/10 cursor-pointer">
                        {ap.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timezone Field */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-white font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Timezone
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select timezone">
                    {timezones.find(tz => tz.value === timezone)?.offset || 'UTC'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[350px] overflow-y-auto">
                  {timezones.map((tz) => (
                    <SelectItem
                      key={tz.value}
                      value={tz.value}
                      className="text-white hover:bg-white/10 cursor-pointer py-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{tz.label}</span>
                        <span className="text-xs text-slate-400">{tz.offset}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Preview */}
          {timePreview && (
            <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                <Globe className="h-4 w-4" />
                Interview Time Preview
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Selected Time</p>
                  <p className="text-white font-medium">{timePreview.selectedTimezoneTime}</p>
                </div>
                <div className="border-t border-blue-500/20 pt-3 space-y-1">
                  <p className="text-xs text-slate-400">Converted to UTC</p>
                  <p className="text-white font-medium">{timePreview.utcTime}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                💡 The email will be sent in UTC and the .ics calendar file will automatically convert to the freelancer&apos;s local timezone
              </p>
            </div>
          )}

          {/* Meeting Link */}
          <div className="space-y-2">
            <Label htmlFor="link" className="text-white font-semibold flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-primary" />
              Meeting Link
            </Label>
            <Input
              id="link"
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder={getPlatformPlaceholder(platform)}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
            <p className="text-xs text-slate-400">
              Create your meeting in {getPlatformLabel(platform)} and paste the link here
            </p>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-white font-semibold">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional information about the interview (agenda, preparation, etc.)"
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
              disabled={scheduleInterviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={scheduleInterviewMutation.isPending}
            >
              {scheduleInterviewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Send Interview Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

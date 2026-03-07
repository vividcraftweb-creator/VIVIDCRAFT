import {
  FileText,
  FileCheck,
  DollarSign,
  CheckCircle,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  Calendar,
  Shield,
  ShieldAlert,
  Bell,
} from 'lucide-react';
import type { NotificationType } from '@/types/database.types';

interface NotificationIconProps {
  type: NotificationType;
  size?: number;
  className?: string;
}

const iconMap: Partial<Record<
  NotificationType,
  { Icon: React.ElementType; color: string }
>> = {
  PROPOSAL_RECEIVED: { Icon: FileText, color: 'text-blue-400' },
  CONTRACT_STARTED: { Icon: FileCheck, color: 'text-green-400' },
  MILESTONE_FUNDED: { Icon: DollarSign, color: 'text-emerald-400' },
  MILESTONE_SUBMITTED: { Icon: CheckCircle, color: 'text-orange-400' },
  MILESTONE_COMPLETED: { Icon: CheckCircle2, color: 'text-green-400' },
  PAYMENT_RECEIVED: { Icon: CreditCard, color: 'text-green-400' },
  MESSAGE_RECEIVED: { Icon: MessageSquare, color: 'text-purple-400' },
  INTERVIEW_SCHEDULED: { Icon: Calendar, color: 'text-blue-400' },
  VERIFICATION_APPROVED: { Icon: Shield, color: 'text-green-400' },
  VERIFICATION_REJECTED: { Icon: ShieldAlert, color: 'text-red-400' },
};

export function NotificationIcon({
  type,
  size = 20,
  className = '',
}: NotificationIconProps) {
  const iconConfig = iconMap[type] || { Icon: Bell, color: 'text-gray-400' };
  const { Icon, color } = iconConfig;

  return <Icon className={`${color} ${className}`} size={size} />;
}

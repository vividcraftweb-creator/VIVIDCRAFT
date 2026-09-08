'use client';

import { trpc } from '@/utils/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  Crown,
  Plus,
  Search,
  Mail,
  Eye,
  Shield,
  UserCheck,
  User
} from 'lucide-react';
import { useState } from 'react';
import UserDetailModal from '@/components/admin/UserDetailModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function AdminOrganizationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    subject: '',
    message: '',
    recipientEmail: '',
    recipientName: '',
  });

  // Get all users and filter for enterprise/elite
  const { data: usersData, isLoading, refetch } = trpc.admin.users.getUsers.useQuery({
    limit: 100,
    offset: 0
  });

  const users = usersData?.users || [];

  // Filter for elite and enterprise users
  const eliteUsers = users.filter(u => u.subscriptionPlan === 'FREELANCER_ELITE');
  const enterpriseClients = users.filter(u => u.subscriptionPlan === 'CLIENT_ENTERPRISE');
  const businessClients = users.filter(u => u.subscriptionPlan === 'CLIENT_BUSINESS');
  const allPremiumUsers = [...eliteUsers, ...enterpriseClients, ...businessClients];

  // Calculate organization stats
  const totalOrganizations = enterpriseClients.length + businessClients.length;
  const totalEliteUsers = eliteUsers.length;
  const totalPremiumUsers = allPremiumUsers.length;

  // Helper function to get company name from profile
  const getCompanyName = (user: typeof users[0]) => {
    if (Array.isArray(user.Profile) && user.Profile.length > 0) {
      return user.Profile[0].companyName || 'N/A';
    }
    if (user.Profile && typeof user.Profile === 'object' && 'companyName' in user.Profile) {
      return (user.Profile as any).companyName || 'N/A';
    }
    return 'N/A';
  };

  // Helper function to get industry from profile
  const getIndustry = (user: typeof users[0]) => {
    if (Array.isArray(user.Profile) && user.Profile.length > 0) {
      return user.Profile[0].industry || 'N/A';
    }
    if (user.Profile && typeof user.Profile === 'object' && 'industry' in user.Profile) {
      return (user.Profile as any).industry || 'N/A';
    }
    return 'N/A';
  };

  // Filter users by search (including company name)
  const filteredUsers = allPremiumUsers.filter(user => {
    const companyName = getCompanyName(user);
    return (
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getPlanBadge = (plan: string) => {
    const planColors: Record<string, { bg: string; text: string; border: string }> = {
      'FREELANCER_ELITE': { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
      'CLIENT_BUSINESS': { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
      'CLIENT_ENTERPRISE': { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
    };

    return planColors[plan] || { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30' };
  };

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      'FREELANCER_ELITE': 'Freelancer Elite',
      'CLIENT_BUSINESS': 'Client Business',
      'CLIENT_ENTERPRISE': 'Client Enterprise',
    };
    return names[plan] || plan;
  };

  const handleContactOrganization = (user: typeof users[0]) => {
    const companyName = getCompanyName(user);
    setContactFormData({
      subject: `Message from JobHorizons Admin`,
      message: '',
      recipientEmail: user.email,
      recipientName: companyName !== 'N/A' ? companyName : user.email,
    });
    setShowContactModal(true);
  };

  const handleSendEmail = () => {
    // Here you would integrate with your email service
    // For now, we'll just show a success message
    toast.success('Email sent successfully', {
      description: `Message sent to ${contactFormData.recipientEmail}`,
    });
    setShowContactModal(false);
    setContactFormData({
      subject: '',
      message: '',
      recipientEmail: '',
      recipientName: '',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-white/5 rounded w-1/4"></div>
          <div className="h-12 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Header with Inline Stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Building2 className="h-5 w-5 text-blue-400" />
          <h1 className="text-xl font-bold text-white">Organizations & Enterprise</h1>
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Building2 className="h-4 w-4 text-blue-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{totalOrganizations}</span>
              <span className="text-xs text-blue-300">Organizations</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <Crown className="h-4 w-4 text-purple-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{totalEliteUsers}</span>
              <span className="text-xs text-slate-400">Elite</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <Users className="h-4 w-4 text-green-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{totalPremiumUsers}</span>
              <span className="text-xs text-slate-400">Total</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <Shield className="h-4 w-4 text-orange-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{enterpriseClients.length}</span>
              <span className="text-xs text-slate-400">Enterprise</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Plan Distribution */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg p-2 shadow-sm">
        <span className="text-xs text-slate-400 px-2">Plan Distribution:</span>
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/60 rounded border border-slate-800">
            <Crown className="h-3 w-3 text-purple-400" />
            <span className="text-sm font-bold text-white">{eliteUsers.length}</span>
            <span className="text-xs text-slate-400">Elite</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/60 rounded border border-slate-800">
            <Building2 className="h-3 w-3 text-green-400" />
            <span className="text-sm font-bold text-white">{businessClients.length}</span>
            <span className="text-xs text-slate-400">Business</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/60 rounded border border-slate-800">
            <Shield className="h-3 w-3 text-orange-400" />
            <span className="text-sm font-bold text-white">{enterpriseClients.length}</span>
            <span className="text-xs text-slate-400">Enterprise</span>
          </div>
        </div>
      </div>

      {/* Compact Search */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg p-2 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by organization, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
      </div>

      {/* Compact Premium Users Table */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead className="border-b border-slate-800 bg-slate-950/60">
                <tr>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Email</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Industry</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const planStyle = getPlanBadge(user.subscriptionPlan);
                  const companyName = getCompanyName(user);
                  const industry = getIndustry(user);

                  return (
                    <tr key={user.id} className="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 align-top">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                            <span className="text-sm text-white font-medium truncate">{companyName}</span>
                          </div>
                          <span className="text-xs text-slate-500 ml-5.5">ID: {user.id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <div className="flex flex-col">
                          <span className="text-sm text-white truncate">{user.email}</span>
                          <Badge variant="outline" className={`text-xs inline-flex mt-1 ${
                            user.role === 'FREELANCER' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            user.role === 'CLIENT' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                            'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          }`}>
                            {user.role}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <span className="text-xs text-slate-400">{industry}</span>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <Badge variant="outline" className={`text-xs inline-flex ${planStyle.bg} ${planStyle.text} ${planStyle.border}`}>
                          {user.subscriptionPlan === 'FREELANCER_ELITE' && <Crown className="h-3 w-3 mr-1 flex-shrink-0" />}
                          <span className="truncate">{getPlanName(user.subscriptionPlan)}</span>
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <div className="flex items-center gap-1.5">
                          {user.isVerified ? (
                            <UserCheck className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                          )}
                          <span className={`text-xs whitespace-nowrap ${user.isVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                            {user.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUserId(user.id)}
                            className="text-slate-400 hover:text-white hover:bg-white/10 h-7 w-7 p-0 flex-shrink-0"
                            title="View Organization Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleContactOrganization(user)}
                            className="text-slate-400 hover:text-white hover:bg-white/10 h-7 w-7 p-0 flex-shrink-0"
                            title="Contact Organization"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <Building2 className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                <p className="text-sm">No organizations found</p>
                <p className="text-xs mt-1 text-slate-500">Try a different search term</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compact Footer */}
      {filteredUsers.length > 0 && (
        <div className="text-xs text-slate-500 flex items-center justify-between px-1">
          <span>Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'organization' : 'organizations'}</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUpdate={() => {
            refetch();
            setSelectedUserId(null);
          }}
        />
      )}

      {/* Contact Organization Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent
          className="bg-slate-900 border-white/10 text-white max-w-2xl"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-400" />
              Contact Organization
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Send an email to {contactFormData.recipientName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-white text-sm mb-2 block">To</Label>
              <Input
                value={contactFormData.recipientEmail}
                disabled
                className="bg-white/5 border-white/10 text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <Label className="text-white text-sm mb-2 block">Subject</Label>
              <Input
                value={contactFormData.subject}
                onChange={(e) => setContactFormData({ ...contactFormData, subject: e.target.value })}
                placeholder="Enter email subject"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <Label className="text-white text-sm mb-2 block">Message</Label>
              <Textarea
                value={contactFormData.message}
                onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                placeholder="Type your message here..."
                rows={6}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => setShowContactModal(false)}
                className="border-white/10 text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={!contactFormData.subject.trim() || !contactFormData.message.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

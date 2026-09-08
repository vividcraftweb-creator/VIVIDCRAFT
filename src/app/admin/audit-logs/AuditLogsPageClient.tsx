'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import {
  ScrollText,
  Activity,
  Shield,
  Search,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash,
  UserPlus,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState, useMemo } from 'react';

export default function AdminAuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterEntity, setFilterEntity] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 50;

  // Get real audit logs from database
  const { data: logsData, isLoading, refetch } = trpc.admin.auditLogs.getAuditLogs.useQuery({
    page,
    limit,
    entityType: filterEntity || undefined,
    action: filterAction || undefined,
  });

  // Get audit log statistics
  const { data: stats } = trpc.admin.auditLogs.getStats.useQuery();

  // Get available entity types and actions for filters
  const { data: entityTypes } = trpc.admin.auditLogs.getEntityTypes.useQuery();
  const { data: actions } = trpc.admin.auditLogs.getActions.useQuery();

  const logs = logsData?.logs ?? [];
  const totalLogs = logsData?.total ?? 0;
  const totalPages = logsData?.totalPages ?? 1;

  // Filter logs by search term (client-side)
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;

    return logs.filter(log => {
      const userEmail = Array.isArray(log.user) ? log.user[0]?.email : log.user?.email;
      const matchesSearch =
        userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityType.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [logs, searchTerm]);

  // Calculate today's logs from stats
  const todayLogs = stats?.last24Hours ?? 0;
  const securityActions = ['DELETE', 'SUSPEND', 'REJECT', 'FRAUD_FLAG'];
  const securityEvents = stats?.topActions?.filter(a =>
    securityActions.includes(a.action)
  ).reduce((sum, a) => sum + a.count, 0) ?? 0;

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE') || action.includes('REGISTER')) return UserPlus;
    if (action.includes('UPDATE') || action.includes('EDIT')) return Edit;
    if (action.includes('DELETE') || action.includes('REMOVE')) return Trash;
    if (action.includes('VIEW') || action.includes('READ')) return Eye;
    if (action.includes('APPROVE') || action.includes('ACCEPT')) return CheckCircle;
    if (action.includes('REJECT') || action.includes('DENY')) return XCircle;
    if (action.includes('SUSPEND') || action.includes('BAN')) return AlertTriangle;
    if (action.includes('VERIFY') || action.includes('VALIDATE')) return Shield;
    return Activity;
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('REGISTER'))
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (action.includes('UPDATE') || action.includes('EDIT'))
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (action.includes('DELETE') || action.includes('REMOVE'))
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (action.includes('VIEW') || action.includes('READ'))
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    if (action.includes('APPROVE') || action.includes('ACCEPT'))
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (action.includes('REJECT') || action.includes('DENY'))
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (action.includes('SUSPEND') || action.includes('BAN'))
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (action.includes('VERIFY') || action.includes('VALIDATE'))
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
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
          <ScrollText className="h-5 w-5 text-blue-400" />
          <h1 className="text-xl font-bold text-white">Audit Logs</h1>
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <ScrollText className="h-4 w-4 text-blue-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{stats?.totalLogs ?? 0}</span>
              <span className="text-xs text-slate-400">Total</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <Activity className="h-4 w-4 text-green-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{todayLogs}</span>
              <span className="text-xs text-slate-400">Last 24h</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <Shield className="h-4 w-4 text-orange-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{securityEvents}</span>
              <span className="text-xs text-slate-400">Security</span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="border-slate-800 text-white hover:bg-slate-800 h-8 px-3"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs">Refresh</span>
        </Button>
      </div>


      {/* Compact Filters */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 h-8"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 h-8"
              >
                <option value="" className="bg-slate-900">All Actions</option>
                {actions?.map((action) => (
                  <option key={action} value={action} className="bg-slate-900">
                    {action}
                  </option>
                ))}
              </select>

              <select
                value={filterEntity}
                onChange={(e) => {
                  setFilterEntity(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 h-8"
              >
                <option value="" className="bg-slate-900">All Entities</option>
                {entityTypes?.map((entityType) => (
                  <option key={entityType} value={entityType} className="bg-slate-900">
                    {entityType}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-800 bg-slate-950/60">
                <tr>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Entity</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Entity ID</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const ActionIcon = getActionIcon(log.action);
                  const userEmail = Array.isArray(log.user) ? log.user[0]?.email : log.user?.email;

                  return (
                    <tr key={log.id} className="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 align-top">
                        <div className="text-xs text-slate-300">
                          {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <span className="text-sm text-white truncate max-w-[150px] block">{userEmail || 'System'}</span>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <Badge className={`text-xs ${getActionColor(log.action)}`}>
                          <ActionIcon className="h-3 w-3 mr-1" />
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30 text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {log.entityType}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <span className="text-xs text-slate-400 font-mono">{log.entityId?.slice(0, 8) || '-'}</span>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <span className="text-xs text-slate-400 font-mono">{log.ipAddress || '-'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <ScrollText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p>No audit logs found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compact Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-slate-500">
            Page {page} of {totalPages} • {totalLogs} logs
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              size="sm"
              className="border-white/10 text-white hover:bg-white/5 h-7 px-3 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Prev
            </Button>
            <Button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="outline"
              size="sm"
              className="border-white/10 text-white hover:bg-white/5 h-7 px-3 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

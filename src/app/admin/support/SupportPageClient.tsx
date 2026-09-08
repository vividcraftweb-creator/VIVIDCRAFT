'use client';

import { trpc } from '@/utils/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LifeBuoy, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useMemo } from 'react';

export default function AdminSupportPage() {
  const { data: ticketData, isLoading } = trpc.admin.supportTickets.getSupportTickets.useQuery({});

  type SupportTicket = {
    id: string;
    subject?: string | null;
    message?: string | null;
    status?: string | null;
    priority?: string | null;
    createdAt?: string | Date | null;
  };

  const tickets = useMemo<SupportTicket[]>(() => {
    if (Array.isArray(ticketData)) {
      return ticketData as SupportTicket[];
    }

    if (
      ticketData &&
      typeof ticketData === 'object' &&
      Array.isArray((ticketData as { tickets?: unknown }).tickets)
    ) {
      return (ticketData as { tickets: SupportTicket[] }).tickets;
    }

    return [];
  }, [ticketData]);

  const openTickets = tickets.filter((ticket) => ticket.status === 'open').length;
  const inProgressTickets = tickets.filter((ticket) => ticket.status === 'in-progress').length;
  const resolvedTickets = tickets.filter((ticket) => ticket.status === 'resolved').length;

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
          <LifeBuoy className="h-5 w-5 text-blue-400" />
          <h1 className="text-xl font-bold text-white">Support Tickets</h1>
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <LifeBuoy className="h-4 w-4 text-blue-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{tickets.length}</span>
              <span className="text-xs text-slate-400">Total</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{openTickets}</span>
              <span className="text-xs text-slate-400">Open</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <Clock className="h-4 w-4 text-yellow-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{inProgressTickets}</span>
              <span className="text-xs text-slate-400">In Progress</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{resolvedTickets}</span>
              <span className="text-xs text-slate-400">Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Tickets List */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <LifeBuoy className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-sm">No support tickets found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-4 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold text-sm truncate">{ticket.subject}</h3>
                        <Badge className={`text-xs flex-shrink-0 ${
                          ticket.priority === 'urgent' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                          ticket.priority === 'high' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                          'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-2">{ticket.message}</p>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <Badge className={`text-xs flex-shrink-0 ${
                      ticket.status === 'open' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                      ticket.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                      'bg-green-500/20 text-green-300 border-green-500/30'
                    }`}>
                      {ticket.status === 'in-progress' ? 'In Progress' : ticket.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compact Footer */}
      {tickets.length > 0 && (
        <div className="text-xs text-slate-500 px-1">
          Showing {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
        </div>
      )}
    </div>
  );
}

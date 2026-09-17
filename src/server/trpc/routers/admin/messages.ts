/**
 * Admin Messages Router
 * Handles message moderation and site-wide monitoring with Chat Code search
 */

import crypto from 'crypto';
import { router, adminProcedure } from '../../trpc';
import type { Context } from '../../context';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getChatCode, normalizeChatCode, matchesChatCode } from '@/lib/chat-code';

const getAdminSupabase = (ctx: Context) => {
  return createAdminClient() || ctx.adminSupabase;
};

// Simple content flagging patterns
const FLAGGED_PATTERNS = [
  /\b(scam|fraud|fake)\b/i,
  /\b(illegal|unlawful)\b/i,
  /\b(personal\s*email|contact\s*me\s*at)\b/i,
  /\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
];

function isFlagged(content: string): boolean {
  if (!content) return false;
  return FLAGGED_PATTERNS.some((pattern) => pattern.test(content));
}

export const adminMessagesRouter = router({
  /**
   * Get all messages site-wide with pagination, chat_code search, and profile resolution
   */
  getMessages: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        flaggedOnly: z.boolean().default(false),
        searchQuery: z.string().optional(),
        chatCode: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const supabase = getAdminSupabase(ctx);
        if (!supabase) {
          return { messages: [], total: 0, page: input.page, limit: input.limit, totalPages: 0 };
        }
        const { page, limit, flaggedOnly, searchQuery, chatCode } = input;
        const offset = (page - 1) * limit;

        const effectiveSearch = (chatCode || searchQuery || '').trim();

        // 1. First attempt query on public.messages (active Supabase table)
        let messages: any[] = [];
        let totalCount = 0;
        let isMessagesTable = true;

        try {
          let query = supabase
            .from('messages')
            .select('*', { count: 'exact' });

          // Apply case-insensitive chat_code search if requested
          if (effectiveSearch) {
            const normalized = normalizeChatCode(effectiveSearch);
            if (/^CHAT/i.test(effectiveSearch) || /^[0-9A-F]{4,8}$/i.test(effectiveSearch)) {
              // Direct case-insensitive search on chat_code column
              query = query.ilike('chat_code', `%${effectiveSearch}%`);
            } else {
              // Flexible search across chat_code and message content
              query = query.or(`chat_code.ilike.%${effectiveSearch}%,content.ilike.%${effectiveSearch}%`);
            }
          }

          query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          const res = await query;
          if (!res.error && res.data) {
            messages = res.data;
            totalCount = res.count || messages.length;
          } else if (res.error && (res.error.code === '42P01' || res.error.message?.includes('does not exist'))) {
            isMessagesTable = false;
          }

          // Fallback: If chat code search yielded 0 results, check computed chat codes for legacy rows
          if (isMessagesTable && messages.length === 0 && effectiveSearch) {
            try {
              const { data: allRecent } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

              if (allRecent && allRecent.length > 0) {
                const matched = allRecent.filter((m: any) => {
                  const sId = m.sender_id || m.senderId;
                  const rId = m.receiver_id || m.receiverId;
                  const code = m.chat_code || getChatCode(sId, rId);
                  return (
                    matchesChatCode(code, effectiveSearch) ||
                    (m.content && m.content.toLowerCase().includes(effectiveSearch.toLowerCase()))
                  );
                });

                if (matched.length > 0) {
                  messages = matched.slice(offset, offset + limit);
                  totalCount = matched.length;
                }
              }
            } catch {}
          }
        } catch {
          isMessagesTable = false;
        }

        // Fallback to legacy Message table if messages table was empty or not found
        if (!isMessagesTable || (messages.length === 0 && totalCount === 0 && !effectiveSearch)) {
          try {
            let legacyQuery = supabase
              .from('Message')
              .select('*', { count: 'exact' });

            if (effectiveSearch) {
              legacyQuery = legacyQuery.or(`content.ilike.%${effectiveSearch}%`);
            }

            legacyQuery = legacyQuery
              .order('createdAt', { ascending: false })
              .range(offset, offset + limit - 1);

            const legacyRes = await legacyQuery;
            if (!legacyRes.error && legacyRes.data && legacyRes.data.length > 0) {
              messages = legacyRes.data;
              totalCount = legacyRes.count || messages.length;
            }
          } catch {}
        }

        // 2. Fetch profiles for all senders and receivers to show full profile info
        const userIds = Array.from(
          new Set(
            messages.flatMap((m: any) => [
              m.sender_id || m.senderId,
              m.receiver_id || m.receiverId,
            ]).filter(Boolean)
          )
        );

        const profileMap = new Map<string, any>();
        if (userIds.length > 0) {
          try {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, user_id, full_name, first_name, last_name, email, role, avatar_url')
              .in('id', userIds);

            (profiles || []).forEach((p: any) => {
              if (p.id) profileMap.set(p.id, p);
              if (p.user_id) profileMap.set(p.user_id, p);
            });
          } catch {}
        }

        // 3. Transform messages into rich, standardized format with computed Chat Codes
        const formattedMessages = messages.map((msg: any) => {
          const senderId = msg.sender_id || msg.senderId;
          const receiverId = msg.receiver_id || msg.receiverId;
          const computedChatCode = msg.chat_code || getChatCode(senderId, receiverId);

          const senderProf = profileMap.get(senderId);
          const receiverProf = profileMap.get(receiverId);

          const senderName =
            senderProf?.full_name ||
            `${senderProf?.first_name || ''} ${senderProf?.last_name || ''}`.trim() ||
            senderProf?.email ||
            msg.sender?.email ||
            'User';

          const receiverName =
            receiverProf?.full_name ||
            `${receiverProf?.first_name || ''} ${receiverProf?.last_name || ''}`.trim() ||
            receiverProf?.email ||
            msg.receiver?.email ||
            'User';

          const createdAt = msg.created_at || msg.createdAt || new Date().toISOString();

          return {
            id: msg.id,
            content: msg.content || '',
            createdAt,
            created_at: createdAt,
            senderId,
            sender_id: senderId,
            receiverId,
            receiver_id: receiverId,
            chat_code: computedChatCode,
            chatCode: computedChatCode,
            is_read: msg.is_read ?? msg.isRead ?? false,
            flagged: isFlagged(msg.content || ''),
            sender: {
              id: senderId,
              email: senderProf?.email || msg.sender?.email || 'N/A',
              name: senderName,
              Profile: {
                firstName: senderProf?.first_name || senderName.split(' ')[0] || '',
                lastName: senderProf?.last_name || senderName.split(' ').slice(1).join(' ') || '',
                avatarUrl: senderProf?.avatar_url,
              },
            },
            receiver: {
              id: receiverId,
              email: receiverProf?.email || msg.receiver?.email || 'N/A',
              name: receiverName,
              Profile: {
                firstName: receiverProf?.first_name || receiverName.split(' ')[0] || '',
                lastName: receiverProf?.last_name || receiverName.split(' ').slice(1).join(' ') || '',
                avatarUrl: receiverProf?.avatar_url,
              },
            },
          };
        });

        // 4. Filter by flagged if requested
        const filteredMessages = flaggedOnly
          ? formattedMessages.filter((msg) => msg.flagged)
          : formattedMessages;

        return {
          messages: filteredMessages,
          total: flaggedOnly ? filteredMessages.length : totalCount,
          page,
          limit,
          totalPages: Math.ceil((flaggedOnly ? filteredMessages.length : totalCount) / limit) || 1,
        };
      } catch (err) {
        console.error('getMessages exception:', err);
        return {
          messages: [],
          total: 0,
          page: input.page,
          limit: input.limit,
          totalPages: 0,
        };
      }
    }),

  /**
   * Get message statistics
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = getAdminSupabase(ctx);
      if (!supabase) {
        return {
          totalMessages: 0,
          flaggedMessages: 0,
          last24Hours: 0,
          flaggedPercentage: '0',
        };
      }

      let totalMessages = 0;
      let flaggedCount = 0;
      let last24Hours = 0;

      // Try messages table first
      try {
        const { data: allMessages, count } = await supabase
          .from('messages')
          .select('content', { count: 'exact' });

        if (allMessages) {
          totalMessages = count || allMessages.length;
          flaggedCount = allMessages.filter((msg: any) => isFlagged(msg.content)).length;

          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { count: h24 } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', yesterday);

          last24Hours = h24 || 0;
        }
      } catch {}

      // Fallback to legacy Message table if 0
      if (totalMessages === 0) {
        try {
          const { data: legacyAll, count: legCount } = await supabase
            .from('Message')
            .select('content', { count: 'exact' });

          if (legacyAll && legacyAll.length > 0) {
            totalMessages = legCount || legacyAll.length;
            flaggedCount = legacyAll.filter((msg: any) => isFlagged(msg.content)).length;

            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { count: legH24 } = await supabase
              .from('Message')
              .select('*', { count: 'exact', head: true })
              .gte('createdAt', yesterday);

            last24Hours = legH24 || 0;
          }
        } catch {}
      }

      return {
        totalMessages,
        flaggedMessages: flaggedCount,
        last24Hours,
        flaggedPercentage: totalMessages ? ((flaggedCount / totalMessages) * 100).toFixed(1) : '0',
      };
    } catch (err) {
      console.error('getStats exception in messages:', err);
      return {
        totalMessages: 0,
        flaggedMessages: 0,
        last24Hours: 0,
        flaggedPercentage: '0',
      };
    }
  }),

  /**
   * Get message by ID including full conversation history
   */
  getMessageById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const supabase = getAdminSupabase(ctx);
        if (!supabase) return null;

        let rawMessage: any = null;

        // 1. Try fetching from public.messages
        const { data: msgData } = await supabase
          .from('messages')
          .select('*')
          .eq('id', input.id)
          .maybeSingle();

        if (msgData) {
          rawMessage = msgData;
        } else {
          // Try legacy Message table
          const { data: legMsg } = await supabase
            .from('Message')
            .select('*')
            .eq('id', input.id)
            .maybeSingle();
          rawMessage = legMsg;
        }

        if (!rawMessage) return null;

        const senderId = rawMessage.sender_id || rawMessage.senderId;
        const receiverId = rawMessage.receiver_id || rawMessage.receiverId;
        const chatCode = rawMessage.chat_code || getChatCode(senderId, receiverId);
        const createdAt = rawMessage.created_at || rawMessage.createdAt;

        // 2. Fetch sender & receiver profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, first_name, last_name, email, role, avatar_url')
          .in('id', [senderId, receiverId]);

        const profileMap = new Map();
        (profiles || []).forEach((p: any) => {
          if (p.id) profileMap.set(p.id, p);
          if (p.user_id) profileMap.set(p.user_id, p);
        });

        const senderProf = profileMap.get(senderId);
        const receiverProf = profileMap.get(receiverId);

        const senderName =
          senderProf?.full_name ||
          `${senderProf?.first_name || ''} ${senderProf?.last_name || ''}`.trim() ||
          senderProf?.email ||
          'User';

        const receiverName =
          receiverProf?.full_name ||
          `${receiverProf?.first_name || ''} ${receiverProf?.last_name || ''}`.trim() ||
          receiverProf?.email ||
          'User';

        // 3. Fetch full chronological conversation history between sender and receiver or by chat code
        let conversationHistory: any[] = [];
        try {
          let historyQuery = supabase.from('messages').select('*');
          if (rawMessage.chat_code) {
            historyQuery = historyQuery.or(
              `chat_code.eq.${rawMessage.chat_code},and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
            );
          } else {
            historyQuery = historyQuery.or(
              `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
            );
          }

          const { data: history } = await historyQuery
            .order('created_at', { ascending: true })
            .limit(200);

          if (history && history.length > 0) {
            conversationHistory = history.map((m: any) => {
              const isSender = (m.sender_id || m.senderId) === senderId;
              const mDate = m.created_at || m.createdAt;
              return {
                id: m.id,
                content: m.content,
                createdAt: mDate,
                senderId: m.sender_id || m.senderId,
                senderName: isSender ? senderName : receiverName,
                receiverId: m.receiver_id || m.receiverId,
                receiverName: isSender ? receiverName : senderName,
                isSender,
                chatCode,
                flagged: isFlagged(m.content || ''),
              };
            });
          }
        } catch {}

        return {
          id: rawMessage.id,
          content: rawMessage.content || '',
          createdAt,
          created_at: createdAt,
          senderId,
          sender_id: senderId,
          receiverId,
          receiver_id: receiverId,
          chat_code: chatCode,
          chatCode,
          flagged: isFlagged(rawMessage.content || ''),
          sender: {
            id: senderId,
            email: senderProf?.email || 'N/A',
            name: senderName,
            Profile: {
              firstName: senderProf?.first_name || senderName.split(' ')[0] || '',
              lastName: senderProf?.last_name || senderName.split(' ').slice(1).join(' ') || '',
              avatarUrl: senderProf?.avatar_url,
            },
          },
          receiver: {
            id: receiverId,
            email: receiverProf?.email || 'N/A',
            name: receiverName,
            Profile: {
              firstName: receiverProf?.first_name || receiverName.split(' ')[0] || '',
              lastName: receiverProf?.last_name || receiverName.split(' ').slice(1).join(' ') || '',
              avatarUrl: receiverProf?.avatar_url,
            },
          },
          conversation: conversationHistory,
        };
      } catch (err) {
        console.error('getMessageById exception:', err);
        return null;
      }
    }),

  /**
   * Delete message (moderation action)
   */
  deleteMessage: adminProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = getAdminSupabase(ctx);
      if (!supabase) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Admin client unavailable' });
      }

      // Delete from messages and Message tables
      await Promise.allSettled([
        supabase.from('messages').delete().eq('id', input.id),
        supabase.from('Message').delete().eq('id', input.id),
      ]);

      // Audit log
      try {
        await supabase.from('AuditLog').insert({
          id: crypto.randomUUID(),
          action: 'DELETE_MESSAGE',
          entityType: 'MESSAGE',
          entityId: input.id,
          userId: ctx.session?.user?.id || null,
          metadata: {
            reason: input.reason || 'Admin moderation',
          },
          createdAt: new Date().toISOString(),
        });
      } catch {}

      return { success: true };
    }),

  /**
   * Get messages between two users or by Chat Code
   */
  getConversation: adminProcedure
    .input(
      z.object({
        userId1: z.string().optional(),
        userId2: z.string().optional(),
        chatCode: z.string().optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const supabase = getAdminSupabase(ctx);
        if (!supabase) return [];

        let query = supabase
          .from('messages')
          .select('*');

        if (input.chatCode) {
          const cleanCode = normalizeChatCode(input.chatCode);
          query = query.ilike('chat_code', `%${cleanCode}%`);
        } else if (input.userId1 && input.userId2) {
          query = query.or(
            `and(sender_id.eq.${input.userId1},receiver_id.eq.${input.userId2}),and(sender_id.eq.${input.userId2},receiver_id.eq.${input.userId1})`
          );
        }

        query = query.order('created_at', { ascending: true }).limit(input.limit);

        const { data: rawData } = await query;
        let messages = rawData || [];

        // Fallback: If chatCode search returned 0 rows, check computed chat codes
        if (input.chatCode && messages.length === 0) {
          try {
            const { data: allRecent } = await supabase
              .from('messages')
              .select('*')
              .order('created_at', { ascending: true })
              .limit(input.limit);

            if (allRecent && allRecent.length > 0) {
              messages = allRecent.filter((m: any) => {
                const sId = m.sender_id || m.senderId;
                const rId = m.receiver_id || m.receiverId;
                const code = m.chat_code || getChatCode(sId, rId);
                return matchesChatCode(code, input.chatCode!);
              });
            }
          } catch {}
        }

        return messages.map((msg: any) => ({
          ...msg,
          senderId: msg.sender_id || msg.senderId,
          receiverId: msg.receiver_id || msg.receiverId,
          createdAt: msg.created_at || msg.createdAt,
          chatCode: msg.chat_code || getChatCode(msg.sender_id || msg.senderId, msg.receiver_id || msg.receiverId),
          flagged: isFlagged(msg.content || ''),
        }));
      } catch (err) {
        console.error('getConversation exception:', err);
        return [];
      }
    }),
});

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageSquare, Clock, MoreHorizontal, RotateCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import { createClient } from '@/lib/supabase/client';
import { parseISO, format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { toast } from 'sonner';
import { isArtistRole } from '@/lib/artist-filter';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/router';

type ContactsOutput = inferRouterOutputs<AppRouter>['profiles']['getContacts'];
type ContactForChat = ContactsOutput[number];

type MessagesOutput = inferRouterOutputs<AppRouter>['messages']['getMessages'];
type MessageForChat = MessagesOutput[number];

type ChatMessageItem = {
  id: string;
  content: string;
  sender_id?: string;
  receiver_id?: string;
  senderId?: string;
  receiverId?: string;
  created_at?: string;
  createdAt?: string;
  is_read?: boolean;
  isRead?: boolean;
  pending?: boolean;
  status?: 'pending' | 'sent' | 'failed';
  jobId?: string | null;
  proposalId?: string | null;
  job?: any;
  proposal?: any;
  [key: string]: any;
};

const INTERVIEW_TEMPLATE = `Hi! I'm interested in your proposal and would like to schedule an interview to discuss the project in more detail.

Are you available for a brief video call this week? Please share your availability and preferred meeting platform (Zoom, Google Meet, etc.).

Looking forward to speaking with you!`;

export default function MessagesView() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const recipientId = searchParams.get('recipientId') || searchParams.get('userId');
  const userId = recipientId;
  const action = searchParams.get('action');
  const jobId = searchParams.get('jobId');
  const proposalId = searchParams.get('proposalId');

  const currentUser = session?.session?.user || (session as any)?.user;
  const currentUserId = (currentUser?.id || '').toString().trim();
  const currentUserRole = currentUser?.role || '';
  const isCurrentArtist = isArtistRole(currentUserRole);

  const [selectedUser, setSelectedUser] = useState<ContactForChat | null>(null);
  const activeRecipientId = (selectedUser?.id && selectedUser.id !== currentUserId)
    ? selectedUser.id.toString().trim()
    : '';

  const selectedUserRole = (selectedUser?.profile as any)?.role || (selectedUser as any)?.role || '';
  const isSelectedUserArtist = isArtistRole(selectedUserRole);
  const isSelf = Boolean(currentUserId && selectedUser?.id && currentUserId === selectedUser.id);
  const isArtistToArtist = isCurrentArtist && isSelectedUserArtist;

  const [message, setMessage] = useState('');
  const newMessage = message;
  const setNewMessage = setMessage;
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const chatHistory = messages;
  const setChatHistory = setMessages;
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const markedAsReadRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isWithin7Days = (msg: ChatMessageItem) => {
    const rawDate = msg.created_at || msg.createdAt;
    if (!rawDate) return true;
    const msgDate = new Date(rawDate);
    if (isNaN(msgDate.getTime())) return true;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return msgDate >= sevenDaysAgo;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior });
    } catch {}
  };

  // Auto-scroll chat to bottom on load and whenever messages update
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom('smooth');
    }, 60);
    return () => clearTimeout(timer);
  }, [messages.length, selectedUser?.id]);

  const getContactName = (contact: ContactForChat) => {
    if (contact.profile?.firstName && contact.profile?.lastName) {
      return `${contact.profile.firstName} ${contact.profile.lastName}`;
    }
    return contact.email || 'Unknown User';
  };

  const formatJobContext = (contact: ContactForChat, messages: ChatMessageItem[]) => {
    const messageWithJob = messages?.find(m => m.job);
    if (!messageWithJob?.job) return null;

    const contactName = getContactName(contact);
    const jobTitle = messageWithJob.job.title;
    const jobLink = `/jobs/${messageWithJob.job.slug || messageWithJob.job.id}`;

    return { contactName, jobTitle, jobLink };
  };

  const { data: contacts, isLoading: contactsLoading } = trpc.profiles.getContacts.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 30000, // Refresh every 30 seconds to catch new contacts
    refetchOnWindowFocus: true, // Refresh when user returns to the tab
  });

  // Fetch conversation previews (last message + unread count)
  const { data: conversationPreviews } = trpc.messages.getConversationPreviews.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 5000, // Refresh every 5 seconds for new messages
  });

  // Fetch user by ID if provided in URL
  const { data: userById } = trpc.user.getUserById.useQuery(
    { userId: userId || '' },
    { enabled: !!userId && !!session }
  );

  const messagesQuery = trpc.messages.getMessages.useQuery(
    { receiverId: activeRecipientId || '' },
    { enabled: !!activeRecipientId && !!session && !isSelf && !isArtistToArtist }
  );

  const canChatQuery = trpc.messages.canChat.useQuery(
    { partnerId: activeRecipientId || '' },
    { enabled: !!activeRecipientId && !!session && !isSelf && !isArtistToArtist }
  );

  const canChat = Boolean(activeRecipientId && !isSelf && !isArtistToArtist && (canChatQuery.data ?? true));

  const utils = trpc.useUtils();

  const sendMessageMutation = trpc.messages.sendMessage.useMutation({
    onMutate: async (newMessage) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await utils.messages.getMessages.cancel();
      await utils.profiles.getContacts.cancel();

      // Snapshot the previous values
      const previousMessages = messagesQuery.data;
      const previousContacts = utils.profiles.getContacts.getData();

      // Optimistically update with the new message
      const optimisticMessage: MessageForChat = {
        id: `temp-${Date.now()}`,
        content: newMessage.content,
        senderId: session?.session?.user?.id || '',
        receiverId: newMessage.receiverId,
        createdAt: new Date().toISOString(),
        isRead: false,
        jobId: newMessage.jobId || null,
        proposalId: newMessage.proposalId || null,
        job: null,
        proposal: null,
      };

      setChatHistory((prev) => [...prev, optimisticMessage]);
      setMessage('');

      // Optimistically add the receiver to contacts if not already present
      if (previousContacts && selectedUser && !previousContacts.some(c => c.id === newMessage.receiverId)) {
        const newContact: ContactForChat = {
          id: selectedUser.id,
          email: selectedUser.email || null,
          profile: selectedUser.profile || null,
        };
        utils.profiles.getContacts.setData(undefined, [...previousContacts, newContact]);
      }

      return { previousMessages, previousContacts };
    },
    onError: (_err, _newMessage, context) => {
      // Revert to previous messages and contacts on error
      if (context?.previousMessages) {
        setChatHistory(context.previousMessages);
      }
      if (context?.previousContacts) {
        utils.profiles.getContacts.setData(undefined, context.previousContacts);
      }
    },
    onSettled: () => {
      // Refetch to get the real data from server
      messagesQuery.refetch();
      // Also refresh conversation previews to update last message
      utils.messages.getConversationPreviews.invalidate();
      // CRITICAL FIX: Invalidate contacts to show new conversation partners
      utils.profiles.getContacts.invalidate();
    }
  });

  // Merge contacts with userById (excluding self and artist-to-artist)
  const allContacts = useMemo(() => {
    let contactsList = (contacts || []).filter((c) => {
      if (!c.id || c.id === currentUserId) return false;
      if (isCurrentArtist) {
        const contactRole = (c.profile as any)?.role || (c as any)?.role;
        if (isArtistRole(contactRole)) return false;
      }
      return true;
    });

    if (userById && userById.id !== currentUserId && !contactsList.some(c => c.id === userById.id)) {
      const contactRole = (userById.Profile as any)?.role || (userById as any)?.role;
      if (!isCurrentArtist || !isArtistRole(contactRole)) {
        contactsList = [{
          id: userById.id,
          email: userById.email,
          profile: userById.Profile ? (Array.isArray(userById.Profile) ? userById.Profile[0] : userById.Profile) : null,
        }, ...contactsList];
      }
    }
    return contactsList;
  }, [contacts, userById, currentUserId, isCurrentArtist]);

  // Auto-select user from URL parameter (recipientId or userId)
  useEffect(() => {
    if (!recipientId || recipientId === currentUserId) {
      if (selectedUser?.id === currentUserId) {
        setSelectedUser(null);
      }
      return;
    }

    if (allContacts.length > 0) {
      const user = allContacts.find(c => c.id === recipientId);
      if (user && (!selectedUser || selectedUser.id !== recipientId)) {
        setSelectedUser(user);
        return;
      }
    }
    if (userById && userById.id !== currentUserId && (!selectedUser || selectedUser.id !== recipientId)) {
      const contactRole = (userById.Profile as any)?.role || (userById as any)?.role;
      if (isCurrentArtist && isArtistRole(contactRole)) {
        setSelectedUser(null);
        toast.error('Artists can only exchange messages with clients.');
        return;
      }
      const prof = userById.Profile ? (Array.isArray(userById.Profile) ? userById.Profile[0] : userById.Profile) : null;
      setSelectedUser({
        id: userById.id,
        email: userById.email,
        profile: prof,
      });
    }
  }, [recipientId, allContacts, userById, selectedUser, currentUserId, isCurrentArtist]);

  // Pre-fill message if action=schedule
  useEffect(() => {
    if (action === 'schedule' && selectedUser && !message) {
      setMessage(INTERVIEW_TEMPLATE);
    }
  }, [action, selectedUser, message]);

  const markAsReadMutation = trpc.messages.markMessagesAsRead.useMutation({
    onSuccess: () => {
      // Refresh conversation previews to update unread count
      utils.messages.getConversationPreviews.invalidate();
    }
  });

  const fetchDirectMessages = async (showLoadingSpinner = false) => {
    if (!activeRecipientId || !currentUserId || activeRecipientId === currentUserId) {
      setMessages([]);
      return;
    }

    if (showLoadingSpinner) {
      setIsRefreshing(true);
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffIso = sevenDaysAgo.toISOString();

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeRecipientId}),and(sender_id.eq.${activeRecipientId},receiver_id.eq.${currentUserId})`)
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase messages fetch error:', error);
        if (messagesQuery.data) {
          const validTRPC = messagesQuery.data.filter((m) => {
            const rawDate = m.createdAt || (m as any).created_at;
            return !rawDate || new Date(rawDate) >= sevenDaysAgo;
          });
          setMessages(validTRPC);
        }
      } else if (data) {
        const filtered = data.filter((m) => isWithin7Days(m));
        setMessages(filtered);
      }
    } catch (err) {
      console.error('Direct chat fetch notice:', err);
    } finally {
      if (showLoadingSpinner) {
        setIsRefreshing(false);
      }
    }
  };

  const handleManualRefresh = async () => {
    await fetchDirectMessages(true);
    try {
      utils.messages.getConversationPreviews.invalidate();
    } catch {}
  };

  // Fetch chat messages real-time / on select
  useEffect(() => {
    if (!activeRecipientId || !currentUserId || activeRecipientId === currentUserId) {
      setMessages([]);
      return;
    }

    fetchDirectMessages(false);

    // Mark messages as read when viewing conversation (only once per conversation)
    if (
      selectedUser &&
      !markedAsReadRef.current.has(selectedUser.id) &&
      messagesQuery.data?.some(m => (m.receiverId === currentUserId || (m as any).receiver_id === currentUserId) && !m.isRead)
    ) {
      markedAsReadRef.current.add(selectedUser.id);
      markAsReadMutation.mutate({ senderId: selectedUser.id });
    }

    // Subscribe to realtime changes with unique id deduplication
    const supabase = createClient();
    const channel = supabase
      .channel(`chat_${currentUserId}_${activeRecipientId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          try {
            const m = payload.new as any;
            if (!m) return;
            const sender = String(m.sender_id || m.senderId || '').trim();
            const receiver = String(m.receiver_id || m.receiverId || '').trim();
            if (
              (sender === currentUserId && receiver === activeRecipientId) ||
              (sender === activeRecipientId && receiver === currentUserId)
            ) {
              setMessages((prev) => {
                if (prev.some((msg) => msg.id === m.id)) return prev;
                return [...prev, m];
              });
            }
          } catch (err) {
            console.warn('[Realtime] message notice:', err);
          }
        }
      )
      .subscribe();

    // Resilient background sync so incoming messages append without page reloads
    const pollInterval = setInterval(() => {
      fetchDirectMessages(false);
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [selectedUser?.id, activeRecipientId, currentUserId, messagesQuery.data, markAsReadMutation]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      try {
        e.preventDefault();
      } catch {}
    }

    const text = newMessage.trim();
    if (!text || !activeRecipientId || !currentUserId || activeRecipientId === currentUserId || isSending) return;

    if (isArtistToArtist) {
      toast.error('Direct messaging between artists is disabled. Artists can only exchange messages with clients.');
      return;
    }

    const msgContent = text;
    setNewMessage('');
    setIsSending(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: activeRecipientId,
          content: msgContent
        })
        .select();

      // Immediately push to local state and reset spinner
      setIsSending(false);

      if (!error && data && data[0]) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data[0].id)) return prev;
          return [...prev, data[0]];
        });
      } else if (error) {
        console.warn("[Messaging] Supabase insert notice:", error.message || error);
      }

      try {
        utils.messages.getConversationPreviews.invalidate();
        utils.profiles.getContacts.invalidate();
      } catch {}
    } catch (err) {
      setIsSending(false);
      console.warn("[Messaging] Handled dispatch notice:", err);
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      if (!date || isNaN(date.getTime())) return '';

      if (isToday(date)) {
        return format(date, 'h:mm a');
      } else if (isYesterday(date)) {
        return 'Yesterday';
      } else if (isThisWeek(date)) {
        return format(date, 'EEE h:mm a');
      } else {
        return format(date, 'MMM d');
      }
    } catch {
      return '';
    }
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col gap-4">
      {/* 7-Day Retention Notice Banner */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-4 py-2.5 text-center text-xs sm:text-sm text-slate-400 flex items-center justify-center gap-2 flex-shrink-0 shadow-sm">
        <span>ℹ️</span>
        <span>Messages are automatically cleared after 7 days.</span>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Contacts Sidebar */}
        <Card className="w-1/3 bg-slate-900/80 border-slate-800 shadow-sm flex flex-col min-h-0">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {contactsLoading ? (
              <div className="space-y-1 p-4">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-800 rounded w-3/4" />
                        <div className="h-3 bg-slate-800 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : allContacts && allContacts.length > 0 ? (
              <div className="space-y-1 p-4">
                {allContacts.map((contact) => {
                  const preview = conversationPreviews?.[contact.id];
                  const unreadCount = preview?.unreadCount || 0;
                  const lastMessage = preview?.lastMessage;

                  return (
                    <div
                      key={contact.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedUser?.id === contact.id
                          ? 'bg-primary/20 border border-primary/30'
                          : 'bg-slate-950/60 hover:bg-slate-900/80 border border-slate-800'
                      }`}
                      onClick={() => setSelectedUser(contact)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 border-2 border-primary/50">
                            <AvatarImage
                              src={getProfilePictureUrl(contact.id, contact.profile?.profilePicture) || undefined}
                              alt={getContactName(contact)}
                            />
                            <AvatarFallback className="bg-primary/30 text-white font-bold">
                              {contact.profile?.firstName?.charAt(0) || contact.email?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex flex-col min-w-0">
                              <p className="text-white font-semibold truncate">
                                {getContactName(contact)}
                              </p>
                              {contact.profile?.companyName && (
                                <p className="text-xs text-slate-400 truncate">
                                  {contact.profile.companyName}
                                </p>
                              )}
                            </div>
                            {lastMessage && (
                              <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                                {formatTimestamp(lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          {lastMessage && (
                            <p className={`text-sm truncate ${unreadCount > 0 ? 'text-white font-medium' : 'text-slate-400'}`}>
                              {lastMessage.senderId === session?.session?.user?.id ? 'You: ' : ''}
                              {lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="h-12 w-12 text-slate-600 mb-3" />
                <p className="text-white font-medium mb-2">No contacts yet</p>
                <p className="text-sm text-slate-400 mb-4 max-w-xs">
                  Start a conversation by sending a message to an artist from their profile
                </p>
                <Link href="/freelancers">
                  <Button className="bg-primary hover:bg-primary/90 text-white">
                    Browse Artists
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 bg-slate-900/80 border-slate-800 shadow-sm flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <CardHeader className="border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/50">
                    <AvatarImage
                      src={getProfilePictureUrl(selectedUser.id, selectedUser.profile?.profilePicture) || undefined}
                      alt={getContactName(selectedUser)}
                    />
                    <AvatarFallback className="bg-primary/30 text-white font-bold text-lg">
                      {selectedUser.profile?.firstName?.charAt(0) || selectedUser.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold text-lg">
                        {getContactName(selectedUser)}
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 text-xs rounded-md"
                        title="Refresh conversation"
                      >
                        <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                      </Button>
                    </div>
                    {selectedUser.profile?.companyName && (
                      <p className="text-sm text-slate-400">
                        {selectedUser.profile.companyName}
                      </p>
                    )}
                    {(() => {
                      const jobContext = formatJobContext(selectedUser, chatHistory);
                      return jobContext ? (
                        <p className="text-sm text-slate-400 mt-1">
                          {jobContext.contactName} from{' '}
                          <Link
                            href={jobContext.jobLink}
                            className="text-primary hover:text-primary/80 hover:underline transition-colors"
                          >
                            {jobContext.jobTitle}
                          </Link>
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                    <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer">
                      Delete conversation
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer">
                      Block user
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-800" />
                    <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer">
                      Report user
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            {/* Messages List */}
            <CardContent className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {chatHistory.length > 0 ? (
                  <div className="space-y-4">
                    {chatHistory
                      .filter((msg) => isWithin7Days(msg))
                      .filter((msg, index, self) => index === self.findIndex((m) => m.id === msg.id))
                      .map((chat, index) => {
                      const senderId = chat.sender_id || chat.senderId;
                      const currentUserId = (session?.session?.user?.id || (session as any)?.user?.id);
                      const isOwn = senderId === currentUserId;
                      const isPending = Boolean(chat.pending);
                      const timestamp = chat.created_at || chat.createdAt;
                      return (
                        <div
                          key={chat.id || index}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            <div
                              className={`p-3 rounded-lg transition-all ${
                                isOwn
                                  ? 'bg-primary text-white'
                                  : 'bg-slate-800 text-slate-100 border border-slate-700'
                              } ${isPending ? 'opacity-70 ring-1 ring-white/20' : ''}`}
                            >
                              <p className="break-words">{chat.content}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              {timestamp && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimestamp(timestamp)}
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[10px] text-amber-400 font-medium animate-pulse">
                                  Sending...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-16 w-16 text-slate-600 mb-4" />
                    <p className="text-slate-400">No messages yet</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Start the conversation by sending a message below
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>

            {/* Message Input */}
            <div className="border-t border-slate-800 p-4 flex-shrink-0">
              {!canChat ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center text-sm text-amber-300">
                  {isSelf
                    ? 'You cannot send messages to yourself.'
                    : isArtistToArtist
                      ? 'Direct messaging between artists is disabled. Artists can only exchange messages with clients.'
                      : 'Chat is disabled for this conversation.'}
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    id="chat-message-input"
                    name="chat-message-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
                    disabled={isSending}
                  />
                  <Button
                    type="submit"
                    disabled={isSending || !message.trim()}
                    className="bg-primary hover:bg-primary/90 min-w-[44px] flex items-center justify-center"
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              Select a conversation
            </h3>
            <p className="text-slate-400 max-w-sm">
              Choose a contact from the list to view your conversation and send messages
            </p>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}

export { MessagesView as ChatComponent };

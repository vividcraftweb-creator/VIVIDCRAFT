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
import { Send, MessageSquare, Clock, MoreHorizontal, RotateCw, Search, Copy, Check, Tag, X, ArrowLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import { createClient } from '@/lib/supabase/client';
import { getChatCode, matchesChatCode, normalizeChatCode } from '@/lib/chat-code';
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

  const [activeRecipientProfile, setActiveRecipientProfile] = useState<{
    id: string;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    role?: string | null;
    [key: string]: any;
  } | null>(null);

  const [recipientProfilesMap, setRecipientProfilesMap] = useState<Record<string, any>>({});

  const selectedUserRole =
    activeRecipientProfile?.role ||
    (selectedUser?.profile as any)?.role ||
    (selectedUser as any)?.role ||
    '';
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

  // Chat Code search & copy state
  const [chatCodeSearch, setChatCodeSearch] = useState('');
  const [copiedChatCode, setCopiedChatCode] = useState<string | null>(null);

  const handleCopyChatCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedChatCode(code);
    toast.success(`Chat Code copied: ${code}`);
    setTimeout(() => {
      setCopiedChatCode(null);
    }, 2000);
  };

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

  const getRecipientDisplayName = (contactOrId: ContactForChat | string | null, customProfile?: any) => {
    const contact = typeof contactOrId === 'object' ? contactOrId : null;
    const contactId = typeof contactOrId === 'string' ? contactOrId : contact?.id;
    const mappedProf = contactId ? recipientProfilesMap[contactId] : null;

    const prof = customProfile || mappedProf || contact?.profile;
    const email = customProfile?.email || mappedProf?.email || contact?.email;

    // 1. Check full_name
    if (prof?.full_name?.trim()) return prof.full_name.trim();
    if ((prof as any)?.fullName?.trim()) return (prof as any).fullName.trim();

    // 2. Check firstName + lastName or single firstName
    const fName = (prof?.firstName || prof?.first_name || '').trim();
    const lName = (prof?.lastName || prof?.last_name || '').trim();
    const combined = `${fName} ${lName}`.trim();
    if (combined) return combined;

    // 3. Check displayName / display_name
    if (prof?.displayName?.trim()) return prof.displayName.trim();
    if (prof?.display_name?.trim()) return prof.display_name.trim();

    // 4. Fall back to email prefix before resorting to generic role strings
    if (email && typeof email === 'string' && email.includes('@')) {
      const emailPrefix = email.split('@')[0].trim();
      if (emailPrefix) return emailPrefix;
    }
    if (email && typeof email === 'string' && email.trim()) return email.trim();

    // 5. Check artist_name / username
    if (prof?.artist_name?.trim()) return prof.artist_name.trim();
    if (prof?.username?.trim()) return prof.username.trim();

    // 6. Generic role fallback
    const role = prof?.role || (contact as any)?.role;
    if (role && typeof role === 'string') {
      return role.toLowerCase() === 'artist' ? 'Artist' : 'Client';
    }

    return 'Client';
  };

  const getContactName = (contact: ContactForChat) => {
    if (!contact) return 'Client';
    return getRecipientDisplayName(contact, recipientProfilesMap[contact.id]);
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
    refetchInterval: 5000, // Refresh every 5 seconds to catch new contacts immediately
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

  const canChat = Boolean(activeRecipientId && !isSelf && !isArtistToArtist);

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

  // Merge contacts with userById and active conversation partners (excluding self and artist-to-artist)
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

    // Also include any active partners from conversationPreviews so conversation sidebar never lags behind
    if (conversationPreviews) {
      Object.keys(conversationPreviews).forEach((partnerId) => {
        if (partnerId && partnerId !== currentUserId && !contactsList.some((c) => c.id === partnerId)) {
          contactsList.push({
            id: partnerId,
            email: null,
            profile: {
              firstName: 'Client',
              lastName: '',
              profilePicture: null,
              companyName: null,
              role: 'CLIENT',
            },
          });
        }
      });
    }

    return contactsList;
  }, [contacts, userById, currentUserId, isCurrentArtist, conversationPreviews]);

  // Filter contacts by Chat Code or Name/Email
  const filteredContacts = useMemo(() => {
    if (!chatCodeSearch.trim()) return allContacts;
    const q = chatCodeSearch.trim();

    return allContacts.filter((contact) => {
      const code = getChatCode(currentUserId, contact.id);
      if (matchesChatCode(code, q)) return true;

      const contactProfile = recipientProfilesMap[contact.id] || contact.profile;
      const displayName = getRecipientDisplayName(contact, contactProfile).toLowerCase();
      const email = (recipientProfilesMap[contact.id]?.email || contact.email || '').toLowerCase();
      const qLower = q.toLowerCase();

      return displayName.includes(qLower) || email.includes(qLower);
    });
  }, [allContacts, chatCodeSearch, currentUserId, recipientProfilesMap]);

  // Directly select the matching conversation upon pressing Enter or Search
  const handleChatCodeSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = chatCodeSearch.trim();
    if (!q) return;

    // 1. Check for exact or normalized Chat Code match
    const normalized = normalizeChatCode(q);
    const exactMatch = allContacts.find((c) => {
      const code = getChatCode(currentUserId, c.id);
      return (
        code.toUpperCase() === normalized.toUpperCase() ||
        code.toUpperCase() === q.toUpperCase() ||
        matchesChatCode(code, q)
      );
    });

    if (exactMatch) {
      handleSelectContact(exactMatch);
      toast.success(`Opened conversation (${getChatCode(currentUserId, exactMatch.id)})`);
      return;
    }

    // 2. If single contact matches in filtered list
    if (filteredContacts.length === 1) {
      handleSelectContact(filteredContacts[0]);
      toast.success(`Selected ${getRecipientDisplayName(filteredContacts[0], recipientProfilesMap[filteredContacts[0].id])}`);
      return;
    }

    if (filteredContacts.length === 0) {
      toast.error(`No conversation found matching "${q}"`);
    }
  };

  // Prevent activeRecipientId from defaulting to currentUser.id upon role or dashboard switching
  useEffect(() => {
    if (selectedUser && currentUserId && selectedUser.id === currentUserId) {
      setSelectedUser(null);
    }
  }, [selectedUser, currentUserId]);

  // Auto-select user from URL parameter or force auto-select first valid recipient for Client
  useEffect(() => {
    if (selectedUser && currentUserId && selectedUser.id === currentUserId) {
      setSelectedUser(null);
      return;
    }

    if (recipientId && recipientId !== currentUserId) {
      if (allContacts.length > 0) {
        const user = allContacts.find(c => c.id === recipientId && c.id !== currentUserId);
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
        return;
      }
    }

    // When a Client opens Messages, force auto-select to the FIRST valid conversation recipient where recipient.id !== currentUser.id
    if (!selectedUser || selectedUser.id === currentUserId) {
      if (allContacts.length > 0) {
        const firstValid = allContacts.find(c => c.id && c.id !== currentUserId);
        if (firstValid) {
          setSelectedUser(firstValid);
        }
      }
    }
  }, [recipientId, allContacts, userById, selectedUser, currentUserId, isCurrentArtist]);

  // Pre-fill message if action=schedule
  useEffect(() => {
    if (action === 'schedule' && selectedUser && !message) {
      setMessage(INTERVIEW_TEMPLATE);
    }
  }, [action, selectedUser, message]);

  // Explicit contact selection handler setting both activeRecipientId and activeRecipientProfile
  const handleSelectContact = async (contact: ContactForChat) => {
    setSelectedUser(contact);
    const targetId = contact?.id;
    if (!targetId || targetId === currentUserId) return;

    if (recipientProfilesMap[targetId]) {
      setActiveRecipientProfile(recipientProfilesMap[targetId]);
    }

    try {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .eq('id', targetId)
        .single();

      if (profile) {
        setActiveRecipientProfile(profile);
        setRecipientProfilesMap((prev) => ({ ...prev, [targetId]: profile }));
      }
    } catch (err) {
      console.warn('Recipient profile single fetch notice:', err);
    }
  };

  // Hydrate all contact recipient profiles from public.profiles table
  useEffect(() => {
    if (!allContacts || allContacts.length === 0) return;
    const targetIds = allContacts
      .map((c) => c.id)
      .filter((id) => id && id !== currentUserId && !recipientProfilesMap[id]);

    if (targetIds.length === 0) return;

    let isSubscribed = true;
    const fetchProfiles = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, display_name, email, avatar_url, role')
          .in('id', targetIds);

        if (isSubscribed && data && !error) {
          setRecipientProfilesMap((prev) => {
            const next = { ...prev };
            data.forEach((p: any) => {
              if (p.id) next[p.id] = p;
            });
            return next;
          });
        }
      } catch (err) {
        console.warn('Hydrating contacts error:', err);
      }
    };

    fetchProfiles();
    return () => {
      isSubscribed = false;
    };
  }, [allContacts, currentUserId]);

  // Ensure activeRecipientProfile is hydrated whenever activeRecipientId changes
  useEffect(() => {
    if (!activeRecipientId || activeRecipientId === currentUserId) {
      setActiveRecipientProfile(null);
      return;
    }

    if (recipientProfilesMap[activeRecipientId]) {
      setActiveRecipientProfile(recipientProfilesMap[activeRecipientId]);
    }

    let isSubscribed = true;
    const fetchActiveProfile = async () => {
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, role')
          .eq('id', activeRecipientId)
          .single();

        if (isSubscribed && profile) {
          setActiveRecipientProfile(profile);
          setRecipientProfilesMap((prev) => ({ ...prev, [activeRecipientId]: profile }));
        }
      } catch (err) {
        console.warn('Active recipient profile hydration notice:', err);
      }
    };

    fetchActiveProfile();
    return () => {
      isSubscribed = false;
    };
  }, [activeRecipientId, currentUserId]);

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
        const normalized = data.map((m: any) => ({
          ...m,
          senderId: m.sender_id || m.senderId,
          receiverId: m.receiver_id || m.receiverId,
          createdAt: m.created_at || m.createdAt,
          isRead: m.is_read ?? m.isRead ?? false,
        }));
        const filtered = normalized.filter((m) => isWithin7Days(m));
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
            const sender = String(m.senderId || m.sender_id || '').trim();
            const receiver = String(m.receiverId || m.receiver_id || '').trim();
            if (
              (sender === currentUserId && receiver === activeRecipientId) ||
              (sender === activeRecipientId && receiver === currentUserId)
            ) {
              setMessages((prev) => {
                if (prev.some((msg) => msg.id === m.id)) return prev;
                const normalized = {
                  ...m,
                  senderId: m.sender_id || m.senderId,
                  receiverId: m.receiver_id || m.receiverId,
                  createdAt: m.created_at || m.createdAt,
                  created_at: m.created_at || m.createdAt,
                  isRead: m.is_read ?? m.isRead ?? false,
                };
                return [...prev, normalized];
              });
              try {
                utils.messages.getConversationPreviews.invalidate();
                utils.profiles.getContacts.invalidate();
              } catch {}
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
      try { e.preventDefault(); } catch {}
    }

    const text = (message || newMessage || '').trim();
    if (!text || !activeRecipientId || !currentUserId || activeRecipientId === currentUserId || isSending) return;

    if (isArtistToArtist) {
      toast.error('Direct messaging between artists is disabled. Artists can only exchange messages with clients.');
      return;
    }

    // Instantly reset input fields so UI reflects immediately
    setMessage('');
    setNewMessage('');
    setIsSending(true);

    // Optimistically show the message immediately
    const tempId = `temp-${Date.now()}`;
    const tempMsg: ChatMessageItem = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: activeRecipientId,
      content: text,
      created_at: new Date().toISOString(),
      senderId: currentUserId,
      receiverId: activeRecipientId,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver_id: activeRecipientId, content: text }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const json = await res.json();

      if (!res.ok) {
        // Remove optimistic message on failure and restore text
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMessage(text);
        setNewMessage(text);
        const errMsg = json?.error || '';
        if (errMsg.includes('artist')) {
          toast.error('Direct messaging between artists is disabled.');
        } else if (errMsg.includes('yourself')) {
          toast.error('You cannot send a message to yourself.');
        } else {
          console.warn('[Messaging] Send error:', errMsg, json?.details);
          toast.error('Message could not be sent. Please try again.');
        }
      } else {
        // Immediately reset sending spinner upon successful API response
        setIsSending(false);

        // Replace temp message with real message from server
        const realMsg = json.message;
        if (realMsg) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...realMsg, sender_id: realMsg.sender_id, created_at: realMsg.created_at } : m))
          );
        }
        // Background re-fetch to sync
        setTimeout(() => fetchDirectMessages(false), 500);
        try {
          utils.messages.getConversationPreviews.invalidate();
          utils.profiles.getContacts.invalidate();
        } catch {}
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessage(text);
      setNewMessage(text);
      if (err?.name === 'AbortError') {
        toast.error('Sending timed out. Please check your network connection.');
      } else {
        console.warn('[Messaging] Network error:', err);
        toast.error('Message could not be sent. Please check your connection.');
      }
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
    <div className="h-[calc(100dvh-130px)] sm:h-[calc(100vh-180px)] flex flex-col gap-2.5 sm:gap-4 min-h-0 overflow-hidden w-full">
      {/* 7-Day Retention Notice Banner */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-center text-xs text-slate-400 flex items-center justify-center gap-2 flex-shrink-0 shadow-sm">
        <span>ℹ️</span>
        <span>Messages are automatically cleared after 7 days.</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 min-h-0 overflow-hidden w-full">
        {/* Contacts Sidebar */}
        <Card className={`bg-slate-900/80 border-slate-800 shadow-sm flex-col min-h-0 ${
          selectedUser ? 'hidden md:flex md:w-1/3 lg:w-80 xl:w-96' : 'flex w-full md:w-1/3 lg:w-80 xl:w-96'
        }`}>
          <CardHeader className="pb-3 border-b border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Conversations
              </CardTitle>
              {allContacts.length > 0 && (
                <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                  {allContacts.length}
                </span>
              )}
            </div>

            {/* Chat Code Search Input bar */}
            <form onSubmit={handleChatCodeSearchSubmit} className="relative w-full">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search Chat Code (e.g. CHAT-8A3F12)..."
                  value={chatCodeSearch}
                  onChange={(e) => setChatCodeSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleChatCodeSearchSubmit();
                    }
                  }}
                  className="w-full bg-slate-950/90 border-slate-800 text-xs pl-8 pr-16 h-8 rounded-lg placeholder:text-slate-500 text-slate-200 focus:border-amber-500/50 focus:ring-amber-500/20 font-mono"
                />
                <div className="absolute right-1 flex items-center gap-1">
                  {chatCodeSearch && (
                    <button
                      type="button"
                      onClick={() => setChatCodeSearch('')}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
                      title="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5 text-[10px] font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded cursor-pointer"
                  >
                    Search
                  </Button>
                </div>
              </div>
            </form>
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
              ) : filteredContacts && filteredContacts.length > 0 ? (
                <div className="space-y-1 p-3">
                  {filteredContacts.map((contact) => {
                    const preview = conversationPreviews?.[contact.id];
                    const unreadCount = preview?.unreadCount || 0;
                    const lastMessage = preview?.lastMessage;

                    const contactProfile = recipientProfilesMap[contact.id] || contact.profile;
                    const displayName = getRecipientDisplayName(contact, contactProfile);
                    const contactChatCode = getChatCode(currentUserId, contact.id);
                    const avatarUrl =
                      recipientProfilesMap[contact.id]?.avatar_url ||
                      getProfilePictureUrl(contact.id, contact.profile?.profilePicture) ||
                      undefined;

                    return (
                      <div
                        key={contact.id}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${
                          selectedUser?.id === contact.id
                            ? 'bg-primary/20 border border-primary/40 shadow-sm'
                            : 'bg-slate-950/60 hover:bg-slate-900/80 border border-slate-800/80'
                        }`}
                        onClick={() => handleSelectContact(contact)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <Avatar className="h-10 w-10 border-2 border-primary/50">
                              <AvatarImage
                                src={avatarUrl}
                                alt={displayName}
                              />
                              <AvatarFallback className="bg-primary/30 text-white font-bold">
                                {displayName.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            {unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                                {unreadCount > 9 ? '9+' : unreadCount}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1 gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="text-white font-semibold truncate text-xs sm:text-sm">
                                  {displayName}
                                </p>
                                <span className="font-mono text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1 py-0.5 rounded shrink-0">
                                  {contactChatCode}
                                </span>
                              </div>
                              {lastMessage && (
                                <span className="text-[10px] text-slate-500 shrink-0">
                                  {formatTimestamp(lastMessage.createdAt)}
                                </span>
                              )}
                            </div>
                            {lastMessage && (
                              <p className={`text-xs truncate ${unreadCount > 0 ? 'text-white font-medium' : 'text-slate-400'}`}>
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
              ) : chatCodeSearch.trim() ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <Search className="h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-white font-medium text-xs mb-1">No conversation found</p>
                  <p className="text-[11px] text-slate-400 mb-3">
                    No chat matches &quot;{chatCodeSearch}&quot;
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setChatCodeSearch('')}
                    className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Clear Search
                  </Button>
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
        <Card className={`bg-slate-900/80 border-slate-800 shadow-sm flex-col flex-1 min-h-0 min-w-0 ${
          selectedUser ? 'flex w-full md:flex-1' : 'hidden md:flex md:flex-1'
        }`}>
          {selectedUser ? (
            <>
              {/* Chat Header with prominent Chat Code & Copy button */}
              {(() => {
                const activeChatCode = getChatCode(currentUserId, selectedUser.id);
                const jobContext = formatJobContext(selectedUser, chatHistory);

                return (
                  <CardHeader className="border-b border-slate-800 flex-shrink-0 py-2.5 sm:py-4 px-3 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {/* Mobile Back to Conversation List Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(null)}
                          className="md:hidden h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
                          title="Back to conversations"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>

                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/50 shrink-0">
                          <AvatarImage
                            src={
                              activeRecipientProfile?.avatar_url ||
                              recipientProfilesMap[selectedUser.id]?.avatar_url ||
                              getProfilePictureUrl(selectedUser.id, selectedUser.profile?.profilePicture) ||
                              undefined
                            }
                            alt={getRecipientDisplayName(selectedUser, activeRecipientProfile)}
                          />
                          <AvatarFallback className="bg-primary/30 text-white font-bold text-base sm:text-lg">
                            {getRecipientDisplayName(selectedUser, activeRecipientProfile).charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-semibold text-base sm:text-lg truncate">
                              {getRecipientDisplayName(selectedUser, activeRecipientProfile)}
                            </h3>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleManualRefresh}
                              disabled={isRefreshing}
                              className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 text-xs rounded-md cursor-pointer"
                              title="Refresh conversation"
                            >
                              <RotateCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
                              <span className="hidden sm:inline">Refresh</span>
                            </Button>
                          </div>
                          {(activeRecipientProfile?.email || selectedUser.email) && (
                            <p className="text-xs text-slate-400 truncate">
                              {activeRecipientProfile?.email || selectedUser.email}
                            </p>
                          )}
                          {selectedUser.profile?.companyName && (
                            <p className="text-xs text-slate-400 truncate">
                              {selectedUser.profile.companyName}
                            </p>
                          )}
                          {jobContext && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                              {jobContext.contactName} from{' '}
                              <Link
                                href={jobContext.jobLink}
                                className="text-primary hover:text-primary/80 hover:underline transition-colors"
                              >
                                {jobContext.jobTitle}
                              </Link>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        {/* PROMINENT CHAT CODE WITH COPY BUTTON */}
                        <div className="flex items-center gap-2 bg-slate-950/90 border border-amber-500/35 rounded-xl px-3 py-1.5 shadow-sm">
                          <div className="flex flex-col text-left">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-amber-500/90 flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5 text-amber-500" />
                              Chat Code
                            </span>
                            <span className="font-mono font-black text-xs sm:text-sm text-amber-300 tracking-wider">
                              {activeChatCode}
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyChatCode(activeChatCode)}
                            className="h-7 px-2 text-xs text-amber-300 hover:text-white hover:bg-amber-500/20 rounded-lg flex items-center gap-1.5 transition-colors border border-amber-500/25 cursor-pointer"
                            title="Copy Chat Code"
                          >
                            {copiedChatCode === activeChatCode ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-bold text-[11px]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-amber-400" />
                                <span className="font-semibold text-[11px]">Copy Code</span>
                              </>
                            )}
                          </Button>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
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
                    </div>
                  </CardHeader>
                );
              })()}

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

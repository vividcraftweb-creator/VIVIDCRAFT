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
import { Send, MessageSquare, Clock, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import { parseISO, format, isToday, isYesterday, isThisWeek } from 'date-fns';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/router';

type ContactsOutput = inferRouterOutputs<AppRouter>['profiles']['getContacts'];
type ContactForChat = ContactsOutput[number];

type MessagesOutput = inferRouterOutputs<AppRouter>['messages']['getMessages'];
type MessageForChat = MessagesOutput[number];

const INTERVIEW_TEMPLATE = `Hi! I'm interested in your proposal and would like to schedule an interview to discuss the project in more detail.

Are you available for a brief video call this week? Please share your availability and preferred meeting platform (Zoom, Google Meet, etc.).

Looking forward to speaking with you!`;

export default function MessagesView() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const action = searchParams.get('action');
  const jobId = searchParams.get('jobId');
  const proposalId = searchParams.get('proposalId');

  const [selectedUser, setSelectedUser] = useState<ContactForChat | null>(null);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<MessageForChat[]>([]);
  const markedAsReadRef = useRef<Set<string>>(new Set());

  const getContactName = (contact: ContactForChat) => {
    if (contact.profile?.firstName && contact.profile?.lastName) {
      return `${contact.profile.firstName} ${contact.profile.lastName}`;
    }
    return contact.email || 'Unknown User';
  };

  const formatJobContext = (contact: ContactForChat, messages: MessageForChat[]) => {
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
    { receiverId: selectedUser?.id || '' },
    { enabled: !!selectedUser && !!session }
  );

  const canChatQuery = trpc.messages.canChat.useQuery(
    { partnerId: selectedUser?.id || '' },
    { enabled: !!selectedUser && !!session }
  );

  const canChat = canChatQuery.data ?? false;

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

  // Merge contacts with userById
  const allContacts = useMemo(() => {
    const contactsList = contacts || [];
    if (userById && !contactsList.some(c => c.id === userById.id)) {
      // Add userById to contacts if not already present
      return [{
        id: userById.id,
        email: userById.email,
        profile: userById.Profile ? (Array.isArray(userById.Profile) ? userById.Profile[0] : userById.Profile) : null,
      }, ...contactsList];
    }
    return contactsList;
  }, [contacts, userById]);

  // Auto-select user from URL parameter
  useEffect(() => {
    if (userId && allContacts.length > 0) {
      const user = allContacts.find(c => c.id === userId);
      if (user && (!selectedUser || selectedUser.id !== userId)) {
        setSelectedUser(user);
      }
    }
  }, [userId, allContacts, selectedUser]);

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

  useEffect(() => {
    if (messagesQuery.data) {
      setChatHistory(messagesQuery.data);

      // Mark messages as read when viewing conversation (only once per conversation)
      if (selectedUser &&
          !markedAsReadRef.current.has(selectedUser.id) &&
          messagesQuery.data.some(m => m.receiverId === session?.session?.user?.id && !m.isRead)) {
        markedAsReadRef.current.add(selectedUser.id);
        markAsReadMutation.mutate({ senderId: selectedUser.id });
      }
    }
  }, [messagesQuery.data, selectedUser, session, markAsReadMutation]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !message.trim()) return;

    await sendMessageMutation.mutateAsync({
      receiverId: selectedUser.id,
      content: message.trim(),
      jobId: jobId || undefined,
      proposalId: proposalId || undefined,
    });
  };

  const formatTimestamp = (dateString: string) => {
    const date = parseISO(dateString);

    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else if (isThisWeek(date)) {
      return format(date, 'EEE h:mm a');
    } else {
      return format(date, 'MMM d');
    }
  };

  return (
    <div className="h-[calc(100vh-200px)] flex gap-6">
      {/* Contacts Sidebar */}
      <Card className="w-1/3 glass-card bg-white/5 border-white/10 flex flex-col">
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
                  <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                        <div className="h-3 bg-white/10 rounded w-1/2" />
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
                          : 'bg-white/5 hover:bg-white/10 border border-white/10'
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
                  Start a conversation by sending a message to a freelancer from their profile
                </p>
                <Link href="/freelancers">
                  <Button className="bg-primary hover:bg-primary/90 text-white">
                    Browse Freelancers
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 glass-card bg-white/5 border-white/10 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <CardHeader className="border-b border-white/10 flex-shrink-0">
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
                    <h3 className="text-white font-semibold text-lg">
                      {getContactName(selectedUser)}
                    </h3>
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
                      className="text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
                    <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer">
                      Delete conversation
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer">
                      Block user
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer">
                      Report user
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-hidden p-0">
              <div className="h-full overflow-y-auto p-6">
                {chatHistory.length > 0 ? (
                  <div className="space-y-4">
                    {chatHistory.map((chat, index) => {
                      const isOwn = chat.senderId === session?.session?.user?.id;
                      return (
                        <div
                          key={index}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            <div
                              className={`p-3 rounded-lg ${
                                isOwn
                                  ? 'bg-primary text-white'
                                  : 'bg-white/10 text-slate-200 border border-white/10'
                              }`}
                            >
                              <p className="break-words">{chat.content}</p>
                            </div>
                            {chat.createdAt && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimestamp(chat.createdAt)}
                              </span>
                            )}
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
              </div>
            </CardContent>

            {/* Message Input */}
            <div className="border-t border-white/10 p-4 flex-shrink-0">
              {!canChat ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center text-sm text-red-300">
                  Chat disabled for this connection. Please contact the administrator.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={sendMessageMutation.isPending || !message.trim()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" />
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
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../redux/store';
import {
  setConversations,
  addConversation,
  setActiveConversationId,
  resetUnreadCount,
  updateGroupInfo,
  removeConversation,
} from '../redux/slices/chatSlice';
import {
  setMessages,
  prependMessages,
  updateMessage,
  removeMessage,
  updateReactions,
} from '../redux/slices/messageSlice';
import { setMultipleStatuses } from '../redux/slices/presenceSlice';
import { chatApi, usersApi, uploadsApi, tasksApi } from '../services/api';
import { getSocket } from '../services/socket';
import {
  Search,
  MessageSquare,
  Users,
  Plus,
  Paperclip,
  Smile,
  Trash2,
  Edit,
  CornerUpLeft,
  Info,
  X,
  UserPlus,
  UserMinus,
  Share2,
  FileText,
  Check,
  CheckCheck,
  ArrowLeft,
  LogOut,
  Image,
  Camera,
  ChevronDown,
  Copy,
  Pin,
  Star,
  CornerUpRight,
} from 'lucide-react';

import { EmojiPicker } from '../components/EmojiPicker';

const AttachmentRenderer: React.FC<{ att: any; dark?: boolean }> = ({ att, dark }) => {
  const [loadError, setLoadError] = useState(false);
  const fileUrl = uploadsApi.getFileUrl(att.filepath);
  const mimetype = att.mimetype || '';
  const filename = att.filename || '';

  const lowercaseFilename = filename.toLowerCase();
  const isImgExtension = lowercaseFilename.endsWith('.jpg') || 
                         lowercaseFilename.endsWith('.jpeg') || 
                         lowercaseFilename.endsWith('.png') || 
                         lowercaseFilename.endsWith('.gif') || 
                         lowercaseFilename.endsWith('.webp') || 
                         lowercaseFilename.endsWith('.bmp');
                         
  const isImg = (mimetype.startsWith('image/') || isImgExtension || (!mimetype && !filename.includes('.'))) && !loadError;
  const isVideo = mimetype.startsWith('video/') || lowercaseFilename.endsWith('.mp4') || lowercaseFilename.endsWith('.webm') || lowercaseFilename.endsWith('.mov');
  const isPdf = mimetype === 'application/pdf' || lowercaseFilename.endsWith('.pdf');

  const borderClass = dark ? 'border-slate-800' : 'border-slate-200';
  const bgClass = dark ? 'bg-slate-900/60' : 'bg-slate-50';
  const textClass = dark ? 'text-slate-200 hover:text-slate-100' : 'text-slate-700 hover:text-slate-800';
  const linkBgClass = dark ? 'bg-slate-900 hover:bg-slate-850/80 border-slate-850' : 'bg-slate-100 hover:bg-slate-150 border-slate-200/50';
  const downloadTextClass = dark ? 'text-indigo-400' : 'text-indigo-650';

  if (isImg) {
    return (
      <div className="w-full max-w-[400px]">
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className={`block max-h-60 rounded-xl overflow-hidden border shadow-sm hover:opacity-95 transition-opacity ${borderClass} ${bgClass}`}
        >
          <img
            src={fileUrl}
            alt={filename}
            onError={() => setLoadError(true)}
            className="w-full h-full object-contain max-h-60"
          />
        </a>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="w-full max-w-[400px]">
        <div className={`rounded-xl overflow-hidden border bg-black shadow-sm ${borderClass}`}>
          <video controls className="w-full max-h-85 object-contain" src={fileUrl} />
        </div>
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col gap-1.5 w-full">
          <iframe
            src={fileUrl}
            className={`w-full h-80 rounded-xl border ${borderClass} ${dark ? 'bg-slate-950' : 'bg-white'}`}
            title={filename}
          />
          <a
            href={fileUrl}
            download
            target="_blank"
            rel="noreferrer"
            className={`flex items-center justify-between gap-2.5 p-2 text-xs rounded-xl transition-colors border ${textClass} ${linkBgClass}`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <FileText size={14} className="text-red-500" />
              <span className="truncate font-semibold">{filename}</span>
            </div>
            <span className={`text-[10px] font-bold shrink-0 ${downloadTextClass}`}>Download</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      <a
        href={fileUrl}
        download
        target="_blank"
        rel="noreferrer"
        className={`flex items-center justify-between gap-2.5 p-2.5 text-xs rounded-xl transition-colors border w-full ${textClass} ${linkBgClass}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <FileText size={14} className={dark ? 'text-indigo-400' : 'text-indigo-500'} />
          <span className="truncate font-semibold">{filename}</span>
        </div>
        <span className={`text-[10px] font-bold shrink-0 ${downloadTextClass}`}>Download</span>
      </a>
    </div>
  );
};

export const Chat: React.FC = () => {
  const dispatch = useDispatch();
  const socket = getSocket();

  // Redux Selectors
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const conversations = useSelector((state: RootState) => state.chat.conversations);
  const activeConversationId = useSelector((state: RootState) => state.chat.activeConversationId);
  const messages = useSelector((state: RootState) => (activeConversationId ? state.message.messages[activeConversationId] || [] : []));
  const nextCursor = useSelector((state: RootState) => (activeConversationId ? state.message.nextCursors[activeConversationId] : null));
  const typingUsers = useSelector((state: RootState) => (activeConversationId ? state.message.typingUsers[activeConversationId] || [] : []));
  const presenceStatuses = useSelector((state: RootState) => state.presence.statuses);

  // Component States
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showShareTaskModal, setShowShareTaskModal] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Create Conversation / Group states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  
  // Task sharing states
  const [myTasks, setMyTasks] = useState<any[]>([]);
  
  // Message Edit & Reply states
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editInput, setEditInput] = useState('');
  const [replyingMessage, setReplyingMessage] = useState<any | null>(null);
  const [activeEmojiPickerMsgId, setActiveEmojiPickerMsgId] = useState<number | null>(null);
  const [showComposerEmojiPicker, setShowComposerEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  
  // Upload states
  const [uploadProgress, setUploadProgress] = useState(false);
  const [tempAttachments, setTempAttachments] = useState<any[]>([]);

  // Context Menu, Pinning, Starred, Forwarding states
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<number | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<any | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pinnedMessages') || '[]');
    } catch {
      return [];
    }
  });
  const [starredMessages, setStarredMessages] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('starredMessages') || '[]');
    } catch {
      return [];
    }
  });

  const [selectedMessageIds, setSelectedMessageIds] = useState<number[] | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  const confirmDeleteSelectedMessages = () => {
    if (!selectedMessageIds || selectedMessageIds.length === 0) return;
    setShowDeleteConfirmModal(true);
  };

  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startWebcam = async () => {
    setCapturedPhoto(null);
    setWebcamError(null);
    setShowWebcamModal(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setWebcamStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error('Error accessing webcam:', err);
      setWebcamError('Could not access camera. Please check permissions or select a file instead.');
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setShowWebcamModal(false);
    setCapturedPhoto(null);
    setWebcamError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedPhoto(dataUrl);
    }
  };

  const sendCapturedPhoto = async () => {
    if (!capturedPhoto) return;
    setUploadProgress(true);
    stopWebcam();
    
    try {
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const res = await uploadsApi.upload(file);
      setTempAttachments([
        ...tempAttachments,
        {
          filename: file.name,
          filepath: res.data.path || res.data.url,
          mimetype: file.type,
          size: file.size,
        }
      ]);
    } catch (err) {
      console.error('Failed to upload captured image:', err);
      setCustomAlert({ title: 'Upload Failed', message: 'Failed to upload captured image.' });
    } finally {
      setUploadProgress(false);
    }
  };

  const handleCameraFallback = () => {
    stopWebcam();
    cameraInputRef.current?.click();
  };

  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamStream]);

  const toggleMessageSelection = (msgId: number) => {
    setSelectedMessageIds((prev) => {
      if (!prev) return [msgId];
      if (prev.includes(msgId)) {
        const next = prev.filter((id) => id !== msgId);
        return next.length === 0 ? null : next;
      }
      return [...prev, msgId];
    });
  };

  const handleTogglePin = (msgId: number) => {
    setPinnedMessages(prev => {
      const next = prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId];
      localStorage.setItem('pinnedMessages', JSON.stringify(next));
      return next;
    });
  };

  const handleToggleStar = (msgId: number) => {
    setStarredMessages(prev => {
      const next = prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId];
      localStorage.setItem('starredMessages', JSON.stringify(next));
      return next;
    });
  };

  // Refs
  const messageEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const photoVideoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // 1. Initial Load: Fetch Conversations and Users list
  useEffect(() => {
    fetchConversations();
    fetchUsers();
    fetchMyTasks();
  }, []);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveEmojiPickerMsgId(null);
      setShowComposerEmojiPicker(false);
      setShowAttachmentMenu(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Prevent background scrolling when emoji pickers are active
  useEffect(() => {
    const preventScroll = (e: WheelEvent | TouchEvent) => {
      // Find the emoji picker element by its class name
      const picker = document.querySelector('.emoji-picker-container');
      if (picker && picker.contains(e.target as Node)) {
        return; // Allow scrolling inside the emoji picker itself
      }
      e.preventDefault();
    };

    const container = chatContainerRef.current;
    const isPickerOpen = activeEmojiPickerMsgId !== null || showComposerEmojiPicker;

    if (isPickerOpen && container) {
      container.addEventListener('wheel', preventScroll, { passive: false });
      container.addEventListener('touchmove', preventScroll, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', preventScroll);
        container.removeEventListener('touchmove', preventScroll);
      }
    };
  }, [activeEmojiPickerMsgId, showComposerEmojiPicker]);

  // 2. Fetch Conversations from backend REST endpoint
  const fetchConversations = async () => {
    try {
      const res = await chatApi.listConversations();
      dispatch(setConversations(res.data));

      // Extract user IDs to query presence
      const userIds: number[] = [];
      res.data.forEach((conv: any) => {
        conv.members.forEach((m: any) => {
          if (m.userId !== currentUser?.id) userIds.push(m.userId);
        });
      });

      if (userIds.length > 0 && socket) {
        // Fetch or listen to statuses
        // We will just let the live WS connection maintain presence,
        // but can pre-populate if backend allows.
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await usersApi.listEmployees();
      setUsersList(res.data || []);
      
      // Seed presence status of all users to offline initially
      const statuses: any = {};
      res.data.forEach((u: any) => {
        statuses[u.id] = { isOnline: false, lastSeen: new Date(0).toISOString() };
      });
      dispatch(setMultipleStatuses(statuses));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchMyTasks = async () => {
    try {
      const res = await tasksApi.list();
      setMyTasks(res.data?.tasks || res.data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  // 3. Select active conversation: join WS room, fetch messages
  const handleSelectConversation = async (conversationId: number) => {
    // If typing, stop typing
    stopTypingImmediate();

    // Leave old WS room if any
    if (activeConversationId && socket) {
      socket.emit('leave_room', { conversationId: activeConversationId });
    }

    dispatch(setActiveConversationId(conversationId));
    dispatch(resetUnreadCount(conversationId));
    setReplyingMessage(null);
    setEditingMessageId(null);
    setTempAttachments([]);

    // Join new WS room
    if (socket) {
      socket.emit('join_room', { conversationId });
      socket.emit('message_read', { conversationId });
    }

    // Fetch message history
    setLoadingMessages(true);
    try {
      const res = await chatApi.getMessages(conversationId, { limit: 40 });
      dispatch(setMessages({
        conversationId,
        messages: res.data.messages,
        nextCursor: res.data.nextCursor,
      }));
      
      // Mark read receipt on backend REST
      await chatApi.markAsRead(conversationId);
    } catch (err) {
      console.error('Failed to load message history:', err);
    } finally {
      setLoadingMessages(false);
      scrollToBottom();
    }
  };

  // 4. Scroll anchoring
  const scrollToBottom = () => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, activeConversationId]);

  // 5. Paginate older messages on scroll top
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && nextCursor && !loadingMessages && activeConversationId) {
      setLoadingMessages(true);
      const beforeScrollHeight = target.scrollHeight;

      try {
        const res = await chatApi.getMessages(activeConversationId, {
          limit: 30,
          cursor: nextCursor,
        });

        dispatch(prependMessages({
          conversationId: activeConversationId,
          messages: res.data.messages,
          nextCursor: res.data.nextCursor,
        }));

        // Keep scroll position relative
        setTimeout(() => {
          target.scrollTop = target.scrollHeight - beforeScrollHeight;
        }, 50);
      } catch (err) {
        console.error('Failed to load more messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    }
  };

  // 6. Typing states
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (!socket || !activeConversationId) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing_start', { conversationId: activeConversationId });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTypingImmediate();
    }, 2000);
  };

  const stopTypingImmediate = () => {
    if (isTyping && socket && activeConversationId) {
      socket.emit('typing_stop', { conversationId: activeConversationId });
      setIsTyping(false);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  // 7. Send Message (both REST and Socket-IO support)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && tempAttachments.length === 0) || !activeConversationId || !socket) return;

    stopTypingImmediate();

    const messagePayload = {
      content: messageInput.trim(),
      replyToId: replyingMessage?.id,
      attachments: tempAttachments,
    };

    // Emit live via socket
    socket.emit('send_message', {
      conversationId: activeConversationId,
      message: messagePayload,
    });

    setMessageInput('');
    setReplyingMessage(null);
    setTempAttachments([]);
  };

  // 8. File Attachments upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadProgress(true);
    try {
      const file = files[0];
      const res = await uploadsApi.upload(file);
      
      setTempAttachments([
        ...tempAttachments,
        {
          filename: file.name,
          filepath: res.data.path || res.data.url, // S3 returns url, local returns path
          mimetype: file.type,
          size: file.size,
        }
      ]);
    } catch (err) {
      console.error('Attachment upload failed:', err);
      setCustomAlert({ title: 'Upload Failed', message: 'Failed to upload file.' });
    } finally {
      setUploadProgress(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (documentInputRef.current) documentInputRef.current.value = '';
      if (photoVideoInputRef.current) photoVideoInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // 9. Message Actions: Edit, Delete, React
  const handleToggleReaction = async (messageId: number, emoji: string) => {
    try {
      const res = await chatApi.toggleReaction(messageId, emoji);
      
      // Update local Redux state
      const updatedReactions = messages.find(m => m.id === messageId)?.reactions || [];
      let nextReactions = [...updatedReactions];

      if (res.data.action === 'added') {
        nextReactions.push({
          messageId,
          userId: currentUser?.id,
          emoji,
          user: { id: currentUser?.id, name: currentUser?.name }
        });
      } else {
        nextReactions = nextReactions.filter(r => !(r.userId === currentUser?.id && r.emoji === emoji));
      }

      dispatch(updateReactions({ conversationId: activeConversationId!, messageId, reactions: nextReactions }));
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  const handleStartEdit = (message: any) => {
    setEditingMessageId(message.id);
    setEditInput(message.content);
  };

  const handleSaveEdit = async (messageId: number) => {
    if (!editInput.trim() || !activeConversationId) return;
    try {
      await chatApi.editMessage(messageId, editInput.trim());
      dispatch(updateMessage({
        conversationId: activeConversationId,
        messageId,
        updates: { content: editInput.trim(), isEdited: true },
      }));
      setEditingMessageId(null);
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };


  const handleDeleteSelectedMessages = async () => {
    setShowDeleteConfirmModal(false);
    if (!selectedMessageIds || selectedMessageIds.length === 0) return;
    
    try {
      for (const id of selectedMessageIds) {
        const msg = messages.find(m => m.id === id);
        const isAlreadyDeleted = msg?.isDeleted;
        
        const res = await chatApi.deleteMessage(id);
        const data = res?.data;
        
        if (isAlreadyDeleted || (data && data.isHardDeleted)) {
          dispatch(removeMessage({
            conversationId: activeConversationId!,
            messageId: id,
          }));
        } else {
          dispatch(updateMessage({
            conversationId: activeConversationId!,
            messageId: id,
            updates: { content: 'Message deleted', isDeleted: true },
          }));
        }
      }
      setSelectedMessageIds(null);
    } catch (err) {
      console.error('Failed to delete selected messages:', err);
    }
  };

  // 10. Direct and Group Conversions creation
  const handleStartDirectChat = async (otherUserId: number) => {
    try {
      const res = await chatApi.createConversation({
        type: 'DIRECT',
        userIds: [otherUserId],
      });
      dispatch(addConversation(res.data));
      handleSelectConversation(res.data.id);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to create direct chat:', err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedUsers.length === 0) {
      setCustomAlert({ title: 'Group Creation', message: 'Please provide a group name and select at least one member.' });
      return;
    }
    try {
      const res = await chatApi.createConversation({
        type: 'GROUP',
        userIds: selectedUsers,
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
      });
      dispatch(addConversation(res.data));
      handleSelectConversation(res.data.id);
      
      // Reset group form
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedUsers([]);
      setShowCreateGroupModal(false);
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  // 11. Task Sharing in Message
  const handleShareTask = async (taskId: number) => {
    if (!activeConversationId || !socket) return;
    try {
      // Find selected task details
      const selectedTask = myTasks.find(t => t.id === taskId);
      if (!selectedTask) return;

      const messagePayload = {
        content: `Shared a task: ${selectedTask.project?.name || selectedTask.taskDescription || 'Task details'}`,
        sharedTaskId: taskId,
      };

      socket.emit('send_message', {
        conversationId: activeConversationId,
        message: messagePayload,
      });

      setShowShareTaskModal(false);
    } catch (err) {
      console.error('Failed to share task:', err);
    }
  };

  // 12. Group Membership Admin Actions
  const handleAddGroupMember = async (userIdToAdd: number) => {
    if (!activeConversationId) return;
    try {
      const res = await chatApi.addMembers(activeConversationId, { userIds: [userIdToAdd] });
      dispatch(updateGroupInfo({ id: activeConversationId, ...res.data }));
      fetchConversations(); // refresh
    } catch (err) {
      console.error('Failed to add member:', err);
      setCustomAlert({ title: 'Add Member Failed', message: 'Failed to add member.' });
    }
  };

  const handleRemoveGroupMember = async (userIdToRemove: number) => {
    if (!activeConversationId) return;
    try {
      await chatApi.removeMember(activeConversationId, userIdToRemove);
      if (userIdToRemove === currentUser?.id) {
        // Left group
        dispatch(removeConversation(activeConversationId));
      } else {
        fetchConversations(); // refresh
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
      setCustomAlert({ title: 'Remove Member Failed', message: 'Failed to remove member.' });
    }
  };

  // 13. UI Helpers
  const getChatPartnerName = (conv: any) => {
    if (conv.type === 'GROUP') return conv.name || 'Group Chat';
    const otherMember = conv.members.find((m: any) => m.userId !== currentUser?.id);
    return otherMember?.user?.name || 'Deleted User';
  };

  const getChatPartnerAvatar = (conv: any) => {
    if (conv.type === 'GROUP') return null;
    const otherMember = conv.members.find((m: any) => m.userId !== currentUser?.id);
    return otherMember?.user?.name?.substring(0, 2).toUpperCase() || 'DU';
  };

  const isUserOnline = (userId: number) => {
    return presenceStatuses[userId]?.isOnline || false;
  };

  // Filter contacts/chats
  const filteredConversations = conversations.filter(c => 
    getChatPartnerName(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = usersList.filter(u => 
    u.id !== currentUser?.id && u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-120px)] flex bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl relative">
      {/* LEFT PANEL: Chat List & Search */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200/80 flex flex-col bg-slate-50 h-full ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        {/* Search header */}
        <div className="p-4 border-b border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 font-heading">Messages</h2>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="p-2 bg-indigo-50 hover:bg-indigo-105 text-indigo-600 border border-indigo-100 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus size={14} /> New Group
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search chats or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>

        {/* Conversation / Contacts list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {searchQuery && filteredConversations.length === 0 && (
            <div className="p-3 text-xs font-bold text-indigo-600 uppercase tracking-wider">Start New Chat</div>
          )}
          
          {searchQuery && filteredContacts.map(contact => (
            <div
              key={contact.id}
              onClick={() => handleStartDirectChat(contact.id)}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-100 cursor-pointer border border-transparent hover:border-slate-200/50 transition-all duration-200 group"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md">
                {contact.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-700 text-sm group-hover:text-slate-900 transition-colors">{contact.name}</div>
                <div className="text-xs text-slate-500 truncate">{contact.jobRole || 'Employee'}</div>
              </div>
            </div>
          ))}

          {(!searchQuery || filteredConversations.length > 0) && (
            <div className="p-2 text-xs font-extrabold text-slate-400 uppercase tracking-wider">Recent Conversations</div>
          )}

          {filteredConversations.map((conv) => {
            const isSelected = conv.id === activeConversationId;
            const partnerName = getChatPartnerName(conv);
            const partnerAvatar = getChatPartnerAvatar(conv);
            const isOnline = conv.type === 'DIRECT' && isUserOnline(conv.members.find(m => m.userId !== currentUser?.id)?.userId || 0);

            return (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer border transition-all duration-200 group relative ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100/50 shadow-sm'
                    : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:border-slate-200/50'
                }`}
              >
                {/* Avatar with Presence ring */}
                <div className="relative shrink-0">
                  {conv.type === 'GROUP' ? (
                    <div className="h-11 w-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-indigo-600 shadow-inner">
                      <Users size={20} />
                    </div>
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-indigo-50/50 border border-indigo-100/80 flex items-center justify-center font-extrabold text-indigo-600 shadow-sm">
                      {partnerAvatar}
                    </div>
                  )}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-indigo-950' : 'text-slate-800 group-hover:text-slate-950'}`}>
                      {partnerName}
                    </h4>
                    {conv.lastMessage && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate font-medium">
                    {conv.lastMessage ? (
                      <>
                        <span className="text-slate-400 font-semibold">{conv.lastMessage.sender?.name === currentUser?.name ? 'You: ' : ''}</span>
                        {conv.lastMessage.content}
                      </>
                    ) : (
                      'No messages yet'
                    )}
                  </p>
                </div>

                {conv.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold text-white bg-indigo-600 rounded-full shrink-0 shadow-md shadow-indigo-600/15">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER PANEL: Chat Window */}
      <div className={`flex-1 flex flex-col h-full bg-white ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        {activeConversationId && activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/85 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => dispatch(setActiveConversationId(null))}
                  className="md:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 className="font-bold text-slate-800 text-base font-heading flex items-center gap-2">
                    {getChatPartnerName(activeConversation)}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {activeConversation.type === 'GROUP' 
                      ? `${activeConversation.members.length} members` 
                      : isUserOnline(activeConversation.members.find(m => m.userId !== currentUser?.id)?.userId || 0)
                        ? 'Online'
                        : 'Offline'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowShareTaskModal(true)}
                  className="p-2 text-slate-500 hover:text-indigo-650 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  title="Share Task"
                >
                  <Share2 size={18} />
                </button>
                <button
                  onClick={() => setShowRightSidebar(!showRightSidebar)}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${showRightSidebar ? 'text-indigo-600 bg-indigo-50 border border-indigo-100/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'}`}
                  title="Group Info"
                >
                  <Info size={18} />
                </button>
              </div>
            </div>

            {/* Message Thread (Infinite Scroll) */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 scrollbar-thin bg-slate-50/50"
            >
              {loadingMessages && (
                <div className="flex justify-center p-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              )}

              {messages.map((msg, index) => {
                const isMe = msg.senderId === currentUser?.id;
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
                const showSenderName = !isMe && activeConversation.type === 'GROUP' && !isSameSender;
                
                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      if (selectedMessageIds !== null) {
                        toggleMessageSelection(msg.id);
                      }
                    }}
                    className={`flex items-start gap-4 group relative w-full ${
                      index === 0 ? 'mt-0' : (isSameSender ? 'mt-1.5' : 'mt-3.5')
                    }`}
                    style={{ cursor: selectedMessageIds !== null ? 'pointer' : 'default' }}
                  >
                    {selectedMessageIds !== null && (
                      <div className="flex items-center justify-center pt-3 pl-1 shrink-0 select-none">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMessageSelection(msg.id);
                          }}
                          className={`w-5.5 h-5.5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                            selectedMessageIds.includes(msg.id)
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white text-transparent hover:border-slate-400 shadow-sm'
                          }`}
                        >
                          <Check size={11} strokeWidth={4} />
                        </button>
                      </div>
                    )}

                    <div className={`flex-1 flex ${isMe ? 'justify-end' : 'justify-start'} items-center gap-2.5`}>
                      {isMe && !msg.isDeleted && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEmojiPickerMsgId(msg.id);
                          }}
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-indigo-650 rounded-full border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0 hover:scale-105 active:scale-95 duration-150 flex items-center justify-center"
                          title="React with emoji"
                        >
                          <Smile size={14} />
                        </button>
                      )}

                      <div className="max-w-[70%] flex flex-col gap-1 relative">
                        {/* Sender name in Group Chat */}
                        {showSenderName && (
                          <span className="text-[10px] font-extrabold text-indigo-600 px-1">{msg.sender?.name}</span>
                        )}

                        {/* Bubble */}
                        <div
                          className={`border leading-relaxed shadow-sm relative ${
                            msg.isDeleted
                              ? 'p-3 rounded-2xl text-xs bg-slate-400 text-slate-50 border-slate-300 italic font-medium ' + (isMe ? 'rounded-tr-none' : 'rounded-tl-none')
                              : 'p-3.5 rounded-2xl text-sm bg-slate-950 text-slate-100 border-slate-900 ' + (isMe ? 'rounded-tr-none' : 'rounded-tl-none')
                          }`}
                        >
                        {msg.isDeleted ? (
                          <div className="relative pr-8">
                            <p className="whitespace-pre-wrap">Message deleted</p>
                            
                            {/* Dropdown Menu Trigger Chevron for deleted bubble */}
                            {(isMe || activeConversation?.members?.find(m => m.userId === currentUser?.id)?.role === 'ADMIN') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuMsgId(prev => prev === msg.id ? null : msg.id);
                                }}
                                className={`absolute -top-1 -right-1.5 p-0.5 bg-slate-500 hover:bg-slate-600 text-slate-100 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer w-4.5 h-4.5 flex items-center justify-center`}
                                title="Message Options"
                              >
                                <ChevronDown size={10} />
                              </button>
                            )}

                            {/* Dropdown Menu Portal Overlay & List inside deleted bubble */}
                            {activeMenuMsgId === msg.id && (isMe || activeConversation?.members?.find(m => m.userId === currentUser?.id)?.role === 'ADMIN') && (
                              <>
                                <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveMenuMsgId(null); }} />
                                <div
                                  className={`absolute ${
                                    isMe ? 'right-full mr-6' : 'left-full ml-6'
                                  } -top-1.5 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 w-[150px] text-slate-700 not-italic font-sans font-normal animate-in fade-in zoom-in-95 duration-100`}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMessageIds([msg.id]);
                                      setActiveMenuMsgId(null);
                                    }}
                                    className="w-full px-3.5 py-1.5 hover:bg-rose-50 text-left text-xs font-bold text-rose-650 flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Nested Reply Preview Card inside Bubble */}
                            {msg.replyTo && (
                              <div className="text-xs px-3 py-2 rounded-lg mb-2 leading-snug border-l-2 w-full bg-slate-900/60 text-slate-350 border-indigo-500 pr-8">
                                <span className="font-bold block mb-0.5 text-[11px] text-indigo-400">
                                  Replying to {msg.replyTo.sender?.name || 'Someone'}
                                </span>
                                <span className="line-clamp-2 text-slate-400">{msg.replyTo.content}</span>
                              </div>
                            )}
                            {/* Task sharing card */}
                            {msg.sharedTask && (
                              <div className="mb-2 p-3 border rounded-xl flex flex-col gap-2 shadow-sm bg-slate-900/60 border-slate-850 pr-8">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                                  <FileText size={14} /> Shared Task
                                </div>
                                <h4 className="font-bold text-xs truncate text-slate-200">{msg.sharedTask.taskDescription || 'Task Project'}</h4>
                                <div className="text-[10px] text-slate-450 flex items-center justify-between">
                                  <span className="text-slate-400">Assigned: {msg.sharedTask.assignedTo?.name || 'Unassigned'}</span>
                                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                                    msg.sharedTask.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                  }`}>{msg.sharedTask.status}</span>
                                </div>
                              </div>
                            )}

                            {editingMessageId === msg.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editInput}
                                  onChange={(e) => setEditInput(e.target.value)}
                                  className="w-full border rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-slate-900 border-slate-800 text-slate-100"
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingMessageId(null)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-655 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(msg.id)}
                                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-505 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-end justify-between gap-4 flex-wrap relative pr-8">
                                <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                                <div className="flex items-center gap-1 text-[9px] shrink-0 self-end ml-auto select-none mt-1 text-slate-400/80">
                                  {pinnedMessages.includes(msg.id) && <Pin size={9} className="text-indigo-400 rotate-45 mr-0.5" />}
                                  {starredMessages.includes(msg.id) && <Star size={9} className="fill-amber-400 text-amber-400 mr-0.5" />}
                                  {msg.isEdited && <span>(edited)</span>}
                                  <span>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isMe && (
                                    <span>
                                      {msg.reads && msg.reads.length > 0 ? (
                                        <CheckCheck size={11} className="text-indigo-400" />
                                      ) : (
                                        <Check size={11} className="text-slate-500" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* File attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2.5 border-t pt-2 space-y-2.5 w-full border-slate-800/80">
                                {msg.attachments.map((att: any) => (
                                  <AttachmentRenderer key={att.id} att={att} dark={true} />
                                ))}
                              </div>
                            )}

                            {/* Dropdown Menu Trigger Chevron inside bubble */}
                            {!msg.isDeleted && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuMsgId(prev => prev === msg.id ? null : msg.id);
                                }}
                                className={`absolute top-2 right-2 p-1 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer w-6 h-6 flex items-center justify-center`}
                                title="Message Options"
                              >
                                <ChevronDown size={13} />
                              </button>
                            )}

                            {/* Dropdown Menu Portal Overlay & List inside bubble */}
                            {activeMenuMsgId === msg.id && (
                              <>
                                <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveMenuMsgId(null); }} />
                                <div
                                  className={`absolute ${
                                    isMe ? 'right-full mr-6' : 'left-full ml-6'
                                  } top-2 z-30 bg-white border border-slate-200/80 rounded-2xl shadow-xl py-1.5 w-[150px] text-slate-700 animate-in fade-in zoom-in-95 duration-100`}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReplyingMessage(msg);
                                      setActiveMenuMsgId(null);
                                    }}
                                    className="w-full px-3.5 py-1.5 hover:bg-slate-50 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700"
                                  >
                                    <CornerUpLeft size={13} className="text-slate-500" />
                                    <span>Reply</span>
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(msg.content);
                                      setActiveMenuMsgId(null);
                                    }}
                                    className="w-full px-3.5 py-1.5 hover:bg-slate-50 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700"
                                  >
                                    <Copy size={13} className="text-slate-500" />
                                    <span>Copy</span>
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveEmojiPickerMsgId(msg.id);
                                      setActiveMenuMsgId(null);
                                    }}
                                    className="w-full px-3.5 py-1.5 hover:bg-slate-50 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700"
                                  >
                                    <Smile size={13} className="text-slate-500" />
                                    <span>React</span>
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setForwardingMsg(msg);
                                      setActiveMenuMsgId(null);
                                    }}
                                    className="w-full px-3.5 py-1.5 hover:bg-slate-50 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700"
                                  >
                                    <CornerUpRight size={13} className="text-slate-500" />
                                    <span>Forward</span>
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTogglePin(msg.id);
                                      setActiveMenuMsgId(null);
                                    }}
                                    className="w-full px-3.5 py-1.5 hover:bg-slate-50 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700"
                                  >
                                    <Pin size={13} className="text-slate-500" />
                                    <span>{pinnedMessages.includes(msg.id) ? 'Unpin' : 'Pin'}</span>
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleStar(msg.id);
                                      setActiveMenuMsgId(null);
                                    }}
                                    className="w-full px-3.5 py-1.5 hover:bg-slate-50 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700"
                                  >
                                    <Star size={13} className={starredMessages.includes(msg.id) ? "fill-amber-400 text-amber-400" : "text-slate-500"} />
                                    <span>{starredMessages.includes(msg.id) ? 'Unstar' : 'Star'}</span>
                                  </button>

                                  <div className="my-1 border-t border-slate-100" />

                                  {isMe && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEdit(msg);
                                          setActiveMenuMsgId(null);
                                        }}
                                        className="w-full px-3.5 py-1.5 hover:bg-slate-50 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700"
                                      >
                                        <Edit size={13} className="text-slate-500" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedMessageIds([msg.id]);
                                          setActiveMenuMsgId(null);
                                        }}
                                        className="w-full px-3.5 py-1.5 hover:bg-rose-50 text-left text-xs font-bold text-rose-655 flex items-center gap-2.5 transition-colors cursor-pointer"
                                      >
                                        <Trash2 size={13} />
                                        <span>Delete</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}

                            {/* Floating Emoji Picker Portal Overlay inside bubble */}
                            {activeEmojiPickerMsgId === msg.id && (
                              <>
                                <div className="fixed inset-0 z-20 cursor-default" onClick={(e) => { e.stopPropagation(); setActiveEmojiPickerMsgId(null); }} />
                                <div className={`absolute ${
                                  isMe ? 'right-full mr-6' : 'left-full ml-6'
                                } top-2 z-30`}>
                                  <EmojiPicker
                                    onSelectEmoji={(emoji) => {
                                      handleToggleReaction(msg.id, emoji);
                                      setActiveEmojiPickerMsgId(null);
                                    }}
                                    onClose={() => setActiveEmojiPickerMsgId(null)}
                                  />
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {/* Reactions display */}
                      {msg.reactions && msg.reactions.length > 0 && !msg.isDeleted && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap px-1">
                          {msg.reactions.map((react: any) => (
                            <span
                              key={react.id || react.emoji}
                              onClick={() => handleToggleReaction(msg.id, react.emoji)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-50 border border-slate-200 text-slate-655 hover:bg-slate-100 cursor-pointer shadow-sm transition-colors"
                              title={react.user?.name}
                            >
                              {react.emoji}
                            </span>
                          ))}
                        </div>
                      )}


                      </div>

                      {!isMe && !msg.isDeleted && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEmojiPickerMsgId(msg.id);
                          }}
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-indigo-650 rounded-full border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0 hover:scale-105 active:scale-95 duration-150 flex items-center justify-center"
                          title="React with emoji"
                        >
                          <Smile size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={messageEndRef} />
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-1.5 text-xs text-slate-500 font-medium italic bg-slate-50 border-t border-slate-150 animate-pulse">
                {typingUsers.map((uid) => activeConversation.members.find((m) => m.userId === uid)?.user?.name || 'Someone').join(', ')} is typing...
              </div>
            )}

            {/* Reply Bar */}
            {replyingMessage && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-555 animate-in slide-in-from-bottom duration-200">
                <div className="flex-1 truncate">
                  Replying to <span className="font-bold text-indigo-600">{replyingMessage.sender?.name}</span>:{' '}
                  <span className="italic">{replyingMessage.content}</span>
                </div>
                <button
                  onClick={() => setReplyingMessage(null)}
                  className="p-1 text-slate-500 hover:text-slate-850 bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Attached files preview */}
            {tempAttachments.length > 0 && (
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2 animate-in slide-in-from-bottom duration-200">
                {tempAttachments.map((att, index) => {
                  const isImg = att.mimetype?.startsWith('image/');
                  const fileUrl = uploadsApi.getFileUrl(att.filepath);
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 pl-2 pr-1.5 py-1 bg-white border border-slate-200 rounded-xl shadow-sm max-w-[200px]"
                    >
                      {isImg ? (
                        <div className="h-6 w-6 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          <img src={fileUrl} alt={att.filename} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <Paperclip size={12} className="text-slate-400 shrink-0" />
                      )}
                      <span className="text-[10px] text-slate-655 truncate font-bold flex-1">
                        {att.filename}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTempAttachments(tempAttachments.filter((_, i) => i !== index));
                        }}
                        className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selection Action Bar or Input Bar */}
            {selectedMessageIds !== null ? (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white animate-in slide-in-from-bottom duration-200 select-none">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedMessageIds(null)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                    title="Cancel selection"
                  >
                    <X size={20} />
                  </button>
                  <span className="text-sm font-bold text-slate-700">
                    {selectedMessageIds.length} selected
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={confirmDeleteSelectedMessages}
                  className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-650 hover:text-rose-700 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm border border-rose-100"
                  title="Delete selected"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 flex items-center gap-3 bg-slate-50/70">
                {/* Hidden file inputs for specific types */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={documentInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={photoVideoInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />

                <div className="relative">
                  <button
                    type="button"
                    disabled={uploadProgress}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAttachmentMenu(prev => !prev);
                    }}
                    className={`p-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-indigo-650 rounded-2xl transition-all cursor-pointer relative shadow-sm ${
                      showAttachmentMenu ? 'bg-slate-50 text-indigo-650 border-indigo-200' : ''
                    }`}
                  >
                    {uploadProgress ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                    ) : (
                      <Paperclip size={18} />
                    )}
                  </button>

                  {showAttachmentMenu && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 bottom-full mb-3.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 w-[190px] py-1.5 flex flex-col font-medium text-slate-700"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          documentInputRef.current?.click();
                          setShowAttachmentMenu(false);
                        }}
                        className="flex items-center gap-3 px-3.5 py-2 hover:bg-purple-50 text-left text-xs transition-colors cursor-pointer w-full text-slate-800"
                      >
                        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-650 shrink-0">
                          <FileText size={16} />
                        </div>
                        <span className="font-semibold text-slate-700">Document</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          photoVideoInputRef.current?.click();
                          setShowAttachmentMenu(false);
                        }}
                        className="flex items-center gap-3 px-3.5 py-2 hover:bg-blue-50 text-left text-xs transition-colors cursor-pointer w-full text-slate-800"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                          <Image size={16} />
                        </div>
                        <span className="font-semibold text-slate-700">Photos & videos</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          startWebcam();
                          setShowAttachmentMenu(false);
                        }}
                        className="flex items-center gap-3 px-3.5 py-2 hover:bg-pink-55/10 hover:bg-pink-50 text-left text-xs transition-colors cursor-pointer w-full text-slate-800"
                      >
                        <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500 shrink-0">
                          <Camera size={16} />
                        </div>
                        <span className="font-semibold text-slate-700">Camera</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all pr-10 shadow-sm"
                  />
                  <button
                    type="button"
                    className={`absolute right-3 text-slate-400 hover:text-slate-655 cursor-pointer transition-colors ${
                      showComposerEmojiPicker ? 'text-indigo-650' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowComposerEmojiPicker(prev => !prev);
                    }}
                  >
                    <Smile size={18} />
                  </button>

                  {showComposerEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-3.5 z-20">
                      <EmojiPicker
                        startFull={true}
                        onSelectEmoji={(emoji) => setMessageInput(prev => prev + emoji)}
                        onClose={() => setShowComposerEmojiPicker(false)}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all cursor-pointer shadow-lg shadow-indigo-600/10 flex items-center justify-center shrink-0"
                >
                  <CornerUpLeft size={18} className="rotate-180" />
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-4 bg-slate-50/20">
            <div className="h-16 w-16 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-600/5">
              <MessageSquare size={32} />
            </div>
            <h3 className="font-heading text-lg font-bold text-slate-800">Your Chat Workspace</h3>
            <p className="text-sm text-slate-550 max-w-sm text-center leading-relaxed font-medium">
              Select an employee or group from the list, or create a group to start collaborating in real-time.
            </p>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: Group Info & Media Gallery */}
      {showRightSidebar && activeConversationId && activeConversation && (
        <div className="w-80 border-l border-slate-200 flex flex-col bg-slate-50 h-full overflow-y-auto animate-in slide-in-from-right duration-350">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
            <h3 className="font-bold text-slate-800 text-sm font-heading">Conversation Details</h3>
            <button
              onClick={() => setShowRightSidebar(false)}
              className="p-1.5 text-slate-500 hover:text-slate-850 bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 flex flex-col items-center border-b border-slate-200 text-center gap-3 bg-white">
            {activeConversation.type === 'GROUP' ? (
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 shadow-md">
                <Users size={32} />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-150 flex items-center justify-center font-extrabold text-indigo-600 text-lg shadow-md">
                {getChatPartnerAvatar(activeConversation)}
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-800 text-base leading-snug">{getChatPartnerName(activeConversation)}</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">{activeConversation.description || 'No description provided.'}</p>
            </div>
          </div>

          {/* Members List (Group details) */}
          {activeConversation.type === 'GROUP' && (
            <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Group Members</span>
                <button
                  onClick={() => setShowManageMembersModal(true)}
                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-lg transition-colors cursor-pointer"
                  title="Manage Members"
                >
                  <UserPlus size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {activeConversation.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-sm py-1">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-650 text-xs shadow-inner">
                        {member.user?.name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-700 text-xs leading-none">{member.user?.name}</div>
                        <span className="text-[9px] text-slate-500 leading-none">{member.role}</span>
                      </div>
                    </div>
                    {/* Allow system admin or group admin to remove user */}
                    {activeConversation.members.find(m => m.userId === currentUser?.id)?.role === 'ADMIN' && member.userId !== currentUser?.id && (
                      <button
                        onClick={() => handleRemoveGroupMember(member.userId)}
                        className="text-slate-500 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <UserMinus size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media / Files Gallery */}
          <div className="p-4 space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Shared Assets</span>
            <div className="grid grid-cols-3 gap-2">
              {messages
                .flatMap((m) => m.attachments || [])
                .filter((att) => att.mimetype?.startsWith('image/'))
                .slice(0, 6)
                .map((att) => {
                  const url = uploadsApi.getFileUrl(att.filepath);
                  return (
                    <a key={att.id} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex">
                      <img src={url} alt={att.filename} className="w-full h-full object-cover" />
                    </a>
                  );
                })}
            </div>

            <div className="space-y-2 pt-2">
              {messages
                .flatMap((m) => m.attachments || [])
                .filter((att) => !att.mimetype?.startsWith('image/'))
                .slice(0, 3)
                .map((att) => {
                  const url = uploadsApi.getFileUrl(att.filepath);
                  return (
                    <a
                      key={att.id}
                      href={url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs text-slate-700 transition-colors shadow-sm"
                    >
                      <Paperclip size={12} className="text-slate-500" />
                      <span className="truncate flex-1 font-semibold">{att.filename}</span>
                    </a>
                  );
                })}
            </div>
          </div>

          {/* Group management self actions */}
          {activeConversation.type === 'GROUP' && (
            <div className="p-4 border-t border-slate-200 mt-auto bg-white">
              <button
                onClick={() => handleRemoveGroupMember(currentUser?.id || 0)}
                className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <LogOut size={14} /> Leave Group
              </button>
            </div>
          )}
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Create Group Chat</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Group Name</label>
                <input
                  type="text"
                  placeholder="Enter group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Description</label>
                <textarea
                  placeholder="Enter group description..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-850 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none h-20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Select Members</label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-2xl p-2 bg-slate-50">
                  {usersList.map((u) => {
                    const isSelected = selectedUsers.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                          } else {
                            setSelectedUsers([...selectedUsers, u.id]);
                          }
                        }}
                        className={`flex items-center gap-2.5 p-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-150 font-bold'
                            : 'text-slate-650 hover:bg-slate-100 border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="rounded text-indigo-650 bg-white border-slate-300 focus:ring-indigo-500/40"
                        />
                        <span>{u.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="px-4 py-2.5 rounded-2xl text-slate-500 hover:bg-slate-105 transition-colors cursor-pointer text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/15 cursor-pointer text-xs font-bold"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE TASK MODAL */}
      {showShareTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Share Task in Chat</h3>
              <button onClick={() => setShowShareTaskModal(false)} className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-105 rounded-xl transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {myTasks.length === 0 ? (
                <p className="text-xs text-slate-550 text-center py-6">No tasks available to share.</p>
              ) : (
                myTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleShareTask(task.id)}
                    className="p-3 bg-slate-50 border border-slate-200 hover:border-indigo-150 rounded-2xl cursor-pointer hover:bg-indigo-50/20 transition-all flex items-center justify-between shadow-sm"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <h4 className="font-bold text-slate-700 text-xs truncate mb-1">
                        {task.taskDescription || 'Task Project'}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate">
                        Project: {task.project?.name || 'General'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANAGE GROUP MEMBERS MODAL */}
      {showManageMembersModal && activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Add Group Members</h3>
              <button onClick={() => setShowManageMembersModal(false)} className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-105 rounded-xl transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {usersList
                .filter(u => !activeConversation.members.some(m => m.userId === u.id))
                .map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 border-b border-slate-100 rounded-xl">
                    <span className="text-slate-700 text-xs font-bold">{u.name}</span>
                    <button
                      onClick={() => handleAddGroupMember(u.id)}
                      className="px-3 py-1 bg-indigo-650 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Add
                    </button>
                  </div>
                ))}

              {usersList.filter(u => !activeConversation.members.some(m => m.userId === u.id)).length === 0 && (
                <p className="text-xs text-slate-555 text-center py-6">All system employees are already group members.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FORWARD MESSAGE MODAL */}
      {forwardingMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-205 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 font-heading">Forward Message</h3>
              <button onClick={() => setForwardingMsg(null)} className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-105 rounded-xl transition-colors cursor-pointer animate-duration-100">
                <X size={20} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl text-xs text-slate-600 italic line-clamp-3 shrink-0">
              "{forwardingMsg.content}"
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Chat</label>
              {conversations.map((conv) => {
                const otherMember = conv.type === 'DIRECT' 
                  ? conv.members.find((m) => m.userId !== currentUser?.id)?.user 
                  : null;
                const name = conv.type === 'DIRECT' ? (otherMember?.name || 'Direct Chat') : (conv.name || 'Group Chat');
                
                return (
                  <button
                    key={conv.id}
                    onClick={async () => {
                      try {
                        if (socket) {
                          socket.emit('send_message', {
                            conversationId: conv.id,
                            message: { content: forwardingMsg.content }
                          });
                        }
                        setForwardingMsg(null);
                      } catch (err) {
                        console.error('Failed to forward message:', err);
                      }
                    }}
                    className="w-full p-3 hover:bg-slate-50 rounded-2xl flex items-center gap-3 transition-colors text-left cursor-pointer border border-slate-100 hover:border-indigo-100 group/item"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 uppercase group-hover/item:bg-indigo-600 group-hover/item:text-white transition-colors">
                      {name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-700 truncate group-hover/item:text-indigo-600 transition-colors">{name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{conv.type === 'GROUP' ? 'Group Chat' : 'Direct Chat'}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 font-heading">Delete Messages</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-semibold">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Are you sure you want to delete {selectedMessageIds?.length} selected message{selectedMessageIds && selectedMessageIds.length > 1 ? 's' : ''}?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2.5 rounded-2xl text-slate-500 hover:bg-slate-105 transition-colors cursor-pointer text-xs font-bold border border-slate-200/60"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelectedMessages}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl transition-all shadow-lg shadow-rose-600/15 cursor-pointer text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ALERT MODAL */}
      {customAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 font-heading">{customAlert.title || 'Notification'}</h3>
              </div>
            </div>

            <p className="text-xs text-slate-650 leading-relaxed font-semibold">
              {customAlert.message}
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCustomAlert(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/15 cursor-pointer text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      {/* WEBCAM CAPTURE MODAL */}
      {showWebcamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 font-heading flex items-center gap-2">
                <Camera className="text-pink-500" size={20} /> Take Photo
              </h3>
              <button onClick={stopWebcam} className="text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-105 rounded-xl transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200">
              {webcamError ? (
                <div className="p-6 text-center space-y-3">
                  <p className="text-xs font-semibold text-slate-400">{webcamError}</p>
                  <button
                    onClick={handleCameraFallback}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    Select Photo File
                  </button>
                </div>
              ) : capturedPhoto ? (
                <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 shrink-0">
              <button
                onClick={stopWebcam}
                className="px-4 py-2.5 rounded-2xl text-slate-500 hover:bg-slate-105 transition-colors cursor-pointer text-xs font-bold border border-slate-200/60"
              >
                Cancel
              </button>
              
              {!webcamError && !capturedPhoto && (
                <button
                  onClick={capturePhoto}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/15 cursor-pointer text-xs font-bold flex items-center gap-1.5"
                >
                  <Camera size={14} /> Capture
                </button>
              )}

              {capturedPhoto && (
                <>
                  <button
                    onClick={() => setCapturedPhoto(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all cursor-pointer text-xs font-bold"
                  >
                    Retake
                  </button>
                  <button
                    onClick={sendCapturedPhoto}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/15 cursor-pointer text-xs font-bold"
                  >
                    Send Photo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Chat;

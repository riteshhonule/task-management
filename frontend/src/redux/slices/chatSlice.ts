import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ChatMember {
  id: number;
  conversationId: number;
  userId: number;
  role: 'MEMBER' | 'ADMIN';
  joinedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface Conversation {
  id: number;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  members: ChatMember[];
  lastMessage: any | null;
  unreadCount: number;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: number | null;
  loading: boolean;
}

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  loading: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.some((c) => c.id === action.payload.id);
      if (!exists) {
        state.conversations.unshift(action.payload);
      }
    },
    setActiveConversationId: (state, action: PayloadAction<number | null>) => {
      state.activeConversationId = action.payload;
    },
    updateLastMessage: (state, action: PayloadAction<{ conversationId: number; message: any }>) => {
      const { conversationId, message } = action.payload;
      const convIndex = state.conversations.findIndex((c) => c.id === conversationId);
      if (convIndex !== -1) {
        const conv = state.conversations[convIndex];
        conv.lastMessage = message;
        conv.updatedAt = new Date().toISOString();
        
        // Move to top
        state.conversations.splice(convIndex, 1);
        state.conversations.unshift(conv);
      }
    },
    incrementUnreadCount: (state, action: PayloadAction<number>) => {
      const conv = state.conversations.find((c) => c.id === action.payload);
      if (conv) {
        conv.unreadCount += 1;
      }
    },
    resetUnreadCount: (state, action: PayloadAction<number>) => {
      const conv = state.conversations.find((c) => c.id === action.payload);
      if (conv) {
        conv.unreadCount = 0;
      }
    },
    updateGroupInfo: (state, action: PayloadAction<{ id: number; name?: string; description?: string; avatarUrl?: string }>) => {
      const conv = state.conversations.find((c) => c.id === action.payload.id);
      if (conv) {
        if (action.payload.name) conv.name = action.payload.name;
        if (action.payload.description) conv.description = action.payload.description;
        if (action.payload.avatarUrl) conv.avatarUrl = action.payload.avatarUrl;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    removeConversation: (state, action: PayloadAction<number>) => {
      state.conversations = state.conversations.filter(c => c.id !== action.payload);
      if (state.activeConversationId === action.payload) {
        state.activeConversationId = null;
      }
    },
  },
});

export const {
  setConversations,
  addConversation,
  setActiveConversationId,
  updateLastMessage,
  incrementUnreadCount,
  resetUnreadCount,
  updateGroupInfo,
  setLoading,
  removeConversation,
} = chatSlice.actions;

export default chatSlice.reducer;

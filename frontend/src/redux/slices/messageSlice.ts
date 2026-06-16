import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface MessageState {
  messages: Record<number, any[]>;
  typingUsers: Record<number, number[]>; // conversationId -> userIds
  nextCursors: Record<number, number | null>; // conversationId -> cursor
  loadingHistory: boolean;
}

const initialState: MessageState = {
  messages: {},
  typingUsers: {},
  nextCursors: {},
  loadingHistory: false,
};

const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<{ conversationId: number; messages: any[]; nextCursor: number | null }>) => {
      const { conversationId, messages, nextCursor } = action.payload;
      state.messages[conversationId] = messages;
      state.nextCursors[conversationId] = nextCursor;
    },
    prependMessages: (state, action: PayloadAction<{ conversationId: number; messages: any[]; nextCursor: number | null }>) => {
      const { conversationId, messages, nextCursor } = action.payload;
      const current = state.messages[conversationId] || [];
      // Prevent duplicates by checking IDs
      const existingIds = new Set(current.map(m => m.id));
      const filteredPrepended = messages.filter(m => !existingIds.has(m.id));
      
      state.messages[conversationId] = [...filteredPrepended, ...current];
      state.nextCursors[conversationId] = nextCursor;
    },
    addMessage: (state, action: PayloadAction<{ conversationId: number; message: any }>) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      // Avoid duplicate push
      const exists = state.messages[conversationId].some(m => m.id === message.id);
      if (!exists) {
        state.messages[conversationId].push(message);
      }
    },
    updateMessage: (state, action: PayloadAction<{ conversationId: number; messageId: number; updates: Partial<any> }>) => {
      const { conversationId, messageId, updates } = action.payload;
      const list = state.messages[conversationId];
      if (list) {
        const msgIndex = list.findIndex(m => m.id === messageId);
        if (msgIndex !== -1) {
          list[msgIndex] = { ...list[msgIndex], ...updates };
        }
      }
    },
    removeMessage: (state, action: PayloadAction<{ conversationId: number; messageId: number }>) => {
      const { conversationId, messageId } = action.payload;
      const list = state.messages[conversationId];
      if (list) {
        state.messages[conversationId] = list.filter(m => m.id !== messageId);
      }
    },
    addTypingUser: (state, action: PayloadAction<{ conversationId: number; userId: number }>) => {
      const { conversationId, userId } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      if (!state.typingUsers[conversationId].includes(userId)) {
        state.typingUsers[conversationId].push(userId);
      }
    },
    removeTypingUser: (state, action: PayloadAction<{ conversationId: number; userId: number }>) => {
      const { conversationId, userId } = action.payload;
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(id => id !== userId);
      }
    },
    setLoadingHistory: (state, action: PayloadAction<boolean>) => {
      state.loadingHistory = action.payload;
    },
    updateReactions: (
      state,
      action: PayloadAction<{ conversationId: number; messageId: number; reactions: any[] }>,
    ) => {
      const { conversationId, messageId, reactions } = action.payload;
      const list = state.messages[conversationId];
      if (list) {
        const msg = list.find((m) => m.id === messageId);
        if (msg) {
          msg.reactions = reactions;
        }
      }
    },
  },
});

export const {
  setMessages,
  prependMessages,
  addMessage,
  updateMessage,
  removeMessage,
  addTypingUser,
  removeTypingUser,
  setLoadingHistory,
  updateReactions,
} = messageSlice.actions;

export default messageSlice.reducer;

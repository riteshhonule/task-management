import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UserStatus {
  isOnline: boolean;
  lastSeen: string;
}

interface PresenceState {
  statuses: Record<number, UserStatus>;
}

const initialState: PresenceState = {
  statuses: {},
};

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    setUserOnline: (state, action: PayloadAction<number>) => {
      state.statuses[action.payload] = {
        isOnline: true,
        lastSeen: new Date().toISOString(),
      };
    },
    setUserOffline: (state, action: PayloadAction<{ userId: number; lastSeen?: string }>) => {
      state.statuses[action.payload.userId] = {
        isOnline: false,
        lastSeen: action.payload.lastSeen || new Date().toISOString(),
      };
    },
    setMultipleStatuses: (state, action: PayloadAction<Record<number, { isOnline: boolean; lastSeen: string }>>) => {
      state.statuses = { ...state.statuses, ...action.payload };
    },
  },
});

export const { setUserOnline, setUserOffline, setMultipleStatuses } = presenceSlice.actions;
export default presenceSlice.reducer;

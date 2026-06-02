import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { requestForToken, onMessageListener } from '../firebase/firebase';
import api from '../services/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  notifications: any[];
  addNotification: (noti: any) => void;
  clearNotifications: () => void;
  fetchNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  const addNotification = (noti: any) => {
    setNotifications((prev) => [noti, ...prev]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const fetchNotifications = async () => {
    try {
      const { notificationsApi } = await import('../services/api');
      const res = await notificationsApi.list();
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await authApi.getProfile();
      setUser(res.data);
      // Connect sockets after user is resolved
      connectSocket(
        res.data.id,
        (noti) => {
          addNotification(noti);
        },
        (announcement) => {
          addNotification({
            id: Math.random(),
            title: `Announcement: ${announcement.title}`,
            message: announcement.content,
            createdAt: new Date().toISOString(),
            isRead: false,
          });
        },
      );
      
      // Initialize Firebase Cloud Messaging
      try {
        const token = await requestForToken();
        if (token) {
          await api.post('/firebase/token', { fcmToken: token, deviceType: 'WEB' });
        }
        
        onMessageListener().then((payload: any) => {
          console.log('[Foreground] Received Firebase message: ', payload);
        }).catch(err => console.log('failed to setup listener: ', err));
      } catch(err) {
        console.error('FCM Token error:', err);
      }
    } catch (err) {
      console.error('Error fetching profile', err);
      logout();
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await authApi.login({ email, password });
      const { token, user: loggedUser } = res.data;
      localStorage.setItem('token', token);
      setToken(token);
      setUser(loggedUser);

      // Connect sockets
      connectSocket(
        loggedUser.id,
        (noti) => {
          addNotification(noti);
        },
        (announcement) => {
          addNotification({
            id: Math.random(),
            title: `Announcement: ${announcement.title}`,
            message: announcement.content,
            createdAt: new Date().toISOString(),
            isRead: false,
          });
        },
      );

      // Fetch user notifications list
      await fetchNotifications();
      
      // Initialize Firebase Cloud Messaging
      try {
        const fcmToken = await requestForToken();
        if (fcmToken) {
          await api.post('/firebase/token', { fcmToken, deviceType: 'WEB' });
        }
      } catch(err) {
        console.error('FCM Token error on login:', err);
      }

    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    // Fire and forget FCM removal
    requestForToken().then(token => {
      if (token) {
        api.post('/firebase/remove-token', { fcmToken: token }).catch(() => {});
      }
    }).catch(() => {});

    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    disconnectSocket();
    clearNotifications();
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        await refreshProfile();
        await fetchNotifications();
      }
      setLoading(false);
    };

    initializeAuth();
    return () => {
      disconnectSocket();
    };
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        refreshProfile,
        notifications,
        addNotification,
        clearNotifications,
        fetchNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

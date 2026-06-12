import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;

export const requestForToken = async () => {
  if (!messaging) return null;

  if (typeof window !== 'undefined' && 'Notification' in window) {
    const permission = Notification.permission;
    if (permission === 'default') {
      console.log('Requesting notification permission...');
      const status = await Notification.requestPermission();
      if (status !== 'granted') {
        console.log('Notification permission denied by user.');
        return null;
      }
    } else if (permission === 'denied') {
      console.log('Notification permission already denied. Please reset in browser settings.');
      return null;
    }
  }

  try {
    // Explicitly register service worker to ensure reliability
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const currentToken = await getToken(messaging, { 
      serviceWorkerRegistration: registration,
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
    });
    if (currentToken) {
      console.log('FCM token generated successfully:', currentToken);
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onMessageListener = (callback: (payload: any) => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

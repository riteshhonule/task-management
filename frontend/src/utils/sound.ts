const playedKeys = new Set<string>();

/**
 * Plays the notification sound once with a 5-second de-duplication window.
 * This prevents double-sounds if events are received via both WebSockets and FCM.
 */
export const playNotificationSound = (key: string) => {
  if (playedKeys.has(key)) return;
  playedKeys.add(key);
  setTimeout(() => playedKeys.delete(key), 5000);

  const audio = new Audio('/assets/sounds/notification.mp3');
  audio.play().catch((err) => {
    console.log('[Sound] Audio play blocked or failed:', err.message);
  });
};

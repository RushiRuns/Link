import notificationSoundUrl from '../assets/audio/mixkit-software-interface-start-2574.wav';

let notificationAudio: HTMLAudioElement | null = null;

export const playNotificationSound = () => {
  try {
    if (!notificationAudio) {
      notificationAudio = new Audio(notificationSoundUrl);
    }
    
    // Reset playback position if it's already playing
    notificationAudio.currentTime = 0;
    // Set volume to 100% (1.0)
    notificationAudio.volume = 1.0;
    
    const playPromise = notificationAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('[Audio] Failed to play notification sound. Browser autoplay policy may be blocking it:', err);
      });
    }
  } catch (err) {
    console.warn('[Audio] Error initializing audio:', err);
  }
};

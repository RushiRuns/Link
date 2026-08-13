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

export const stopNotificationSound = () => {
  if (notificationAudio) {
    notificationAudio.pause();
    notificationAudio.currentTime = 0;
  }
};

let audioCtx: AudioContext | null = null;
let ringbackOscillator1: OscillatorNode | null = null;
let ringbackOscillator2: OscillatorNode | null = null;
let ringbackGain: GainNode | null = null;

export const playRingbackTone = () => {
  try {
    if (!audioCtx) audioCtx = new window.AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    stopRingbackTone();
    
    ringbackGain = audioCtx.createGain();
    ringbackGain.connect(audioCtx.destination);
    
    // North American ringback: 440 + 480 Hz
    ringbackOscillator1 = audioCtx.createOscillator();
    ringbackOscillator1.frequency.value = 440;
    ringbackOscillator1.connect(ringbackGain);
    
    ringbackOscillator2 = audioCtx.createOscillator();
    ringbackOscillator2.frequency.value = 480;
    ringbackOscillator2.connect(ringbackGain);
    
    const now = audioCtx.currentTime;
    ringbackGain.gain.setValueAtTime(0, now);
    
    // Create a loop of 6 seconds (2s ON, 4s OFF)
    for (let i = 0; i < 20; i++) { // Max 2 mins
      const t = now + i * 6;
      ringbackGain.gain.setValueAtTime(0, t);
      ringbackGain.gain.linearRampToValueAtTime(0.3, t + 0.1);
      ringbackGain.gain.setValueAtTime(0.3, t + 2);
      ringbackGain.gain.linearRampToValueAtTime(0, t + 2.1);
    }
    
    ringbackOscillator1.start(now);
    ringbackOscillator2.start(now);
  } catch (err) {
    console.warn('[Audio] Failed to play ringback:', err);
  }
};

export const stopRingbackTone = () => {
  if (ringbackOscillator1) {
    try { ringbackOscillator1.stop(); } catch (e) {}
    ringbackOscillator1 = null;
  }
  if (ringbackOscillator2) {
    try { ringbackOscillator2.stop(); } catch (e) {}
    ringbackOscillator2 = null;
  }
  if (ringbackGain) {
    ringbackGain.disconnect();
    ringbackGain = null;
  }
};

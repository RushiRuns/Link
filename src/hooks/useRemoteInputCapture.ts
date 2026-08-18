import { useEffect, useRef, MutableRefObject } from 'react';
import { useRemoteAccessStore } from '../stores/remote-access.store';
import { RaInputEvent } from '../types/remote-access';

interface UseRemoteInputCaptureOptions {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  inputChannel: RTCDataChannel | null;
  isActive: boolean;
}

export function useRemoteInputCapture({ videoRef, inputChannel, isActive }: UseRemoteInputCaptureOptions) {
  const activeSession = useRemoteAccessStore((s) => s.activeSession);
  
  // Throttling state
  const lastMouseMoveRef = useRef<number>(0);
  const lastWheelRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive || !inputChannel || inputChannel.readyState !== 'open' || !videoRef.current || !activeSession) {
      return;
    }

    const video = videoRef.current;
    const sessionToken = activeSession.sessionToken;

    const sendEvent = (event: Omit<RaInputEvent, 'token'>) => {
      if (inputChannel.readyState === 'open') {
        inputChannel.send(JSON.stringify({ ...event, token: sessionToken }));
      }
    };

    const getHostCoordinates = (e: MouseEvent): { x: number, y: number } | null => {
      const rect = video.getBoundingClientRect();
      const videoRatio = video.videoWidth / video.videoHeight;
      if (isNaN(videoRatio)) return null;

      const rectRatio = rect.width / rect.height;

      let actualWidth, actualHeight, startX, startY;
      if (rectRatio > videoRatio) {
        // Pillbox (bars on left/right)
        actualHeight = rect.height;
        actualWidth = actualHeight * videoRatio;
        startX = rect.left + (rect.width - actualWidth) / 2;
        startY = rect.top;
      } else {
        // Letterbox (bars on top/bottom)
        actualWidth = rect.width;
        actualHeight = actualWidth / videoRatio;
        startX = rect.left;
        startY = rect.top + (rect.height - actualHeight) / 2;
      }

      const x = ((e.clientX - startX) / actualWidth) * video.videoWidth;
      const y = ((e.clientY - startY) / actualHeight) * video.videoHeight;

      if (x < 0 || x > video.videoWidth || y < 0 || y > video.videoHeight) {
        return null; // Out of bounds (clicked on black bars)
      }

      return { x, y };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouseMoveRef.current < 16) return; // ~60fps throttle
      lastMouseMoveRef.current = now;

      const coords = getHostCoordinates(e);
      if (coords) {
        sendEvent({ type: 'mousemove', x: coords.x, y: coords.y });
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const coords = getHostCoordinates(e);
      if (!coords) return;
      
      let button: 'left' | 'middle' | 'right' = 'left';
      if (e.button === 1) button = 'middle';
      if (e.button === 2) button = 'right';

      sendEvent({ type: 'mousedown', button });
    };

    const handleMouseUp = (e: MouseEvent) => {
      const coords = getHostCoordinates(e);
      if (!coords) return;

      let button: 'left' | 'middle' | 'right' = 'left';
      if (e.button === 1) button = 'middle';
      if (e.button === 2) button = 'right';

      sendEvent({ type: 'mouseup', button });
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Prevent page scroll
      const now = Date.now();
      if (now - lastWheelRef.current < 30) return; // ~33fps throttle
      lastWheelRef.current = now;

      sendEvent({ type: 'wheel', deltaY: e.deltaY });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent local right-click menu
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't send input if typing in a local UI element
      if (e.target !== document.body && e.target !== video) return;
      e.preventDefault();
      
      // Simple VK code mapping for common keys
      const vkCode = e.keyCode; // Deprecated but widely compatible for virtual key codes
      if (vkCode) {
        sendEvent({ type: 'keydown', vkCode });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target !== document.body && e.target !== video) return;
      e.preventDefault();

      const vkCode = e.keyCode;
      if (vkCode) {
        sendEvent({ type: 'keyup', vkCode });
      }
    };

    // Attach listeners
    video.addEventListener('mousemove', handleMouseMove);
    video.addEventListener('mousedown', handleMouseDown);
    video.addEventListener('mouseup', handleMouseUp);
    video.addEventListener('wheel', handleWheel, { passive: false });
    video.addEventListener('contextmenu', handleContextMenu);
    
    // Keyboard events need to be on window to catch all while modal is open
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });

    return () => {
      video.removeEventListener('mousemove', handleMouseMove);
      video.removeEventListener('mousedown', handleMouseDown);
      video.removeEventListener('mouseup', handleMouseUp);
      video.removeEventListener('wheel', handleWheel);
      video.removeEventListener('contextmenu', handleContextMenu);
      
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive, inputChannel, videoRef, activeSession]);
}

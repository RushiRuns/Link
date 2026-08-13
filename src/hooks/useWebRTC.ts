import { useEffect, useRef, useState, useCallback } from 'react';
import { useCallsStore } from '../stores/calls.store';

interface UseWebRTCOptions {
  callId: string;
  peerId: string;
  mediaType: 'voice' | 'video';
  isIncoming: boolean;
  initialSdpOffer?: string;
  onCallEnded?: () => void;
}

export function useWebRTC({ callId, peerId, mediaType, isIncoming, initialSdpOffer }: UseWebRTCOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const { endCall, updateCallStatus } = useCallsStore();

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (pcRef.current) {
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
      setRemoteStream(null);
    }
    setIsConnected(false);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const ringTimeout = setTimeout(() => {
      if (!isMounted) return;
      if (pcRef.current?.connectionState !== 'connected') {
        console.log('[WebRTC] Call timeout reached');
        cleanup();
        endCall('no_answer');
      }
    }, 30000);

    // WebRTC connection config: LAN only, no external STUN/TURN servers
    const pc = new RTCPeerConnection({ iceServers: [] });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      // Use toJSON() to convert the native RTCIceCandidate to a plain object.
      // RTCIceCandidate is a native WebRTC class whose properties (sdpMid,
      // sdpMLineIndex) are NOT preserved by Electron's structured-clone IPC
      // serialization unless converted to a plain object first.
      if (event.candidate && window.link?.calls) {
        window.link.calls.sendIceCandidate(callId, event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      // Use the live stream from the event directly — this is what WebRTC
      // manages and is the reliable way to get the remote media stream.
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setIsConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        updateCallStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        const wasActive = !!pcRef.current;
        cleanup();
        if (wasActive) endCall();
      }
    };

    const iceQueue: RTCIceCandidateInit[] = [];
    let pendingAnswerSdp: string | null = null;

    // Listen for incoming WebRTC signals BEFORE acquiring media to prevent race conditions
    let cleanAnswer: (() => void) | undefined;
    let cleanIce: (() => void) | undefined;

    if (window.link?.calls) {
      cleanAnswer = window.link.calls.onAnswerReceived(async ({ sdp }) => {
        if (sdp && pcRef.current) {
          if (pcRef.current.signalingState === 'have-local-offer') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
            // Process ICE queue
            for (const c of iceQueue) {
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
              } catch (err) {
                console.warn('[WebRTC] Error adding queued ICE candidate:', err);
              }
            }
            iceQueue.length = 0;
          } else {
            pendingAnswerSdp = sdp;
          }
        }
      });

      cleanIce = window.link.calls.onIceCandidateReceived(async ({ candidate }) => {
        if (candidate && pcRef.current) {
          if (pcRef.current.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn('[WebRTC] Error adding ICE candidate:', err);
            }
          } else {
            iceQueue.push(candidate);
          }
        }
      });
    }

    // Acquire local media stream (microphone / camera)
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: mediaType === 'video'
      })
      .then(async (stream) => {
        // If the effect was cleaned up while getUserMedia was pending, stop tracks and bail out
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        if (!isIncoming) {
          // Outgoing call: create SDP offer
          const offer = await pc.createOffer();
          if (!isMounted) return;
          await pc.setLocalDescription(offer);
          if (!isMounted) return;
          if (window.link?.calls) {
            await window.link.calls.offerCall(callId, peerId, mediaType, offer.sdp || '');
          }
          if (pendingAnswerSdp) {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: pendingAnswerSdp }));
            pendingAnswerSdp = null;
            // Process ICE queue now that remote description is set
            for (const c of iceQueue) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              } catch (err) {
                console.warn('[WebRTC] Error adding queued ICE candidate:', err);
              }
            }
            iceQueue.length = 0;
          }
        } else if (initialSdpOffer) {
          // Incoming call: set remote description from SDP offer, then create SDP answer
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: initialSdpOffer }));
          if (!isMounted) return;
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (window.link?.calls) {
            await window.link.calls.answerCall(callId, true, answer.sdp || '');
          }
        }
        
        // Process any queued ICE candidates after descriptions are set
        for (const c of iceQueue) {
          if (!isMounted) break;
          try {
            await pcRef.current?.addIceCandidate(new RTCIceCandidate(c));
          } catch (err) {
            console.warn('[WebRTC] Error adding queued ICE candidate:', err);
          }
        }
        iceQueue.length = 0;
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('[WebRTC] Error acquiring media devices:', err);
        window.alert(`Could not access camera/microphone: ${err.message || 'Permission denied'}`);
        cleanup();
        endCall();
      });

    return () => {
      isMounted = false;
      clearTimeout(ringTimeout);
      cleanAnswer?.();
      cleanIce?.();
      iceQueue.length = 0;
      cleanup();
    };
  }, [callId, mediaType, isIncoming, initialSdpOffer, cleanup, endCall]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  return {
    localStream,
    remoteStream,
    isConnected,
    isAudioMuted,
    isVideoMuted,
    toggleAudio,
    toggleVideo,
    cleanup
  };
}

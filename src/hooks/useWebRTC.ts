import { useEffect, useRef, useState, useCallback } from 'react';
import { useCallsStore } from '../stores/calls.store';

interface UseWebRTCOptions {
  callId: string;
  mediaType: 'voice' | 'video';
  isIncoming: boolean;
  initialSdpOffer?: string;
  onCallEnded?: () => void;
}

export function useWebRTC({ callId, mediaType, isIncoming, initialSdpOffer }: UseWebRTCOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const { endCall } = useCallsStore();

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    // WebRTC connection config: LAN only, no external STUN/TURN servers
    const pc = new RTCPeerConnection({ iceServers: [] });
    pcRef.current = pc;
    remoteStreamRef.current = new MediaStream();

    pc.onicecandidate = (event) => {
      if (event.candidate && window.link?.calls) {
        window.link.calls.sendIceCandidate(callId, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          remoteStreamRef.current?.addTrack(track);
        });
        setIsConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanup();
        endCall();
      }
    };

    // Acquire local media stream (microphone / camera)
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: mediaType === 'video'
      })
      .then(async (stream) => {
        localStreamRef.current = stream;
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        if (!isIncoming) {
          // Outgoing call: create SDP offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (window.link?.calls) {
            await window.link.calls.offerCall(callId, mediaType, offer.sdp || '');
          }
        } else if (initialSdpOffer) {
          // Incoming call: set remote description from SDP offer, then create SDP answer
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: initialSdpOffer }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (window.link?.calls) {
            await window.link.calls.answerCall(callId, true, answer.sdp || '');
          }
        }
      })
      .catch((err) => {
        console.error('[WebRTC] Error acquiring media devices:', err);
        cleanup();
        endCall();
      });

    // Listen for incoming WebRTC signals
    let cleanAnswer: (() => void) | undefined;
    let cleanIce: (() => void) | undefined;

    if (window.link?.calls) {
      cleanAnswer = window.link.calls.onAnswerReceived(async ({ sdp }) => {
        if (sdp && pcRef.current && pcRef.current.signalingState === 'have-local-offer') {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
        }
      });

      cleanIce = window.link.calls.onIceCandidateReceived(async ({ candidate }) => {
        if (candidate && pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn('[WebRTC] Error adding ICE candidate:', err);
          }
        }
      });
    }

    return () => {
      cleanAnswer?.();
      cleanIce?.();
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
    localStream: localStreamRef.current,
    remoteStream: remoteStreamRef.current,
    isConnected,
    isAudioMuted,
    isVideoMuted,
    toggleAudio,
    toggleVideo,
    cleanup
  };
}

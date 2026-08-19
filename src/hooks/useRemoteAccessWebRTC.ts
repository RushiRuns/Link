import { useEffect, useRef, useState, useCallback } from 'react';
import { useRemoteAccessStore } from '../stores/remote-access.store';
import { PermissionMode } from '../types/remote-access';

interface UseRemoteAccessWebRTCOptions {
  sessionId: string;
  role: 'host' | 'controller';
  permissionMode?: PermissionMode;
  initialSdp?: string;
  screenSourceId?: string;
}

export function useRemoteAccessWebRTC({ sessionId, role, permissionMode, initialSdp, screenSourceId }: UseRemoteAccessWebRTCOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const inputChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bitrate, setBitrate] = useState<number>(0);
  const [rtt, setRtt] = useState<number>(0);
  const [isInputReady, setIsInputReady] = useState(false);

  const endSession = useRemoteAccessStore((s) => s.endSession);

  // Monitor Bitrate
  useEffect(() => {
    if (!isConnected) return;
    let lastBytes = 0;
    let lastTime = 0;
    const interval = setInterval(async () => {
      if (!pcRef.current) return;
      try {
        const stats = await pcRef.current.getStats();
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
             if (report.bytesReceived) {
                const now = report.timestamp;
                const bytes = report.bytesReceived;
                if (lastTime && lastBytes) {
                   const br = (8 * (bytes - lastBytes)) / (now - lastTime); // kbps
                   if (br > 0) setBitrate(Math.round(br));
                }
                lastBytes = bytes;
                lastTime = now;
             }
          }
        });
      } catch (e) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (inputChannelRef.current) {
      inputChannelRef.current.close();
      inputChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.ondatachannel = null;
      pcRef.current.close();
      pcRef.current = null;
      setRemoteStream(null);
    }
    setIsConnected(false);
    setIsInputReady(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let pingTimer: any;

    // WebRTC connection config: LAN only, no external STUN/TURN servers.
    // Matches the pattern in useWebRTC.ts (line 96) to ensure no unnecessary WAN negotiation.
    const pc = new RTCPeerConnection({ iceServers: [] });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && window.link?.remoteAccess) {
        window.link.remoteAccess.sendIce(sessionId, {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        const wasActive = !!pcRef.current;
        cleanup();
        if (wasActive) endSession();
      }
    };

    // DataChannel logic for low-latency input transport and RTT measurement
    const setupDataChannel = (channel: RTCDataChannel) => {
      inputChannelRef.current = channel;
      if (channel.readyState === 'open') {
        setIsInputReady(true);
      }
      channel.onopen = () => setIsInputReady(true);
      channel.onclose = () => setIsInputReady(false);
      
      channel.onmessage = (event) => {
         try {
           const data = JSON.parse(event.data);
           if (data.type === 'ping') {
             channel.send(JSON.stringify({ type: 'pong', ts: data.ts }));
             return;
           }
           if (data.type === 'pong') {
             const latency = Date.now() - data.ts;
             setRtt(latency);
             return;
           }
           // Host specific: Forward input events to native OS via IPC
           if (role === 'host' && window.link?.remoteAccess && data.token) {
             if (data.type !== 'mousemove') {
               console.log(`[RemoteAccessWebRTC] Host received ${data.type} event. Forwarding to IPC...`);
             }
             window.link.remoteAccess.injectInput(sessionId, data.token, data);
           } else if (role === 'host') {
             if (data.type !== 'mousemove') {
               console.warn(`[RemoteAccessWebRTC] Host dropped ${data.type}: missing IPC bridge or token`, { hasBridge: !!window.link?.remoteAccess, hasToken: !!data.token });
             }
           }
         } catch(e) {
           console.error('[RemoteAccessWebRTC] Error parsing data channel message:', e);
         }
      };

      // Periodic ping for RTT
      pingTimer = setInterval(() => {
         if (channel.readyState === 'open') {
            channel.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
         }
      }, 5000);
    };

    if (role === 'host') {
      // Host creates the data channel before creating the offer to ensure SCTP is negotiated
      const channel = pc.createDataChannel('ra-input', { ordered: true });
      setupDataChannel(channel);
    } else {
      // Controller listens for the data channel
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };
    }

    let pendingAnswerSdp: string | null = null;
    const iceQueue: RTCIceCandidateInit[] = [];

    pc.onsignalingstatechange = () => {
      if (pc.signalingState === 'have-local-offer' && pendingAnswerSdp) {
        pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: pendingAnswerSdp }))
          .then(() => {
            pendingAnswerSdp = null;
            for (const c of iceQueue) {
              pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn(e));
            }
            iceQueue.length = 0;
          })
          .catch(err => console.error('[RemoteAccessWebRTC] Error setting pending remote description:', err));
      }
    };

    // IPC Listeners for SDP and ICE
    let cleanAnswer: (() => void) | undefined;
    let cleanIce: (() => void) | undefined;

    if (window.link?.remoteAccess) {
      cleanAnswer = window.link.remoteAccess.onAnswerReceived(async ({ sdp }: any) => {
        if (!isMounted || !pcRef.current) return;
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
          for (const c of iceQueue) {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn(e));
          }
          iceQueue.length = 0;
        } else {
          pendingAnswerSdp = sdp;
        }
      });

      cleanIce = window.link.remoteAccess.onIceReceived(async ({ candidate }: any) => {
        if (!isMounted || !pcRef.current) return;
        if (pc.remoteDescription && pc.remoteDescription.type) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn(e));
        } else {
          iceQueue.push(candidate);
        }
      });
    }

    // Startup Logic
    const startSession = async () => {
      try {
        if (role === 'host' && screenSourceId && permissionMode) {
           // Host acquires screen
           const stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                 mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: screenSourceId,
                    maxWidth: 1280,
                    maxHeight: 720,
                    maxFrameRate: 15
                 }
              } as any
           });
           localStreamRef.current = stream;
           stream.getTracks().forEach(t => pc.addTrack(t, stream));

           // Host creates offer
           const offer = await pc.createOffer();
           await pc.setLocalDescription(offer);

           // Host accepts request via IPC
           if (window.link?.remoteAccess && offer.sdp) {
              await window.link.remoteAccess.sendAccept(sessionId, permissionMode, offer.sdp);
           }
        } else if (role === 'controller' && initialSdp) {
           // Controller receives offer, creates answer
           await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: initialSdp }));
           const answer = await pc.createAnswer();
           await pc.setLocalDescription(answer);

           if (window.link?.remoteAccess && answer.sdp) {
              await window.link.remoteAccess.sendAnswer(sessionId, answer.sdp);
           }
        }
      } catch (err) {
        console.error('[RemoteAccessWebRTC] Startup error:', err);
        cleanup();
        endSession();
      }
    };

    startSession();

    return () => {
      isMounted = false;
      if (pingTimer) clearInterval(pingTimer);
      if (cleanAnswer) cleanAnswer();
      if (cleanIce) cleanIce();
      cleanup();
    };
  }, [sessionId, role, permissionMode, screenSourceId, initialSdp, endSession, cleanup]);

  return {
    remoteStream,
    isConnected,
    isInputReady,
    bitrate,
    rtt,
    inputChannel: inputChannelRef.current,
    cleanup
  };
}

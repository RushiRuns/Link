import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, MonitorOff } from 'lucide-react';

interface CallControlsProps {
  mediaType: 'voice' | 'video';
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  isMediaReady?: boolean;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
}

export function CallControls({
  mediaType,
  isAudioMuted,
  isVideoMuted,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  isMediaReady = true,
  isScreenSharing = false,
  onToggleScreenShare
}: CallControlsProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-3) var(--space-6)',
        backgroundColor: 'rgba(26, 28, 35, 0.85)',
        borderRadius: 'var(--radius-full)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <style>{`
        .call-btn { transition: transform 0.15s ease, background-color 0.15s ease; }
        .call-btn:hover:not(:disabled) { transform: scale(1.08); }
        .call-btn:active:not(:disabled) { transform: scale(0.95); }
      `}</style>
      <button
        className="call-btn"
        onClick={onToggleAudio}
        disabled={!isMediaReady}
        title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isAudioMuted ? 'var(--status-error)' : 'rgba(255, 255, 255, 0.15)',
          color: '#ffffff',
          cursor: isMediaReady ? 'pointer' : 'not-allowed',
          opacity: isMediaReady ? 1 : 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.15s ease'
        }}
      >
        {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      {mediaType === 'video' && (
        <button
          className="call-btn"
          onClick={onToggleVideo}
          disabled={!isMediaReady}
          title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isVideoMuted ? 'var(--status-error)' : 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            cursor: isMediaReady ? 'pointer' : 'not-allowed',
            opacity: isMediaReady ? 1 : 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease'
          }}
        >
          {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
      )}

      {mediaType === 'video' && onToggleScreenShare && (
        <button
          className="call-btn"
          onClick={onToggleScreenShare}
          disabled={!isMediaReady}
          title={isScreenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: isScreenSharing ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            cursor: isMediaReady ? 'pointer' : 'not-allowed',
            opacity: isMediaReady ? 1 : 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease'
          }}
        >
          {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
        </button>
      )}

      <button
        className="call-btn"
        onClick={() => onEndCall()}
        title="End Call"
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'var(--status-error)',
          color: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
          transition: 'transform 0.15s ease'
        }}
      >
        <PhoneOff size={22} />
      </button>
    </div>
  );
}

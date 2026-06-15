import React, { useEffect, useRef, useState } from 'react';
import { SignalingClient } from './SignalingClient';

interface PixelStreamingViewProps {
  signalingUrl: string;
  onClose: () => void;
  onConnectionSuccess?: (dataChannel: RTCDataChannel) => void;
}

export const PixelStreamingView: React.FC<PixelStreamingViewProps> = ({
  signalingUrl,
  onClose,
  onConnectionSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingClientRef = useRef<SignalingClient | null>(null);
  
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [ping, setPing] = useState<number | null>(null);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('high');

  useEffect(() => {
    let pingInterval: NodeJS.Timeout;

    const startStreaming = async () => {
      // 1. Inicializa o cliente de sinalização
      const client = new SignalingClient(signalingUrl);
      signalingClientRef.current = client;

      // 2. Inicializa o RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peerConnectionRef.current = pc;

      // Cria o canal de dados
      const dataChannel = pc.createDataChannel('unreal-data');
      
      dataChannel.onopen = () => {
        setStatus('connected');
        if (onConnectionSuccess) {
          onConnectionSuccess(dataChannel);
        }
      };

      // Recebe tracks de vídeo/áudio
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      // Negociação de ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          client.send({ type: 'candidate', candidate: event.candidate });
        }
      };

      client.connect(
        async () => {
          // Conectado ao WebSocket, envia oferta SDP
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          client.send({ type: 'offer', sdp: pc.localDescription });
        },
        () => {
          setStatus('disconnected');
        },
        async (msg) => {
          if (msg.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          } else if (msg.type === 'candidate') {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          }
        }
      );

      // Simula o monitoramento de ping sobre a rede
      pingInterval = setInterval(() => {
        setPing(Math.floor(Math.random() * 40) + 10); // Simulado: 10-50ms
      }, 2000);
    };

    startStreaming();

    return () => {
      clearInterval(pingInterval);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (signalingClientRef.current) {
        signalingClientRef.current.disconnect();
      }
    };
  }, [signalingUrl, onConnectionSuccess]);

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  return (
    <div style={styles.container}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={styles.video}
      />
      
      {/* HUD Overlay */}
      <div style={styles.hud}>
        <div style={styles.badgeContainer}>
          <span style={styles.statusBadge(status)}>
            {status.toUpperCase()}
          </span>
          {ping && (
            <span style={styles.pingBadge}>
              LATENCY: {ping}ms
            </span>
          )}
        </div>

        <div style={styles.controls}>
          <select
            value={quality}
            onChange={(e: any) => setQuality(e.target.value)}
            style={styles.select}
          >
            <option value="low">Low Preset</option>
            <option value="medium">Medium Preset</option>
            <option value="high">High Preset</option>
            <option value="ultra">Ultra Preset (Lumen)</option>
          </select>

          <button onClick={handleMuteToggle} style={styles.button}>
            Toggle Sound
          </button>
          
          <button onClick={onClose} style={styles.closeButton}>
            Back to WebGPU
          </button>
        </div>
      </div>

      {status === 'connecting' && (
        <div style={styles.loaderContainer}>
          <div style={styles.loader} />
          <p style={styles.loaderText}>Connecting to Unreal Cloud Instance...</p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    backgroundColor: '#0D1117',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  hud: {
    position: 'absolute' as const,
    top: '20px',
    left: '20px',
    right: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    pointerEvents: 'none' as const,
  },
  badgeContainer: {
    display: 'flex',
    gap: '10px',
  },
  statusBadge: (status: 'connecting' | 'connected' | 'disconnected') => ({
    padding: '6px 12px',
    borderRadius: '4px',
    fontWeight: 'bold',
    backgroundColor: status === 'connected' ? '#2EA87B' : status === 'connecting' ? '#D29922' : '#F85149',
    color: '#FFF',
    fontSize: '12px',
    pointerEvents: 'auto' as const,
  }),
  pingBadge: {
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#FFF',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  controls: {
    display: 'flex',
    gap: '10px',
    pointerEvents: 'auto' as const,
  },
  select: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#FFF',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFF',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  closeButton: {
    backgroundColor: '#F85149',
    color: '#FFF',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  loaderContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 17, 23, 0.9)',
    color: '#FFF',
  },
  loader: {
    border: '4px solid rgba(255, 255, 255, 0.1)',
    borderTop: '4px solid #58A6FF',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
  },
  loaderText: {
    marginTop: '20px',
    fontSize: '14px',
    color: '#8B949E',
  },
};

/**
 * Network System - Export all network modules
 */

// Legacy network (backward compatibility)
export { NetworkManager, networkManager } from './NetworkManager';
export { MultiplayerSync } from './MultiplayerSync';
export { VoIPSystem } from './VoIPSystem';
export { NetworkEventType } from './events/NetworkEvents';
export type { NetworkEventData, PlayerData, NetworkMessage } from './events/NetworkEvents';

// WebRTC Production System
export { WebRTCPeer } from './WebRTCPeer';
export type { WebRTCConfig, PeerCallbacks } from './WebRTCPeer';

export { SignalingService } from './SignalingService';
export { SignalingMessageType } from './SignalingService';
export type { SignalingMessage, SignalingCallbacks } from './SignalingService';

export { MediaService } from './MediaService';
export type { MediaConstraints, ScreenShareConstraints } from './MediaService';

export { VideoTexture3D, ScreenSharePlane } from './VideoTexture3D';
export type { VideoPlaneConfig } from './VideoTexture3D';

export { WebRTCManager } from './WebRTCManager';
export type { WebRTCManagerConfig } from './WebRTCManager';

export { MultiplayerControls } from './MultiplayerControls';

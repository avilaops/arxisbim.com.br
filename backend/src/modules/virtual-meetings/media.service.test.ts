import { afterEach, describe, expect, it } from 'vitest';
import { MeetingMediaService } from './media.service.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('MeetingMediaService', () => {
  it('falls back to P2P signaling when LiveKit is not configured', async () => {
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    process.env.SIGNALING_SERVER_URL = 'ws://signaling.test:8080';

    const service = new MeetingMediaService();
    const config = await service.getMediaConfig({
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      userName: 'Test User',
    });

    expect(config.provider).toBe('p2p');
    expect(config.roomName).toBe('arxisvr-meeting-550e8400-e29b-41d4-a716-446655440000');
    expect(config.p2p?.signalingUrl).toBe('ws://signaling.test:8080');
    expect(config.livekit).toBeUndefined();
  });

  it('returns a LiveKit token when LiveKit is configured', async () => {
    process.env.LIVEKIT_URL = 'wss://livekit.test';
    process.env.LIVEKIT_API_KEY = 'devkey';
    process.env.LIVEKIT_API_SECRET = 'devsecretdevsecretdevsecretdevsecret';

    const service = new MeetingMediaService();
    const config = await service.getMediaConfig({
      roomId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      userName: 'Test User',
    });

    expect(config.provider).toBe('livekit');
    expect(config.livekit?.url).toBe('wss://livekit.test');
    expect(config.livekit?.participantIdentity).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(config.livekit?.token.split('.')).toHaveLength(3);
    expect(config.p2p).toBeUndefined();
  });
});

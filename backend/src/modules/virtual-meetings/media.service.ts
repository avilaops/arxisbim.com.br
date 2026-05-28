import { AccessToken } from 'livekit-server-sdk';

export type MeetingMediaProvider = 'livekit' | 'p2p';

export interface MeetingMediaConfigInput {
  roomId: string;
  userId: string;
  userName?: string;
}

export interface MeetingMediaConfig {
  provider: MeetingMediaProvider;
  roomName: string;
  livekit?: {
    url: string;
    token: string;
    participantIdentity: string;
  };
  p2p?: {
    signalingUrl: string;
  };
}

export class MeetingMediaService {
  async getMediaConfig(input: MeetingMediaConfigInput): Promise<MeetingMediaConfig> {
    const roomName = this.getRoomName(input.roomId);

    if (this.isLiveKitConfigured()) {
      const participantIdentity = input.userId;
      const token = await this.createLiveKitToken({
        roomName,
        participantIdentity,
        participantName: input.userName,
      });

      return {
        provider: 'livekit',
        roomName,
        livekit: {
          url: process.env.LIVEKIT_URL!,
          token,
          participantIdentity,
        },
      };
    }

    return {
      provider: 'p2p',
      roomName,
      p2p: {
        signalingUrl: process.env.SIGNALING_SERVER_URL || 'ws://localhost:8080',
      },
    };
  }

  private isLiveKitConfigured(): boolean {
    return Boolean(
      process.env.LIVEKIT_URL &&
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET
    );
  }

  private getRoomName(roomId: string): string {
    return `arxisvr-meeting-${roomId}`;
  }

  private async createLiveKitToken(input: {
    roomName: string;
    participantIdentity: string;
    participantName?: string;
  }): Promise<string> {
    const accessToken = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: input.participantIdentity,
        name: input.participantName,
      }
    );

    accessToken.addGrant({
      room: input.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return await accessToken.toJwt();
  }
}

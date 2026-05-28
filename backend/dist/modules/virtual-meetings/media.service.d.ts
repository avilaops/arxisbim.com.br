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
export declare class MeetingMediaService {
    getMediaConfig(input: MeetingMediaConfigInput): Promise<MeetingMediaConfig>;
    private isLiveKitConfigured;
    private getRoomName;
    private createLiveKitToken;
}
//# sourceMappingURL=media.service.d.ts.map
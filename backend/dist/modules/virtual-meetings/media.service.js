import { AccessToken } from 'livekit-server-sdk';
export class MeetingMediaService {
    async getMediaConfig(input) {
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
                    url: process.env.LIVEKIT_URL,
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
    isLiveKitConfigured() {
        return Boolean(process.env.LIVEKIT_URL &&
            process.env.LIVEKIT_API_KEY &&
            process.env.LIVEKIT_API_SECRET);
    }
    getRoomName(roomId) {
        return `arxisvr-meeting-${roomId}`;
    }
    async createLiveKitToken(input) {
        const accessToken = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
            identity: input.participantIdentity,
            name: input.participantName,
        });
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
//# sourceMappingURL=media.service.js.map
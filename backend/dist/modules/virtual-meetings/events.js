// =====================================
// VIRTUAL MEETINGS - WebSocket Events
// =====================================
/**
 * Eventos que o CLIENT envia para o SERVER
 */
export var ClientEvents;
(function (ClientEvents) {
    // Room Management
    ClientEvents["JOIN_ROOM"] = "meeting:join";
    ClientEvents["LEAVE_ROOM"] = "meeting:leave";
    // Avatar Updates
    ClientEvents["UPDATE_AVATAR"] = "meeting:update-avatar";
    // Chat
    ClientEvents["SEND_MESSAGE"] = "meeting:send-message";
    // Actions (laser pointer, annotations, etc)
    ClientEvents["CREATE_ACTION"] = "meeting:create-action";
    // CRDT state sync (selection, annotations, section cuts)
    ClientEvents["COLLABORATION_UPDATE"] = "meeting:collaboration-update";
    ClientEvents["COLLABORATION_HISTORY_REQUEST"] = "meeting:collaboration-history-request";
    // Voice/Video (future)
    ClientEvents["TOGGLE_AUDIO"] = "meeting:toggle-audio";
    ClientEvents["TOGGLE_VIDEO"] = "meeting:toggle-video";
})(ClientEvents || (ClientEvents = {}));
/**
 * Eventos que o SERVER envia para o CLIENT
 */
export var ServerEvents;
(function (ServerEvents) {
    // Connection
    ServerEvents["JOINED"] = "meeting:joined";
    ServerEvents["ERROR"] = "meeting:error";
    // Participants
    ServerEvents["PARTICIPANT_JOINED"] = "meeting:participant-joined";
    ServerEvents["PARTICIPANT_LEFT"] = "meeting:participant-left";
    // Avatar Updates
    ServerEvents["AVATAR_UPDATED"] = "meeting:avatar-updated";
    // Chat
    ServerEvents["MESSAGE_RECEIVED"] = "meeting:message-received";
    // Actions
    ServerEvents["ACTION_CREATED"] = "meeting:action-created";
    // CRDT state sync
    ServerEvents["COLLABORATION_UPDATED"] = "meeting:collaboration-updated";
    ServerEvents["COLLABORATION_HISTORY"] = "meeting:collaboration-history";
    // Room Status
    ServerEvents["ROOM_ENDED"] = "meeting:room-ended";
    ServerEvents["HOST_CHANGED"] = "meeting:host-changed";
})(ServerEvents || (ServerEvents = {}));
//# sourceMappingURL=events.js.map
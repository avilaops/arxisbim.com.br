/**
 * EXEMPLO DE INTEGRAÇÃO FRONTEND - Virtual Meetings
 *
 * Este arquivo mostra como integrar o módulo de reuniões virtuais
 * em um componente React/Vue/Angular
 */
import { io } from 'socket.io-client';
import { ClientEvents, ServerEvents } from '@backend/modules/virtual-meetings';
class VirtualMeetingManager {
    baseUrl;
    token;
    socket = null;
    roomId = null;
    participantId = null;
    // Callbacks
    onParticipantJoined;
    onParticipantLeft;
    onAvatarUpdated;
    onMessageReceived;
    onActionCreated;
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl;
        this.token = token;
    }
    /**
     * Conectar ao servidor WebSocket
     */
    async connect() {
        return new Promise((resolve, reject) => {
            this.socket = io(this.baseUrl, {
                path: '/socket.io/',
                auth: { token: this.token },
                transports: ['websocket', 'polling'],
            });
            this.socket.on('connect', () => {
                console.log('✅ Connected to meetings server');
                this.setupListeners();
                resolve();
            });
            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection error:', error);
                reject(error);
            });
        });
    }
    /**
     * Configurar listeners de eventos
     */
    setupListeners() {
        if (!this.socket)
            return;
        // Room joined
        this.socket.on(ServerEvents.JOINED, (data) => {
            console.log('Joined room:', data.room);
            this.roomId = data.room.id;
            this.participantId = data.participant.id;
            // Inicializar lista de participantes
            data.participants.forEach((p) => {
                if (p.id !== this.participantId && this.onParticipantJoined) {
                    this.onParticipantJoined(p);
                }
            });
        });
        // Participant joined
        this.socket.on(ServerEvents.PARTICIPANT_JOINED, (data) => {
            if (data.participant.id !== this.participantId && this.onParticipantJoined) {
                this.onParticipantJoined(data.participant);
            }
        });
        // Participant left
        this.socket.on(ServerEvents.PARTICIPANT_LEFT, (data) => {
            if (this.onParticipantLeft) {
                this.onParticipantLeft(data.participantId);
            }
        });
        // Avatar updated
        this.socket.on(ServerEvents.AVATAR_UPDATED, (data) => {
            if (this.onAvatarUpdated) {
                this.onAvatarUpdated(data.participantId, data.avatarState);
            }
        });
        // Message received
        this.socket.on(ServerEvents.MESSAGE_RECEIVED, (data) => {
            if (this.onMessageReceived) {
                this.onMessageReceived(data);
            }
        });
        // Action created
        this.socket.on(ServerEvents.ACTION_CREATED, (data) => {
            if (this.onActionCreated) {
                this.onActionCreated(data);
            }
        });
        // Error
        this.socket.on(ServerEvents.ERROR, (error) => {
            console.error('Meeting error:', error.message);
        });
    }
    /**
     * Entrar em uma sala
     */
    joinRoom(roomId, userName) {
        if (!this.socket) {
            throw new Error('Not connected');
        }
        this.socket.emit(ClientEvents.JOIN_ROOM, {
            roomId,
            userName,
            avatarState: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                animation: 'idle'
            }
        });
    }
    /**
     * Atualizar posição do avatar
     */
    updateAvatar(position, rotation, animation) {
        if (!this.socket)
            return;
        this.socket.emit(ClientEvents.UPDATE_AVATAR, {
            position,
            rotation,
            animation
        });
    }
    /**
     * Enviar mensagem
     */
    sendMessage(message) {
        if (!this.socket)
            return;
        this.socket.emit(ClientEvents.SEND_MESSAGE, { message });
    }
    /**
     * Criar ação (laser pointer, etc)
     */
    createAction(actionType, actionData, targetElementId) {
        if (!this.socket)
            return;
        this.socket.emit(ClientEvents.CREATE_ACTION, {
            actionType,
            actionData,
            targetElementId
        });
    }
    /**
     * Sair da sala
     */
    leaveRoom() {
        if (!this.socket)
            return;
        this.socket.emit(ClientEvents.LEAVE_ROOM);
    }
    /**
     * Desconectar
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
// =====================================
// EXEMPLO DE USO EM REACT
// =====================================
/*
import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';

function VirtualMeetingRoom({ roomId, token, userName }) {
  const [participants, setParticipants] = useState(new Map());
  const [messages, setMessages] = useState([]);
  const meetingManager = useRef(null);
  const sceneRef = useRef(null);
  const avatarsRef = useRef(new Map());

  useEffect(() => {
    // Inicializar Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    sceneRef.current = scene;

    // Inicializar meeting manager
    const manager = new VirtualMeetingManager('http://localhost:3001', token);
    meetingManager.current = manager;

    // Callbacks
    manager.onParticipantJoined = (participant) => {
      console.log('New participant:', participant);
      setParticipants(prev => new Map(prev).set(participant.id, participant));
      
      // Criar avatar no Three.js
      const geometry = new THREE.BoxGeometry(1, 2, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const avatar = new THREE.Mesh(geometry, material);
      avatar.position.set(
        participant.avatarState.position.x,
        participant.avatarState.position.y,
        participant.avatarState.position.z
      );
      scene.add(avatar);
      avatarsRef.current.set(participant.id, avatar);
    };

    manager.onParticipantLeft = (participantId) => {
      console.log('Participant left:', participantId);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.delete(participantId);
        return newMap;
      });
      
      // Remover avatar do Three.js
      const avatar = avatarsRef.current.get(participantId);
      if (avatar) {
        scene.remove(avatar);
        avatarsRef.current.delete(participantId);
      }
    };

    manager.onAvatarUpdated = (participantId, avatarState) => {
      // Atualizar posição do avatar
      const avatar = avatarsRef.current.get(participantId);
      if (avatar) {
        avatar.position.set(
          avatarState.position.x,
          avatarState.position.y,
          avatarState.position.z
        );
        avatar.rotation.set(
          avatarState.rotation.x,
          avatarState.rotation.y,
          avatarState.rotation.z
        );
      }
    };

    manager.onMessageReceived = (message) => {
      setMessages(prev => [...prev, message]);
    };

    // Conectar e entrar na sala
    manager.connect().then(() => {
      manager.joinRoom(roomId, userName);
    });

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      manager.leaveRoom();
      manager.disconnect();
      document.getElementById('canvas-container').innerHTML = '';
    };
  }, [roomId, token, userName]);

  // Update avatar position quando usuário se move
  const handleMove = (newPosition, newRotation) => {
    meetingManager.current?.updateAvatar(newPosition, newRotation, 'walking');
  };

  // Send chat message
  const handleSendMessage = (message) => {
    meetingManager.current?.sendMessage(message);
  };

  // Laser pointer
  const handleLaserPointer = (targetPosition) => {
    meetingManager.current?.createAction('laser_pointer', {
      position: targetPosition,
      color: '#ff0000'
    });
  };

  return (
    <div>
      <div id="canvas-container" style={{ width: '100%', height: '80vh' }} />
      <div style={{ height: '20vh' }}>
        <div>
          <h3>Participants ({participants.size})</h3>
          {Array.from(participants.values()).map(p => (
            <div key={p.id}>{p.userName}</div>
          ))}
        </div>
        <div>
          <h3>Chat</h3>
          {messages.map((msg, i) => (
            <div key={i}>
              <strong>{msg.userName}:</strong> {msg.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VirtualMeetingRoom;
*/
export default VirtualMeetingManager;
//# sourceMappingURL=example-frontend-integration.js.map
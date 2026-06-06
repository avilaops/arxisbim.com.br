/**
 * CollaborationPresenceSystem
 *
 * Faz o "Minecraft effect":
 *  - A cada frame lê a câmera local e transmite posição via MultiplayerRealtimeService
 *  - Ao receber avatar_update de outros participantes, cria/move um cursor 3D na cena
 *    (esfera colorida + label com nome flutuante)
 *
 * Uso:
 *   const presence = new CollaborationPresenceSystem(viewerHost.scene, viewerHost.camera);
 *   presence.start();          // inicia broadcast + subscribe
 *   presence.dispose();        // limpa tudo ao sair da sessão
 */

import * as THREE from 'three';
import { MultiplayerRealtimeService } from '../multiplayer-realtime/multiplayer-realtime.service';

// Paleta de cores para os cursors (um por participante)
const CURSOR_COLORS = [
  0x60a5fa, // azul
  0x34d399, // verde
  0xf59e0b, // âmbar
  0xf472b6, // rosa
  0xa78bfa, // violeta
  0xfb923c, // laranja
  0x22d3ee, // ciano
  0xe879f9, // fúcsia
];

interface ParticipantCursor {
  group: THREE.Group;
  sphere: THREE.Mesh;
  label: THREE.Sprite;
  colorIndex: number;
}

export class CollaborationPresenceSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  /** cursor 3D por participantId */
  private cursors = new Map<string, ParticipantCursor>();
  private colorCounter = 0;

  /** Canvas compartilhado para gerar texturas de label */
  private labelCanvas: HTMLCanvasElement;
  private labelCtx: CanvasRenderingContext2D;

  /** ID do requestAnimationFrame do loop de broadcast */
  private rafId = 0;
  private lastBroadcast = 0;
  private readonly BROADCAST_HZ = 10; // 10 updates/s

  /** unsubscribe functions do MultiplayerRealtimeService */
  private unsubs: Array<() => void> = [];

  /** participantId local (para ignorar nosso próprio update) */
  private localParticipantId: string | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 256;
    this.labelCanvas.height = 64;
    this.labelCtx = this.labelCanvas.getContext('2d')!;
  }

  /** Inicia broadcast de câmera e subscribe de updates remotos */
  start(): void {
    // Descobrir nosso participantId
    this.localParticipantId =
      MultiplayerRealtimeService.getCurrentParticipant()?.id ?? null;

    // Broadcast loop
    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);
      if (now - this.lastBroadcast < 1000 / this.BROADCAST_HZ) return;
      this.lastBroadcast = now;
      this.broadcastCamera();
    };
    this.rafId = requestAnimationFrame(loop);

    // Receber posições dos outros
    const unsubAvatar = MultiplayerRealtimeService.onAvatarUpdated(
      (participantId, state) => {
        if (participantId === this.localParticipantId) return;
        if (!state?.position) return;

        const name = this.resolveName(participantId);
        this.upsertCursor(participantId, state.position as [number, number, number], name);
      },
    );

    // Remover cursor quando participante sair
    const unsubLeft = MultiplayerRealtimeService.onParticipantLeft(
      (participantId) => this.removeCursor(participantId),
    );

    // Criar cursor quando participante entrar
    const unsubJoined = MultiplayerRealtimeService.onParticipantJoined(
      (participant) => {
        if (participant.id === this.localParticipantId) return;
        // cursor será criado no primeiro avatar_update; aqui só log
        console.log('[Presence] participante entrou:', participant.user.name);
      },
    );

    this.unsubs = [unsubAvatar, unsubLeft, unsubJoined];

    // Sincronizar localParticipantId depois do join (pode ter chegado antes)
    setTimeout(() => {
      this.localParticipantId =
        MultiplayerRealtimeService.getCurrentParticipant()?.id ?? this.localParticipantId;
    }, 1000);
  }

  /** Para e limpa tudo */
  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.cursors.forEach((_, id) => this.removeCursor(id));
  }

  // ─── private ────────────────────────────────────────────────────────────────

  private broadcastCamera(): void {
    const pos = this.camera.position;
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
    try {
      MultiplayerRealtimeService.updateAvatar({
        position: [pos.x, pos.y, pos.z],
        rotation: [euler.x, euler.y, euler.z],
        animation: 'idle',
      });
    } catch {
      // not connected — silently ignore
    }
  }

  private resolveName(participantId: string): string {
    const p = MultiplayerRealtimeService.getParticipants().find(
      (x) => x.id === participantId,
    );
    return p?.user.name ?? participantId.slice(0, 8);
  }

  private upsertCursor(
    participantId: string,
    position: [number, number, number],
    name: string,
  ): void {
    let cursor = this.cursors.get(participantId);

    if (!cursor) {
      cursor = this.createCursor(participantId, name);
      this.cursors.set(participantId, cursor);
      this.scene.add(cursor.group);
    }

    cursor.group.position.set(position[0], position[1], position[2]);

    // Pulso suave: escala o sphere no tempo
    const t = performance.now() / 1000;
    const s = 1 + 0.08 * Math.sin(t * 3 + this.colorCounter);
    cursor.sphere.scale.setScalar(s);

    // Label sempre vira para a câmera (billboard)
    cursor.label.position.set(0, 0.6, 0);
  }

  private createCursor(participantId: string, name: string): ParticipantCursor {
    const colorIndex = this.colorCounter++ % CURSOR_COLORS.length;
    const color = CURSOR_COLORS[colorIndex];

    const group = new THREE.Group();
    group.userData.participantId = participantId;

    // Esfera principal
    const geo = new THREE.SphereGeometry(0.18, 16, 12);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.5,
    });
    const sphere = new THREE.Mesh(geo, mat);
    group.add(sphere);

    // Anel de direção (mostra para onde está "olhando")
    const ringGeo = new THREE.RingGeometry(0.22, 0.28, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.19;
    group.add(ring);

    // Label sprite com nome
    const label = this.makeLabel(name, color);
    label.position.set(0, 0.6, 0);
    label.scale.set(1.2, 0.3, 1);
    group.add(label);

    return { group, sphere, label, colorIndex };
  }

  private makeLabel(name: string, color: number): THREE.Sprite {
    const ctx = this.labelCtx;
    const W = this.labelCanvas.width;
    const H = this.labelCanvas.height;

    ctx.clearRect(0, 0, W, H);

    // Fundo arredondado semitransparente
    const hex = '#' + color.toString(16).padStart(6, '0');
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    this.roundRect(ctx, 4, 8, W - 8, H - 16, 10);
    ctx.fill();

    // Borda colorida
    ctx.strokeStyle = hex;
    ctx.lineWidth = 2;
    this.roundRect(ctx, 4, 8, W - 8, H - 16, 10);
    ctx.stroke();

    // Nome
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.slice(0, 20), W / 2, H / 2);

    const texture = new THREE.CanvasTexture(this.labelCanvas);
    texture.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,   // sempre visível mesmo atrás de paredes
    });
    return new THREE.Sprite(mat);
  }

  private removeCursor(participantId: string): void {
    const cursor = this.cursors.get(participantId);
    if (!cursor) return;
    this.scene.remove(cursor.group);
    // dispose geometries/materials
    cursor.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          (mesh.material as THREE.Material).dispose();
        }
      }
      if ((obj as THREE.Sprite).isSprite) {
        const sprite = obj as THREE.Sprite;
        (sprite.material as THREE.SpriteMaterial).map?.dispose();
        sprite.material.dispose();
      }
    });
    this.cursors.delete(participantId);
  }

  /** Atalho para canvas roundRect (compatível com todos os browsers) */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

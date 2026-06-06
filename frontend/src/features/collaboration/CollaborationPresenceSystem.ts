/**
 * CollaborationPresenceSystem — "Minecraft effect"
 *
 * Features:
 *  1. Camera broadcast  — envia posição/rotação local a 10Hz
 *  2. Remote cursors    — esfera + nameplate flutuante por participante
 *  3. Shared selection  — sync de seleção IFC (laser pointer)
 *  4. Follow mode       — seguir câmera de um participante
 *  5. Entry toast       — notificação animada ao entrar/sair
 */

import * as THREE from 'three';
import { MultiplayerRealtimeService } from '../multiplayer-realtime/multiplayer-realtime.service';
import { selectionService } from '../../inspector/SelectionService';
import { CollaborationToast } from './CollaborationToast';

// ─── Paleta de cores (um por participante) ────────────────────────────────────
const CURSOR_COLORS = [
  0x60a5fa, 0x34d399, 0xf59e0b, 0xf472b6,
  0xa78bfa, 0xfb923c, 0x22d3ee, 0xe879f9,
];

// ─── Tipos internos ───────────────────────────────────────────────────────────
interface ParticipantCursor {
  group: THREE.Group;
  sphere: THREE.Mesh;
  label: THREE.Sprite;
  laser: THREE.Mesh | null; // highlight de seleção
  colorIndex: number;
  name: string;
}

export class CollaborationPresenceSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private cursors = new Map<string, ParticipantCursor>();
  private colorCounter = 0;

  private labelCanvas: HTMLCanvasElement;
  private labelCtx: CanvasRenderingContext2D;

  private rafId = 0;
  private lastBroadcast = 0;
  private readonly BROADCAST_HZ = 10;

  private unsubs: Array<() => void> = [];
  private localParticipantId: string | null = null;

  // ── Follow mode ─────────────────────────────────────────────────────────────
  private followTargetId: string | null = null;
  /** última posição conhecida de cada participante */
  private latestPositions = new Map<string, [number, number, number]>();
  private latestRotations = new Map<string, [number, number, number]>();

  // ── Seleção remota ───────────────────────────────────────────────────────────
  private lastSentSelectionId: string | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 256;
    this.labelCanvas.height = 64;
    this.labelCtx = this.labelCanvas.getContext('2d')!;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  start(): void {
    this.localParticipantId =
      MultiplayerRealtimeService.getCurrentParticipant()?.id ?? null;

    // Re-resolve depois do join confirmar
    setTimeout(() => {
      this.localParticipantId =
        MultiplayerRealtimeService.getCurrentParticipant()?.id ?? this.localParticipantId;
    }, 1200);

    // 1. Broadcast loop (câmera + seleção)
    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);
      if (now - this.lastBroadcast < 1000 / this.BROADCAST_HZ) return;
      this.lastBroadcast = now;
      this.broadcastCamera();
      this.broadcastSelection();
    };
    this.rafId = requestAnimationFrame(loop);

    // 2. Receber posições
    const unsubAvatar = MultiplayerRealtimeService.onAvatarUpdated(
      (participantId, state) => {
        if (participantId === this.localParticipantId) return;
        if (!state?.position) return;
        const pos = state.position as [number, number, number];
        const rot = state.rotation as [number, number, number] | undefined;
        this.latestPositions.set(participantId, pos);
        if (rot) this.latestRotations.set(participantId, rot);

        // Follow mode: mover câmera local
        if (this.followTargetId === participantId && rot) {
          this.camera.position.set(pos[0], pos[1], pos[2]);
          this.camera.rotation.set(rot[0], rot[1], rot[2]);
        }

        const name = this.resolveName(participantId);
        this.upsertCursor(participantId, pos, name);
      },
    );

    // 3. Receber seleção via sync_action
    const unsubAction = MultiplayerRealtimeService.onAction((action: any) => {
      if (action.type !== 'shared_selection') return;
      const { participantId, objectUuid, color } = action;
      if (participantId === this.localParticipantId) return;
      this.highlightRemoteSelection(participantId, objectUuid, color);
    });

    // 4. Participante entrou — toast
    const unsubJoined = MultiplayerRealtimeService.onParticipantJoined((participant) => {
      if (participant.id === this.localParticipantId) return;
      CollaborationToast.show(`👤 ${participant.user.name} entrou na sessão`, 'join');
    });

    // 5. Participante saiu
    const unsubLeft = MultiplayerRealtimeService.onParticipantLeft((participantId) => {
      const name = this.cursors.get(participantId)?.name ?? participantId.slice(0, 8);
      CollaborationToast.show(`👋 ${name} saiu da sessão`, 'leave');
      this.removeCursor(participantId);
      this.latestPositions.delete(participantId);
      this.latestRotations.delete(participantId);
      if (this.followTargetId === participantId) this.stopFollow();
    });

    // 6. Seleção local → broadcast
    const unsubSel = selectionService.onSelectionChanged((payload) => {
      if (!payload) {
        this.lastSentSelectionId = null;
        return;
      }
      this.lastSentSelectionId = payload.object3D.uuid;
    });

    this.unsubs = [unsubAvatar, unsubAction, unsubJoined, unsubLeft, unsubSel];

    // Injetar painel de follow no DOM
    this.mountFollowUI();
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.cursors.forEach((_, id) => this.removeCursor(id));
    document.getElementById('collab-follow-bar')?.remove();
  }

  /** Ativar follow de um participante (chamado externamente ou pelo painel) */
  followParticipant(participantId: string): void {
    this.followTargetId = participantId;
    const name = this.cursors.get(participantId)?.name ?? participantId.slice(0, 8);
    const bar = document.getElementById('collab-follow-bar');
    if (bar) {
      bar.style.display = 'flex';
      bar.querySelector('#collab-follow-name')!.textContent = `📍 Seguindo ${name}`;
    }
    CollaborationToast.show(`📍 Seguindo ${name}`, 'info');
  }

  stopFollow(): void {
    this.followTargetId = null;
    const bar = document.getElementById('collab-follow-bar');
    if (bar) bar.style.display = 'none';
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private broadcastCamera(): void {
    const pos = this.camera.position;
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
    try {
      MultiplayerRealtimeService.updateAvatar({
        position: [pos.x, pos.y, pos.z],
        rotation: [euler.x, euler.y, euler.z],
        animation: 'idle',
      });
    } catch { /* not connected */ }
  }

  private broadcastSelection(): void {
    const sel = selectionService.getSelected();
    const id = sel?.object3D?.uuid ?? null;
    if (id === this.lastSentSelectionId) return; // sem mudança
    this.lastSentSelectionId = id;

    const colorIndex = this.colorCounter % CURSOR_COLORS.length;
    const color = '#' + CURSOR_COLORS[colorIndex].toString(16).padStart(6, '0');
    try {
      MultiplayerRealtimeService.syncAction({
        type: 'shared_selection' as any,
        participantId: this.localParticipantId,
        objectUuid: id,
        color,
      } as any);
    } catch { /* not connected */ }
  }

  private highlightRemoteSelection(
    participantId: string,
    objectUuid: string | null,
    color: string,
  ): void {
    const cursor = this.cursors.get(participantId);

    // Remover laser anterior
    if (cursor?.laser) {
      this.scene.remove(cursor.laser);
      (cursor.laser.material as THREE.Material).dispose();
      cursor.laser.geometry.dispose();
      cursor.laser = null;
    }

    if (!objectUuid) return;

    // Encontrar o objeto na cena pelo uuid
    let target: THREE.Object3D | null = null;
    this.scene.traverse((obj) => {
      if (obj.uuid === objectUuid) target = obj;
    });
    if (!target) return;

    // Criar bounding box highlight (wireframe colorido)
    const box = new THREE.Box3().setFromObject(target as THREE.Object3D);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const laser = new THREE.Mesh(geo, mat);
    laser.position.copy(center);
    this.scene.add(laser);

    if (cursor) cursor.laser = laser;
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
    const t = performance.now() / 1000;
    cursor.sphere.scale.setScalar(1 + 0.08 * Math.sin(t * 3 + cursor.colorIndex));
  }

  private createCursor(participantId: string, name: string): ParticipantCursor {
    const colorIndex = this.colorCounter++ % CURSOR_COLORS.length;
    const color = CURSOR_COLORS[colorIndex];
    const group = new THREE.Group();
    group.userData.participantId = participantId;

    // Esfera
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.4,
        roughness: 0.3, metalness: 0.5,
      }),
    );
    group.add(sphere);

    // Anel de sombra no chão
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.28, 24),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.19;
    group.add(ring);

    // Label
    const label = this.makeLabel(name, color);
    label.position.set(0, 0.6, 0);
    label.scale.set(1.2, 0.3, 1);
    group.add(label);

    // Click para follow
    group.userData.onClick = () => this.followParticipant(participantId);

    return { group, sphere, label, laser: null, colorIndex, name };
  }

  private makeLabel(name: string, color: number): THREE.Sprite {
    const ctx = this.labelCtx;
    const W = 256, H = 64;
    ctx.clearRect(0, 0, W, H);
    const hex = '#' + color.toString(16).padStart(6, '0');
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    this.roundRect(ctx, 4, 8, W - 8, H - 16, 10); ctx.fill();
    ctx.strokeStyle = hex; ctx.lineWidth = 2;
    this.roundRect(ctx, 4, 8, W - 8, H - 16, 10); ctx.stroke();
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 22px Inter,system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name.slice(0, 20), W / 2, H / 2);

    const tex = new THREE.CanvasTexture(this.labelCanvas);
    tex.needsUpdate = true;
    return new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
    );
  }

  private removeCursor(participantId: string): void {
    const cursor = this.cursors.get(participantId);
    if (!cursor) return;
    if (cursor.laser) this.scene.remove(cursor.laser);
    this.scene.remove(cursor.group);
    cursor.group.traverse((obj) => {
      if ((obj as any).isMesh || (obj as any).isSprite) {
        const m = obj as any;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((x: any) => x?.dispose());
        else { m.material?.map?.dispose(); m.material?.dispose(); }
      }
    });
    this.cursors.delete(participantId);
  }

  private resolveName(participantId: string): string {
    const p = MultiplayerRealtimeService.getParticipants().find((x) => x.id === participantId);
    return p?.user.name ?? participantId.slice(0, 8);
  }

  // ─── Follow UI ───────────────────────────────────────────────────────────────

  private mountFollowUI(): void {
    if (document.getElementById('collab-follow-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'collab-follow-bar';
    bar.style.cssText = `
      display:none; position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      background:rgba(15,23,42,0.92); border:1px solid #3b82f6; color:#f1f5f9;
      border-radius:99px; padding:8px 20px 8px 14px; gap:10px; align-items:center;
      font-size:13px; font-weight:500; z-index:9999; backdrop-filter:blur(8px);
      box-shadow:0 4px 24px rgba(0,0,0,0.4);
    `;
    bar.innerHTML = `
      <span id="collab-follow-name">📍 Seguindo...</span>
      <button id="collab-follow-stop" style="
        background:#1e40af; border:none; color:#fff; border-radius:99px;
        padding:3px 10px; cursor:pointer; font-size:12px;
      ">Parar</button>
    `;
    document.body.appendChild(bar);
    document.getElementById('collab-follow-stop')!.addEventListener('click', () => this.stopFollow());
  }

  // ─── Canvas util ─────────────────────────────────────────────────────────────

  private roundRect(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }
}

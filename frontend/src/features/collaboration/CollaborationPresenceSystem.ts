/**
 * CollaborationPresenceSystem — "Minecraft effect"
 *
 * Features:
 *  1. Camera broadcast  — envia posição/rotação local a 10Hz
 *  2. Remote cursors    — esfera + nameplate flutuante por participante
 *  3. Shared selection  — sync de seleção IFC (laser pointer)
 *  4. Follow mode       — seguir câmera de um participante (lerp/slerp)
 *  5. Entry toast       — notificação animada ao entrar/sair
 *  6. Vision cone       — frustum wireframe indicando direção do olhar
 *  7. Ping animado      — double-click emite pulso esférico
 *  8. Participants list — painel lateral com lista + botão follow
 *
 * Optimizations (v2):
 *  P1  — Stable per-participant color mapping
 *  P2  — Smooth follow mode (lerp/slerp instead of teleport)
 *  P3  — DOM list updates only on join/leave/follow
 *  P4  — Individual canvas per label (no shared texture leak)
 *  P5  — Optimized raycasting (no scene.traverse on dblclick)
 *  P6  — Vision cone geometry pre-oriented
 *  P7  — Remote cursor interpolation at render framerate
 *  P8  — Stale participant timeout (15s)
 *  P9  — Coordinate compression (×100 int encoding)
 *  P10 — Event delegation (no window.__collabPresence)
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

// ─── Coordenadas comprimidas (P9) ─────────────────────────────────────────────
const COORD_SCALE = 100;
function compressCoords(v: [number, number, number]): [number, number, number] {
  return [
    Math.round(v[0] * COORD_SCALE),
    Math.round(v[1] * COORD_SCALE),
    Math.round(v[2] * COORD_SCALE),
  ];
}
function decompressCoords(v: [number, number, number]): [number, number, number] {
  return [v[0] / COORD_SCALE, v[1] / COORD_SCALE, v[2] / COORD_SCALE];
}

// ─── Tipos internos ───────────────────────────────────────────────────────────
interface ParticipantCursor {
  group: THREE.Group;
  sphere: THREE.Mesh;
  label: THREE.Sprite;
  cone: THREE.Mesh;
  laser: THREE.Mesh | null;
  colorIndex: number;
  name: string;
  lastSeen: number;                             // P8 — timestamp da última atualização
  targetPosition: THREE.Vector3;                // P7 — posição alvo para interpolação
  targetQuaternion: THREE.Quaternion;           // P7 — rotação alvo para interpolação
}

// ─── Stale timeout (P8) ───────────────────────────────────────────────────────
const STALE_TIMEOUT_MS = 15_000;

// ─── Interpolação (P2/P7) ─────────────────────────────────────────────────────
const CURSOR_LERP_FACTOR = 0.15;
const FOLLOW_LERP_FACTOR = 0.15;

export class CollaborationPresenceSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private cursors = new Map<string, ParticipantCursor>();

  // P1 — Cores estáveis por participante
  private participantColors = new Map<string, number>();
  private colorCounter = 0;

  private rafId = 0;
  private lastBroadcast = 0;
  private readonly BROADCAST_HZ = 10;

  private unsubs: Array<() => void> = [];
  private localParticipantId: string | null = null;

  // ── Follow mode ─────────────────────────────────────────────────────────────
  private followTargetId: string | null = null;
  private followTargetPos = new THREE.Vector3();
  private followTargetQuat = new THREE.Quaternion();
  private followSnapped = false; // snap na primeira atualização

  // ── Seleção remota ───────────────────────────────────────────────────────────
  private lastSentSelectionId: string | null = null;

  // ── Pings ativos ─────────────────────────────────────────────────────────────
  private activePings: Array<{ mesh: THREE.Mesh; startTime: number }> = [];

  // ── Dblclick handler ref para cleanup ────────────────────────────────────────
  private dblclickHandler: ((ev: MouseEvent) => void) | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  start(): void {
    this.localParticipantId =
      MultiplayerRealtimeService.getCurrentParticipant()?.id ?? null;

    setTimeout(() => {
      this.localParticipantId =
        MultiplayerRealtimeService.getCurrentParticipant()?.id ?? this.localParticipantId;
    }, 1200);

    // Unified render + broadcast loop (P2/P7)
    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);

      // ── Broadcast a 10Hz ──
      if (now - this.lastBroadcast >= 1000 / this.BROADCAST_HZ) {
        this.lastBroadcast = now;
        this.broadcastCamera();
        this.broadcastSelection();
      }

      // ── Interpolação de cursores remotos a cada frame (P7) ──
      this.cursors.forEach((cursor) => {
        cursor.group.position.lerp(cursor.targetPosition, CURSOR_LERP_FACTOR);
        cursor.cone.quaternion.slerp(cursor.targetQuaternion, CURSOR_LERP_FACTOR);

        // Respiração da esfera
        const t = now / 1000;
        cursor.sphere.scale.setScalar(1 + 0.08 * Math.sin(t * 3 + cursor.colorIndex));
      });

      // ── Follow mode interpolado (P2) ──
      if (this.followTargetId) {
        this.camera.position.lerp(this.followTargetPos, FOLLOW_LERP_FACTOR);
        this.camera.quaternion.slerp(this.followTargetQuat, FOLLOW_LERP_FACTOR);
      }

      // ── Ping animations ──
      this.updatePings(now);

      // ── Stale participant cleanup (P8) ──
      this.cleanupStaleCursors(now);
    };
    this.rafId = requestAnimationFrame(loop);

    // 2. Receber posições
    const unsubAvatar = MultiplayerRealtimeService.onAvatarUpdated(
      (participantId, state) => {
        if (participantId === this.localParticipantId) return;
        if (!state?.position) return;

        // P9 — Decompress incoming coordinates
        const rawPos = state.position as [number, number, number];
        const rawRot = state.rotation as [number, number, number] | undefined;
        const pos = decompressCoords(rawPos);
        const rot = rawRot ? decompressCoords(rawRot) : undefined;

        // P2 — Atualizar targets do follow (sem setar câmera diretamente)
        if (this.followTargetId === participantId && rot) {
          this.followTargetPos.set(pos[0], pos[1], pos[2]);
          this.followTargetQuat.setFromEuler(
            new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ'),
          );

          // Snap na primeira vez para evitar lerp do 0,0,0
          if (!this.followSnapped) {
            this.followSnapped = true;
            this.camera.position.copy(this.followTargetPos);
            this.camera.quaternion.copy(this.followTargetQuat);
          }
        }

        const name = this.resolveName(participantId);
        this.upsertCursor(participantId, pos, rot, name);
        // P3 — NÃO chamar updateParticipantsList aqui (10Hz × N participantes)
      },
    );

    // 3. Seleção remota
    const unsubAction = MultiplayerRealtimeService.onAction((action: any) => {
      if (action.type === 'shared_selection') {
        const { participantId, objectUuid, color } = action;
        if (participantId !== this.localParticipantId)
          this.highlightRemoteSelection(participantId, objectUuid, color);
      }
      if (action.type === 'ping') {
        if (action.participantId === this.localParticipantId) return;
        const [x, y, z] = action.position || [0, 0, 0];
        const color = parseInt((action.color || '#60a5fa').replace('#', ''), 16);
        this.emitPing(new THREE.Vector3(x, y, z), color);
      }
    });

    // 4. Participante entrou (P3 — atualizar lista aqui)
    const unsubJoined = MultiplayerRealtimeService.onParticipantJoined((participant) => {
      if (participant.id === this.localParticipantId) return;
      CollaborationToast.show(`👤 ${participant.user.name} entrou na sessão`, 'join');
      this.updateParticipantsList();
    });

    // 5. Participante saiu (P3 — atualizar lista aqui)
    const unsubLeft = MultiplayerRealtimeService.onParticipantLeft((participantId) => {
      const name = this.cursors.get(participantId)?.name ?? participantId.slice(0, 8);
      CollaborationToast.show(`👋 ${name} saiu da sessão`, 'leave');
      this.removeCursor(participantId);
      if (this.followTargetId === participantId) this.stopFollow();
      this.updateParticipantsList();
    });

    // 6. Seleção local
    const unsubSel = selectionService.onSelectionChanged((payload) => {
      this.lastSentSelectionId = payload?.object3D?.uuid ?? null;
    });

    this.unsubs = [unsubAvatar, unsubAction, unsubJoined, unsubLeft, unsubSel];

    this.mountFollowUI();
    this.mountParticipantsList();
    this.mountPingListener();
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.cursors.forEach((_, id) => this.removeCursor(id));
    this.participantColors.clear();
    document.getElementById('collab-follow-bar')?.remove();

    // P10 — Remove panel with delegated listener
    const panel = document.getElementById('collab-participants-panel');
    panel?.remove();

    // Cleanup dblclick
    if (this.dblclickHandler) {
      document.querySelector('canvas')?.removeEventListener('dblclick', this.dblclickHandler);
      this.dblclickHandler = null;
    }

    this.activePings.forEach(({ mesh }) => {
      this.scene.remove(mesh);
      (mesh.material as THREE.Material).dispose();
      mesh.geometry.dispose();
    });
    this.activePings = [];
  }

  followParticipant(participantId: string): void {
    this.followTargetId = participantId;
    this.followSnapped = false; // será snapped na próxima atualização
    const name = this.cursors.get(participantId)?.name ?? participantId.slice(0, 8);
    const bar = document.getElementById('collab-follow-bar');
    if (bar) {
      bar.style.display = 'flex';
      bar.querySelector('#collab-follow-name')!.textContent = `📍 Seguindo ${name}`;
    }
    const vh = (window as any).__viewerHost;
    if (vh?.fpsControls) vh.fpsControls.setEnabled(false);
    if (vh?.droneControls) vh.droneControls.setEnabled(false);
    CollaborationToast.show(`📍 Seguindo ${name}`, 'info');
    this.updateParticipantsList(); // P3 — chamada discreta OK
  }

  stopFollow(): void {
    this.followTargetId = null;
    this.followSnapped = false;
    const bar = document.getElementById('collab-follow-bar');
    if (bar) bar.style.display = 'none';
    const vh = (window as any).__viewerHost;
    if (vh?.fpsControls) vh.fpsControls.setEnabled(true);
    this.updateParticipantsList(); // P3 — chamada discreta OK
  }

  // ─── Ping animado ─────────────────────────────────────────────────────────────

  emitPing(position: THREE.Vector3, color = 0x60a5fa): void {
    const geo = new THREE.SphereGeometry(0.15, 16, 10);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.8, side: THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.activePings.push({ mesh, startTime: performance.now() });
  }

  private updatePings(now: number): void {
    const DURATION = 800;
    this.activePings = this.activePings.filter(({ mesh, startTime }) => {
      const elapsed = now - startTime;
      if (elapsed >= DURATION) {
        this.scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
        mesh.geometry.dispose();
        return false;
      }
      const t = elapsed / DURATION;
      mesh.scale.setScalar(1 + t * 8);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8;
      return true;
    });
  }

  private mountPingListener(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    this.dblclickHandler = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, this.camera);

      // P5 — Usar intersectObjects com recursive=true em vez de scene.traverse
      const hits = raycaster.intersectObjects(this.scene.children, true);
      const point = hits.length > 0
        ? hits[0].point.clone()
        : raycaster.ray.at(5, new THREE.Vector3());

      // P1 — Cor consistente
      const colorIndex = this.getParticipantColorIndex(this.localParticipantId || '__local__');
      this.emitPing(point, CURSOR_COLORS[colorIndex]);

      try {
        MultiplayerRealtimeService.syncAction({
          type: 'ping' as any,
          participantId: this.localParticipantId,
          position: [point.x, point.y, point.z],
          color: '#' + CURSOR_COLORS[colorIndex].toString(16).padStart(6, '0'),
        } as any);
      } catch { /* not connected */ }
    };

    canvas.addEventListener('dblclick', this.dblclickHandler);
  }

  // ─── P8 — Stale participant cleanup ─────────────────────────────────────────

  private cleanupStaleCursors(now: number): void {
    this.cursors.forEach((cursor, id) => {
      if (now - cursor.lastSeen > STALE_TIMEOUT_MS) {
        const name = cursor.name;
        CollaborationToast.show(`⏱️ ${name} desconectou (timeout)`, 'leave');
        this.removeCursor(id);
        if (this.followTargetId === id) this.stopFollow();
        this.updateParticipantsList();
      }
    });
  }

  // ─── P1 — Cor estável por participante ──────────────────────────────────────

  private getParticipantColorIndex(participantId: string): number {
    let idx = this.participantColors.get(participantId);
    if (idx === undefined) {
      idx = this.colorCounter++ % CURSOR_COLORS.length;
      this.participantColors.set(participantId, idx);
    }
    return idx;
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private broadcastCamera(): void {
    const pos = this.camera.position;
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion);

    // P9 — Comprimir coordenadas
    const compPos = compressCoords([pos.x, pos.y, pos.z]);
    const compRot = compressCoords([euler.x, euler.y, euler.z]);

    try {
      MultiplayerRealtimeService.updateAvatar({
        position: compPos,
        rotation: compRot,
        animation: 'idle',
      });
    } catch { /* not connected */ }
  }

  private broadcastSelection(): void {
    const sel = selectionService.getSelected();
    const id = sel?.object3D?.uuid ?? null;
    if (id === this.lastSentSelectionId) return;
    this.lastSentSelectionId = id;

    // P1 — Cor consistente
    const colorIndex = this.getParticipantColorIndex(this.localParticipantId || '__local__');
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

    if (cursor?.laser) {
      this.scene.remove(cursor.laser);
      (cursor.laser.material as THREE.Material).dispose();
      cursor.laser.geometry.dispose();
      cursor.laser = null;
    }

    if (!objectUuid) return;

    // P5 — Usar getObjectByProperty em vez de scene.traverse
    const target = this.scene.getObjectByProperty('uuid', objectUuid);
    if (!target) return;

    const box = new THREE.Box3().setFromObject(target);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const laser = new THREE.Mesh(
      new THREE.BoxGeometry(size.x, size.y, size.z),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color), wireframe: true, transparent: true, opacity: 0.8 }),
    );
    laser.position.copy(center);
    this.scene.add(laser);
    if (cursor) cursor.laser = laser;
  }

  private upsertCursor(
    participantId: string,
    position: [number, number, number],
    rotation: [number, number, number] | undefined,
    name: string,
  ): void {
    let cursor = this.cursors.get(participantId);
    if (!cursor) {
      cursor = this.createCursor(participantId, name);
      this.cursors.set(participantId, cursor);
      this.scene.add(cursor.group);
    }

    // P7 — Atualizar posição alvo (interpolação feita no loop principal)
    cursor.targetPosition.set(position[0], position[1], position[2]);
    cursor.lastSeen = performance.now(); // P8

    // P6/P7 — Atualizar rotação alvo do cone
    if (rotation) {
      cursor.targetQuaternion.setFromEuler(
        new THREE.Euler(rotation[0], rotation[1], rotation[2], 'YXZ'),
      );
    }
  }

  private createCursor(participantId: string, name: string): ParticipantCursor {
    // P1 — Cor estável
    const colorIndex = this.getParticipantColorIndex(participantId);
    const color = CURSOR_COLORS[colorIndex];
    const group = new THREE.Group();
    group.userData.participantId = participantId;

    // Esfera principal
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.5 }),
    );
    group.add(sphere);

    // Anel de sombra
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.28, 24),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.19;
    group.add(ring);

    // P6 — Cone de visão pré-orientado na geometria
    const coneGeo = new THREE.ConeGeometry(0.30, 0.80, 8, 1, true);
    coneGeo.translate(0, -0.4, 0);     // Centro na ponta
    coneGeo.rotateX(-Math.PI / 2);     // Apontar para frente (+Z)
    const cone = new THREE.Mesh(
      coneGeo,
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.35 }),
    );
    // P6 — Sem offset de posição; cone fica no centro do grupo
    group.add(cone);

    // P4 — Canvas individual por label
    const label = this.makeLabel(name, color);
    label.position.set(0, 0.6, 0);
    label.scale.set(1.2, 0.3, 1);
    group.add(label);

    return {
      group, sphere, label, cone, laser: null, colorIndex, name,
      lastSeen: performance.now(),
      targetPosition: new THREE.Vector3(),
      targetQuaternion: new THREE.Quaternion(),
    };
  }

  // P4 — Canvas individual (sem this.labelCanvas compartilhado)
  private makeLabel(name: string, color: number): THREE.Sprite {
    const W = 256, H = 64;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const hex = '#' + color.toString(16).padStart(6, '0');
    ctx.fillStyle = 'rgba(15,23,42,0.85)';
    this.roundRect(ctx, 4, 8, W - 8, H - 16, 10); ctx.fill();
    ctx.strokeStyle = hex; ctx.lineWidth = 2;
    this.roundRect(ctx, 4, 8, W - 8, H - 16, 10); ctx.stroke();
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 22px Inter,system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name.slice(0, 20), W / 2, H / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
    );
  }

  private removeCursor(participantId: string): void {
    const cursor = this.cursors.get(participantId);
    if (!cursor) return;
    if (cursor.laser) {
      this.scene.remove(cursor.laser);
      (cursor.laser.material as THREE.Material).dispose();
      cursor.laser.geometry.dispose();
    }
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
    // Não remover da participantColors para manter cor estável se reconectar
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

  // ─── Lista de participantes ────────────────────────────────────────────────

  private mountParticipantsList(): void {
    if (document.getElementById('collab-participants-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'collab-participants-panel';
    panel.style.cssText = `
      position:fixed; top:80px; right:16px; z-index:9998;
      background:rgba(15,23,42,0.90); border:1px solid rgba(255,255,255,0.08);
      border-radius:14px; padding:12px 14px; min-width:180px; max-width:220px;
      backdrop-filter:blur(12px); box-shadow:0 8px 32px rgba(0,0,0,0.4);
      font-size:12.5px; color:#f1f5f9; font-family:Inter,system-ui,sans-serif;
    `;
    panel.innerHTML = `
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#64748b;text-transform:uppercase;margin-bottom:8px;">
        Participantes
      </div>
      <div id="collab-participants-list" style="display:flex;flex-direction:column;gap:6px;"></div>
    `;
    document.body.appendChild(panel);

    // P10 — Delegação de eventos: escutar cliques no panel, não expor instância
    panel.addEventListener('click', (ev) => {
      const btn = (ev.target as HTMLElement).closest('[data-follow]') as HTMLElement | null;
      if (!btn) return;
      const pid = btn.getAttribute('data-follow')!;
      if (this.followTargetId === pid) {
        this.stopFollow();
      } else {
        this.followParticipant(pid);
      }
    });

    this.updateParticipantsList();
  }

  private updateParticipantsList(): void {
    const list = document.getElementById('collab-participants-list');
    if (!list) return;

    const participants = MultiplayerRealtimeService.getParticipants()
      .filter(p => p.id !== this.localParticipantId);

    if (!participants.length) {
      list.innerHTML = '<div style="color:#475569;font-size:12px;">Nenhum outro participante</div>';
      return;
    }

    list.innerHTML = participants.map((p) => {
      // P1 — Cor estável via mapa
      const colorIndex = this.getParticipantColorIndex(p.id);
      const hex = '#' + CURSOR_COLORS[colorIndex].toString(16).padStart(6, '0');
      const name = p.user?.name || p.id.slice(0, 8);
      const isFollowing = this.followTargetId === p.id;

      // P10 — Usar data-follow em vez de onclick=window.__collabPresence
      return `
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="
            width:26px;height:26px;border-radius:50%;background:${hex};
            display:flex;align-items:center;justify-content:center;
            font-size:10px;font-weight:700;color:#fff;flex-shrink:0;
          ">${name.slice(0, 2).toUpperCase()}</div>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;">${name}</span>
          <button
            data-follow="${p.id}"
            style="
              background:${isFollowing ? '#1e40af' : 'rgba(255,255,255,0.08)'};
              border:1px solid ${isFollowing ? '#3b82f6' : 'rgba(255,255,255,0.12)'};
              color:${isFollowing ? '#fff' : '#94a3b8'};
              border-radius:6px;padding:3px 7px;cursor:pointer;font-size:11px;
              font-family:inherit;white-space:nowrap;
            "
          >${isFollowing ? '📍' : 'Follow'}</button>
        </div>
      `;
    }).join('');
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

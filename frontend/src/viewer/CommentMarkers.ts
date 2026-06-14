import * as THREE from 'three';
import { CommentsAPIService, ElementComment } from '../api/v1/services/comments.service';
import type { ViewerHost } from './ViewerHost';

export class CommentMarkers {
  private viewerHost: ViewerHost;
  private group: THREE.Group;
  private comments: ElementComment[] = [];
  private projectId: string = '';
  private clickHandler: (e: MouseEvent) => void;

  constructor(viewerHost: THREE.Object3D | ViewerHost) {
    // Standard signature: constructor(viewerHost: ViewerHost)
    // Handle mock/headless testing where Object3D might be passed
    if ((viewerHost as any).scene) {
      this.viewerHost = viewerHost as ViewerHost;
      this.group = new THREE.Group();
      this.group.name = 'comment-markers';
      this.viewerHost.scene.add(this.group);
      this.projectId = localStorage.getItem('arxisvr_project_id') || '';

      this.clickHandler = this.handleClick.bind(this);
      this.viewerHost.renderer.domElement.addEventListener('click', this.clickHandler);
    } else {
      // Mock mode
      this.viewerHost = {} as any;
      this.group = new THREE.Group();
      this.clickHandler = () => {};
    }
  }

  /**
   * Refreshes the markers by querying the comment API
   */
  async refresh(): Promise<void> {
    if (!this.projectId) {
      this.projectId = localStorage.getItem('arxisvr_project_id') || '';
      if (!this.projectId) return;
    }

    try {
      const list = await CommentsAPIService.list(this.projectId);
      this.updateMarkers(list);
    } catch (err) {
      console.error('Failed to load comment markers:', err);
    }
  }

  /**
   * Updates sprites inside the markers group
   */
  public updateMarkers(comments: ElementComment[]): void {
    // Clear old markers
    while (this.group.children.length > 0) {
      const child = this.group.children[0] as THREE.Sprite;
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
      this.group.remove(child);
    }

    this.comments = comments;

    for (const comment of comments) {
      let position: THREE.Vector3 | null = null;

      // 1. Primary Anchor: find element center in scene by globalId
      if (comment.globalId && this.viewerHost.scene) {
        let foundObject: THREE.Object3D | null = null;
        this.viewerHost.scene.traverse((child) => {
          if (foundObject) return;
          if (
            (child.userData as any)?.globalId === comment.globalId ||
            (child.userData as any)?.ifcGuid === comment.globalId ||
            child.name === comment.globalId
          ) {
            foundObject = child;
          }
        });

        if (foundObject) {
          const box = new THREE.Box3().setFromObject(foundObject);
          if (!box.isEmpty()) {
            position = new THREE.Vector3();
            box.getCenter(position);
          }
        }
      }

      // 2. Fallback Anchor: use stored worldPosition coordinates
      if (!position && comment.worldPosition) {
        position = new THREE.Vector3(
          comment.worldPosition.x,
          comment.worldPosition.y,
          comment.worldPosition.z
        );
      }

      if (position) {
        const sprite = this.createMarkerSprite(comment);
        sprite.position.copy(position);
        sprite.userData = { commentId: comment.id, globalId: comment.globalId };
        this.group.add(sprite);
      }
    }
  }

  /**
   * Creates a canvas-rendered sprite with a map-pin design
   */
  private createMarkerSprite(comment: ElementComment): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Circle drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 4;

    // Pin body fill color (Resolved = grayish/greenish, Unresolved = vibrant purple)
    ctx.fillStyle = comment.isResolved ? '#10b981' : '#7c3aed';

    // Draw bubble
    ctx.beginPath();
    ctx.arc(32, 24, 18, 0, Math.PI * 2);
    ctx.fill();

    // Draw tail
    ctx.beginPath();
    ctx.moveTo(32 - 10, 24 + 10);
    ctx.lineTo(32, 54);
    ctx.lineTo(32 + 10, 24 + 10);
    ctx.fill();

    // Draw inner icon
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(comment.isResolved ? '✓' : '💬', 32, 24);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.5, 1.5, 1.0);
    return sprite;
  }

  /**
   * Listens to mouse clicks on the canvas and performs raycast check against marker sprites
   */
  private handleClick(e: MouseEvent): void {
    if (!this.viewerHost.renderer || !this.viewerHost.camera) return;

    const rect = this.viewerHost.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.viewerHost.camera);
    const intersects = raycaster.intersectObjects(this.group.children);

    if (intersects.length > 0) {
      const hitSprite = intersects[0].object as THREE.Sprite;
      const { commentId, globalId } = hitSprite.userData;
      if (commentId) {
        // Dispatch event to notify lateral CommentPanel
        window.dispatchEvent(
          new CustomEvent('comment-marker-clicked', {
            detail: { commentId, globalId },
          })
        );
      }
    }
  }

  /**
   * Destroy resources
   */
  public destroy(): void {
    if (this.viewerHost?.renderer?.domElement && this.clickHandler) {
      this.viewerHost.renderer.domElement.removeEventListener('click', this.clickHandler);
    }
    if (this.group && this.viewerHost?.scene) {
      this.viewerHost.scene.remove(this.group);
      while (this.group.children.length > 0) {
        const child = this.group.children[0] as THREE.Sprite;
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
        this.group.remove(child);
      }
    }
  }
}

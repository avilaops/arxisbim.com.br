/**
 * Exemplo: Como criar um sistema customizado
 * 
 * Este exemplo mostra como criar um sistema que gerencia partículas
 */

import { ISystem, EngineContext } from "../types";
import * as THREE from "three";

/**
 * ParticleSystem - Sistema de partículas customizado
 * 
 * Responsabilidades:
 * - Gerenciar pool de partículas
 * - Atualizar física de partículas
 * - Renderizar efeitos visuais
 */
export class ParticleSystem implements ISystem {
  readonly name = "ParticleSystem";
  enabled = true;

  private particles: THREE.Points[] = [];
  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.PointsMaterial;

  /**
   * init() - Inicialização única
   * Chamado uma vez quando engine.init() é executado
   */
  init(ctx: EngineContext): void {
    console.log(`[${this.name}] Initializing...`);

    // Criar geometria de partículas
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1000 * 3);
    
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = Math.random() * 100 - 50;
      positions[i * 3 + 1] = Math.random() * 100 - 50;
      positions[i * 3 + 2] = Math.random() * 100 - 50;
    }
    
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Criar material
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.6
    });

    console.log(`[${this.name}] Initialized with 1000 particles`);
  }

  /**
   * start() - Preparação antes do loop
   * Chamado uma vez quando engine.start() é executado
   */
  start(ctx: EngineContext): void {
    console.log(`[${this.name}] Starting...`);
    
    // Escutar eventos do EventBus
    ctx.eventBus.on('particle:spawn', (data: any) => {
      this.spawnParticle(ctx, data.position);
    });
  }

  /**
   * update() - Loop principal
   * Chamado todo frame com delta time
   */
  update(ctx: EngineContext, dt: number): void {
    // Atualizar física de partículas
    for (const particle of this.particles) {
      particle.rotation.y += dt * 0.5;
      particle.position.y += Math.sin(performance.now() * 0.001) * dt;
    }

    // Remover partículas antigas (exemplo)
    this.particles = this.particles.filter((particle) => {
      const age = performance.now() - (particle.userData.spawnTime || 0);
      if (age > 5000) { // 5 segundos
        ctx.scene.remove(particle);
        return false;
      }
      return true;
    });
  }

  /**
   * lateUpdate() - Após update de todos os sistemas
   * Útil para ajustes finais antes do render
   */
  lateUpdate?(ctx: EngineContext, dt: number): void {
    // Ajustar opacidade baseado na câmera
    for (const particle of this.particles) {
      const distance = particle.position.distanceTo(ctx.camera.position);
      this.particleMaterial.opacity = Math.max(0, 1 - distance / 100);
    }
  }

  /**
   * dispose() - Limpeza
   * Chamado quando engine.dispose() é executado
   */
  dispose(ctx: EngineContext): void {
    console.log(`[${this.name}] Disposing...`);

    // Remover todas as partículas
    for (const particle of this.particles) {
      ctx.scene.remove(particle);
    }
    this.particles = [];

    // Limpar geometria e material
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();

    console.log(`[${this.name}] Disposed`);
  }

  // Métodos auxiliares privados

  private spawnParticle(ctx: EngineContext, position: THREE.Vector3): void {
    const particle = new THREE.Points(this.particleGeometry, this.particleMaterial);
    particle.position.copy(position);
    particle.userData.spawnTime = performance.now();
    
    ctx.scene.add(particle);
    this.particles.push(particle);
  }
}

/**
 * COMO USAR:
 * 
 * 1. Importar o sistema:
 *    import { ParticleSystem } from './engine/systems/ParticleSystem';
 * 
 * 2. Adicionar à engine:
 *    engine.addSystem(new ParticleSystem());
 * 
 * 3. Spawnar partículas via EventBus:
 *    eventBus.emit('particle:spawn', { position: new THREE.Vector3(0, 0, 0) });
 * 
 * 4. Controlar ativação:
 *    particleSystem.enabled = false; // Desabilita temporariamente
 */

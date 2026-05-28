/**
 * Sistema de demonstração dos recursos core implementados
 * Mostra todos os sistemas funcionando (Georeferencing, IFC 4.3, ISO 19650, etc.)
 */

import { georeferencing } from '../engine/GeoreferencingSystem';
import { openBIM } from '../engine/OpenBIMSystem';
import { versioning } from '../engine/VersioningSystem';
import { metricPrecision } from '../engine/MetricPrecisionSystem';
import { ifc43AlignmentSystem } from '../loaders/IFC43Extensions';
import * as THREE from 'three';

export class CoreSystemsDemo {
  constructor() {
    console.log('🎯 Core Systems Demo initialized');
  }

  /**
   * Demonstra sistema de georreferenciamento
   */
  public demoGeoreferencing(): void {
    console.log('\n🌍 === GEOREFERENCING SYSTEM DEMO ===');

    // Define origem (São Paulo - Av. Paulista)
    georeferencing.setOrigin({
      geographic: {
        latitude: -23.5617,
        longitude: -46.6560,
        altitude: 850
      },
      local: { x: 0, y: 0, z: 0 },
      rotation: 0
    });

    // Converte ponto geográfico para local
    const local = georeferencing.geographicToLocal({
      latitude: -23.5620,
      longitude: -46.6565,
      altitude: 855
    });

    console.log('📍 Coordinate conversion:');
    console.log(`  Geographic: 23.5620°S, 46.6565°W, 855m`);
    console.log(`  Local: (${local.x.toFixed(2)}, ${local.y.toFixed(2)}, ${local.z.toFixed(2)}) meters`);

    // Calcula distância entre dois pontos
    const distance = georeferencing.geographicDistance(
      { latitude: -23.5617, longitude: -46.6560, altitude: 850 },
      { latitude: -23.5620, longitude: -46.6565, altitude: 855 }
    );

    console.log(`📏 Distance: ${distance.toFixed(2)}m`);

    // Calcula bearing
    const bearing = georeferencing.bearing(
      { latitude: -23.5617, longitude: -46.6560, altitude: 850 },
      { latitude: -23.5620, longitude: -46.6565, altitude: 855 }
    );

    console.log(`🧭 Bearing: ${bearing.toFixed(2)}° (${this.getBearingDirection(bearing)})`);

    // Formata em DMS
    const dms = georeferencing.formatDMS({
      latitude: -23.5617,
      longitude: -46.6560,
      altitude: 850
    });
    console.log(`📐 DMS Format: ${dms}`);
  }

  /**
   * Demonstra sistema de precisão métrica
   */
  public demoMetricPrecision(): void {
    console.log('\n📏 === METRIC PRECISION SYSTEM DEMO ===');

    // Distância
    const dist = metricPrecision.distance({ x: 0, y: 0, z: 0 }, { x: 10.5678, y: 5.1234, z: 3.9876 });
    console.log(`📏 Distance: ${metricPrecision.formatDistance(dist)}`);

    // Área de polígono
    const polygon = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 8 },
      { x: 0, y: 8 }
    ];
    const area = metricPrecision.polygonArea(polygon);
    console.log(`📐 Area: ${metricPrecision.formatArea(area)}`);

    // Volume
    const bbox = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 3, 2.5)
    );
    const volume = metricPrecision.boundingBoxVolume(bbox);
    console.log(`📦 Volume: ${metricPrecision.formatVolume(volume)}`);

    // Comparação com tolerância
    const equal = metricPrecision.equals(10.0005, 10.0008);
    console.log(`🔍 10.0005m ≈ 10.0008m? ${equal ? 'YES' : 'NO'} (tolerance: 1mm)`);
  }

  /**
   * Demonstra sistema ISO 19650
   */
  public demoISO19650(): void {
    console.log('\n📋 === ISO 19650 COMPLIANCE DEMO ===');

    // Configura projeto
    openBIM.iso19650.setProject({
      name: 'ArxisVR Demo Project',
      code: 'DEMO',
      originator: 'ARXIS',
      volume: 'BLD',
      level: '01',
      type: 'M',
      role: 'ARC',
      number: '0001',
      containers: new Map()
    });

    // Cria container
    const container = openBIM.iso19650.createContainer({
      name: 'Architectural Model - Ground Floor',
      status: 'WIP',
      suitability: 'S0',
      author: 'John Architect',
      purpose: 'Coordination'
    });

    console.log(`📦 Container created: ${container.id}`);
    console.log(`   Status: ${container.status}`);
    console.log(`   Suitability: ${container.suitability}`);

    // Atualiza suitability
    openBIM.iso19650.updateSuitability(container.id, 'S2', 'Jane Coordinator');
    console.log(`   Updated to: S2 (Suitable for information)`);

    // Cria revisão
    const revision = openBIM.iso19650.createRevision(
      container.id,
      'John Architect',
      'Added structural walls'
    );

    if (revision) {
      console.log(`📝 Revision created: ${revision.id}`);
    }

    // Verifica conformidade
    const compliance = openBIM.checkISO19650Compliance();
    console.log(`\n✅ ISO 19650 Compliance Check:`);
    console.log(`   Compliant: ${compliance.compliant ? 'YES' : 'NO'}`);
    console.log(`   Issues: ${compliance.issues.length}`);
    console.log(`   Warnings: ${compliance.warnings.length}`);
    
    if (compliance.issues.length > 0) {
      console.log(`   ⚠️ Issues:`);
      compliance.issues.forEach((issue) => console.log(`      - ${issue}`));
    }
  }

  /**
   * Demonstra sistema BCF (BIM Collaboration Format)
   */
  public demoBCF(): void {
    console.log('\n💬 === BCF COLLABORATION DEMO ===');

    // Cria topic
    const topic = openBIM.bcf.createTopic({
      title: 'Clash between wall and beam',
      description: 'Architectural wall intersects structural beam on level 1',
      author: 'John Architect',
      priority: 'High',
      status: 'Open',
      topicType: 'Clash',
      assignedTo: 'Jane Engineer'
    });

    console.log(`💬 BCF Topic created: ${topic.guid}`);
    console.log(`   Title: ${topic.title}`);
    console.log(`   Priority: ${topic.priority}`);
    console.log(`   Status: ${topic.status}`);

    // Adiciona comentário
    const comment = openBIM.bcf.addComment(
      topic.guid,
      'Jane Engineer',
      'I will review this clash and propose a solution by tomorrow'
    );

    if (comment) {
      console.log(`   Comment added: "${comment.comment}"`);
    }

    // Atualiza status
    openBIM.bcf.updateTopicStatus(topic.guid, 'InProgress', 'Jane Engineer');
    console.log(`   Status updated to: InProgress`);

    // Lista todos os topics
    const allTopics = openBIM.bcf.listTopics();
    console.log(`\n📊 Total BCF Topics: ${allTopics.length}`);
  }

  /**
   * Demonstra sistema de versionamento
   */
  public demoVersioning(scene: THREE.Scene): void {
    console.log('\n📦 === MODEL VERSIONING DEMO ===');

    // Cria snapshot do modelo
    const snapshot = versioning.createSnapshot(scene);
    console.log(`📸 Snapshot created:`);
    console.log(`   Entities: ${snapshot.entities.size}`);
    console.log(`   Geometries: ${snapshot.geometries.size}`);
    console.log(`   Properties: ${snapshot.properties.size}`);

    // Cria versão
    const versionId = versioning.createVersion(
      snapshot,
      'John Architect',
      'Initial model version'
    );

    console.log(`📦 Version created: ${versionId}`);

    // Cria branch
    versioning.createBranch('feature/structural-updates', versionId);
    console.log(`🌿 Branch created: feature/structural-updates`);

    // Lista branches
    const branches = versioning.listBranches();
    console.log(`\n🌳 Branches:`);
    branches.forEach((vId, branchName) => {
      console.log(`   - ${branchName}: ${vId || 'empty'}`);
    });

    // Lista versões
    const versions = versioning.listVersions();
    console.log(`\n📜 Version History (${versions.length} versions):`);
    versions.slice(0, 3).forEach((v) => {
      console.log(`   ${v.id}: "${v.message}" by ${v.author}`);
      console.log(`      ${v.metadata.changeCount} changes, ${v.metadata.statistics.totalEntities} entities`);
    });
  }

  /**
   * Demonstra sistema IFC 4.3 Alignment
   */
  public demoIFC43Alignment(): void {
    console.log('\n🛤️ === IFC 4.3 ALIGNMENT DEMO ===');

    // Cria alignment
    const alignmentId = 'alignment-001';
    ifc43AlignmentSystem.createAlignment(alignmentId, new THREE.Vector3(0, 0, 0));

    // Define segmentos horizontais
    const horizontalSegments = [
      {
        type: 'line' as const,
        startPoint: new THREE.Vector3(0, 0, 0),
        endPoint: new THREE.Vector3(100, 0, 0),
        length: 100
      },
      {
        type: 'circular' as const,
        startPoint: new THREE.Vector3(100, 0, 0),
        endPoint: new THREE.Vector3(150, 0, 50),
        radius: 50,
        length: 78.54
      }
    ];

    ifc43AlignmentSystem.setHorizontalAlignment(alignmentId, horizontalSegments);
    console.log(`🛤️ Horizontal alignment set: 2 segments, 178.54m total`);

    // Calcula ponto em estação específica
    const station = 120; // 120 metros
    const result = ifc43AlignmentSystem.getPointAtStation(alignmentId, station);

    if (result) {
      console.log(`\n📍 Point at station ${station}m:`);
      console.log(`   Position: (${result.point.x.toFixed(2)}, ${result.point.y.toFixed(2)}, ${result.point.z.toFixed(2)})`);
      console.log(`   Direction: (${result.direction.x.toFixed(2)}, ${result.direction.y.toFixed(2)}, ${result.direction.z.toFixed(2)})`);
      console.log(`   Cant: ${result.cant.toFixed(2)}°`);
    }

    // Gera geometria de visualização
    const geometry = ifc43AlignmentSystem.generateAlignmentGeometry(alignmentId, 5.0);
    if (geometry) {
      console.log(`🎨 Alignment geometry generated: ${geometry.attributes.position.count} points`);
    }
  }

  /**
   * Executa todas as demos
   */
  public runAllDemos(scene: THREE.Scene): void {
    console.log('\n🎯 ========================================');
    console.log('🎯 RUNNING ALL CORE SYSTEMS DEMOS');
    console.log('🎯 ========================================\n');

    this.demoGeoreferencing();
    this.demoMetricPrecision();
    this.demoISO19650();
    this.demoBCF();
    this.demoVersioning(scene);
    this.demoIFC43Alignment();

    console.log('\n🎯 ========================================');
    console.log('🎯 ALL DEMOS COMPLETED!');
    console.log('🎯 ========================================\n');
  }

  private getBearingDirection(bearing: number): string {
    if (bearing < 22.5 || bearing >= 337.5) return 'N';
    if (bearing >= 22.5 && bearing < 67.5) return 'NE';
    if (bearing >= 67.5 && bearing < 112.5) return 'E';
    if (bearing >= 112.5 && bearing < 157.5) return 'SE';
    if (bearing >= 157.5 && bearing < 202.5) return 'S';
    if (bearing >= 202.5 && bearing < 247.5) return 'SW';
    if (bearing >= 247.5 && bearing < 292.5) return 'W';
    return 'NW';
  }
}

// Singleton instance
export const coreSystemsDemo = new CoreSystemsDemo();

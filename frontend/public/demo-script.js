/**
 * Demo Script - Advanced Selection & IFC Inspector
 * 
 * Este script demonstra o uso das novas funcionalidades.
 * Cole no console do navegador (F12) para testar.
 */

console.log('🚀 ArxisVR - Demo Script Loaded');

// ==================== DEMO: IFC INSPECTOR ====================
async function demoIfcInspector() {
  console.log('\n📋 DEMO: IFC Inspector\n');
  
  // Verificar se PropertyExtractor está disponível
  const extractor = window.__propertyExtractor;
  
  if (!extractor) {
    console.warn('⚠️ PropertyExtractor não encontrado. Carregue um arquivo IFC primeiro!');
    console.log('💡 Dica: Clique no botão "Import" e selecione um arquivo .ifc');
    return;
  }
  
  console.log('✅ PropertyExtractor encontrado!');
  
  // Buscar primeiro mesh com expressID
  const viewerHost = window.appShell?.getViewerHost();
  const scene = viewerHost?.scene;
  
  if (!scene) {
    console.warn('⚠️ Scene não encontrada');
    return;
  }
  
  let testMesh = null;
  scene.traverse((object) => {
    if (!testMesh && object.userData?.expressID !== undefined) {
      testMesh = object;
    }
  });
  
  if (!testMesh) {
    console.warn('⚠️ Nenhum elemento IFC encontrado na cena');
    return;
  }
  
  const expressID = testMesh.userData.expressID;
  const modelID = testMesh.userData.modelID || 0;
  
  console.log(`🔍 Extraindo propriedades do elemento:`);
  console.log(`  - ExpressID: ${expressID}`);
  console.log(`  - Type: ${testMesh.userData.ifcType || testMesh.userData.type}`);
  console.log(`  - Name: ${testMesh.name}`);
  
  try {
    const properties = await extractor.extractProperties(expressID, modelID);
    
    console.log('\n📊 Propriedades extraídas:');
    console.log(`  - Seções: ${properties.sections.length}`);
    
    properties.sections.forEach(section => {
      console.log(`\n  📁 ${section.category} (${section.properties.length} propriedades)`);
      section.properties.slice(0, 5).forEach(prop => {
        console.log(`    - ${prop.name}: ${JSON.stringify(prop.value)}`);
      });
      if (section.properties.length > 5) {
        console.log(`    ... e mais ${section.properties.length - 5} propriedades`);
      }
    });
    
    console.log('\n✅ Extração concluída com sucesso!');
    
    return properties;
  } catch (error) {
    console.error('❌ Erro ao extrair propriedades:', error);
  }
}

// ==================== DEMO: ADVANCED SELECTION ====================
async function demoAdvancedSelection() {
  console.log('\n🎯 DEMO: Advanced Selection System\n');
  
  // Importar módulo
  let AdvancedSelectionTool;
  try {
    const module = await import('/src/tools/selection/AdvancedSelectionTool.js');
    AdvancedSelectionTool = module.AdvancedSelectionTool;
  } catch (error) {
    console.error('❌ Erro ao importar AdvancedSelectionTool:', error);
    console.log('💡 Certifique-se de que o servidor está rodando (npm run dev)');
    return;
  }
  
  // Pegar scene e camera
  const viewerHost = window.appShell?.getViewerHost();
  const scene = viewerHost?.scene;
  const camera = viewerHost?.camera;
  
  if (!scene || !camera) {
    console.warn('⚠️ Scene ou Camera não encontradas');
    return;
  }
  
  console.log('✅ Scene e Camera encontradas');
  
  // Criar ferramenta
  const tool = new AdvancedSelectionTool(scene, camera);
  console.log('✅ AdvancedSelectionTool criada');
  
  // Contar elementos na cena
  let elementCount = 0;
  const typeCount = {};
  
  scene.traverse((object) => {
    if (object.userData?.expressID !== undefined) {
      elementCount++;
      const type = object.userData.ifcType || object.userData.type || 'Unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    }
  });
  
  console.log(`\n📊 Elementos na cena: ${elementCount}`);
  console.log('📋 Tipos encontrados:');
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });
  
  // Teste 1: Selecionar por tipo
  if (Object.keys(typeCount).length > 0) {
    const firstType = Object.keys(typeCount)[0];
    console.log(`\n🎯 Teste 1: Selecionando todos os "${firstType}"`);
    
    const count = await tool.selectByIfcType(firstType);
    console.log(`✅ Selecionados: ${count} elementos`);
    
    // Salvar conjunto
    const set = tool.saveSelectionAsSet(
      `All ${firstType}`,
      `Demonstração - Todos os ${firstType} do modelo`
    );
    console.log(`💾 Conjunto salvo: "${set.name}" (ID: ${set.id})`);
  }
  
  // Teste 2: Listar conjuntos salvos
  console.log('\n📚 Teste 2: Listando conjuntos salvos');
  const sets = tool.listSelectionSets();
  console.log(`✅ Total de conjuntos: ${sets.length}`);
  sets.forEach((set, idx) => {
    console.log(`  ${idx + 1}. "${set.name}" - ${set.elements.length} elementos`);
  });
  
  // Teste 3: Exportar conjunto para JSON
  if (sets.length > 0) {
    console.log('\n📤 Teste 3: Exportando conjunto para JSON');
    const json = tool.exportSelectionSet(sets[0].id);
    console.log('✅ JSON exportado (primeiros 200 caracteres):');
    console.log(json?.substring(0, 200) + '...');
  }
  
  // Teste 4: Inverter seleção
  console.log('\n🔄 Teste 4: Invertendo seleção');
  const inverted = await tool.invertSelection();
  console.log(`✅ Seleção invertida: agora ${inverted} elementos selecionados`);
  
  console.log('\n✅ Demo concluída!');
  console.log('\n💡 Dicas:');
  console.log('  - Use tool.selectByIfcType("IfcWall") para selecionar paredes');
  console.log('  - Use tool.selectByProperty("field", value) para filtrar por propriedade');
  console.log('  - Use tool.saveSelectionAsSet("nome", "descrição") para salvar');
  console.log('  - Use tool.loadSelectionSet(id) para carregar conjunto salvo');
  
  return tool;
}

// ==================== EXECUTAR DEMOS ====================
window.demoIfcInspector = demoIfcInspector;
window.demoAdvancedSelection = demoAdvancedSelection;

console.log('\n📖 Comandos disponíveis:');
console.log('  - demoIfcInspector()       → Testa extração de propriedades IFC');
console.log('  - demoAdvancedSelection()  → Testa sistema de seleção avançada');
console.log('\n💡 Execute um dos comandos acima para começar!');

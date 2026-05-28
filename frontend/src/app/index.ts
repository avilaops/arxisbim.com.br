/**
 * App Layer - Barrel Export
 * Camada de aplicação e lógica de negócio
 */

export * from './AppController';
export { appController } from './AppController';
export * from './ToolManager';
export * from './ProjectManager';
export * from './ProjectSerializer';
export { projectSerializer } from './ProjectSerializer';
export * from './SelectionManager';
export * from './NavigationManager';
export * from './LayerManager';
export * from './CommandHistory';
export { commandHistory } from './CommandHistory';
export * from './SectionManager';
export * from './IFCPropertyService';
// export * from './commands'; // Removido: causava duplicação de exports (CommandHistory já exportado acima)

// --- Modular Frontend Entry Point ---
import AppShell from './AppShell';
// import { initApp } from './initApp';

// Exemplo de montagem (React, Preact, ou Vanilla):
// ReactDOM.render(<AppShell />, document.getElementById('app'));
// Após montagem, inicializar lógica:
// initApp(); // Desativado - usando app-main.ts como ponto de entrada principal



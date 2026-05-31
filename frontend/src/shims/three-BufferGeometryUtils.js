// Shim de compatibilidade three <-> web-ifc-three.
//
// web-ifc-three@0.0.126 importa `mergeGeometries` de
// `three/examples/jsm/utils/BufferGeometryUtils.js`, mas o three@0.149
// só exporta `mergeBufferGeometries` (a função foi renomeada para
// `mergeGeometries` no three r0.150). Num node_modules limpo (CI/Render)
// isso quebra o build do Vite com "mergeGeometries is not exported".
//
// Este shim re-exporta tudo do BufferGeometryUtils real e adiciona o
// alias `mergeGeometries`, sem precisar bumpar o three (o que afetaria
// o viewer 3D). O vite.config aponta o specifier `three/examples/jsm/...`
// para cá; importamos via `three/addons/...` (mesmo arquivo, specifier
// diferente) para não criar loop de alias.
export * from 'three/addons/utils/BufferGeometryUtils.js';
export { mergeBufferGeometries as mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

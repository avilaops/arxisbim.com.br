/**
 * Global type declarations
 * Resolução de tipos para bibliotecas sem declarações
 */

declare module 'react' {
  export * from 'react';
}

declare module 'react-dom' {
  export * from 'react-dom';
}

declare module 'react/jsx-runtime' {
  export * from 'react/jsx-runtime';
}

declare module 'three' {
  export * from 'three';
}

declare module 'three/examples/jsm/exporters/GLTFExporter.js' {
  export * from 'three/examples/jsm/exporters/GLTFExporter.js';
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

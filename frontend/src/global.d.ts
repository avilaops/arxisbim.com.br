declare module 'three/addons/exporters/GLTFExporter.js' {
  export class GLTFExporter {
    constructor();
    parse(
      input: any,
      onSuccess: (result: any) => void,
      onError: (error: any) => void,
      options?: any
    ): void;
  }
}

declare module 'three/addons/loaders/RGBELoader.js' {
  export class RGBELoader {
    constructor();
    load(
      url: string,
      onLoad: (texture: any) => void,
      onProgress?: (progress: any) => void,
      onError?: (error: any) => void
    ): void;
  }
}

declare module '*.ifc' {
  const content: any;
  export default content;
}

declare module 'vite' {
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

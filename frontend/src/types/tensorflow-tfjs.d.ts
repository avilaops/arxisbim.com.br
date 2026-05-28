declare module '@tensorflow/tfjs' {
  export type Tensor = any;
  export type Tensor1D = any;
  export type Tensor2D = any;
  export type LayersModel = any;
  export type GraphModel = any;
  export type History = any;
  export type Logs = Record<string, number>;

  export const sequential: any;
  export const layers: any;
  export const train: any;
  export const tidy: any;
  export const tensor: any;
  export const tensor1d: any;
  export const tensor2d: any;
  export const randomUniform: any;
  export const gather: any;
  export const equal: any;
  export const oneHot: any;
  export const loadLayersModel: any;
  export const getBackend: () => string;
  export const setBackend: (backendName: string) => Promise<boolean>;
  export const ready: () => Promise<void>;
  export const memory: () => { numTensors: number; numBytes: number };
  export const zeros: any;
  export const notEqual: any;
}

// EventBus simples para fluxos desacoplados entre controllers/serviços/UI
export type Listener = (data: any) => void;
const listeners: Record<string, Listener[]> = {};
export function on(event: string, cb: Listener) { (listeners[event] = listeners[event] || []).push(cb); }
export function emit(event: string, data?: any) { (listeners[event] || []).forEach(cb => cb(data)); }

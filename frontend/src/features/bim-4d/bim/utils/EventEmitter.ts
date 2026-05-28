/**
 * BIM 4D local EventEmitter bridge.
 *
 * The 4D modules import from ../../utils/EventEmitter.js; this bridge keeps that
 * path browser-compatible while reusing the shared implementation.
 */
export { EventEmitter, default } from '../../../../shared/utils/EventEmitter';

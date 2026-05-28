/**
 * E2E test bridge — exposes commonly-imported runtime modules through
 * Vite-resolved paths so Playwright `page.evaluate(import(...))` can reach them.
 * Not used by production code; safe to ship because it only re-exports.
 */
import * as THREE from 'three';
import { selectionService } from '../inspector/SelectionService';
import { batchSelectionService } from '../inspector/BatchSelectionService';

export { THREE, selectionService, batchSelectionService };

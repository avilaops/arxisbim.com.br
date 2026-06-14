import { analytics } from '../core/analytics/Analytics';
import * as THREE from 'three';

export class ComparisonExport {
  /**
   * Exports the split-view canvas as a high-resolution side-by-side PNG
   */
  public static async export(
    splitView: { render: () => void; resize: () => void },
    renderer: THREE.WebGLRenderer,
    canvas: HTMLCanvasElement,
    filename: string = `arxisvr-comparacao-${Date.now()}.png`
  ): Promise<void> {
    console.log('📸 Starting side-by-side PNG export...');

    // Save original configuration
    const originalRatio = renderer.getPixelRatio();

    try {
      // 1. Temporarily increase pixel ratio to 2 for high-resolution output
      renderer.setPixelRatio(2);
      splitView.resize();

      // 2. Synchronously force a render pass to populate the drawing buffer
      splitView.render();

      // 3. Capture canvas data
      return new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
          // Restore original settings immediately
          renderer.setPixelRatio(originalRatio);
          splitView.resize();
          splitView.render();

          if (!blob) {
            reject(new Error('Falha ao gerar blob do canvas'));
            return;
          }

          // Trigger download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);

          // Emit telemetry event
          const tenantId = localStorage.getItem('arxisvr_tenant_id') || '';
          const projectId = localStorage.getItem('arxisvr_project_id') || '';
          analytics.track('comparison_exported', {
            tenantId,
            projectId,
            filename
          });

          console.log('✅ Side-by-side PNG export completed successfully!');
          resolve();
        }, 'image/png');
      });
    } catch (err) {
      // Ensure we restore ratio on error
      renderer.setPixelRatio(originalRatio);
      splitView.resize();
      splitView.render();
      throw err;
    }
  }
}

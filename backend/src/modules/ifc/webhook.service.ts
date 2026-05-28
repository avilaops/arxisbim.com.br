/**
 * Webhook Service for IFC/Federation Events
 * 
 * Sends notifications to external systems when events occur
 * Webhook URLs configured per tenant in database or .env
 * 
 * Example .env:
 * WEBHOOK_URL=https://your-app.com/webhooks/arxisvr
 * WEBHOOK_SECRET=your_webhook_secret_key
 */

import { db } from '../../shared/database/db.js';

export interface WebhookEvent {
  event: string;
  timestamp: string;
  tenantId: string;
  userId?: string;
  data: any;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  events: string[];
}

export class WebhookService {
  private defaultWebhookUrl: string | undefined;
  private webhookSecret: string | undefined;

  constructor() {
    // Load from .env - NEVER hardcode
    this.defaultWebhookUrl = process.env.WEBHOOK_URL;
    this.webhookSecret = process.env.WEBHOOK_SECRET;
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(
    event: string,
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<boolean> {
    if (!this.defaultWebhookUrl) {
      console.log('⚠️ Webhook URL not configured in .env, skipping notification');
      return false;
    }

    const payload: WebhookEvent = {
      event,
      timestamp: new Date().toISOString(),
      tenantId,
      userId,
      data,
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'ArxisVR-Webhook/1.0',
      };

      // Add signature if secret is configured
      if (this.webhookSecret) {
        const signature = await this.generateSignature(payload);
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(this.defaultWebhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`❌ Webhook failed: ${response.status} ${response.statusText}`);
        return false;
      }

      console.log(`✅ Webhook sent: ${event} for tenant ${tenantId}`);
      return true;
    } catch (error: any) {
      console.error('❌ Webhook error:', error.message);
      return false;
    }
  }

  /**
   * Generate HMAC signature for webhook security
   */
  private async generateSignature(payload: WebhookEvent): Promise<string> {
    if (!this.webhookSecret) return '';

    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Webhook event types
   */
  static Events = {
    // IFC Events
    IFC_UPLOADED: 'ifc.uploaded',
    IFC_UPDATED: 'ifc.updated',
    IFC_DELETED: 'ifc.deleted',
    IFC_VALIDATION_COMPLETE: 'ifc.validation.complete',
    
    // Federation Events
    FEDERATION_CREATED: 'federation.created',
    FEDERATION_UPDATED: 'federation.updated',
    FEDERATION_DELETED: 'federation.deleted',
    FEDERATION_MODEL_ADDED: 'federation.model.added',
    FEDERATION_MODEL_REMOVED: 'federation.model.removed',
    
    // Batch Events
    BATCH_DELETE_COMPLETE: 'batch.delete.complete',
  };

  /**
   * Send IFC uploaded notification
   */
  async notifyIfcUploaded(
    ifcModel: any,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await this.sendWebhook(
      WebhookService.Events.IFC_UPLOADED,
      tenantId,
      {
        ifcModelId: ifcModel.id,
        projectId: ifcModel.projectId,
        name: ifcModel.originalName,
        discipline: ifcModel.discipline,
        phase: ifcModel.phase,
        fileSizeBytes: ifcModel.fileSizeBytes,
        uploadedAt: ifcModel.uploadedAt,
      },
      userId
    );
  }

  /**
   * Send IFC deleted notification
   */
  async notifyIfcDeleted(
    ifcModelId: string,
    projectId: string,
    tenantId: string,
    userId?: string
  ): Promise<void> {
    await this.sendWebhook(
      WebhookService.Events.IFC_DELETED,
      tenantId,
      {
        ifcModelId,
        projectId,
        deletedAt: new Date().toISOString(),
      },
      userId
    );
  }

  /**
   * Send federation created notification
   */
  async notifyFederationCreated(
    federation: any,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await this.sendWebhook(
      WebhookService.Events.FEDERATION_CREATED,
      tenantId,
      {
        federationId: federation.id,
        projectId: federation.projectId,
        name: federation.name,
        modelCount: (federation.models as any[])?.length || 0,
        createdAt: federation.createdAt,
      },
      userId
    );
  }

  /**
   * Send validation complete notification
   */
  async notifyValidationComplete(
    ifcModelId: string,
    validationResult: any,
    tenantId: string
  ): Promise<void> {
    await this.sendWebhook(
      WebhookService.Events.IFC_VALIDATION_COMPLETE,
      tenantId,
      {
        ifcModelId,
        valid: validationResult.valid,
        conflictCount: validationResult.conflicts.length,
        warningCount: validationResult.warnings.length,
        validatedAt: new Date().toISOString(),
      }
    );
  }

  /**
   * Send batch delete complete notification
   */
  async notifyBatchDeleteComplete(
    results: any,
    tenantId: string,
    userId?: string
  ): Promise<void> {
    await this.sendWebhook(
      WebhookService.Events.BATCH_DELETE_COMPLETE,
      tenantId,
      {
        total: results.total,
        success: results.success,
        failed: results.failed,
        completedAt: new Date().toISOString(),
      },
      userId
    );
  }
}

// Singleton instance
export const webhookService = new WebhookService();

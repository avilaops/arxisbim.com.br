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
export declare class WebhookService {
    private defaultWebhookUrl;
    private webhookSecret;
    constructor();
    /**
     * Send webhook notification
     */
    sendWebhook(event: string, tenantId: string, data: any, userId?: string): Promise<boolean>;
    /**
     * Generate HMAC signature for webhook security
     */
    private generateSignature;
    /**
     * Webhook event types
     */
    static Events: {
        IFC_UPLOADED: string;
        IFC_UPDATED: string;
        IFC_DELETED: string;
        IFC_VALIDATION_COMPLETE: string;
        FEDERATION_CREATED: string;
        FEDERATION_UPDATED: string;
        FEDERATION_DELETED: string;
        FEDERATION_MODEL_ADDED: string;
        FEDERATION_MODEL_REMOVED: string;
        BATCH_DELETE_COMPLETE: string;
    };
    /**
     * Send IFC uploaded notification
     */
    notifyIfcUploaded(ifcModel: any, tenantId: string, userId: string): Promise<void>;
    /**
     * Send IFC deleted notification
     */
    notifyIfcDeleted(ifcModelId: string, projectId: string, tenantId: string, userId?: string): Promise<void>;
    /**
     * Send federation created notification
     */
    notifyFederationCreated(federation: any, tenantId: string, userId: string): Promise<void>;
    /**
     * Send validation complete notification
     */
    notifyValidationComplete(ifcModelId: string, validationResult: any, tenantId: string): Promise<void>;
    /**
     * Send batch delete complete notification
     */
    notifyBatchDeleteComplete(results: any, tenantId: string, userId?: string): Promise<void>;
}
export declare const webhookService: WebhookService;
//# sourceMappingURL=webhook.service.d.ts.map
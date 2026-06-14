// =====================================
// SCHEMA INDEX - All database schemas
// =====================================

// Tenancy & Users
export * from './tenants.js'; // Inclui taskElementLinks e timelineSimulations

// Observability & Audit
export * from './observability.js';

// API Keys & WebAuthn
export * from './api-keys.js';

// Notifications
export * from './notifications.js';

// Billing & Subscriptions
export * from './billing.js';

// Projects & IFC Models
export * from './projects.js';

// IFC processing pipeline runs (S11)
export * from './processing.js';

// IFC element properties / PropertySets (S13)
export * from './element-properties.js';

// Copilot/viewer scenarios
export * from './scenarios.js';

// VR/AR & Immersive features
export * from './immersive.js';

// BIM 4D Scheduling
export * from './scheduling.js';

// Virtual Meeting Rooms with Avatars
export * from './virtual-meetings.js';

// BIM 5D Budgets & Cost Items
export * from './budgets.js';

// Email Queue (retry for transactional emails)
export * from './email-queue.js';

// Password history (prevent reuse of last N passwords)
export * from './password-history.js';

// Multiplayer Sessions (Session, Participant, Presence, SessionEvent, Recording, BillingUsage)
export * from './sessions.js';

// Workspaces: memberships (N:N user↔tenant) e convites
export * from './workspaces.js';

// Analytics first-party (rastreamento próprio — landing + app)
export * from './analytics.js';

// File metadata (upload pipeline — S02)
export * from './files.js';

// Element comments (S16)
export * from './comments.js';


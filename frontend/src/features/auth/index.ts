/**
 * auth/index.ts - Authentication module exports
 */

export { authManager, type User, type LoginCredentials, type RegisterData } from './AuthManager';
export { getLoginModal, LoginModal } from './LoginModal';
export { AuthStatusWidget } from './AuthStatusWidget';
export { getProfilePanel, ProfilePanel } from './ProfilePanel';
export { backendHealthChecker, type HealthStatus, type HealthCheckResult } from './BackendHealthChecker';

/**
 * Sistema de Licenciamento e Controle de Módulos
 * Gerencia features disponíveis por plano de assinatura
 */

import type { CurrentBillingResponse } from '../../api/v1/services/billing.service';

export enum PlanTier {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export enum Feature {
  // Core Features
  IFC_VIEWER = 'ifc_viewer',
  BASIC_NAVIGATION = 'basic_navigation',
  BASIC_LIGHTING = 'basic_lighting',
  
  // Environment Features
  FOREST_ENVIRONMENT = 'forest_environment',
  FIELD_ENVIRONMENT = 'field_environment',
  URBAN_ENVIRONMENT = 'urban_environment',
  CUSTOM_ENVIRONMENTS = 'custom_environments',
  
  // Collaboration Features
  REAL_TIME_COLLABORATION = 'real_time_collaboration',
  VOICE_CHAT = 'voice_chat',
  VIDEO_CONFERENCING = 'video_conferencing',
  SCREEN_SHARING = 'screen_sharing',
  
  // Avatar & Character Features
  BASIC_AVATARS = 'basic_avatars',
  CUSTOM_AVATARS = 'custom_avatars',
  ENGINEER_AVATARS = 'engineer_avatars',
  FAMILY_SIMULATION = 'family_simulation',
  
  // Advanced Tools
  MEASUREMENT_TOOLS = 'measurement_tools',
  ANNOTATION_TOOLS = 'annotation_tools',
  CLASH_DETECTION = 'clash_detection',
  COST_ESTIMATION = 'cost_estimation',
  SCHEDULE_4D = 'schedule_4d',
  EXPLODED_VIEW = 'exploded_view',
  SECTION_PLANES = 'section_planes',
  
  // Export & Integration
  EXPORT_PDF = 'export_pdf',
  EXPORT_IMAGES = 'export_images',
  EXPORT_VIDEO = 'export_video',
  API_ACCESS = 'api_access',
  WEBHOOK_INTEGRATION = 'webhook_integration',
  SSO_INTEGRATION = 'sso_integration',
  
  // Storage & Performance
  CLOUD_STORAGE = 'cloud_storage',
  ADVANCED_CACHING = 'advanced_caching',
  GPU_RENDERING = 'gpu_rendering',
  
  // VR/XR Features
  VR_MODE = 'vr_mode',
  AR_MODE = 'ar_mode',
  HAND_TRACKING = 'hand_tracking',
  
  // Analytics & Reports
  BASIC_ANALYTICS = 'basic_analytics',
  ADVANCED_ANALYTICS = 'advanced_analytics',
  CUSTOM_REPORTS = 'custom_reports',
  
  // Support & SLA
  EMAIL_SUPPORT = 'email_support',
  PRIORITY_SUPPORT = 'priority_support',
  DEDICATED_SUPPORT = 'dedicated_support',
  PHONE_SUPPORT = 'phone_support',
  
  // Admin & Management
  USER_MANAGEMENT = 'user_management',
  ROLE_BASED_ACCESS = 'role_based_access',
  AUDIT_LOGS = 'audit_logs',
  CUSTOM_BRANDING = 'custom_branding'
}

export interface PlanLimits {
  maxUsers: number;
  maxProjects: number;
  storageGB: number;
  maxFileSize: number; // MB
  collaboratorsPerSession: number;
  apiCallsPerMonth: number;
}

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  price: number; // R$ por mês
  features: Feature[];
  limits: PlanLimits;
  description: string;
}

const STARTER_FEATURES: Feature[] = [
  Feature.IFC_VIEWER,
  Feature.BASIC_NAVIGATION,
  Feature.BASIC_LIGHTING,
  Feature.FOREST_ENVIRONMENT,
  Feature.FIELD_ENVIRONMENT,
  Feature.URBAN_ENVIRONMENT,
  Feature.REAL_TIME_COLLABORATION,
  Feature.BASIC_AVATARS,
  Feature.ENGINEER_AVATARS,
  Feature.MEASUREMENT_TOOLS,
  Feature.ANNOTATION_TOOLS,
  Feature.SECTION_PLANES,
  Feature.EXPORT_PDF,
  Feature.EXPORT_IMAGES,
  Feature.CLOUD_STORAGE,
  Feature.VR_MODE,
  Feature.BASIC_ANALYTICS,
  Feature.EMAIL_SUPPORT,
  Feature.USER_MANAGEMENT
];

const PROFESSIONAL_FEATURES: Feature[] = [
  ...STARTER_FEATURES,
  Feature.CUSTOM_ENVIRONMENTS,
  Feature.VOICE_CHAT,
  Feature.VIDEO_CONFERENCING,
  Feature.SCREEN_SHARING,
  Feature.CUSTOM_AVATARS,
  Feature.FAMILY_SIMULATION,
  Feature.CLASH_DETECTION,
  Feature.COST_ESTIMATION,
  Feature.SCHEDULE_4D,
  Feature.EXPLODED_VIEW,
  Feature.EXPORT_VIDEO,
  Feature.API_ACCESS,
  Feature.WEBHOOK_INTEGRATION,
  Feature.ADVANCED_CACHING,
  Feature.GPU_RENDERING,
  Feature.AR_MODE,
  Feature.HAND_TRACKING,
  Feature.ADVANCED_ANALYTICS,
  Feature.CUSTOM_REPORTS,
  Feature.PRIORITY_SUPPORT,
  Feature.PHONE_SUPPORT,
  Feature.ROLE_BASED_ACCESS,
  Feature.AUDIT_LOGS
];

const BILLING_FEATURE_MAP: Record<string, Feature[]> = {
  ifc_viewer: [Feature.IFC_VIEWER, Feature.BASIC_NAVIGATION, Feature.BASIC_LIGHTING],
  cloud_storage: [Feature.CLOUD_STORAGE],
  measurement_tools: [Feature.MEASUREMENT_TOOLS],
  annotations: [Feature.ANNOTATION_TOOLS],
  vr_mode: [Feature.VR_MODE],
  ar_mode: [Feature.AR_MODE],
  federation: [Feature.CLASH_DETECTION],
  collaboration: [Feature.REAL_TIME_COLLABORATION],
  api_access: [Feature.API_ACCESS],
  webhooks: [Feature.WEBHOOK_INTEGRATION],
  advanced_analytics: [Feature.ADVANCED_ANALYTICS, Feature.CUSTOM_REPORTS],
  sso: [Feature.SSO_INTEGRATION],
  custom_branding: [Feature.CUSTOM_BRANDING],
  dedicated_support: [Feature.DEDICATED_SUPPORT]
};

function mapBillingFeatures(features: string[]): Feature[] {
  return [...new Set(features.flatMap((feature) => BILLING_FEATURE_MAP[feature] ?? []))];
}

function parseLicenseDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

// Definição dos planos disponíveis
export const PLANS: Record<PlanTier, PlanDefinition> = {
  [PlanTier.FREE]: {
    tier: PlanTier.FREE,
    name: 'Free Trial',
    price: 0,
    description: 'Teste gratuito de 14 dias com recursos limitados',
    features: [
      Feature.IFC_VIEWER,
      Feature.BASIC_NAVIGATION,
      Feature.BASIC_LIGHTING,
      Feature.FOREST_ENVIRONMENT,
      Feature.BASIC_AVATARS,
      Feature.MEASUREMENT_TOOLS,
      Feature.EXPORT_IMAGES,
      Feature.CLOUD_STORAGE,
      Feature.BASIC_ANALYTICS,
      Feature.EMAIL_SUPPORT
    ],
    limits: {
      maxUsers: 2,
      maxProjects: 3,
      storageGB: 5,
      maxFileSize: 50,
      collaboratorsPerSession: 2,
      apiCallsPerMonth: 0
    }
  },

  [PlanTier.STARTER]: {
    tier: PlanTier.STARTER,
    name: 'Starter',
    price: 899,
    description: 'Para pequenas equipes começando com BIM imersivo',
    features: STARTER_FEATURES,
    limits: {
      maxUsers: 5,
      maxProjects: 10,
      storageGB: 50,
      maxFileSize: 200,
      collaboratorsPerSession: 5,
      apiCallsPerMonth: 1000
    }
  },

  [PlanTier.PROFESSIONAL]: {
    tier: PlanTier.PROFESSIONAL,
    name: 'Professional',
    price: 2490,
    description: 'Para empresas que precisam de recursos avançados',
    features: PROFESSIONAL_FEATURES,
    limits: {
      maxUsers: -1, // Ilimitado
      maxProjects: -1,
      storageGB: 500,
      maxFileSize: 1000,
      collaboratorsPerSession: 20,
      apiCallsPerMonth: 50000
    }
  },

  [PlanTier.ENTERPRISE]: {
    tier: PlanTier.ENTERPRISE,
    name: 'Enterprise',
    price: 0, // Sob consulta
    description: 'Para grandes corporações com necessidades específicas',
    features: [
      // Todos os recursos do Professional, mais:
      ...PROFESSIONAL_FEATURES,
      Feature.SSO_INTEGRATION,
      Feature.CUSTOM_BRANDING,
      Feature.DEDICATED_SUPPORT
    ],
    limits: {
      maxUsers: -1, // Ilimitado
      maxProjects: -1,
      storageGB: -1, // Ilimitado
      maxFileSize: -1, // Ilimitado
      collaboratorsPerSession: -1, // Ilimitado
      apiCallsPerMonth: -1 // Ilimitado
    }
  }
};

export interface License {
  userId: string;
  organizationId: string;
  plan: PlanTier;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isTrial: boolean;
  customFeatures?: Feature[]; // Features adicionais customizadas
  customLimits?: Partial<PlanLimits>;
}

export class LicenseManager {
  private static instance: LicenseManager;
  private currentLicense: License | null = null;

  private constructor() {}

  static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager();
    }
    return LicenseManager.instance;
  }

  /**
   * Inicializa licença do usuário
   */
  setLicense(license: License): void {
    this.currentLicense = license;
  }

  clearLicense(): void {
    this.currentLicense = null;
  }

  /**
   * Atualiza a licença local a partir do backend /api/v1/billing/current
   */
  setFromBilling(billing: CurrentBillingResponse, userId = 'current-user'): void {
    const now = new Date();
    const fallbackEndDate = new Date(now);
    fallbackEndDate.setDate(fallbackEndDate.getDate() + 30);

    this.currentLicense = {
      userId,
      organizationId: billing.tenantId,
      plan: billing.subscription.plan as PlanTier,
      startDate: parseLicenseDate(billing.subscription.currentPeriodStart, now),
      endDate: parseLicenseDate(billing.subscription.currentPeriodEnd ?? billing.subscription.trialEndsAt, fallbackEndDate),
      isActive: ['trialing', 'active'].includes(billing.subscription.status),
      isTrial: billing.subscription.status === 'trialing',
      customFeatures: mapBillingFeatures(billing.subscription.features),
      customLimits: {
        maxUsers: billing.subscription.limits.maxUsers,
        maxProjects: billing.subscription.limits.maxProjects,
        storageGB: billing.subscription.limits.maxStorageGB,
        maxFileSize: billing.subscription.limits.maxFileSizeMB,
        collaboratorsPerSession: billing.subscription.limits.collaboratorsPerSession,
        apiCallsPerMonth: billing.subscription.limits.apiCallsPerMonth
      }
    };
  }

  /**
   * Obtém licença atual
   */
  getLicense(): License | null {
    return this.currentLicense;
  }

  /**
   * Verifica se uma feature está disponível
   */
  hasFeature(feature: Feature): boolean {
    if (!this.currentLicense || !this.currentLicense.isActive) {
      return false;
    }

    const plan = PLANS[this.currentLicense.plan];
    
    // Verifica features customizadas
    if (this.currentLicense.customFeatures?.includes(feature)) {
      return true;
    }

    return plan.features.includes(feature);
  }

  /**
   * Verifica múltiplas features
   */
  hasFeatures(features: Feature[]): boolean {
    return features.every(f => this.hasFeature(f));
  }

  /**
   * Obtém limite específico
   */
  getLimit(limitKey: keyof PlanLimits): number {
    if (!this.currentLicense) {
      return 0;
    }

    // Limites customizados têm prioridade
    if (this.currentLicense.customLimits?.[limitKey] !== undefined) {
      return this.currentLicense.customLimits[limitKey]!;
    }

    const plan = PLANS[this.currentLicense.plan];
    return plan.limits[limitKey];
  }

  /**
   * Verifica se está dentro do limite
   */
  isWithinLimit(limitKey: keyof PlanLimits, currentValue: number): boolean {
    const limit = this.getLimit(limitKey);
    
    // -1 significa ilimitado
    if (limit === -1) {
      return true;
    }

    return currentValue < limit;
  }

  /**
   * Obtém plano atual
   */
  getCurrentPlan(): PlanDefinition | null {
    if (!this.currentLicense) {
      return null;
    }
    return PLANS[this.currentLicense.plan];
  }

  /**
   * Verifica se licença está ativa
   */
  isActive(): boolean {
    if (!this.currentLicense) {
      return false;
    }

    if (!this.currentLicense.isActive) {
      return false;
    }

    const now = new Date();
    return now >= this.currentLicense.startDate && now <= this.currentLicense.endDate;
  }

  /**
   * Verifica se é trial
   */
  isTrial(): boolean {
    return this.currentLicense?.isTrial ?? false;
  }

  /**
   * Dias restantes da licença
   */
  getDaysRemaining(): number {
    if (!this.currentLicense) {
      return 0;
    }

    const now = new Date();
    const diff = this.currentLicense.endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Lista features disponíveis
   */
  getAvailableFeatures(): Feature[] {
    if (!this.currentLicense) {
      return [];
    }

    const plan = PLANS[this.currentLicense.plan];
    const customFeatures = this.currentLicense.customFeatures || [];
    
    return [...new Set([...plan.features, ...customFeatures])];
  }

  /**
   * Verifica se pode fazer upgrade
   */
  canUpgradeTo(targetTier: PlanTier): boolean {
    if (!this.currentLicense) {
      return true;
    }

    const tierOrder = [PlanTier.FREE, PlanTier.STARTER, PlanTier.PROFESSIONAL, PlanTier.ENTERPRISE];
    const currentIndex = tierOrder.indexOf(this.currentLicense.plan);
    const targetIndex = tierOrder.indexOf(targetTier);

    return targetIndex > currentIndex;
  }
}

// Instância singleton global
export const licenseManager = LicenseManager.getInstance();

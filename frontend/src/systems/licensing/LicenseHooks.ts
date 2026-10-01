/*
 * Aviso de nomenclatura, nao de React.
 *
 * As funcoes daqui comecam com `use` mas NAO sao hooks: nenhuma chama
 * useState, useEffect ou qualquer outro hook. Sao leitores sincronos que
 * consultam um singleton e devolvem o valor na hora, entao podem ser
 * chamadas de classe, de callback e de dentro de condicional sem quebrar
 * nada. O ESLint julga so pelo prefixo, e por isso acusava
 * `react-hooks/rules-of-hooks` em todo consumidor.
 *
 * Desligar a regra AQUI, na origem, e mais honesto do que espalhar
 * eslint-disable por cada arquivo que as usa. Renomear para `getPlan` /
 * `getFeature` seria o certo de verdade, mas mexe em 12 arquivos e fica
 * para quando alguem encostar nessa area.
 */
/* eslint-disable react-hooks/rules-of-hooks */
/**
 * Hooks React/TS para gerenciamento de features no frontend
 */

import React from 'react';
import { Feature, licenseManager, PlanTier } from './LicenseManager';
import { EventEmitter } from 'events';

// Event bus para mudanças de licença
class LicenseEventBus extends EventEmitter {}
export const licenseEvents = new LicenseEventBus();

/**
 * Hook para verificar se feature está disponível
 */
export function useFeature(feature: Feature): {
  isAvailable: boolean;
  canUpgrade: boolean;
  requiredPlan: PlanTier | null;
} {
  const isAvailable = licenseManager.hasFeature(feature);
  
  // Encontra o menor plano que tem essa feature
  let requiredPlan: PlanTier | null = null;
  if (!isAvailable) {
    const plans = [PlanTier.STARTER, PlanTier.PROFESSIONAL, PlanTier.ENTERPRISE];
    for (const tier of plans) {
      const plan = licenseManager.getCurrentPlan();
      if (plan && licenseManager.canUpgradeTo(tier)) {
        requiredPlan = tier;
        break;
      }
    }
  }

  return {
    isAvailable,
    canUpgrade: requiredPlan !== null,
    requiredPlan
  };
}

/**
 * Hook para verificar múltiplas features
 */
export function useFeatures(features: Feature[]): {
  available: Feature[];
  missing: Feature[];
  allAvailable: boolean;
} {
  const available = features.filter(f => licenseManager.hasFeature(f));
  const missing = features.filter(f => !licenseManager.hasFeature(f));

  return {
    available,
    missing,
    allAvailable: missing.length === 0
  };
}

/**
 * Hook para obter informações do plano atual
 */
export function usePlan() {
  const plan = licenseManager.getCurrentPlan();
  const license = licenseManager.getLicense();
  
  return {
    tier: plan?.tier,
    name: plan?.name,
    price: plan?.price,
    features: licenseManager.getAvailableFeatures(),
    limits: plan?.limits,
    isActive: licenseManager.isActive(),
    isTrial: licenseManager.isTrial(),
    daysRemaining: licenseManager.getDaysRemaining(),
    canUpgradeTo: (tier: PlanTier) => licenseManager.canUpgradeTo(tier)
  };
}

/**
 * Hook para verificar limites de uso
 */
export function useLimit(limitKey: keyof import('./LicenseManager').PlanLimits, currentValue: number) {
  const limit = licenseManager.getLimit(limitKey);
  const isWithinLimit = licenseManager.isWithinLimit(limitKey, currentValue);
  const isUnlimited = limit === -1;
  
  const percentage = isUnlimited ? 0 : (currentValue / limit) * 100;

  return {
    limit,
    current: currentValue,
    isWithinLimit,
    isUnlimited,
    percentage,
    remaining: isUnlimited ? Infinity : Math.max(0, limit - currentValue),
    isNearLimit: !isUnlimited && percentage > 80
  };
}

/**
 * Utility: Componente wrapper condicional baseado em feature
 */
export function withFeature<P extends object>(
  Component: React.ComponentType<P>,
  requiredFeatures: Feature[],
  FallbackComponent?: React.ComponentType<{ missingFeatures: Feature[] }>
): React.ComponentType<P> {
  const ComponenteComLicenca = (props: P) => {
    const { allAvailable, missing } = useFeatures(requiredFeatures);

    if (allAvailable) {
      return React.createElement(Component, props);
    }

    if (FallbackComponent) {
      return React.createElement(FallbackComponent, { missingFeatures: missing });
    }

    return null;
  };
  // Sem displayName o componente embrulhado vira "Anonymous" no DevTools e nas
  // stacks — justo quando se está investigando por que a feature sumiu.
  ComponenteComLicenca.displayName = `withFeature(${Component.displayName || Component.name || 'Componente'})`;

  return ComponenteComLicenca;
}

/**
 * Utility: Guard de feature (retorna boolean)
 */
export function hasFeature(feature: Feature): boolean {
  return licenseManager.hasFeature(feature);
}

/**
 * Utility: Guard de múltiplas features
 */
export function hasAllFeatures(...features: Feature[]): boolean {
  return licenseManager.hasFeatures(features);
}

/**
 * Utility: Verifica se pode usar recurso antes de executar ação
 */
export function withFeatureCheck<T>(
  feature: Feature,
  action: () => T,
  onBlocked?: (feature: Feature) => void
): T | null {
  if (licenseManager.hasFeature(feature)) {
    return action();
  }

  if (onBlocked) {
    onBlocked(feature);
  }

  return null;
}

/**
 * Service: Inicializa licença do usuário (chamar no login)
 */
export async function initializeLicense(userId: string, organizationId: string): Promise<void> {
  try {
    // Buscar licença da API
    const response = await fetch(`/api/license/${organizationId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch license');
    }

    const licenseData = await response.json();
    
    // Converter datas
    licenseData.startDate = new Date(licenseData.startDate);
    licenseData.endDate = new Date(licenseData.endDate);
    
    // Configurar no license manager
    licenseManager.setLicense(licenseData);
    
    // Emitir evento de atualização
    licenseEvents.emit('license:updated', licenseData);
    
    console.log('License initialized:', licenseData);
  } catch (error) {
    console.error('Failed to initialize license:', error);
    throw error;
  }
}

/**
 * Service: Atualiza licença (após upgrade/downgrade)
 */
export async function refreshLicense(): Promise<void> {
  const license = licenseManager.getLicense();
  if (license) {
    await initializeLicense(license.userId, license.organizationId);
  }
}

/**
 * Exemplo de uso em componentes:
 * 
 * // Verificar feature única
 * const { isAvailable } = useFeature(Feature.CLASH_DETECTION);
 * if (!isAvailable) {
 *   return <UpgradePrompt feature={Feature.CLASH_DETECTION} />;
 * }
 * 
 * // Verificar múltiplas features
 * const { allAvailable, missing } = useFeatures([
 *   Feature.VIDEO_CONFERENCING,
 *   Feature.SCREEN_SHARING
 * ]);
 * 
 * // Informações do plano
 * const { name, daysRemaining, isTrial } = usePlan();
 * 
 * // Verificar limites
 * const projectLimit = useLimit('maxProjects', currentProjects.length);
 * if (!projectLimit.isWithinLimit) {
 *   return <LimitReachedMessage />;
 * }
 * 
 * // HOC com fallback
 * const AdvancedFeature = withFeature(
 *   AdvancedComponent,
 *   [Feature.CUSTOM_AVATARS],
 *   UpgradePrompt
 * );
 */

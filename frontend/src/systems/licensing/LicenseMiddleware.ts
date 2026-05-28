/**
 * Middleware Express para validar permissões de features
 */

import { Request, Response, NextFunction } from 'express';
import { Feature, licenseManager } from './LicenseManager';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  organizationId?: string;
  license?: any;
}

/**
 * Middleware para verificar se usuário tem permissão para usar uma feature
 */
export function requireFeature(...features: Feature[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Verifica se usuário está autenticado
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Autenticação necessária'
      });
    }

    // Verifica se tem licença ativa
    if (!licenseManager.isActive()) {
      return res.status(403).json({
        error: 'License expired',
        message: 'Licença expirada. Renove sua assinatura.',
        upgradeUrl: '/pricing'
      });
    }

    // Verifica cada feature requerida
    const missingFeatures = features.filter(f => !licenseManager.hasFeature(f));

    if (missingFeatures.length > 0) {
      const currentPlan = licenseManager.getCurrentPlan();
      
      return res.status(403).json({
        error: 'Feature not available',
        message: `Recurso não disponível no plano ${currentPlan?.name}`,
        missingFeatures,
        currentPlan: currentPlan?.tier,
        upgradeUrl: '/pricing'
      });
    }

    // Todas as features estão disponíveis
    next();
  };
}

/**
 * Middleware para verificar limites de uso
 */
export function checkLimit(limitKey: keyof import('./LicenseManager').PlanLimits) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Autenticação necessária'
      });
    }

    // Aqui você implementaria a lógica para obter o uso atual
    // Por exemplo, contar projetos do usuário, usuários ativos, etc.
    const currentUsage = await getCurrentUsage(req.organizationId!, limitKey);
    
    if (!licenseManager.isWithinLimit(limitKey, currentUsage)) {
      const limit = licenseManager.getLimit(limitKey);
      
      return res.status(429).json({
        error: 'Limit exceeded',
        message: `Limite de ${limitKey} excedido`,
        limit,
        current: currentUsage,
        upgradeUrl: '/pricing'
      });
    }

    next();
  };
}

/**
 * Helper para obter uso atual (mock - implementar com seu banco de dados)
 */
async function getCurrentUsage(organizationId: string, limitKey: string): Promise<number> {
  // TODO: Implementar busca real no banco de dados
  // Exemplos:
  // - maxProjects: SELECT COUNT(*) FROM projects WHERE org_id = ?
  // - maxUsers: SELECT COUNT(*) FROM users WHERE org_id = ?
  // - storageGB: SELECT SUM(file_size) FROM files WHERE org_id = ?
  
  return 0; // Mock
}

/**
 * Middleware para adicionar informações de licença na resposta
 */
export function attachLicenseInfo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.userId && licenseManager.isActive()) {
    const plan = licenseManager.getCurrentPlan();
    const daysRemaining = licenseManager.getDaysRemaining();
    
    res.locals.license = {
      plan: plan?.tier,
      planName: plan?.name,
      isTrial: licenseManager.isTrial(),
      daysRemaining,
      features: licenseManager.getAvailableFeatures()
    };
  }
  
  next();
}

/**
 * Exemplo de uso em rotas:
 * 
 * // Proteger rota que requer feature específica
 * app.post('/api/projects/clash-detection', 
 *   requireFeature(Feature.CLASH_DETECTION),
 *   handleClashDetection
 * );
 * 
 * // Verificar limite antes de criar recurso
 * app.post('/api/projects',
 *   checkLimit('maxProjects'),
 *   createProject
 * );
 * 
 * // Múltiplas features
 * app.post('/api/collaboration/video',
 *   requireFeature(Feature.REAL_TIME_COLLABORATION, Feature.VIDEO_CONFERENCING),
 *   startVideoCall
 * );
 */

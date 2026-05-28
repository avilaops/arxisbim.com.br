-- =====================================
-- Migration 006: Notifications System
-- =====================================
-- Descrição: Adiciona sistema completo de notificações em tempo real
-- Data: 2026-05-04
-- Autor: ArxisVR Development Team
-- =====================================

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  action_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE notifications IS 'Notificações do sistema para usuários (upload IFC, comentários, tarefas, etc)';
COMMENT ON COLUMN notifications.type IS 'Tipo de notificação: ifc_upload_complete, comment_added, task_assigned, meeting_started, etc';
COMMENT ON COLUMN notifications.priority IS 'Prioridade: low, medium, high, critical';
COMMENT ON COLUMN notifications.action_url IS 'URL para ação (link para modelo, comentário, projeto, etc)';
COMMENT ON COLUMN notifications.metadata IS 'Dados adicionais em JSON (IDs, nomes, contexto, etc)';

-- Índices para performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_tenant_id_idx ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Tabela de preferências de notificação
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  channels JSONB NOT NULL DEFAULT '["in_app"]',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, notification_type)
);

-- Comentários da tabela
COMMENT ON TABLE notification_preferences IS 'Preferências de entrega de notificações por usuário e tipo';
COMMENT ON COLUMN notification_preferences.notification_type IS 'Tipo de notificação (ex: ifc_upload_complete)';
COMMENT ON COLUMN notification_preferences.channels IS 'Canais de entrega: ["in_app", "email", "push", "sms"]';
COMMENT ON COLUMN notification_preferences.enabled IS 'Se o usuário quer receber este tipo de notificação';

-- Índices para performance
CREATE INDEX IF NOT EXISTS notification_prefs_user_id_idx ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS notification_prefs_tenant_id_idx ON notification_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS notification_prefs_type_idx ON notification_preferences(notification_type);

-- =====================================
-- TRIGGER: Atualizar updated_at automaticamente
-- =====================================
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_prefs_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_prefs_updated_at();

-- =====================================
-- INSERIR PREFERÊNCIAS PADRÃO
-- =====================================
-- Comentário: As preferências padrão podem ser inseridas quando um usuário é criado
-- Por enquanto, deixamos vazio e criamos sob demanda no service

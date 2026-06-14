import React, { useState, useEffect } from 'react';
import { getAPIClient } from '../../api/v1/client.js';
import '../../styles/pages/cost-management.css';

interface CostTable {
  id: string;
  project_id: string;
  name: string;
  description: string;
  created_at: string;
}

export function CostManagement() {
  const [tables, setTables] = useState<CostTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableDesc, setNewTableDesc] = useState('');

  useEffect(() => {
    loadTables();
  }, []);

  async function loadTables() {
    try {
      const client = getAPIClient();
      const res = await client.get('/cost-tables');
      setTables(res.data);
    } catch (err) {
      console.error('Failed to load cost tables:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTable() {
    if (!newTableName.trim()) return;

    try {
      const client = getAPIClient();
      await client.post('/cost-tables', {
        name: newTableName,
        description: newTableDesc,
      });
      setNewTableName('');
      setNewTableDesc('');
      setFormOpen(false);
      await loadTables();
    } catch (err) {
      console.error('Failed to create cost table:', err);
    }
  }

  async function handleDeleteTable(tableId: string) {
    if (!confirm('Delete this cost table?')) return;

    try {
      const client = getAPIClient();
      await client.delete(`/cost-tables/${tableId}`);
      await loadTables();
    } catch (err) {
      console.error('Failed to delete cost table:', err);
    }
  }

  return (
    <div className="cost-management">
      <div className="cost-mgmt-header">
        <h1>Tabelas de Custo</h1>
        <button
          className="btn-primary"
          onClick={() => setFormOpen(!formOpen)}
        >
          {formOpen ? 'Cancelar' : '+ Nova Tabela'}
        </button>
      </div>

      {formOpen && (
        <div className="cost-mgmt-form">
          <input
            type="text"
            placeholder="Nome da tabela"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
          />
          <textarea
            placeholder="Descrição (opcional)"
            value={newTableDesc}
            onChange={(e) => setNewTableDesc(e.target.value)}
            rows={3}
          />
          <button className="btn-primary" onClick={handleCreateTable}>
            Criar
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <div className="cost-tables-list">
          {tables.length === 0 ? (
            <div className="empty-state">
              Nenhuma tabela de custo criada. Clique em "Nova Tabela" para começar.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Criada em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr key={table.id}>
                    <td><strong>{table.name}</strong></td>
                    <td>{table.description || '—'}</td>
                    <td>{new Date(table.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <button
                        className="btn-link"
                        onClick={() => {
                          window.location.href = `/cost-items/${table.id}`;
                        }}
                      >
                        Itens
                      </button>
                      <button
                        className="btn-link btn-danger"
                        onClick={() => handleDeleteTable(table.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

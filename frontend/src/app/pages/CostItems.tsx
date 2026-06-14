import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAPIClient } from '../../api/v1/client.js';
import '../../styles/pages/cost-items.css';

interface CostItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  unit_price: string;
}

export function CostItems() {
  const { tableId } = useParams<{ tableId: string }>();
  const [items, setItems] = useState<CostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    unit: 'un',
    unit_price: '0.00',
  });

  useEffect(() => {
    loadItems();
  }, [tableId]);

  async function loadItems() {
    if (!tableId) return;
    try {
      const client = getAPIClient();
      const res = await client.get(`/cost-tables/${tableId}/items`);
      setItems(res.data);
    } catch (err) {
      console.error('Failed to load cost items:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem() {
    if (!tableId || !formData.code.trim()) return;

    try {
      const client = getAPIClient();
      await client.post(`/cost-tables/${tableId}/items`, {
        code: formData.code,
        description: formData.description,
        unit: formData.unit,
        unit_price: formData.unit_price,
      });
      setFormData({ code: '', description: '', unit: 'un', unit_price: '0.00' });
      setFormOpen(false);
      await loadItems();
    } catch (err) {
      console.error('Failed to add cost item:', err);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm('Remover este item?')) return;

    try {
      const client = getAPIClient();
      await client.delete(`/cost-items/${itemId}`);
      await loadItems();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  }

  return (
    <div className="cost-items">
      <div className="items-header">
        <h1>Itens de Custo</h1>
        <button
          className="btn-primary"
          onClick={() => setFormOpen(!formOpen)}
        >
          {formOpen ? 'Cancelar' : '+ Novo Item'}
        </button>
      </div>

      {formOpen && (
        <div className="items-form">
          <input
            type="text"
            placeholder="Código"
            value={formData.code}
            onChange={(e) =>
              setFormData({ ...formData, code: e.target.value })
            }
          />
          <textarea
            placeholder="Descrição"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={2}
          />
          <input
            type="text"
            placeholder="Unidade (un, m, m2, m3, kg, etc)"
            value={formData.unit}
            onChange={(e) =>
              setFormData({ ...formData, unit: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Preço unitário"
            step="0.01"
            value={formData.unit_price}
            onChange={(e) =>
              setFormData({ ...formData, unit_price: e.target.value })
            }
          />
          <button className="btn-primary" onClick={handleAddItem}>
            Adicionar
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : (
        <div className="items-list">
          {items.length === 0 ? (
            <div className="empty-state">
              Nenhum item adicionado. Clique em "+ Novo Item" para começar.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Unidade</th>
                  <th>Preço</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><code>{item.code}</code></td>
                    <td>{item.description}</td>
                    <td>{item.unit}</td>
                    <td>R$ {parseFloat(item.unit_price).toFixed(2)}</td>
                    <td>
                      <button
                        className="btn-link btn-danger"
                        onClick={() => handleDeleteItem(item.id)}
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

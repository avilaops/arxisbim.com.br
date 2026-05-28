import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions } from './Dialog';
import { Button } from './Button';

export default {
  title: 'UI Components/Dialog',
  component: Dialog,
  tags: ['autodocs'],
};

export const Default = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Título do Diálogo</DialogTitle>
        <DialogContent>Conteúdo do diálogo</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    );
  },
};

export const Small = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Dialog open={open} onClose={() => setOpen(false)} size="sm">
        <DialogTitle>Diálogo Pequeno</DialogTitle>
        <DialogContent>Conteúdo pequeno</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    );
  },
};

export const Large = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Dialog open={open} onClose={() => setOpen(false)} size="lg">
        <DialogTitle>Diálogo Grande</DialogTitle>
        <DialogContent>Conteúdo grande com mais informações</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={() => setOpen(false)}>Confirmar</Button>
        </DialogActions>
      </Dialog>
    );
  },
};

export const Confirmation = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>Tem certeza que deseja remover este item? Esta ação não pode ser desfeita.</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="danger" onClick={() => setOpen(false)}>Excluir</Button>
        </DialogActions>
      </Dialog>
    );
  },
};

export const WithButton = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setOpen(true)}>Abrir Diálogo</Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Diálogo Controlado</DialogTitle>
        <DialogContent>Este diálogo é controlado por um botão externo</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

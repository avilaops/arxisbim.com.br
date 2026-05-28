import React from 'react';
import { Input } from './Input';

export default {
  title: 'UI Components/Input',
  component: Input,
  tags: ['autodocs'],
};

export const Default = {
  args: {
    placeholder: 'Digite algo...',
  },
};

export const WithLabel = {
  args: {
    label: 'Nome',
    placeholder: 'Digite seu nome',
  },
};

export const WithError = {
  args: {
    label: 'Email',
    placeholder: 'seu@email.com',
    error: 'Email inválido',
  },
};

export const WithHelperText = {
  args: {
    label: 'Senha',
    type: 'password',
    helperText: 'Mínimo 8 caracteres',
  },
};

export const Small = {
  args: {
    size: 'sm',
    placeholder: 'Small input',
  },
};

export const Medium = {
  args: {
    size: 'md',
    placeholder: 'Medium input',
  },
};

export const Large = {
  args: {
    size: 'lg',
    placeholder: 'Large input',
  },
};

export const Disabled = {
  args: {
    label: 'Desabilitado',
    disabled: true,
    value: 'Não pode editar',
  },
};

export const AllStates = () => (
  <div className="space-y-4 max-w-md">
    <Input label="Normal" placeholder="Input normal" />
    <Input label="Com erro" placeholder="Input com erro" error="Campo obrigatório" />
    <Input label="Desabilitado" disabled value="Não pode editar" />
    <Input label="Com helper" placeholder="Input com helper" helperText="Texto de ajuda" />
  </div>
);

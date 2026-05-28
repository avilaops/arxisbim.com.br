import React from 'react';
import { Panel } from './Panel';

export default {
  title: 'UI Components/Panel',
  component: Panel,
  tags: ['autodocs'],
};

export const Default = {
  args: {
    title: 'Painel Padrão',
    children: <p>Conteúdo do painel</p>,
  },
};

export const Small = {
  args: {
    title: 'Painel Pequeno',
    size: 'sm',
    children: <p>Conteúdo do painel pequeno</p>,
  },
};

export const Medium = {
  args: {
    title: 'Painel Médio',
    size: 'md',
    children: <p>Conteúdo do painel médio</p>,
  },
};

export const Large = {
  args: {
    title: 'Painel Grande',
    size: 'lg',
    children: <p>Conteúdo do painel grande</p>,
  },
};

export const GlassVariant = {
  args: {
    title: 'Painel Glass',
    variant: 'glass',
    children: <p>Conteúdo com efeito glassmorphism</p>,
  },
};

export const ElevatedVariant = {
  args: {
    title: 'Painel Elevado',
    variant: 'elevated',
    children: <p>Conteúdo com sombra elevada</p>,
  },
};

export const WithoutTitle = {
  args: {
    children: <p>Painel sem título</p>,
  },
};

export const WithCloseButton = {
  args: {
    title: 'Painel com Fechar',
    onClose: () => alert('Fechado!'),
    children: <p>Conteúdo do painel</p>,
  },
};

export const AllVariants = () => (
  <div className="space-y-4">
    <Panel title="Default" size="md">
      <p>Painel padrão</p>
    </Panel>
    <Panel title="Glass" variant="glass" size="md">
      <p>Painel com efeito glass</p>
    </Panel>
    <Panel title="Elevated" variant="elevated" size="md">
      <p>Painel elevado</p>
    </Panel>
  </div>
);

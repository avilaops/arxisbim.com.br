import React from 'react';
import { Button } from './Button';

/**
 * Button Component Stories
 * Documentation and examples for the Button component
 */

export default {
  title: 'UI Components/Button',
  component: Button,
  tags: ['autodocs'],
};

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Danger = {
  args: {
    variant: 'danger',
    children: 'Danger Button',
  },
};

export const Ghost = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

export const Success = {
  args: {
    variant: 'success',
    children: 'Success Button',
  },
};

export const Small = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Medium = {
  args: {
    size: 'md',
    children: 'Medium Button',
  },
};

export const Large = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

export const WithIcon = {
  args: {
    icon: '📤',
    children: 'Upload',
  },
};

export const Loading = {
  args: {
    loading: true,
    children: 'Loading...',
  },
};

export const Disabled = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const AllVariants = () => (
  <div className="flex flex-wrap gap-4">
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="danger">Danger</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="success">Success</Button>
  </div>
);

export const AllSizes = () => (
  <div className="flex items-center gap-4">
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
  </div>
);

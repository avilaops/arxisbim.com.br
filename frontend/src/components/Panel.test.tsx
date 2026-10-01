import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Panel } from './Panel';
import { vi } from 'vitest';

describe('Panel Component', () => {
  it('renders title when provided', () => {
    render(<Panel title="Test Panel">Content</Panel>);
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<Panel>Panel Content</Panel>);
    expect(screen.getByText('Panel Content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<Panel title="Test" onClose={handleClose}>Content</Panel>);
    const closeButton = screen.getByLabelText('Fechar painel');
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render close button when onClose is not provided', () => {
    render(<Panel title="Test">Content</Panel>);
    expect(screen.queryByLabelText('Fechar painel')).not.toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<Panel title="Test">Content</Panel>);
    const panel = screen.getByRole('region');
    expect(panel).toHaveAttribute('aria-labelledby', 'panel-title');
  });
});

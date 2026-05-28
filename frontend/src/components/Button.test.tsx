import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} loading>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders icon when provided', () => {
    render(<Button icon="📤">Upload</Button>);
    expect(screen.getByText('📤')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<Button variant="primary">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
    
    rerender(<Button variant="danger">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<Button size="sm">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3');
    
    rerender(<Button size="lg">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6');
  });

  it('has correct accessibility attributes', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });
});

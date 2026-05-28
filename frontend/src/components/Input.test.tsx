import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input Component', () => {
  it('renders correctly', () => {
    render(<Input placeholder="Test" />);
    expect(screen.getByPlaceholderText('Test')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Name" />);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('calls onChange when value changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('shows error message when error prop is provided', () => {
    render(<Input error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('shows helper text when provided', () => {
    render(<Input helperText="Enter your email" />);
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('has correct accessibility attributes', () => {
    render(<Input label="Email" error="Invalid" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('debe renderizar el botón con texto correcto', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('debe aplicar la variante primary por defecto', () => {
    render(<Button>Primary</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('debe aplicar la variante secondary cuando se especifica', () => {
    render(<Button variant="secondary">Secondary</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-100');
  });

  it('debe aplicar la variante danger cuando se especifica', () => {
    render(<Button variant="danger">Danger</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600');
  });

  it('debe aplicar tamaño md por defecto', () => {
    render(<Button>Medium</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-4 py-2');
  });

  it('debe aplicar tamaño sm cuando se especifica', () => {
    render(<Button size="sm">Small</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-3 py-1.5');
  });

  it('debe aplicar tamaño lg cuando se especifica', () => {
    render(<Button size="lg">Large</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-6 py-3');
  });

  it('debe mostrar spinner de loading cuando loading es true', () => {
    render(<Button loading>Loading...</Button>);
    
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('debe deshabilitar el botón cuando loading es true', () => {
    render(<Button loading>Loading...</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('debe deshabilitar el botón cuando disabled es true', () => {
    render(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('debe llamar al onClick cuando se hace click', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('no debe llamar al onClick cuando está deshabilitado', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('debe aplicar clases personalizadas', () => {
    render(<Button className="custom-class">Custom</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('debe pasar props adicionales al elemento button', () => {
    render(<Button data-testid="test-button" aria-label="Test Button">Test</Button>);
    
    const button = screen.getByTestId('test-button');
    expect(button).toHaveAttribute('aria-label', 'Test Button');
  });
});

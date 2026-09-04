import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Login } from '../Login';

// Mock del store de autenticación
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: any) => {
    if (typeof selector === 'function') {
      return selector({
        login: vi.fn(),
        logout: vi.fn(),
        user: null,
        isAuthenticated: false,
      });
    }
    return selector({
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
      isAuthenticated: false,
    });
  },
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar el formulario de login correctamente', () => {
    renderWithRouter(<Login />);
    
    expect(screen.getByText('SKYNET ERP')).toBeInTheDocument();
    expect(screen.getByText('Sistema de Gestión Empresarial')).toBeInTheDocument();
    expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument();
  });

  it('debe mostrar error cuando las credenciales son inválidas', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Credenciales inválidas'));
    
    vi.mocked(await import('@/stores/authStore')).useAuthStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({ login: mockLogin });
      }
      return { login: mockLogin };
    });

    renderWithRouter(<Login />);
    
    fireEvent.change(screen.getByLabelText(/empresa/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/usuario/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
    });
  });

  it('debe deshabilitar el botón durante el loading', async () => {
    let resolveLogin: (value: unknown) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    
    const mockLogin = vi.fn().mockReturnValue(loginPromise);
    
    vi.mocked(await import('@/stores/authStore')).useAuthStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector({ login: mockLogin });
      }
      return { login: mockLogin };
    });

    renderWithRouter(<Login />);
    
    fireEvent.change(screen.getByLabelText(/empresa/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/usuario/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled();
    });
    
    // Limpiar la promesa pendiente
    resolveLogin!(undefined);
  });

  it('debe permitir ingresar credenciales en los campos', () => {
    renderWithRouter(<Login />);
    
    const empresaInput = screen.getByLabelText(/empresa/i);
    const usuarioInput = screen.getByLabelText(/usuario/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    
    fireEvent.change(empresaInput, { target: { value: '2' } });
    fireEvent.change(usuarioInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    
    expect(empresaInput).toHaveValue('2');
    expect(usuarioInput).toHaveValue('admin');
    expect(passwordInput).toHaveValue('secret123');
  });

  it('debe mostrar iconos de Lucide en los campos', () => {
    renderWithRouter(<Login />);
    
    // Verificar que los iconos estén presentes (representados por SVG)
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });
});

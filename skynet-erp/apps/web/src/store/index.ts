import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id_usuario: number;
  login: string;
  nombres: string;
  apellidos: string;
  email?: string;
  id_mi_empresa: number;
  id_mi_sede?: number;
  id_mi_almacen?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      updateSession: () => set((state) => ({ ...state })),
    }),
    {
      name: 'skynet-auth',
    }
  )
);

interface AppState {
  currentEmpresa: number | null;
  currentSede: number | null;
  currentAlmacen: number | null;
  sidebarOpen: boolean;
  setEmpresa: (id: number) => void;
  setSede: (id: number) => void;
  setAlmacen: (id: number) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentEmpresa: null,
  currentSede: null,
  currentAlmacen: null,
  setEmpresa: (id) => set({ currentEmpresa: id }),
  setSede: (id) => set({ currentSede: id }),
  setAlmacen: (id) => set({ currentAlmacen: id }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

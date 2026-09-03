import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Usuario, Empresa, Sede, Almacen } from '@/types'

interface AuthState {
  usuario: Usuario | null
  empresa: Empresa | null
  sede: Sede | null
  almacen: Almacen | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string, idEmpresa: number) => Promise<void>
  logout: () => void
  setEmpresa: (empresa: Empresa) => void
  setSede: (sede: Sede) => void
  setAlmacen: (almacen: Almacen) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      empresa: null,
      sede: null,
      almacen: null,
      token: null,
      isAuthenticated: false,

      login: async (username: string, password: string, idEmpresa: number) => {
        // TODO: Implementar llamada real a la API
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, idEmpresa }),
        })
        
        if (!response.ok) {
          throw new Error('Credenciales inválidas')
        }
        
        const data = await response.json()
        set({
          usuario: data.usuario,
          empresa: data.empresa,
          sede: data.sede,
          almacen: data.almacen,
          token: data.token,
          isAuthenticated: true,
        })
      },

      logout: () => {
        set({
          usuario: null,
          empresa: null,
          sede: null,
          almacen: null,
          token: null,
          isAuthenticated: false,
        })
      },

      setEmpresa: (empresa: Empresa) => set({ empresa }),
      setSede: (sede: Sede) => set({ sede }),
      setAlmacen: (almacen: Almacen) => set({ almacen }),
    }),
    {
      name: 'skynet-auth',
    }
  )
)

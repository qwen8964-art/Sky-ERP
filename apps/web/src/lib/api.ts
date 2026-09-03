// API client para comunicación con el backend
import { useAuthStore } from '@/stores/authStore'

const API_BASE = '/api'

export const api = {
  // Auth
  auth: {
    login: async (username: string, password: string, idEmpresa: number) => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, idEmpresa }),
      })
      if (!response.ok) throw await response.json()
      return response.json()
    },
  },

  // Empresas
  empresas: {
    list: () => fetcher('/empresas'),
    get: (id: number) => fetcher(`/empresas/${id}`),
    create: (data: unknown) => poster('/empresas', data),
    update: (id: number, data: unknown) => putter(`/empresas/${id}`, data),
    delete: (id: number) => deleter(`/empresas/${id}`),
  },

  // Sedes
  sedes: {
    list: (filters?: Record<string, unknown>) => fetcher(`/sedes${queryString(filters)}`),
    get: (id: number) => fetcher(`/sedes/${id}`),
    create: (data: unknown) => poster('/sedes', data),
    update: (id: number, data: unknown) => putter(`/sedes/${id}`, data),
    delete: (id: number) => deleter(`/sedes/${id}`),
  },

  // Almacenes
  almacenes: {
    list: (filters?: Record<string, unknown>) => fetcher(`/almacenes${queryString(filters)}`),
    get: (id: number) => fetcher(`/almacenes/${id}`),
    create: (data: unknown) => poster('/almacenes', data),
    update: (id: number, data: unknown) => putter(`/almacenes/${id}`, data),
    delete: (id: number) => deleter(`/almacenes/${id}`),
  },

  // Productos
  productos: {
    list: (filters?: Record<string, unknown>) => fetcher(`/productos${queryString(filters)}`),
    get: (id: number) => fetcher(`/productos/${id}`),
    create: (data: unknown) => poster('/productos', data),
    update: (id: number, data: unknown) => putter(`/productos/${id}`, data),
    delete: (id: number) => deleter(`/productos/${id}`),
  },

  // Clientes
  clientes: {
    list: (filters?: Record<string, unknown>) => fetcher(`/clientes${queryString(filters)}`),
    get: (id: number) => fetcher(`/clientes/${id}`),
    create: (data: unknown) => poster('/clientes', data),
    update: (id: number, data: unknown) => putter(`/clientes/${id}`, data),
    delete: (id: number) => deleter(`/clientes/${id}`),
  },

  // Proveedores
  proveedores: {
    list: (filters?: Record<string, unknown>) => fetcher(`/proveedores${queryString(filters)}`),
    get: (id: number) => fetcher(`/proveedores/${id}`),
    create: (data: unknown) => poster('/proveedores', data),
    update: (id: number, data: unknown) => putter(`/proveedores/${id}`, data),
    delete: (id: number) => deleter(`/proveedores/${id}`),
  },

  // Cotizaciones
  cotizaciones: {
    list: (filters?: Record<string, unknown>) => fetcher(`/cotizaciones${queryString(filters)}`),
    get: (id: number) => fetcher(`/cotizaciones/${id}`),
    create: (data: unknown) => poster('/cotizaciones', data),
    update: (id: number, data: unknown) => putter(`/cotizaciones/${id}`, data),
    aprobar: (id: number) => poster(`/cotizaciones/${id}/aprobar`, {}),
    anular: (id: number) => poster(`/cotizaciones/${id}/anular`, {}),
    delete: (id: number) => deleter(`/cotizaciones/${id}`),
  },

  // Comprobantes de Venta
  comprobantesVenta: {
    list: (filters?: Record<string, unknown>) => fetcher(`/comprobantes-venta${queryString(filters)}`),
    get: (id: number) => fetcher(`/comprobantes-venta/${id}`),
    create: (data: unknown) => poster('/comprobantes-venta', data),
    update: (id: number, data: unknown) => putter(`/comprobantes-venta/${id}`, data),
    aprobar: (id: number) => poster(`/comprobantes-venta/${id}/aprobar`, {}),
    anular: (id: number) => poster(`/comprobantes-venta/${id}/anular`, {}),
    delete: (id: number) => deleter(`/comprobantes-venta/${id}`),
  },

  // Stock
  stock: {
    list: (filters?: Record<string, unknown>) => fetcher(`/stock${queryString(filters)}`),
    byProducto: (idProducto: number) => fetcher(`/stock/producto/${idProducto}`),
    byAlmacen: (idAlmacen: number) => fetcher(`/stock/almacen/${idAlmacen}`),
  },

  // Kardex
  kardex: {
    list: (filters?: Record<string, unknown>) => fetcher(`/kardex${queryString(filters)}`),
    byProducto: (idProducto: number) => fetcher(`/kardex/producto/${idProducto}`),
  },
}

async function fetcher(url: string) {
  const token = useAuthStore.getState().token
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }))
    throw new Error(error.message || 'Error en la petición')
  }
  return response.json()
}

async function poster(url: string, data: unknown) {
  const token = useAuthStore.getState().token
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }))
    throw new Error(error.message || 'Error en la petición')
  }
  return response.json()
}

async function putter(url: string, data: unknown) {
  const token = useAuthStore.getState().token
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }))
    throw new Error(error.message || 'Error en la petición')
  }
  return response.json()
}

async function deleter(url: string) {
  const token = useAuthStore.getState().token
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }))
    throw new Error(error.message || 'Error en la petición')
  }
}

function queryString(filters?: Record<string, unknown>): string {
  if (!filters) return ''
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value))
    }
  })
  const str = params.toString()
  return str ? `?${str}` : ''
}

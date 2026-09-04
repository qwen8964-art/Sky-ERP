import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'

const API_BASE = '/api'

async function fetcher<T>(url: string): Promise<T> {
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

async function poster<T>(url: string, data: unknown): Promise<T> {
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

async function putter<T>(url: string, data: unknown): Promise<T> {
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

async function deleter(url: string): Promise<void> {
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

// Hooks genéricos para CRUD
export function useList<T>(endpoint: string, filters?: Record<string, unknown>) {
  const queryString = filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : ''
  return useQuery({
    queryKey: [endpoint, filters],
    queryFn: () => fetcher<T[]>(`${endpoint}${queryString}`),
  })
}

export function useDetail<T>(endpoint: string, id: number) {
  return useQuery({
    queryKey: [endpoint, id],
    queryFn: () => fetcher<T>(`${endpoint}/${id}`),
    enabled: !!id,
  })
}

export function useCreate<T>(endpoint: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => poster<T>(endpoint, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] })
    },
  })
}

export function useUpdate<T>(endpoint: string, id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => putter<T>(`${endpoint}/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] })
    },
  })
}

export function useDelete(endpoint: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleter(endpoint),
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })
}

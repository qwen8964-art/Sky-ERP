import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'PEN') {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: Date | string, format: string = 'short') {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  
  if (format === 'short') {
    return d.toLocaleDateString('es-PE')
  } else if (format === 'long') {
    return d.toLocaleDateString('es-PE', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  } else if (format === 'time') {
    return d.toLocaleTimeString('es-PE')
  }
  return d.toLocaleString('es-PE')
}

export function parseDecimal(value: string): number {
  return parseFloat(value.replace(/,/g, '')) || 0
}

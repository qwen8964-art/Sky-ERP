import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { LogOut, Building2, MapPin, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const navigate = useNavigate()
  const { usuario, empresa, sede, almacen, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Topbar */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">SKYNET ERP</h1>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{usuario?.nombre}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Info bar */}
      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center space-x-6 text-sm">
            {empresa && (
              <div className="flex items-center text-gray-700">
                <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                <span className="font-medium">Empresa:</span>
                <span className="ml-2">{empresa.razonSocial}</span>
              </div>
            )}
            {sede && (
              <div className="flex items-center text-gray-700">
                <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                <span className="font-medium">Sede:</span>
                <span className="ml-2">{sede.nombre}</span>
              </div>
            )}
            {almacen && (
              <div className="flex items-center text-gray-700">
                <Package className="h-4 w-4 mr-2 text-blue-600" />
                <span className="font-medium">Almacén:</span>
                <span className="ml-2">{almacen.nombre}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Ventas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas</h3>
            <ul className="space-y-2">
              <li><a href="/ventas/cotizaciones" className="text-blue-600 hover:text-blue-800">Cotizaciones</a></li>
              <li><a href="/ventas/comprobantes" className="text-blue-600 hover:text-blue-800">Comprobantes de Venta</a></li>
              <li><a href="/ventas/tpv" className="text-blue-600 hover:text-blue-800">Punto de Venta (TPV)</a></li>
            </ul>
          </div>

          {/* Compras */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compras</h3>
            <ul className="space-y-2">
              <li><a href="/compras/ordenes" className="text-blue-600 hover:text-blue-800">Órdenes de Compra</a></li>
              <li><a href="/compras/comprobantes" className="text-blue-600 hover:text-blue-800">Comprobantes de Compra</a></li>
            </ul>
          </div>

          {/* Inventario */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventario</h3>
            <ul className="space-y-2">
              <li><a href="/inventario/productos" className="text-blue-600 hover:text-blue-800">Productos</a></li>
              <li><a href="/inventario/stock" className="text-blue-600 hover:text-blue-800">Stock</a></li>
              <li><a href="/inventario/kardex" className="text-blue-600 hover:text-blue-800">Kardex</a></li>
            </ul>
          </div>

          {/* Finanzas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Finanzas</h3>
            <ul className="space-y-2">
              <li><a href="/finanzas/ctas-cobrar" className="text-blue-600 hover:text-blue-800">Cuentas por Cobrar</a></li>
              <li><a href="/finanzas/ctas-pagar" className="text-blue-600 hover:text-blue-800">Cuentas por Pagar</a></li>
              <li><a href="/finanzas/caja-banco" className="text-blue-600 hover:text-blue-800">Caja y Banco</a></li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

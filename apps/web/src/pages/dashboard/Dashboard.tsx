import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle, DollarSign, FileText, Truck } from 'lucide-react';

interface DashboardMetric {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  color: string;
}

const metrics: DashboardMetric[] = [
  { title: 'Ventas Hoy', value: 'S/ 12,450', change: '+12%', icon: ShoppingCart, color: 'text-green-600' },
  { title: 'Productos Stock Bajo', value: '23', change: '-5%', icon: AlertTriangle, color: 'text-red-600' },
  { title: 'Clientes Activos', value: '145', change: '+8%', icon: Users, color: 'text-blue-600' },
  { title: 'Cuentas por Cobrar', value: 'S/ 45,230', change: '+3%', icon: DollarSign, color: 'text-orange-600' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      
      {/* Métricas Principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className={`text-xs ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {metric.change} vs mes anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos y Tablas Resumen */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventas Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <p className="text-gray-500">Gráfico de ventas (implementar con Recharts)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Package className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium">Producto {i}</p>
                      <p className="text-sm text-gray-500">Categoría {i}</p>
                    </div>
                  </div>
                  <span className="font-semibold">{100 - i * 10} un.</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { type: 'stock', message: 'Producto XYZ bajo stock mínimo', severity: 'warning' },
              { type: 'vencimiento', message: 'Letra de cambio vence mañana', severity: 'high' },
              { type: 'documento', message: 'Guía de salida pendiente de aprobar', severity: 'medium' },
            ].map((alert, i) => (
              <div key={i} className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                <AlertTriangle className={`h-5 w-5 ${
                  alert.severity === 'high' ? 'text-red-600' : 
                  alert.severity === 'warning' ? 'text-orange-600' : 'text-yellow-600'
                }`} />
                <p className="text-sm">{alert.message}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

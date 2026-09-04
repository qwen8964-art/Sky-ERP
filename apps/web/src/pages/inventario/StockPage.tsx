import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, TrendingUp, AlertTriangle, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function StockPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [almacenFilter, setAlmacenFilter] = useState<string>('all');

  const { data: stockData, isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: () => api.get('/api/stock').then(res => res.json()),
  });

  const { data: almacenes } = useQuery({
    queryKey: ['almacenes'],
    queryFn: () => api.get('/api/almacenes').then(res => res.json()),
  });

  // Calcular totales
  const totalProductos = stockData?.length || 0;
  const productosBajoStock = stockData?.filter((s: any) => s.cantidad <= s.stockMinimo).length || 0;
  const valorTotalInventario = stockData?.reduce((sum: number, s: any) => sum + (s.cantidad * s.precioCompra), 0) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Control de Stock</h1>

      {/* Métricas */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{productosBajoStock}</div>
            <p className="text-xs text-red-600">Requieren reposición</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {valorTotalInventario.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Almacenes</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{almacenes?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="almacen">Almacén</Label>
              <select
                id="almacen"
                value={almacenFilter}
                onChange={(e) => setAlmacenFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="all">Todos los almacenes</option>
                {almacenes?.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="busqueda">Buscar Producto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="busqueda"
                  placeholder="Código o nombre del producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Stock */}
      <Card>
        <CardHeader>
          <CardTitle>Stock por Producto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Código</th>
                  <th className="text-left p-3">Producto</th>
                  <th className="text-left p-3">Almacén</th>
                  <th className="text-right p-3">Cantidad</th>
                  <th className="text-right p-3">Stock Mín</th>
                  <th className="text-right p-3">Stock Máx</th>
                  <th className="text-right p-3">P. Compra</th>
                  <th className="text-center p-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {stockData?.filter((s: any) => {
                  const matchSearch = s.producto?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     s.producto?.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchAlmacen = almacenFilter === 'all' || s.almacenId === parseInt(almacenFilter);
                  return matchSearch && matchAlmacen;
                }).map((stock: any) => (
                  <tr key={stock.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{stock.producto?.codigo}</td>
                    <td className="p-3">{stock.producto?.nombre}</td>
                    <td className="p-3">{stock.almacen?.nombre}</td>
                    <td className={`p-3 text-right font-semibold ${
                      stock.cantidad <= stock.stockMinimo ? 'text-red-600' : ''
                    }`}>
                      {stock.cantidad}
                    </td>
                    <td className="p-3 text-right">{stock.stockMinimo}</td>
                    <td className="p-3 text-right">{stock.stockMaximo}</td>
                    <td className="p-3 text-right">S/ {stock.producto?.precioCompra?.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      {stock.cantidad <= stock.stockMinimo ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Bajo Stock
                        </span>
                      ) : stock.cantidad >= stock.stockMaximo ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Stock Máx
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

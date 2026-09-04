import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Search, TrendingUp, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ContabilidadPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cuentaFilter, setCuentaFilter] = useState<string>('all');

  const { data: planCuentas } = useQuery({
    queryKey: ['plan-cuentas'],
    queryFn: () => api.get('/api/plan-cuentas').then(res => res.json()),
  });

  const { data: libroDiario } = useQuery({
    queryKey: ['libro-diario'],
    queryFn: () => api.get('/api/libro-diario').then(res => res.json()),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Contabilidad</h1>

      {/* Métricas */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cuentas</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planCuentas?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asientos Mes</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{libroDiario?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debe</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ 0.00</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Haber</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ 0.00</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="cuenta">Cuenta Contable</Label>
              <select
                id="cuenta"
                value={cuentaFilter}
                onChange={(e) => setCuentaFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="all">Todas</option>
                {planCuentas?.slice(0, 10).map((c: any) => (
                  <option key={c.id} value={c.codigo}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="busqueda">Búsqueda</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="busqueda"
                  placeholder="Buscar cuenta o asiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan de Cuentas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Plan de Cuentas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Código</th>
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Nivel</th>
                </tr>
              </thead>
              <tbody>
                {planCuentas?.slice(0, 10).map((cuenta: any) => (
                  <tr key={cuenta.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono">{cuenta.codigo}</td>
                    <td className="p-3">{cuenta.nombre}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        cuenta.tipo === 'ACTIVO' ? 'bg-blue-100 text-blue-800' :
                        cuenta.tipo === 'PASIVO' ? 'bg-red-100 text-red-800' :
                        cuenta.tipo === 'PATRIMONIO' ? 'bg-purple-100 text-purple-800' :
                        cuenta.tipo === 'INGRESO' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {cuenta.tipo}
                      </span>
                    </td>
                    <td className="p-3">{cuenta.nivel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Libro Diario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Libro Diario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-left p-3">Asiento</th>
                  <th className="text-left p-3">Cuenta</th>
                  <th className="text-right p-3">Debe</th>
                  <th className="text-right p-3">Haber</th>
                  <th className="text-left p-3">Glosa</th>
                </tr>
              </thead>
              <tbody>
                {libroDiario?.slice(0, 10).map((asiento: any) => (
                  <tr key={asiento.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{new Date(asiento.fecha).toLocaleDateString()}</td>
                    <td className="p-3 font-mono">{asiento.numeroAsiento}</td>
                    <td className="p-3">{asiento.cuenta?.nombre}</td>
                    <td className="p-3 text-right">S/ {asiento.debe?.toFixed(2)}</td>
                    <td className="p-3 text-right">S/ {asiento.haber?.toFixed(2)}</td>
                    <td className="p-3 text-sm">{asiento.glosa}</td>
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

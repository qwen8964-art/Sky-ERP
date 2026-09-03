import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Users, Eye, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

export default function CuentasCobrarPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');

  const { data: ctasCobrar, isLoading } = useQuery({
    queryKey: ['ctas-cobrar'],
    queryFn: () => api.get('/api/ctas-cobrar').then(res => res.json()),
  });

  const columns = [
    { key: 'numero', label: 'Número', sortable: true },
    { key: 'documento', label: 'Documento', sortable: true },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'fechaEmision', label: 'Fecha Emisión', sortable: true },
    { key: 'fechaVencimiento', label: 'Vencimiento', sortable: true },
    { 
      key: 'montoTotal', 
      label: 'Monto Total', 
      sortable: true, 
      render: (value: number) => `S/ ${value.toFixed(2)}` 
    },
    { 
      key: 'montoPendiente', 
      label: 'Pendiente', 
      sortable: true,
      render: (value: number) => `S/ ${value.toFixed(2)}` 
    },
    { 
      key: 'estado', 
      label: 'Estado', 
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Cancelado' ? 'bg-green-100 text-green-800' :
          value === 'Parcial' ? 'bg-yellow-100 text-yellow-800' :
          value === 'Anulado' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {value}
        </span>
      )
    },
  ];

  const actions = (row: any) => [
    <Button key="view" size="sm" variant="outline">
      <Eye className="h-4 w-4 mr-1" /> Ver
    </Button>,
    row.estado === 'Pendiente' && (
      <Button key="amortizar" size="sm">
        <DollarSign className="h-4 w-4 mr-1" /> Amortizar
      </Button>
    ),
  ];

  // Calcular totales
  const totalPendiente = ctasCobrar?.filter((c: any) => c.estado === 'Pendiente')
    .reduce((sum: number, c: any) => sum + c.montoPendiente, 0) || 0;
  const totalParcial = ctasCobrar?.filter((c: any) => c.estado === 'Parcial')
    .reduce((sum: number, c: any) => sum + c.montoPendiente, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Cuentas por Cobrar</h1>
      </div>

      {/* Métricas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">S/ {totalPendiente.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parcial</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">S/ {totalParcial.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Activos</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ctasCobrar?.filter((c: any) => ['Pendiente', 'Parcial'].includes(c.estado)).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="all">Todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Parcial">Parcial</option>
                <option value="Cancelado">Cancelado</option>
                <option value="Anulado">Anulado</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="busqueda">Búsqueda</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="busqueda"
                  placeholder="Buscar por cliente, número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Cuentas por Cobrar</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={ctasCobrar?.filter((c: any) => {
              const matchSearch = c.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 c.numero?.toLowerCase().includes(searchTerm.toLowerCase());
              const matchEstado = estadoFilter === 'all' || c.estado === estadoFilter;
              return matchSearch && matchEstado;
            }) || []}
            actions={actions}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

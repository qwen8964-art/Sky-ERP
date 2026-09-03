import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, FileText, Printer, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

export default function ComprobantesVentaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState<string>('all');

  const { data: comprobantes, isLoading } = useQuery({
    queryKey: ['comprobantes-venta'],
    queryFn: () => api.get('/api/comprobantes-venta').then(res => res.json()),
  });

  const columns = [
    { key: 'numero', label: 'Número', sortable: true },
    { key: 'tipo', label: 'Tipo', sortable: true },
    { key: 'cliente', label: 'Cliente', sortable: true },
    { key: 'fecha', label: 'Fecha', sortable: true },
    { key: 'total', label: 'Total', sortable: true, render: (value: number) => `S/ ${value.toFixed(2)}` },
    { 
      key: 'estado', 
      label: 'Estado', 
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Aprobado' ? 'bg-green-100 text-green-800' :
          value === 'Anulado' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
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
    <Button key="print" size="sm" variant="outline">
      <Printer className="h-4 w-4 mr-1" /> Imprimir
    </Button>,
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Comprobantes de Venta</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Comprobante
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="tipo">Tipo de Comprobante</Label>
              <select
                id="tipo"
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="all">Todos</option>
                <option value="FACTURA">Factura</option>
                <option value="BOLETA">Boleta</option>
                <option value="NC">Nota de Crédito</option>
                <option value="ND">Nota de Débito</option>
              </select>
            </div>
            <div>
              <Label htmlFor="fecha-desde">Fecha Desde</Label>
              <Input id="fecha-desde" type="date" />
            </div>
            <div>
              <Label htmlFor="fecha-hasta">Fecha Hasta</Label>
              <Input id="fecha-hasta" type="date" />
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <Search className="h-4 w-4 mr-2" /> Filtrar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Comprobantes */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por número, cliente, RUC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={comprobantes || []}
            actions={actions}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

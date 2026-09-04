import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Package, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

export default function ProductosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [familiaFilter, setFamiliaFilter] = useState<string>('all');

  const { data: productos, isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: () => api.get('/api/productos').then(res => res.json()),
  });

  const { data: familias } = useQuery({
    queryKey: ['familias'],
    queryFn: () => api.get('/api/familias').then(res => res.json()),
  });

  const columns = [
    { key: 'codigo', label: 'Código', sortable: true },
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'familia', label: 'Familia', sortable: true },
    { key: 'precioCompra', label: 'P. Compra', sortable: true, render: (value: number) => `S/ ${value.toFixed(2)}` },
    { key: 'precioVenta', label: 'P. Venta', sortable: true, render: (value: number) => `S/ ${value.toFixed(2)}` },
    { key: 'stock', label: 'Stock', sortable: true },
    { 
      key: 'stockMinimo', 
      label: 'Stock Mín', 
      sortable: true,
      render: (_: number, row: any) => (
        <span className={row.stock <= row.stockMinimo ? 'text-red-600 font-bold' : ''}>
          {row.stockMinimo}
        </span>
      )
    },
    { 
      key: 'estado', 
      label: 'Estado', 
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
  ];

  const actions = (row: any) => [
    <Button key="view" size="sm" variant="outline">
      <Eye className="h-4 w-4 mr-1" /> Ver
    </Button>,
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Producto
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="familia">Familia</Label>
              <select
                id="familia"
                value={familiaFilter}
                onChange={(e) => setFamiliaFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="all">Todas</option>
                {familias?.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="busqueda">Búsqueda</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="busqueda"
                  placeholder="Buscar por código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Productos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Listado de Productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={productos?.filter((p: any) => {
              const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
              const matchFamilia = familiaFilter === 'all' || p.familiaId === parseInt(familiaFilter);
              return matchSearch && matchFamilia;
            }) || []}
            actions={actions}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

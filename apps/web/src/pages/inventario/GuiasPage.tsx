import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Truck, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

export default function GuiasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoGuiaFilter, setTipoGuiaFilter] = useState<string>('all');

  const { data: guias, isLoading } = useQuery({
    queryKey: ['guias'],
    queryFn: () => api.get('/api/guias').then(res => res.json()),
  });

  const columns = [
    { key: 'numero', label: 'Número', sortable: true },
    { key: 'tipo', label: 'Tipo', sortable: true },
    { key: 'almacenOrigen', label: 'Origen', sortable: true },
    { key: 'almacenDestino', label: 'Destino', sortable: true },
    { key: 'fecha', label: 'Fecha', sortable: true },
    { 
      key: 'estado', 
      label: 'Estado', 
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Guías de Almacén</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Nueva Guía
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="tipo">Tipo de Guía</Label>
              <select
                id="tipo"
                value={tipoGuiaFilter}
                onChange={(e) => setTipoGuiaFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="all">Todas</option>
                <option value="GI">Guía de Ingreso</option>
                <option value="GS">Guía de Salida</option>
              </select>
            </div>
            <div>
              <Label htmlFor="busqueda">Búsqueda</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="busqueda"
                  placeholder="Buscar por número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Truck className="h-5 w-5 mr-2" />
            Listado de Guías
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={guias?.filter((g: any) => {
              const matchSearch = g.numero?.toLowerCase().includes(searchTerm.toLowerCase());
              const matchTipo = tipoGuiaFilter === 'all' || g.tipo === tipoGuiaFilter;
              return matchSearch && matchTipo;
            }) || []}
            actions={actions}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

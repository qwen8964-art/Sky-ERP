import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Users, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

export default function TrabajadoresPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  const { data: trabajadores, isLoading } = useQuery({
    queryKey: ['trabajadores'],
    queryFn: () => api.get('/api/trabajadores').then(res => res.json()),
  });

  const columns = [
    { key: 'codigo', label: 'Código', sortable: true },
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'documento', label: 'DNI', sortable: true },
    { key: 'cargo', label: 'Cargo', sortable: true },
    { key: 'fechaIngreso', label: 'Fecha Ingreso', sortable: true },
    { 
      key: 'estadoContrato', 
      label: 'Estado', 
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Activo' ? 'bg-green-100 text-green-800' :
          value === 'Vacaciones' ? 'bg-blue-100 text-blue-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    },
  ];

  const actions = (row: any) => [
    <Button key="view" size="sm" variant="outline">
      <FileText className="h-4 w-4 mr-1" /> Ver
    </Button>,
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Trabajadores</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Trabajador
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trabajadores</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trabajadores?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {trabajadores?.filter((t: any) => t.estadoContrato === 'Activo').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Vacaciones</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {trabajadores?.filter((t: any) => t.estadoContrato === 'Vacaciones').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próx. Cumpleaños</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {trabajadores?.filter((t: any) => {
                const cumple = new Date(t.fechaNacimiento);
                const hoy = new Date();
                return cumple.getMonth() === hoy.getMonth() && cumple.getDate() >= hoy.getDate();
              }).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="area">Área</Label>
              <select
                id="area"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="all">Todas</option>
                <option value="ADMINISTRACION">Administración</option>
                <option value="VENTAS">Ventas</option>
                <option value="ALMACEN">Almacén</option>
                <option value="PRODUCCION">Producción</option>
              </select>
            </div>
            <div>
              <Label htmlFor="busqueda">Búsqueda</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="busqueda"
                  placeholder="Buscar por nombre o DNI..."
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
          <CardTitle>Listado de Trabajadores</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={trabajadores?.filter((t: any) => {
              const matchSearch = t.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 t.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 t.numeroDocumento?.includes(searchTerm);
              return matchSearch;
            }) || []}
            actions={actions}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

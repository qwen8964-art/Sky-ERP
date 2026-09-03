import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import type { Cotizacion } from '@prisma/client';

export default function CotizacionesPage() {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: cotizaciones, isLoading } = useQuery({
    queryKey: ['cotizaciones'],
    queryFn: () => api.get('/api/cotizaciones').then(res => res.json()),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/cotizaciones/${id}/aprobar`).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries(['cotizaciones']);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/cotizaciones/${id}/anular`).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries(['cotizaciones']);
    },
  });

  const columns = [
    { key: 'numero', label: 'Número', sortable: true },
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
    row.estado === 'Borrador' && (
      <Button
        key="approve"
        size="sm"
        variant="success"
        onClick={() => approveMutation.mutate(row.id)}
      >
        <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
      </Button>
    ),
    row.estado === 'Borrador' && (
      <Button
        key="cancel"
        size="sm"
        variant="destructive"
        onClick={() => cancelMutation.mutate(row.id)}
      >
        <XCircle className="h-4 w-4 mr-1" /> Anular
      </Button>
    ),
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Cotizaciones</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Cotización
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar por número, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={cotizaciones || []}
            actions={actions}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nueva Cotización"
      >
        <form className="space-y-4">
          <div>
            <Label htmlFor="cliente">Cliente</Label>
            <Input id="cliente" placeholder="Buscar cliente..." />
          </div>
          <div>
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" type="date" />
          </div>
          <div>
            <Label htmlFor="vendedor">Vendedor</Label>
            <Input id="vendedor" placeholder="Seleccionar vendedor..." />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

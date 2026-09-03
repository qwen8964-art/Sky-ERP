import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, BarChart3, TrendingUp, Package, ShoppingCart, Users, DollarSign, Printer, Download } from 'lucide-react';

interface Reporte {
  id: string;
  nombre: string;
  descripcion: string;
  modulo: string;
  icon: React.ElementType;
}

const reportes: Reporte[] = [
  // Ventas
  { id: 'venta-efectiva', nombre: 'Venta Efectiva', descripcion: 'Reporte de ventas efectivas por período', modulo: 'Ventas', icon: ShoppingCart },
  { id: 'venta-consolidada', nombre: 'Venta Consolidada', descripcion: 'Ventas consolidadas por producto/cliente', modulo: 'Ventas', icon: BarChart3 },
  { id: 'ranking-productos', nombre: 'Ranking Productos', descripcion: 'Productos más vendidos', modulo: 'Ventas', icon: TrendingUp },
  { id: 'ranking-clientes', nombre: 'Ranking Clientes', descripcion: 'Clientes con mayor volumen de compra', modulo: 'Ventas', icon: Users },
  
  // Compras
  { id: 'compra-efectiva', nombre: 'Compra Efectiva', descripcion: 'Reporte de compras efectivas por período', modulo: 'Compras', icon: ShoppingCart },
  { id: 'ranking-proveedores', nombre: 'Ranking Proveedores', descripcion: 'Proveedores con mayor volumen', modulo: 'Compras', icon: Users },
  
  // Inventario
  { id: 'kardex-general', nombre: 'Kardex General', descripcion: 'Movimientos de todos los productos', modulo: 'Inventario', icon: FileText },
  { id: 'kardex-producto', nombre: 'Kardex por Producto', descripcion: 'Movimientos de un producto específico', modulo: 'Inventario', icon: Package },
  { id: 'stock-productos', nombre: 'Stock de Productos', descripcion: 'Stock actual por producto y almacén', modulo: 'Inventario', icon: Package },
  { id: 'valorizado-inventario', nombre: 'Valorizado Inventario', descripcion: 'Valor total del inventario', modulo: 'Inventario', icon: DollarSign },
  
  // Finanzas
  { id: 'ctas-cobrar', nombre: 'Cuentas por Cobrar', descripcion: 'Estado de cuentas por cobrar', modulo: 'Finanzas', icon: DollarSign },
  { id: 'ctas-pagar', nombre: 'Cuentas por Pagar', descripcion: 'Estado de cuentas por pagar', modulo: 'Finanzas', icon: DollarSign },
  { id: 'letras-emitidas', nombre: 'Letras Emitidas', descripcion: 'Relación de letras emitidas', modulo: 'Finanzas', icon: FileText },
  { id: 'flujo-caja', nombre: 'Flujo de Caja', descripcion: 'Proyección de flujo de caja', modulo: 'Finanzas', icon: TrendingUp },
  
  // Contabilidad
  { id: 'libro-diario', nombre: 'Libro Diario', descripcion: 'Asientos contables del período', modulo: 'Contabilidad', icon: FileText },
  { id: 'libro-mayor', nombre: 'Libro Mayor', descripcion: 'Mayor por cuenta contable', modulo: 'Contabilidad', icon: FileText },
  { id: 'registro-ventas', nombre: 'Registro de Ventas', descripcion: 'Libro de ventas SUNAT', modulo: 'Contabilidad', icon: FileText },
  { id: 'registro-compras', nombre: 'Registro de Compras', descripcion: 'Libro de compras SUNAT', modulo: 'Contabilidad', icon: FileText },
  
  // RRHH
  { id: 'planilla-consolidada', nombre: 'Planilla Consolidada', descripcion: 'Planilla de remuneraciones', modulo: 'RRHH', icon: Users },
  { id: 'boletas-remuneracion', nombre: 'Boletas de Remuneración', descripcion: 'Boletas individuales', modulo: 'RRHH', icon: FileText },
  { id: 'vacaciones', nombre: 'Control Vacaciones', descripcion: 'Días de vacaciones por trabajador', modulo: 'RRHH', icon: FileText },
];

export default function ReportesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduloFilter, setModuloFilter] = useState<string>('all');

  const modulos = ['all', ...Array.from(new Set(reportes.map(r => r.modulo)))];

  const reportesFiltrados = reportes.filter(reporte => {
    const matchSearch = reporte.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       reporte.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchModulo = moduloFilter === 'all' || reporte.modulo === moduloFilter;
    return matchSearch && matchModulo;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="modulo">Módulo</Label>
              <select
                id="modulo"
                value={moduloFilter}
                onChange={(e) => setModuloFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                {modulos.map(mod => (
                  <option key={mod} value={mod}>
                    {mod === 'all' ? 'Todos los módulos' : mod}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="busqueda">Búsqueda</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="busqueda"
                  placeholder="Buscar reporte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listado de Reportes */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportesFiltrados.map((reporte) => (
          <Card key={reporte.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <reporte.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{reporte.nombre}</CardTitle>
                  <CardDescription>{reporte.modulo}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{reporte.descripcion}</p>
              <div className="flex space-x-2">
                <Button size="sm" className="flex-1">
                  <BarChart3 className="h-4 w-4 mr-2" /> Generar
                </Button>
                <Button size="sm" variant="outline">
                  <Printer className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

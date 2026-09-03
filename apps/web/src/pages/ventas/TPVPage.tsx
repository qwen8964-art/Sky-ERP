import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ProductoCarrito {
  id: number;
  productoId: number;
  codigo: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  impuesto: boolean;
  subtotal: number;
}

export default function TPVPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [almacenId, setAlmacenId] = useState<number>(1);
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([]);
  const queryClient = useQueryClient();

  const { data: productos } = useQuery({
    queryKey: ['productos-tpv', almacenId],
    queryFn: () => api.get(`/api/productos?almacenId=${almacenId}`).then(res => res.json()),
  });

  const agregarAlCarrito = (producto: any) => {
    const existente = carrito.find(item => item.productoId === producto.id);
    if (existente) {
      setCarrito(carrito.map(item =>
        item.productoId === producto.id
          ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precioUnitario }
          : item
      ));
    } else {
      setCarrito([...carrito, {
        id: Date.now(),
        productoId: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        cantidad: 1,
        precioUnitario: producto.precioVenta,
        impuesto: producto.impuesto,
        subtotal: producto.precioVenta,
      }]);
    }
  };

  const removerDelCarrito = (id: number) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const actualizarCantidad = (id: number, cantidad: number) => {
    if (cantidad <= 0) {
      removerDelCarrito(id);
      return;
    }
    setCarrito(carrito.map(item =>
      item.id === id
        ? { ...item, cantidad, subtotal: cantidad * item.precioUnitario }
        : item
    ));
  };

  const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  const procesarVentaMutation = useMutation({
    mutationFn: (ventaData: any) => api.post('/api/comprobantes-venta', ventaData).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries(['productos-tpv']);
      setCarrito([]);
      alert('Venta procesada exitosamente');
    },
  });

  const procesarVenta = () => {
    if (carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    procesarVentaMutation.mutate({
      tipoComprobante: 'BOLETA',
      clienteId: 1, // Cliente genérico para TPV
      almacenId,
      items: carrito.map(item => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        impuesto: item.impuesto,
      })),
      condicionPago: 'CONTADO',
    });
  };

  return (
    <div className="h-screen flex">
      {/* Panel Izquierdo - Productos */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Punto de Venta</h1>
          <select
            value={almacenId}
            onChange={(e) => setAlmacenId(Number(e.target.value))}
            className="rounded-md border px-3 py-2"
          >
            <option value={1}>Almacén Principal</option>
            <option value={2}>Almacén Secundario</option>
          </select>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar producto por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {productos?.filter((p: any) => 
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
          ).map((producto: any) => (
            <Card 
              key={producto.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => agregarAlCarrito(producto)}
            >
              <CardContent className="p-4">
                <p className="font-semibold text-sm">{producto.nombre}</p>
                <p className="text-xs text-gray-500">Cód: {producto.codigo}</p>
                <p className="text-lg font-bold text-green-600 mt-2">
                  S/ {producto.precioVenta.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">Stock: {producto.stock}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Panel Derecho - Carrito */}
      <div className="w-96 bg-gray-50 border-l p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <ShoppingCart className="h-5 w-5 mr-2" /> Carrito
        </h2>

        <div className="flex-1 overflow-auto space-y-2">
          {carrito.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Carrito vacío</p>
          ) : (
            carrito.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.nombre}</p>
                      <p className="text-xs text-gray-500">S/ {item.precioUnitario.toFixed(2)} c/u</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removerDelCarrito(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.cantidad}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <span className="font-semibold">S/ {item.subtotal.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Totales */}
        <Card className="mt-4">
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IGV (18%):</span>
              <span>S/ {igv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>S/ {total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full mt-4 h-12 text-lg" 
          size="lg"
          onClick={procesarVenta}
          disabled={carrito.length === 0 || procesarVentaMutation.isPending}
        >
          {procesarVentaMutation.isPending ? 'Procesando...' : 'Procesar Venta'}
        </Button>
      </div>
    </div>
  );
}

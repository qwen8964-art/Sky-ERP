import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.middleware';

const salesRoutes = new Hono();

// Todas las rutas de ventas requieren autenticación
salesRoutes.use('/*', authMiddleware);

// Rutas placeholder para módulo de ventas
// Se implementarán en siguientes iteraciones:
// - Cotizaciones (CRUD)
// - Comprobantes de Venta (Factura, Boleta, NC, ND)
// - TPV (Punto de Venta)
// - Listas de Precios
// - Promociones
// - Vendedores
// - Guías de Salida
// - Clientes

salesRoutes.get('/', (c) => {
  return c.json({
    message: 'Módulo de Ventas - SKYNET ERP API',
    endpoints: {
      cotizaciones: '/api/sales/cotizaciones',
      comprobantes: '/api/sales/comprobantes',
      tpv: '/api/sales/tpv',
      listasPrecios: '/api/sales/listas-precios',
      promociones: '/api/sales/promociones',
      vendedores: '/api/sales/vendedores',
      clientes: '/api/sales/clientes',
      guiasSalida: '/api/sales/guias-salida',
    },
  });
});

export default salesRoutes;

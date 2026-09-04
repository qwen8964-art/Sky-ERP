import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

const app = new Hono();

// Middleware global
app.use('*', logger());
app.use('*', cors());
app.use('*', secureHeaders());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API version
app.get('/api', (c) => {
  return c.json({
    name: 'SKYNET ERP API',
    version: '1.0.0',
    description: 'API moderna para SKYNET ERP',
    endpoints: {
      auth: '/api/auth',
      empresas: '/api/empresas',
      sedes: '/api/sedes',
      almacenes: '/api/almacenes',
      usuarios: '/api/usuarios',
      personas: '/api/personas',
      productos: '/api/productos',
      ventas: '/api/ventas',
      compras: '/api/compras',
      inventario: '/api/inventario',
      finanzas: '/api/finanzas',
      contabilidad: '/api/contabilidad',
      rrhh: '/api/rrhh',
      produccion: '/api/produccion',
      capacitacion: '/api/capacitacion',
      reportes: '/api/reportes',
    },
  });
});

export default app;

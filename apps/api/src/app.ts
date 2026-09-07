import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Importar routers de módulos
import authRouter from './modules/auth/routes.js';
import coreRouter from './modules/core/routes.js';

// Importar routers de rutas - Config
import empresasRouter from './routes/config/empresas.js';
import sedesRouter from './routes/config/sedes.js';
import almacenesRouter from './routes/config/almacenes.js';
import monedasRouter from './routes/config/monedas.js';
import tipoCambioRouter from './routes/config/tipo-cambio.js';

// Maestros
import personasRouter from './routes/maestros/personas.js';
import clientesRouter from './routes/maestros/clientes.js';
import proveedoresRouter from './routes/maestros/proveedores.js';
import productosRouter from './routes/maestros/productos.js';
import familiasRouter from './routes/maestros/familias.js';
import listasPrecioRouter from './routes/maestros/listas-precio.js';
import vendedoresRouter from './routes/maestros/vendedores.js';

// Ventas
import cotizacionesRouter from './routes/ventas/cotizaciones.js';
import comprobantesVentaRouter from './routes/ventas/comprobantes.js';

// Inventario
import stockRouter from './routes/inventario/stock.js';
import guiasRouter from './routes/inventario/guias.js';

// Compras
import comprasRouter from './routes/compras/index.js';

// Finanzas
import cajaBancoRouter from './routes/finanzas/caja-banco.js';
import ctasCobrarRouter from './routes/finanzas/ctas-cobrar.js';
import ctasPagarRouter from './routes/finanzas/ctas-pagar.js';
import chequesRouter from './routes/finanzas/cheques.js';

// Contabilidad
import contabilidadRouter from './routes/contabilidad/index.js';

// RRHH
import rrhhRouter from './routes/rrhh/index.js';

// Producción
import produccionRouter from './routes/produccion/index.js';

// Capacitación
import capacitacionRouter from './routes/capacitacion/index.js';

// Alertas
import alertasRouter from './routes/alertas/index.js';

const app = new Hono();

// Middlewares globales
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Middleware de autenticación (se aplicará a rutas protegidas)
// TODO: Implementar middleware global para verificar JWT

// Rutas de autenticación
app.route('/api/auth', authRouter);

// Rutas del core
app.route('/api/core', coreRouter);

// Configuración
app.route('/api/empresas', empresasRouter);
app.route('/api/sedes', sedesRouter);
app.route('/api/almacenes', almacenesRouter);
app.route('/api/monedas', monedasRouter);
app.route('/api/tipo-cambio', tipoCambioRouter);

// Maestros
app.route('/api/personas', personasRouter);
app.route('/api/clientes', clientesRouter);
app.route('/api/proveedores', proveedoresRouter);
app.route('/api/productos', productosRouter);
app.route('/api/familias', familiasRouter);
app.route('/api/listas-precio', listasPrecioRouter);
app.route('/api/vendedores', vendedoresRouter);

// Ventas
app.route('/api/cotizaciones', cotizacionesRouter);
app.route('/api/comprobantes-venta', comprobantesVentaRouter);

// Inventario
app.route('/api/stock', stockRouter);
app.route('/api/guias', guiasRouter);

// Compras
app.route('/api/compras', comprasRouter);

// Finanzas
app.route('/api/caja-banco', cajaBancoRouter);
app.route('/api/ctas-cobrar', ctasCobrarRouter);
app.route('/api/ctas-pagar', ctasPagarRouter);
app.route('/api/cheques', chequesRouter);

// Contabilidad
app.route('/api/contabilidad', contabilidadRouter);

// RRHH
app.route('/api/rrhh', rrhhRouter);

// Producción
app.route('/api/produccion', produccionRouter);

// Capacitación
app.route('/api/capacitacion', capacitacionRouter);

// Alertas
app.route('/api/alertas', alertasRouter);

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

export default app;

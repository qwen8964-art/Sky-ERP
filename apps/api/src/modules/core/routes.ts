import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.middleware';
import { 
  getEmpresas, 
  getEmpresaById, 
  createEmpresa, 
  updateEmpresa, 
  deleteEmpresa 
} from '../controllers/empresa.controller';
import {
  getSedes,
  getSedeById,
  createSede,
  updateSede,
  deleteSede
} from '../controllers/sede.controller';
import {
  getAlmacenes,
  getAlmacenById,
  createAlmacen,
  updateAlmacen,
  deleteAlmacen
} from '../controllers/almacen.controller';

const coreRoutes = new Hono();

// Rutas de Empresas (públicas para registro, protegidas para resto)
coreRoutes.get('/empresas', getEmpresas);
coreRoutes.get('/empresas/:id', getEmpresaById);
coreRoutes.post('/empresas', /* authMiddleware, */ createEmpresa);
coreRoutes.put('/empresas/:id', /* authMiddleware, */ updateEmpresa);
coreRoutes.delete('/empresas/:id', /* authMiddleware, */ deleteEmpresa);

// Rutas de Sedes (protegidas)
coreRoutes.use('/*', authMiddleware);
coreRoutes.get('/sedes', getSedes);
coreRoutes.get('/sedes/:id', getSedeById);
coreRoutes.post('/sedes', createSede);
coreRoutes.put('/sedes/:id', updateSede);
coreRoutes.delete('/sedes/:id', deleteSede);

// Rutas de Almacenes (protegidas)
coreRoutes.get('/almacenes', getAlmacenes);
coreRoutes.get('/almacenes/:id', getAlmacenById);
coreRoutes.post('/almacenes', createAlmacen);
coreRoutes.put('/almacenes/:id', updateAlmacen);
coreRoutes.delete('/almacenes/:id', deleteAlmacen);

export default coreRoutes;

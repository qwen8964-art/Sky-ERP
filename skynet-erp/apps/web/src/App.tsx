import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';

// Placeholder pages - se implementarán en fases siguientes
const Ventas = () => <div>Ventas Module</div>;
const Compras = () => <div>Compras Module</div>;
const Inventario = () => <div>Inventario Module</div>;
const Finanzas = () => <div>Finanzas Module</div>;
const Contabilidad = () => <div>Contabilidad Module</div>;
const RRHH = () => <div>RRHH Module</div>;
const Produccion = () => <div>Producción Module</div>;
const Capacitacion = () => <div>Capacitación Module</div>;
const CRM = () => <div>CRM Module</div>;
const TPV = () => <div>TPV Module</div>;
const NotFound = () => <div>404 - Página no encontrada</div>;

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="ventas/*" element={<Ventas />} />
        <Route path="compras/*" element={<Compras />} />
        <Route path="inventario/*" element={<Inventario />} />
        <Route path="finanzas/*" element={<Finanzas />} />
        <Route path="contabilidad/*" element={<Contabilidad />} />
        <Route path="rrhh/*" element={<RRHH />} />
        <Route path="produccion/*" element={<Produccion />} />
        <Route path="capacitacion/*" element={<Capacitacion />} />
        <Route path="crm/*" element={<CRM />} />
        <Route path="tpv" element={<TPV />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

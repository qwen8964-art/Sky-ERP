import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Wallet, 
  BookOpen, Users, Factory, GraduationCap, 
  UsersRound, MonitorPlay, Menu, X, LogOut,
  Building2, MapPin, Warehouse
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { title: 'Ventas', icon: ShoppingCart, path: '/ventas' },
  { title: 'Compras', icon: Package, path: '/compras' },
  { title: 'Inventario', icon: Package, path: '/inventario' },
  { title: 'Finanzas', icon: Wallet, path: '/finanzas' },
  { title: 'Contabilidad', icon: BookOpen, path: '/contabilidad' },
  { title: 'RRHH', icon: Users, path: '/rrhh' },
  { title: 'Producción', icon: Factory, path: '/produccion' },
  { title: 'Capacitación', icon: GraduationCap, path: '/capacitacion' },
  { title: 'CRM', icon: UsersRound, path: '/crm' },
  { title: 'TPV', icon: MonitorPlay, path: '/tpv' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 text-white transition-all duration-300 ease-in-out",
        sidebarOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <div className="p-4">
          <h1 className="text-2xl font-bold text-blue-400">SKYNET ERP</h1>
          <p className="text-xs text-gray-400 mt-1">Sistema de Gestión</p>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center px-4 py-3 text-sm transition-colors",
                  isActive 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.title}
              </Link>
            );
          })}
        </nav>
        
        {/* Info Empresa/Sede/Almacén */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-800">
          <div className="flex items-center text-xs text-gray-400 space-y-2">
            <div className="flex items-center">
              <Building2 className="w-3 h-3 mr-2" />
              Empresa: 1
            </div>
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-2" />
              Sede: 1
            </div>
            <div className="flex items-center">
              <Warehouse className="w-3 h-3 mr-2" />
              Almacén: 1
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Usuario Admin</span>
              <button className="p-2 rounded-lg hover:bg-gray-100 text-red-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

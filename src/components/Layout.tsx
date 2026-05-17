import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Calendar, PlusCircle, LogOut, Users, BookOpen } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import maraLogo from '../assets/mara.svg';

export default function Layout() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: Calendar, label: 'Citas' },
    { to: '/agendar', icon: PlusCircle, label: 'Agendar Manual' },
    { to: '/usuarios', icon: Users, label: 'Personal' },
    { to: '/catalogo', icon: BookOpen, label: 'Catálogo' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 glass-sidebar text-white p-6 flex flex-col fixed h-full animate-slide-right">
        <div className="mb-10 flex flex-col items-center">
          <img src={maraLogo} alt="Mara Studio" className="w-32 h-auto mb-2 drop-shadow-md" />
          <p className="text-xs text-white/70 mt-1 uppercase tracking-widest text-center">Admin Panel</p>
        </div>

        <nav className="flex-1 space-y-2 stagger-children">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-white/20 font-semibold shadow-inner'
                    : 'hover:bg-white/10 text-white/80'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/20 stagger-children">
          <div className="mb-4 px-4">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-white/70 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-white/80 transition-all text-left"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

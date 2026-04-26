import { Link, useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';

function Layout({ children }) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap size={18} className="text-yellow-400" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Flashy</span>
          </Link>
          {!isHome && (
            <Link
              to="/"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              All Sets
            </Link>
          )}
        </div>
      </nav>
      <main className="max-w-[1600px] mx-auto px-8 py-10">
        {children}
      </main>
    </div>
  );
}

export default Layout;

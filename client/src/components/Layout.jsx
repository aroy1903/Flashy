import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function Layout({ children }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { session } = useAuth();
  const email = session?.user?.email;

  const signOut = () => supabase.auth.signOut();

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/icon.png" alt="" className="w-8 h-8 rounded-lg group-hover:scale-110 transition-transform" />
            <span className="text-lg font-bold tracking-tight text-white">StuddyPebble</span>
          </Link>
          <div className="flex items-center gap-5">
            {!isHome && (
              <Link
                to="/"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                All Sets
              </Link>
            )}
            {email && (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-xs text-zinc-500">{email}</span>
                <button
                  onClick={signOut}
                  title="Sign out"
                  className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}

export default Layout;

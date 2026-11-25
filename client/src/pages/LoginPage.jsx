import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2.5 mb-10">
          <img src="/icon.png" alt="" className="w-8 h-8 rounded-lg" />
          <span className="text-lg font-bold tracking-tight text-white">StuddyPebble</span>
        </Link>

        <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
        <p className="text-sm text-zinc-500 mb-8">Sign in to keep studying</p>

        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
          placeholder="you@example.com"
          required
        />

        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
          placeholder="••••••••"
          required
        />

        {error && (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-sm text-zinc-500 text-center mt-6">
          No account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;

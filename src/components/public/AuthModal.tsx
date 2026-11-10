import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { Lock, Mail, User, Building, X, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload =
      mode === 'login'
        ? { email, password }
        : { email, name, studioName, password, preferredCurrency: 'USD' };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.user) {
        onAuthSuccess(data.user);
        onClose();
      } else {
        setError(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#181C24] border border-[#28303F] rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="text-xs font-mono text-[#06B6D4] uppercase">
            {mode === 'login' ? 'Studio Access' : 'Create Account'}
          </div>
          <h2 className="text-xl font-bold font-mono text-white mt-1">
            {mode === 'login' ? 'Log in to DrawMyRoom' : 'Start Designing Your Space'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access your spatial floorplans, 3D rooms, and saved BoQ specs.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-xs font-mono text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 font-mono text-xs">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-slate-300 block mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maya Chen"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#14171D] border border-[#28303F] rounded-lg pl-9 pr-3 py-2 text-white outline-none focus:border-[#E5855E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Studio / Home Address</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Chen Atelier or Apartment 4B"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    className="w-full bg-[#14171D] border border-[#28303F] rounded-lg pl-9 pr-3 py-2 text-white outline-none focus:border-[#E5855E]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-slate-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="architect@drawmyroom.studio"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#14171D] border border-[#28303F] rounded-lg pl-9 pr-3 py-2 text-white outline-none focus:border-[#E5855E]"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#14171D] border border-[#28303F] rounded-lg pl-9 pr-3 py-2 text-white outline-none focus:border-[#E5855E]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#E5855E] hover:bg-[#D2714A] disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#28303F] text-center text-xs font-mono text-slate-400">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-[#06B6D4] font-bold hover:underline"
              >
                Sign Up Free
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[#06B6D4] font-bold hover:underline"
              >
                Log In
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

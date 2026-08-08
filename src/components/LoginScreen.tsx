import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { User } from '../types';

const techBgImg = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80';

interface LoginScreenProps {
  users: User[];
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    const inputUsername = cleanEmail.split('@')[0];

    const found = users.find((u) => {
      const uClean = u.email.toLowerCase();
      const uUsername = uClean.split('@')[0];

      const matchesEmailOrUsername =
        uClean === cleanEmail ||
        (inputUsername.length > 0 && uUsername === inputUsername);

      return matchesEmailOrUsername && u.senha === senha;
    });

    if (found) {
      onLogin(found);
    } else {
      setError('Email ou senha incorretos. Verifique as credenciais.');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 font-sans text-slate-900">
      {/* Futuristic Background Image */}
      <img
        src={techBgImg}
        alt="Fundo Tecnológico Futurista"
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover object-center scale-105 filter blur-[1px] opacity-80"
      />

      {/* Soft Dark Dimming Overlay ("Efeito Fusco / Ambient Glow") */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/85 via-slate-900/70 to-slate-950/80 backdrop-blur-[2px]" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur-md transition-all duration-300">
        {/* Logo Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00B2FF] font-black text-2xl text-white shadow-lg shadow-[#00B2FF]/30">
            SM
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">SisMob</h1>
          <p className="mt-1 text-xs text-slate-500 font-semibold">
            Sistema de Mobilização de Saúde Comunitária
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Email do Utilizador
            </label>
            <div className="relative mt-1.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#00B2FF] focus:bg-white focus:ring-2 focus:ring-[#00B2FF]/20"
                id="input-login-email"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Senha de Acesso
            </label>
            <div className="relative mt-1.5">
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#00B2FF] focus:bg-white focus:ring-2 focus:ring-[#00B2FF]/20"
                id="input-login-senha"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-center text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="flex w-full h-12 items-center justify-center gap-2 rounded-xl bg-[#00B2FF] text-sm font-semibold text-white shadow-md shadow-[#00B2FF]/20 transition hover:bg-[#009ee3] active:scale-[0.98]"
            id="btn-login-submit"
          >
            <span>Entrar no Sistema</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Melo Tech Footer Badge in Login */}
        <div className="mt-6 pt-4 border-t border-slate-200/80 text-center space-y-1">
          <p className="text-[11px] font-extrabold text-slate-700">
            MELO TECH • <span className="text-blue-600 font-bold">INOVAÇÃO DIGITAL</span>
          </p>
          <p className="text-[10px] text-slate-500 font-medium">
            © {new Date().getFullYear()} Todos os direitos reservados
          </p>
          <a
            href="mailto:v.angola.nova@gmail.com"
            className="inline-block text-[10px] font-bold text-blue-600 hover:underline pt-0.5"
          >
            Suporte Técnico: v.angola.nova@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
};

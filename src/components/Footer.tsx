import React from 'react';
import { Mail, Code2, ExternalLink, Heart } from 'lucide-react';
import { Tooltip as ActionTooltip } from './Tooltip';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-8 py-6 px-4 sm:px-6 transition-colors print:hidden border-t border-slate-300/60">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        
        {/* Left Section: Company & Slogan */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xs shadow-xs">
              <Code2 className="h-4 w-4" />
            </div>
            <span className="font-black text-slate-950 text-base tracking-tight">
              MELO TECH
            </span>
          </div>

          <span className="hidden sm:inline text-slate-400 font-black">|</span>

          <div className="flex items-center gap-1.5 font-extrabold">
            <span className="uppercase tracking-wider text-[10px] bg-blue-600 text-white px-2.5 py-0.5 rounded-md shadow-xs font-black">
              INOVAÇÃO DIGITAL
            </span>
          </div>
        </div>

        {/* Center Section: Copyright & Slogan */}
        <div className="text-center font-bold text-xs text-slate-800 space-y-0.5">
          <p>© {currentYear} <strong className="text-slate-950 font-black">MELO TECH</strong>. Todos os direitos reservados.</p>
          <p className="text-[11px] text-slate-700 font-extrabold flex items-center justify-center gap-1">
            <span>Desenvolvido para gestão e controlo de campanhas de saúde</span>
            <Heart className="h-3.5 w-3.5 text-rose-600 fill-rose-600 inline" />
          </p>
        </div>

        {/* Right Section: Support & Contact */}
        <div className="flex items-center gap-3">
          <ActionTooltip content="Enviar email diretamente para o suporte técnico da MELO TECH">
            <a
              href="mailto:v.angola.nova@gmail.com?subject=Suporte%20Melo%20Tech%20-%20Plataforma%20de%20Mobilizacao"
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3.5 py-1.5 font-black text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition text-xs group cursor-pointer shadow-xs"
            >
              <Mail className="h-4 w-4 text-blue-600 group-hover:text-white transition" />
              <span>Suporte Técnico</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          </ActionTooltip>

          <span className="text-xs font-mono font-black text-slate-900 bg-white border border-slate-300 px-2.5 py-1 rounded-lg shadow-2xs hidden lg:inline">
            v.angola.nova@gmail.com
          </span>
        </div>

      </div>
    </footer>
  );
};


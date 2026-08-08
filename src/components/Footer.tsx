import React from 'react';
import { Mail, ShieldCheck, Code2, ExternalLink, Heart } from 'lucide-react';
import { Tooltip as ActionTooltip } from './Tooltip';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-6 px-4 sm:px-6 transition-colors print:hidden">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
        
        {/* Left Section: Company & Slogan */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xs shadow-xs">
              <Code2 className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
              MELO TECH
            </span>
          </div>

          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>

          <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
            <span className="uppercase tracking-wider text-[10px] bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              INOVAÇÃO DIGITAL
            </span>
          </div>
        </div>

        {/* Center Section: Copyright */}
        <div className="text-center font-medium text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
          <p>© {currentYear} <strong className="text-slate-800 dark:text-slate-200">MELO TECH</strong>. Todos os direitos reservados.</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
            <span>Desenvolvido para gestão e controlo de campanhas de saúde</span>
            <Heart className="h-3 w-3 text-rose-500 fill-rose-500 inline" />
          </p>
        </div>

        {/* Right Section: Support & Contact */}
        <div className="flex items-center gap-3">
          <ActionTooltip content="Enviar email diretamente para o suporte técnico da MELO TECH">
            <a
              href="mailto:v.angola.nova@gmail.com?subject=Suporte%20Melo%20Tech%20-%20Plataforma%20de%20Mobilizacao"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 font-extrabold text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:border-blue-600 transition shadow-2xs text-[11px] group cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5 text-blue-500 group-hover:text-white transition" />
              <span>Suporte Técnico</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </ActionTooltip>

          <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-600 hidden lg:inline">
            v.angola.nova@gmail.com
          </span>
        </div>

      </div>
    </footer>
  );
};

import React, { useState, useRef } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  delayMs?: number; // 2000ms delay as requested ("passar o mause por cima de um botão e ficar lá 2 segundos")
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  delayMs = 2000,
  children,
  position = 'top',
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  // Clone child element to attach mouse events and native title attribute
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
        onMouseEnter: (e: React.MouseEvent) => {
          handleMouseEnter();
          if ((children.props as any)?.onMouseEnter) {
            (children.props as any).onMouseEnter(e);
          }
        },
        onMouseLeave: (e: React.MouseEvent) => {
          handleMouseLeave();
          if ((children.props as any)?.onMouseLeave) {
            (children.props as any).onMouseLeave(e);
          }
        },
        title: (children.props as any)?.title || content,
      })
    : children;

  return (
    <div className={`relative inline-flex ${className}`}>
      {child}
      {visible && (
        <div
          className={`absolute z-50 pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95 ${positionClasses[position]}`}
        >
          <div className="bg-slate-900/95 backdrop-blur-md text-white text-[11px] font-semibold py-1.5 px-3 rounded-xl border border-slate-700 shadow-xl max-w-xs whitespace-normal flex items-center gap-1.5 leading-snug">
            <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>{content}</span>
          </div>
        </div>
      )}
    </div>
  );
};

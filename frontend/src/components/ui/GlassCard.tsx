import { ReactNode } from 'react';

export function GlassCard({ children, title, className = '' }: { children: ReactNode, title?: string, className?: string }) {
  return (
    <div className={`glass-panel p-6 ${className}`}>
      {title && <h3 className="text-lg font-medium text-gray-200 mb-4">{title}</h3>}
      {children}
    </div>
  );
}
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata = {
  title: 'SIMA - Sistema Inteligente',
  description: 'Sistema Inteligente de Mistura Automatizada',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 overflow-y-auto bg-background p-6">
          {children}
        </main>
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
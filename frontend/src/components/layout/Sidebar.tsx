import Link from 'next/link';
import { Activity, Settings, Beaker, History, Droplets, Home, Sliders } from 'lucide-react';

export function Sidebar() {
  const menu = [
    { name: 'Dashboard', icon: Home, path: '/' },
    { name: 'Controle', icon: Sliders, path: '/controle' },
    { name: 'Receitas', icon: Beaker, path: '/receitas' },
    { name: 'Recipientes', icon: Droplets, path: '/recipientes' },
    { name: 'Histórico', icon: History, path: '/historico' },
    { name: 'Monitoramento', icon: Activity, path: '/monitoramento' },
    { name: 'Configurações', icon: Settings, path: '/configuracoes' },
  ];

  return (
    <aside className="w-64 h-screen border-r border-white/10 bg-surface/50 backdrop-blur-xl flex flex-col hidden md:flex fixed">
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-neon neon-shadow flex items-center justify-center">
          <Beaker className="text-background" size={20} />
        </div>
        <h1 className="font-bold text-lg text-white tracking-wide">SIMA <span className="text-neon text-xs">v1.0</span></h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menu.map((item) => (
          <Link key={item.path} href={item.path} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
            <item.icon size={20} />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
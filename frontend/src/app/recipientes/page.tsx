'use client'
import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Droplets, Package, AlertTriangle } from 'lucide-react';
import { api } from '@/services/api';

export default function RecipientesPage() {
  const [containers, setContainers] = useState<any[]>([]);

  useEffect(() => {
    api.get('/containers')
      .then(response => setContainers(response.data))
      .catch(error => console.error("Erro ao buscar recipientes", error));
  }, []);

  const getIcon = (type: string) => type === 'liquid' ? Droplets : Package;
  const getColor = (id: string) => id === 'water' ? 'bg-neon' : id === 'powder' ? 'bg-warning' : 'bg-gray-600';

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Droplets className="text-neon" /> Controle de Recipientes
        </h2>
        <p className="text-gray-400 text-sm mt-1">Níveis estimados (estoque virtual) baseados no consumo das receitas executadas.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {containers.map((recipiente) => {
          const Icon = getIcon(recipiente.type);
          const nivelPct = Math.round((recipiente.current_level / recipiente.capacity_max) * 100);
          const consumido = recipiente.capacity_max - recipiente.current_level;

          return (
            <GlassCard key={recipiente.id} className="flex flex-col h-[450px]">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg bg-white/5`}>
                  <Icon className={nivelPct > 0 ? (recipiente.id === 'water' ? 'text-neon' : 'text-warning') : 'text-gray-500'} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{recipiente.name}</h3>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">{recipiente.type === 'liquid' ? 'Líquido' : 'Sólido'}</span>
                </div>
              </div>

              <div className="flex-1 flex justify-center items-end py-4">
                {/* Indicador Visual do Recipiente */}
                <div className="relative w-32 h-full bg-surface border-4 border-white/10 rounded-b-2xl rounded-t-sm overflow-hidden flex items-end">
                  <div className="absolute left-0 top-0 h-full w-2 flex flex-col justify-between py-2 opacity-30">
                    <div className="w-full border-t border-white" />
                    <div className="w-1/2 border-t border-white" />
                    <div className="w-full border-t border-white" />
                    <div className="w-1/2 border-t border-white" />
                    <div className="w-full border-t border-white" />
                  </div>
                  
                  <div 
                    className={`w-full transition-all duration-1000 ease-in-out ${getColor(recipiente.id)} ${nivelPct > 0 ? 'opacity-80' : 'opacity-20'}`}
                    style={{ height: `${nivelPct}%` }}
                  >
                    {recipiente.type === 'liquid' && (
                      <div className="absolute top-0 left-0 w-full h-2 bg-white/20 blur-[1px]" />
                    )}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white drop-shadow-md z-10">{nivelPct}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Capacidade Total:</span>
                  <span className="text-white font-mono">{recipiente.capacity_max} {recipiente.type === 'liquid' ? 'ml' : 'g'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Estima-se Consumido:</span>
                  <span className="text-white font-mono">{consumido} {recipiente.type === 'liquid' ? 'ml' : 'g'}</span>
                </div>
              </div>

              {nivelPct > 0 && nivelPct < 20 && (
                <div className="mt-4 flex items-center gap-2 text-danger text-sm bg-danger/10 p-2 rounded-lg border border-danger/20">
                  <AlertTriangle size={16} /> Nível Baixo - Necessário reabastecer em breve
                </div>
              )}
              
               {nivelPct === 0 && (
                <div className="mt-4 flex items-center gap-2 text-gray-400 text-sm bg-gray-500/10 p-2 rounded-lg border border-gray-500/20">
                  <AlertTriangle size={16} /> Recipiente Inativo/Vazio
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
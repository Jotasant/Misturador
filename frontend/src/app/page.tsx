'use client'
import { useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useSystemStore } from '@/store/useSystemStore';
import { Play, Square, Wifi } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { mqttStatus, mixerStatus, progress, currentRecipe, startMixing, stopMixing, connectWebSocket } = useSystemStore();

  useEffect(() => {
    // Conecta no WebSocket ao abrir o Dashboard
    connectWebSocket();
  }, [connectWebSocket]);

  const handleStart = () => {
    // Envia recipeId nulo para usar os parâmetros manuais ou 1 para "Argamassa ACIII" (se existir no BD)
    startMixing(undefined, 'Mistura Padrão');
  };

  const handleStop = () => {
    stopMixing();
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Visão Geral do Sistema</h2>
          <p className="text-gray-400 text-sm">Monitoramento em tempo real da planta de mistura.</p>
        </div>
        <div className="flex gap-4">
          <GlassCard className="!p-3 flex items-center gap-3">
            <Wifi size={18} className="text-success" />
            <StatusBadge status={mqttStatus} />
          </GlassCard>
        </div>
      </header>

      {/* Grid de Status Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard className="border-t-4 border-t-primary">
          <p className="text-gray-400 text-sm">Status do Misturador</p>
          <div className="mt-2 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white uppercase">{mixerStatus}</h3>
            <StatusBadge status={mixerStatus === 'mixing' ? 'mixing' : 'idle'} />
          </div>
        </GlassCard>
        <GlassCard className="border-t-4 border-t-neon">
          <p className="text-gray-400 text-sm">Última Receita</p>
          <h3 className="mt-2 text-xl font-bold text-white truncate" title={currentRecipe || 'Nenhuma'}>{currentRecipe || 'Nenhuma'}</h3>
        </GlassCard>
        <GlassCard className="border-t-4 border-t-success">
          <p className="text-gray-400 text-sm">Ciclos Hoje</p>
          <h3 className="mt-2 text-xl font-bold text-white">12 Execuções</h3>
        </GlassCard>
        <GlassCard className="border-t-4 border-t-warning">
          <p className="text-gray-400 text-sm">Nível de Água (Virtual)</p>
          <h3 className="mt-2 text-xl font-bold text-white">78%</h3>
        </GlassCard>
      </div>

      {/* Painel de Controle Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard title="Progresso da Mistura Atual">
            <div className="flex flex-col items-center justify-center py-8">
              {/* Círculo de Progresso */}
              <div className="relative w-48 h-48 flex items-center justify-center rounded-full border-4 border-white/5 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                <span className="text-4xl font-bold text-neon">{progress}%</span>
                {mixerStatus === 'mixing' && (
                  <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="92" stroke="currentColor" strokeWidth="4" fill="transparent"
                      className="text-neon" strokeDasharray="578" strokeDashoffset={Math.max(0, 578 - (578 * progress) / 100)}
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                  </svg>
                )}
              </div>
              <div className="mt-8 flex gap-4">
                <button onClick={handleStart} disabled={mixerStatus === 'mixing' || mqttStatus !== 'connected'}
                  className="flex items-center gap-2 px-6 py-3 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 rounded-xl transition-all disabled:opacity-50">
                  <Play size={20} /> Iniciar Automático
                </button>
                <button onClick={handleStop} disabled={mixerStatus === 'idle' || mqttStatus !== 'connected'}
                  className="flex items-center gap-2 px-6 py-3 bg-danger/20 hover:bg-danger/40 text-danger border border-danger/50 rounded-xl transition-all disabled:opacity-50">
                  <Square size={20} /> Parada (Emergência)
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Logs do Sistema */}
        <div>
          <GlassCard title="Logs de Operação" className="h-full">
            <div className="space-y-4">
              {[
                { time: '14:32:01', msg: 'Misturador parado', type: 'info' },
                { time: '14:28:15', msg: 'Ciclo concluído', type: 'success' },
                { time: '14:25:00', msg: 'Dosagem de água OK', type: 'info' },
                { time: '14:20:10', msg: 'Iniciando receita...', type: 'info' },
              ].map((log, i) => (
                <div key={i} className="flex gap-3 text-sm border-b border-white/5 pb-2">
                  <span className="text-gray-500 font-mono">{log.time}</span>
                  <span className={log.type === 'success' ? 'text-success' : 'text-gray-300'}>{log.msg}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
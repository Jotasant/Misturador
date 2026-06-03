'use client'
import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Settings, Save, Server, Cpu } from 'lucide-react';
import { toast } from 'sonner';

export default function ConfiguracoesPage() {
  const [maxPwm, setMaxPwm] = useState(150);

  useEffect(() => {
    const saved = localStorage.getItem('maxMotorPwm');
    if (saved) setMaxPwm(Number(saved));
  }, []);

  const handleSave = () => {
    localStorage.setItem('maxMotorPwm', String(maxPwm));
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="text-neon" /> Configurações do Sistema
          </h2>
          <p className="text-gray-400 text-sm mt-1">Parâmetros de rede, MQTT e limites de operação.</p>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-neon text-background font-bold rounded-xl hover:bg-cyan-300 transition-all neon-shadow">
          <Save size={18} /> Salvar
        </button>
      </header>

      <div className="space-y-6">
        <GlassCard title="Comunicação MQTT">
          <div className="flex items-center gap-2 mb-4 text-warning">
            <Server size={18} /> <span className="text-sm">Configuração de Conexão com o Broker</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Broker URL</label>
              <input type="text" defaultValue="mqtt://localhost:1883" className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Client ID</label>
              <input type="text" defaultValue="sima_web_client_01" className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Tópico de Comando (Publish)</label>
              <input type="text" defaultValue="sima/mixer/cmd" className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Tópico de Status (Subscribe)</label>
              <input type="text" defaultValue="sima/mixer/status" className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon/50" />
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Parâmetros do Hardware (ESP32)">
           <div className="flex items-center gap-2 mb-4 text-primary">
            <Cpu size={18} /> <span className="text-sm">Limites de segurança enviados ao controlador</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Tempo Máximo de Operação Contínua (s)</label>
              <input type="number" defaultValue="300" className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Intervalo de Telemetria (ms)</label>
              <input type="number" defaultValue="1000" className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Velocidade Máxima Motor Agitação (PWM 30–255)</label>
              <input
                type="number" min={30} max={255}
                value={maxPwm}
                onChange={(e) => setMaxPwm(Math.min(255, Math.max(30, Number(e.target.value))))}
                className="w-full bg-surface/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon/50"
              />
              <p className="text-xs text-gray-500">Define o limite máximo do slider de velocidade na tela de Controle.</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
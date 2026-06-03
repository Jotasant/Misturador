'use client'
import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Sliders, Zap, Bot, Play, StopCircle, Droplets, Wind, Fan, Beaker, Waves } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { useSystemStore } from '@/store/useSystemStore';

const actuators = [
  { id: 'S2',    name: 'Bomba 1 — Entrada de Líquido',        icon: <Droplets className="mr-2 h-4 w-4 text-blue-400" /> },
  { id: 'S5',    name: 'Motor Eixo Sem Fim (Pó)',              icon: <Wind className="mr-2 h-4 w-4 text-gray-400" /> },
  { id: 'MOTOR', name: 'Motor de Agitação (PWM)',              icon: <Fan className="mr-2 h-4 w-4 text-green-400" /> },
  { id: 'S4',    name: 'Bomba 2 — Saída p/ Reservatório',     icon: <Beaker className="mr-2 h-4 w-4 text-yellow-400" /> },
  { id: 'S1',    name: 'Válvula Solenóide de Saída',           icon: <Zap className="mr-2 h-4 w-4 text-red-400" /> },
  { id: 'S3',    name: 'Bomba 3 — Saída p/ Usuário',          icon: <Zap className="mr-2 h-4 w-4 text-purple-400" /> },
];

export default function ControlePage() {
  const [pwmValue, setPwmValue] = useState(100);
  const [maxPwm, setMaxPwm] = useState(150);
  const [s5OnMs, setS5OnMs] = useState(400);
  const [s5OffMs, setS5OffMs] = useState(800);

  const { setSystemStatus, levelSensor } = useSystemStore();

  useEffect(() => {
    const saved = localStorage.getItem('maxMotorPwm');
    if (saved) setMaxPwm(Number(saved));
  }, []);

  const handleProcessControl = async (command: 'start' | 'stop') => {
    try {
      await api.post('/control/process', { command });
      setSystemStatus({ currentRecipe: command === 'start' ? 'Ciclo Automático' : 'Parado' });
      toast.success(`Comando '${command}' enviado com sucesso!`);
    } catch (error: any) {
      const msg = error.response?.data?.detail || `Falha ao enviar comando '${command}'.`;
      toast.error(msg);
    }
  };

  const handleActuatorToggle = async (actuatorId: string, state: 'ON' | 'OFF') => {
    try {
      await api.post('/control/actuator', { actuator: actuatorId, state });
      toast.success(`Atuador ${actuatorId} ${state === 'ON' ? 'ligado' : 'desligado'}.`);
    } catch (error: any) {
      const msg = error.response?.data?.detail || `Falha ao controlar atuador ${actuatorId}.`;
      toast.error(msg);
    }
  };

  const handlePwmChange = async (value: number) => {
    setPwmValue(value);
    try {
      await api.post('/control/pwm', { speed: value });
    } catch (error: any) {
      toast.error('Falha ao definir velocidade PWM.');
    }
  };

  const handleS5PulseChange = async (onMs: number, offMs: number) => {
    try {
      await api.post('/control/s5pulse', { on_ms: onMs, off_ms: offMs });
      toast.success(`S5: ligado ${onMs} ms / pausa ${offMs} ms`);
    } catch (error: any) {
      toast.error('Falha ao configurar pulso S5.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sliders className="text-neon" /> Controle e Debug
        </h2>
        <p className="text-gray-400 text-sm mt-1">Gerencie o ciclo automático e teste os atuadores individualmente.</p>
      </header>

      <GlassCard>
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
          <Bot className="text-primary" /> Ciclo Automático
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={() => handleProcessControl('start')} className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-all shadow-lg shadow-green-500/20">
            <Play size={20} /> Iniciar Processo
          </button>
          <button onClick={() => handleProcessControl('stop')} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-all shadow-lg shadow-red-500/20">
            <StopCircle size={20} /> Parada de Emergência
          </button>
          <div className="flex items-center gap-2 ml-auto px-4 py-2 rounded-xl border border-white/10 bg-black/20">
            <Waves size={16} className={levelSensor === 0 ? 'text-red-400' : 'text-green-400'} />
            <span className="text-xs text-gray-400">Reservatório</span>
            <span className={`text-xs font-bold ${levelSensor === 0 ? 'text-red-400' : 'text-green-400'}`}>
              {levelSensor === 0 ? 'CHEIO' : 'OK'}
            </span>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
          <Zap className="text-warning" /> Atuadores Individuais (Modo Debug)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actuators.map((actuator) => (
            <div key={actuator.id} className="p-4 border border-white/10 bg-black/20 rounded-xl space-y-4">
              <div className="flex items-center font-medium text-gray-200">
                {actuator.icon} {actuator.name} ({actuator.id})
              </div>
              
              {actuator.id === 'S5' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-xs text-gray-400">Tempo ligado por pulso</label>
                      <span className="text-xs text-neon font-mono">{s5OnMs} ms</span>
                    </div>
                    <input
                      type="range" min={50} max={2000} step={50}
                      value={s5OnMs}
                      onChange={(e) => setS5OnMs(Number(e.target.value))}
                      onMouseUp={() => handleS5PulseChange(s5OnMs, s5OffMs)}
                      onTouchEnd={() => handleS5PulseChange(s5OnMs, s5OffMs)}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-xs text-gray-400">Pausa entre pulsos</label>
                      <span className="text-xs text-neon font-mono">{s5OffMs} ms</span>
                    </div>
                    <input
                      type="range" min={50} max={5000} step={50}
                      value={s5OffMs}
                      onChange={(e) => setS5OffMs(Number(e.target.value))}
                      onMouseUp={() => handleS5PulseChange(s5OnMs, s5OffMs)}
                      onTouchEnd={() => handleS5PulseChange(s5OnMs, s5OffMs)}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon"
                    />
                  </div>
                </div>
              )}

              {actuator.id === 'MOTOR' && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs text-gray-400">Velocidade PWM (BTS7960)</label>
                    <span className="text-xs text-neon font-mono">{pwmValue}<span className="text-gray-500"> / 255 ({Math.round(pwmValue / 255 * 100)}%)</span></span>
                  </div>
                  <input
                    type="range" min="30" max={maxPwm} step="1"
                    value={pwmValue}
                    onChange={(e) => handlePwmChange(Number(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => handleActuatorToggle(actuator.id, 'ON')} className="flex-1 py-2 bg-white/10 hover:bg-green-500/20 hover:text-green-400 text-gray-300 text-sm font-semibold rounded-lg transition-colors border border-transparent hover:border-green-500/50">
                  Ligar
                </button>
                <button onClick={() => handleActuatorToggle(actuator.id, 'OFF')} className="flex-1 py-2 bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-gray-300 text-sm font-semibold rounded-lg transition-colors border border-transparent hover:border-red-500/50">
                  Desligar
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
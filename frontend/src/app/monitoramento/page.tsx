'use client'
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, Wifi, Cpu, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MonitoramentoPage() {
  const telemetryData = [
    { time: '10:00', cpu: 45, mem: 60, network: 12 },
    { time: '10:05', cpu: 52, mem: 62, network: 15 },
    { time: '10:10', cpu: 78, mem: 65, network: 25 }, // Pico durante mistura
    { time: '10:15', cpu: 42, mem: 61, network: 10 },
    { time: '10:20', cpu: 46, mem: 60, network: 11 },
    { time: '10:25', cpu: 48, mem: 63, network: 14 },
    { time: '10:30', cpu: 85, mem: 68, network: 30 }, // Outro pico
  ];

  const systemLogs = [
    "[10:30:05] INFO: Tópico 'sima/mixer/status' atualizado.",
    "[10:30:00] INFO: Comando iniciado: MISTURA_ACIII",
    "[10:25:12] WARN: Latência de rede (150ms)",
    "[10:20:00] INFO: Telemetria salva em banco.",
    "[10:15:00] INFO: Ciclo ID#984 concluído.",
    "[10:10:00] INFO: Comando iniciado: MISTURA_MANUAL",
    "[10:05:00] INFO: Ping MQTT OK."
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="text-neon" /> Monitoramento de Infraestrutura
        </h2>
        <p className="text-gray-400 text-sm mt-1">Status detalhado da comunicação, backend e controlador.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="flex items-center gap-4">
          <div className="p-4 rounded-full bg-success/10 border border-success/20 text-success">
            <Wifi size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400">Latência MQTT</p>
            <h3 className="text-xl font-bold text-white">24 ms</h3>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-4 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <Cpu size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400">Uso CPU Backend</p>
            <h3 className="text-xl font-bold text-white">45 %</h3>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-4 rounded-full bg-warning/10 border border-warning/20 text-warning">
            <Database size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400">Tamanho DB SQLite</p>
            <h3 className="text-xl font-bold text-white">12.4 MB</h3>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Gráfico de Telemetria (Últimos 30 min)">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#ffffff20', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="cpu" name="CPU (%)" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="mem" name="Memória (%)" stroke="#10B981" strokeWidth={2} dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard title="Console de Eventos (Raw Logs)" className="flex flex-col">
          <div className="flex-1 bg-[#0a0a0a] rounded-xl p-4 font-mono text-sm overflow-y-auto border border-white/5 shadow-inner min-h-[16rem]">
            {systemLogs.map((log, i) => {
              const isWarn = log.includes('WARN');
              const isError = log.includes('ERROR');
              return (
                <div key={i} className={`mb-1 ${isWarn ? 'text-warning' : isError ? 'text-danger' : 'text-gray-400'}`}>
                  {log}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
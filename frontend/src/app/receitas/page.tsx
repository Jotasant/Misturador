'use client'
import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Beaker, Play, Edit2, Trash2, X, Save } from 'lucide-react';
import { useSystemStore } from '@/store/useSystemStore';
import { api } from '@/services/api';
import { toast } from 'sonner';

const DEFAULT_RECIPE = {
  name: '',
  liquid1_time:   1000,
  powder_time:    3000,
  pulse_on:       400,
  pulse_off:      800,
  liquid2_time:   4000,
  pre_mix_delay:  500,
  mix_time:       20000,
  motor_speed:    48,
  post_mix_delay: 1000,
  extract_time:   6000,
  valve_delay:    300,
  serve_time:     5000,
};

type RecipeForm = typeof DEFAULT_RECIPE;

const FIELDS: { key: keyof RecipeForm; label: string; unit: string; min: number; max: number; step: number }[] = [
  { key: 'liquid1_time',   label: '1ª Injeção de Líquido',        unit: 'ms',  min: 100,  max: 30000,  step: 100 },
  { key: 'powder_time',    label: 'Eixo Sem Fim — Tempo Total',    unit: 'ms',  min: 100,  max: 30000,  step: 100 },
  { key: 'pulse_on',       label: 'Eixo Sem Fim — Pulso ON',       unit: 'ms',  min: 50,   max: 5000,   step: 50  },
  { key: 'pulse_off',      label: 'Eixo Sem Fim — Pausa OFF',      unit: 'ms',  min: 50,   max: 10000,  step: 50  },
  { key: 'liquid2_time',   label: '2ª Injeção de Líquido',        unit: 'ms',  min: 100,  max: 30000,  step: 100 },
  { key: 'pre_mix_delay',  label: 'Pausa antes de Agitar',         unit: 'ms',  min: 0,    max: 5000,   step: 50  },
  { key: 'mix_time',       label: 'Agitação — Duração',            unit: 'ms',  min: 1000, max: 120000, step: 500 },
  { key: 'motor_speed',    label: 'Motor Agitação — Velocidade',   unit: 'PWM', min: 30,   max: 255,    step: 1   },
  { key: 'post_mix_delay', label: 'Pausa após Agitar',             unit: 'ms',  min: 0,    max: 5000,   step: 50  },
  { key: 'extract_time',   label: 'Extração — Duração',            unit: 'ms',  min: 500,  max: 30000,  step: 100 },
  { key: 'valve_delay',    label: 'Delay Válvula Solenóide',       unit: 'ms',  min: 0,    max: 2000,   step: 50  },
  { key: 'serve_time',     label: 'Serviço ao Usuário — Duração',  unit: 'ms',  min: 500,  max: 30000,  step: 100 },
];

export default function ReceitasPage() {
  const [receitas, setReceitas] = useState<any[]>([]);
  const [editando, setEditando] = useState<RecipeForm | null>(null);
  const [criando, setCriando] = useState(false);
  const { startMixing, mqttStatus } = useSystemStore();

  const loadReceitas = () => {
    api.get('/recipes')
      .then(r => setReceitas(r.data))
      .catch(() => toast.error('Erro ao carregar receitas'));
  };

  useEffect(() => { loadReceitas(); }, []);

  const executarReceita = (id: number, nome: string) => {
    startMixing(id, nome);
  };

  const abrirEditor = (receita?: any) => {
    setEditando(receita ? { ...receita } : { ...DEFAULT_RECIPE });
    setCriando(!receita);
  };

  const salvarReceita = async () => {
    if (!editando) return;
    try {
      if (criando) {
        await api.post('/recipes', editando);
        toast.success('Receita criada!');
      } else {
        await api.put(`/recipes/${(editando as any).id}`, editando);
        toast.success('Receita atualizada!');
      }
      setEditando(null);
      loadReceitas();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erro ao salvar receita');
    }
  };

  const deletarReceita = async (id: number) => {
    try {
      await api.delete(`/recipes/${id}`);
      toast.success('Receita removida');
      loadReceitas();
    } catch {
      toast.error('Erro ao remover receita');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Beaker className="text-neon" /> Receitas
          </h2>
          <p className="text-gray-400 text-sm mt-1">Defina e gerencie os parâmetros completos de cada processo.</p>
        </div>
        <button
          onClick={() => abrirEditor()}
          className="px-6 py-2 bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 rounded-xl transition-all"
        >
          + Nova Receita
        </button>
      </header>

      {/* Editor modal */}
      {editando && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">{criando ? 'Nova Receita' : 'Editar Receita'}</h3>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Nome da Receita</label>
              <input
                type="text"
                value={editando.name}
                onChange={e => setEditando({ ...editando, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon/50"
                placeholder="Ex: Mistura Padrão"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIELDS.map(f => (
                <div key={f.key} className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs text-gray-400">{f.label}</label>
                    <span className="text-xs text-neon font-mono">{(editando as any)[f.key]} {f.unit}</span>
                  </div>
                  <input
                    type="range"
                    min={f.min} max={f.max} step={f.step}
                    value={(editando as any)[f.key]}
                    onChange={e => setEditando({ ...editando, [f.key]: Number(e.target.value) })}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={salvarReceita}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-neon/20 hover:bg-neon/30 text-neon border border-neon/40 rounded-xl font-bold transition-all"
              >
                <Save size={18} /> Salvar
              </button>
              <button
                onClick={() => setEditando(null)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de receitas */}
      {receitas.length === 0 && (
        <GlassCard>
          <p className="text-gray-400 text-center py-8">Nenhuma receita cadastrada. Crie a primeira!</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {receitas.map((r: any) => (
          <GlassCard key={r.id} className="flex flex-col h-full hover:border-white/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-white">{r.name}</h3>
              <div className="flex gap-2">
                <button onClick={() => abrirEditor(r)} className="text-gray-400 hover:text-neon transition-colors"><Edit2 size={15} /></button>
                <button onClick={() => deletarReceita(r.id)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>

            <div className="space-y-1 text-xs flex-1 mb-4">
              <div className="flex justify-between"><span className="text-gray-500">1ª Injeção</span><span className="text-gray-300 font-mono">{r.liquid1_time} ms</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pó (total)</span><span className="text-gray-300 font-mono">{r.powder_time} ms</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pulso ON/OFF</span><span className="text-gray-300 font-mono">{r.pulse_on}/{r.pulse_off} ms</span></div>
              <div className="flex justify-between"><span className="text-gray-500">2ª Injeção</span><span className="text-gray-300 font-mono">{r.liquid2_time} ms</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Agitação</span><span className="text-gray-300 font-mono">{r.mix_time} ms</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Motor PWM</span><span className="text-neon font-mono">{r.motor_speed}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Extração</span><span className="text-gray-300 font-mono">{r.extract_time} ms</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Serviço</span><span className="text-gray-300 font-mono">{r.serve_time} ms</span></div>
            </div>

            <button
              onClick={() => executarReceita(r.id, r.name)}
              disabled={mqttStatus !== 'connected'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neon/10 hover:bg-neon/20 text-neon border border-neon/30 rounded-xl transition-all disabled:opacity-50"
            >
              <Play size={16} /> {mqttStatus !== 'connected' ? 'Offline' : 'Executar'}
            </button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

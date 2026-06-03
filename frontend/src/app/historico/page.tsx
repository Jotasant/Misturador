'use client'
import { GlassCard } from '@/components/ui/GlassCard';
import { History, Search, Filter } from 'lucide-react';

export default function HistoricoPage() {
  const historico = [
    { id: 1, data: '2023-11-20', hora: '14:30:00', receita: 'Argamassa ACIII', quantidade: '3kg', tempo: '45s', status: 'Concluído' },
    { id: 2, data: '2023-11-20', hora: '13:15:22', receita: 'Mistura Padrão', quantidade: '1.5kg', tempo: '30s', status: 'Concluído' },
    { id: 3, data: '2023-11-20', hora: '10:05:11', receita: 'Manual', quantidade: '2kg', tempo: '15s', status: 'Cancelado' },
    { id: 4, data: '2023-11-19', hora: '16:45:00', receita: 'Argamassa ACI', quantidade: '3.5kg', tempo: '30s', status: 'Concluído' },
    { id: 5, data: '2023-11-19', hora: '09:20:00', receita: 'Mistura Leve', quantidade: '1kg', tempo: '20s', status: 'Erro' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="text-neon" /> Histórico de Execuções
          </h2>
          <p className="text-gray-400 text-sm mt-1">Registro detalhado de todas as operações do misturador.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full bg-surface/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-neon/50 transition-colors"
            />
          </div>
          <button className="p-2 bg-surface/50 border border-white/10 rounded-xl hover:bg-white/5 transition-colors">
            <Filter className="text-gray-400" size={20} />
          </button>
        </div>
      </header>

      <GlassCard className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap">
          <thead className="text-xs uppercase bg-white/5 text-gray-400 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 rounded-tl-lg">Data</th>
              <th className="px-6 py-4">Hora</th>
              <th className="px-6 py-4">Receita</th>
              <th className="px-6 py-4">Qtd Total</th>
              <th className="px-6 py-4">Tempo</th>
              <th className="px-6 py-4 rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((item, index) => (
              <tr key={item.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${index === historico.length -1 ? 'border-b-0' : ''}`}>
                <td className="px-6 py-4 font-mono text-gray-400">{item.data}</td>
                <td className="px-6 py-4 font-mono text-gray-400">{item.hora}</td>
                <td className="px-6 py-4 font-medium text-white">{item.receita}</td>
                <td className="px-6 py-4 text-neon">{item.quantidade}</td>
                <td className="px-6 py-4">{item.tempo}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    item.status === 'Concluído' ? 'bg-success/10 text-success border-success/20' :
                    item.status === 'Cancelado' ? 'bg-warning/10 text-warning border-warning/20' :
                    'bg-danger/10 text-danger border-danger/20'
                  }`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
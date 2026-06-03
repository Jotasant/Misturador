export function StatusBadge({ status }: { status: 'connected' | 'disconnected' | 'mixing' | 'idle' | 'connecting' | 'error' }) {
  const styles = {
    connected: 'bg-success/20 text-success border-success/30',
    disconnected: 'bg-danger/20 text-danger border-danger/30',
    connecting: 'bg-warning/20 text-warning border-warning/30',
    mixing: 'bg-neon/20 text-neon border-neon/30 animate-pulse',
    idle: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    error: 'bg-danger/20 text-danger border-danger/30',
  };

  const labels = {
    connected: 'Online', 
    disconnected: 'Offline', 
    connecting: 'Conectando...',
    mixing: 'Em Operação', 
    idle: 'Ocioso',
    error: 'Erro'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
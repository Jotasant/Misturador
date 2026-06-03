import { create } from 'zustand'
import { api, MixerService } from '../services/api'
import { toast } from 'sonner'

interface SystemState {
  isOnline: boolean;
  mqttStatus: 'connected' | 'disconnected' | 'connecting';
  mixerStatus: 'idle' | 'mixing' | 'error';
  progress: number;
  currentRecipe: string | null;
  levelSensor: 1 | 0;  // 1 = ok/vazio, 0 = cheio
  setSystemStatus: (status: Partial<SystemState>) => void;
  startMixing: (recipeId?: number, recipeName?: string) => Promise<void>;
  stopMixing: () => Promise<void>;
  connectWebSocket: () => void;
}

let ws: WebSocket | null = null;

export const useSystemStore = create<SystemState>((set, get) => ({
  isOnline: false,
  mqttStatus: 'disconnected',
  mixerStatus: 'idle',
  progress: 0,
  currentRecipe: null,
  levelSensor: 1,
  
  setSystemStatus: (status) => set((state) => ({ ...state, ...status })),

  connectWebSocket: () => {
    if (ws) return; // Evita múltiplas conexões
    
    set({ mqttStatus: 'connecting' });
    
    // Conecta no WebSocket do FastAPI
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/ws';
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket Conectado');
      set({ mqttStatus: 'connected', isOnline: true });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WS Recebido:", message);
        
        if (message.type === 'INITIAL_STATE' || message.type === 'STATUS_UPDATE') {
          const { status, progress, is_online, level_sensor } = message.data;
          set({
            mixerStatus: status,
            progress: progress,
            isOnline: is_online,
            levelSensor: level_sensor ?? 1,
          });
          
          if (status === 'idle' && get().progress > 0 && get().progress < 100) {
            // Se parou no meio sem atingir 100%
            set({ progress: 0, currentRecipe: null });
          }
        }
      } catch (e) {
        console.error("Erro ao processar mensagem WS", e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket Desconectado');
      set({ mqttStatus: 'disconnected', isOnline: false });
      ws = null;
      // Tenta reconectar em 5 segundos
      setTimeout(() => {
        get().connectWebSocket();
      }, 5000);
    };
    
    ws.onerror = () => {
       set({ mqttStatus: 'error' as any });
    }
  },
  
  startMixing: async (recipeId, recipeName) => {
    try {
      // Chama a API REST do FastAPI
      await MixerService.start(recipeId ? recipeId.toString() : '');
      set({ currentRecipe: recipeName || 'Mistura Manual' });
      toast.success('Comando enviado via MQTT: Iniciar');
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Erro ao comunicar com o backend';
      toast.error(msg);
    }
  },
  
  stopMixing: async () => {
    try {
      await MixerService.stop();
      toast.error('Comando enviado via MQTT: Parada de Emergência');
    } catch (error) {
      toast.error('Erro ao enviar comando de parada');
    }
  }
}))
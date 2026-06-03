import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19', // Fundo escuro profundo
        surface: '#111827', // Fundo de cards
        primary: '#3B82F6', // Azul tecnológico
        neon: '#06B6D4', // Ciano para detalhes iluminados
        success: '#10B981', // Verde online
        warning: '#F59E0B', // Amarelo alerta
        danger: '#EF4444', // Vermelho erro
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      }
    },
  },
  plugins: [],
}
export default config
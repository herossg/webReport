import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const nodeEnv = JSON.stringify(mode === 'production' ? 'production' : 'development')

  return {
    plugins: [react()],
    define: {
      'process.env.DRAGGABLE_DEBUG': 'false',
      'process.env.NODE_ENV': nodeEnv,
    },
    optimizeDeps: {
      rolldownOptions: {
        transform: {
          define: {
            'process.env.DRAGGABLE_DEBUG': 'false',
            'process.env.NODE_ENV': nodeEnv,
          },
        },
      },
    },
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 포트를 박아두면 다른 세션의 dev 서버와 부딪힌다. PORT가 오면 그걸 쓴다.
  server: { port: Number(process.env.PORT) || 5173, host: true },
})

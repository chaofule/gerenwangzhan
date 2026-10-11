import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 8080,
    watch: {
      // 编辑器原子写入会在源码目录里生成临时目录，被监听时会触发 EBUSY 并让 dev server 退出
      ignored: ['**/*.tmpdir/**', '**/.shots/**', '**/dist/**', '**/vendor/**', '**/.npm-cache/**', '**/*.blend*', '**/尼莫点渲染结果/**']
    }
  }
})

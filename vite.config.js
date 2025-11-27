import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/REPO_NAME/', // !!! این خط را در زمان نهایی‌سازی پروژه روی گیت‌هاب پیجز نیاز داریم
});

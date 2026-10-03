// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://hugo-pinango.github.io',
  base: '/hugo-pinango-cv',
  integrations: [react()],
  devToolbar: { enabled: false },
});

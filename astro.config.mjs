import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";

export default defineConfig({
  integrations: [vue()],
  vite: {
    optimizeDeps: {
      include: ["tone"],
    },
    build: {
      target: "es2020",
    },
  },
});

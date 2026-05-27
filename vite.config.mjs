import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: true,
    outDir: "internal/web/static/skill-payload-form",
    lib: {
      entry: "web/skill-payload-form/main.jsx",
      name: "MoltenHubSkillPayloadFormBundle",
      formats: ["iife"],
      fileName: () => "skill-payload-form.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "skill-payload-form.[ext]",
      },
    },
  },
});

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig(function () { return ({
    plugins: [react()],
    clearScreen: false,
    server: {
        strictPort: true,
        port: 5173,
    },
    build: {
        target: "es2021",
        minify: (process.env.TAURI_DEBUG ? false : "esbuild"),
        sourcemap: Boolean(process.env.TAURI_DEBUG),
    },
}); });

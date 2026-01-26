import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { execSync } from "child_process";

// Get current git branch for labeling and port assignment
function getGitBranch(): string {
    try {
        return execSync("git branch --show-current", { encoding: "utf-8" }).trim();
    } catch {
        return "unknown";
    }
}

// Assign ports based on branch name for parallel development
function getPortForBranch(branch: string): number {
    const portMap: Record<string, number> = {
        "main": 5170,
        "viable-protocol-migration": 5171,
        "feature/explore-layouts": 5172,
        "feature/layout-library-panel": 9876,
    };
    return portMap[branch] ?? 5173; // Default fallback port
}

const gitBranch = getGitBranch();
const devPort = getPortForBranch(gitBranch);

// https://vite.dev/config/
export default defineConfig({
    base: "/keybard-ng/",
    plugins: [react(), tailwindcss()],
    root: "src",
    publicDir: "../public",
    build: {
        outDir: "../dist",
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    define: {
        __GIT_BRANCH__: JSON.stringify(gitBranch),
    },
    server: {
        port: devPort,
        strictPort: false, // Allow auto-increment to find available port
    },
});

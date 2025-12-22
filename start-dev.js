// 禁用Turbopack的环境变量
process.env.TURBOPACK = "0";

// 启动Next.js开发服务器
const { spawn } = require("child_process");
const path = require("path");

console.log("Starting Next.js dev server with Turbopack disabled...");

const nextProcess = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    TURBOPACK: "0",
  },
});

nextProcess.on("close", (code) => {
  console.log(`Next.js process exited with code ${code}`);
  process.exit(code);
});

nextProcess.on("error", (err) => {
  console.error("Failed to start Next.js:", err);
  process.exit(1);
});

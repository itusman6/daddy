// start.cjs — CommonJS so it works even with "type": "module"
const { execSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const PORT = process.env.PORT || "3001";
const root = __dirname;
process.chdir(root);

// ---- 1. Kill anything listening on PORT ----
function killPort(port) {
  try {
    if (os.platform() === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      const pids = [...new Set(
        out.split("\n")
          .map(l => l.trim())
          .filter(l => l.includes("LISTENING"))
          .map(l => l.split(/\s+/).pop())
          .filter(Boolean)
      )];
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
          console.log(`Killed PID ${pid} on port ${port}`);
        } catch {}
      }
    } else {
      try {
        const pids = execSync(`lsof -ti:${port}`, { encoding: "utf8" })
          .split("\n").map(s => s.trim()).filter(Boolean);
        for (const pid of pids) {
          try { process.kill(Number(pid), "SIGKILL"); } catch {}
        }
      } catch {}
    }
  } catch {
    // nothing listening — fine
  }
}

function run(cmd) {
  console.log(`> ${cmd}`);
  const r = spawnSync(cmd, { shell: true, stdio: "inherit", cwd: root });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

killPort(PORT);

// ---- 2. rm -rf dist ----
fs.rmSync(path.join(root, "dist"), { recursive: true, force: true });

// ---- 3. tsc ----
run("npx tsc");

// ---- 4. copy CSS ----
const webDir = path.join(root, "dist", "web");
fs.mkdirSync(webDir, { recursive: true });
const cssSrc = path.join(root, "src", "web", "style.css");
if (fs.existsSync(cssSrc)) {
  fs.copyFileSync(cssSrc, path.join(webDir, "style.css"));
  console.log(`Copied style.css -> dist/web/`);
} else {
  console.warn(`WARNING: ${cssSrc} not found — skipping CSS copy`);
}

// ---- 5. verify the entry exists BEFORE trying to run it ----
const entry = path.join(root, "dist", "api", "index.js");
if (!fs.existsSync(entry)) {
  console.error(`\nERROR: ${entry} was not produced by tsc.`);
  console.error(`Check tsconfig.json (rootDir/outDir) and that src/api/index.ts exists.`);
  console.error(`Contents of dist/:\n`);
  const walk = (dir, prefix = "") => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = prefix + name;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full, rel + "/");
      else console.error("  " + rel);
    }
  };
  walk(path.join(root, "dist"));
  process.exit(1);
}

// ---- 6. run ----
run("node dist/api/index.js");
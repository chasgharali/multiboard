// Launch an in-memory MongoDB, then start `next dev` pointed at it.
import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const mongo = await MongoMemoryServer.create();
const uri = mongo.getUri();
console.log("[dev-mongo] in-memory MongoDB at", uri);

// Honor a PORT assigned by the harness; default to 3000.
const port = process.env.PORT || "3000";

const child = spawn("npx", ["next", "dev", "-p", port], {
  stdio: "inherit",
  cwd: projectRoot,
  env: { ...process.env, MONGODB_URI: uri, MONGODB_DB: "multiboard" },
});

const stop = async (code) => {
  try { await mongo.stop(); } catch {}
  process.exit(code ?? 0);
};
process.on("SIGINT", () => { child.kill("SIGTERM"); stop(0); });
process.on("SIGTERM", () => { child.kill("SIGTERM"); stop(0); });
child.on("exit", (code) => stop(code ?? 0));

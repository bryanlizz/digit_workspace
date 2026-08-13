import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = process.cwd();
const fakeHome = path.join(repoRoot, ".build-home");
const fakeAppData = path.join(fakeHome, "AppData", "Roaming");
const fakeLocalAppData = path.join(fakeHome, "AppData", "Local");

mkdirSync(fakeAppData, { recursive: true });
mkdirSync(fakeLocalAppData, { recursive: true });

process.env.USERPROFILE = fakeHome;
process.env.HOME = fakeHome;
process.env.APPDATA = fakeAppData;
process.env.LOCALAPPDATA = fakeLocalAppData;

const result = spawnSync("next", ["build"], { stdio: "inherit", shell: true, env: process.env });
process.exit(result.status ?? 1);

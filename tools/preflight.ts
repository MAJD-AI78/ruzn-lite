// tools/preflight.ts
/**
 * Preflight enforcement (fails fast).
 *
 * Enforces:
 * - Required package.json scripts exist (security:audit, preflight, lint, test, build)
 * - No `publicProcedure` usage in server code (convert sensitive routes to protectedProcedure)
 * - PUBLIC_MODE=true: no client identifiers (e.g., OSAI) anywhere in repo
 * - SOVEREIGN_MODE=true: EMBEDDINGS_BACKEND must be local; KNOWLEDGE_BACKEND must not be vectara
 *
 * Usage:
 *   pnpm preflight
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const REQUIRED_SCRIPTS = ["security:audit", "preflight", "lint", "test", "build"] as const;

const PUBLIC_IDENTIFIER_TERMS = [
  "@osai.gov.om",
  "OSAI",
  "State Audit Institution",
  // add more client identifiers here
];

const TARGET_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".txt", ".json", ".yaml", ".yml"]);

function readJson(p: string): any {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function walk(dir: string, out: string[] = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name === ".next") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (TARGET_EXT.has(path.extname(p))) out.push(p);
  }
  return out;
}

function grep(files: string[], term: string) {
  const hits: Array<{ file: string; line: number; text: string }> = [];
  for (const f of files) {
    let content = "";
    try {
      content = fs.readFileSync(f, "utf-8");
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(term)) hits.push({ file: f, line: i + 1, text: line.trim() });
    }
  }
  return hits;
}

function fail(title: string, details: unknown) {
  console.error(`\n❌ PRE-FLIGHT FAILED: ${title}`);
  console.error(details);
  process.exit(1);
}

function main() {
  const PUBLIC_MODE = process.env.PUBLIC_MODE === "true";
  const SOVEREIGN_MODE = process.env.SOVEREIGN_MODE === "true";

  // 1) package.json scripts
  const pkgPath = path.join(ROOT, "package.json");
  if (!fs.existsSync(pkgPath)) fail("package.json missing", pkgPath);
  const pkg = readJson(pkgPath);
  const scripts: Record<string, string> = pkg.scripts || {};

  const missing = REQUIRED_SCRIPTS.filter((k) => !scripts[k]);
  if (missing.length) {
    fail("Missing required package.json scripts", { missing, present: Object.keys(scripts) });
  }

  // 2) sovereign mode config enforcement
  if (SOVEREIGN_MODE) {
    const embBackend = (process.env.EMBEDDINGS_BACKEND || "").toLowerCase();
    if (embBackend !== "local") {
      fail("SOVEREIGN_MODE=true requires EMBEDDINGS_BACKEND=local", { EMBEDDINGS_BACKEND: embBackend });
    }
    const kb = (process.env.KNOWLEDGE_BACKEND || "").toLowerCase();
    if (kb === "vectara") {
      fail("SOVEREIGN_MODE=true forbids KNOWLEDGE_BACKEND=vectara", { KNOWLEDGE_BACKEND: kb });
    }
  }

  // 3) file scan
  const files = walk(ROOT);

  // 3a) publicProcedure in server code
  const serverFiles = files.filter((f) => f.includes(`${path.sep}server${path.sep}`));
  const publicProcHits = grep(serverFiles, "publicProcedure");
  if (publicProcHits.length) {
    fail(
      "publicProcedure found in server code (convert sensitive procedures to protectedProcedure)",
      publicProcHits.slice(0, 60)
    );
  }

  // 3b) PUBLIC_MODE client identifiers
  if (PUBLIC_MODE) {
    for (const term of PUBLIC_IDENTIFIER_TERMS) {
      const hits = grep(files, term);
      if (hits.length) {
        fail(`Client identifier found in PUBLIC_MODE: ${term}`, hits.slice(0, 60));
      }
    }
  }

  console.log("✅ PRE-FLIGHT OK");
}

main();

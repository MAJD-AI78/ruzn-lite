/**
 * Ruzn-Lite Security Audit Tool
 * 
 * Quick security audit to find vulnerabilities before deployment:
 * - publicProcedure usage (should be protectedProcedure)
 * - sessionStorage auth gates (client-side bypass risk)
 * - Client-specific mentions in PUBLIC builds
 *
 * Usage:
 *   pnpm tsx tools/security_audit.ts
 *   # or
 *   pnpm security:audit
 * 
 * Exit codes:
 *   0 = No issues found
 *   1 = Issues found (review required)
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TARGET_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".txt"]);

// Check deployment mode
const publicMode = process.env.PUBLIC_MODE === "true";

// Terms to search for security issues
const SEARCH_TERMS: string[] = [
  // Authentication bypass risks (always check)
  "publicProcedure",
  'sessionStorage.getItem("ruzn_access")',
  "ruzn_access",
];

// Only flag client identifiers in PUBLIC mode
// In GOV_DEMO_MODE, client branding is expected and legitimate
if (publicMode) {
  SEARCH_TERMS.push(
    // Add your client-specific identifiers here
    // Example: "@client.gov", "CLIENT_NAME", "Client Organization"
    "EXAMPLE_CLIENT_ID",
    "example.client.gov"
  );
}

// Directories to skip
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".next", "build", ".turbo"]);

function walk(dir: string, out: string[] = []): string[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p, out);
      } else if (TARGET_EXT.has(path.extname(p))) {
        out.push(p);
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }
  return out;
}

interface Hit {
  term: string;
  line: number;
  text: string;
}

function main() {
  console.log("🔍 Running Ruzn-Lite Security Audit...\n");
  console.log(`Root: ${ROOT}`);
  console.log(`Searching for: ${SEARCH_TERMS.join(", ")}\n`);

  const files = walk(ROOT);
  console.log(`Scanning ${files.length} files...\n`);

  const hits: Record<string, Hit[]> = {};

  for (const f of files) {
    try {
      const content = fs.readFileSync(f, "utf-8");
      const lines = content.split(/\r?\n/);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const term of SEARCH_TERMS) {
          if (line.includes(term)) {
            const relPath = path.relative(ROOT, f);
            hits[relPath] ||= [];
            hits[relPath].push({ 
              term, 
              line: i + 1, 
              text: line.trim().substring(0, 100) 
            });
          }
        }
      }
    } catch (err) {
      // Skip files we can't read
    }
  }

  const entries = Object.entries(hits);
  
  if (!entries.length) {
    console.log("✅ No security issues found!");
    console.log(`\nMode: ${publicMode ? "PUBLIC (client identifiers checked)" : "GOV_DEMO (client identifiers allowed)"}`);
    console.log("\nAll checks passed:");
    console.log("  • No publicProcedure on sensitive endpoints");
    console.log("  • No client-side auth bypass risks");
    if (publicMode) {
      console.log("  • No client-specific mentions in codebase");
    }
    process.exit(0);
  }

  console.log("⚠️  SECURITY AUDIT ISSUES FOUND:\n");
  console.log("═".repeat(70));
  
  for (const [file, rows] of entries) {
    console.log(`\n📄 ${file}`);
    for (const r of rows) {
      console.log(`   L${r.line.toString().padStart(4)} [${r.term}]`);
      console.log(`         ${r.text}`);
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log("\n🔧 REQUIRED ACTIONS:");
  console.log("  1. Replace publicProcedure → protectedProcedure on sensitive endpoints");
  console.log("  2. Remove sessionStorage auth gates (use AuthContext)");
  console.log("  3. Remove client mentions from PUBLIC_MODE builds");
  console.log("  4. Re-run this audit until all issues are resolved");
  
  process.exit(1);
}

main();

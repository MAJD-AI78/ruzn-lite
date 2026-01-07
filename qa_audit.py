#!/usr/bin/env python3
"""tools/qa_audit.py

Repo-wide QA guardrail audit.

Severity model:
- CRITICAL: forbidden vendor remnants (loaded from tools/qa_blocklist.json) anywhere in repo.
- HIGH: dangerous exec/eval patterns and install hooks.
- WARN: unknown external domains (review required; does not fail by default).
- WARN: secret-like patterns (best-effort).

Exit codes:
  0 = pass
  1 = fail (HIGH)
  2 = fail (CRITICAL)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

TEXT_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".json", ".yml", ".yaml", ".toml", ".md", ".txt",
    ".env", ".example", ".config", ".lock"
}

# HIGH: dangerous patterns (block unless waived)
HIGH_PATTERNS = [
    re.compile(r"\bchild_process\b.*\bexecSync\b", re.IGNORECASE),
    re.compile(r"\bchild_process\b.*\bexec\b", re.IGNORECASE),
    re.compile(r"\bchild_process\b.*\bspawn\b", re.IGNORECASE),
    re.compile(r"\bchild_process\b.*\bfork\b", re.IGNORECASE),
    re.compile(r"\beval\s*\(", re.IGNORECASE),
    re.compile(r"new\s+Function\s*\(", re.IGNORECASE),
]

# URL extraction (best-effort)
URL_RE = re.compile(r"https?://[^\s\"\'\)\]]+", re.IGNORECASE)
HOST_RE = re.compile(r"^https?://([^/:?#]+)", re.IGNORECASE)

# Potential secret patterns (WARN by default)
SECRET_PATTERNS = [
    ("OpenAI key-like", re.compile(r"\bsk-[A-Za-z0-9]{20,}\b")),
    ("JWT-like", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")),
]

@dataclass
class Finding:
    severity: str  # CRITICAL | HIGH | WARN
    rule: str
    path: str
    line: int
    excerpt: str

def is_text_file(path: Path) -> bool:
    if path.name.startswith('.env'):
        return True
    if path.suffix.lower() in TEXT_EXTENSIONS:
        return True
    if path.name in {"pnpm-lock.yaml", "package-lock.json", "yarn.lock"}:
        return True
    return False

def load_json(path: Path, default: dict) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default

def load_allowlist(repo_root: Path) -> dict:
    return load_json(repo_root / "tools" / "qa_allowlist.json", {"allowed_hosts": [], "allowed_host_suffixes": []})

def load_blocklist(repo_root: Path) -> list[re.Pattern]:
    bl = load_json(repo_root / "tools" / "qa_blocklist.json", {"critical_literals": []})
    pats: list[re.Pattern] = []
    for lit in bl.get("critical_literals", []):
        # match literal anywhere, case-insensitive
        pats.append(re.compile(re.escape(lit), re.IGNORECASE))
    return pats

def host_allowed(host: str, allow: dict) -> bool:
    host = host.lower().strip()
    if host in (h.lower() for h in allow.get("allowed_hosts", [])):
        return True
    for suf in allow.get("allowed_host_suffixes", []):
        if host.endswith(suf.lower()):
            return True
    return False

def iter_files(repo_root: Path) -> Iterable[Path]:
    for p in repo_root.rglob('*'):
        if p.is_dir():
            continue
        # skip internal folders
        parts = set(p.parts)
        if "node_modules" in parts or ".git" in parts:
            continue
        # skip build artifacts
        if "dist" in parts:
            continue
        # skip generated audit outputs to avoid self-triggering
        if p.name.startswith("QA_AUDIT_REPORT."):
            continue
        yield p

def scan_file(path: Path, allow: dict, critical_pats: list[re.Pattern]) -> list[Finding]:
    findings: list[Finding] = []
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return findings

    lines = content.splitlines()

    def add(sev: str, rule: str, idx: int, excerpt: str):
        findings.append(Finding(severity=sev, rule=rule, path=str(path), line=idx + 1, excerpt=excerpt[:220]))

    # CRITICAL patterns
    for idx, line in enumerate(lines):
        for pat in critical_pats:
            if pat.search(line):
                add("CRITICAL", f"Blocklist:{pat.pattern}", idx, line)

    # HIGH patterns
    for idx, line in enumerate(lines):
        for pat in HIGH_PATTERNS:
            if pat.search(line):
                add("HIGH", f"Danger:{pat.pattern}", idx, line)

    # Dependency script scan in package.json
    if path.name == "package.json":
        try:
            pkg = json.loads(content)
            scripts = (pkg.get("scripts") or {})
            for k in ("preinstall", "postinstall", "prepare", "install"):
                if k in scripts and scripts[k]:
                    add("HIGH", "InstallHook:package.json scripts", 0, f"{k}={scripts[k]}")
        except Exception:
            pass

    # Secrets scan
    for idx, line in enumerate(lines):
        for name, pat in SECRET_PATTERNS:
            if pat.search(line):
                add("WARN", f"SecretPattern:{name}", idx, line)

    # External domains scan (WARN by default)
    for idx, line in enumerate(lines):
        for url in URL_RE.findall(line):
            m = HOST_RE.match(url)
            if not m:
                continue
            host = m.group(1)
            if host in ("example.com", "localhost"):
                continue
            if not host_allowed(host, allow):
                add("WARN", "UnknownExternalDomain", idx, url)

    return findings

def write_reports(repo_root: Path, findings: list[Finding]) -> tuple[Path, Path]:
    out_json = repo_root / "QA_AUDIT_REPORT.json"
    out_md = repo_root / "QA_AUDIT_REPORT.md"

    data = {
        "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "counts": {
            "CRITICAL": sum(1 for f in findings if f.severity == "CRITICAL"),
            "HIGH": sum(1 for f in findings if f.severity == "HIGH"),
            "WARN": sum(1 for f in findings if f.severity == "WARN"),
        },
        "findings": [asdict(f) for f in findings],
    }
    out_json.write_text(json.dumps(data, indent=2), encoding="utf-8")

    md = []
    md.append("# QA Audit Report\n\n")
    md.append(f"Generated: {data['generated_at']}\n\n")
    md.append(f"Counts: CRITICAL={data['counts']['CRITICAL']}, HIGH={data['counts']['HIGH']}, WARN={data['counts']['WARN']}\n\n")
    md.append("## Findings\n\n")
    for f in findings:
        rel = os.path.relpath(f.path, repo_root)
        md.append(f"- **{f.severity}** {f.rule} — `{rel}:{f.line}` — {f.excerpt}\n")
    out_md.write_text("".join(md), encoding="utf-8")

    return out_json, out_md

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Repo root")
    args = ap.parse_args()

    repo_root = Path(args.root).resolve()
    allow = load_allowlist(repo_root)
    critical_pats = load_blocklist(repo_root)

    findings: list[Finding] = []
    for p in iter_files(repo_root):
        if is_text_file(p) or p.name in {"package.json", "pnpm-lock.yaml", ".env.example", "env.example"}:
            findings.extend(scan_file(p, allow, critical_pats))

    write_reports(repo_root, findings)

    crit = sum(1 for f in findings if f.severity == "CRITICAL")
    high = sum(1 for f in findings if f.severity == "HIGH")

    if crit:
        return 2
    if high:
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())

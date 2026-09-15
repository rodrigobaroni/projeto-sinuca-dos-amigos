#!/usr/bin/env node
// Valida o vault do Obsidian: wikilinks quebrados e notas órfãs.
// Uso: node scripts/validar-vault.mjs
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.join(process.cwd(), "vault");
const LINK = /\[\[([^\]|\\]+)(?:\\?\|[^\]]+)?\]\]/g;

function listar(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith(".")) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listar(p) : e.name.endsWith(".md") ? [p] : [];
  });
}

if (!fs.existsSync(RAIZ)) {
  console.error("vault/ não encontrado — rode a partir da raiz do repositório.");
  process.exit(1);
}

const arquivos = listar(RAIZ);
const notas = new Set(arquivos.map((f) => path.basename(f, ".md")));
const apontadas = new Set();
const quebrados = [];
let total = 0;

for (const f of arquivos) {
  const rel = path.relative(RAIZ, f);
  for (const m of fs.readFileSync(f, "utf8").matchAll(LINK)) {
    total += 1;
    const alvo = m[1].trim().replace(/\\$/, "");
    apontadas.add(alvo);
    if (!notas.has(alvo)) quebrados.push(`${rel} -> [[${alvo}]]`);
  }
}

const orfas = [...notas].filter((n) => n !== "Home" && !apontadas.has(n));

console.log(`notas: ${notas.size} | wikilinks: ${total} | quebrados: ${quebrados.length} | órfãs: ${orfas.length}`);
quebrados.forEach((q) => console.log(`  ✗ link quebrado: ${q}`));
orfas.forEach((o) => console.log(`  ⚠ nota órfã (ninguém aponta pra ela): ${o}`));
process.exit(quebrados.length ? 1 : 0);

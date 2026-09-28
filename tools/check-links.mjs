// Checks every exercise's source link: prints the ones that don't answer with a page.
// Needs network access to the sites (the Claude Code sandbox doesn't have it; a laptop or CI does).
//   node tools/check-links.mjs            (exit code 1 if any link is broken)
import { readdirSync, readFileSync } from 'node:fs';
const dir = new URL('../library/exercises/', import.meta.url);
const links = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
  const ex = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  return { id: ex.id, url: ex.source && ex.source.url };
}).filter(x => x.url);
const UA = 'Mozilla/5.0 (compatible; NstructR link check; +https://github.com/sanicki/nstructr)';
async function check({ id, url }) {
  for (const method of ['HEAD', 'GET']) {          // some sites refuse HEAD
    try {
      const r = await fetch(url, { method, redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
      if (r.ok) return null;
      if (method === 'GET') return `${r.status} ${id}  ${url}`;
    } catch (e) { if (method === 'GET') return `ERR ${id}  ${url}  (${e.cause?.code || e.name})`; }
  }
}
const bad = [];
for (let i = 0; i < links.length; i += 8) bad.push(...(await Promise.all(links.slice(i, i + 8).map(check))).filter(Boolean));
console.log(`${links.length} links checked, ${bad.length} not answering:`);
for (const b of bad) console.log('  ' + b);
process.exit(bad.length ? 1 : 0);

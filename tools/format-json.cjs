/* How library files are written: JSON with 2-space indents, and lists of plain values (a joint's three angles,
   "plant": ["L", "R"]) on one line, so a pose reads as one line per joint; "muscles" (group: rating) on one line too.
     node tools/format-json.cjs [files...]     (default: every file in library/exercises and library/workouts) */
const fs = require('fs'), path = require('path');
function formatJson(data) {
  return JSON.stringify(data, null, 2).replace(/\[\s*\n\s*([^\[\]{}]*?)\s*\n\s*\]/g, (m, inner) => '[' + inner.split(/,\s*\n\s*/).join(', ') + ']')
    .replace(/"muscles": \{\s*\n([^{}]*?)\n\s*\}/g, (m, inner) => '"muscles": {' + inner.trim().split(/,\s*\n\s*/).join(', ') + '}') + '\n';
}
module.exports = { formatJson };
if (require.main === module) {
  const root = path.join(__dirname, '..');
  const files = process.argv.slice(2).length ? process.argv.slice(2)
    : ['library/exercises', 'library/workouts'].flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.json')).map(f => path.join(root, d, f)));
  for (const f of files) fs.writeFileSync(f, formatJson(JSON.parse(fs.readFileSync(f, 'utf8'))));
  console.log(`formatted ${files.length} files`);
}

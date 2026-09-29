/* ===================== Language groundwork =====================
   The app is English only for now (Sep 2026; other languages are on ROADMAP.md). What depends on the language goes
   through here, so a catalogue of other languages can plug in later: the language itself (spoken lines say it, so the
   phone picks a voice for that language), counted words (plural rules, not "=== 1 ?"), and numbers. */
const LANG = document.documentElement.lang || 'en';
const PLURALS = new Intl.PluralRules(LANG);
/* a number in the app's language: fmtNum(1.5, 1) -> "1.5" ("1,5" in a language that writes a decimal comma) */
function fmtNum(n, digits) {
  return new Intl.NumberFormat(LANG, digits == null ? {} : { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}
/* a counted phrase, whole: plural(3, { one: '# exercise', other: '# exercises' }) -> "3 exercises" ("#" is the number).
   Languages with more forms add them (few, many…); a missing form falls back to "other". */
function plural(n, forms) {
  const f = forms[PLURALS.select(n)] || forms.other;
  return f.replace(/#/g, fmtNum(n));
}
/* what an exercise counts ("rep", "circle", "step pair"), for n of them; n null = a range like "8–12" (plural).
   English adds an s: the one place that rule lives. */
function repWord(ex, n) {
  const one = (ex && ex.repName) || 'rep';
  return n != null && PLURALS.select(n) === 'one' ? one : `${one}s`;
}

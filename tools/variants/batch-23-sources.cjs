// Sources for batch 23: each exercise's own description, in our own words.
const note = 'Described in our own words. Stick-figure approximation.';
const S = (url, title) => ({ url, title, note });
const PILATES = S('https://onlinepilatesclasses.com/blog/the-original-34-classical-pilates-mat-exercises/', 'Online Pilates Classes: The original 34 classical Pilates mat exercises');
const known = {
  pilates: { ...PILATES, note: 'Classic Pilates mat exercise, described in our own words for this library. Stick-figure approximation.' },
  cowFaceStrap: S('https://www.yogajournal.com/poses/cow-face-pose/', 'Yoga Journal: Cow Face Pose (Gomukhasana)'),
  sideStepping: S('https://www.healthline.com/health/exercises-for-balance', 'Healthline: Balance exercises'),
  balanceWalk: S('https://go4life.nia.nih.gov/sample_workout/3-balance-exercises-older-adults', 'National Institute on Aging (Go4Life): 3 balance exercises for older adults'),
};
module.exports = new Proxy(known, { get: (o, k) => { if (!(k in o)) throw new Error(`batch-23-sources: no source for "${String(k)}"`); return o[k]; } });

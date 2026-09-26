/* ============================================================
   EDIT THIS FILE to change what earns Dutzis and what they buy.
   Nothing else needs touching.
   ============================================================ */

/* type:'time'  -> shows 15m / 30m / 60m buttons (15 min = 1 Dutzi)
   type:'count' -> shows one button worth `value`
   streak:true  -> this activity keeps the daily streak alive      */
const SOLO = [
  { icon:'📖', name:'Study',                note:'Chinese / English',    type:'time',  streak:true },
  { icon:'🏋️', name:'Workout',              note:'',                     type:'time',  streak:true },
  { icon:'📕', name:'Reading',              note:'',                     type:'time',  streak:true },
  { icon:'💗', name:'Self care',            note:'therapy, journaling',  type:'time'  },
  { icon:'🍲', name:'Cook a meal for both', note:'',                     type:'count', value:2 },
  { icon:'🧺', name:'Big household chore',  note:'deep clean, laundry',  type:'count', value:2 },
  { icon:'📗', name:'Finish a unit (HSK)',  note:'',                     type:'count', value:3 },
  { icon:'📚', name:'Finish a book',        note:'',                     type:'count', value:5 },
];

/* these pay BOTH accounts at once */
const DUO = [
  { icon:'💞', name:'Time together, no phone', note:'per hour',           type:'count', value:1 },
  { icon:'✏️', name:'Study together',          note:'30+ min',            type:'count', value:1 },
  { icon:'🦮', name:'Long Dutzi walk',         note:'60+ min',            type:'count', value:2 },
  { icon:'🎓', name:'Dutzi training session',  note:'doorbell, commands', type:'count', value:1 },
];

const WEEKLY = [
  { icon:'🅰️', name:'English all week', note:'', type:'count', value:3 },
  { icon:'🀄', name:'Chinese all week', note:'', type:'count', value:3 },
  { icon:'💪', name:'Workout all week', note:'', type:'count', value:3 },
];

/* [cost, label] */
const SHOP = [
  [10,  '🦮 1 walk with Dutzi'],
  [10,  '🤗 1 hour together'],
  [20,  '👨‍🍳 Cook a meal on request'],
  [20,  '🧹 One day off from all chores'],
  [40,  '🍝 Eat outside or order'],
  [40,  '🌙 One evening together'],
  [40,  '🎬 Pick the movie'],
  [60,  '🗣️ Language teaching, 1 h'],
  [60,  '🛒 A whole day of food'],
  [100, '🐕 All Dutzi duty for a day'],
  [100, '🎁 Surprise gift up to 20€'],
  [150, '👑 King / Queen day'],
  [200, '🎀 Surprise gift up to 100€'],
];

/* handwritten line on the share card, one per weekday */
const NOTES = ['keep going 🐾','good week, Schatz','Dutzi is proud','one more session?',
               'slow and steady 🐾','streak alive 🔥','well done us'];

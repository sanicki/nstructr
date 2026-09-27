/* The exercise library arrives at startup: inlined as window.NSTRUCTR_BUNDLE in the single-file build
   (nstructr.html), otherwise fetched from library/index.json. Everything that needs it runs from boot()
   at the end of 5-main.js. */
var POSE_DB = { exercises: [] };
var LIBRARY_WORKOUTS = [];

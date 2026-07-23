// ---------------------------------------------------------------------------
// PLAN DATA - this is the baseline plan baked into the site.
// Edit this file and redeploy to change what everyone sees when they first
// open the link (their in-browser tweaks are separate and never touch this
// file). Everything below is PLACEHOLDER - replace with the real roster,
// rooms, and rules.
// ---------------------------------------------------------------------------

window.PLAN_DATA = {
  // Bump this any time you redeploy a materially different baseline.
  // Visitors whose saved edits were keyed to an older version fall back to
  // the new baseline instead of seeing a stale mix.
  version: "1",

  nights: [
    "Sat night",
    "Sun night",
    "Mon night",
    "Tue night",
    "Wed night",
    "Thu night",
    "Fri night"
  ],

  rooms: [
    { id: "r1", name: "Room 1", capacity: 4, bedConfig: "1 king + 2 twins" },
    { id: "r2", name: "Room 2", capacity: 4, bedConfig: "2 queens" },
    { id: "r3", name: "Room 3", capacity: 4, bedConfig: "1 queen + 2 twins" },
    { id: "r4", name: "Room 4", capacity: 3, bedConfig: "1 queen + 1 twin" },
    { id: "r5", name: "Room 5", capacity: 3, bedConfig: "3 twins" }
  ],

  // arrivalNight is an index into `nights` above (0 = arrives night 1).
  // Everyone is assumed to stay through the last night.
  people: [
    { id: "p1", name: "Person 1", arrivalNight: 0 },
    { id: "p2", name: "Person 2", arrivalNight: 0 },
    { id: "p3", name: "Person 3", arrivalNight: 0 },
    { id: "p4", name: "Person 4", arrivalNight: 0 },
    { id: "p5", name: "Person 5", arrivalNight: 0 },
    { id: "p6", name: "Person 6", arrivalNight: 0 },
    { id: "p7", name: "Person 7", arrivalNight: 1 },
    { id: "p8", name: "Person 8", arrivalNight: 1 },
    { id: "p9", name: "Person 9", arrivalNight: 1 },
    { id: "p10", name: "Person 10", arrivalNight: 2 },
    { id: "p11", name: "Person 11", arrivalNight: 2 },
    { id: "p12", name: "Person 12", arrivalNight: 3 },
    { id: "p13", name: "Person 13", arrivalNight: 3 },
    { id: "p14", name: "Person 14", arrivalNight: 3 },
    { id: "p15", name: "Person 15", arrivalNight: 4 },
    { id: "p16", name: "Person 16", arrivalNight: 4 },
    { id: "p17", name: "Person 17", arrivalNight: 5 },
    { id: "p18", name: "Person 18", arrivalNight: 5 }
  ],

  // Hard rules: enforced with a red warning if violated.
  // exclusive: true means ONLY the listed people may ever occupy that room.
  // Example (uncomment and edit once you know the real pairing):
  // hardRules: [
  //   { id: "hr1", label: "Grandparents", personIds: ["p1", "p2"], roomId: "r1", exclusive: true }
  // ],
  hardRules: [],

  // Soft rules: shown as an amber hint if violated, never blocks anything.
  // Example:
  // softRules: [
  //   { id: "sr1", label: "Kylea & Clint together", personIds: ["p3", "p4"] }
  // ],
  softRules: [],

  // The baseline arrangement: assignments[nightIndex][roomId] = [personId, ...]
  // Anyone who has arrived but isn't listed for that night shows up in the
  // "Unassigned" row automatically - you don't need to enumerate them.
  assignments: [
    { r1: ["p1", "p2"], r2: ["p3", "p4"], r3: ["p5"], r4: [], r5: [] },
    { r1: ["p1", "p2"], r2: ["p3", "p4"], r3: ["p5", "p7"], r4: ["p8"], r5: ["p9"] },
    { r1: ["p1", "p2"], r2: ["p3", "p4"], r3: ["p5", "p7"], r4: ["p8", "p10"], r5: ["p9", "p11"] },
    { r1: ["p1", "p2"], r2: ["p3", "p4"], r3: ["p5", "p7", "p12"], r4: ["p8", "p10"], r5: ["p9", "p11", "p13"] },
    { r1: ["p1", "p2"], r2: ["p3", "p4"], r3: ["p5", "p7", "p12"], r4: ["p8", "p10", "p15"], r5: ["p9", "p11", "p13"] },
    { r1: ["p1", "p2"], r2: ["p3", "p4"], r3: ["p5", "p7", "p12"], r4: ["p8", "p10", "p15"], r5: ["p9", "p11", "p13"] },
    { r1: ["p1", "p2"], r2: ["p3", "p4"], r3: ["p5", "p7", "p12"], r4: ["p8", "p10", "p15"], r5: ["p9", "p11", "p13"] }
  ]
};

// ---------------------------------------------------------------------------
// PLAN DATA - baseline plan baked into the site.
// Edit this file and redeploy to change what everyone sees when they first
// open the link (their in-browser tweaks are separate and never touch this
// file).
// ---------------------------------------------------------------------------

window.PLAN_DATA = {
  version: "5",

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
    { id: "master", name: "Upstairs Master", capacity: 3, bedConfig: "1 queen" },
    { id: "room2", name: "Upstairs Room 2", capacity: 3, bedConfig: "1 queen" },
    { id: "room3", name: "Downstairs Room 3", capacity: 2, bedConfig: "1 queen" },
    { id: "room4", name: "Downstairs Room 4", capacity: 3, bedConfig: "1 queen" },
    { id: "bunk", name: "Downstairs Bunk Room", capacity: 4, bedConfig: "4 bunks" },
    { id: "den", name: "Downstairs Den", capacity: 4, bedConfig: "3 air mattresses (up to 4 people)" },
    // availableNights restricts which nights this room may be used at all;
    // omit the field on other rooms to mean "available every night".
    { id: "living", name: "Living Room", capacity: 2, bedConfig: "1 air mattress", availableNights: [6] }
  ],

  // arrivalNight is an index into `nights` above (0 = Sat night).
  // Everyone stays through the last night (Fri night, index 6).
  people: [
    { id: "david", name: "David", arrivalNight: 0 },
    { id: "mc", name: "Mary Catherine", arrivalNight: 0 },
    { id: "michael", name: "Michael", arrivalNight: 0 },
    { id: "tricia", name: "Tricia", arrivalNight: 0 },
    { id: "grandma", name: "Grandma", arrivalNight: 0 },
    { id: "grandpa", name: "Grandpa", arrivalNight: 0 },
    { id: "emma", name: "Emma", arrivalNight: 0 },
    { id: "amelia", name: "Amelia", arrivalNight: 0 },
    { id: "daniel", name: "Daniel", arrivalNight: 0 },
    { id: "lindsay", name: "Lindsay", arrivalNight: 0 },
    { id: "roise", name: "Roise", arrivalNight: 3 },
    { id: "rebekah", name: "Rebekah", arrivalNight: 4 },
    { id: "julia", name: "Julia", arrivalNight: 4 },
    { id: "clint", name: "Clint", arrivalNight: 4 },
    { id: "kylea", name: "Kylea", arrivalNight: 4 },
    { id: "elizabeth", name: "Elizabeth", arrivalNight: 5 },
    { id: "jordan", name: "Jordan", arrivalNight: 5 },
    { id: "stephen", name: "Stephen", arrivalNight: 6 }
  ],

  hardRules: [
    { id: "hr-grandparents", label: "Grandma & Grandpa", personIds: ["grandma", "grandpa"], roomId: "room3", exclusive: true }
  ],

  softRules: [
    { id: "sr-stephen-roise", label: "Stephen & Roise", personIds: ["stephen", "roise"] },
    { id: "sr-daniel-lindsay", label: "Daniel & Lindsay", personIds: ["daniel", "lindsay"] },
    { id: "sr-clint-kylea", label: "Clint & Kylea", personIds: ["clint", "kylea"] },
    { id: "sr-david-mc", label: "David & Mary Catherine", personIds: ["david", "mc"] },
    { id: "sr-michael-tricia", label: "Michael & Tricia", personIds: ["michael", "tricia"] }
  ],

  // assignments[nightIndex][roomId] = [personId, ...]
  // Anyone who has arrived but isn't listed shows up in the Unassigned row.
  assignments: [
    { master: ["michael", "tricia"], room2: ["david", "mc"], room3: ["grandma", "grandpa"], room4: ["daniel", "lindsay"], bunk: ["emma", "amelia"], den: [], living: [] },
    { master: ["michael", "tricia"], room2: ["david", "mc"], room3: ["grandma", "grandpa"], room4: ["daniel", "lindsay"], bunk: ["emma", "amelia"], den: [], living: [] },
    { master: ["michael", "tricia"], room2: ["david", "mc"], room3: ["grandma", "grandpa"], room4: ["daniel", "lindsay"], bunk: ["emma", "amelia"], den: [], living: [] },
    { master: ["michael", "tricia"], room2: ["david", "mc"], room3: ["grandma", "grandpa"], room4: ["daniel", "lindsay"], bunk: ["emma", "amelia", "roise"], den: [], living: [] },
    { master: ["michael", "tricia"], room2: ["david", "mc"], room3: ["grandma", "grandpa"], room4: ["daniel", "lindsay", "amelia"], bunk: ["emma", "julia", "rebekah", "roise"], den: ["clint", "kylea"], living: [] },
    { master: ["michael", "tricia"], room2: ["david", "mc"], room3: ["grandma", "grandpa"], room4: ["daniel", "lindsay", "amelia"], bunk: ["emma", "julia", "rebekah", "roise"], den: ["clint", "kylea", "jordan", "elizabeth"], living: [] },
    { master: ["michael", "tricia"], room2: ["david", "mc"], room3: ["grandma", "grandpa"], room4: ["daniel", "lindsay", "amelia"], bunk: ["emma", "julia", "rebekah"], den: ["clint", "kylea", "jordan", "elizabeth"], living: ["stephen", "roise"] }
  ]
};

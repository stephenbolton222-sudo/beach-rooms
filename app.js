(function () {
  "use strict";

  var DATA = window.PLAN_DATA;
  var NIGHTS = DATA.nights;
  var ROOMS = DATA.rooms;
  var PEOPLE = DATA.people;
  var HARD_RULES = DATA.hardRules || [];
  var SOFT_RULES = DATA.softRules || [];
  var UNASSIGNED = "__unassigned__";
  var STORAGE_KEY = "beachRoomsPlan:" + DATA.version;

  var peopleById = {};
  PEOPLE.forEach(function (p) { peopleById[p.id] = p; });
  var roomsById = {};
  ROOMS.forEach(function (r) { roomsById[r.id] = r; });

  var state = loadState();
  var selection = null; // { personId, night, roomId } roomId === UNASSIGNED if from the pool

  function deepClone(x) { return JSON.parse(JSON.stringify(x)); }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt storage */ }
    return deepClone(DATA.assignments);
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* storage unavailable, edits just won't persist across reloads */ }
  }

  function hasArrived(person, night) {
    return person.arrivalNight <= night;
  }

  function isAssignedAnywhere(personId, night) {
    return ROOMS.some(function (r) {
      return state[night][r.id].indexOf(personId) !== -1;
    });
  }

  function unassignedFor(night) {
    return PEOPLE.filter(function (p) {
      return hasArrived(p, night) && !isAssignedAnywhere(p.id, night);
    }).map(function (p) { return p.id; });
  }

  function roomOfPerson(personId, night) {
    for (var i = 0; i < ROOMS.length; i++) {
      if (state[night][ROOMS[i].id].indexOf(personId) !== -1) return ROOMS[i].id;
    }
    return null;
  }

  function computeWarnings() {
    var messages = [];
    var cellFlags = {}; // key "night:roomId" -> { overCapacity, ruleViolation, ruleHint }

    function flag(night, roomId, key) {
      var k = night + ":" + roomId;
      if (!cellFlags[k]) cellFlags[k] = {};
      cellFlags[k][key] = true;
    }

    NIGHTS.forEach(function (_, night) {
      ROOMS.forEach(function (room) {
        var occ = state[night][room.id] || [];
        if (occ.length > room.capacity) {
          flag(night, room.id, "overCapacity");
          messages.push({
            danger: true,
            text: room.name + " is over capacity on " + NIGHTS[night] +
              " (" + occ.length + "/" + room.capacity + ")"
          });
        }
      });
    });

    HARD_RULES.forEach(function (rule) {
      NIGHTS.forEach(function (_, night) {
        var occ = state[night][rule.roomId] || [];
        var present = rule.personIds.filter(function (pid) { return hasArrived(peopleById[pid], night); });
        var missing = present.filter(function (pid) { return occ.indexOf(pid) === -1; });
        if (missing.length) {
          flag(night, rule.roomId, "ruleViolation");
          messages.push({
            danger: true,
            text: (rule.label || "Rule") + ": " +
              missing.map(function (pid) { return peopleById[pid].name; }).join(", ") +
              " should be in " + roomsById[rule.roomId].name + " on " + NIGHTS[night]
          });
        }
        if (rule.exclusive) {
          var outsiders = occ.filter(function (pid) { return rule.personIds.indexOf(pid) === -1; });
          if (outsiders.length) {
            flag(night, rule.roomId, "ruleViolation");
            messages.push({
              danger: true,
              text: roomsById[rule.roomId].name + " is reserved for " +
                rule.personIds.map(function (pid) { return peopleById[pid].name; }).join(", ") +
                " but also has " + outsiders.map(function (pid) { return peopleById[pid].name; }).join(", ") +
                " on " + NIGHTS[night]
            });
          }
        }
      });
    });

    SOFT_RULES.forEach(function (rule) {
      NIGHTS.forEach(function (_, night) {
        var present = rule.personIds.filter(function (pid) { return hasArrived(peopleById[pid], night); });
        if (present.length < 2) return;
        var rooms = present.map(function (pid) { return roomOfPerson(pid, night); });
        var allSame = rooms.every(function (r) { return r !== null && r === rooms[0]; });
        if (!allSame) {
          present.forEach(function (pid) {
            var r = roomOfPerson(pid, night);
            flag(night, r || UNASSIGNED, "ruleHint");
          });
          messages.push({
            danger: false,
            text: (rule.label || "Preference") + ": " +
              present.map(function (pid) { return peopleById[pid].name; }).join(", ") +
              " aren't together on " + NIGHTS[night]
          });
        }
      });
    });

    return { messages: messages, cellFlags: cellFlags };
  }

  function clearEl(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  function makeChip(personId, night, roomId) {
    var chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = peopleById[personId].name;
    if (selection && selection.personId === personId && selection.night === night && selection.roomId === roomId) {
      chip.className += " selected";
    }
    chip.addEventListener("click", function (e) {
      e.stopPropagation();
      onChipClick(personId, night, roomId);
    });
    return chip;
  }

  function onChipClick(personId, night, roomId) {
    if (selection && selection.personId === personId && selection.night === night && selection.roomId === roomId) {
      selection = null;
    } else {
      selection = { personId: personId, night: night, roomId: roomId };
    }
    render();
  }

  function onCellClick(night, roomId) {
    if (!selection) return;
    if (selection.night !== night) return;
    if (selection.roomId === roomId) { selection = null; render(); return; }

    if (selection.roomId !== UNASSIGNED) {
      var src = state[night][selection.roomId];
      var idx = src.indexOf(selection.personId);
      if (idx !== -1) src.splice(idx, 1);
    }
    if (roomId !== UNASSIGNED) {
      if (state[night][roomId].indexOf(selection.personId) === -1) {
        state[night][roomId].push(selection.personId);
      }
    }
    selection = null;
    saveState();
    render();
  }

  function copyForward(night) {
    if (night === 0) return;
    var ok = window.confirm(
      "Copy " + NIGHTS[night - 1] + "'s room assignments into " + NIGHTS[night] +
      "? This overwrites " + NIGHTS[night] + "'s current assignments."
    );
    if (!ok) return;
    var copy = {};
    ROOMS.forEach(function (r) {
      copy[r.id] = state[night - 1][r.id].filter(function (pid) {
        return hasArrived(peopleById[pid], night);
      });
    });
    state[night] = copy;
    selection = null;
    saveState();
    render();
  }

  function render() {
    var warnings = computeWarnings();

    var warningsEl = document.getElementById("warnings");
    clearEl(warningsEl);
    if (warnings.messages.length) {
      warningsEl.hidden = false;
      warnings.messages.forEach(function (m) {
        var div = document.createElement("div");
        div.className = "warning-item" + (m.danger ? " danger" : "");
        div.textContent = m.text;
        warningsEl.appendChild(div);
      });
    } else {
      warningsEl.hidden = true;
    }

    var table = document.getElementById("planGrid");
    clearEl(table);

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    headRow.appendChild(document.createElement("th"));
    NIGHTS.forEach(function (label, night) {
      var th = document.createElement("th");
      th.className = "night-header";
      th.textContent = label;
      if (night > 0) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "night-copy";
        btn.textContent = "← copy previous";
        btn.addEventListener("click", function () { copyForward(night); });
        th.appendChild(btn);
      }
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");

    // Unassigned pool row
    var unassignedRow = document.createElement("tr");
    unassignedRow.className = "unassigned-row";
    var unassignedLabel = document.createElement("td");
    unassignedLabel.className = "row-label";
    unassignedLabel.textContent = "Unassigned";
    unassignedRow.appendChild(unassignedLabel);
    NIGHTS.forEach(function (_, night) {
      var td = document.createElement("td");
      td.className = "cell";
      var flags = warnings.cellFlags[night + ":" + UNASSIGNED];
      if (flags && flags.ruleHint) td.className += " rule-hint";
      td.addEventListener("click", function () { onCellClick(night, UNASSIGNED); });
      unassignedFor(night).forEach(function (pid) {
        td.appendChild(makeChip(pid, night, UNASSIGNED));
      });
      unassignedRow.appendChild(td);
    });
    tbody.appendChild(unassignedRow);

    // Room rows
    ROOMS.forEach(function (room) {
      var row = document.createElement("tr");
      var label = document.createElement("td");
      label.className = "row-label";
      var nameEl = document.createElement("span");
      nameEl.className = "room-name";
      nameEl.textContent = room.name;
      var metaEl = document.createElement("span");
      metaEl.className = "room-meta";
      metaEl.textContent = "sleeps " + room.capacity + " · " + room.bedConfig;
      label.appendChild(nameEl);
      label.appendChild(metaEl);
      row.appendChild(label);

      NIGHTS.forEach(function (_, night) {
        var td = document.createElement("td");
        td.className = "cell";
        var flags = warnings.cellFlags[night + ":" + room.id];
        if (flags) {
          if (flags.overCapacity || flags.ruleViolation) td.className += " over-capacity rule-violation";
          else if (flags.ruleHint) td.className += " rule-hint";
        }
        td.addEventListener("click", function () { onCellClick(night, room.id); });
        (state[night][room.id] || []).forEach(function (pid) {
          td.appendChild(makeChip(pid, night, room.id));
        });
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
  }

  document.getElementById("resetBtn").addEventListener("click", function () {
    var ok = window.confirm("Reset to the original plan? This discards your changes in this browser.");
    if (!ok) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    state = deepClone(DATA.assignments);
    selection = null;
    render();
  });

  document.getElementById("exportBtn").addEventListener("click", function () {
    var payload = {
      version: DATA.version,
      exportedAt: new Date().toISOString(),
      assignments: state
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "beach-rooms-plan-export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  render();
})();

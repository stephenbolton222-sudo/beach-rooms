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

  function isRoomAvailable(room, night) {
    return !room.availableNights || room.availableNights.indexOf(night) !== -1;
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
        if (!occ.length) return;
        if (!isRoomAvailable(room, night)) {
          flag(night, room.id, "overCapacity");
          messages.push({
            danger: true,
            text: room.name + " isn't set up on " + NIGHTS[night] + " but has " +
              occ.map(function (pid) { return peopleById[pid].name; }).join(", ")
          });
        } else if (occ.length > room.capacity) {
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

  var DRAG_THRESHOLD = 6; // px of pointer movement before a tap becomes a drag
  var dragState = null;
  var ghostEl = null;

  function makeChip(personId, night, roomId) {
    var chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = peopleById[personId].name;
    if (selection && selection.personId === personId && selection.night === night && selection.roomId === roomId) {
      chip.className += " selected";
    }

    chip.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      if (chip.setPointerCapture) chip.setPointerCapture(e.pointerId);
      dragState = {
        pointerId: e.pointerId,
        personId: personId, night: night, roomId: roomId,
        startX: e.clientX, startY: e.clientY,
        dragging: false, cancelled: false, lastHoverCell: null
      };
    });
    chip.addEventListener("pointermove", function (e) {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      var dx = e.clientX - dragState.startX;
      var dy = e.clientY - dragState.startY;
      if (!dragState.dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        dragState.dragging = true;
        selection = null;
        startGhost(chip, e.clientX, e.clientY);
        chip.classList.add("dragging-source");
      }
      moveGhost(e.clientX, e.clientY);
      updateHoverCell(e.clientX, e.clientY);
    });
    chip.addEventListener("pointerup", function (e) {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      finishDrag();
    });
    chip.addEventListener("pointercancel", function (e) {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      dragState.cancelled = true;
      finishDrag();
    });

    return chip;
  }

  function startGhost(chip, x, y) {
    ghostEl = document.createElement("span");
    ghostEl.className = "chip chip-ghost";
    ghostEl.textContent = chip.textContent;
    ghostEl.style.left = x + "px";
    ghostEl.style.top = y + "px";
    document.body.appendChild(ghostEl);
  }

  function moveGhost(x, y) {
    if (!ghostEl) return;
    ghostEl.style.left = x + "px";
    ghostEl.style.top = y + "px";
  }

  function updateHoverCell(x, y) {
    var el = document.elementFromPoint(x, y); // ghost has pointer-events:none, so this sees through it
    var cell = el && el.closest ? el.closest(".cell") : null;
    if (dragState.lastHoverCell && dragState.lastHoverCell !== cell) {
      dragState.lastHoverCell.classList.remove("drop-target");
    }
    if (cell && cell.dataset.night === String(dragState.night)) {
      cell.classList.add("drop-target");
    }
    dragState.lastHoverCell = cell;
  }

  function finishDrag() {
    var wasDragging = dragState.dragging;
    var wasCancelled = dragState.cancelled;
    var personId = dragState.personId, night = dragState.night, roomId = dragState.roomId;
    var hoverCell = dragState.lastHoverCell;

    if (ghostEl) { ghostEl.remove(); ghostEl = null; }
    dragState = null;

    if (!wasDragging) {
      onChipClick(personId, night, roomId);
      return;
    }
    if (!wasCancelled && hoverCell && hoverCell.dataset.night === String(night)) {
      performMove(personId, night, roomId, hoverCell.dataset.roomId);
    } else {
      render(); // snap back and clear any stray hover highlight
    }
  }

  function performMove(personId, night, fromRoomId, toRoomId) {
    if (fromRoomId !== toRoomId) {
      if (fromRoomId !== UNASSIGNED) {
        var src = state[night][fromRoomId];
        var idx = src.indexOf(personId);
        if (idx !== -1) src.splice(idx, 1);
      }
      if (toRoomId !== UNASSIGNED && state[night][toRoomId].indexOf(personId) === -1) {
        state[night][toRoomId].push(personId);
      }
      saveState();
    }
    render();
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
    var personId = selection.personId, fromRoomId = selection.roomId;
    selection = null;
    performMove(personId, night, fromRoomId, roomId);
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
      td.dataset.night = String(night);
      td.dataset.roomId = UNASSIGNED;
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
        td.dataset.night = String(night);
        td.dataset.roomId = room.id;
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

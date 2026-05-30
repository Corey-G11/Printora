/* ============================================================
   Printora — app shell, router and rendering
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const view = $("#view");
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const TABS = [
    { id: "home",   label: "Home",   icon: "🏠" },
    { id: "setups", label: "Setups", icon: "🎛️" },
    { id: "models", label: "Models", icon: "📦" },
    { id: "guides", label: "Guides", icon: "📖" },
    { id: "fix",    label: "Fix",    icon: "🩹" }
  ];

  /* ---------- small UI helpers ---------- */
  function bars(n) {
    let out = '<span class="bars" aria-hidden="true">';
    for (let i = 1; i <= 5; i++) out += `<i class="${i <= n ? "on" : ""}"></i>`;
    return out + "</span>";
  }
  function section(title, sub) {
    return `<header class="page-head"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}</header>`;
  }
  function accordion(items) {
    // items: [{head, body, open, kind, id}] — kind/id award XP on first open
    const wrap = el("div", "acc");
    items.forEach((it) => {
      const card = el("div", "acc-item" + (it.open ? " open" : ""));
      if (it.id) card.dataset.id = it.id;
      const btn = el("button", "acc-head");
      btn.type = "button";
      btn.innerHTML = it.head + '<span class="chev" aria-hidden="true">▾</span>';
      const body = el("div", "acc-body");
      const inner = el("div", "acc-inner");
      inner.innerHTML = it.body;
      body.append(inner);
      btn.addEventListener("click", () => {
        card.classList.toggle("open");
        if (card.classList.contains("open") && it.kind && it.id) {
          trackOpen(it.kind, it.id);
        }
      });
      card.append(btn, body);
      wrap.append(card);
    });
    return wrap;
  }

  /* ============================================================
     GAMIFICATION — XP, levels, streaks, achievements, toasts
     ============================================================ */
  const PROGRESS_KEY = "printora-progress-v1";
  const XP_RULES = {
    routeVisit: { beginners: 100, tools: 10, compat: 15, shop: 5, glossary: 10, compare: 10 },
    open:       { setup: 15, guide: 20, fix: 15, models: 5, compat: 10 },
    click:      { tool: 10, shop: 5 },
    calc:       20,
    dailyVisit: 10,
    tipGotIt:   5,
    challenge:  25
  };
  const ACHIEVEMENTS = [
    { id: "welcome",            name: "Welcome Aboard",   emoji: "🚀", desc: "Open Printora for the first time" },
    { id: "tool-explorer",      name: "Tool Explorer",    emoji: "🪄", desc: "Visit the Tools section" },
    { id: "shopper",            name: "Smart Shopper",    emoji: "🛒", desc: "Browse the Shop" },
    { id: "first-click",        name: "First Click",      emoji: "🔗", desc: "Tap any external link" },
    { id: "material-scientist", name: "Material Scientist", emoji: "🧪", desc: "Open every filament setup" },
    { id: "bookworm",           name: "Bookworm",         emoji: "📖", desc: "Open 5 guides" },
    { id: "print-doctor",       name: "Print Doctor",     emoji: "🩺", desc: "Open 5 troubleshoots" },
    { id: "compat-master",      name: "Compatibility Pro", emoji: "🧬", desc: "Check every printer class" },
    { id: "streak-3",           name: "3-Day Streak",     emoji: "🔥", desc: "3 days in a row" },
    { id: "streak-7",           name: "Week-Long Streak", emoji: "💥", desc: "7 days in a row" },
    { id: "level-5",            name: "Halfway Hero",     emoji: "⭐", desc: "Reach Level 5" },
    { id: "master",             name: "Printora Master",  emoji: "👑", desc: "Reach Level 10" },
    { id: "level-15",           name: "Diamond Printer",  emoji: "💎", desc: "Reach Level 15" },
    { id: "level-20",           name: "Legend Status",    emoji: "🌟", desc: "Reach Level 20" },
    { id: "streak-30",          name: "Month of Mastery", emoji: "📅", desc: "Hit a 30-day streak" }
  ];

  function defaultProgress() {
    return { xp: 0, visited: [], achievements: [], streakDays: 0, bestStreak: 0, lastVisit: null, firstVisit: null, firstVisitSeen: false };
  }
  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      return raw ? Object.assign(defaultProgress(), JSON.parse(raw)) : defaultProgress();
    } catch (e) { return defaultProgress(); }
  }
  function saveProgress() {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(PROGRESS)); } catch (e) {}
  }
  let PROGRESS = loadProgress();

  function exportProgress() {
    try {
      const payload = Object.assign({ _printora: 1, _exportedAt: new Date().toISOString() }, PROGRESS);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `printora-backup-${todayStr()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showAchievementToast({ emoji: "💾", name: "Progress saved" });
    } catch (e) {
      showAchievementToast({ emoji: "⚠️", name: "Export failed" });
    }
  }

  function importProgress(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (typeof data !== "object" || data === null ||
            typeof data.xp !== "number" ||
            !Array.isArray(data.visited) ||
            !Array.isArray(data.achievements)) {
          showAchievementToast({ emoji: "⚠️", name: "Invalid backup file" });
          return;
        }
        // merge (preserve any local progress newer than backup)
        PROGRESS = Object.assign(defaultProgress(), data);
        saveProgress();
        refreshLevelPill();
        refreshHomeProgressCard();
        showAchievementToast({ emoji: "✅", name: `Restored — Lv ${level()}` });
        go("achievements");
      } catch (e) {
        showAchievementToast({ emoji: "⚠️", name: "Couldn't read file" });
      }
    };
    reader.readAsText(file);
  }

  /* ----- theme (light = Game Boy slate, dark = charcoal LCD) ----- */
  const THEME_KEY = "printora-theme";
  function loadTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function applyTheme(t) {
    if (t === "light" || t === "dark") {
      document.documentElement.dataset.theme = t;
    } else {
      delete document.documentElement.dataset.theme; // follow system
    }
    refreshThemeBtn();
  }
  function currentTheme() {
    const saved = document.documentElement.dataset.theme;
    if (saved) return saved;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
    // re-render the 3D pet so its colors match the new theme
    const card = document.getElementById("petScreen");
    if (card) renderPetInto(card);
  }
  function refreshThemeBtn() {
    const btn = document.getElementById("themeBtn");
    if (btn) {
      const dark = currentTheme() === "dark";
      btn.textContent = dark ? "☾" : "☀";
      btn.setAttribute("title", dark ? "Switch to light" : "Switch to dark");
    }
  }
  applyTheme(loadTheme());

  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function updateStreak() {
    const today = todayStr();
    if (!PROGRESS.firstVisit) PROGRESS.firstVisit = today;
    const before = PROGRESS.streakDays;
    if (PROGRESS.lastVisit === today) { /* same day */ }
    else if (PROGRESS.lastVisit) {
      const days = Math.round((Date.parse(today) - Date.parse(PROGRESS.lastVisit)) / 86400000);
      PROGRESS.streakDays = (days === 1) ? PROGRESS.streakDays + 1 : 1;
    } else {
      PROGRESS.streakDays = 1;
    }
    PROGRESS.lastVisit = today;
    if (PROGRESS.streakDays > before && before > 0) _streakUp = PROGRESS.streakDays;
    if (PROGRESS.streakDays > (PROGRESS.bestStreak || 0)) PROGRESS.bestStreak = PROGRESS.streakDays;
    saveProgress();
  }
  function awardDailyVisit() { award("daily:" + todayStr(), XP_RULES.dailyVisit); }
  function todayChallenge() {
    if (!DB.challenges || !DB.challenges.length) return null;
    const day = Math.floor(Date.parse(todayStr()) / 86400000);
    return DB.challenges[((day % DB.challenges.length) + DB.challenges.length) % DB.challenges.length];
  }
  function challengeDoneToday() {
    return PROGRESS.visited.indexOf("challenge:" + todayStr()) !== -1;
  }
  function tipClaimedToday() {
    return PROGRESS.visited.indexOf("tip:" + todayStr()) !== -1;
  }
  function level()      { return Math.floor(PROGRESS.xp / 100) + 1; }
  function xpInLevel()  { return PROGRESS.xp - (level() - 1) * 100; }

  function award(id, xp) {
    if (!xp || xp <= 0) return;
    if (PROGRESS.visited.indexOf(id) !== -1) return;
    PROGRESS.visited.push(id);
    PROGRESS.xp += xp;
    saveProgress();
    refreshLevelPill();
    refreshHomeProgressCard();
    checkAchievements();
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
  }
  function trackOpen(kind, id)   { award(`open:${kind}:${id}`, XP_RULES.open[kind]); }
  function trackClick(kind, id)  { award(`click:${kind}:${id}`, XP_RULES.click[kind]); }
  function trackRouteVisit(name) { const xp = XP_RULES.routeVisit[name]; if (xp) award(`route:${name}`, xp); }

  function checkAchievements() {
    const has = (a) => PROGRESS.achievements.indexOf(a) !== -1;
    const unlock = (id) => {
      if (has(id)) return;
      PROGRESS.achievements.push(id);
      saveProgress();
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        showAchievementToast(def);
        if (id !== "welcome" && typeof confettiBurst === "function") confettiBurst();
      }
    };
    const cnt = (prefix) => PROGRESS.visited.filter((v) => v.indexOf(prefix) === 0).length;

    unlock("welcome");
    if (PROGRESS.visited.indexOf("route:tools") !== -1) unlock("tool-explorer");
    if (PROGRESS.visited.indexOf("route:shop")  !== -1) unlock("shopper");
    if (PROGRESS.visited.some((v) => v.indexOf("click:") === 0)) unlock("first-click");
    if (cnt("open:setup:") >= (DB.materials && DB.materials.length || 6)) unlock("material-scientist");
    if (cnt("open:guide:") >= 5) unlock("bookworm");
    if (cnt("open:fix:")   >= 5) unlock("print-doctor");
    if (cnt("open:compat:") >= (DB.compat ? DB.compat.classes.length : 4)) unlock("compat-master");
    if (PROGRESS.streakDays >= 3) unlock("streak-3");
    if (PROGRESS.streakDays >= 7) unlock("streak-7");
    if ((PROGRESS.bestStreak || PROGRESS.streakDays) >= 30) unlock("streak-30");
    if (level() >= 5)  unlock("level-5");
    if (level() >= 10) unlock("master");
    if (level() >= 15) unlock("level-15");
    if (level() >= 20) unlock("level-20");
  }

  function refreshLevelPill() {
    const pill = document.getElementById("lvlPill");
    if (pill) pill.innerHTML = `Lv ${level()} · ${PROGRESS.xp} XP`;
  }
  function refreshHomeProgressCard() {
    const card = document.getElementById("progressCard");
    if (card) renderProgressInto(card);
    const pet = document.getElementById("petScreen");
    if (pet) renderPetInto(pet);
  }

  /* ============================================================
     PET — the Printora Tamagotchi creature
     ============================================================ */
  function petMood() {
    const hour = new Date().getHours();
    const lvl = level();
    const streak = PROGRESS.streakDays;
    if (hour >= 22 || hour < 6) return "sleep";
    if (lvl >= 20) return "godmode";
    if (lvl >= 15) return "legend";
    if (lvl >= 10) return "master";
    if (streak >= 7) return "fire";
    if (streak >= 3) return "happy";
    if (lvl >= 5)    return "happy";
    if (PROGRESS.xp === 0) return "egg";
    return "ok";
  }
  function petName() {
    const lvl = level();
    if (lvl >= 20) return "PRINT-GOD";
    if (lvl >= 15) return "VOID-MASTER";
    if (lvl >= 10) return "PRINT-MASTER";
    if (lvl >= 5)  return "PRINTORA";
    if (PROGRESS.xp === 0) return "EGG";
    return "PRINTLING";
  }
  function petLines(mood) {
    const lines = {
      egg:     ["TAP A CARD!", "FEED ME XP!", "HATCH ME!"],
      ok:      ["LET'S PRINT!", "HI FRIEND!", "MORE XP?"],
      happy:   ["FEELING GOOD!", "GREAT JOB!", "KEEP IT UP!"],
      fire:    ["ON FIRE!", "UNSTOPPABLE!", "STREAK MODE!"],
      master:  ["LEGEND!", "PRINT GOD!", "MAX LEVEL!"],
      legend:  ["TRANSCENDED!", "VOID-FORGED!", "BEYOND MASTER!"],
      godmode: ["GODMODE!", "REALITY BENDS!", "I AM PRINTING!"],
      sleep:   ["ZZZ...", "SHHH...", "DREAMING..."]
    };
    const arr = lines[mood] || lines.ok;
    const day = Math.floor(Date.now() / 60000); // change every minute
    return arr[day % arr.length];
  }

  /* ----- 3D pet via three.js -----
     A bed-slinger 3D printer character. The print head is the face.
     Mood drives color, lights, animation speed, and extras (crown/flames). */
  let _petScene = null;

  function disposePetScene() {
    if (!_petScene) return;
    const s = _petScene;
    _petScene = null;
    if (s.raf) cancelAnimationFrame(s.raf);
    if (s.resize) window.removeEventListener("resize", s.resize);
    if (s.scene) {
      s.scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m.dispose && m.dispose());
        }
      });
    }
    if (s.renderer) {
      try { s.renderer.forceContextLoss(); } catch (e) {}
      s.renderer.dispose();
      if (s.renderer.domElement && s.renderer.domElement.parentNode) {
        s.renderer.domElement.parentNode.removeChild(s.renderer.domElement);
      }
    }
  }

  function moodColors(mood) {
    // [body, accent, eye] — eye color matches LCD pixel ink (theme aware)
    const isDark = (document.documentElement.dataset.theme === "dark") ||
      (!document.documentElement.dataset.theme &&
       window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const eye = isDark ? "#d6e8d8" : "#2a3340";
    // body colors stay vivid (pet sits on dim LCD bg so it pops either way),
    // but we soften them slightly in light mode to harmonize with the slate shell
    const map = isDark ? {
      egg:     ["#e8d4a8", "#a88a54", eye],
      ok:      ["#ffb05c", "#a06028", eye],
      happy:   ["#e89bb0", "#a04a64", eye],
      fire:    ["#ff5a3a", "#9a2010", "#fff3a0"],
      master:  ["#ffd28a", "#8a6018", eye],
      legend:  ["#9bd0f0", "#3a6a90", "#fff3a0"],
      godmode: ["#f0e0ff", "#6a30a0", "#fff3a0"],
      sleep:   ["#7bd0c0", "#2a4870", eye]
    } : {
      egg:     ["#e8d4a8", "#a88a54", eye],
      ok:      ["#d97a5b", "#8a3a20", eye],
      happy:   ["#c97a8f", "#7a3a48", eye],
      fire:    ["#c84a30", "#6a1a08", "#fff3a0"],
      master:  ["#c69050", "#6a4010", eye],
      legend:  ["#6a90c0", "#2a4a70", "#fff3a0"],
      godmode: ["#a070d0", "#4a2a70", "#fff3a0"],
      sleep:   ["#5b9aa8", "#2a4870", eye]
    };
    return map[mood] || map.ok;
  }

  function buildPetMesh(mood) {
    const T = window.THREE;
    const root = new T.Group();
    const [frameHex, accentHex, eyeHex] = moodColors(mood);
    const frameMat = new T.MeshStandardMaterial({
      color: new T.Color(frameHex), roughness: 0.45, metalness: 0.15
    });
    const railMat = new T.MeshStandardMaterial({
      color: 0x2a3340, roughness: 0.3, metalness: 0.65
    });
    const accentMat = new T.MeshStandardMaterial({
      color: new T.Color(accentHex), roughness: 0.55, metalness: 0.1
    });
    const eyeMat = new T.MeshStandardMaterial({
      color: new T.Color(eyeHex), roughness: 0.2, metalness: 0.1
    });
    const whiteMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const bedMat = new T.MeshStandardMaterial({
      color: 0xcfe0c0, roughness: 0.4, metalness: 0.0
    });

    if (mood === "egg") {
      // egg sitting on a bed plate
      const baseGeom = new T.BoxGeometry(2.2, 0.18, 1.2);
      const base = new T.Mesh(baseGeom, frameMat);
      base.position.y = -0.95;
      root.add(base);
      const bed = new T.Mesh(new T.BoxGeometry(1.6, 0.08, 0.9), bedMat);
      bed.position.y = -0.82;
      root.add(bed);
      const egg = new T.Mesh(new T.SphereGeometry(0.55, 32, 24), accentMat);
      egg.scale.set(0.85, 1.2, 0.85);
      egg.position.y = -0.1;
      root.add(egg);
      const crackMat = new T.MeshStandardMaterial({ color: 0x6b4a0a });
      [[-0.1, 0.2], [0.05, 0.05], [0.15, -0.1]].forEach(([x, y]) => {
        const c = new T.Mesh(new T.BoxGeometry(0.14, 0.05, 0.02), crackMat);
        c.position.set(x, y, 0.45);
        c.rotation.z = Math.random() * 0.6 - 0.3;
        root.add(c);
      });
      return root;
    }

    /* ----- BED-SLINGER 3D PRINTER ----- */

    // BASE — the bottom electronics box
    const base = new T.Mesh(new T.BoxGeometry(2.4, 0.32, 1.4), frameMat);
    base.position.y = -1.05;
    root.add(base);
    // base highlight strip (controls panel)
    const panel = new T.Mesh(new T.BoxGeometry(0.9, 0.18, 0.04), accentMat);
    panel.position.set(0, -1.0, 0.72);
    root.add(panel);
    // tiny LCD light
    const lcdLight = new T.Mesh(
      new T.BoxGeometry(0.25, 0.06, 0.02),
      new T.MeshStandardMaterial({ color: 0xa0d0a0, emissive: 0x4a6e62, emissiveIntensity: 0.6 })
    );
    lcdLight.position.set(0, -1.0, 0.74);
    root.add(lcdLight);

    // Y-AXIS RAILS (under the bed)
    [-0.5, 0.5].forEach((x) => {
      const rail = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 1.4, 12), railMat);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(x, -0.85, 0);
      root.add(rail);
    });

    // HEATED BED — slides on Y (Z in scene) and is named for the loop
    const bedGroup = new T.Group();
    const bedPlate = new T.Mesh(new T.BoxGeometry(1.7, 0.08, 1.0), frameMat);
    bedPlate.position.y = -0.78;
    bedGroup.add(bedPlate);
    const bedSurface = new T.Mesh(new T.BoxGeometry(1.55, 0.04, 0.88), bedMat);
    bedSurface.position.y = -0.72;
    bedGroup.add(bedSurface);
    // grid lines on bed
    const gridMat = new T.MeshStandardMaterial({ color: 0x9bb89a });
    for (let i = -0.6; i <= 0.6; i += 0.3) {
      const ln = new T.Mesh(new T.BoxGeometry(0.01, 0.005, 0.85), gridMat);
      ln.position.set(i, -0.69, 0);
      bedGroup.add(ln);
    }
    bedGroup.userData.role = "bed";
    root.add(bedGroup);

    // FRAME UPRIGHTS
    [-1, 1].forEach((side) => {
      const up = new T.Mesh(new T.BoxGeometry(0.18, 2.2, 0.18), frameMat);
      up.position.set(side * 1.05, 0.05, -0.3);
      root.add(up);
    });
    // TOP CROSSBAR
    const cross = new T.Mesh(new T.BoxGeometry(2.4, 0.18, 0.18), frameMat);
    cross.position.set(0, 1.15, -0.3);
    root.add(cross);

    // X-AXIS RAIL (horizontal bar that holds the print head)
    const xrail = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 2.1, 12), railMat);
    xrail.rotation.z = Math.PI / 2;
    xrail.position.set(0, 0.4, -0.15);
    xrail.userData.role = "xrail";
    root.add(xrail);
    // Z-axis lead screws
    [-1, 1].forEach((side) => {
      const lead = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 2.0, 12), railMat);
      lead.position.set(side * 0.9, 0.05, -0.3);
      lead.userData.role = "lead";
      root.add(lead);
    });

    // PRINT HEAD (the face)
    const headGroup = new T.Group();
    headGroup.userData.role = "head";
    const head = new T.Mesh(new T.BoxGeometry(0.7, 0.55, 0.4), accentMat);
    head.position.set(0, 0, 0);
    headGroup.add(head);
    // hotend
    const hotend = new T.Mesh(new T.CylinderGeometry(0.08, 0.04, 0.18, 12), railMat);
    hotend.position.set(0, -0.36, 0.05);
    headGroup.add(hotend);
    // nozzle tip
    const nozzle = new T.Mesh(new T.ConeGeometry(0.04, 0.08, 8), railMat);
    nozzle.position.set(0, -0.48, 0.05);
    headGroup.add(nozzle);
    // small fan on the side
    const fanMat = new T.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
    const fan = new T.Mesh(new T.BoxGeometry(0.08, 0.28, 0.28), fanMat);
    fan.position.set(0.32, -0.05, 0);
    headGroup.add(fan);

    // EYES on the print head
    const eyeR = (mood === "fire" || mood === "master") ? 0.09 : 0.075;
    [-1, 1].forEach((side) => {
      if (mood === "sleep") {
        const lid = new T.Mesh(
          new T.TorusGeometry(0.07, 0.018, 6, 12, Math.PI),
          eyeMat
        );
        lid.position.set(side * 0.16, 0.02, 0.21);
        lid.rotation.z = Math.PI;
        headGroup.add(lid);
      } else {
        const white = new T.Mesh(new T.SphereGeometry(eyeR, 16, 16), whiteMat);
        white.position.set(side * 0.16, 0.06, 0.18);
        white.scale.z = 0.5;
        headGroup.add(white);
        const pupil = new T.Mesh(new T.SphereGeometry(eyeR * 0.55, 12, 12), eyeMat);
        pupil.position.set(side * 0.16, 0.06, 0.22);
        pupil.scale.z = 0.3;
        headGroup.add(pupil);
        const shine = new T.Mesh(new T.SphereGeometry(eyeR * 0.28, 8, 8), whiteMat);
        shine.position.set(side * 0.16 + 0.02, 0.085, 0.24);
        shine.scale.z = 0.3;
        headGroup.add(shine);
      }
    });

    // MOUTH on the print head
    if (mood === "happy" || mood === "fire" || mood === "master") {
      const smile = new T.Mesh(
        new T.TorusGeometry(0.09, 0.02, 6, 16, Math.PI),
        eyeMat
      );
      smile.position.set(0, -0.12, 0.21);
      smile.rotation.z = Math.PI;
      headGroup.add(smile);
    } else if (mood === "sleep") {
      const z = new T.Mesh(
        new T.TorusGeometry(0.03, 0.012, 6, 12, Math.PI),
        eyeMat
      );
      z.position.set(0, -0.08, 0.21);
      headGroup.add(z);
    } else {
      const mouth = new T.Mesh(new T.BoxGeometry(0.1, 0.02, 0.02), eyeMat);
      mouth.position.set(0, -0.1, 0.21);
      headGroup.add(mouth);
    }

    // CHEEKS for happy moods
    if (mood === "happy" || mood === "fire" || mood === "master") {
      const cheekMat = new T.MeshStandardMaterial({
        color: 0xff7a8a, transparent: true, opacity: 0.55
      });
      [-1, 1].forEach((side) => {
        const c = new T.Mesh(new T.SphereGeometry(0.05, 12, 12), cheekMat);
        c.position.set(side * 0.26, -0.05, 0.19);
        c.scale.z = 0.3;
        headGroup.add(c);
      });
    }
    headGroup.position.set(0, 0.4, 0);
    root.add(headGroup);

    // SPOOL on top of the printer
    const spoolGroup = new T.Group();
    spoolGroup.userData.role = "spool";
    const spoolBody = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 0.18, 32), accentMat);
    spoolBody.rotation.z = Math.PI / 2;
    spoolGroup.add(spoolBody);
    const spoolHubMat = new T.MeshStandardMaterial({ color: 0x2a3340 });
    const hub = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 0.22, 16), spoolHubMat);
    hub.rotation.z = Math.PI / 2;
    spoolGroup.add(hub);
    // flanges
    [-1, 1].forEach((side) => {
      const flange = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 0.02, 32), frameMat);
      flange.rotation.z = Math.PI / 2;
      flange.position.x = side * 0.1;
      spoolGroup.add(flange);
    });
    spoolGroup.position.set(0, 1.45, -0.3);
    root.add(spoolGroup);

    // spool mount post
    const mount = new T.Mesh(new T.BoxGeometry(0.12, 0.3, 0.12), frameMat);
    mount.position.set(0, 1.3, -0.3);
    root.add(mount);

    // FILAMENT STRAND — curve from spool down to the print head
    const filamentMat = new T.MeshStandardMaterial({ color: new T.Color(accentHex) });
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(0,  1.4, -0.15),
      new T.Vector3(0.1, 1.0, 0.0),
      new T.Vector3(0.05, 0.7, 0.1),
      new T.Vector3(0, 0.5, 0.05)
    ]);
    const filament = new T.Mesh(
      new T.TubeGeometry(curve, 24, 0.02, 8, false),
      filamentMat
    );
    root.add(filament);

    // CROWN — master / legend / godmode
    if (mood === "master" || mood === "legend" || mood === "godmode") {
      const crownColor = mood === "legend" ? 0x9bd0f0 : (mood === "godmode" ? 0xf0c8ff : 0xffd24a);
      const crownMat = new T.MeshStandardMaterial({
        color: crownColor, roughness: 0.2, metalness: 0.8,
        emissive: mood === "godmode" ? 0x9b4af0 : 0x000000,
        emissiveIntensity: mood === "godmode" ? 0.5 : 0
      });
      const cbase = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.1, 16), crownMat);
      cbase.position.set(0, 1.42, -0.3);
      root.add(cbase);
      for (let i = 0; i < 5; i++) {
        const spike = new T.Mesh(new T.ConeGeometry(0.06, 0.18, 8), crownMat);
        const a = (i / 5) * Math.PI * 2;
        spike.position.set(Math.cos(a) * 0.22, 1.55, -0.3 + Math.sin(a) * 0.22);
        root.add(spike);
      }
      // DOUBLE CROWN — legend & godmode
      if (mood === "legend" || mood === "godmode") {
        const cbase2 = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.08, 16), crownMat);
        cbase2.position.set(0, 1.66, -0.3);
        root.add(cbase2);
        for (let i = 0; i < 5; i++) {
          const spike = new T.Mesh(new T.ConeGeometry(0.05, 0.15, 8), crownMat);
          const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
          spike.position.set(Math.cos(a) * 0.16, 1.77, -0.3 + Math.sin(a) * 0.16);
          root.add(spike);
        }
      }
    }

    // FLAMES — fire mood (around hotend) + godmode halo around top crossbar
    if (mood === "fire") {
      const flameMat = new T.MeshStandardMaterial({
        color: 0xffa040, emissive: 0xff5500, emissiveIntensity: 0.7,
        transparent: true, opacity: 0.85
      });
      for (let i = 0; i < 5; i++) {
        const f = new T.Mesh(new T.ConeGeometry(0.06, 0.2, 8), flameMat);
        const a = (i / 5) * Math.PI * 2;
        f.position.set(Math.cos(a) * 0.1, -0.05, 0.05 + Math.sin(a) * 0.1);
        f.userData.flame = true;
        f.userData.offset = i * 0.4;
        headGroup.add(f);
      }
    }
    if (mood === "godmode") {
      // halo of bright flames around the top crossbar
      const haloMat = new T.MeshStandardMaterial({
        color: 0xc080ff, emissive: 0xa040ff, emissiveIntensity: 0.9,
        transparent: true, opacity: 0.85
      });
      for (let i = 0; i < 8; i++) {
        const f = new T.Mesh(new T.ConeGeometry(0.08, 0.28, 8), haloMat);
        const a = (i / 8) * Math.PI * 2;
        f.position.set(Math.cos(a) * 0.45, 1.95, -0.3 + Math.sin(a) * 0.45);
        f.userData.flame = true;
        f.userData.offset = i * 0.5;
        root.add(f);
      }
    }

    return root;
  }

  function initPetScene(host, mood) {
    const T = window.THREE;
    if (!T) return null;
    const w = host.clientWidth || 120;
    const h = host.clientHeight || 120;

    const scene = new T.Scene();
    scene.background = null;

    const camera = new T.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0.4, 0.4, 5.4);
    camera.lookAt(0, 0.15, 0);

    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = T.SRGBColorSpace || T.LinearSRGBColorSpace;
    host.innerHTML = "";
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    // lights
    const ambient = new T.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const key = new T.DirectionalLight(0xffffff, 1.1);
    key.position.set(2, 3, 4);
    scene.add(key);
    const rim = new T.DirectionalLight(0xa0e0ff, 0.45);
    rim.position.set(-3, 1, -2);
    scene.add(rim);

    const pet = buildPetMesh(mood);
    scene.add(pet);

    // find named sub-parts to animate (cache once — avoid per-frame lookup)
    const parts = { bed: null, head: null, spool: null, xrail: null };
    pet.traverse((o) => {
      const r = o.userData && o.userData.role;
      if (r && parts[r] === null) parts[r] = o;
    });
    // flames live under headGroup — collect them once
    const flames = [];
    pet.traverse((o) => { if (o.userData && o.userData.flame) flames.push(o); });

    const state = { scene, camera, renderer, pet, mood, parts, flames, t0: performance.now() };

    // speed knob per mood — drives bed slide, head Y, and spool rotation
    const speed = ({
      egg: 0, sleep: 0.25, ok: 1, happy: 1.6, fire: 3.0, master: 2.2
    })[mood] || 1;

    function loop() {
      const t = (performance.now() - state.t0) / 1000;

      // gentle sway of the whole printer (subtle — keep it readable)
      pet.rotation.y = Math.sin(t * 0.4) * 0.18;

      if (mood !== "egg") {
        // BED slides forward/back along Z
        if (parts.bed) parts.bed.position.z = Math.sin(t * 1.3 * speed) * 0.35;
        // PRINT HEAD moves up/down on Y (climbing the Z lead screws)
        if (parts.head) {
          const baseY = 0.4;
          const range = 0.55;
          parts.head.position.y = baseY + Math.sin(t * 1.7 * speed) * range;
          parts.head.position.x = Math.cos(t * 2.0 * speed) * 0.45;
        }
        // X-axis rail follows the head's Y
        if (parts.xrail && parts.head) parts.xrail.position.y = parts.head.position.y;
        // SPOOL rotates lazily
        if (parts.spool) parts.spool.rotation.x = t * 0.5 * speed;
      }

      // sleep: park the head, dim motion
      if (mood === "sleep" && parts.head) {
        parts.head.position.x = -0.9;
        parts.head.position.y = 0.4 + Math.sin(t * 0.5) * 0.02;
        if (parts.bed) parts.bed.position.z = 0;
      }

      // flames flicker
      flames.forEach((f) => {
        f.scale.y = 1 + Math.sin(t * 9 + f.userData.offset) * 0.3;
        f.rotation.y = t * 1.5 + f.userData.offset;
      });

      renderer.render(scene, camera);
      state.raf = requestAnimationFrame(loop);
    }
    state.raf = requestAnimationFrame(loop);

    state.resize = () => {
      const w2 = host.clientWidth || 120;
      const h2 = host.clientHeight || 120;
      renderer.setSize(w2, h2, false);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", state.resize);

    return state;
  }

  // Flat SVG fallback (no WebGL / no three.js) — same 3D-printer character
  function petSvg(mood) {
    // returns a printer SVG keyed by mood
    const eye = mood === "fire" ? "#fff3a0" : "#2a3340";
    const body = ({
      egg: "#e8d4a8", ok: "#d97a5b", happy: "#c97a8f",
      fire: "#c84a30", master: "#c69050", sleep: "#5b9aa8"
    })[mood] || "#d97a5b";
    const accent = ({
      egg: "#a88a54", ok: "#8a3a20", happy: "#7a3a48",
      fire: "#6a1a08", master: "#6a4010", sleep: "#2a4870"
    })[mood] || "#8a3a20";
    if (mood === "egg") {
      return `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
        <rect x="14" y="74" width="68" height="6" fill="${accent}"/>
        <rect x="20" y="68" width="56" height="6" fill="#cfe0c0"/>
        <ellipse cx="48" cy="46" rx="16" ry="22" fill="${body}"/>
        <rect x="42" y="40" width="3" height="2" fill="${accent}" transform="rotate(-20 43 40)"/>
        <rect x="50" y="48" width="3" height="2" fill="${accent}" transform="rotate(15 51 48)"/>
      </svg>`;
    }
    let eyes, mouth;
    if (mood === "sleep") {
      eyes = `<path d="M 32 50 Q 36 53 40 50" stroke="${eye}" stroke-width="2" fill="none"/>
              <path d="M 56 50 Q 60 53 64 50" stroke="${eye}" stroke-width="2" fill="none"/>`;
      mouth = `<rect x="44" y="58" width="8" height="2" fill="${eye}"/>`;
    } else if (mood === "happy" || mood === "fire" || mood === "master" || mood === "legend" || mood === "godmode") {
      eyes = `<rect x="32" y="46" width="6" height="8" fill="${eye}"/>
              <rect x="58" y="46" width="6" height="8" fill="${eye}"/>`;
      mouth = `<path d="M 38 58 Q 48 64 58 58" stroke="${eye}" stroke-width="2.5" fill="none"/>`;
    } else {
      eyes = `<rect x="32" y="46" width="5" height="6" fill="${eye}"/>
              <rect x="59" y="46" width="5" height="6" fill="${eye}"/>`;
      mouth = `<rect x="42" y="58" width="12" height="2" fill="${eye}"/>`;
    }
    const crownC = mood === "godmode" ? "#c080ff" : (mood === "legend" ? "#9bd0f0" : "#ffd24a");
    const showCrown = mood === "master" || mood === "legend" || mood === "godmode";
    const showStack = mood === "legend" || mood === "godmode";
    const crown = showCrown
      ? `<rect x="40" y="6" width="16" height="4" fill="${crownC}"/>
         <polygon points="40,6 44,2 48,6" fill="${crownC}"/>
         <polygon points="44,6 48,2 52,6" fill="${crownC}"/>
         <polygon points="48,6 52,2 56,6" fill="${crownC}"/>
         ${showStack ? `<rect x="42" y="0" width="12" height="2" fill="${crownC}"/>
         <polygon points="42,0 45,-3 48,0" fill="${crownC}"/>
         <polygon points="48,0 51,-3 54,0" fill="${crownC}"/>` : ""}`
      : "";
    const halo = mood === "godmode"
      ? `<circle cx="48" cy="48" r="44" fill="none" stroke="#c080ff" stroke-width="2" opacity=".5"/>
         <circle cx="48" cy="48" r="40" fill="none" stroke="#c080ff" stroke-width="1.5" opacity=".7"/>`
      : "";
    return `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
      ${halo}
      ${crown}
      <!-- spool -->
      <circle cx="48" cy="14" r="8" fill="${body}"/>
      <circle cx="48" cy="14" r="3" fill="${accent}"/>
      <!-- frame uprights -->
      <rect x="14" y="20" width="5" height="50" fill="${body}"/>
      <rect x="77" y="20" width="5" height="50" fill="${body}"/>
      <!-- top crossbar -->
      <rect x="12" y="18" width="72" height="5" fill="${body}"/>
      <!-- base -->
      <rect x="10" y="78" width="76" height="8" fill="${accent}"/>
      <!-- bed -->
      <rect x="18" y="72" width="60" height="6" fill="#cfe0c0"/>
      <!-- x-axis -->
      <rect x="14" y="40" width="68" height="3" fill="#3a4252"/>
      <!-- print head (face) -->
      <rect x="30" y="42" width="36" height="22" rx="3" fill="${body}"/>
      ${eyes}
      ${mouth}
      <!-- nozzle -->
      <polygon points="44,64 52,64 48,72" fill="#3a4252"/>
      ${mood === "fire" ? `<polygon points="42,72 48,82 54,72" fill="#ffa040"/>` : ""}
    </svg>`;
  }

  function renderPetInto(host) {
    const mood = petMood();
    const moodClass = (mood === "sleep") ? "mood-sleep"
                    : (mood === "fire" || mood === "master" || mood === "legend" || mood === "godmode") ? "mood-celebrate"
                    : (mood === "happy") ? "mood-happy" : "";
    const moodLabel = ({
      egg: "Egg", ok: "Idle", happy: "Happy", legend: "Legend", godmode: "Godmode",
      fire: "On Fire", master: "Legendary", sleep: "Sleeping"
    })[mood] || "Idle";
    const xp = PROGRESS.xp, lvl = level(), inLvl = xpInLevel();
    const totalSegs = 10;
    const onSegs = Math.max(1, Math.round((inLvl / 100) * totalSegs));
    let segs = "";
    for (let i = 0; i < totalSegs; i++) {
      segs += `<i class="${i < onSegs ? "on" : ""}"></i>`;
    }
    const zz = (mood === "sleep")
      ? `<span class="pet-zz">Z</span><span class="pet-zz">Z</span>`
      : "";
    // dispose any previous 3D scene before re-rendering
    disposePetScene();
    host.innerHTML = `
      <div class="pet-stage">
        <div class="pet-name">${esc(petName())}</div>
        <div class="pet-mood">${esc(moodLabel)}</div>
        <div class="pet-speech">${esc(petLines(mood))}</div>
        <div class="pet ${moodClass}" id="pet3d">
          ${zz}
        </div>
        <div class="pet-stats">
          <span class="pet-stat"><span class="ps-ico">⭐</span>Lv ${lvl}</span>
          <span class="pet-stat"><span class="ps-ico">⚡</span>${xp} XP</span>
          <span class="pet-stat"><span class="ps-ico">🔥</span>${PROGRESS.streakDays}d</span>
          <span class="pet-stat"><span class="ps-ico">🏆</span>${PROGRESS.bestStreak || PROGRESS.streakDays}d best</span>
        </div>
        <div class="pet-bar">${segs}</div>
        <div class="pet-bar-label">Energy · ${inLvl}/100 to Lv ${lvl + 1}</div>
        ${(function () {
          const ch = todayChallenge();
          if (!ch) return "";
          const done = challengeDoneToday();
          return `<div class="pet-challenge ${done ? "done" : ""}">
            <div class="pc-label">🎯 Today's Challenge</div>
            <div class="pc-text">${ch.emoji} ${esc(ch.text)}</div>
            <button class="pc-claim" type="button" ${done ? "disabled" : ""}>
              ${done ? "✓ Done today" : `Mark done · +${XP_RULES.challenge} XP`}
            </button>
          </div>`;
        })()}
        <div class="pet-actions">
          <button class="pet-btn" type="button" data-act="feed"  aria-label="Feed — open Guides">🍔<span>Feed</span></button>
          <button class="pet-btn" type="button" data-act="play"  aria-label="Play — open Models">🎮<span>Play</span></button>
          <button class="pet-btn" type="button" data-act="clean" aria-label="Clean — open Troubleshoot">🧽<span>Clean</span></button>
          <button class="pet-btn" type="button" data-act="train" aria-label="Train — open Setups">💪<span>Train</span></button>
        </div>
      </div>`;
    host.querySelectorAll(".pet-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const map = { feed: "guides", play: "models", clean: "fix", train: "setups" };
        const dest = map[b.dataset.act] || "home";
        // little squish animation via class
        const petEl = host.querySelector(".pet");
        if (petEl) {
          petEl.style.transform = "scale(1.15)";
          setTimeout(() => { petEl.style.transform = ""; }, 180);
        }
        if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) {}
        go(dest);
      });
    });
    const claimBtn = host.querySelector(".pc-claim");
    if (claimBtn && !claimBtn.disabled) {
      claimBtn.addEventListener("click", () => {
        if (challengeDoneToday()) return;
        award("challenge:" + todayStr(), XP_RULES.challenge);
        // re-render the whole pet card so the speech/mood reacts
        renderPetInto(host);
      });
    }

    // mount 3D pet (falls back to flat SVG if WebGL/three.js unavailable)
    const pet3d = host.querySelector("#pet3d");
    if (pet3d && window.THREE && hasWebGL()) {
      pet3d.classList.add("pet-3d");
      // ensure layout has a size before initing the renderer
      requestAnimationFrame(() => {
        try {
          _petScene = initPetScene(pet3d, mood);
          if (!_petScene) throw new Error("scene init failed");
        } catch (e) {
          pet3d.classList.remove("pet-3d");
          pet3d.innerHTML = petSvg(mood);
        }
      });
    } else if (pet3d) {
      pet3d.classList.remove("pet-3d");
      pet3d.innerHTML = petSvg(mood);
    }
  }

  let _webglCache = null;
  function hasWebGL() {
    if (_webglCache !== null) return _webglCache;
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl");
      _webglCache = !!(gl && typeof gl.getParameter === "function");
    } catch (e) { _webglCache = false; }
    return _webglCache;
  }
  function renderProgressInto(card) {
    const lvl = level(), inLvl = xpInLevel();
    card.innerHTML = `
      <div class="pc-top">
        <span class="pc-level">Lv ${lvl}</span>
        <span class="pc-xp">${PROGRESS.xp} XP</span>
        <span class="pc-streak" title="day streak">🔥 ${PROGRESS.streakDays}d</span>
      </div>
      <div class="xp-bar"><i style="width:${inLvl}%"></i></div>
      <div class="pc-bottom">
        <span>${inLvl}/100 to Lv ${lvl + 1}</span>
        <button class="pc-ach" type="button">🏆 ${PROGRESS.achievements.length}/${ACHIEVEMENTS.length}</button>
      </div>`;
    const ach = card.querySelector(".pc-ach");
    if (ach) ach.addEventListener("click", () => go("achievements"));
  }

  let _toastTimer = null;
  function showAchievementToast(def) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = el("div", "toast");
      toast.id = "toast";
      document.body.append(toast);
    }
    toast.innerHTML = `<span class="t-emoji">${def.emoji}</span>
      <span class="t-txt"><b>Achievement unlocked!</b><span>${esc(def.name)}</span></span>`;
    burstConfetti(toast);
    // double rAF to ensure transition triggers
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("show")));
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }
  function burstConfetti(anchor) {
    const colors = ["#22d3ee", "#8b5cf6", "#ec4899", "#ff8a2b", "#34f5c5"];
    const burst = el("div", "confetti");
    for (let i = 0; i < 16; i++) {
      const p = document.createElement("i");
      p.style.background = colors[i % colors.length];
      const a = Math.random() * 360;
      const r = 60 + Math.random() * 35;
      p.style.setProperty("--dx", Math.cos(a * Math.PI / 180) * r + "px");
      p.style.setProperty("--dy", Math.sin(a * Math.PI / 180) * r + "px");
      p.style.animationDelay = (Math.random() * 0.12) + "s";
      burst.append(p);
    }
    anchor.append(burst);
    setTimeout(() => burst.remove(), 1500);
  }

  /* ============================================================
     PHASE 1 — Share, install banner, tip-of-the-day, streak FX
     ============================================================ */
  let _streakUp = 0;

  async function shareApp() {
    const personal = PROGRESS.xp > 0;
    const shareData = personal ? {
      title: `I'm ${petName()} on Printora`,
      text: `Lv ${level()} · ${PROGRESS.xp} XP · ${PROGRESS.streakDays}-day streak 🔥 — 3D printing companion app`,
      url: location.origin + location.pathname.replace(/\/[^/]*$/, "/")
    } : {
      title: "Printora",
      text: "Printora — your one-stop 3D printing app: setups, guides, models & shop.",
      url: location.origin + location.pathname.replace(/\/[^/]*$/, "/")
    };
    if (navigator.share) {
      try { await navigator.share(shareData); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareData.text + " " + shareData.url);
        showAchievementToast({ emoji: "🔗", name: "Copied to clipboard!" });
        return;
      } catch (e) {}
    }
    showAchievementToast({ emoji: "🔗", name: shareData.url });
  }

  function showWelcomeModal() {
    if (document.querySelector(".welcome-modal")) return;
    const slides = [
      { emoji: "🤖", title: "Meet your Printling", body: "This little Game Boy printer lives on your home screen and grows with every print you complete. Hit Level 20 to unlock godmode." },
      { emoji: "⚡", title: "Earn XP everywhere", body: "Opening setups, reading guides, fixing problems, daily visits — it all counts. Daily streaks unlock the rarest badges." },
      { emoji: "🚀", title: "Start with the basics", body: "If you're new, the Beginner Hub walks you through your first print. Already printing? Jump into Materials, the Calculator, or the Shop." }
    ];
    let idx = 0;
    const root = document.createElement("div");
    root.className = "welcome-modal";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Welcome to Printora");
    root.innerHTML = `<div class="welcome-card">
      <div class="welcome-body"></div>
      <div class="welcome-dots"></div>
      <div class="welcome-actions">
        <button type="button" class="welcome-skip">Skip</button>
        <button type="button" class="welcome-next">Next →</button>
      </div>
    </div>`;
    const bodyEl = root.querySelector(".welcome-body");
    const dotsEl = root.querySelector(".welcome-dots");
    const nextBtn = root.querySelector(".welcome-next");
    const skipBtn = root.querySelector(".welcome-skip");
    function render() {
      const s = slides[idx];
      bodyEl.innerHTML = `<div class="welcome-emoji">${s.emoji}</div>
        <h2 class="welcome-title">${esc(s.title)}</h2>
        <p class="welcome-text">${esc(s.body)}</p>`;
      dotsEl.innerHTML = slides.map((_, i) =>
        `<span class="welcome-dot${i === idx ? " active" : ""}"></span>`
      ).join("");
      nextBtn.textContent = (idx === slides.length - 1) ? "Let's go! 🎉" : "Next →";
    }
    function dismiss() {
      root.classList.add("closing");
      setTimeout(() => root.remove(), 220);
      PROGRESS.firstVisitSeen = true;
      saveProgress();
      // celebratory confetti on dismiss
      confettiBurst();
    }
    nextBtn.addEventListener("click", () => {
      if (idx < slides.length - 1) { idx++; render(); }
      else dismiss();
    });
    skipBtn.addEventListener("click", dismiss);
    root.addEventListener("click", (e) => { if (e.target === root) dismiss(); });
    render();
    document.body.appendChild(root);
  }

  /* ----- confetti burst (used by welcome modal and achievement unlocks) ----- */
  function confettiBurst() {
    const layer = document.createElement("div");
    layer.className = "confetti-layer";
    const colors = ["#ff5a3a", "#ffd24a", "#7bd0c0", "#c080ff", "#e89bb0", "#9bd0f0"];
    const N = 24;
    for (let i = 0; i < N; i++) {
      const p = document.createElement("span");
      p.className = "confetti-piece";
      p.style.background = colors[i % colors.length];
      p.style.left = (Math.random() * 100) + "%";
      p.style.animationDelay = (Math.random() * 120) + "ms";
      p.style.animationDuration = (900 + Math.random() * 700) + "ms";
      p.style.setProperty("--drift", ((Math.random() - 0.5) * 240).toFixed(0) + "px");
      p.style.setProperty("--spin",  Math.floor(Math.random() * 720 + 360) + "deg");
      layer.appendChild(p);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 1500);
  }

  let _deferredInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferredInstallPrompt = e;
    // re-render banner if it was already shown with the manual instructions
    const existing = document.querySelector(".install-banner");
    if (existing) {
      existing.remove();
      maybeShowInstallBanner();
    }
  });

  function maybeShowInstallBanner() {
    try { if (localStorage.getItem("printora-install-dismissed")) return; }
    catch (e) { return; }
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.navigator.standalone) return;
    const ua = navigator.userAgent || "";
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const canPrompt = !!_deferredInstallPrompt;
    if (!isIOS && !isAndroid && !canPrompt) return;

    const banner = el("div", "install-banner");
    if (canPrompt) {
      banner.innerHTML = `
        <span class="ib-ico">📲</span>
        <span class="ib-txt"><b>Install Printora</b><small>One tap to add to your home screen</small></span>
        <button class="ib-cta" type="button">Install</button>
        <button class="ib-x" type="button" aria-label="Dismiss">×</button>`;
      banner.querySelector(".ib-cta").addEventListener("click", async () => {
        const p = _deferredInstallPrompt;
        if (!p) return;
        _deferredInstallPrompt = null;
        try { p.prompt(); await p.userChoice; } catch (e) {}
        banner.classList.remove("show");
        setTimeout(() => banner.remove(), 400);
      });
    } else {
      const how = isIOS
        ? "Tap <b>Share</b> below → <b>Add to Home Screen</b>"
        : "Open the <b>⋮ menu</b> → <b>Install app</b>";
      banner.innerHTML = `
        <span class="ib-ico">📲</span>
        <span class="ib-txt"><b>Install Printora</b><small>${how}</small></span>
        <button class="ib-x" type="button" aria-label="Dismiss">×</button>`;
    }
    banner.querySelector(".ib-x").addEventListener("click", () => {
      banner.classList.remove("show");
      try { localStorage.setItem("printora-install-dismissed", "1"); } catch (e) {}
      setTimeout(() => banner.remove(), 400);
    });
    document.body.append(banner);
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add("show")));
  }

  function tipOfTheDay() {
    if (!DB.tips || !DB.tips.length) return "";
    const day = Math.floor(Date.parse(todayStr()) / 86400000);
    return DB.tips[((day % DB.tips.length) + DB.tips.length) % DB.tips.length];
  }

  // expose for boot-time wire-up
  const Game = { PROGRESS, updateStreak, level, xpInLevel, refreshLevelPill,
                 trackRouteVisit, trackClick, ACHIEVEMENTS, checkAchievements,
                 renderProgressInto, shareApp, maybeShowInstallBanner, tipOfTheDay };

  /* ---------- ROUTES ---------- */
  const routes = {};

  routes.home = function () {
    view.innerHTML = "";

    // tamagotchi pet screen
    const pet = el("div", "pet-screen");
    pet.id = "petScreen";
    renderPetInto(pet);
    view.append(pet);

    // progress card
    const pCard = el("div", "progress-card");
    pCard.id = "progressCard";
    renderProgressInto(pCard);
    view.append(pCard);

    // tip of the day — with a one-shot daily XP claim
    const tip = tipOfTheDay();
    if (tip) {
      const tipCard = el("div", "tip-card");
      const claimed = tipClaimedToday();
      tipCard.innerHTML = `
        <span class="tip-label">💡 Tip of the Day</span>
        <p>${esc(tip)}</p>
        <button class="tip-claim ${claimed ? "claimed" : ""}" type="button">
          ${claimed ? "✓ Claimed today" : `Got it · +${XP_RULES.tipGotIt} XP`}
        </button>`;
      view.append(tipCard);
      const btn = tipCard.querySelector(".tip-claim");
      btn.addEventListener("click", () => {
        if (tipClaimedToday()) return;
        award("tip:" + todayStr(), XP_RULES.tipGotIt);
        btn.textContent = "✓ Claimed today";
        btn.classList.add("claimed");
      });
    }

    // search
    const search = el("div", "search");
    search.innerHTML = `<span class="s-ico" aria-hidden="true">🔎</span>
      <input id="q" type="search" placeholder="Search materials, guides, fixes, terms…" autocomplete="off" />`;
    view.append(search);
    const results = el("div", "search-results");
    view.append(results);
    $("#q", search).addEventListener("input", (e) => runSearch(e.target.value.trim(), results));

    // quick reference chips
    view.append(el("h2", "h2", "Quick reference"));
    const chips = el("div", "chips");
    DB.quickRef.forEach((c) => chips.append(el("span", "chip", `<b>${esc(c.k)}</b> ${esc(c.v)}`)));
    view.append(chips);

    // navigation cards
    view.append(el("h2", "h2", "Explore"));
    const grid = el("div", "grid");
    const cards = [
      { t: "Achievements", d: "Your level, XP, streak & unlocked badges", i: "🏆", go: "achievements" },
      { t: "Beginner Hub", d: "Brand new? Start here — 8-step path", i: "🚀", go: "beginners" },
      { t: "Filament Setups", d: "Temps & slicer settings per material", i: "🎛️", go: "setups" },
      { t: "Printer ↔ Filament", d: "Which printer can print what", i: "🧬", go: "compat" },
      { t: "Find Models", d: "Where to download printables + ideas", i: "📦", go: "models" },
      { t: "Tools & AI Apps", d: "Meshy, CAD, slicers, mesh repair", i: "🪄", go: "tools" },
      { t: "How-To Guides", d: "Printing, finishing & joining parts", i: "📖", go: "guides" },
      { t: "Troubleshooting", d: "Diagnose & fix print problems", i: "🩹", go: "fix" },
      { t: "Shop Essentials", d: "Filament, nozzles, tools & more", i: "🛒", go: "shop" },
      { t: "Material Compare", d: "Strength, heat, flex side by side", i: "📊", go: "compare" },
      { t: "Cost Calculator", d: "Estimate filament cost per print", i: "🧮", go: "calc" },
      { t: "Glossary", d: "Every 3D-printing term explained", i: "📚", go: "glossary" }
    ];
    cards.forEach((c) => {
      const card = el("button", "nav-card");
      card.type = "button";
      card.innerHTML = `<span class="nc-ico">${c.i}</span><span class="nc-txt"><b>${esc(c.t)}</b><small>${esc(c.d)}</small></span><span class="nc-go">›</span>`;
      card.addEventListener("click", () => go(c.go));
      grid.append(card);
    });
    view.append(grid);

    view.append(el("p", "foot-note",
      "Settings are tested starting points — always fine-tune for your printer, filament brand & room. Installable & works offline."));
  };

  routes.setups = function () {
    view.innerHTML = section("Filament Setups", "Tap a material for full slicer settings & tips");
    const items = DB.materials.map((m) => ({
      kind: "setup", id: m.id,
      head: `<span class="acc-emoji">${m.emoji}</span>
             <span class="acc-title"><b>${esc(m.name)}</b><small>${esc(m.tagline)}</small></span>
             <span class="pill pill-${diffClass(m.difficulty)}">${esc(m.difficulty)}</span>`,
      body: materialBody(m)
    }));
    const node = view; node.append(accordion(items));
  };

  function diffClass(d) {
    return { Beginner: "ok", Intermediate: "mid", Advanced: "hard", Expert: "hard" }[d] || "mid";
  }

  function materialBody(m) {
    const row = (k, v) => `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`;
    const list = (arr) => "<ul>" + arr.map((x) => `<li>${esc(x)}</li>`).join("") + "</ul>";
    return `
      <div class="settings-grid">
        ${row("Nozzle", m.nozzle)}
        ${row("Bed", m.bed)}
        ${row("Part fan", m.fan)}
        ${row("Print speed", m.speed)}
        ${row("Retraction", m.retraction)}
        ${row("Flow", m.flow)}
      </div>
      <div class="note"><b>First layer:</b> ${esc(m.firstLayer)}</div>
      <div class="note"><b>Enclosure:</b> ${esc(m.enclosure)}</div>
      <div class="props">
        <div><span>Strength</span>${bars(m.strength)}</div>
        <div><span>Flexibility</span>${bars(m.flexibility)}</div>
        <div><span>Heat resist</span>${bars(m.heatResist)}</div>
        <div><span>Ease of use</span>${bars(m.ease)}</div>
      </div>
      <h4>✅ Great for</h4>${list(m.uses)}
      <h4>⚠️ Avoid</h4>${list(m.avoid)}
      <h4>💡 Tips</h4>${list(m.tips)}
      <div class="note store"><b>🌡️ Storage:</b> ${esc(m.storage)}</div>
    `;
  }

  routes.compare = function () {
    view.innerHTML = section("Material Comparison", "At-a-glance — higher bars are better");
    const tbl = el("div", "compare");
    const head = el("div", "cmp-row cmp-head");
    head.innerHTML = `<span>Material</span><span>Strong</span><span>Flex</span><span>Heat</span><span>Easy</span>`;
    tbl.append(head);
    DB.materials.forEach((m) => {
      const r = el("button", "cmp-row");
      r.type = "button";
      r.innerHTML = `<span class="cmp-name">${m.emoji} ${esc(m.name)}</span>
        <span>${bars(m.strength)}</span><span>${bars(m.flexibility)}</span>
        <span>${bars(m.heatResist)}</span><span>${bars(m.ease)}</span>`;
      r.addEventListener("click", () => go("setups", m.id));
      tbl.append(r);
    });
    view.append(tbl);
    view.append(el("p", "foot-note", "Tap a row to jump to its full setup."));
  };

  routes.models = function () {
    view.innerHTML = section("Find Models", "Where to download printables + project ideas");
    view.append(el("h2", "h2", "📥 Model libraries"));
    const sites = el("div", "grid");
    DB.modelSites.forEach((s) => {
      const a = el("a", "nav-card");
      a.href = s.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.innerHTML = `<span class="nc-ico">🔗</span><span class="nc-txt"><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></span><span class="nc-go">↗</span>`;
      a.addEventListener("click", () => trackClick("tool", s.name));
      sites.append(a);
    });
    view.append(sites);

    view.append(el("h2", "h2", "💡 What to print"));
    const items = DB.modelCategories.map((c) => ({
      kind: "models", id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      head: `<span class="acc-emoji">${c.emoji}</span><span class="acc-title"><b>${esc(c.name)}</b></span>`,
      body: "<ul>" + c.ideas.map((i) => `<li>${esc(i)}</li>`).join("") + "</ul>"
    }));
    view.append(accordion(items));
    view.append(el("p", "foot-note", "Links open the official model sites in your browser. New to it all? Start with a calibration cube or a Benchy."));
  };

  routes.guides = function () {
    view.innerHTML = section("How-To Guides", "Printing, finishing & connecting pieces");
    DB.guideCategories.forEach((cat) => {
      const guides = DB.guides.filter((g) => g.cat === cat.id);
      if (!guides.length) return;
      view.append(el("h2", "h2", `${cat.emoji} ${cat.name}`));
      const items = guides.map((g) => ({
        kind: "guide", id: g.id,
        head: `<span class="acc-emoji">${g.emoji}</span><span class="acc-title"><b>${esc(g.title)}</b><small>${esc(g.summary)}</small></span>`,
        body: guideBody(g)
      }));
      view.append(accordion(items));
    });
    wireShopChips(view);
  };

  function shopChips(items) {
    if (!items || !items.length) return "";
    const chips = items.map((s) =>
      `<a class="shop-chip" href="${esc(amazonLink(s.query))}" target="_blank" rel="noopener noreferrer" data-shop-label="${esc(s.label)}">🛒 ${esc(s.label)}</a>`
    ).join("");
    return `<h4>🛒 You'll need</h4><div class="shop-chips">${chips}</div>`;
  }
  function wireShopChips(host) {
    host.querySelectorAll(".shop-chip").forEach((a) => {
      a.addEventListener("click", () => trackClick("shop", a.dataset.shopLabel || "chip"));
    });
  }

  function guideBody(g) {
    let out = '<ol class="steps">';
    g.steps.forEach((s) => { out += `<li><b>${esc(s.h)}</b><span>${esc(s.b)}</span></li>`; });
    out += "</ol>";
    if (g.tips && g.tips.length) {
      out += '<div class="note"><b>💡 Pro tips</b><ul>' +
        g.tips.map((t) => `<li>${esc(t)}</li>`).join("") + "</ul></div>";
    }
    out += shopChips(g.shopLinks);
    return out;
  }

  routes.fix = function () {
    view.innerHTML = section("Troubleshooting", "Pick the symptom you're seeing");
    const items = DB.troubleshooting.map((t) => ({
      kind: "fix", id: t.id,
      head: `<span class="acc-emoji">${t.emoji}</span><span class="acc-title"><b>${esc(t.symptom)}</b></span>`,
      body: `<h4>Likely causes</h4><ul>${t.causes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
             <h4>✅ Fixes (try in order)</h4><ol class="fixes">${t.fixes.map((f) => `<li>${esc(f)}</li>`).join("")}</ol>
             ${shopChips(t.shopLinks)}`
    }));
    view.append(accordion(items));
    wireShopChips(view);
  };

  routes.glossary = function () {
    view.innerHTML = section("Glossary", "Every term, in plain English");
    // sort alphabetically (digits first → 0-9, then A-Z; falls under "#")
    const sorted = DB.glossary.slice().sort((a, b) =>
      a.term.toLowerCase().localeCompare(b.term.toLowerCase())
    );
    // alphabet jump-bar
    const letters = Array.from(new Set(sorted.map((g) =>
      /^[a-z]/i.test(g.term) ? g.term[0].toUpperCase() : "#"
    )));
    const jump = el("div", "gloss-jump");
    letters.forEach((L) => {
      const a = el("a", "gloss-jump-a", L);
      a.href = `#glossary/${L}`;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById("gloss-letter-" + L);
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      jump.append(a);
    });
    view.append(jump);
    const wrap = el("div", "glossary");
    let lastLetter = null;
    sorted.forEach((g) => {
      const L = /^[a-z]/i.test(g.term) ? g.term[0].toUpperCase() : "#";
      if (L !== lastLetter) {
        const hdr = el("div", "gloss-letter", esc(L));
        hdr.id = "gloss-letter-" + L;
        wrap.append(hdr);
        lastLetter = L;
      }
      wrap.append(el("div", "gloss", `<b>${esc(g.term)}</b><span>${esc(g.def)}</span>`));
    });
    view.append(wrap);
  };

  routes.calc = function () {
    view.innerHTML = section("Calculators", "Material cost and volumetric flow rate");
    const tabs = el("div", "calc-tabs");
    tabs.innerHTML = `
      <button type="button" class="calc-tab active" data-tab="cost">💰 Cost</button>
      <button type="button" class="calc-tab" data-tab="flow">⚡ Flow rate</button>`;
    view.append(tabs);

    const costForm = el("div", "calc");
    costForm.dataset.tab = "cost";
    costForm.innerHTML = `
      <label>Filament used (grams)
        <input id="c-g" type="number" inputmode="decimal" min="0" step="0.1" placeholder="e.g. 42" />
      </label>
      <label>Spool price (your currency)
        <input id="c-price" type="number" inputmode="decimal" min="0" step="0.01" placeholder="e.g. 22.00" />
      </label>
      <label>Spool weight (grams)
        <input id="c-spool" type="number" inputmode="decimal" min="1" step="1" value="1000" />
      </label>
      <div class="calc-out" id="c-out">Enter values to see the cost.</div>
      <p class="foot-note">Most slicers report grams used after slicing. Add electricity/wear separately if you sell prints.</p>`;
    view.append(costForm);

    const flowForm = el("div", "calc");
    flowForm.dataset.tab = "flow";
    flowForm.style.display = "none";
    flowForm.innerHTML = `
      <label>Layer height (mm)
        <input id="f-lh" type="number" inputmode="decimal" min="0.04" max="1" step="0.01" value="0.2" />
      </label>
      <label>Line width (mm)
        <input id="f-lw" type="number" inputmode="decimal" min="0.2" max="2" step="0.01" value="0.4" />
      </label>
      <label>Print speed (mm/s)
        <input id="f-sp" type="number" inputmode="decimal" min="10" max="800" step="1" value="120" />
      </label>
      <div class="calc-out" id="f-out">Enter values to see the flow rate.</div>
      <p class="foot-note">Flow = layer × width × speed. Stock hotends max around 12 mm³/s on PLA. High-flow hotends (CHT, Volcano, Bambu) push 20–30+.</p>`;
    view.append(flowForm);

    tabs.querySelectorAll(".calc-tab").forEach((b) => {
      b.addEventListener("click", () => {
        tabs.querySelectorAll(".calc-tab").forEach((x) => x.classList.toggle("active", x === b));
        const which = b.dataset.tab;
        costForm.style.display = which === "cost" ? "" : "none";
        flowForm.style.display = which === "flow" ? "" : "none";
      });
    });

    const recalcCost = () => {
      const g = parseFloat($("#c-g").value);
      const price = parseFloat($("#c-price").value);
      const spool = parseFloat($("#c-spool").value) || 1000;
      const out = $("#c-out");
      if (!(g >= 0) || !(price >= 0)) { out.textContent = "Enter values to see the cost."; return; }
      const cost = (price / spool) * g;
      const perKg = price / spool * 1000;
      award("calc:used", XP_RULES.calc);
      out.innerHTML = `<span class="big">${fmtMoney(cost)}</span>
        <small>${g} g × ${fmtMoney(perKg)}/kg</small>`;
    };
    ["c-g", "c-price", "c-spool"].forEach((id) => $("#" + id).addEventListener("input", recalcCost));

    const recalcFlow = () => {
      const lh = parseFloat($("#f-lh").value);
      const lw = parseFloat($("#f-lw").value);
      const sp = parseFloat($("#f-sp").value);
      const out = $("#f-out");
      if (!(lh > 0) || !(lw > 0) || !(sp > 0)) { out.textContent = "Enter values to see the flow rate."; return; }
      const flow = lh * lw * sp;
      let verdict, color, advice = "";
      if (flow <= 12) { verdict = "Safe for any hotend"; color = "ok"; }
      else if (flow <= 20) { verdict = "Needs a high-flow hotend"; color = "mid"; advice = "Look for CHT, Volcano, or Bambu-spec hotends."; }
      else { verdict = "Will under-extrude on stock hardware"; color = "hard"; advice = "Slow down, use a larger nozzle, or upgrade to a high-flow hotend."; }
      award("calc:used", XP_RULES.calc);
      out.innerHTML = `<span class="big">${flow.toFixed(2)} mm³/s</span>
        <small class="flow-verdict v-${color}">${esc(verdict)}</small>
        ${advice ? `<p class="flow-advice">${esc(advice)}</p>` : ""}
        ${color === "hard" ? `<a href="#shop" class="step-link">Browse high-flow nozzles →</a>` : ""}`;
    };
    ["f-lh", "f-lw", "f-sp"].forEach((id) => $("#" + id).addEventListener("input", recalcFlow));
    recalcFlow();
  };

  function fmtMoney(n) {
    return (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function amazonLink(query) {
    const region = (DB.shop && DB.shop.region) || "com";
    const tag = (DB.shop && DB.shop.affiliateTag) ? "&tag=" + encodeURIComponent(DB.shop.affiliateTag) : "";
    return `https://www.amazon.${region}/s?k=${encodeURIComponent(query)}${tag}`;
  }

  /* ---------- BEGINNER HUB ---------- */
  routes.beginners = function () {
    view.innerHTML = section("Beginner Hub", "Brand new to 3D printing? Follow these 8 steps.");
    const wrap = el("ol", "steps beginner");
    DB.beginnerSteps.forEach((s) => {
      const li = document.createElement("li");
      let html = `<b>${esc(s.title)}</b><span>${esc(s.summary)}</span>
        <ul>${s.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`;
      if (s.link) {
        html += `<a class="step-link" href="#${esc(s.link.route)}">${esc(s.link.label)} →</a>`;
      }
      li.innerHTML = html;
      wrap.append(li);
    });
    view.append(wrap);
    view.append(el("p", "foot-note", "Once you've worked through these, the rest of Printora is your reference for life."));
  };

  /* ---------- TOOLS ---------- */
  routes.tools = function () {
    view.innerHTML = section("Tools & AI Apps", "Software for designing, slicing, fixing & generating models");
    DB.toolCategories.forEach((cat) => {
      view.append(el("h2", "h2", `${cat.emoji} ${cat.name}`));
      if (cat.intro) view.append(el("p", "section-intro", cat.intro));
      const grid = el("div", "grid");
      cat.items.forEach((it) => {
        const node = it.url
          ? Object.assign(document.createElement("a"), { href: it.url, target: "_blank", rel: "noopener noreferrer" })
          : document.createElement("div");
        node.className = "nav-card";
        node.innerHTML = `<span class="nc-ico">${cat.emoji}</span>
          <span class="nc-txt"><b>${esc(it.name)}</b><small>${esc(it.desc)}</small></span>
          <span class="nc-go">${it.url ? "↗" : ""}</span>`;
        if (it.url) node.addEventListener("click", () => trackClick("tool", it.name));
        grid.append(node);
      });
      view.append(grid);
    });
    view.append(el("p", "foot-note", "External links open in a new tab. Always verify a slicer profile matches your printer before slicing."));
  };

  /* ---------- PRINTER ↔ FILAMENT COMPATIBILITY ---------- */
  routes.compat = function () {
    view.innerHTML = section("Printer ↔ Filament Compatibility", "Which printer class can print what");
    const legend = el("div", "compat-legend");
    Object.values(DB.compat.legend).forEach((v) => legend.append(el("span", "compat-legend-item", esc(v))));
    view.append(legend);

    const items = DB.compat.classes.map((cls) => {
      const grid = `<div class="compat-grid">` +
        DB.compat.filaments.map((f) => {
          const code = cls.caps[f] || "no";
          const sym = { yes: "✅", maybe: "⚠️", no: "❌" }[code];
          return `<div class="compat-cell c-${code}"><b>${esc(f)}</b><span>${sym}</span></div>`;
        }).join("") + "</div>";
      const notes = `<h4>Notes</h4><ul>${cls.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`;
      const detail = `<div class="note"><b>Hardware:</b> ${esc(cls.detail)}</div>
                      <div class="note"><b>Examples:</b> ${esc(cls.examples)}</div>`;
      return {
        kind: "compat", id: cls.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        head: `<span class="acc-emoji">🖨️</span><span class="acc-title"><b>${esc(cls.name)}</b><small>${esc(cls.detail)}</small></span>`,
        body: detail + grid + notes
      };
    });
    view.append(accordion(items));
    view.append(el("p", "foot-note", "Examples are popular printers in each class, not endorsements. Always check the spec sheet of the exact model."));
  };

  /* ---------- SHOP ---------- */
  routes.shop = function () {
    view.innerHTML = section("Shop Essentials", "Tap any item to search live on Amazon");
    view.append(el("div", "note", `<b>Heads up:</b> ${esc(DB.shop.note)}`));
    DB.shop.categories.forEach((cat) => {
      view.append(el("h2", "h2", `${cat.emoji} ${cat.name}`));
      if (cat.intro) view.append(el("p", "section-intro", esc(cat.intro)));
      const list = el("div", "grid");
      cat.items.forEach((it) => {
        const a = document.createElement("a");
        a.href = amazonLink(it.query);
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "nav-card";
        a.innerHTML = `<span class="nc-ico">${cat.emoji}</span>
          <span class="nc-txt"><b>${esc(it.name)}</b><small>amazon.${esc(DB.shop.region)} · "${esc(it.query)}"</small></span>
          <span class="nc-go">↗</span>`;
        a.addEventListener("click", () => trackClick("shop", it.name));
        list.append(a);
      });
      view.append(list);
    });
    view.append(el("p", "foot-note", "Tap any item to open Amazon search results — current pricing, current reviews, always up to date."));
  };

  /* ---------- ACHIEVEMENTS ---------- */
  routes.achievements = function () {
    const unlocked = PROGRESS.achievements.length;
    view.innerHTML = section("Achievements", `${unlocked} of ${ACHIEVEMENTS.length} unlocked · Lv ${level()} · ${PROGRESS.xp} XP`);
    const stats = el("div", "ach-stats");
    stats.innerHTML = `
      <div class="ach-stat"><b>${level()}</b><span>Level</span></div>
      <div class="ach-stat"><b>${PROGRESS.xp}</b><span>Total XP</span></div>
      <div class="ach-stat"><b>${PROGRESS.streakDays}</b><span>Streak</span></div>
      <div class="ach-stat"><b>${PROGRESS.bestStreak || PROGRESS.streakDays}</b><span>Best Streak</span></div>
      <div class="ach-stat"><b>${unlocked}/${ACHIEVEMENTS.length}</b><span>Badges</span></div>`;
    view.append(stats);

    const tools = el("div", "ach-tools");
    tools.innerHTML = `
      <button class="ach-tool-btn" type="button" data-act="share">📣 Share my progress</button>
      <button class="ach-tool-btn" type="button" data-act="export">⬇ Export backup</button>
      <button class="ach-tool-btn" type="button" data-act="import">⬆ Import backup</button>
      <input type="file" id="ach-file" accept="application/json,.json" hidden />`;
    view.append(tools);
    tools.querySelector('[data-act="share"]').addEventListener("click", shareApp);
    tools.querySelector('[data-act="export"]').addEventListener("click", exportProgress);
    tools.querySelector('[data-act="import"]').addEventListener("click", () => {
      tools.querySelector("#ach-file").click();
    });
    tools.querySelector("#ach-file").addEventListener("change", (e) => {
      importProgress(e.target.files && e.target.files[0]);
      e.target.value = "";
    });

    const grid = el("div", "ach-grid");
    ACHIEVEMENTS.forEach((a) => {
      const got = PROGRESS.achievements.indexOf(a.id) !== -1;
      const card = el("div", "ach-card" + (got ? "" : " locked"));
      card.innerHTML = `<span class="ach-emoji">${got ? a.emoji : "🔒"}</span>
        <span class="ach-text"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></span>`;
      grid.append(card);
    });
    view.append(grid);
  };

  /* ---------- SEARCH ---------- */
  let INDEX = null;
  function buildIndex() {
    if (INDEX) return INDEX;
    INDEX = [];
    DB.materials.forEach((m) => INDEX.push({
      type: "Setup", icon: m.emoji, title: m.name,
      sub: `${m.tagline} · ${m.nozzle} / ${m.bed}`,
      text: [m.name, m.tagline, m.uses.join(" "), m.tips.join(" ")].join(" ").toLowerCase(),
      go: "setups", openId: m.id
    }));
    DB.guides.forEach((g) => INDEX.push({
      type: "Guide", icon: g.emoji, title: g.title, sub: g.summary,
      text: [g.title, g.summary, g.steps.map((s) => s.h + " " + s.b).join(" "), (g.tips || []).join(" ")].join(" ").toLowerCase(),
      go: "guides", openId: g.id
    }));
    DB.troubleshooting.forEach((t) => INDEX.push({
      type: "Fix", icon: t.emoji, title: t.symptom, sub: t.fixes[0],
      text: [t.symptom, t.causes.join(" "), t.fixes.join(" ")].join(" ").toLowerCase(),
      go: "fix", openId: t.id
    }));
    DB.glossary.forEach((g) => INDEX.push({
      type: "Term", icon: "📚", title: g.term, sub: g.def,
      text: (g.term + " " + g.def).toLowerCase(),
      go: "glossary"
    }));
    DB.modelCategories.forEach((c) => INDEX.push({
      type: "Models", icon: c.emoji, title: c.name, sub: c.ideas.slice(0, 3).join(", "),
      text: (c.name + " " + c.ideas.join(" ")).toLowerCase(),
      go: "models"
    }));
    (DB.beginnerSteps || []).forEach((s) => INDEX.push({
      type: "Beginner", icon: "🚀", title: s.title, sub: s.summary,
      text: [s.title, s.summary, s.points.join(" ")].join(" ").toLowerCase(),
      go: "beginners"
    }));
    (DB.toolCategories || []).forEach((cat) => cat.items.forEach((it) => INDEX.push({
      type: "Tool", icon: cat.emoji, title: it.name, sub: it.desc,
      text: [it.name, it.desc, cat.name].join(" ").toLowerCase(),
      go: "tools"
    })));
    (DB.compat ? DB.compat.classes : []).forEach((cls) => INDEX.push({
      type: "Compat", icon: "🖨️", title: cls.name, sub: cls.examples,
      text: [cls.name, cls.detail, cls.examples, cls.notes.join(" ")].join(" ").toLowerCase(),
      go: "compat"
    }));
    (DB.shop ? DB.shop.categories : []).forEach((cat) => cat.items.forEach((it) => INDEX.push({
      type: "Shop", icon: cat.emoji, title: it.name, sub: `Shop on Amazon · ${cat.name}`,
      text: [it.name, it.query, cat.name].join(" ").toLowerCase(),
      go: "shop"
    })));
    [
      { type: "Tool", icon: "💰", title: "Cost calculator", sub: "Estimate filament cost per print",
        text: "cost calculator filament price spool grams material expense", go: "calc" },
      { type: "Tool", icon: "⚡", title: "Volumetric flow rate calculator", sub: "Layer × width × speed → mm³/s",
        text: "volumetric flow rate mm3 s hotend high flow extrusion limit speed under-extrusion", go: "calc" }
    ].forEach((e) => INDEX.push(e));
    return INDEX;
  }

  function runSearch(q, container) {
    container.innerHTML = "";
    if (!q || q.length < 2) return;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = buildIndex().filter((it) => terms.every((t) => it.text.includes(t))).slice(0, 12);
    if (!hits.length) {
      container.append(el("div", "no-res", `No matches for “${esc(q)}”.`));
      return;
    }
    hits.forEach((h) => {
      const r = el("button", "res");
      r.type = "button";
      r.innerHTML = `<span class="res-ico">${h.icon}</span>
        <span class="res-txt"><b>${esc(h.title)}</b><small>${esc(h.sub)}</small></span>
        <span class="res-tag">${esc(h.type)}</span>`;
      r.addEventListener("click", () => go(h.go, h.openId));
      container.append(r);
    });
  }

  /* ---------- ROUTER ---------- */
  function go(route, openId) {
    if (!routes[route]) route = "home";
    window.scrollTo(0, 0);
    routes[route]();
    trackRouteVisit(route);
    // highlight active tab (map sub-routes back to their tab)
    const tabFor = { compare: "setups", calc: "home", glossary: "home", beginners: "home",
                     tools: "home", compat: "home", shop: "home", achievements: "home" };
    const active = tabFor[route] || route;
    document.querySelectorAll(".tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.route === active));
    location.hash = openId ? `${route}/${openId}` : route;
    // open & scroll to a specific accordion item (e.g. clicking a compare row)
    if (openId) {
      requestAnimationFrame(() => {
        const target = document.querySelector(`.acc-item[data-id="${openId}"]`);
        if (target) {
          const btn = target.querySelector(".acc-head");
          if (btn && !target.classList.contains("open")) btn.click();
          if (target.scrollIntoView) {
            try { target.scrollIntoView({ behavior: "smooth", block: "center" }); }
            catch (e) {}
          }
        }
      });
    }
  }
  window.Printora = { go, PROGRESS, ACHIEVEMENTS, DB, checkAchievements };

  function buildTabBar() {
    const bar = $("#tabbar");
    TABS.forEach((t) => {
      const b = el("button", "tab");
      b.type = "button";
      b.dataset.route = t.id;
      b.innerHTML = `<span class="tab-ico">${t.icon}</span><span class="tab-lbl">${t.label}</span>`;
      b.addEventListener("click", () => go(t.id));
      bar.append(b);
    });
  }

  /* ---------- BOOT ---------- */
  buildTabBar();
  updateStreak();
  awardDailyVisit();
  refreshLevelPill();
  const pillEl = document.getElementById("lvlPill");
  if (pillEl) pillEl.addEventListener("click", () => go("achievements"));
  const shareEl = document.getElementById("shareBtn");
  if (shareEl) shareEl.addEventListener("click", shareApp);
  const themeEl = document.getElementById("themeBtn");
  if (themeEl) themeEl.addEventListener("click", toggleTheme);
  refreshThemeBtn();
  {
    const [r0, id0] = (location.hash || "#home").slice(1).split("/");
    go(r0, id0);
  }
  // welcome achievement fires on first ever launch
  const isFirstLaunch = !PROGRESS.firstVisitSeen;
  checkAchievements();
  if (isFirstLaunch) {
    setTimeout(showWelcomeModal, 350);
  }
  // streak-up celebration (only when it actually increments)
  if (_streakUp >= 2) {
    setTimeout(() => showAchievementToast({
      emoji: "🔥", name: `${_streakUp}-day streak!`
    }), 700);
  }
  // mobile install banner (dismissable + persistent)
  maybeShowInstallBanner();
  window.addEventListener("hashchange", () => {
    const [r, id] = location.hash.slice(1).split("/");
    if (routes[r]) go(r, id);
  });

  // three.js is deferred — when it arrives, upgrade the SVG pet to WebGL
  window.addEventListener("DOMContentLoaded", () => {
    if (!window.THREE) return;
    const card = document.getElementById("petScreen");
    if (card) renderPetInto(card);
  });

  // register service worker for offline use + auto-update so new versions
  // never get stuck behind a stale cache
  if (navigator.serviceWorker) {
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      // reload only when replacing an existing worker (an update), not first install
      if (hadController) window.location.reload();
    });
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((reg) => {
        reg.update();
        setInterval(() => reg.update(), 30 * 60 * 1000); // re-check every 30 min
      }).catch(() => {});
    });
  }
})();

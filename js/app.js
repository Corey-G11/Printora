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
    calc:       20
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
    { id: "master",             name: "Printora Master",  emoji: "👑", desc: "Reach Level 10" }
  ];

  function defaultProgress() {
    return { xp: 0, visited: [], achievements: [], streakDays: 0, lastVisit: null, firstVisit: null };
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
    saveProgress();
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
      if (def) showAchievementToast(def);
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
    if (level() >= 5)  unlock("level-5");
    if (level() >= 10) unlock("master");
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
    if (lvl >= 10) return "master";
    if (streak >= 7) return "fire";
    if (streak >= 3) return "happy";
    if (lvl >= 5)    return "happy";
    if (PROGRESS.xp === 0) return "egg";
    return "ok";
  }
  function petName() {
    const lvl = level();
    if (lvl >= 10) return "PRINT-MASTER";
    if (lvl >= 5)  return "PRINTORA";
    if (PROGRESS.xp === 0) return "EGG";
    return "PRINTLING";
  }
  function petLines(mood) {
    const lines = {
      egg:    ["TAP A CARD!", "FEED ME XP!", "HATCH ME!"],
      ok:     ["LET'S PRINT!", "HI FRIEND!", "MORE XP?"],
      happy:  ["FEELING GOOD!", "GREAT JOB!", "KEEP IT UP!"],
      fire:   ["ON FIRE!", "UNSTOPPABLE!", "STREAK MODE!"],
      master: ["LEGEND!", "PRINT GOD!", "MAX LEVEL!"],
      sleep:  ["ZZZ...", "SHHH...", "DREAMING..."]
    };
    const arr = lines[mood] || lines.ok;
    const day = Math.floor(Date.now() / 60000); // change every minute
    return arr[day % arr.length];
  }

  /* ----- 3D pet via three.js -----
     A spool-creature built from primitive geometries.
     Mood drives body color, eye shape, and animation. */
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
    // [body, accent, eye]
    const map = {
      egg:    ["#f5e6c8", "#d9b878", "#1a2a06"],
      ok:     ["#ff8a2b", "#b9501a", "#1a2a06"],
      happy:  ["#ff5d8f", "#a3274e", "#1a2a06"],
      fire:   ["#ff3b1f", "#8a1a08", "#fff3a0"],
      master: ["#ffd24a", "#8a6010", "#1a2a06"],
      sleep:  ["#7aa3d9", "#2a4870", "#1a2a06"]
    };
    return map[mood] || map.ok;
  }

  function buildPetMesh(mood) {
    const T = window.THREE;
    const group = new T.Group();
    const [bodyHex, accentHex, eyeHex] = moodColors(mood);
    const bodyMat = new T.MeshStandardMaterial({
      color: new T.Color(bodyHex), roughness: 0.45, metalness: 0.05
    });
    const accentMat = new T.MeshStandardMaterial({
      color: new T.Color(accentHex), roughness: 0.55, metalness: 0.05
    });
    const eyeMat = new T.MeshStandardMaterial({
      color: new T.Color(eyeHex), roughness: 0.2, metalness: 0.1
    });
    const whiteMat = new T.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.3
    });

    if (mood === "egg") {
      // pure egg shape — squashed sphere
      const egg = new T.Mesh(new T.SphereGeometry(1, 32, 24), bodyMat);
      egg.scale.set(0.85, 1.15, 0.85);
      group.add(egg);
      // crack
      const crackMat = new T.MeshStandardMaterial({ color: 0x6b4a0a });
      [[-0.1, 0.2], [0.05, 0.05], [0.15, -0.1]].forEach(([x, y]) => {
        const c = new T.Mesh(new T.BoxGeometry(0.18, 0.06, 0.02), crackMat);
        c.position.set(x, y, 0.85);
        c.rotation.z = Math.random() * 0.6 - 0.3;
        group.add(c);
      });
      return group;
    }

    // SPOOL CREATURE BODY — middle cylinder with thicker top/bottom flanges
    const flangeGeom = new T.CylinderGeometry(1.0, 1.0, 0.22, 32);
    const topFlange = new T.Mesh(flangeGeom, accentMat);
    topFlange.position.y = 0.7;
    const botFlange = new T.Mesh(flangeGeom, accentMat);
    botFlange.position.y = -0.7;
    group.add(topFlange, botFlange);

    // middle "wound filament" body
    const bodyGeom = new T.CylinderGeometry(0.78, 0.78, 1.3, 32);
    const body = new T.Mesh(bodyGeom, bodyMat);
    group.add(body);

    // subtle horizontal grooves on the body to look like wound filament
    for (let i = -0.45; i <= 0.45; i += 0.18) {
      const groove = new T.Mesh(
        new T.TorusGeometry(0.79, 0.025, 8, 48),
        accentMat
      );
      groove.rotation.x = Math.PI / 2;
      groove.position.y = i;
      group.add(groove);
    }

    // EYES — two white spheres with dark pupils
    const eyeRadius = (mood === "fire" || mood === "master") ? 0.18 : 0.16;
    [-1, 1].forEach((side) => {
      if (mood === "sleep") {
        // closed eye — thin curved line
        const lid = new T.Mesh(
          new T.TorusGeometry(0.12, 0.025, 8, 16, Math.PI),
          eyeMat
        );
        lid.position.set(side * 0.28, 0.05, 0.74);
        lid.rotation.z = Math.PI;
        group.add(lid);
      } else {
        const white = new T.Mesh(new T.SphereGeometry(eyeRadius, 16, 16), whiteMat);
        white.position.set(side * 0.28, 0.1, 0.7);
        white.scale.z = 0.5;
        group.add(white);
        const pupil = new T.Mesh(new T.SphereGeometry(eyeRadius * 0.55, 12, 12), eyeMat);
        pupil.position.set(side * 0.28, 0.1, 0.78);
        pupil.scale.z = 0.3;
        group.add(pupil);
        // shine
        const shine = new T.Mesh(new T.SphereGeometry(eyeRadius * 0.25, 8, 8), whiteMat);
        shine.position.set(side * 0.28 + 0.04, 0.14, 0.82);
        shine.scale.z = 0.3;
        group.add(shine);
      }
    });

    // MOUTH
    if (mood === "happy" || mood === "fire" || mood === "master") {
      // open smile — half torus
      const smile = new T.Mesh(
        new T.TorusGeometry(0.18, 0.04, 8, 18, Math.PI),
        eyeMat
      );
      smile.position.set(0, -0.2, 0.72);
      smile.rotation.z = Math.PI;
      group.add(smile);
      // tongue/inside for "wow" mood
      if (mood === "fire") {
        const tongue = new T.Mesh(
          new T.SphereGeometry(0.08, 12, 12),
          new T.MeshStandardMaterial({ color: 0xff6b8a })
        );
        tongue.position.set(0, -0.26, 0.78);
        tongue.scale.set(1, 0.5, 0.4);
        group.add(tongue);
      }
    } else if (mood === "sleep") {
      const z = new T.Mesh(
        new T.TorusGeometry(0.06, 0.02, 8, 12, Math.PI),
        eyeMat
      );
      z.position.set(0, -0.15, 0.72);
      group.add(z);
    } else {
      // neutral mouth — small box
      const mouth = new T.Mesh(
        new T.BoxGeometry(0.18, 0.04, 0.04),
        eyeMat
      );
      mouth.position.set(0, -0.18, 0.74);
      group.add(mouth);
    }

    // CHEEKS for happy moods
    if (mood === "happy" || mood === "fire" || mood === "master") {
      const cheekMat = new T.MeshStandardMaterial({
        color: 0xff6b8a, transparent: true, opacity: 0.55
      });
      [-1, 1].forEach((side) => {
        const c = new T.Mesh(new T.SphereGeometry(0.1, 12, 12), cheekMat);
        c.position.set(side * 0.5, -0.08, 0.55);
        c.scale.z = 0.3;
        group.add(c);
      });
    }

    // CROWN for master mood
    if (mood === "master") {
      const crownMat = new T.MeshStandardMaterial({
        color: 0xffd700, roughness: 0.2, metalness: 0.8
      });
      const base = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 0.12, 16), crownMat);
      base.position.y = 0.92;
      group.add(base);
      for (let i = 0; i < 5; i++) {
        const spike = new T.Mesh(new T.ConeGeometry(0.08, 0.22, 8), crownMat);
        const a = (i / 5) * Math.PI * 2;
        spike.position.set(Math.cos(a) * 0.45, 1.08, Math.sin(a) * 0.45);
        group.add(spike);
        const gem = new T.Mesh(
          new T.SphereGeometry(0.05, 8, 8),
          new T.MeshStandardMaterial({ color: 0xff3b6b, metalness: 0.6, roughness: 0.1 })
        );
        gem.position.set(Math.cos(a) * 0.45, 1.18, Math.sin(a) * 0.45);
        group.add(gem);
      }
    }

    // FLAMES for fire mood
    if (mood === "fire") {
      const flameMat = new T.MeshStandardMaterial({
        color: 0xffa040, emissive: 0xff5500, emissiveIntensity: 0.6,
        transparent: true, opacity: 0.85
      });
      for (let i = 0; i < 5; i++) {
        const f = new T.Mesh(new T.ConeGeometry(0.12, 0.4, 8), flameMat);
        const a = (i / 5) * Math.PI * 2;
        f.position.set(Math.cos(a) * 0.35, 1.0, Math.sin(a) * 0.35);
        f.userData.flame = true;
        f.userData.offset = i * 0.4;
        group.add(f);
      }
    }

    // little feet
    const footMat = accentMat;
    [-1, 1].forEach((side) => {
      const foot = new T.Mesh(
        new T.BoxGeometry(0.28, 0.12, 0.4),
        footMat
      );
      foot.position.set(side * 0.4, -0.95, 0.1);
      group.add(foot);
    });

    return group;
  }

  function initPetScene(host, mood) {
    const T = window.THREE;
    if (!T) return null;
    const w = host.clientWidth || 120;
    const h = host.clientHeight || 120;

    const scene = new T.Scene();
    scene.background = null;

    const camera = new T.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 0.4, 5.2);
    camera.lookAt(0, 0, 0);

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

    const state = { scene, camera, renderer, pet, mood, t0: performance.now() };

    function loop() {
      const t = (performance.now() - state.t0) / 1000;
      // gentle rotation
      pet.rotation.y = Math.sin(t * 0.6) * 0.4;
      // mood-specific motion
      if (mood === "sleep") {
        pet.position.y = Math.sin(t * 0.8) * 0.04 - 0.05;
        pet.scale.setScalar(1 + Math.sin(t * 0.8) * 0.02);
      } else if (mood === "fire" || mood === "master") {
        pet.position.y = Math.abs(Math.sin(t * 3.5)) * 0.18;
        pet.rotation.z = Math.sin(t * 5) * 0.06;
      } else if (mood === "happy") {
        pet.position.y = Math.abs(Math.sin(t * 2.4)) * 0.12;
      } else {
        pet.position.y = Math.sin(t * 1.4) * 0.06;
      }
      // animate fire flames flickering
      pet.children.forEach((c) => {
        if (c.userData && c.userData.flame) {
          c.scale.y = 1 + Math.sin(t * 8 + c.userData.offset) * 0.25;
          c.rotation.y = t * 1.5 + c.userData.offset;
        }
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

  // Pixel-art SVG fallback (no WebGL / no three.js)
  function petSvg(mood) {
    // 16x16 grid scaled up. We draw with rect "pixels".
    // Body color shifts slightly by mood.
    const bodyColor = mood === "master" ? "#1a2a06" : "#1a2a06";
    // Eyes
    let eyes, mouth;
    if (mood === "sleep") {
      eyes  = `<rect x="5" y="7" width="2" height="1" fill="${bodyColor}"/>
               <rect x="9" y="7" width="2" height="1" fill="${bodyColor}"/>`;
      mouth = `<rect x="7" y="10" width="2" height="1" fill="${bodyColor}"/>`;
    } else if (mood === "fire" || mood === "master") {
      eyes  = `<rect x="5" y="6" width="2" height="2" fill="${bodyColor}"/>
               <rect x="9" y="6" width="2" height="2" fill="${bodyColor}"/>
               <rect x="5" y="5" width="2" height="1" fill="${bodyColor}"/>
               <rect x="9" y="5" width="2" height="1" fill="${bodyColor}"/>`;
      mouth = `<rect x="6" y="10" width="4" height="1" fill="${bodyColor}"/>
               <rect x="7" y="11" width="2" height="1" fill="${bodyColor}"/>`;
    } else if (mood === "happy") {
      eyes  = `<rect x="5" y="6" width="1" height="2" fill="${bodyColor}"/>
               <rect x="6" y="6" width="1" height="1" fill="${bodyColor}"/>
               <rect x="9" y="6" width="1" height="2" fill="${bodyColor}"/>
               <rect x="10" y="6" width="1" height="1" fill="${bodyColor}"/>`;
      mouth = `<rect x="6" y="10" width="4" height="1" fill="${bodyColor}"/>`;
    } else if (mood === "egg") {
      // a literal egg with a tiny crack
      return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="2" width="4" height="1" fill="${bodyColor}"/>
        <rect x="4" y="3" width="8" height="1" fill="${bodyColor}"/>
        <rect x="3" y="4" width="10" height="1" fill="${bodyColor}"/>
        <rect x="3" y="5" width="10" height="1" fill="${bodyColor}"/>
        <rect x="2" y="6" width="12" height="6" fill="${bodyColor}"/>
        <rect x="3" y="12" width="10" height="1" fill="${bodyColor}"/>
        <rect x="4" y="13" width="8" height="1" fill="${bodyColor}"/>
        <rect x="6" y="14" width="4" height="1" fill="${bodyColor}"/>
        <rect x="6" y="7" width="1" height="2" fill="#b6cf6f"/>
        <rect x="7" y="8" width="1" height="1" fill="#b6cf6f"/>
        <rect x="8" y="7" width="1" height="2" fill="#b6cf6f"/>
      </svg>`;
    } else {
      // ok / default
      eyes  = `<rect x="5" y="6" width="2" height="2" fill="${bodyColor}"/>
               <rect x="9" y="6" width="2" height="2" fill="${bodyColor}"/>`;
      mouth = `<rect x="7" y="10" width="2" height="1" fill="${bodyColor}"/>`;
    }
    // Spool-creature body: round-ish blob with two side flanges
    const fireCrown = (mood === "fire" || mood === "master")
      ? `<rect x="6" y="0" width="1" height="2" fill="${bodyColor}"/>
         <rect x="8" y="0" width="1" height="2" fill="${bodyColor}"/>
         <rect x="7" y="1" width="1" height="1" fill="${bodyColor}"/>
         <rect x="9" y="1" width="1" height="1" fill="${bodyColor}"/>`
      : "";
    const crown = (mood === "master")
      ? `<rect x="5" y="0" width="6" height="1" fill="${bodyColor}"/>
         <rect x="5" y="1" width="1" height="1" fill="${bodyColor}"/>
         <rect x="7" y="1" width="2" height="1" fill="${bodyColor}"/>
         <rect x="10" y="1" width="1" height="1" fill="${bodyColor}"/>`
      : "";
    return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
      ${crown || fireCrown}
      <!-- body outline -->
      <rect x="4" y="2" width="8" height="1" fill="${bodyColor}"/>
      <rect x="3" y="3" width="10" height="1" fill="${bodyColor}"/>
      <rect x="3" y="4" width="10" height="9" fill="${bodyColor}"/>
      <rect x="4" y="13" width="8" height="1" fill="${bodyColor}"/>
      <!-- spool flanges (the "ears") -->
      <rect x="1" y="6" width="2" height="5" fill="${bodyColor}"/>
      <rect x="13" y="6" width="2" height="5" fill="${bodyColor}"/>
      <rect x="0" y="7" width="1" height="3" fill="${bodyColor}"/>
      <rect x="15" y="7" width="1" height="3" fill="${bodyColor}"/>
      <!-- face cutout (lit pixels) -->
      <rect x="4" y="5" width="8" height="7" fill="#b6cf6f"/>
      ${eyes}
      ${mouth}
      <!-- cheeks for happy/fire moods -->
      ${(mood === "happy" || mood === "fire" || mood === "master")
        ? `<rect x="4" y="9" width="1" height="1" fill="${bodyColor}" opacity=".5"/>
           <rect x="11" y="9" width="1" height="1" fill="${bodyColor}" opacity=".5"/>`
        : ""}
      <!-- feet -->
      <rect x="5" y="14" width="2" height="1" fill="${bodyColor}"/>
      <rect x="9" y="14" width="2" height="1" fill="${bodyColor}"/>
    </svg>`;
  }

  function renderPetInto(host) {
    const mood = petMood();
    const moodClass = (mood === "sleep") ? "mood-sleep"
                    : (mood === "fire" || mood === "master") ? "mood-celebrate"
                    : (mood === "happy") ? "mood-happy" : "";
    const moodLabel = ({
      egg: "Egg", ok: "Idle", happy: "Happy",
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
        </div>
        <div class="pet-bar">${segs}</div>
        <div class="pet-bar-label">Energy · ${inLvl}/100 to Lv ${lvl + 1}</div>
        <div class="pet-actions">
          <button class="pet-btn" type="button" data-act="feed"  aria-label="Feed (Guides)">🍔</button>
          <button class="pet-btn" type="button" data-act="play"  aria-label="Play (Models)">🎮</button>
          <button class="pet-btn" type="button" data-act="clean" aria-label="Clean (Fix)">🧽</button>
          <button class="pet-btn" type="button" data-act="train" aria-label="Train (Setups)">💪</button>
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
    const shareData = {
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
        await navigator.clipboard.writeText(shareData.url);
        showAchievementToast({ emoji: "🔗", name: "Link copied!" });
        return;
      } catch (e) {}
    }
    showAchievementToast({ emoji: "🔗", name: shareData.url });
  }

  function maybeShowInstallBanner() {
    try { if (localStorage.getItem("printora-install-dismissed")) return; }
    catch (e) { return; }
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.navigator.standalone) return;
    const ua = navigator.userAgent || "";
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    if (!isIOS && !isAndroid) return;

    const banner = el("div", "install-banner");
    const how = isIOS
      ? "Tap <b>Share</b> below → <b>Add to Home Screen</b>"
      : "Open the <b>⋮ menu</b> → <b>Install app</b>";
    banner.innerHTML = `
      <span class="ib-ico">📲</span>
      <span class="ib-txt"><b>Install Printora</b><small>${how}</small></span>
      <button class="ib-x" type="button" aria-label="Dismiss">×</button>`;
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

    // tip of the day
    const tip = tipOfTheDay();
    if (tip) {
      const tipCard = el("div", "tip-card");
      tipCard.innerHTML = `<span class="tip-label">💡 Tip of the Day</span><p>${esc(tip)}</p>`;
      view.append(tipCard);
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
      r.addEventListener("click", () => go("setups"));
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
  };

  function guideBody(g) {
    let out = '<ol class="steps">';
    g.steps.forEach((s) => { out += `<li><b>${esc(s.h)}</b><span>${esc(s.b)}</span></li>`; });
    out += "</ol>";
    if (g.tips && g.tips.length) {
      out += '<div class="note"><b>💡 Pro tips</b><ul>' +
        g.tips.map((t) => `<li>${esc(t)}</li>`).join("") + "</ul></div>";
    }
    return out;
  }

  routes.fix = function () {
    view.innerHTML = section("Troubleshooting", "Pick the symptom you're seeing");
    const items = DB.troubleshooting.map((t) => ({
      kind: "fix", id: t.id,
      head: `<span class="acc-emoji">${t.emoji}</span><span class="acc-title"><b>${esc(t.symptom)}</b></span>`,
      body: `<h4>Likely causes</h4><ul>${t.causes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
             <h4>✅ Fixes (try in order)</h4><ol class="fixes">${t.fixes.map((f) => `<li>${esc(f)}</li>`).join("")}</ol>`
    }));
    view.append(accordion(items));
  };

  routes.glossary = function () {
    view.innerHTML = section("Glossary", "Every term, in plain English");
    const wrap = el("div", "glossary");
    DB.glossary.forEach((g) => {
      wrap.append(el("div", "gloss", `<b>${esc(g.term)}</b><span>${esc(g.def)}</span>`));
    });
    view.append(wrap);
  };

  routes.calc = function () {
    view.innerHTML = section("Filament Cost Calculator", "Estimate the material cost of a print");
    const form = el("div", "calc");
    form.innerHTML = `
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
      <p class="foot-note">Most slicers report grams used after slicing. Add electricity/wear separately if you sell prints.</p>
    `;
    view.append(form);
    const recalc = () => {
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
    ["c-g", "c-price", "c-spool"].forEach((id) => $("#" + id).addEventListener("input", recalc));
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
      <div class="ach-stat"><b>${PROGRESS.streakDays}</b><span>Day Streak</span></div>
      <div class="ach-stat"><b>${unlocked}/${ACHIEVEMENTS.length}</b><span>Achievements</span></div>`;
    view.append(stats);
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
      go: "setups"
    }));
    DB.guides.forEach((g) => INDEX.push({
      type: "Guide", icon: g.emoji, title: g.title, sub: g.summary,
      text: [g.title, g.summary, g.steps.map((s) => s.h + " " + s.b).join(" "), (g.tips || []).join(" ")].join(" ").toLowerCase(),
      go: "guides"
    }));
    DB.troubleshooting.forEach((t) => INDEX.push({
      type: "Fix", icon: t.emoji, title: t.symptom, sub: t.fixes[0],
      text: [t.symptom, t.causes.join(" "), t.fixes.join(" ")].join(" ").toLowerCase(),
      go: "fix"
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
      r.addEventListener("click", () => go(h.go));
      container.append(r);
    });
  }

  /* ---------- ROUTER ---------- */
  function go(route) {
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
    location.hash = route;
  }
  window.Printora = { go, PROGRESS, ACHIEVEMENTS };

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
  refreshLevelPill();
  const pillEl = document.getElementById("lvlPill");
  if (pillEl) pillEl.addEventListener("click", () => go("achievements"));
  const shareEl = document.getElementById("shareBtn");
  if (shareEl) shareEl.addEventListener("click", shareApp);
  go((location.hash || "#home").slice(1));
  // welcome achievement fires on first ever launch
  checkAchievements();
  // streak-up celebration (only when it actually increments)
  if (_streakUp >= 2) {
    setTimeout(() => showAchievementToast({
      emoji: "🔥", name: `${_streakUp}-day streak!`
    }), 700);
  }
  // mobile install banner (dismissable + persistent)
  maybeShowInstallBanner();
  window.addEventListener("hashchange", () => {
    const r = location.hash.slice(1);
    if (routes[r]) go(r);
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

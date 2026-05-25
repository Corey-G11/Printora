/* ============================================================
   FilaHub — app shell, router and rendering
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
    // items: [{key, head(html), body(html), open}]
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
      btn.addEventListener("click", () => card.classList.toggle("open"));
      card.append(btn, body);
      wrap.append(card);
    });
    return wrap;
  }

  /* ---------- ROUTES ---------- */
  const routes = {};

  routes.home = function () {
    view.innerHTML = "";
    view.append(el("div", "hero", `
      <div class="hero-badge"><span>🧵</span></div>
      <h1>FilaHub</h1>
      <p>Your one-stop shop for everything 3D printing — setups, models, guides & fixes.</p>
    `));

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
      { t: "Filament Setups", d: "Temps & slicer settings per material", i: "🎛️", go: "setups" },
      { t: "Find Models", d: "Where to download printables + ideas", i: "📦", go: "models" },
      { t: "How-To Guides", d: "Printing, finishing & joining parts", i: "📖", go: "guides" },
      { t: "Troubleshooting", d: "Diagnose & fix print problems", i: "🩹", go: "fix" },
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
      sites.append(a);
    });
    view.append(sites);

    view.append(el("h2", "h2", "💡 What to print"));
    const items = DB.modelCategories.map((c) => ({
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
      out.innerHTML = `<span class="big">${fmtMoney(cost)}</span>
        <small>${g} g × ${fmtMoney(perKg)}/kg</small>`;
    };
    ["c-g", "c-price", "c-spool"].forEach((id) => $("#" + id).addEventListener("input", recalc));
  };

  function fmtMoney(n) {
    return (Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

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
    // highlight active tab (map sub-routes back to their tab)
    const tabFor = { compare: "setups", calc: "home", glossary: "home" };
    const active = tabFor[route] || route;
    document.querySelectorAll(".tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.route === active));
    location.hash = route;
  }
  window.FilaHub = { go };

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
  go((location.hash || "#home").slice(1));
  window.addEventListener("hashchange", () => {
    const r = location.hash.slice(1);
    if (routes[r]) go(r);
  });

  // register service worker for offline use
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();

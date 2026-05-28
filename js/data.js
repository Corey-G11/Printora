/* ============================================================
   Printora — 3D printing knowledge base
   All content lives here as plain data; app.js renders it.
   Settings are sensible *starting points* — always tune for
   your specific printer, filament brand and ambient conditions.
   ============================================================ */

const DB = {};

/* ---------- MATERIALS / SLICER SETUPS ---------- */
DB.materials = [
  {
    id: "pla", name: "PLA", emoji: "🌽", tagline: "The easy all-rounder",
    difficulty: "Beginner",
    nozzle: "190–220 °C", bed: "50–60 °C", fan: "100%",
    speed: "50–80 mm/s", retraction: "Direct 0.5–1 mm · Bowden 4–6 mm",
    firstLayer: "215 °C nozzle / 60 °C bed, 50% speed",
    enclosure: "Not needed (open air is fine)",
    flow: "≈100% — tune with a flow/wall test",
    strength: 3, flexibility: 1, heatResist: 1, ease: 5,
    storage: "Keep dry; absorbs moisture slowly. Dry 45 °C / 4 h if brittle or popping.",
    uses: ["Prototypes & display models", "Toys, miniatures, cosplay", "Low-stress household items", "Anything indoors & cool"],
    avoid: ["Car interiors / hot cars (warps ~50 °C)", "Outdoor structural parts", "Anything near a heat source"],
    tips: [
      "Runs cool, so max your part-cooling fan for crisp overhangs.",
      "Softens around 50–60 °C — never leave parts in a hot car.",
      "Silk/matte/glow variants print like PLA but tweak temp ±10 °C."
    ]
  },
  {
    id: "petg", name: "PETG", emoji: "💧", tagline: "Tough, water & UV resistant",
    difficulty: "Intermediate",
    nozzle: "230–250 °C", bed: "70–85 °C", fan: "30–60%",
    speed: "40–60 mm/s", retraction: "Direct 1–2 mm · Bowden 5–7 mm",
    firstLayer: "240 °C nozzle / 80 °C bed, slow + higher Z-gap (it sticks HARD)",
    enclosure: "Optional — helps consistency",
    flow: "≈95% — PETG over-extrudes easily, dial back if blobby",
    strength: 4, flexibility: 2, heatResist: 3, ease: 3,
    storage: "Moisture-sensitive — dry 65 °C / 6 h if you see steam/bubbles or hear popping.",
    uses: ["Functional & outdoor parts", "Bottles, planters, food-adjacent (not food-safe alone)", "Mechanical brackets", "Parts needing some flex + toughness"],
    avoid: ["Fine detailed minis (stringy)", "Tight-tolerance press fits (gummy)"],
    tips: [
      "Famous for stringing — slow travel, tune retraction, dry the filament.",
      "Sticks to PEI TOO well — use a glue-stick release layer or raise first-layer Z slightly to avoid tearing the plate.",
      "Lower the fan vs PLA; too much cooling ruins layer bonding."
    ]
  },
  {
    id: "abs", name: "ABS / ASA", emoji: "🔧", tagline: "Heat & impact resistant",
    difficulty: "Advanced",
    nozzle: "230–260 °C", bed: "90–110 °C", fan: "0–20%",
    speed: "40–60 mm/s", retraction: "Direct 0.5–1 mm · Bowden 4–6 mm",
    firstLayer: "250 °C nozzle / 100 °C bed, fan off",
    enclosure: "Required — warps & cracks without it",
    flow: "≈100%",
    strength: 4, flexibility: 2, heatResist: 5, ease: 2,
    storage: "Mildly hygroscopic. Dry 65 °C / 4 h. Ventilate — fumes are unpleasant.",
    uses: ["Automotive & engine-bay parts", "Enclosures, electronics housings", "Tooling/jigs", "ASA = ABS for the outdoors (UV-stable)"],
    avoid: ["Open/draughty rooms (warps)", "Poorly ventilated spaces (fumes)", "Beginners' first material"],
    tips: [
      "Print in a warm, draught-free enclosure; cold air = corner cracking.",
      "Smooth & glue parts with acetone (vapour-smoothing or solvent welding).",
      "ASA prints almost identically but resists sunlight far better."
    ]
  },
  {
    id: "tpu", name: "TPU (Flexible)", emoji: "🩴", tagline: "Rubber-like & bouncy",
    difficulty: "Intermediate",
    nozzle: "210–235 °C", bed: "40–60 °C", fan: "30–60%",
    speed: "15–30 mm/s (slow!)", retraction: "Minimal — 0.5–2 mm, or use coasting",
    firstLayer: "225 °C nozzle / 50 °C bed, very slow",
    enclosure: "Not needed",
    flow: "≈100–105%",
    strength: 3, flexibility: 5, heatResist: 2, ease: 2,
    storage: "Very hygroscopic — dry 50 °C / 6 h. Wet TPU prints terribly.",
    uses: ["Phone cases, grips, gaskets", "Tyres, feet, bumpers", "Straps & flexible hinges", "Vibration dampers"],
    avoid: ["Fast prints (jams Bowden setups)", "Sharp overhangs without support"],
    tips: [
      "Direct-drive extruders handle TPU far better than Bowden.",
      "Go SLOW and reduce retraction to prevent jams and gaps.",
      "Softer (lower Shore-A) filament = harder to print. Start with 95A."
    ]
  },
  {
    id: "nylon", name: "Nylon (PA)", emoji: "⚙️", tagline: "Engineering-grade, low friction",
    difficulty: "Advanced",
    nozzle: "240–270 °C", bed: "70–90 °C", fan: "0–20%",
    speed: "30–50 mm/s", retraction: "Direct 1–2 mm",
    firstLayer: "260 °C nozzle / 80 °C bed, glue/PVA or garolite plate",
    enclosure: "Strongly recommended",
    flow: "≈100%",
    strength: 5, flexibility: 4, heatResist: 4, ease: 1,
    storage: "EXTREMELY hygroscopic — dry 70–80 °C / 8–12 h and print from a dry box.",
    uses: ["Gears, bushings, living hinges", "High-wear & high-impact parts", "Functional mechanical parts"],
    avoid: ["Humid environments without drying", "Standard PEI (use glue/garolite)"],
    tips: [
      "Must be bone-dry — even an hour in open air degrades print quality.",
      "Glass/carbon-fibre filled nylon is stiffer and far easier to print flat.",
      "Use a hardened nozzle for any CF/GF-filled filament — it eats brass."
    ]
  },
  {
    id: "pc", name: "Polycarbonate (PC)", emoji: "🛡️", tagline: "Maximum strength & heat",
    difficulty: "Expert",
    nozzle: "260–310 °C", bed: "100–120 °C", fan: "0%",
    speed: "30–50 mm/s", retraction: "Direct 1–2 mm",
    firstLayer: "290 °C nozzle / 110 °C bed, glue stick",
    enclosure: "Required (heated ideally)",
    flow: "≈100%",
    strength: 5, flexibility: 2, heatResist: 5, ease: 1,
    storage: "Very hygroscopic — dry 80 °C / 6–8 h, print from dry box.",
    uses: ["Bulletproof-tough functional parts", "High-temp environments", "Optically clear parts (thin walls)"],
    avoid: ["Printers with PTFE-lined hotends (max ~240 °C)", "Open-frame printers"],
    tips: [
      "Needs an all-metal hotend rated for high temps.",
      "Layer adhesion is weak if under-temp — run it hot.",
      "Warps aggressively; a heated chamber makes life much easier."
    ]
  }
];

/* ---------- GUIDES (incl. connecting / joining pieces) ---------- */
DB.guideCategories = [
  { id: "start",   name: "Getting Started", emoji: "🚀" },
  { id: "quality", name: "Print Quality",   emoji: "✨" },
  { id: "join",    name: "Connecting Pieces", emoji: "🔗" },
  { id: "finish",  name: "Finishing & Post", emoji: "🎨" },
  { id: "care",    name: "Maintenance & Care", emoji: "🧰" }
];

DB.guides = [
  {
    id: "first-print", cat: "start", title: "Your First Print, Start to Finish", emoji: "🏁",
    summary: "The complete loop from a downloaded model to a finished part.",
    steps: [
      { h: "Pick a model", b: "Download an STL or 3MF from a model site (see the Models tab). Start with something small, flat-bottomed and support-free like a calibration cube or a coaster." },
      { h: "Slice it", b: "Open it in a slicer (PrusaSlicer, OrcaSlicer, Bambu Studio, Cura). Select your printer + filament profile, set 15–20% infill and 0.2 mm layer height to start." },
      { h: "Preview", b: "Scrub the layer preview. Check it sits flat on the plate, supports look sane, and there are no stray floating bits." },
      { h: "Export & transfer", b: "Export G-code / 3MF to SD card, USB, or send over the network/cloud to the printer." },
      { h: "Prep the bed", b: "Make sure the plate is clean (see Bed Adhesion). Preheat and run auto-level / mesh if your printer has it." },
      { h: "Print & watch the first layer", b: "The first layer makes or breaks the print. Stay for it — squished-but-not-gappy lines mean you're good." },
      { h: "Remove & clean up", b: "Let the bed cool (parts pop off easier), flex the plate, then remove brim/supports and lightly sand seams." }
    ],
    tips: ["A perfect first layer solves 80% of print failures.", "Keep a print log — note what worked per filament."]
  },
  {
    id: "leveling", cat: "start", title: "Bed Leveling & First Layer", emoji: "📏",
    summary: "Get a flat, even, well-squished first layer every time.",
    steps: [
      { h: "Level the frame first", b: "On manual printers, use the paper-drag method at the 4 corners + centre with the nozzle hot. Aim for slight friction on the paper." },
      { h: "Set Z-offset", b: "Lower the nozzle until the first layer lines just barely merge together. Too high = stringy/loose lines; too low = transparent, scraped, or no extrusion." },
      { h: "Run a mesh", b: "Auto-bed-leveling (ABL) probes a grid to compensate for a warped bed. Run it after any bed change." },
      { h: "Use a first-layer test", b: "Print a single-layer test square (or first-layer patch) and adjust Z live until the surface is smooth with no gaps or ridges." }
    ],
    tips: ["Level with the bed at printing temperature — metal expands.", "A glass/PEI surface that's truly flat beats fighting a warped bed."]
  },
  {
    id: "adhesion", cat: "start", title: "Bed Adhesion: Make It Stick", emoji: "🧲",
    summary: "Stop prints lifting, warping, or sliding off mid-job.",
    steps: [
      { h: "Clean the plate", b: "Skin oils are the #1 cause of poor adhesion. Wash PEI/glass with warm soapy water or wipe with isopropyl alcohol (IPA). Don't touch the print area after." },
      { h: "Match the surface to the filament", b: "Smooth PEI loves PLA/PETG; textured PEI hides first-layer marks; glass + glue stick is great for ABS/Nylon." },
      { h: "Dial the first layer", b: "Hotter bed + slower first layer + correct Z-squish. Bump bed temp 5–10 °C if corners lift." },
      { h: "Add a helper if needed", b: "Brim for tall/small-footprint parts, raft for very warpy materials, glue stick or hairspray as a release+grip layer." }
    ],
    tips: ["Too sticky? Raise Z-offset slightly or add a release agent so you don't gouge the plate.", "Draughts cause warping — enclose ABS/ASA/PC."]
  },
  {
    id: "supports", cat: "quality", title: "Supports & Overhangs", emoji: "🏗️",
    summary: "When you need supports and how to make them peel off cleanly.",
    steps: [
      { h: "Know the 45° rule", b: "Overhangs up to ~45° from vertical usually print unsupported. Steeper than that needs support or a design change." },
      { h: "Bridge short gaps", b: "Flat spans between two points can 'bridge' without support — slow it down and cool hard." },
      { h: "Choose support type", b: "Normal/grid = strong, harder to remove. Tree/organic = less material, easier on curved parts, gentler on surfaces." },
      { h: "Set a Z-gap", b: "A small top contact gap (0.1–0.2 mm) lets supports snap off cleanly. Too big = saggy overhang; too small = fused." },
      { h: "Orient to avoid supports", b: "Rotating the model often removes the need for supports entirely — always the best fix." }
    ],
    tips: ["Print supports in a different material (PVA/HIPS) on dual-extruder machines for dissolvable removal.", "Support interface layers give a much cleaner underside."]
  },
  {
    id: "strong-parts", cat: "quality", title: "Printing Strong, Functional Parts", emoji: "💪",
    summary: "Infill, walls and orientation for parts that take load.",
    steps: [
      { h: "Walls beat infill", b: "Perimeters/walls add far more strength than infill. Use 3–5 walls for functional parts before cranking infill." },
      { h: "Pick the right infill", b: "Gyroid = strong in all directions + good for flexibility. Grid/cubic = fast & strong. 20–40% covers most functional needs." },
      { h: "Mind layer direction", b: "Parts are weakest BETWEEN layers (Z). Orient so forces pull along layers, not peel them apart." },
      { h: "Hotter = stronger", b: "Print 5–10 °C hotter and slower for better layer bonding on load-bearing parts." }
    ],
    tips: ["Adding a chamfer/fillet at stress corners prevents cracks.", "100% infill isn't always stronger and wastes time/filament."]
  },
  /* ---- CONNECTING / JOINING PIECES ---- */
  {
    id: "glue-guide", cat: "join", title: "Gluing & Solvent Welding", emoji: "🧪",
    summary: "Which adhesive for which plastic — and how to bond multi-part prints.",
    steps: [
      { h: "Super glue (cyanoacrylate)", b: "Best all-round for PLA/PETG/ABS. Bonds in seconds. Use the thin type for tight seams, gel for gaps. A drop of accelerator sets it instantly." },
      { h: "Two-part epoxy", b: "Strongest gap-filling bond; works on almost everything. 5-minute or 30-minute cure. Great for load-bearing joints and filling seams." },
      { h: "Solvent welding (ABS/ASA)", b: "Acetone partly melts ABS so parts fuse chemically into one piece. Brush a little on both faces, press, hold. Make 'ABS juice' (ABS scraps + acetone) as a strong filler glue." },
      { h: "PLA welding", b: "PLA doesn't solvent-weld well. Use super glue, epoxy, or a 3D-printing pen with matching filament to weld seams and fill gaps." },
      { h: "Prep & clamp", b: "Sand mating faces lightly for grip, wipe clean (IPA), align with dowel pins or registration tabs, then clamp/tape until cured." }
    ],
    tips: ["Design overlapping tabs or a tongue-and-groove so glue has more surface area.", "Super glue fogs clear parts — keep it off visible faces.", "Work ventilated with acetone/epoxy."]
  },
  {
    id: "inserts", cat: "join", title: "Threaded Inserts & Screws", emoji: "🔩",
    summary: "Add metal threads so parts can be bolted together and reopened.",
    steps: [
      { h: "Heat-set inserts (best)", b: "Print a hole sized to the insert (check its spec, often ~0.2 mm under the insert OD). Heat the insert with a soldering iron and press it straight into the hole until flush — the plastic melts around the knurls." },
      { h: "Design the boss", b: "Surround the hole with enough wall (≥2 mm) so the melted plastic has somewhere to go. Add a slight lead-in chamfer to start the insert square." },
      { h: "Self-tapping screws", b: "For lighter loads, screw directly into a slightly undersized printed pilot hole. Avoid re-opening many times — threads wear out." },
      { h: "Captive nuts", b: "Model a hexagonal pocket and drop a standard nut in (often suspended mid-print with a 'nut trap'). Cheap and very strong for bolts." },
      { h: "Bolt-through", b: "For the strongest joint, run a bolt fully through both parts into a nut/insert on the far side." }
    ],
    tips: ["M3 heat-set inserts are the hobby standard — buy an assortment.", "Press inserts in dead straight or threads will be skewed.", "More walls/perimeters around a boss = stronger threads."]
  },
  {
    id: "snapfit", cat: "join", title: "Snap-Fits, Pins & Joinery", emoji: "🧩",
    summary: "Tool-free connections: clips, dovetails, dowels and print-in-place.",
    steps: [
      { h: "Snap-fit clips", b: "A cantilever hook that flexes past a lip and locks. Keep the hook thin enough to flex but thick at the base; PETG/Nylon survive repeated flexing far better than brittle PLA." },
      { h: "Dovetails & slots", b: "Sliding dovetails join flat panels with no glue and resist pull-apart. Add ~0.15–0.2 mm clearance so they slide without forcing." },
      { h: "Alignment pins & dowels", b: "Printed or hardware pins/dowels keep multi-part prints aligned while gluing and add shear strength. Sockets ~0.1–0.2 mm larger than the pin." },
      { h: "Print-in-place hinges/joints", b: "Model a small gap (≥0.3 mm, or one nozzle width) between moving parts so they print already connected and free." },
      { h: "Magnets", b: "Glue neodymium magnets into printed pockets for clean, repeatable, removable connections — mind the polarity before gluing!" }
    ],
    tips: ["Clearance is everything: 0.1 mm = tight press fit, 0.2 mm = sliding fit, 0.3 mm+ = loose/moving.", "Print a tolerance test to learn YOUR printer's real clearances."]
  },
  {
    id: "finishing", cat: "finish", title: "Sanding, Priming & Painting", emoji: "🖌️",
    summary: "Take a layered print to a smooth, painted, professional finish.",
    steps: [
      { h: "Sand progressively", b: "Start ~120–220 grit to knock down layer lines, then step up 320 → 600 → 1000+. Wet-sanding reduces dust and clogging." },
      { h: "Fill imperfections", b: "Use filler primer, spot putty, or epoxy/UV resin to fill remaining layer lines and pits, then sand back." },
      { h: "Prime", b: "Spray 2–3 light coats of filler primer. It unifies the surface and shows defects you still need to fix." },
      { h: "Paint", b: "Acrylics (brush or rattle-can) work great on primed prints. Light coats, let each dry. Finish with matte/gloss clear-coat to protect." },
      { h: "Smooth ABS with vapour", b: "Acetone vapour smoothing melts the surface glassy-smooth on ABS/ASA. Do it in a sealed container, ventilated, away from flames." }
    ],
    tips: ["Primer is what makes paint look pro — never skip it.", "XTC-3D or thin epoxy coatings smooth + strengthen in one step."]
  },
  {
    id: "drying", cat: "care", title: "Drying & Storing Filament", emoji: "🌡️",
    summary: "Wet filament causes stringing, popping and weak prints — fix it.",
    steps: [
      { h: "Spot the signs", b: "Hissing/popping/steam at the nozzle, rough surfaces, bad stringing and weak layers all point to moisture." },
      { h: "Dry it", b: "Use a filament dryer or oven (PLA 45 °C, PETG 65 °C, ABS 65 °C, Nylon 70–80 °C, TPU 50 °C) for 4–12 h depending on material." },
      { h: "Store it dry", b: "Vacuum bags or airtight boxes with rechargeable silica gel desiccant. Nylon/TPU/PC should print straight from a dry box." },
      { h: "Recharge desiccant", b: "Bake colour-indicating silica when it changes colour, then reuse — cheaper than replacing." }
    ],
    tips: ["A cheap hygrometer in the box tells you when humidity climbs.", "Don't exceed a material's glass-transition temp when drying or the spool fuses."]
  },
  {
    id: "maintenance", cat: "care", title: "Printer Maintenance", emoji: "🛠️",
    summary: "A quick routine to keep prints clean and the machine healthy.",
    steps: [
      { h: "Keep rails & rods clean + lubed", b: "Wipe linear rails/rods and re-apply proper machine grease/PTFE lube periodically. No WD-40 on rails." },
      { h: "Check belt tension", b: "Loose belts cause ringing/ghosting and layer shifts. They should twang like a low guitar string, not sag." },
      { h: "Clear the nozzle", b: "Do cold pulls / atomic pulls to remove debris, or run a cleaning filament. Replace worn/abrasive-damaged nozzles." },
      { h: "Inspect the PTFE tube", b: "A degraded/gappy PTFE tube at the hotend causes clogs and stringing — re-seat or replace it." },
      { h: "Tighten & dust", b: "Re-check screws/eccentric nuts, blow out fans, and keep the bed surface grease-free." }
    ],
    tips: ["Hardened steel nozzle is mandatory for carbon/glass-filled filament.", "Keep spare nozzles, PTFE and a build sheet on hand — they're consumables."]
  }
];

/* ---------- TROUBLESHOOTING ---------- */
DB.troubleshooting = [
  {
    id: "stringing", symptom: "Stringing / wispy hairs", emoji: "🕸️",
    causes: ["Wet filament", "Too little retraction", "Nozzle too hot", "Slow travel moves"],
    fixes: ["Dry the filament (biggest single fix)", "Increase retraction distance/speed a little", "Drop nozzle temp 5–10 °C", "Enable 'wipe' and increase travel speed", "Run a temperature/retraction tower to dial it in"]
  },
  {
    id: "warping", symptom: "Corners lifting / warping", emoji: "🌀",
    causes: ["Bed too cool", "Draughts / fast cooling", "Poor adhesion", "High-shrinkage material (ABS)"],
    fixes: ["Raise bed temp 5–10 °C", "Add a brim or raft", "Enclose the printer / block draughts", "Clean the plate + glue stick", "Reduce first-layer fan to 0%"]
  },
  {
    id: "first-layer", symptom: "First layer won't stick / gaps", emoji: "🚫",
    causes: ["Z-offset too high", "Dirty/greasy plate", "Bed not level", "Bed too cool", "Printing too fast"],
    fixes: ["Lower Z-offset (more squish)", "Wash plate with soap/IPA", "Re-level + run mesh", "Increase bed temp", "Slow the first layer to ~50%"]
  },
  {
    id: "underextrusion", symptom: "Under-extrusion / gaps in walls", emoji: "🫥",
    causes: ["Partial clog", "Nozzle too cold", "Flow too low", "Worn/slipping extruder gear", "Wet/abrasive filament"],
    fixes: ["Cold-pull to clear the nozzle", "Raise nozzle temp 5–10 °C", "Calibrate flow / E-steps", "Clean & tension the extruder gear", "Slow down so the hotend keeps up"]
  },
  {
    id: "overextrusion", symptom: "Over-extrusion / blobs & rough top", emoji: "🟤",
    causes: ["Flow too high", "Temp too high", "Wrong filament diameter set"],
    fixes: ["Lower flow to ~95% and re-test", "Drop nozzle temp 5 °C", "Set true filament diameter (measure it)", "Enable coasting / pressure-advance"]
  },
  {
    id: "layershift", symptom: "Layer shifting / steps", emoji: "📐",
    causes: ["Loose belts", "Printing too fast", "Mechanical obstruction", "Driver overheating / lost steps"],
    fixes: ["Tighten belts + check pulley grub screws", "Reduce speed & acceleration", "Check nothing collides with the print", "Improve stepper-driver cooling"]
  },
  {
    id: "ghosting", symptom: "Ringing / ghosting (echoes)", emoji: "👻",
    causes: ["High acceleration/jerk", "Loose belts", "Wobbly frame / tall part"],
    fixes: ["Lower acceleration & jerk", "Tighten belts", "Brace/secure the frame on a solid surface", "Enable input shaping if supported"]
  },
  {
    id: "elephantfoot", symptom: "Elephant's foot (bulged base)", emoji: "🐘",
    causes: ["Z-offset too low", "Bed too hot", "Too much first-layer squish"],
    fixes: ["Raise Z-offset slightly", "Lower bed temp a few °C", "Enable 'elephant foot compensation' in the slicer", "Add a small chamfer to the base"]
  },
  {
    id: "layeradhesion", symptom: "Layers splitting / cracking", emoji: "💥",
    causes: ["Nozzle too cold", "Too much cooling", "Printing too fast", "Wet filament"],
    fixes: ["Increase nozzle temp 5–15 °C", "Reduce part-cooling fan (esp. PETG/ABS)", "Slow down", "Dry the filament", "Enclose for ABS/ASA/PC"]
  },
  {
    id: "clog", symptom: "Nozzle clog / no extrusion", emoji: "🧱",
    causes: ["Debris/charred filament", "Heat creep", "Degraded PTFE tube", "Too-low temp for material"],
    fixes: ["Cold/atomic pull", "Improve hotend fan / reduce retraction", "Re-seat or replace PTFE tube", "Use a cleaning needle/filament", "Replace the nozzle if blocked solid"]
  },
  {
    id: "topgaps", symptom: "Gaps / holes in top surface", emoji: "🕳️",
    causes: ["Too few top layers", "Low infill density", "Under-extrusion", "Fast top-layer speed"],
    fixes: ["Use 4–5 top layers", "Raise infill to ≥15–20%", "Enable ironing for smooth tops", "Slow top-solid-infill speed", "Check/raise flow"]
  }
];

/* ---------- MODELS / PRINTABLES ---------- */
DB.modelSites = [
  { name: "Printables", url: "https://www.printables.com", desc: "Prusa's huge free library with contests & rewards." },
  { name: "MakerWorld", url: "https://makerworld.com", desc: "Bambu Lab's library — many ready-to-print 3MF profiles." },
  { name: "Thingiverse", url: "https://www.thingiverse.com", desc: "The original massive repository of free models." },
  { name: "Thangs", url: "https://thangs.com", desc: "Search engine across many sites + geometric search." },
  { name: "Cults3D", url: "https://cults3d.com", desc: "Mix of free and premium designer models." },
  { name: "MyMiniFactory", url: "https://www.myminifactory.com", desc: "Curated, guaranteed-printable models & tabletop minis." }
];

DB.modelCategories = [
  { name: "Calibration & Testing", emoji: "🎯", ideas: ["XYZ calibration cube", "Temperature tower", "Retraction/stringing test", "Tolerance/clearance test", "All-in-one print test (3DBenchy, etc.)"] },
  { name: "Home & Organisation", emoji: "🏠", ideas: ["Drawer dividers & bins", "Cable clips & holders", "Wall hooks", "Headphone/controller stands", "Toothbrush & remote holders"] },
  { name: "Workshop & Tools", emoji: "🧰", ideas: ["Tool holders & wall organisers", "Gridfinity modular storage", "Drill-bit & screw sorters", "Clamps & jigs", "Funnel & scoop"] },
  { name: "Desk & Office", emoji: "🖥️", ideas: ["Pen & pencil cups", "Phone/tablet stands", "Cable management trays", "Monitor riser feet", "Headset hook under desk"] },
  { name: "Toys, Games & Gifts", emoji: "🎲", ideas: ["Articulated dragons/animals", "Fidget toys & gears", "Dice towers & board-game inserts", "Puzzle boxes", "Custom keychains"] },
  { name: "Functional & Mechanical", emoji: "⚙️", ideas: ["Replacement knobs & feet", "Brackets & mounts", "Gears & pulleys", "Enclosures for electronics", "Bearings & bushings"] },
  { name: "Cosplay & Art", emoji: "🎭", ideas: ["Helmets & armour pieces", "Props & weapons (display)", "Wall art & reliefs", "Planters & vases (vase mode)", "Lithophanes from photos"] }
];

/* ---------- GLOSSARY ---------- */
DB.glossary = [
  { term: "STL", def: "The classic 3D model file (a mesh of triangles). No colour/units — just shape." },
  { term: "3MF", def: "A modern model format that can carry colour, units and slicer settings together." },
  { term: "G-code", def: "The instruction file the printer actually runs — moves, temps, speeds, generated by the slicer." },
  { term: "Slicer", def: "Software that converts a 3D model into G-code (PrusaSlicer, OrcaSlicer, Cura, Bambu Studio)." },
  { term: "Layer height", def: "Thickness of each printed layer. Smaller = smoother but slower (0.12 fine, 0.2 standard, 0.28 fast)." },
  { term: "Infill", def: "The internal lattice that fills a part. Higher % = stronger/heavier/slower." },
  { term: "Perimeter / Wall", def: "The outer shells of a part. More walls add a lot of strength." },
  { term: "Retraction", def: "Pulling filament back during travel moves to stop oozing and stringing." },
  { term: "Brim", def: "A flat single-layer skirt attached to the part's base for better adhesion." },
  { term: "Raft", def: "A thick printed base under the whole part — great for warpy materials or rough beds." },
  { term: "Skirt", def: "A loose outline printed around (not touching) the part to prime the nozzle." },
  { term: "Support", def: "Sacrificial structure that holds up overhangs/bridges, removed after printing." },
  { term: "Bridging", def: "Printing a flat span between two points with no support beneath." },
  { term: "Z-offset", def: "The nozzle-to-bed distance for the first layer — your #1 first-layer adjustment." },
  { term: "Elephant's foot", def: "A bulge at the base from too much heat/squish on the first layers." },
  { term: "Flow / Extrusion multiplier", def: "Scales how much filament is pushed; tune to fix over/under-extrusion." },
  { term: "Vase mode (spiralize)", def: "Prints a single continuous wall with no top/infill — fast, seamless cups & vases." },
  { term: "Ironing", def: "A second smoothing pass over top surfaces for a glassy finish." },
  { term: "Pressure / Linear advance", def: "Firmware feature that sharpens corners by managing nozzle pressure." },
  { term: "PEI", def: "The popular spring-steel build-plate coating; smooth or textured variants." },
  { term: "Hygroscopic", def: "Absorbs moisture from the air (Nylon/TPU/PC especially) — dry before printing." },
  { term: "Bowden vs Direct drive", def: "Extruder location: remote (Bowden, light/fast) vs on the hotend (direct, better for flexibles)." },
  { term: "Heat creep", def: "Heat travelling too far up the hotend, softening filament early and causing jams." }
];

/* ---------- HOME QUICK-REFERENCE CHIPS ---------- */
DB.quickRef = [
  { k: "PLA", v: "200 °C / 60 °C" },
  { k: "PETG", v: "240 °C / 80 °C" },
  { k: "ABS", v: "250 °C / 100 °C" },
  { k: "TPU", v: "220 °C / 50 °C" },
  { k: "Press fit", v: "0.1 mm gap" },
  { k: "Sliding fit", v: "0.2 mm gap" },
  { k: "Moving fit", v: "0.3 mm+ gap" }
];

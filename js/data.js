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
    tips: ["M3 heat-set inserts are the hobby standard — buy an assortment.", "Press inserts in dead straight or threads will be skewed.", "More walls/perimeters around a boss = stronger threads."],
    shopLinks: [
      { label: "M3/M4 heat-set inserts", query: "m3 m4 heat set inserts brass" },
      { label: "Insert tip (soldering iron)", query: "soldering iron heat set insert tip" }
    ]
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
    tips: ["Primer is what makes paint look pro — never skip it.", "XTC-3D or thin epoxy coatings smooth + strengthen in one step."],
    shopLinks: [
      { label: "Sandpaper (120–2000 grit)", query: "wet dry sandpaper assortment 120 2000" },
      { label: "Filler primer", query: "rust-oleum filler primer" },
      { label: "Acetone (ABS smoothing)", query: "100% pure acetone gallon" }
    ]
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
    tips: ["A cheap hygrometer in the box tells you when humidity climbs.", "Don't exceed a material's glass-transition temp when drying or the spool fuses."],
    shopLinks: [
      { label: "Sunlu S2 filament dryer", query: "sunlu filament dryer s2" },
      { label: "Vacuum bags + pump", query: "filament vacuum storage bags" },
      { label: "Rechargeable silica gel", query: "rechargeable silica gel desiccant" },
      { label: "Mini hygrometer", query: "mini digital hygrometer" }
    ]
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
    tips: ["Hardened steel nozzle is mandatory for carbon/glass-filled filament.", "Keep spare nozzles, PTFE and a build sheet on hand — they're consumables."],
    shopLinks: [
      { label: "Brass 0.4mm nozzles", query: "0.4mm brass nozzle mk8 assortment" },
      { label: "Hardened steel nozzles", query: "hardened steel nozzle 0.4mm" },
      { label: "Capricorn PTFE tube", query: "capricorn ptfe bowden tube 1.75mm" },
      { label: "Nozzle cleaning needles", query: "0.4mm nozzle cleaning needles" }
    ]
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
    fixes: ["Raise bed temp 5–10 °C", "Add a brim or raft", "Enclose the printer / block draughts", "Clean the plate + glue stick", "Reduce first-layer fan to 0%"],
    shopLinks: [
      { label: "Elmer's purple glue stick", query: "elmer's purple glue stick 3 pack" },
      { label: "Magigoo adhesive", query: "magigoo 3d printing adhesive" }
    ]
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
    fixes: ["Cold/atomic pull", "Improve hotend fan / reduce retraction", "Re-seat or replace PTFE tube", "Use a cleaning needle/filament", "Replace the nozzle if blocked solid"],
    shopLinks: [
      { label: "Cleaning needles", query: "0.4mm nozzle cleaning needles" },
      { label: "Spare nozzles", query: "0.4mm brass nozzle mk8 assortment" },
      { label: "Capricorn PTFE tube", query: "capricorn ptfe bowden tube 1.75mm" }
    ]
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
  { term: "Heat creep", def: "Heat travelling too far up the hotend, softening filament early and causing jams." },
  { term: "FDM", def: "Fused Deposition Modeling — the filament-melting style of printing (vs resin/SLA). 95% of hobby printers." },
  { term: "CoreXY", def: "A motion system where two motors drive X+Y together. Faster, more accurate than bed-slingers. Voron, Bambu X1, Prusa XL." },
  { term: "Bed slinger", def: "Cartesian printer where the bed moves on the Y-axis. Cheaper, simpler, slightly less precise at speed. Ender 3, Prusa Mk-series." },
  { term: "Delta", def: "Three-arm tower printer with a single floating effector. Fast circular motion, hard to upgrade." },
  { term: "Input shaping", def: "Firmware feature that cancels printer vibrations, letting you print 2–3× faster without ringing/ghosting." },
  { term: "Pressure advance", def: "Klipper's name for Linear Advance — same idea, sharpens corners by pre-compensating nozzle pressure." },
  { term: "ABL / Auto bed levelling", def: "Probe scans the bed before printing and adjusts Z per-point. BLTouch, inductive, strain-gauge." },
  { term: "Klipper", def: "Open-source printer firmware that runs on a Raspberry Pi. Faster motion, better tuning, configurable in plain text." },
  { term: "Voron", def: "An open-source CoreXY printer family you self-source and build. The hobby's gold standard for performance." },
  { term: "AMS / MMU", def: "Auto Material System (Bambu) / Multi-Material Unit (Prusa) — automated filament swappers for multi-colour printing." },
  { term: "First layer", def: "Make-or-break — if it sticks well and doesn't squish too thin, your print succeeds. Always watch it." },
  { term: "Ghosting / Ringing", def: "Echo-like ripples in walls after sharp corners, caused by vibration. Fix with belt tension or input shaping." },
  { term: "Stringing", def: "Thin filament strands between parts caused by oozing during travel. Fix with retraction or temp tuning." }
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

/* ---------- TIPS (rotated daily on Home) ---------- */
DB.tips = [
  "Clean your build plate before every print with soap and warm water — skin oils are the #1 cause of first-layer failures.",
  "Calibrate your filament with a temperature tower the first time you open a new spool. Five minutes saves ten failed prints.",
  "Print walls before infill: 3–5 perimeters add more strength than cranking infill above 25 %.",
  "Drying filament fixes 70 % of mystery stringing problems. PETG and nylon especially.",
  "Orient parts so load pulls *along* layers, not perpendicular to them — layer adhesion is the weakest axis.",
  "PLA softens at 50–55 °C. Never leave a PLA print in a hot car.",
  "Hardened-steel nozzle is mandatory for carbon-fibre or glass-fibre filaments. Brass wears out in days.",
  "A small chamfer on the base of any printed part stops elephant's-foot bulge and looks more pro.",
  "Print supports in tree mode for organic shapes — less material, easier to remove, prettier underside.",
  "Slow the first layer to 50 % of normal speed. Everything after depends on that one layer.",
  "Brim = adhesion. Raft = adhesion *and* a flat surface under a warpy print.",
  "OrcaSlicer has built-in calibration tests for any printer. One click each, run them once.",
  "PETG over-extrudes by default — try flow 95 % before raising the nozzle temp.",
  "For watertight prints, use 5+ walls and vase mode for tall vessels.",
  "If a print warps in the corners, raise the bed temp by 5 °C and disable first-layer fan.",
  "M3 heat-set inserts are the hobby standard. Buy a 100-piece assortment once, you'll use them forever.",
  "Lock-tite blue (242) on threaded inserts holds bolts tight without permanently bonding them.",
  "A drop of CA glue + accelerator joins prints in 3 seconds. Epoxy fills gaps but takes 5+ minutes.",
  "Acetone vapor smoothing only works on ABS / ASA. PLA needs solvent-free finishing (sanding + filler primer).",
  "Don't iron over text or fine details — the ironing pass blurs them. Use it on flat top surfaces only.",
  "Tolerance test print is the single most useful download — print one for every printer + filament combo.",
  "PETG sticks too well to PEI. Add a glue-stick release layer or raise Z-offset slightly to protect the plate.",
  "Print orientation matters more than infill for strength. Rotate the model 90° and a weak print becomes tough.",
  "Vase mode (spiralize) turns a one-wall print into a watertight cup in minutes. Great for planters.",
  "Keep filament in vacuum bags with rechargeable silica. Reduces stringing AND extends print quality on every spool."
];

/* ---------- DAILY CHALLENGES — rotated by day-of-year ---------- */
DB.challenges = [
  { emoji: "⛵", text: "Print a Benchy and time it — your baseline for every tune from here on." },
  { emoji: "🌡️", text: "Run a temp tower on your current filament. Lock in the lowest temp that still bonds." },
  { emoji: "🧵", text: "Run a retraction tower. Stringing is the #1 print-quality killer." },
  { emoji: "📏", text: "Print a 20mm calibration cube and measure with calipers. Adjust steps/mm if off." },
  { emoji: "🌳", text: "Try tree supports on something with an overhang — way easier to remove." },
  { emoji: "🧊", text: "Slice the same model with 3 different infill patterns. Pick the strongest you'll use." },
  { emoji: "🎨", text: "Try a 2-color print (manual filament swap mid-print). The simplest upgrade you can make." },
  { emoji: "🔁", text: "Print a useful tool for your printer (filament guide, fan duct, drawer)." },
  { emoji: "🧽", text: "Do a cold pull tonight. Resolves 80% of mystery extrusion issues." },
  { emoji: "🪛", text: "Tighten one belt and re-check belt tension on all axes. Quietest fix for ringing." },
  { emoji: "🧪", text: "Try one new filament brand this week. Note the temp & flow that worked." },
  { emoji: "🧩", text: "Design or print a snap-fit joint. Real engineering skill, instant payoff." },
  { emoji: "🏗️", text: "Try vase mode (spiralize) on a single-wall cup or planter." },
  { emoji: "📐", text: "Calibrate your e-steps with the 100mm extrusion test." },
  { emoji: "🌀", text: "Try a different layer height (0.12 or 0.28) and compare quality vs. time." },
  { emoji: "🪞", text: "Print a small Voron Cube or Klipper logo — earn your bragging rights." },
  { emoji: "🔥", text: "Run a flow calibration cube. Top-layer perfection starts here." },
  { emoji: "📷", text: "Photograph one finished print well-lit. Build the portfolio." },
  { emoji: "💡", text: "Lube your Z lead-screw with PTFE. Quieter, smoother, longer-lived." },
  { emoji: "🎁", text: "Print someone a gift. The best feedback loop in 3D printing." }
];


/* ---------- BEGINNER HUB ---------- */
DB.beginnerSteps = [
  {
    title: "Understand the basics",
    summary: "Know what you're getting into before you spend a dime.",
    points: [
      "FDM (filament): cheap, easy, makes functional & display parts — start here.",
      "Resin (SLA/DLP): gorgeous detail, messy chemicals — minis & jewellery.",
      "A print is a model → sliced into G-code → printed layer by layer.",
      "Expect to tinker. The first week is part assembly, part learning."
    ],
    link: { route: "glossary", label: "Read the glossary" }
  },
  {
    title: "Pick your first printer",
    summary: "Match the printer class to what you want to print.",
    points: [
      "PLA & PETG only? An entry-level open-frame is perfect (Bambu A1, Ender 3 V3, Anycubic Kobra).",
      "Want ABS, ASA or fast quality prints? Get an enclosed CoreXY (Bambu P1S, Sovol SV08).",
      "Engineering nylons / PC / carbon-fibre? You need a 300 °C+ enclosed pro (Bambu X1C, Prusa MK4S, Voron).",
      "Buy from a reputable brand with active community support — saves you weeks of frustration."
    ],
    link: { route: "compat", label: "See the compatibility matrix" }
  },
  {
    title: "Set it up properly",
    summary: "Get bed level, Z-offset, and first layer dialled before printing anything ambitious.",
    points: [
      "Build the printer slowly, following every step. Loose belts/screws cause weeks of mystery problems.",
      "Run the printer's auto-level / mesh and tune Z-offset on a first-layer test square.",
      "Clean the build plate with soap & water or IPA before every print at first.",
      "Print the included test model — it's pre-tuned for your machine."
    ],
    link: { route: "guides", label: "Open the leveling & first-layer guide" }
  },
  {
    title: "Install a slicer",
    summary: "The software that turns models into G-code.",
    points: [
      "Bambu printer → Bambu Studio (or OrcaSlicer, which is more powerful).",
      "Prusa printer → PrusaSlicer.",
      "Anything else → OrcaSlicer or Cura.",
      "Pick the matching printer + filament profile, then change as little as possible at first."
    ],
    link: { route: "tools", label: "Browse slicers & tools" }
  },
  {
    title: "Print your first model",
    summary: "Start with something small, flat-bottomed and support-free.",
    points: [
      "Calibration cube, 3DBenchy, or a coaster — all good starters.",
      "Use PLA, 0.2 mm layer height, 15 % infill, 3 walls.",
      "Watch the first few layers. Squished-but-not-gappy lines = perfect.",
      "Let the bed cool before removing — parts pop off easier."
    ],
    link: { route: "models", label: "Find models to print" }
  },
  {
    title: "Calibrate for your filament",
    summary: "Each spool prints slightly differently — a few tests save hours later.",
    points: [
      "Temperature tower (find the cleanest temp for that brand).",
      "Retraction tower (eliminate stringing).",
      "Flow / extrusion-multiplier test (fix over/under-extrusion).",
      "OrcaSlicer has these built-in — one click each."
    ],
    link: { route: "fix", label: "Diagnose any issues" }
  },
  {
    title: "Stay safe",
    summary: "Boring but real — don't skip this.",
    points: [
      "Print ABS/ASA/Nylon in a ventilated room — fumes are unpleasant.",
      "PLA is the safest filament for living spaces.",
      "Hotend is 200 °C+. The bed gets to 100 °C. Don't touch mid-print.",
      "Never leave a first print of the day unattended — fire is rare but real."
    ],
    link: null
  },
  {
    title: "Join the community",
    summary: "The fastest way to learn is to ask people who've already broken everything.",
    points: [
      "r/3Dprinting and r/FixMyPrint — huge Reddit communities, post photos of failed prints.",
      "Printer-specific subreddits & Discords (Bambu, Prusa, Voron, etc.).",
      "YouTube: CHEP, Maker's Muse, 3D Printing Nerd, Thomas Sanladerer.",
      "Don't be afraid to ask 'beginner' questions — everyone was new once."
    ],
    link: null
  }
];

/* ---------- TOOLS (software) ---------- */
DB.toolCategories = [
  {
    name: "AI 3D Generators",
    emoji: "🪄",
    intro: "Generate 3D models from a text prompt or a photo. Great for ideas — clean up the mesh before printing.",
    items: [
      { name: "Meshy",      url: "https://www.meshy.ai",         desc: "Text-to-3D and image-to-3D. Free tier, then paid credits." },
      { name: "Tripo3D",    url: "https://www.tripo3d.ai",       desc: "Fast AI mesh generation from a single image or prompt." },
      { name: "CSM",        url: "https://www.csm.ai",           desc: "Common Sense Machines — image/video to 3D, more control over geometry." }
    ]
  },
  {
    name: "CAD & Modelling",
    emoji: "📐",
    intro: "Design parts that fit real-world dimensions. Start with Tinkercad, graduate to Onshape or Fusion 360.",
    items: [
      { name: "Tinkercad",     url: "https://www.tinkercad.com",                            desc: "Browser-based, free, drag-and-drop. Best beginner CAD." },
      { name: "Onshape",       url: "https://www.onshape.com",                              desc: "Pro-grade parametric CAD in the browser. Free for hobby/public use." },
      { name: "Fusion 360",    url: "https://www.autodesk.com/products/fusion-360/overview", desc: "Industry-standard CAD/CAM. Free personal-use licence." },
      { name: "FreeCAD",       url: "https://www.freecad.org",                              desc: "Fully open-source parametric CAD." },
      { name: "Blender",       url: "https://www.blender.org",                              desc: "Free, powerful, more artistic / sculpt-focused." },
      { name: "Plasticity",    url: "https://www.plasticity.xyz",                           desc: "Modern indie CAD aimed at product/industrial design." }
    ]
  },
  {
    name: "Slicers",
    emoji: "🔪",
    intro: "Pick one matched to your printer. They all do the same job; differ in features and presets.",
    items: [
      { name: "OrcaSlicer",     url: "https://github.com/SoftFever/OrcaSlicer",                desc: "Most popular community slicer. Built-in calibration tests. Works with almost any printer." },
      { name: "PrusaSlicer",    url: "https://www.prusa3d.com/page/prusaslicer_424",           desc: "Polished, stable, brilliant for Prusa machines and anything else." },
      { name: "Bambu Studio",   url: "https://bambulab.com/en/download/studio",                desc: "Official slicer for Bambu Lab printers. Tight integration with AMS." },
      { name: "UltiMaker Cura", url: "https://ultimaker.com/software/ultimaker-cura",          desc: "Long-standing slicer with a giant plugin ecosystem." },
      { name: "SuperSlicer",    url: "https://github.com/supermerill/SuperSlicer",             desc: "PrusaSlicer fork with extra advanced controls." },
      { name: "Chitubox",       url: "https://www.chitubox.com",                               desc: "For resin printers — the de-facto resin slicer." }
    ]
  },
  {
    name: "Mesh repair & utilities",
    emoji: "🛠️",
    intro: "Fix broken STLs, hollow models, scale, photo-to-print conversions.",
    items: [
      { name: "Netfabb (Online)", url: "https://www.formware.co/onlinestlrepair", desc: "Browser STL repair — fast triangle fixer." },
      { name: "3D Builder",       url: "",                                       desc: "Free Windows app — quick mesh fixes & basic edits. Search 'Microsoft 3D Builder' in the Microsoft Store." },
      { name: "Blender",          url: "https://www.blender.org",                desc: "Heavy-duty mesh cleanup, sculpting, decimation." }
    ]
  },
  {
    name: "Photos → Prints",
    emoji: "🖼️",
    intro: "Turn a photo into a printable physical object.",
    items: [
      { name: "3dp.rocks Lithophane", url: "https://3dp.rocks/lithophane",       desc: "Turn any photo into a printable lithophane (transparency-based picture)." },
      { name: "ItsLitho",             url: "https://itslitho.com",               desc: "Curved & shaped lithophanes — cylinders, hearts, lampshades." }
    ]
  }
];

/* ---------- PRINTER ↔ FILAMENT COMPATIBILITY ---------- */
DB.compat = {
  legend: { yes: "✅ Works great", maybe: "⚠️ Needs mods", no: "❌ Won't print" },
  filaments: ["PLA", "PETG", "TPU", "ABS/ASA", "Nylon", "PC", "CF/GF"],
  classes: [
    {
      name: "Entry-level FDM",
      detail: "Open frame · ~210–260 °C nozzle · Direct-drive optional",
      examples: "Creality Ender 3 V3, Anycubic Kobra 2, Bambu A1 / A1 mini, Sovol SV06",
      caps: { PLA:"yes", PETG:"yes", TPU:"maybe", "ABS/ASA":"maybe", Nylon:"no", PC:"no", "CF/GF":"maybe" },
      notes: [
        "Add an enclosure + glue stick to try ABS, but expect warping.",
        "CF/GF blends require a hardened-steel nozzle — brass wears out fast.",
        "TPU prints best on direct-drive; very slow on Bowden."
      ]
    },
    {
      name: "Enclosed CoreXY",
      detail: "Enclosed · ~280–300 °C nozzle · Heated bed 100 °C+",
      examples: "Bambu P1P / P1S, Sovol SV08, Elegoo Centauri Carbon, Anycubic Kobra 3 Combo",
      caps: { PLA:"yes", PETG:"yes", TPU:"yes", "ABS/ASA":"yes", Nylon:"maybe", PC:"maybe", "CF/GF":"yes" },
      notes: [
        "Swap to a hardened or wear-resistant nozzle for CF/GF/glow filaments.",
        "Dry Nylon/PC before printing — these are very moisture-sensitive.",
        "Crack the door for PLA in a warm enclosure to keep cooling effective."
      ]
    },
    {
      name: "Pro / Engineering",
      detail: "Enclosed · 300 °C+ · Hardened hotend · Heated chamber on some",
      examples: "Bambu X1C, Prusa XL / MK4S, Voron 2.4, Qidi X-Max 3, Raise3D Pro",
      caps: { PLA:"yes", PETG:"yes", TPU:"yes", "ABS/ASA":"yes", Nylon:"yes", PC:"yes", "CF/GF":"yes" },
      notes: [
        "A genuine heated chamber unlocks PC and high-temp blends without warping.",
        "Run a hardened nozzle full-time if you swap to abrasives often.",
        "Filament dry box / dryer is essential at this level."
      ]
    },
    {
      name: "Resin (SLA / MSLA)",
      detail: "Photopolymer resin · UV-cured · No filament at all",
      examples: "Elegoo Mars / Saturn, Anycubic Photon Mono, Phrozen Sonic Mini",
      caps: { PLA:"no", PETG:"no", TPU:"no", "ABS/ASA":"no", Nylon:"no", PC:"no", "CF/GF":"no" },
      notes: [
        "Different world — uses liquid resin & UV light, not filament.",
        "Best for minis, jewellery, ultra-detailed art. Needs gloves, mask, ventilation.",
        "Standard, tough, flexible, water-washable & dental resins all exist."
      ]
    }
  ]
};

/* ---------- SHOP (Amazon search links — never go dead, no affiliate) ---------- */
/* Search-URL pattern is intentional: it always returns current best-matches and
   you can plug in your own affiliate tag later via DB.shop.affiliateTag.        */
DB.shop = {
  region: "com",                  // change to co.uk / de / ca / etc. for your market
  affiliateTag: "coreyfalls-20",  // Amazon Associates tracking ID, appended as &tag=
  note: "As an Amazon Associate, Printora earns from qualifying purchases. Links open live Amazon search results.",
  categories: [
    {
      name: "Recommended Starter Kit",
      emoji: "⭐",
      intro: "Buy these 10 things and you're set up for your first 6 months of printing.",
      items: [
        { name: "1. Bambu A1 mini (starter printer)",     query: "bambu lab a1 mini 3d printer" },
        { name: "2. PLA filament — 5-pack assorted",      query: "pla filament 1.75mm 5 pack" },
        { name: "3. Digital calipers (6\")",              query: "digital calipers 150mm stainless" },
        { name: "4. Print removal scraper",                query: "3d print removal scraper spatula" },
        { name: "5. Elmer's purple glue stick (3-pack)",   query: "elmer's purple glue stick 3 pack" },
        { name: "6. Flush cutters",                        query: "flush cutters wire side cutter" },
        { name: "7. Metric hex / Allen key set",           query: "metric hex key set ball end" },
        { name: "8. Nozzle cleaning needle set",           query: "0.4mm nozzle cleaning needles set" },
        { name: "9. Isopropyl alcohol 99 % (bed cleaner)", query: "isopropyl alcohol 99 percent quart" },
        { name: "10. Sunlu S2 filament dryer",             query: "sunlu filament dryer s2" }
      ]
    },
    {
      name: "Filament",
      emoji: "🧵",
      intro: "PLA is the safe default — start there, branch out once your first prints stick.",
      items: [
        { name: "Bambu PLA Basic (premium brand)", query: "bambu lab pla basic filament" },
        { name: "PLA filament (1.75 mm)",        query: "pla filament 1.75mm" },
        { name: "PLA multi-colour 6-pack",       query: "pla filament 1.75mm multi color 6 pack" },
        { name: "PLA+ / tough PLA",              query: "pla plus filament 1.75mm" },
        { name: "Silk PLA (shiny finish)",       query: "silk pla filament 1.75mm" },
        { name: "PETG filament",                 query: "petg filament 1.75mm" },
        { name: "TPU 95A (flexible)",            query: "tpu filament 95a 1.75mm" },
        { name: "ABS filament",                  query: "abs filament 1.75mm" },
        { name: "ASA (UV-stable, outdoor)",      query: "asa filament 1.75mm" },
        { name: "Carbon-fibre PETG/PLA",         query: "carbon fiber pla filament 1.75mm" },
        { name: "Wood-fill PLA",                 query: "wood filament 1.75mm pla" }
      ]
    },
    {
      name: "Nozzles & hotend parts",
      emoji: "🔥",
      intro: "Brass is cheap and great for PLA/PETG. Switch to hardened steel before printing carbon-fibre or it'll grind your nozzle smooth.",
      items: [
        { name: "Brass 0.4 mm nozzles (assorted)", query: "0.4mm brass nozzle mk8 assortment" },
        { name: "Hardened steel nozzles (CF/GF)",  query: "hardened steel nozzle 0.4mm" },
        { name: "Bambu hotend assembly (spare)",   query: "bambu lab hotend assembly" },
        { name: "Capricorn PTFE tube (Bowden)",    query: "capricorn ptfe bowden tube 1.75mm" },
        { name: "Silicone hotend sock",            query: "silicone hotend sock v6 mk8" },
        { name: "Nozzle cleaning needles",         query: "0.4mm nozzle cleaning needles" }
      ]
    },
    {
      name: "Build plates & adhesion",
      emoji: "🧲",
      intro: "A textured PEI plate solves 80% of first-layer problems. Keep a glue stick around for PETG.",
      items: [
        { name: "PEI textured spring-steel sheet", query: "pei textured spring steel build plate" },
        { name: "Smooth PEI sheet",                query: "smooth pei spring steel build plate" },
        { name: "Bambu textured PEI plate",        query: "bambu lab textured pei build plate" },
        { name: "Glue stick (Elmer's purple)",     query: "elmer's purple glue stick" },
        { name: "Magigoo / 3DLAC adhesive",        query: "magigoo 3d printing adhesive" },
        { name: "Hairspray (Aqua Net)",            query: "aqua net hairspray 3d printing" }
      ]
    },
    {
      name: "Tools — daily essentials",
      emoji: "🧰",
      intro: "These five — calipers, hex keys, scraper, flush cutters, tweezers — handle 95% of every-print tasks.",
      items: [
        { name: "Digital calipers (6\")",          query: "digital calipers 150mm stainless" },
        { name: "Metric hex / Allen key set",      query: "metric hex key set ball end" },
        { name: "Print removal scraper / spatula", query: "3d print removal scraper spatula" },
        { name: "Deburring tool",                  query: "deburring tool with blades" },
        { name: "Precision tweezers (anti-static)",query: "anti static precision tweezers set" },
        { name: "Flush cutters",                   query: "flush cutters wire side cutter" },
        { name: "Needle-nose pliers (mini)",       query: "mini needle nose pliers electronics" },
        { name: "Print monitoring camera (Wyze)",  query: "wyze cam v3 indoor camera" },
        { name: "Microfiber cleaning cloths",      query: "microfiber cleaning cloth pack" }
      ]
    },
    {
      name: "Joining & finishing",
      emoji: "🔩",
      intro: "Heat-set brass inserts are the difference between a hobby print and a real product. CA + accelerator beats hot glue every time.",
      items: [
        { name: "M3 / M4 heat-set inserts",        query: "m3 m4 heat set inserts brass" },
        { name: "Insert installation tip (iron)",  query: "soldering iron heat set insert tip" },
        { name: "Cyanoacrylate (super glue + accelerator)", query: "starbond cyanoacrylate super glue accelerator" },
        { name: "5-minute epoxy",                  query: "5 minute epoxy 2 part" },
        { name: "Acetone (ABS welding / smoothing)", query: "100% pure acetone gallon" },
        { name: "Sandpaper assortment (120–2000)", query: "wet dry sandpaper assortment 120 2000" },
        { name: "Filler primer (rattle can)",      query: "rust-oleum filler primer" },
        { name: "Loctite blue 242 (thread locker)",query: "loctite 242 blue threadlocker" }
      ]
    },
    {
      name: "Filament care & storage",
      emoji: "🌡️",
      intro: "Wet filament is the #1 quality killer. A dryer pays for itself within weeks of buying PETG, TPU, or nylon.",
      items: [
        { name: "Filament dryer — Sunlu S2 (1-spool)",   query: "sunlu filament dryer s2" },
        { name: "Filament dryer — Sunlu S4 (4-spool)",   query: "sunlu s4 filament dryer 4 spool" },
        { name: "Eibos Cyclopes / Polymaker PolyDryer",  query: "eibos cyclopes filament dryer" },
        { name: "Vacuum bags + pump",              query: "filament vacuum storage bags" },
        { name: "Rechargeable silica gel",         query: "rechargeable silica gel desiccant" },
        { name: "Hygrometer",                      query: "mini digital hygrometer" }
      ]
    },
    {
      name: "Safety",
      emoji: "🦺",
      intro: "ABS fumes, sanded plastic dust, and resin all want into your lungs. A few cheap items here saves a lifetime of regret.",
      items: [
        { name: "N95 / N99 mask (sanding & resin)", query: "n95 respirator mask" },
        { name: "Nitrile gloves (resin)",           query: "nitrile gloves 7mil" },
        { name: "Isopropyl alcohol 99%",            query: "isopropyl alcohol 99 percent" },
        { name: "Smoke / fire alarm for shop",      query: "smoke detector wifi 10 year battery" }
      ]
    },
    {
      name: "Printers — entry recommendations",
      emoji: "🖨️",
      intro: "Best-in-class beginner printers. Bambu's A1 mini is the fastest path from \"unboxing\" to a working first print today.",
      items: [
        { name: "Bambu A1 mini (best beginner)",   query: "bambu lab a1 mini 3d printer" },
        { name: "Bambu A1",                        query: "bambu lab a1 3d printer" },
        { name: "Bambu A1 Combo (with AMS lite)",  query: "bambu lab a1 combo ams lite" },
        { name: "Bambu P1S (enclosed, mid)",       query: "bambu lab p1s 3d printer" },
        { name: "Bambu X1C (pro, all filaments)",  query: "bambu lab x1c carbon 3d printer" },
        { name: "Creality Ender 3 V3",             query: "creality ender 3 v3" },
        { name: "Anycubic Kobra 2 / 3",            query: "anycubic kobra 2" },
        { name: "Sovol SV06 / SV08",               query: "sovol sv06" }
      ]
    }
  ]
};


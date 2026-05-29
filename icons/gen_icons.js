#!/usr/bin/env node
// Generate PWA app icons from icon.svg using sharp.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const here = __dirname;
const svg = fs.readFileSync(path.join(here, "icon.svg"));

const targets = [
  { name: "icon-192.png",            size: 192, pad: 0 },
  { name: "icon-512.png",            size: 512, pad: 0 },
  // maskable: leave ~20% safe-zone padding on all sides
  { name: "icon-maskable-512.png",   size: 512, pad: 0.18 },
  { name: "apple-touch-icon.png",    size: 180, pad: 0 }
];

(async () => {
  for (const t of targets) {
    const inner = Math.round(t.size * (1 - 2 * t.pad));
    const inset = Math.round((t.size - inner) / 2);
    const inside = await sharp(svg, { density: 600 })
      .resize(inner, inner, { fit: "contain", background: { r: 42, g: 51, b: 64, alpha: 1 } })
      .png()
      .toBuffer();
    if (t.pad > 0) {
      await sharp({
        create: { width: t.size, height: t.size, channels: 4, background: { r: 42, g: 51, b: 64, alpha: 1 } }
      })
        .composite([{ input: inside, top: inset, left: inset }])
        .png()
        .toFile(path.join(here, t.name));
    } else {
      await sharp(inside).toFile(path.join(here, t.name));
    }
    const stat = fs.statSync(path.join(here, t.name));
    console.log(`wrote ${t.name} (${stat.size} bytes)`);
  }
})();

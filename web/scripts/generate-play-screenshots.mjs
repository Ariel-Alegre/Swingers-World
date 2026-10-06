import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = resolve(root, "play-store/source/screenshots");
const output = resolve(root, "play-store/ready/screenshots");

const slides = [
  {
    name: "01-discover.png",
    number: "01",
    es: {
      file: "160050",
      title: "Descubrí a tu ritmo",
      subtitle: "Explorá perfiles y elegí cuándo conectar.",
      y: 468,
    },
    en: {
      file: "160754",
      title: "Discover at your pace",
      subtitle: "Explore profiles and choose when to connect.",
      y: 468,
      translateSampleBio: true,
    },
  },
  {
    name: "02-chat.png",
    number: "02",
    es: {
      file: "160224",
      title: "Conversaciones privadas",
      subtitle: "Un espacio para hablar con quien te interesa.",
      y: 468,
    },
    en: {
      file: "160730",
      title: "Private conversations",
      subtitle: "A space to talk to people you like.",
      y: 468,
      // Hide an old Spanish test message. The remaining English message and
      // all app controls are left untouched.
      hideSpanishTestMessage: true,
    },
  },
  {
    name: "03-privacy.png",
    number: "03",
    es: {
      file: "160556",
      title: "Tu perfil, tus reglas",
      subtitle: "Elegí cómo se muestran tu perfil y tus fotos.",
      y: 468,
    },
    en: {
      file: "160635",
      title: "Your profile, your rules",
      subtitle: "Choose how your profile and photos appear.",
      y: 468,
    },
  },
  {
    name: "04-profile.png",
    number: "04",
    es: {
      file: "163022",
      title: "Conocé cada perfil",
      subtitle: "Explorá intereses y pedí acceso a fotos.",
      y: 468,
    },
    en: {
      file: "162844",
      title: "Get to know each profile",
      subtitle: "Explore interests and request photo access.",
      y: 468,
      translateProfileBioToEnglish: true,
    },
  },
];

const escapeXml = (value) =>
  value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character],
  );

function background(slide, copy) {
  const title = escapeXml(copy.title);
  const subtitle = escapeXml(copy.subtitle);
  return Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#170c1b"/>
        <stop offset=".48" stop-color="#0d0812"/>
        <stop offset="1" stop-color="#201020"/>
      </linearGradient>
      <radialGradient id="glow"><stop stop-color="#e41a78" stop-opacity=".26"/><stop offset="1" stop-color="#e41a78" stop-opacity="0"/></radialGradient>
      <linearGradient id="accent"><stop stop-color="#f0c477"/><stop offset="1" stop-color="#f02c86"/></linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <circle cx="998" cy="254" r="520" fill="url(#glow)"/>
    <circle cx="5" cy="1660" r="470" fill="url(#glow)" opacity=".56"/>
    <path d="M82 85h64" stroke="url(#accent)" stroke-width="5" stroke-linecap="round"/>
    <text x="82" y="125" fill="#f3be73" font-family="Arial,sans-serif" font-size="23" font-weight="700" letter-spacing="8">SWINGERS WORLD</text>
    <text x="82" y="244" fill="#fff5ee" font-family="Arial,sans-serif" font-size="65" font-weight="700" letter-spacing="-2">${title}</text>
    <text x="84" y="308" fill="#d4bfcb" font-family="Arial,sans-serif" font-size="31">${subtitle}</text>
    <path d="M84 355h128" stroke="url(#accent)" stroke-width="7" stroke-linecap="round"/>
    <text x="966" y="127" fill="#ffffff" opacity=".17" text-anchor="end" font-family="Arial,sans-serif" font-size="90" font-weight="700">${slide.number}</text>
    <text x="540" y="1900" fill="#a991a5" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" letter-spacing="3">SWINGERS WORLD</text>
  </svg>`);
}

async function render(slide, locale) {
  const copy = slide[locale];
  const file = resolve(source, locale, `Captura de pantalla 2026-10-05 ${copy.file}.png`);
  let screenshot = sharp(file).ensureAlpha();
  const meta = await screenshot.metadata();
  if (copy.hideSpanishTestMessage) {
    // Source 160730: the Spanish bubble sits above the English one.
    const cover = Buffer.from(`<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg"><rect x="466" y="996" width="338" height="106" fill="#100a14"/></svg>`);
    screenshot = sharp(await screenshot.composite([{ input: cover }]).png().toBuffer());
  }
  if (copy.translateSampleBio) {
    // The supplied English app capture still contains a Spanish example bio.
    // Translate only that example text; the app UI itself remains unchanged.
    const bio = Buffer.from(`<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg"><rect x="72" y="1054" width="385" height="43" fill="#1b121f"/><text x="78" y="1087" fill="#f8f1f3" font-family="Arial,sans-serif" font-size="22">We are professionals.</text></svg>`);
    screenshot = sharp(await screenshot.composite([{ input: bio }]).png().toBuffer());
  }
  if (copy.translateProfileBioToEnglish) {
    // The English profile screen still contains a Spanish sample bio.
    const bio = Buffer.from(`<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg"><rect x="65" y="815" width="330" height="45" fill="#130b16"/><text x="67" y="850" fill="#f8f1f3" font-family="Arial,sans-serif" font-size="24">We are professionals.</text></svg>`);
    screenshot = sharp(await screenshot.composite([{ input: bio }]).png().toBuffer());
  }
  // Every store slide uses the same portrait handset. Short captures get
  // unobtrusive app-colored space around them instead of a tablet-shaped frame.
  const width = 780;
  const height = 1340;
  const x = Math.round((1080 - width) / 2);
  const mask = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" rx="29" fill="white"/></svg>`);
  const image = await sharp(await screenshot.resize(width, height, { fit: "contain", background: "#0e0912" }).png().toBuffer())
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  const frame = Buffer.from(`<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#efc47a"/><stop offset=".43" stop-color="#5d394f"/><stop offset=".72" stop-color="#d26092"/><stop offset="1" stop-color="#43253c"/></linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#08060a"/><stop offset=".5" stop-color="#19101d"/><stop offset="1" stop-color="#08060a"/></linearGradient>
    </defs>
    <rect x="${x - 30}" y="${copy.y + 176}" width="8" height="69" rx="4" fill="#735369"/>
    <rect x="${x - 30}" y="${copy.y + 266}" width="8" height="88" rx="4" fill="#735369"/>
    <rect x="${x + width + 22}" y="${copy.y + 222}" width="8" height="106" rx="4" fill="#735369"/>
    <rect x="${x - 25}" y="${copy.y - 29}" width="${width + 50}" height="${height + 58}" rx="58" fill="#050307" stroke="url(#rim)" stroke-width="5"/>
    <rect x="${x - 17}" y="${copy.y - 21}" width="${width + 34}" height="${height + 42}" rx="51" fill="url(#glass)" stroke="#49354a" stroke-width="2"/>
    <rect x="${x + width / 2 - 42}" y="${copy.y - 15}" width="84" height="6" rx="3" fill="#5d5360"/>
    <circle cx="${x + width / 2 + 72}" cy="${copy.y - 12}" r="5" fill="#514751"/>
    <rect x="${x + width / 2 - 49}" y="${copy.y + height + 11}" width="98" height="5" rx="2.5" fill="#6a5868"/>
  </svg>`);
  const final = resolve(output, locale === "es" ? "es-419" : "en-US", slide.name);
  await sharp(background(slide, copy))
    .composite([{ input: frame }, { input: image, left: x, top: copy.y }])
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(final);
  const bytes = (await stat(final)).size;
  if (bytes >= 8_000_000) throw new Error(`Image exceeds 8 MB: ${final}`);
  console.log(`${final} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
}

await Promise.all([mkdir(resolve(output, "es-419"), { recursive: true }), mkdir(resolve(output, "en-US"), { recursive: true })]);
for (const slide of slides) {
  await render(slide, "es");
  await render(slide, "en");
}

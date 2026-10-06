import Image from "next/image";
import Link from "next/link";

type Locale = "es" | "en";

const copy = {
  es: {
    nav: ["La experiencia", "Cómo funciona", "Privacidad"],
    contact: "Contacto",
    badge: "Comunidad para mayores de 18 años",
    title: "Conectá con personas que comparten tu mundo.",
    lead: "Swingers World es un espacio para adultos donde podés descubrir perfiles, iniciar conversaciones y conocer personas a tu ritmo.",
    explore: "Descubrí la experiencia",
    coming: "App para adultos · Próximamente en Google Play",
    art: "EXPLORÁ · CONVERSÁ · DECIDÍ",
    featureEyebrow: "UNA EXPERIENCIA A TU RITMO",
    featureTitle: "Más que deslizar perfiles.",
    featureLead: "Encontrar afinidad lleva más que un primer vistazo. Presentate, explorá y conversá con mayor contexto.",
    features: [
      ["01", "Descubrí perfiles", "Explorá personas y parejas, leé sus descripciones y elegí con quién querés conectar."],
      ["02", "Conversá a tu manera", "Iniciá chats y compartí mensajes, fotos o audios cuando quieras."],
      ["03", "Mantené el control", "Gestioná tu perfil, bloqueá usuarios y denunciá contenido o comportamientos inapropiados."],
    ],
    stepsEyebrow: "CÓMO FUNCIONA",
    stepsTitle: "Tu próxima conexión empieza con vos.",
    steps: [
      ["1", "Creá tu perfil", "Contá quién sos y qué tipo de conexión buscás."],
      ["2", "Explorá", "Descubrí perfiles y elegí a quién acercarte."],
      ["3", "Conversá", "Dá el siguiente paso solo cuando te sientas cómodo."],
    ],
    privacyEyebrow: "CLARIDAD DESDE EL PRINCIPIO",
    privacyTitle: "Tu espacio, tus decisiones.",
    privacyLead: "Podés revisar cómo tratamos tus datos, gestionar tus interacciones y solicitar la eliminación de tu cuenta. La app está destinada exclusivamente a adultos.",
    privacyLink: "Política de privacidad",
    childSafetyLink: "Seguridad infantil",
    deleteLink: "Eliminar mi cuenta",
    closeTitle: "Una comunidad para conectar a tu manera.",
    closeLead: "¿Tenés una consulta sobre Swingers World? Escribinos.",
    email: "Enviar un correo",
    adult: "Solo para mayores de 18 años.",
  },
  en: {
    nav: ["The experience", "How it works", "Privacy"],
    contact: "Contact",
    badge: "An adults-only community, 18+",
    title: "Connect with people who share your world.",
    lead: "Swingers World is a space for adults to discover profiles, start conversations, and meet people at their own pace.",
    explore: "Explore the experience",
    coming: "Adults-only app · Coming to Google Play",
    art: "EXPLORE · TALK · DECIDE",
    featureEyebrow: "AN EXPERIENCE AT YOUR PACE",
    featureTitle: "More than scrolling through profiles.",
    featureLead: "Finding a connection takes more than a first glance. Introduce yourself, explore, and talk with more context.",
    features: [
      ["01", "Discover profiles", "Explore people and couples, read their profiles, and choose who you want to connect with."],
      ["02", "Talk your way", "Start chats and share messages, photos, or voice notes when you choose."],
      ["03", "Stay in control", "Manage your profile, block users, and report inappropriate content or behavior."],
    ],
    stepsEyebrow: "HOW IT WORKS",
    stepsTitle: "Your next connection starts with you.",
    steps: [
      ["1", "Create your profile", "Share who you are and the connection you're looking for."],
      ["2", "Explore", "Discover profiles and choose who you'd like to approach."],
      ["3", "Start a conversation", "Take the next step only when you feel comfortable."],
    ],
    privacyEyebrow: "CLARITY FROM THE START",
    privacyTitle: "Your space, your decisions.",
    privacyLead: "You can review how we handle your data, manage your interactions, and request account deletion. The app is intended for adults only.",
    privacyLink: "Privacy policy",
    childSafetyLink: "Child safety",
    deleteLink: "Delete my account",
    closeTitle: "A community to connect your way.",
    closeLead: "Have a question about Swingers World? Write to us.",
    email: "Send an email",
    adult: "For adults aged 18 and over only.",
  },
} as const;

export function LandingPage({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const anchors = locale === "es" ? ["experiencia", "como-funciona", "privacidad"] : ["experience", "how-it-works", "privacy"];
  const privacyUrl = locale === "es" ? "/privacy" : "/privacy/en";
  const childSafetyUrl = locale === "es" ? "/child-safety" : "/child-safety/en";
  const deleteUrl = locale === "es" ? "/delete-account" : "/delete-account/en";
  const mail = "mailto:swingersworldinfo@gmail.com";

  return (
    <div className="landing" lang={locale}>
      <a className="landing-skip" href="#main">{locale === "es" ? "Ir al contenido" : "Skip to content"}</a>
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link className="landing-brand" href={locale === "es" ? "/" : "/en"} aria-label="Swingers World"><span className="landing-brand-mark">W</span><span>Swingers <em>World</em></span></Link>
          <nav className="landing-nav" aria-label={locale === "es" ? "Principal" : "Main"}>{t.nav.map((label, i) => <a key={label} href={`#${anchors[i]}`}>{label}</a>)}</nav>
          <div className="landing-header-actions">
            <nav className="landing-languages" aria-label={locale === "es" ? "Idioma" : "Language"}><Link href="/" hrefLang="es" aria-current={locale === "es" ? "page" : undefined}>ES</Link><span>/</span><Link href="/en" hrefLang="en" aria-current={locale === "en" ? "page" : undefined}>EN</Link></nav>
            <a className="landing-contact" href={mail}>{t.contact} <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="landing-hero">
          <div className="landing-hero-glow" aria-hidden="true" />
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <p className="landing-age"><span aria-hidden="true" />{t.badge}</p>
              <h1>{t.title}</h1>
              <p className="landing-lead">{t.lead}</p>
              <div className="landing-hero-actions"><a className="landing-button landing-button-primary" href={`#${anchors[0]}`}>{t.explore}<span aria-hidden="true">↗</span></a><a className="landing-button landing-button-secondary" href={mail}>{t.contact}</a></div>
              <p className="landing-coming">{t.coming}</p>
            </div>
            <div className="landing-hero-art">
              <div className="landing-orbit landing-orbit-one" aria-hidden="true" />
              <div className="landing-orbit landing-orbit-two" aria-hidden="true" />
              <div className="landing-art-card"><span className="landing-art-top">SWINGERS WORLD</span><Image src="/brand.png" alt="Swingers World" width={460} height={460} priority /><span className="landing-art-bottom">{t.art}</span></div>
              <span className="landing-spark landing-spark-a" aria-hidden="true">✦</span><span className="landing-spark landing-spark-b" aria-hidden="true">✦</span>
            </div>
          </div>
        </section>

        <section className="landing-section landing-experience" id={anchors[0]}>
          <div className="landing-section-head"><div><p className="landing-eyebrow">{t.featureEyebrow}</p><h2>{t.featureTitle}</h2></div><p>{t.featureLead}</p></div>
          <div className="landing-features">{t.features.map(([num, title, description]) => <article className="landing-feature" key={num}><span className="landing-feature-num">{num}</span><span className="landing-feature-symbol" aria-hidden="true">{num === "01" ? "◇" : num === "02" ? "✳" : "✦"}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
        </section>

        <section className="landing-section landing-steps" id={anchors[1]}>
          <div><p className="landing-eyebrow">{t.stepsEyebrow}</p><h2>{t.stepsTitle}</h2></div>
          <div className="landing-step-list">{t.steps.map(([num, title, description]) => <div className="landing-step" key={num}><span>{num}</span><h3>{title}</h3><p>{description}</p></div>)}</div>
        </section>

        <section className="landing-section landing-privacy" id={anchors[2]}>
          <div className="landing-privacy-panel"><span className="landing-privacy-star" aria-hidden="true">✳</span><div><p className="landing-eyebrow">{t.privacyEyebrow}</p><h2>{t.privacyTitle}</h2><p>{t.privacyLead}</p><div className="landing-privacy-links"><Link href={privacyUrl}>{t.privacyLink} ↗</Link><Link href={childSafetyUrl}>{t.childSafetyLink} ↗</Link><Link href={deleteUrl}>{t.deleteLink} ↗</Link></div></div></div>
        </section>

        <section className="landing-closing"><p className="landing-eyebrow">SWINGERS WORLD</p><h2>{t.closeTitle}</h2><p>{t.closeLead}</p><a className="landing-button landing-button-primary" href={mail}>{t.email}<span aria-hidden="true">↗</span></a></section>
      </main>
      <footer className="landing-footer"><div><div><span className="landing-footer-brand">Swingers <em>World</em></span><p>{t.adult}</p></div><nav aria-label={locale === "es" ? "Enlaces legales" : "Legal links"}><Link href={privacyUrl}>{t.privacyLink}</Link><Link href={childSafetyUrl}>{t.childSafetyLink}</Link><Link href={deleteUrl}>{t.deleteLink}</Link><a href={mail}>{t.contact}</a></nav><small>© {new Date().getFullYear()} Swingers World</small></div></footer>
    </div>
  );
}

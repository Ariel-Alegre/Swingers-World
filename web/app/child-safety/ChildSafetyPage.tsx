import Link from "next/link";
import { childSafetyContent, type ChildSafetyLocale } from "./content";

export function ChildSafetyPage({ locale }: { locale: ChildSafetyLocale }) {
  const content = childSafetyContent[locale];
  const emailHref = `mailto:swingersworldinfo@gmail.com?subject=${encodeURIComponent(content.reportSubject)}`;

  return (
    <div className="legal-shell" lang={locale}>
      <header className="legal-header">
        <Link className="legal-brand" href={locale === "es" ? "/" : "/en"} aria-label="Swingers World">
          Swingers <span>World</span>
        </Link>
        <nav className="language-nav" aria-label={locale === "es" ? "Idioma" : "Language"}>
          <Link href="/child-safety" hrefLang="es" aria-current={locale === "es" ? "page" : undefined}>Español</Link>
          <Link href="/child-safety/en" hrefLang="en" aria-current={locale === "en" ? "page" : undefined}>English</Link>
        </nav>
      </header>

      <main className="legal-main">
        <p className="legal-eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p className="legal-updated">{content.updated}</p>
        <p className="legal-intro">{content.intro}</p>

        <nav className="legal-contents" aria-label={content.contentsLabel}>
          <h2>{content.contentsLabel}</h2>
          <ol>
            {content.sections.map((section, index) => (
              <li key={section.title}><a href={`#section-${index + 1}`}>{section.title}</a></li>
            ))}
          </ol>
        </nav>

        {content.sections.map((section, index) => (
          <section className="legal-section" id={`section-${index + 1}`} key={section.title}>
            <h2>{index + 1}. {section.title}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}

        <a className="legal-action" href={emailHref}>{content.reportLabel}</a>
        <p className="legal-contact-address">swingersworldinfo@gmail.com</p>
      </main>

      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} Swingers World</span>
        <Link href={locale === "es" ? "/privacy" : "/privacy/en"}>{content.privacyLabel}</Link>
        <a href="mailto:swingersworldinfo@gmail.com">swingersworldinfo@gmail.com</a>
      </footer>
    </div>
  );
}

import Link from "next/link";

type Locale = "es" | "en";

const content = {
  es: {
    title: "Eliminar tu cuenta de Swingers World",
    intro:
      "Podés solicitar la eliminación de tu cuenta y de los datos asociados, incluso si ya no tenés acceso a la app. Este trámite no requiere una suscripción activa.",
    inAppTitle: "Desde la app",
    inAppSteps: [
      "Iniciá sesión en Swingers World.",
      "Abrí Cuenta y seleccioná Eliminar mi cuenta.",
      "Confirmá la eliminación siguiendo las indicaciones que aparecen en pantalla.",
    ],
    emailTitle: "Si no podés ingresar a la app",
    emailBody:
      "Escribinos desde el correo asociado a tu cuenta y solicitá la eliminación. Si ya no tenés acceso a ese correo, explicalo en el mensaje: podremos pedirte información razonable para verificar que la cuenta es tuya. No envíes tu contraseña ni documentos de identidad por email sin que te los solicitemos mediante un canal seguro.",
    emailAction: "Solicitar eliminación por email",
    emailSubject: "Solicitud de eliminación de cuenta - Swingers World",
    deletedTitle: "Qué datos se eliminan",
    deletedBody:
      "Al eliminar la cuenta, quitamos el perfil y los registros asociados que administra nuestro servidor, como mensajes e interacciones, solicitudes de fotos, notificaciones, bloqueos y reportes vinculados a la cuenta. También intentamos retirar las fotos almacenadas del perfil. Si pedís la eliminación por email, procesaremos la solicitud después de verificar tu identidad.",
    retainedTitle: "Datos que podrían conservarse",
    retainedBody:
      "Algunos datos pueden permanecer temporalmente en copias de seguridad o registros de seguridad, o conservarse cuando una obligación legal, una disputa o la prevención de abusos lo requiera. Los archivos compartidos en chats pueden requerir una solicitud adicional de eliminación. Las copias que otras personas hayan guardado y la información de compras conservada por Google Play, RevenueCat u otros proveedores se rigen también por sus propias políticas. Los plazos concretos dependen del tipo de dato y de la obligación o política aplicable; podés consultarnos por tu caso.",
    subscriptionTitle: "Tu suscripción",
    subscriptionBody:
      "Eliminar la cuenta no cancela automáticamente una suscripción. Si tenés una suscripción activa, cancelala por separado en Google Play antes de eliminar la cuenta para evitar futuros cargos.",
    privacy: "Política de privacidad",
    contact: "Contacto",
  },
  en: {
    title: "Delete your Swingers World account",
    intro:
      "You can request deletion of your account and associated data even if you can no longer access the app. An active subscription is not required.",
    inAppTitle: "In the app",
    inAppSteps: [
      "Sign in to Swingers World.",
      "Open Account and select Delete my account.",
      "Confirm deletion by following the on-screen instructions.",
    ],
    emailTitle: "If you cannot access the app",
    emailBody:
      "Email us from the address associated with your account and request deletion. If you no longer have access to that email address, explain this in your message; we may ask for reasonable information to verify that the account belongs to you. Do not email your password or identity documents unless we request them through a secure channel.",
    emailAction: "Request deletion by email",
    emailSubject: "Account deletion request - Swingers World",
    deletedTitle: "Data we delete",
    deletedBody:
      "When the account is deleted, we remove the profile and associated records managed by our server, including messages and interactions, photo requests, notifications, blocks, and reports linked to the account. We also attempt to remove stored profile photos. If you request deletion by email, we will process the request after verifying your identity.",
    retainedTitle: "Data that may be retained",
    retainedBody:
      "Some data may remain temporarily in backups or security logs, or be retained where required for legal obligations, disputes, or abuse prevention. Files shared in chats may require an additional deletion request. Copies saved by other people and purchase information retained by Google Play, RevenueCat, or other providers are also subject to their own policies. Specific retention periods depend on the data type and the applicable obligation or policy; you can contact us about your case.",
    subscriptionTitle: "Your subscription",
    subscriptionBody:
      "Deleting your account does not automatically cancel a subscription. If you have an active subscription, cancel it separately in Google Play before deleting your account to avoid future charges.",
    privacy: "Privacy policy",
    contact: "Contact",
  },
} as const;

export function DeleteAccountPage({ locale }: { locale: Locale }) {
  const copy = content[locale];
  const emailHref = `mailto:swingersworldinfo@gmail.com?subject=${encodeURIComponent(copy.emailSubject)}`;

  return (
    <div className="legal-shell" lang={locale}>
      <header className="legal-header">
        <Link className="legal-brand" href={locale === "es" ? "/" : "/en"} aria-label="Swingers World">
          Swingers <span>World</span>
        </Link>
        <nav className="language-nav" aria-label={locale === "es" ? "Idioma" : "Language"}>
          <Link href="/delete-account" hrefLang="es" aria-current={locale === "es" ? "page" : undefined}>Español</Link>
          <Link href="/delete-account/en" hrefLang="en" aria-current={locale === "en" ? "page" : undefined}>English</Link>
        </nav>
      </header>

      <main className="legal-main">
        <p className="legal-eyebrow">Swingers World</p>
        <h1>{copy.title}</h1>
        <p className="legal-intro">{copy.intro}</p>

        <section className="legal-section">
          <h2>{copy.inAppTitle}</h2>
          <ol className="legal-steps">
            {copy.inAppSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>

        <section className="legal-section">
          <h2>{copy.emailTitle}</h2>
          <p>{copy.emailBody}</p>
          <a className="legal-action" href={emailHref}>{copy.emailAction}</a>
          <p className="legal-contact-address">swingersworldinfo@gmail.com</p>
        </section>

        <section className="legal-section">
          <h2>{copy.deletedTitle}</h2>
          <p>{copy.deletedBody}</p>
        </section>

        <section className="legal-section">
          <h2>{copy.retainedTitle}</h2>
          <p>{copy.retainedBody}</p>
        </section>

        <section className="legal-section">
          <h2>{copy.subscriptionTitle}</h2>
          <p>{copy.subscriptionBody}</p>
        </section>
      </main>

      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} Swingers World</span>
        <span><Link href={locale === "es" ? "/privacy" : "/privacy/en"}>{copy.privacy}</Link></span>
        <span>{copy.contact}: <a href="mailto:swingersworldinfo@gmail.com">swingersworldinfo@gmail.com</a></span>
      </footer>
    </div>
  );
}

export type PrivacyLocale = "es" | "en";

type PrivacySection = {
  title: string;
  paragraphs: string[];
};

type PrivacyContent = {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  contentsLabel: string;
  contactLabel: string;
  sections: PrivacySection[];
};

export const privacyContent: Record<PrivacyLocale, PrivacyContent> = {
  es: {
    eyebrow: "Swingers World · Información legal",
    title: "Política de privacidad",
    updated: "Última actualización: 5 de octubre de 2026",
    intro: "Swingers World es una comunidad para personas adultas. Esta política explica qué información tratamos cuando usás la aplicación, por qué la necesitamos, con quién puede compartirse y cómo podés controlar tus datos. Tu perfil, preferencias y conversaciones pueden revelar información especialmente sensible: compartí solo lo que quieras hacer visible.",
    contentsLabel: "En esta página",
    contactLabel: "Consultas sobre privacidad",
    sections: [
      {
        title: "Responsable y contacto",
        paragraphs: [
          "El servicio se presenta bajo el nombre Swingers World. Si tenés preguntas sobre esta política o querés ejercer tus derechos sobre tus datos, escribinos a swingersworldinfo@gmail.com.",
        ],
      },
      {
        title: "Información que tratamos",
        paragraphs: [
          "Datos de cuenta: nombre, correo electrónico, credenciales protegidas, información de verificación y preferencias de idioma. También podemos tratar datos de cuentas creadas por el equipo de administración cuando corresponda.",
          "Datos de perfil: nombre visible, tipo de perfil individual o de pareja, descripción, intereses o preferencias, fotografías públicas o privadas y ciudad o ubicación proporcionada o autorizada por vos. Un perfil puede ser visible para otros miembros aunque todavía no esté completo.",
          "Actividad en la app: mensajes, imágenes y audios compartidos, solicitudes de acceso a fotos privadas, interacciones, bloqueos, reportes y respuestas de soporte. Tratamos datos técnicos como identificadores de cuenta y dispositivo, tokens de notificaciones, registros de seguridad y diagnóstico.",
          "Compras: Google Play y RevenueCat nos comunican identificadores y estado de las suscripciones para habilitar el acceso Premium. No recibimos el número completo de tu tarjeta de pago.",
        ],
      },
      {
        title: "Para qué usamos tus datos",
        paragraphs: [
          "Usamos la información para crear y proteger tu cuenta; mostrar perfiles y facilitar búsquedas, mensajes y solicitudes; aplicar tus controles de fotos privadas; gestionar acceso Premium; enviar notificaciones relacionadas con tu actividad; atender consultas, reportes y solicitudes de privacidad; prevenir abusos, fraude y accesos no autorizados; y cumplir las obligaciones legales que correspondan.",
          "No incluyas datos personales de otra persona en un perfil individual o de pareja sin su conocimiento y autorización.",
        ],
      },
      {
        title: "Qué pueden ver otras personas",
        paragraphs: [
          "Otros miembros pueden ver los datos que tu perfil muestra como públicos, incluidos nombre visible, descripción y fotos públicas. Las fotos privadas se muestran de acuerdo con las autorizaciones que otorgues. Los mensajes son visibles para sus participantes; algunos datos pueden revisarse cuando existe un reporte, un problema de seguridad o una obligación legal.",
          "Quien recibe contenido puede hacer capturas o copias fuera de la app. Ninguna configuración garantiza privacidad absoluta una vez que compartiste información con otra persona.",
        ],
      },
      {
        title: "Ubicación y permisos del dispositivo",
        paragraphs: [
          "Si permitís el acceso a la ubicación, podemos usar coordenadas o una ubicación aproximada para las funciones de descubrimiento. Cuando esté disponible, podés elegir una ubicación manual. Podés retirar el permiso desde los ajustes del dispositivo; algunas funciones basadas en ubicación podrían dejar de funcionar.",
          "La cámara, la galería y el micrófono se usan cuando elegís compartir fotos, imágenes o audios. Si aceptás las notificaciones, usamos un identificador del dispositivo para enviarte avisos de mensajes y actividad. Podés cambiar estos permisos en tu sistema operativo.",
        ],
      },
      {
        title: "Proveedores y transferencias",
        paragraphs: [
          "Para prestar el servicio utilizamos proveedores de alojamiento, almacenamiento de archivos, correo y notificaciones, además de Google Play y RevenueCat para las suscripciones. Cada proveedor recibe los datos necesarios para su función y puede procesarlos en otros países. También podemos comunicar información si una obligación legal lo exige o si resulta necesario para proteger la seguridad y los derechos de las personas.",
        ],
      },
      {
        title: "Conservación y eliminación",
        paragraphs: [
          "Conservamos los datos mientras la cuenta esté activa y, después, durante el tiempo necesario para seguridad, resolución de disputas y cumplimiento de obligaciones legales. Los plazos pueden variar según el tipo de dato y el proveedor; no conservamos necesariamente todos los datos durante el mismo período.",
          "Podés eliminar tu cuenta desde la sección Cuenta de la app o solicitar ayuda escribiendo a swingersworldinfo@gmail.com. El servidor elimina la cuenta y los registros asociados bajo su control. Los respaldos, registros de seguridad, archivos ya compartidos, copias hechas por otras personas y datos de compras conservados por las tiendas pueden permanecer durante más tiempo conforme a sus reglas y obligaciones aplicables. Eliminar la cuenta no cancela una suscripción: debés cancelarla por separado en la tienda donde la contrataste.",
        ],
      },
      {
        title: "Seguridad",
        paragraphs: [
          "Aplicamos medidas técnicas y organizativas razonables para proteger la información, como controles de acceso y protección de credenciales. Ningún sistema puede garantizar seguridad absoluta. Protegé tu contraseña y avisános si sospechás un acceso no autorizado.",
        ],
      },
      {
        title: "Tus opciones y derechos",
        paragraphs: [
          "Podés editar tu perfil, ajustar la visibilidad, retirar acceso a fotos privadas, bloquear a otras personas, retirar permisos del dispositivo y eliminar tu cuenta. También podés solicitar acceso, corrección, eliminación u otros derechos previstos por la ley aplicable escribiendo a swingersworldinfo@gmail.com. Podemos pedir información razonable para verificar tu identidad antes de responder.",
        ],
      },
      {
        title: "Personas menores de edad",
        paragraphs: [
          "Swingers World está destinado exclusivamente a personas de 18 años o más y no está dirigido a menores. Si detectamos una cuenta de una persona menor de edad, podemos suspenderla o eliminarla. Si creés que un menor proporcionó datos, contactanos para investigarlo.",
        ],
      },
      {
        title: "Cambios de esta política",
        paragraphs: [
          "Podemos actualizar esta política cuando cambien el servicio, las prácticas de datos o los requisitos aplicables. Publicaremos la versión vigente en esta página y actualizaremos la fecha indicada arriba. Si un cambio es importante, lo comunicaremos por medios razonables y pediremos una nueva confirmación cuando corresponda.",
        ],
      },
    ],
  },
  en: {
    eyebrow: "Swingers World · Legal information",
    title: "Privacy Policy",
    updated: "Last updated: October 5, 2026",
    intro: "Swingers World is a community for adults. This policy explains what information we process when you use the app, why we need it, who may receive it, and how you can control your data. Your profile, preferences, and conversations may reveal especially sensitive information: share only what you want others to see.",
    contentsLabel: "On this page",
    contactLabel: "Privacy questions",
    sections: [
      {
        title: "Operator and contact",
        paragraphs: [
          "The service is presented under the name Swingers World. For questions about this policy or requests concerning your data, email swingersworldinfo@gmail.com.",
        ],
      },
      {
        title: "Information we process",
        paragraphs: [
          "Account data: name, email address, protected credentials, verification information, and language preferences. We may also process information for accounts created by the administration team where applicable.",
          "Profile data: display name, individual or couple profile type, description, interests or preferences, public or private photos, and the city or location you provide or authorize. A profile may be visible to other members even if it is not yet complete.",
          "App activity: messages, shared images and audio, requests to access private photos, interactions, blocks, reports, and support responses. We process technical data such as account and device identifiers, notification tokens, security logs, and diagnostic information.",
          "Purchases: Google Play and RevenueCat provide subscription identifiers and status so we can enable Premium access. We do not receive your complete payment card number.",
        ],
      },
      {
        title: "How we use your data",
        paragraphs: [
          "We use information to create and protect accounts; display profiles and enable discovery, messages, and requests; enforce private-photo controls; manage Premium access; send activity-related notifications; respond to questions, reports, and privacy requests; prevent abuse, fraud, and unauthorized access; and comply with applicable legal obligations.",
          "Do not include another person's personal information in an individual or couple profile without their knowledge and permission.",
        ],
      },
      {
        title: "What other people can see",
        paragraphs: [
          "Other members may see information your profile displays publicly, including your display name, description, and public photos. Private photos are shown according to the permissions you grant. Messages are visible to their participants; some information may be reviewed following a report, a security issue, or a legal requirement.",
          "Recipients can take screenshots or make copies outside the app. No setting can guarantee absolute privacy after you share information with someone else.",
        ],
      },
      {
        title: "Location and device permissions",
        paragraphs: [
          "If you allow location access, we may use coordinates or an approximate location for discovery features. Where available, you can choose a manual location. You can withdraw permission in your device settings; some location-based features may then stop working.",
          "Camera, photo-library, and microphone access are used when you choose to share photos, images, or audio. If you allow notifications, we use a device identifier to send alerts about messages and activity. You can change these permissions in your operating system.",
        ],
      },
      {
        title: "Service providers and transfers",
        paragraphs: [
          "We use providers for hosting, file storage, email, and notifications, as well as Google Play and RevenueCat for subscriptions. Each provider receives the data needed for its function and may process it in other countries. We may also disclose information where required by law or necessary to protect people's safety and rights.",
        ],
      },
      {
        title: "Retention and deletion",
        paragraphs: [
          "We retain data while your account is active and afterward for as long as needed for security, dispute resolution, and legal obligations. Periods may differ by data type and provider; not all data is necessarily retained for the same period.",
          "You can delete your account in the app's Account section or request assistance at swingersworldinfo@gmail.com. The server deletes the account and associated records under its control. Backups, security logs, files already shared, copies made by others, and purchase data retained by stores may remain longer under their rules and applicable obligations. Deleting your account does not cancel a subscription; you must cancel it separately through the store where you bought it.",
        ],
      },
      {
        title: "Security",
        paragraphs: [
          "We apply reasonable technical and organizational measures to protect information, including access controls and credential protection. No system can guarantee absolute security. Protect your password and let us know if you suspect unauthorized access.",
        ],
      },
      {
        title: "Your choices and rights",
        paragraphs: [
          "You can edit your profile, adjust visibility, revoke private-photo access, block other people, withdraw device permissions, and delete your account. You may also request access, correction, deletion, or other rights available under applicable law by emailing swingersworldinfo@gmail.com. We may ask for reasonable information to verify your identity before responding.",
        ],
      },
      {
        title: "Children",
        paragraphs: [
          "Swingers World is intended only for people aged 18 or older and is not directed to minors. If we discover an account belonging to a minor, we may suspend or delete it. If you believe a minor has provided data, contact us so we can investigate.",
        ],
      },
      {
        title: "Changes to this policy",
        paragraphs: [
          "We may update this policy when the service, data practices, or applicable requirements change. We will post the current version here and update the date above. If a change is significant, we will communicate it by reasonable means and request renewed acknowledgment where required.",
        ],
      },
    ],
  },
};

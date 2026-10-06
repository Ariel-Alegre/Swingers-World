export type ChildSafetyLocale = "es" | "en";

type Section = {
  title: string;
  paragraphs: string[];
};

type ChildSafetyContent = {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  contentsLabel: string;
  reportLabel: string;
  reportSubject: string;
  privacyLabel: string;
  sections: Section[];
};

export const childSafetyContent: Record<ChildSafetyLocale, ChildSafetyContent> = {
  es: {
    eyebrow: "Swingers World · Estándares de la comunidad",
    title: "Estándares de seguridad infantil",
    updated: "Última actualización: 6 de octubre de 2026",
    intro: "Swingers World es una comunidad exclusiva para personas mayores de 18 años. Prohibimos cualquier forma de abuso y explotación sexual infantil y establecemos estas reglas para prevenirla, recibir denuncias y actuar ante posibles infracciones.",
    contentsLabel: "En esta página",
    reportLabel: "Denunciar un problema de seguridad infantil",
    reportSubject: "Denuncia de seguridad infantil - Swingers World",
    privacyLabel: "Política de privacidad",
    sections: [
      {
        title: "Acceso exclusivo para adultos",
        paragraphs: [
          "Las personas menores de 18 años no pueden crear una cuenta ni utilizar Swingers World. Prohibimos la suplantación de edad y los perfiles que representen a menores. Si recibimos información de que una cuenta pertenece a una persona menor de edad, revisamos el caso y podemos suspender o eliminar la cuenta.",
        ],
      },
      {
        title: "Tolerancia cero frente al abuso y la explotación sexual infantil",
        paragraphs: [
          "Prohibimos crear, solicitar, compartir, almacenar o distribuir material de abuso sexual infantil (CSAM), incluidas imágenes reales, manipuladas o generadas digitalmente. También prohibimos la captación de menores con fines sexuales, la extorsión sexual, la trata, el abuso y cualquier conducta que facilite la explotación sexual de niñas, niños o adolescentes.",
          "Estas prohibiciones se aplican a perfiles, fotografías, mensajes, audios y cualquier otra interacción en la app. No se permite promover, facilitar ni intentar encubrir estas conductas.",
        ],
      },
      {
        title: "Cómo denunciar",
        paragraphs: [
          "Dentro de la app, abrí el perfil de la persona involucrada, tocá el menú de opciones y elegí Denunciar. Podés seleccionar la opción de posible menor de edad o contenido inapropiado y aportar el contexto que resulte útil. También podés escribir a swingersworldinfo@gmail.com para comunicar una preocupación de seguridad infantil.",
          "Indicá, si es posible, el perfil involucrado y qué ocurrió. No descargues, reenvíes ni adjuntes material de abuso sexual infantil para hacer una denuncia. Si una persona menor está en peligro inmediato, contactá a los servicios de emergencia o a la autoridad local.",
        ],
      },
      {
        title: "Cómo respondemos",
        paragraphs: [
          "Revisamos las denuncias y, cuando corresponde, restringimos o retiramos contenido, suspendemos o eliminamos cuentas y preservamos la información necesaria para investigar y cumplir obligaciones legales. Tratamos los avisos sobre posibles menores o explotación infantil como asuntos prioritarios.",
          "Si confirmamos material de abuso sexual infantil, lo retiramos y realizamos las comunicaciones exigidas por la legislación aplicable a las autoridades u organismos competentes. Podemos colaborar con investigaciones legítimas conforme a la ley.",
        ],
      },
      {
        title: "Contacto de seguridad infantil",
        paragraphs: [
          "Para denuncias o consultas sobre estos estándares, escribí a swingersworldinfo@gmail.com. Este canal también recibe comunicaciones relacionadas con la prevención y respuesta ante el abuso y la explotación sexual infantil.",
        ],
      },
    ],
  },
  en: {
    eyebrow: "Swingers World · Community standards",
    title: "Child Safety Standards",
    updated: "Last updated: October 6, 2026",
    intro: "Swingers World is a community exclusively for adults aged 18 and over. We prohibit all forms of child sexual abuse and exploitation and set out these rules to prevent them, receive reports, and respond to possible violations.",
    contentsLabel: "On this page",
    reportLabel: "Report a child safety concern",
    reportSubject: "Child safety report - Swingers World",
    privacyLabel: "Privacy Policy",
    sections: [
      {
        title: "Adults only",
        paragraphs: [
          "People under 18 may not create an account or use Swingers World. Misrepresenting one's age and profiles depicting minors are prohibited. If we learn that an account belongs to a minor, we review the case and may suspend or remove the account.",
        ],
      },
      {
        title: "Zero tolerance for child sexual abuse and exploitation",
        paragraphs: [
          "Creating, requesting, sharing, storing, or distributing child sexual abuse material (CSAM) is prohibited, including real, manipulated, or digitally generated images. We also prohibit grooming a minor for sexual purposes, sexual extortion, trafficking, abuse, and any conduct that facilitates the sexual exploitation of children.",
          "These prohibitions apply to profiles, photos, messages, audio, and every other interaction in the app. Promoting, facilitating, or attempting to conceal this conduct is not allowed.",
        ],
      },
      {
        title: "How to report a concern",
        paragraphs: [
          "In the app, open the relevant person's profile, tap the options menu, and choose Report. You can select suspected underage user or inappropriate content and provide useful context. You can also email swingersworldinfo@gmail.com about a child safety concern.",
          "If possible, identify the profile involved and explain what happened. Do not download, forward, or attach child sexual abuse material when reporting it. If a child is in immediate danger, contact emergency services or your local authorities.",
        ],
      },
      {
        title: "How we respond",
        paragraphs: [
          "We review reports and, as appropriate, restrict or remove content, suspend or remove accounts, and preserve information needed for investigations and legal obligations. We treat reports involving possible minors or child exploitation as priority matters.",
          "If we confirm child sexual abuse material, we remove it and make any reports required by applicable law to the appropriate authorities or organizations. We may cooperate with legitimate investigations in accordance with the law.",
        ],
      },
      {
        title: "Child safety contact",
        paragraphs: [
          "For reports or questions about these standards, email swingersworldinfo@gmail.com. This channel also receives communications about the prevention of and response to child sexual abuse and exploitation.",
        ],
      },
    ],
  },
};

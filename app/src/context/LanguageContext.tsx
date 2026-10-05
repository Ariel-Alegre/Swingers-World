import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';

export type AppLanguage = 'es' | 'en';

const LANGUAGE_KEY = 'swingers_world_language';

const translations = {
  es: {
    'language.label': 'Idioma', 'language.spanish': 'Español', 'language.english': 'English',
    'nav.discover': 'Descubrir', 'nav.favorites': 'Me interesan', 'nav.requests': 'Solicitudes', 'nav.chats': 'Chats', 'nav.account': 'Cuenta',
    'nav.legal': 'Información legal', 'nav.profile': 'Perfil', 'nav.editProfile': 'Editar perfil',
    'common.cancel': 'Cancelar', 'common.selectOption': 'Seleccioná una opción', 'common.image': 'Imagen', 'common.member': 'Miembro', 'common.viewProfile': 'Ver perfil',
    'validation.required': 'Este campo es obligatorio.', 'validation.photoRequired': 'Subí al menos una foto para guardar los cambios.', 'validation.email': 'Ingresá un correo válido.', 'validation.passwordMin': 'Debe tener al menos 8 caracteres.',
    'error.generic': 'Ocurrió un error. Intentá nuevamente.', 'error.connection': 'No se pudo conectar con {{server}}',
    'error.network': 'No hay conexión con el servidor. Revisá tu internet e intentá nuevamente.', 'error.timeout': 'La solicitud tardó demasiado. Intentá nuevamente.',
    'error.invalidCredentials': 'El correo o la contraseña son incorrectos.', 'error.emailRegistered': 'Ya existe una cuenta con ese correo.',
    'error.verificationInvalid': 'El código ingresado no es válido.', 'error.verificationExpired': 'El código venció. Solicitá uno nuevo.',
    'error.verificationRequired': 'Primero verificá tu correo electrónico.', 'error.emailDelivery': 'No pudimos enviar el correo de verificación. Intentá nuevamente más tarde.',
    'error.validation': 'Revisá los datos ingresados e intentá nuevamente.', 'error.unauthorized': 'Tu sesión venció o no está autorizada.',
    'error.forbidden': 'No tenés permiso para realizar esta acción.', 'error.notFound': 'No encontramos lo que solicitaste.',
    'error.conflict': 'La operación entra en conflicto con información existente.', 'error.tooLarge': 'El archivo o la solicitud es demasiado grande.', 'error.unsupportedMedia': 'El formato del archivo no es compatible.',
    'error.rateLimited': 'Realizaste demasiados intentos. Esperá un momento.', 'error.storageUnavailable': 'El almacenamiento de archivos no está disponible. Intentá nuevamente más tarde.', 'error.server': 'El servidor tuvo un problema. Intentá nuevamente más tarde.',
    'error.profileIncomplete': 'Primero completá tu perfil para usar esta función.',
    'profileGate.title': 'Completá tu perfil',
    'profileGate.body': 'Para que otras personas puedan encontrarte, primero tenés que completar todos los datos de Editar perfil.',
    'profileGate.restrictions': 'Hasta completarlo, no podrás enviar mensajes, marcar “Me interesa” ni solicitar acceso a fotos privadas.',
    'profileGate.action': 'Completar mi perfil',
    'profileGate.close': 'Cerrar aviso',
    'onboarding.welcome': 'Bienvenido a Swingers World',
    'onboarding.profileTitle': 'Creá un perfil que te represente',
    'onboarding.profileBody': 'Completá todos los datos y agregá al menos una foto. Hasta entonces, tu perfil no aparecerá en Descubrir y algunas acciones estarán bloqueadas.',
    'onboarding.discoverTitle': 'Descubrí personas compatibles',
    'onboarding.discoverBody': 'En Descubrir vas a encontrar personas y parejas según tus preferencias. Podés indicar que alguien te interesa o iniciar una conversación.',
    'onboarding.privacyTitle': 'Vos decidís quién ve tus fotos',
    'onboarding.privacyBody': 'Podés mantener tus fotos privadas y aceptar o rechazar solicitudes de acceso. También podés bloquear o reportar perfiles cuando sea necesario.',
    'onboarding.chatTitle': 'Conversaciones privadas y en tiempo real',
    'onboarding.chatBody': 'Enviá mensajes, imágenes y audios. Vas a ver cuándo escriben, cuándo se entrega un mensaje y cuándo fue leído.',
    'onboarding.skip': 'Omitir', 'onboarding.back': 'Atrás', 'onboarding.next': 'Siguiente', 'onboarding.start': 'Comenzar',
    'onboarding.error': 'No pudimos guardar el recorrido. Revisá tu conexión e intentá nuevamente.',
    'login.tagline': 'Tu mundo. Tus reglas.', 'login.subtitle': 'Conectá con personas reales en un espacio privado y respetuoso.',
    'login.welcome': 'Bienvenido', 'login.email': 'Correo electrónico', 'login.password': 'Contraseña', 'login.submit': 'Ingresar',
    'login.noAccount': '¿Todavía no tenés cuenta? ', 'login.createAccount': 'Crear cuenta',
    'login.required': 'Completá tu correo y contraseña.', 'login.failed': 'No pudimos iniciar sesión.',
    'register.title': 'Creá tu cuenta', 'register.adultsOnly': 'Sólo para mayores de 18 años.', 'register.firstName': 'Nombre',
    'register.lastName': 'Apellido', 'register.confirmAdult': 'Confirmo que soy mayor de 18 años, leí y acepto los Términos y condiciones.',
    'register.confirmAdultsCouple': 'Confirmamos que ambos somos mayores de 18 años, leímos y aceptamos los Términos y condiciones.',
    'register.acknowledgePrivacy': 'Leí la Política de privacidad y entiendo cómo se usan mis datos y los del perfil.',
    'register.acknowledgePrivacyRequired': 'Debés confirmar que leíste la Política de privacidad.',
    'register.viewTerms': 'Ver términos', 'register.viewPrivacy': 'Ver privacidad', 'register.submit': 'Crear cuenta', 'register.haveAccount': 'Ya tengo cuenta',
    'register.allFields': 'Completá todos los campos.', 'register.passwordLength': 'La contraseña debe tener al menos 8 caracteres.',
    'register.acceptTerms': 'Debés aceptar los términos para continuar.', 'register.failed': 'No pudimos crear la cuenta.',
    'register.profileType': 'Tipo de perfil', 'register.single': 'Persona individual', 'register.couple': 'Pareja',
    'register.gender': 'Género', 'register.partnerName': 'Nombre de la otra persona', 'register.partnerLastName': 'Apellido de la otra persona', 'register.coupleType': 'Composición de la pareja',
    'register.profileDetailsRequired': 'Completá los datos correspondientes al tipo de perfil.',
    'register.sendCode': 'Continuar y verificar correo', 'register.verifyTitle': 'Revisá tu correo',
    'register.verifyBody': 'Enviamos un código de 6 dígitos a {{email}}. Ingresalo para crear tu cuenta.',
    'register.verificationCode': 'Código de verificación', 'register.verifyAndCreate': 'Verificar y crear cuenta',
    'register.codeInvalid': 'Ingresá el código completo de 6 dígitos.', 'register.resend': 'Reenviar código',
    'register.resendIn': 'Podés reenviar el código en {{seconds}} s', 'register.changeEmail': 'Cambiar correo',
    'register.verificationSendFailed': 'No pudimos enviar el código de verificación.',
    'discover.title': 'Descubrir', 'discover.subtitle': 'Personas de la comunidad', 'discover.emptyTitle': 'Ya viste todos los perfiles',
    'discover.noPhoto': 'Sin fotos todavía', 'discover.noPhotoHint': 'Esta persona aún no agregó fotos a su perfil.',
    'discover.emptyMessage': 'Deslizá hacia abajo para actualizar y descubrir nuevas personas.', 'discover.privatePhotos': 'Fotos privadas',
    'discover.requestHint': 'Estas fotos requieren autorización', 'discover.requestPhotos': 'Solicitar fotos', 'discover.requestSent': 'Solicitud enviada', 'discover.requestingPhotos': 'Enviando…',
    'discover.requestPhotosFailed': 'No pudimos enviar la solicitud.', 'discover.defaultDescription': 'Prefiere conocerte antes de compartir más detalles.', 'discover.refresh': 'Actualizar perfiles', 'discover.showMore': 'Ver más', 'discover.showLess': 'Ver menos',
    'discover.sayHello': 'Di hola', 'discover.helloMessage': '¡Hola! Me gustó tu perfil 👋',
    'favorites.title': 'Me interesan', 'favorites.subtitle': 'Personas a las que diste like', 'favorites.emptyTitle': 'Todavía no indicaste quién te interesa',
    'favorites.emptyMessage': 'Cuando alguien te interese, tocá el corazón para encontrarlo aquí.',
    'discover.menu': 'Abrir menú', 'discover.menuFavorites': 'Me interesan', 'discover.menuReceivedLikes': 'Les intereso',
    'discover.menuSentRequests': 'A quién solicité fotos', 'discover.menuReceivedRequests': 'Quién solicitó mis fotos', 'discover.menuBlockedUsers': 'Personas bloqueadas',
    'blockedUsers.title': 'Personas bloqueadas', 'blockedUsers.subtitle': 'Cuentas que bloqueaste',
    'blockedUsers.emptyTitle': 'No bloqueaste a nadie', 'blockedUsers.emptyMessage': 'Las personas que bloquees aparecerán aquí.',
    'blockedUsers.unblock': 'Desbloquear', 'blockedUsers.confirmTitle': 'Desbloquear persona',
    'blockedUsers.confirmMessage': '¿Querés desbloquear a {{name}}?', 'blockedUsers.failed': 'No pudimos desbloquear a esta persona.',
    'receivedLikes.title': 'Les intereso', 'receivedLikes.subtitle': 'Personas interesadas en tu perfil',
    'receivedLikes.emptyTitle': 'Todavía no recibiste likes', 'receivedLikes.emptyMessage': 'Cuando alguien te dé like, aparecerá aquí.',
    'sentRequests.title': 'Solicitudes enviadas', 'sentRequests.subtitle': 'Personas a quienes solicitaste acceso a sus fotos',
    'sentRequests.emptyTitle': 'No enviaste solicitudes', 'sentRequests.emptyMessage': 'Las solicitudes para ver fotos privadas aparecerán aquí.',
    'sentRequests.pending': 'Pendiente', 'sentRequests.accepted': 'Aceptada', 'sentRequests.expired': 'Acceso vencido',
    'notifications.title': 'Notificaciones', 'notifications.open': 'Abrir notificaciones', 'notifications.empty': 'No hay notificaciones.',
    'notifications.photoRequest': 'Alguien solicitó ver tus fotos privadas.',
    'notifications.photoAccepted': 'Aceptaron tu solicitud para ver fotos privadas.',
    'notifications.photoRejected': 'Rechazaron tu solicitud para ver fotos privadas.',
    'notifications.photoPending': 'Tu solicitud para ver fotos volvió a quedar pendiente.',
    'notifications.likeReceived': 'A alguien le interesa tu perfil.',
    'notifications.profileIncomplete': 'Completá tu perfil para mostrar más detalles y poder interactuar.',
    'chats.title': 'Mensajes', 'chats.subtitle': 'Tus conversaciones privadas', 'chats.emptyTitle': 'Todavía no hay conversaciones',
    'chats.emptyMessage': 'Abrí un perfil y enviá el primer mensaje.',
    'chats.delete': 'Eliminar conversación', 'chats.deleteTitle': 'Eliminar conversación', 'chats.deleteMessage': '¿Querés eliminar tu conversación con {{name}}? Solo se eliminará de tu cuenta.',
    'chats.deleteConfirm': 'Eliminar', 'chats.deleteFailed': 'No se pudo eliminar la conversación.',
    'chats.actions': 'Opciones de conversación', 'chats.archive': 'Archivar', 'chats.archiveFailed': 'No se pudo archivar la conversación.',
    'chats.archived': 'Archivados', 'chats.archivedTitle': 'Chats archivados', 'chats.archivedEmpty': 'No hay conversaciones archivadas.',
    'chats.unarchive': 'Desarchivar', 'chats.unarchiveFailed': 'No se pudo desarchivar la conversación.',
    'chat.private': 'Conversación privada', 'chat.typing': 'Escribiendo…', 'chat.placeholder': 'Escribí un mensaje…',
    'chat.sent': 'Enviado', 'chat.delivered': 'Entregado', 'chat.read': 'Leído',
    'chat.audio': 'Mensaje de voz', 'chat.chooseImage': 'Elegir imagen', 'chat.imagePreview': 'Imagen seleccionada',
    'chat.removeAttachment': 'Quitar archivo', 'chat.record': 'Grabar audio', 'chat.recording': 'Grabando…',
    'chat.cancelRecording': 'Cancelar grabación', 'chat.sendAudio': 'Enviar audio',
    'chat.microphonePermissionTitle': 'Permiso de micrófono', 'chat.microphonePermissionMessage': 'Necesitamos acceso al micrófono para grabar mensajes de voz.',
    'chat.photoPermissionMessage': 'Necesitamos acceso a tus fotos para enviar una imagen en el chat.',
    'chat.mediaFailed': 'No se pudo enviar el archivo. Intentá nuevamente.',
    'chat.viewOncePhoto': 'Foto para ver una vez', 'chat.tapToView': 'Tocá para abrir', 'chat.viewOnceSent': 'La podrá abrir una sola vez',
    'chat.normalPhoto': 'Normal', 'chat.viewOnce': 'Ver una vez',
    'chat.opened': 'Foto abierta', 'chat.noLongerAvailable': 'Ya no está disponible', 'chat.viewOnceFailed': 'No se pudo confirmar la visualización de la foto.',
    'requests.title': 'Solicitudes', 'requests.subtitle': 'Vos decidís quién ve tus fotos', 'requests.emptyTitle': 'No hay solicitudes pendientes',
    'requests.emptyMessage': 'Las nuevas solicitudes para ver tus fotos aparecerán aquí.', 'requests.wantsAccess': 'Quiere ver tus fotos privadas',
    'requests.reject': 'Rechazar', 'requests.accept': 'Aceptar 24 h', 'requests.acceptedTitle': 'Acceso concedido',
    'requests.rejectedTitle': 'Solicitud rechazada', 'requests.acceptedMessage': 'Podrá ver tus fotos privadas durante 24 horas.',
    'requests.rejectedMessage': 'La solicitud fue eliminada.',
    'account.title': 'Mi cuenta', 'account.subtitle': 'Privacidad y configuración', 'account.verified': '✓ Verificado',
    'account.editProfile': 'Editar perfil', 'account.privacyTerms': 'Privacidad y términos', 'account.privacyTitle': 'Tu privacidad importa',
    'account.privacyText': 'Las fotos privadas deben ser autorizadas por vos y el acceso puede expirar.', 'account.signOut': 'Cerrar sesión',
    'account.delete': 'Eliminar mi cuenta', 'account.deleteTitle': 'Eliminar cuenta',
    'account.deleteMessage': 'Esta acción elimina tu perfil, mensajes, solicitudes y fotos. No se puede deshacer.',
    'account.deleteForever': 'Eliminar definitivamente', 'account.deleteFailed': 'No se pudo eliminar',
    'edit.title': 'Editar perfil', 'edit.subtitle': 'Mostrá quién sos, sin perder el control', 'edit.photos': 'FOTOS', 'edit.add': 'Agregar', 'edit.removePhoto': 'Quitar foto',
    'edit.removePhotoTitle': 'Eliminar foto', 'edit.removePhotoMessage': '¿Querés eliminar esta foto de tu perfil?', 'edit.remove': 'Eliminar', 'edit.removePhotoFailed': 'No se pudo eliminar la foto.',
    'edit.keepOnePhotoTitle': 'Se necesita una foto', 'edit.keepOnePhotoMessage': 'Tu perfil debe conservar al menos una foto. Para reemplazarla, primero agregá y guardá la nueva.',
    'edit.description': 'Descripción', 'edit.location': 'Ciudad o zona', 'edit.gender': 'Género', 'edit.genderPlaceholder': 'Hombre / Mujer',
    'edit.displayName': 'Nombre visible', 'edit.coupleDisplayName': 'Nombre visible de la pareja', 'edit.coupleDescription': 'Descripción de la pareja',
    'edit.profileType': 'Tipo de perfil: {{value}}', 'edit.partnerName': 'Nombre de la otra persona', 'edit.partnerLastName': 'Apellido de la otra persona', 'edit.coupleType': 'Composición de la pareja',
    'edit.useLocation': 'Usar mi ubicación aproximada', 'edit.detectingLocation': 'Buscando ubicación…',
    'edit.locationPermissionTitle': 'Permiso de ubicación', 'edit.locationPermissionMessage': 'Necesitamos tu permiso para completar tu ciudad aproximada. También podés escribirla manualmente.',
    'edit.locationUnavailableTitle': 'Ubicación no disponible', 'edit.locationUnavailableMessage': 'No pudimos determinar tu ciudad. Podés escribirla manualmente.',
    'edit.autoLocation': 'Actualizar ubicación automáticamente', 'edit.autoLocationHint': 'Se actualiza al usar la app si te moviste aproximadamente 5 km o más.',
    'edit.bothProfileTypes': 'Parejas y personas individuales',
    'edit.lookingFor': 'Qué buscás', 'edit.lookingForPerson': 'Qué persona buscás', 'edit.lookingForCouple': 'Qué tipo de pareja buscás', 'edit.lookingForPlaceholder': 'Hombres / Mujeres / Ambos', 'edit.visibleProfile': 'Perfil visible',
    'edit.visibleProfileHint': 'Permitir que aparezca en Descubrir', 'edit.publicPhotos': 'Fotos públicas',
    'edit.publicPhotosHint': 'Si está desactivado, deberán solicitarte acceso', 'edit.save': 'Guardar cambios',
    'edit.savedTitle': 'Perfil actualizado', 'edit.savedMessage': 'Tus cambios se guardaron correctamente.', 'edit.failed': 'No se pudo guardar',
    'edit.requiredCouple': 'Completá el nombre visible, el nombre y el apellido de la otra persona, y la composición de la pareja.',
    'profile.requestSent': 'Solicitud enviada', 'profile.requestSentMessage': 'La persona recibirá tu solicitud.', 'profile.requestFailed': 'No se pudo enviar',
    'profile.reportTitle': 'Reportar perfil', 'profile.reportMessage': 'Nuestro equipo revisará este perfil. La otra persona no sabrá quién realizó el reporte.',
    'profile.sendReport': 'Enviar reporte', 'profile.reportReceived': 'Reporte recibido', 'profile.reportThanks': 'Gracias por ayudarnos a cuidar la comunidad.',
    'profile.reportFailed': 'No se pudo reportar', 'profile.blockTitle': 'Bloquear usuario',
    'profile.reportReasonTitle': '¿Por qué reportás este perfil?', 'profile.reportReasonHint': 'Elegí el motivo que mejor describa el problema.',
    'profile.reportInappropriate': 'Contenido inapropiado', 'profile.reportFake': 'Perfil falso o suplantación', 'profile.reportHarassment': 'Acoso o comportamiento abusivo',
    'profile.reportUnderage': 'Posible menor de edad', 'profile.reportSpam': 'Spam, fraude o estafa', 'profile.reportOther': 'Otro motivo',
    'profile.reportOtherLabel': 'Explicá el motivo', 'profile.reportOtherPlaceholder': 'Contanos qué ocurrió para que podamos revisarlo.', 'profile.reportOtherRequired': 'Explicá por qué reportás este perfil.',
    'profile.blockMessage': 'Dejarán de verse y no podrán enviarse mensajes.', 'profile.block': 'Bloquear', 'profile.blocked': 'Usuario bloqueado',
    'subscription.premium': 'Membresía Premium', 'subscription.title': 'Descubrí Swingers World Premium',
    'subscription.subtitle': 'Elegí tu plan. Si tu cuenta es elegible, tendrás 7 días gratis antes del primer cobro.',
    'subscription.monthly': 'Mensual', 'subscription.sixMonths': '6 meses', 'subscription.annual': 'Anual',
    'subscription.benefitTrial': '7 días de prueba gratis para nuevos suscriptores.', 'subscription.benefitAccess': 'Acceso completo a perfiles, mensajes y funciones privadas.',
    'subscription.benefitCancel': 'Podés cancelar desde App Store o Google Play.', 'subscription.startTrial': 'Comenzar prueba de 7 días',
    'subscription.restore': 'Restaurar compras', 'subscription.manage': 'Administrar suscripción',
    'subscription.renewalDisclosure': 'La suscripción se renueva automáticamente al precio y período elegidos, salvo que la canceles antes de la renovación. La disponibilidad de la prueba depende de la elegibilidad de tu cuenta de la tienda.',
    'subscription.choosePlan': 'Elegí tu plan', 'subscription.bestValue': 'Mejor valor',
    'subscription.save': 'Ahorrás {{percent}}%', 'subscription.perMonth': '{{price}}/mes',
    'subscription.loadingPlans': 'Cargando precios locales...', 'subscription.retry': 'Reintentar',
    'subscription.plansUnavailable': 'No pudimos cargar los planes. Revisá tu conexión e intentá nuevamente.',
    'subscription.operationFailed': 'No pudimos completar la operación. Intentá nuevamente.',
    'subscription.continue': 'Continuar con el plan', 'subscription.eligibleTrial': '7 días gratis para cuentas elegibles',
    'subscription.trialThenPrice': '7 días gratis; después {{price}} por {{period}}.',
    'subscription.periodMonth': 'mes', 'subscription.periodSixMonths': '6 meses', 'subscription.periodYear': 'año',
    'subscription.benefitDiscover': 'Descubrí personas y parejas compatibles.',
    'subscription.benefitMessages': 'Mensajes, imágenes y audios sin límites.',
    'subscription.benefitPrivacy': 'Controlá quién puede ver tus fotos privadas.',
    'subscription.benefitAll': 'Acceso completo a todas las funciones.',
    'subscription.terms': 'Términos', 'subscription.privacy': 'Privacidad',
    'subscription.legalConsent': 'Al continuar, aceptás los Términos y la Política de privacidad.',
    'profile.blockFailed': 'No se pudo bloquear', 'profile.unavailable': 'Perfil no disponible.', 'profile.verified': 'Perfil verificado',
    'profile.communityMember': 'Miembro de la comunidad', 'profile.privateContent': 'Contenido privado',
    'profile.privateMessage': 'Las imágenes sólo se muestran después de recibir autorización.', 'profile.about': 'Sobre mí', 'profile.aboutCouple': 'Sobre nosotros',
    'profile.noPhoto': 'Sin fotos todavía', 'profile.noPhotoHint': 'Esta persona aún no agregó fotos a su perfil.',
    'profile.noDescription': 'Sin descripción todavía.', 'profile.lookingFor': 'Busca: {{value}}', 'profile.requestPhotos': 'Solicitar acceso a fotos',
    'profile.sendMessage': 'Enviar mensaje', 'profile.report': 'Reportar',
    'value.male': 'Hombre', 'value.female': 'Mujer', 'value.men': 'Hombres', 'value.women': 'Mujeres', 'value.both': 'Ambos',
    'value.monthly': 'Mensual', 'value.sixMonths': 'Seis meses', 'value.annual': 'Anual', 'value.free': 'Gratis',
    'value.single': 'Persona individual', 'value.couple': 'Pareja', 'value.womanMan': 'Mujer + Hombre',
    'value.twoWomen': 'Dos mujeres', 'value.twoMen': 'Dos hombres', 'value.otherCouple': 'Otra composición', 'value.all': 'Todos',
    'legal.updated': 'Última actualización: septiembre de 2026', 'legal.note': 'Este resumen debe completarse con los datos legales y de contacto definitivos antes de publicar la aplicación.',
    'legal.terms.title': 'Términos y condiciones', 'legal.terms.intro': 'Al utilizar Swingers World aceptás estas reglas básicas de convivencia y seguridad.',
    'legal.terms.adults.title': 'Sólo adultos', 'legal.terms.adults.body': 'Debés tener al menos 18 años y proporcionar información auténtica.',
    'legal.terms.consent.title': 'Consentimiento', 'legal.terms.consent.body': 'No compartas contenido de otra persona sin su autorización. El consentimiento puede retirarse en cualquier momento.',
    'legal.terms.respect.title': 'Respeto', 'legal.terms.respect.body': 'No se permiten acoso, amenazas, suplantación, discriminación, explotación ni contenido ilegal.',
    'legal.terms.moderation.title': 'Moderación', 'legal.terms.moderation.body': 'Podemos revisar reportes y suspender cuentas que incumplan estas reglas para proteger a la comunidad.',
    'legal.terms.account.title': 'Tu cuenta', 'legal.terms.account.body': 'Sos responsable de mantener tus credenciales seguras y podés eliminar tu cuenta desde la aplicación.',
    'legal.privacy.title': 'Política de privacidad', 'legal.privacy.intro': 'Swingers World trata datos sensibles. Queremos que sepas qué información utiliza la aplicación.',
    'legal.privacy.account.title': 'Datos de cuenta', 'legal.privacy.account.body': 'Usamos tu nombre, correo y datos de perfil para operar tu cuenta.',
    'legal.privacy.photos.title': 'Fotos privadas', 'legal.privacy.photos.body': 'Sólo deberían mostrarse cuando vos las hacés públicas o autorizás temporalmente a otra persona.',
    'legal.privacy.messages.title': 'Mensajes', 'legal.privacy.messages.body': 'Los mensajes se procesan para brindar el chat, gestionar bloqueos y responder reportes de seguridad.',
    'legal.privacy.control.title': 'Control', 'legal.privacy.control.body': 'Podés editar tus datos, revocar permisos, bloquear personas y eliminar tu cuenta desde la sección Cuenta.',
    'legal.privacy.security.title': 'Seguridad', 'legal.privacy.security.body': 'No publiques direcciones exactas, documentos, datos financieros ni información que no quieras compartir.',
  },
  en: {
    'language.label': 'Language', 'language.spanish': 'Español', 'language.english': 'English',
    'nav.discover': 'Discover', 'nav.favorites': "I'm interested", 'nav.requests': 'Requests', 'nav.chats': 'Chats', 'nav.account': 'Account',
    'nav.legal': 'Legal information', 'nav.profile': 'Profile', 'nav.editProfile': 'Edit profile',
    'common.cancel': 'Cancel', 'common.selectOption': 'Select an option', 'common.image': 'Image', 'common.member': 'Member', 'common.viewProfile': 'View profile',
    'validation.required': 'This field is required.', 'validation.photoRequired': 'Upload at least one photo to save your changes.', 'validation.email': 'Enter a valid email address.', 'validation.passwordMin': 'Must contain at least 8 characters.',
    'error.generic': 'Something went wrong. Please try again.', 'error.connection': 'Could not connect to {{server}}',
    'error.network': 'Could not connect to the server. Check your internet connection and try again.', 'error.timeout': 'The request took too long. Please try again.',
    'error.invalidCredentials': 'The email address or password is incorrect.', 'error.emailRegistered': 'An account with that email already exists.',
    'error.verificationInvalid': 'The verification code is invalid.', 'error.verificationExpired': 'The code has expired. Request a new one.',
    'error.verificationRequired': 'Verify your email address first.', 'error.emailDelivery': 'We could not send the verification email. Please try again later.',
    'error.validation': 'Review the information entered and try again.', 'error.unauthorized': 'Your session has expired or is not authorized.',
    'error.forbidden': 'You do not have permission to perform this action.', 'error.notFound': 'We could not find what you requested.',
    'error.conflict': 'The operation conflicts with existing information.', 'error.tooLarge': 'The file or request is too large.', 'error.unsupportedMedia': 'The file format is not supported.',
    'error.rateLimited': 'Too many attempts. Please wait a moment.', 'error.storageUnavailable': 'Media storage is unavailable. Please try again later.', 'error.server': 'The server encountered a problem. Please try again later.',
    'error.profileIncomplete': 'Complete your profile before using this feature.',
    'profileGate.title': 'Complete your profile',
    'profileGate.body': 'To help other people discover you, first complete every required field in Edit profile.',
    'profileGate.restrictions': 'Until then, you cannot send messages, mark “I’m interested,” or request access to private photos.',
    'profileGate.action': 'Complete my profile',
    'profileGate.close': 'Close notice',
    'onboarding.welcome': 'Welcome to Swingers World',
    'onboarding.profileTitle': 'Create a profile that represents you',
    'onboarding.profileBody': 'Complete every field and add at least one photo. Until then, your profile will not appear in Discover and some actions will remain locked.',
    'onboarding.discoverTitle': 'Discover compatible people',
    'onboarding.discoverBody': 'Discover shows people and couples based on your preferences. You can show interest in someone or start a conversation.',
    'onboarding.privacyTitle': 'You decide who sees your photos',
    'onboarding.privacyBody': 'You can keep your photos private and accept or reject access requests. You can also block or report profiles whenever necessary.',
    'onboarding.chatTitle': 'Private, real-time conversations',
    'onboarding.chatBody': 'Send messages, images, and voice notes. You will see when someone is typing, when a message is delivered, and when it is read.',
    'onboarding.skip': 'Skip', 'onboarding.back': 'Back', 'onboarding.next': 'Next', 'onboarding.start': 'Get started',
    'onboarding.error': 'We could not save your progress. Check your connection and try again.',
    'login.tagline': 'Your world. Your rules.', 'login.subtitle': 'Connect with real people in a private and respectful space.',
    'login.welcome': 'Welcome', 'login.email': 'Email address', 'login.password': 'Password', 'login.submit': 'Sign in',
    'login.noAccount': "Don't have an account yet? ", 'login.createAccount': 'Create account',
    'login.required': 'Enter your email and password.', 'login.failed': 'We could not sign you in.',
    'register.title': 'Create your account', 'register.adultsOnly': 'For adults aged 18 and over only.', 'register.firstName': 'First name',
    'register.lastName': 'Last name', 'register.confirmAdult': 'I confirm I am at least 18, have read and accept the Terms and Conditions.',
    'register.confirmAdultsCouple': 'We confirm we are both at least 18, have read and accept the Terms and Conditions.',
    'register.acknowledgePrivacy': 'I have read the Privacy Policy and understand how my data and profile data are used.',
    'register.acknowledgePrivacyRequired': 'You must confirm you have read the Privacy Policy.',
    'register.viewTerms': 'View terms', 'register.viewPrivacy': 'View privacy policy', 'register.submit': 'Create account', 'register.haveAccount': 'I already have an account',
    'register.allFields': 'Complete all fields.', 'register.passwordLength': 'The password must contain at least 8 characters.',
    'register.acceptTerms': 'You must accept the terms to continue.', 'register.failed': 'We could not create the account.',
    'register.profileType': 'Profile type', 'register.single': 'Individual', 'register.couple': 'Couple',
    'register.gender': 'Gender', 'register.partnerName': "Other person's first name", 'register.partnerLastName': "Other person's last name", 'register.coupleType': 'Couple composition',
    'register.profileDetailsRequired': 'Complete the details required for the selected profile type.',
    'register.sendCode': 'Continue and verify email', 'register.verifyTitle': 'Check your email',
    'register.verifyBody': 'We sent a 6-digit code to {{email}}. Enter it to create your account.',
    'register.verificationCode': 'Verification code', 'register.verifyAndCreate': 'Verify and create account',
    'register.codeInvalid': 'Enter the complete 6-digit code.', 'register.resend': 'Resend code',
    'register.resendIn': 'You can resend the code in {{seconds}}s', 'register.changeEmail': 'Change email',
    'register.verificationSendFailed': 'We could not send the verification code.',
    'discover.title': 'Discover', 'discover.subtitle': 'People in the community', 'discover.emptyTitle': "You've seen every profile",
    'discover.noPhoto': 'No photos yet', 'discover.noPhotoHint': 'This person has not added photos to their profile yet.',
    'discover.emptyMessage': 'Pull down to refresh and discover new people.', 'discover.privatePhotos': 'Private photos',
    'discover.requestHint': 'These photos require authorization', 'discover.requestPhotos': 'Request photos', 'discover.requestSent': 'Request sent', 'discover.requestingPhotos': 'Sending…',
    'discover.requestPhotosFailed': 'We could not send the request.', 'discover.defaultDescription': 'Prefers to get to know you before sharing more details.', 'discover.refresh': 'Refresh profiles', 'discover.showMore': 'Show more', 'discover.showLess': 'Show less',
    'discover.sayHello': 'Say hello', 'discover.helloMessage': 'Hi! I liked your profile 👋',
    'favorites.title': "I'm interested", 'favorites.subtitle': 'People you liked', 'favorites.emptyTitle': "You haven't liked anyone yet",
    'favorites.emptyMessage': 'When someone interests you, tap the heart to find them here.',
    'discover.menu': 'Open menu', 'discover.menuFavorites': "I'm interested", 'discover.menuReceivedLikes': 'Interested in me',
    'discover.menuSentRequests': 'People I requested photos from', 'discover.menuReceivedRequests': 'Who requested my photos', 'discover.menuBlockedUsers': 'Blocked people',
    'blockedUsers.title': 'Blocked people', 'blockedUsers.subtitle': 'Accounts you blocked',
    'blockedUsers.emptyTitle': 'No blocked accounts', 'blockedUsers.emptyMessage': 'People you block will appear here.',
    'blockedUsers.unblock': 'Unblock', 'blockedUsers.confirmTitle': 'Unblock person',
    'blockedUsers.confirmMessage': 'Do you want to unblock {{name}}?', 'blockedUsers.failed': 'We could not unblock this person.',
    'receivedLikes.title': 'Interested in me', 'receivedLikes.subtitle': 'People interested in your profile',
    'receivedLikes.emptyTitle': 'No likes received yet', 'receivedLikes.emptyMessage': 'When someone likes you, they will appear here.',
    'sentRequests.title': 'Sent requests', 'sentRequests.subtitle': 'People whose private photos you requested',
    'sentRequests.emptyTitle': 'No requests sent', 'sentRequests.emptyMessage': 'Requests to view private photos will appear here.',
    'sentRequests.pending': 'Pending', 'sentRequests.accepted': 'Accepted', 'sentRequests.expired': 'Access expired',
    'notifications.title': 'Notifications', 'notifications.open': 'Open notifications', 'notifications.empty': 'No notifications yet.',
    'notifications.photoRequest': 'Someone requested access to your private photos.',
    'notifications.photoAccepted': 'Your request to view private photos was accepted.',
    'notifications.photoRejected': 'Your request to view private photos was rejected.',
    'notifications.photoPending': 'Your request to view private photos is pending again.',
    'notifications.likeReceived': 'Someone is interested in your profile.',
    'notifications.profileIncomplete': 'Complete your profile to show more details and interact.',
    'chats.title': 'Messages', 'chats.subtitle': 'Your private conversations', 'chats.emptyTitle': 'No conversations yet',
    'chats.emptyMessage': 'Open a profile and send the first message.',
    'chats.delete': 'Delete conversation', 'chats.deleteTitle': 'Delete conversation', 'chats.deleteMessage': 'Delete your conversation with {{name}}? It will only be removed from your account.',
    'chats.deleteConfirm': 'Delete', 'chats.deleteFailed': 'The conversation could not be deleted.',
    'chats.actions': 'Conversation options', 'chats.archive': 'Archive', 'chats.archiveFailed': 'The conversation could not be archived.',
    'chats.archived': 'Archived', 'chats.archivedTitle': 'Archived chats', 'chats.archivedEmpty': 'There are no archived conversations.',
    'chats.unarchive': 'Unarchive', 'chats.unarchiveFailed': 'The conversation could not be unarchived.',
    'chat.private': 'Private conversation', 'chat.typing': 'Typing…', 'chat.placeholder': 'Write a message…',
    'chat.sent': 'Sent', 'chat.delivered': 'Delivered', 'chat.read': 'Read',
    'chat.audio': 'Voice message', 'chat.chooseImage': 'Choose image', 'chat.imagePreview': 'Selected image',
    'chat.removeAttachment': 'Remove attachment', 'chat.record': 'Record audio', 'chat.recording': 'Recording…',
    'chat.cancelRecording': 'Cancel recording', 'chat.sendAudio': 'Send audio',
    'chat.microphonePermissionTitle': 'Microphone permission', 'chat.microphonePermissionMessage': 'Microphone access is required to record voice messages.',
    'chat.photoPermissionMessage': 'Photo access is required to send an image in the chat.',
    'chat.mediaFailed': 'The file could not be sent. Please try again.',
    'chat.viewOncePhoto': 'View-once photo', 'chat.tapToView': 'Tap to open', 'chat.viewOnceSent': 'They can open it only once',
    'chat.normalPhoto': 'Normal', 'chat.viewOnce': 'View once',
    'chat.opened': 'Photo opened', 'chat.noLongerAvailable': 'No longer available', 'chat.viewOnceFailed': 'The photo view could not be confirmed.',
    'requests.title': 'Requests', 'requests.subtitle': 'You decide who can see your photos', 'requests.emptyTitle': 'No pending requests',
    'requests.emptyMessage': 'New requests to view your photos will appear here.', 'requests.wantsAccess': 'Wants to view your private photos',
    'requests.reject': 'Reject', 'requests.accept': 'Accept for 24 h', 'requests.acceptedTitle': 'Access granted',
    'requests.rejectedTitle': 'Request rejected', 'requests.acceptedMessage': 'They can view your private photos for 24 hours.',
    'requests.rejectedMessage': 'The request was removed.',
    'account.title': 'My account', 'account.subtitle': 'Privacy and settings', 'account.verified': '✓ Verified',
    'account.editProfile': 'Edit profile', 'account.privacyTerms': 'Privacy and terms', 'account.privacyTitle': 'Your privacy matters',
    'account.privacyText': 'You must authorize access to private photos, and that access can expire.', 'account.signOut': 'Sign out',
    'account.delete': 'Delete my account', 'account.deleteTitle': 'Delete account',
    'account.deleteMessage': 'This deletes your profile, messages, requests, and photos. It cannot be undone.',
    'account.deleteForever': 'Delete permanently', 'account.deleteFailed': 'Could not delete account',
    'edit.title': 'Edit profile', 'edit.subtitle': 'Show who you are while staying in control', 'edit.photos': 'PHOTOS', 'edit.add': 'Add', 'edit.removePhoto': 'Remove photo',
    'edit.removePhotoTitle': 'Delete photo', 'edit.removePhotoMessage': 'Do you want to delete this photo from your profile?', 'edit.remove': 'Delete', 'edit.removePhotoFailed': 'The photo could not be deleted.',
    'edit.keepOnePhotoTitle': 'A photo is required', 'edit.keepOnePhotoMessage': 'Your profile must keep at least one photo. To replace it, add and save the new one first.',
    'edit.description': 'Description', 'edit.location': 'City or area', 'edit.gender': 'Gender', 'edit.genderPlaceholder': 'Male / Female',
    'edit.displayName': 'Display name', 'edit.coupleDisplayName': 'Couple display name', 'edit.coupleDescription': 'Couple description',
    'edit.profileType': 'Profile type: {{value}}', 'edit.partnerName': "Other person's first name", 'edit.partnerLastName': "Other person's last name", 'edit.coupleType': 'Couple composition',
    'edit.useLocation': 'Use my approximate location', 'edit.detectingLocation': 'Finding location…',
    'edit.locationPermissionTitle': 'Location permission', 'edit.locationPermissionMessage': 'We need permission to fill in your approximate city. You can also enter it manually.',
    'edit.locationUnavailableTitle': 'Location unavailable', 'edit.locationUnavailableMessage': 'We could not determine your city. You can enter it manually.',
    'edit.autoLocation': 'Update location automatically', 'edit.autoLocationHint': 'Updates while using the app when you move approximately 5 km or more.',
    'edit.bothProfileTypes': 'Couples and individuals',
    'edit.lookingFor': 'Looking for', 'edit.lookingForPerson': 'What kind of person are you looking for?', 'edit.lookingForCouple': 'What kind of couple are you looking for?', 'edit.lookingForPlaceholder': 'Men / Women / Both', 'edit.visibleProfile': 'Visible profile',
    'edit.visibleProfileHint': 'Allow your profile to appear in Discover', 'edit.publicPhotos': 'Public photos',
    'edit.publicPhotosHint': 'When disabled, people must request access', 'edit.save': 'Save changes',
    'edit.savedTitle': 'Profile updated', 'edit.savedMessage': 'Your changes were saved successfully.', 'edit.failed': 'Could not save changes',
    'edit.requiredCouple': "Complete the display name, the other person's first and last name, and the couple composition.",
    'profile.requestSent': 'Request sent', 'profile.requestSentMessage': 'The person will receive your request.', 'profile.requestFailed': 'Could not send request',
    'profile.reportTitle': 'Report profile', 'profile.reportMessage': 'Our team will review this profile. The other person will not know who submitted the report.',
    'profile.sendReport': 'Send report', 'profile.reportReceived': 'Report received', 'profile.reportThanks': 'Thank you for helping us protect the community.',
    'profile.reportFailed': 'Could not report profile', 'profile.blockTitle': 'Block user',
    'profile.reportReasonTitle': 'Why are you reporting this profile?', 'profile.reportReasonHint': 'Choose the reason that best describes the issue.',
    'profile.reportInappropriate': 'Inappropriate content', 'profile.reportFake': 'Fake profile or impersonation', 'profile.reportHarassment': 'Harassment or abusive behavior',
    'profile.reportUnderage': 'Possible underage user', 'profile.reportSpam': 'Spam, fraud, or scam', 'profile.reportOther': 'Other reason',
    'profile.reportOtherLabel': 'Explain the reason', 'profile.reportOtherPlaceholder': 'Tell us what happened so we can review it.', 'profile.reportOtherRequired': 'Explain why you are reporting this profile.',
    'profile.blockMessage': 'You will no longer see each other or be able to exchange messages.', 'profile.block': 'Block', 'profile.blocked': 'User blocked',
    'subscription.premium': 'Premium membership', 'subscription.title': 'Discover Swingers World Premium',
    'subscription.subtitle': 'Choose your plan. If your account is eligible, you get 7 days free before the first charge.',
    'subscription.monthly': 'Monthly', 'subscription.sixMonths': '6 months', 'subscription.annual': 'Annual',
    'subscription.benefitTrial': '7-day free trial for eligible new subscribers.', 'subscription.benefitAccess': 'Full access to profiles, messages, and private features.',
    'subscription.benefitCancel': 'Cancel through the App Store or Google Play.', 'subscription.startTrial': 'Start 7-day free trial',
    'subscription.restore': 'Restore purchases', 'subscription.manage': 'Manage subscription',
    'subscription.renewalDisclosure': 'Your subscription renews automatically at the selected price and period unless canceled before renewal. Trial availability depends on your store account eligibility.',
    'subscription.choosePlan': 'Choose your plan', 'subscription.bestValue': 'Best value',
    'subscription.save': 'Save {{percent}}%', 'subscription.perMonth': '{{price}}/month',
    'subscription.loadingPlans': 'Loading local prices...', 'subscription.retry': 'Try again',
    'subscription.plansUnavailable': 'We could not load the plans. Check your connection and try again.',
    'subscription.operationFailed': 'We could not complete the operation. Please try again.',
    'subscription.continue': 'Continue with plan', 'subscription.eligibleTrial': '7 days free for eligible accounts',
    'subscription.trialThenPrice': '7 days free, then {{price}} per {{period}}.',
    'subscription.periodMonth': 'month', 'subscription.periodSixMonths': '6 months', 'subscription.periodYear': 'year',
    'subscription.benefitDiscover': 'Discover compatible people and couples.',
    'subscription.benefitMessages': 'Unlimited messages, images, and audio.',
    'subscription.benefitPrivacy': 'Control who can see your private photos.',
    'subscription.benefitAll': 'Full access to every feature.',
    'subscription.terms': 'Terms', 'subscription.privacy': 'Privacy',
    'subscription.legalConsent': 'By continuing, you agree to the Terms and Privacy Policy.',
    'profile.blockFailed': 'Could not block user', 'profile.unavailable': 'Profile unavailable.', 'profile.verified': 'Verified profile',
    'profile.communityMember': 'Community member', 'profile.privateContent': 'Private content',
    'profile.privateMessage': 'Images are only shown after access has been authorized.', 'profile.about': 'About me', 'profile.aboutCouple': 'About us',
    'profile.noPhoto': 'No photos yet', 'profile.noPhotoHint': 'This person has not added photos to their profile yet.',
    'profile.noDescription': 'No description yet.', 'profile.lookingFor': 'Looking for: {{value}}', 'profile.requestPhotos': 'Request photo access',
    'profile.sendMessage': 'Send message', 'profile.report': 'Report',
    'value.male': 'Male', 'value.female': 'Female', 'value.men': 'Men', 'value.women': 'Women', 'value.both': 'Both',
    'value.monthly': 'Monthly', 'value.sixMonths': 'Six months', 'value.annual': 'Annual', 'value.free': 'Free',
    'value.single': 'Individual', 'value.couple': 'Couple', 'value.womanMan': 'Woman + Man',
    'value.twoWomen': 'Two women', 'value.twoMen': 'Two men', 'value.otherCouple': 'Other composition', 'value.all': 'All',
    'legal.updated': 'Last updated: September 2026', 'legal.note': 'This summary must be completed with final legal and contact details before the application is published.',
    'legal.terms.title': 'Terms and Conditions', 'legal.terms.intro': 'By using Swingers World, you agree to these basic community and safety rules.',
    'legal.terms.adults.title': 'Adults only', 'legal.terms.adults.body': 'You must be at least 18 years old and provide authentic information.',
    'legal.terms.consent.title': 'Consent', 'legal.terms.consent.body': "Do not share another person's content without authorization. Consent can be withdrawn at any time.",
    'legal.terms.respect.title': 'Respect', 'legal.terms.respect.body': 'Harassment, threats, impersonation, discrimination, exploitation, and illegal content are prohibited.',
    'legal.terms.moderation.title': 'Moderation', 'legal.terms.moderation.body': 'We may review reports and suspend accounts that break these rules to protect the community.',
    'legal.terms.account.title': 'Your account', 'legal.terms.account.body': 'You are responsible for keeping your credentials secure and can delete your account from the app.',
    'legal.privacy.title': 'Privacy Policy', 'legal.privacy.intro': 'Swingers World handles sensitive data. We want you to understand what information the app uses.',
    'legal.privacy.account.title': 'Account data', 'legal.privacy.account.body': 'We use your name, email, and profile data to operate your account.',
    'legal.privacy.photos.title': 'Private photos', 'legal.privacy.photos.body': 'They should only be shown when you make them public or temporarily authorize another person.',
    'legal.privacy.messages.title': 'Messages', 'legal.privacy.messages.body': 'Messages are processed to provide chat, manage blocks, and respond to safety reports.',
    'legal.privacy.control.title': 'Control', 'legal.privacy.control.body': 'You can edit your data, revoke permissions, block people, and delete your account from the Account section.',
    'legal.privacy.security.title': 'Security', 'legal.privacy.security.body': 'Do not publish exact addresses, documents, financial data, or information you do not want to share.',
  },
} as const;

export type TranslationKey = keyof typeof translations.es;
type LanguageContextValue = {
  language: AppLanguage;
  loading: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string;
  formatProfileValue: (value?: string | null) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

async function readLanguagePreference() {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(LANGUAGE_KEY) ?? null;
  return SecureStore.getItemAsync(LANGUAGE_KEY);
}

async function storeLanguagePreference(language: AppLanguage) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(LANGUAGE_KEY, language);
    return;
  }
  await SecureStore.setItemAsync(LANGUAGE_KEY, language);
}

function getDeviceLanguage(): AppLanguage {
  return getLocales()[0]?.languageCode?.toLowerCase() === 'es' ? 'es' : 'en';
}

export function LanguageProvider({ children }: React.PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>(getDeviceLanguage);
  const [loading, setLoading] = useState(true);
  const hasManualPreference = useRef(false);

  useEffect(() => {
    void readLanguagePreference()
      .then((saved) => {
        if (saved === 'es' || saved === 'en') {
          hasManualPreference.current = true;
          setLanguageState(saved);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !hasManualPreference.current) setLanguageState(getDeviceLanguage());
    });
    return () => subscription.remove();
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    hasManualPreference.current = true;
    setLanguageState(nextLanguage);
    await storeLanguagePreference(nextLanguage);
  }, []);

  const t = useCallback((key: TranslationKey, variables?: Record<string, string | number>) => {
    let value: string = translations[language][key];
    for (const [name, replacement] of Object.entries(variables ?? {})) {
      value = value.replaceAll(`{{${name}}}`, String(replacement));
    }
    return value;
  }, [language]);

  const formatProfileValue = useCallback((value?: string | null) => {
    if (!value) return '';
    const keys: Record<string, TranslationKey> = {
      male: 'value.male', female: 'value.female', men: 'value.men', women: 'value.women', both: 'value.both',
      monthly: 'value.monthly', six_months: 'value.sixMonths', annual: 'value.annual', free: 'value.free',
      single: 'value.single', couple: 'value.couple', woman_man: 'value.womanMan',
      two_women: 'value.twoWomen', two_men: 'value.twoMen', other: 'value.otherCouple', all: 'value.all',
    };
    const key = keys[value.trim().toLowerCase()];
    return key ? t(key) : value;
  }, [t]);

  const value = useMemo(() => ({ language, loading, setLanguage, t, formatProfileValue }), [language, loading, setLanguage, t, formatProfileValue]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

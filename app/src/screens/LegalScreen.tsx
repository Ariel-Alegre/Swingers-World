import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Header } from '../components/Header';
import { colors, radius, spacing } from '../theme/colors';

type LegalRoute = RouteProp<{ Legal: { document: 'terms' | 'privacy' } }, 'Legal'>;

const sections = {
  terms: {
    title: 'Términos de uso',
    intro: 'Al utilizar Swingers World aceptás estas reglas básicas de convivencia y seguridad.',
    items: [
      ['Sólo adultos', 'Debés tener al menos 18 años y proporcionar información auténtica.'],
      ['Consentimiento', 'No compartas contenido de otra persona sin su autorización. El consentimiento puede retirarse en cualquier momento.'],
      ['Respeto', 'No se permiten acoso, amenazas, suplantación, discriminación, explotación ni contenido ilegal.'],
      ['Moderación', 'Podemos revisar reportes y suspender cuentas que incumplan estas reglas para proteger a la comunidad.'],
      ['Tu cuenta', 'Sos responsable de mantener tus credenciales seguras y podés eliminar tu cuenta desde la aplicación.'],
    ],
  },
  privacy: {
    title: 'Privacidad',
    intro: 'Swingers World trata datos sensibles. Queremos que sepas qué información utiliza la aplicación.',
    items: [
      ['Datos de cuenta', 'Usamos tu nombre, correo, teléfono y datos de perfil para operar tu cuenta.'],
      ['Fotos privadas', 'Sólo deberían mostrarse cuando vos las hacés públicas o autorizás temporalmente a otra persona.'],
      ['Mensajes', 'Los mensajes se procesan para brindar el chat, gestionar bloqueos y responder reportes de seguridad.'],
      ['Control', 'Podés editar tus datos, revocar permisos, bloquear personas y eliminar tu cuenta desde la sección Cuenta.'],
      ['Seguridad', 'No publiques direcciones exactas, documentos, datos financieros ni información que no quieras compartir.'],
    ],
  },
} as const;

export function LegalScreen() {
  const route = useRoute<LegalRoute>();
  const content = sections[route.params.document];
  return (
    <Screen scroll>
      <Header title={content.title} subtitle="Última actualización: septiembre de 2026" />
      <Text style={styles.intro}>{content.intro}</Text>
      {content.items.map(([title, body]) => (
        <View key={title} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      ))}
      <Text style={styles.note}>Este resumen debe completarse con los datos legales y de contacto definitivos antes de publicar la aplicación.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.goldSoft, fontSize: 16, fontWeight: '900', marginBottom: spacing.xs },
  body: { color: colors.textMuted, lineHeight: 21 },
  note: { color: colors.warning, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
});

import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onEditProfile: () => void;
};

export function ProfileCompletionModal({ visible, onClose, onEditProfile }: Props) {
  const { t } = useLanguage();

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profileGate.close')}
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          >
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>
          <View style={styles.icon}>
            <Ionicons name="person-add-outline" size={34} color={colors.goldSoft} />
          </View>
          <Text style={styles.title}>{t('profileGate.title')}</Text>
          <Text style={styles.body}>{t('profileGate.body')}</Text>
          <View style={styles.restrictionBox}>
            <Ionicons name="lock-closed-outline" size={21} color={colors.primary} />
            <Text style={styles.restrictionText}>{t('profileGate.restrictions')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onEditProfile}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Ionicons name="create-outline" size={20} color={colors.white} />
            <Text style={styles.actionText}>{t('profileGate.action')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(4,2,6,0.82)' },
  card: { width: '100%', maxWidth: 420, padding: 24, borderRadius: 24, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, shadowColor: colors.black, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 18 },
  close: { position: 'absolute', top: 12, right: 12, zIndex: 2, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  closePressed: { opacity: 0.7 },
  icon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.gold },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10 },
  restrictionBox: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18, padding: 14, borderRadius: 14, backgroundColor: 'rgba(245,40,135,0.10)', borderWidth: 1, borderColor: 'rgba(245,40,135,0.28)' },
  restrictionText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  action: { width: '100%', minHeight: 54, marginTop: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary },
  actionPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  actionText: { color: colors.white, fontSize: 16, fontWeight: '900' },
});

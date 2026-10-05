import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { AppField } from '../components/AppField';
import { Screen } from '../components/Screen';
import { api, getApiErrorCode, getErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme/colors';
import type { AuthStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext';
import { AppSelect } from '../components/AppSelect';
import { useAuth } from '../context/AuthContext';
import type { LoginResponse } from '../types/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
type ProfileType = 'single' | 'couple';
type Gender = 'Male' | 'Female';
type CoupleType = 'woman_man' | 'two_women' | 'two_men' | 'other';
type RegisterField = 'profileType' | 'firstName' | 'lastName' | 'email' | 'password' | 'gender' | 'partnerFirstName' | 'partnerLastName' | 'coupleType';
type RegisterErrors = Partial<Record<RegisterField, string>>;

export function RegisterScreen({ navigation }: Props) {
  const { t, language } = useLanguage();
  const { establishSession } = useAuth();
  const verificationInFlight = useRef(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [profileType, setProfileType] = useState<ProfileType | ''>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [partnerFirstName, setPartnerFirstName] = useState('');
  const [partnerLastName, setPartnerLastName] = useState('');
  const [coupleType, setCoupleType] = useState<CoupleType | ''>('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acknowledgedPrivacy, setAcknowledgedPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({});
  const [acceptedError, setAcceptedError] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationCodeError, setVerificationCodeError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setInterval(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);
  const clearFieldError = (key: RegisterField) => setFieldErrors((current) => ({ ...current, [key]: undefined }));
  const update = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    clearFieldError(key);
    setError('');
  };

  const submit = async () => {
    const required = t('validation.required');
    const nextErrors: RegisterErrors = {};
    if (!profileType) nextErrors.profileType = required;
    if (!form.firstName.trim()) nextErrors.firstName = required;
    if (!form.lastName.trim()) nextErrors.lastName = required;
    if (!form.email.trim()) nextErrors.email = required;
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = t('validation.email');
    if (!form.password) nextErrors.password = required;
    else if (form.password.length < 8) nextErrors.password = t('validation.passwordMin');
    if (profileType === 'single' && !gender) nextErrors.gender = required;
    if (profileType === 'couple') {
      if (!partnerFirstName.trim()) nextErrors.partnerFirstName = required;
      if (!partnerLastName.trim()) nextErrors.partnerLastName = required;
      if (!coupleType) nextErrors.coupleType = required;
    }
    setFieldErrors(nextErrors);
    const nextAcceptedError = !acceptedTerms ? t('register.acceptTerms') : !acknowledgedPrivacy ? t('register.acknowledgePrivacyRequired') : '';
    setAcceptedError(nextAcceptedError);
    if (Object.keys(nextErrors).length || nextAcceptedError) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/register/verification-code', {
        email: form.email.trim().toLowerCase(),
        locale: language,
      });
      setVerificationPending(true);
      setVerificationCode('');
      setVerificationCodeError('');
      setResendSeconds(Number(response.data?.resendAfterSeconds) || 60);
    } catch (value) {
      const message = getErrorMessage(value, t('register.verificationSendFailed'), t);
      if (getApiErrorCode(value) === 'EMAIL_ALREADY_REGISTERED') {
        setFieldErrors((current) => ({ ...current, email: message }));
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const registrationPayload = (emailVerificationToken: string) => ({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        profileType,
        gender: profileType === 'single' ? gender : undefined,
        partnerFirstName: profileType === 'couple' ? partnerFirstName.trim() : undefined,
        partnerLastName: profileType === 'couple' ? partnerLastName.trim() : undefined,
        coupleType: profileType === 'couple' ? coupleType : undefined,
        acceptedTerms,
        acknowledgedPrivacy,
        emailVerificationToken,
        locale: language,
  });

  const verifyAndRegister = async (codeOverride?: string) => {
    if (verificationInFlight.current) return;
    const enteredCode = codeOverride || verificationCode;
    if (!/^\d{6}$/.test(enteredCode)) {
      setVerificationCodeError(t('register.codeInvalid'));
      return;
    }
    verificationInFlight.current = true;
    setLoading(true);
    setError('');
    setVerificationCodeError('');
    try {
      const verification = await api.post('/register/verify-email', {
        email: form.email.trim().toLowerCase(),
        code: enteredCode,
      });
      const registration = await api.post<LoginResponse>('/register', registrationPayload(verification.data.verificationToken));
      await establishSession(registration.data);
    } catch (value) {
      const message = getErrorMessage(value, t('register.failed'), t);
      const code = getApiErrorCode(value);
      if (['VERIFICATION_CODE_INVALID', 'VERIFICATION_CODE_EXPIRED', 'VERIFICATION_TOO_MANY_ATTEMPTS'].includes(code || '')) {
        setVerificationCodeError(message);
      } else {
        setError(message);
      }
    } finally {
      verificationInFlight.current = false;
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendSeconds > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/register/verification-code', {
        email: form.email.trim().toLowerCase(),
        locale: language,
      });
      setVerificationCode('');
      setVerificationCodeError('');
      setResendSeconds(Number(response.data?.resendAfterSeconds) || 60);
    } catch (value) {
      setError(getErrorMessage(value, t('register.verificationSendFailed'), t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <View>
          <Text style={styles.eyebrow}>SWINGERS WORLD</Text>
          <Text style={styles.title}>{t('register.title')}</Text>
          <Text style={styles.subtitle}>{t('register.adultsOnly')}</Text>
        </View>
        <View style={styles.form}>
          {verificationPending ? (
            <>
              <Text style={styles.verificationTitle}>{t('register.verifyTitle')}</Text>
              <Text style={styles.verificationText}>{t('register.verifyBody').replace('{{email}}', form.email.trim().toLowerCase())}</Text>
              <AppField
                label={t('register.verificationCode')}
                value={verificationCode}
                error={verificationCodeError}
                onChangeText={(value) => {
                  const sanitized = value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(sanitized);
                  setVerificationCodeError('');
                  setError('');
                  if (sanitized.length === 6) {
                    setTimeout(() => { void verifyAndRegister(sanitized); }, 0);
                  }
                }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={6}
                style={styles.codeInput}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <AppButton title={t('register.verifyAndCreate')} onPress={verifyAndRegister} loading={loading} />
              <Pressable disabled={resendSeconds > 0 || loading} onPress={resendCode}>
                <Text style={[styles.secondaryAction, resendSeconds > 0 && styles.disabledAction]}>
                  {resendSeconds > 0
                    ? t('register.resendIn').replace('{{seconds}}', String(resendSeconds))
                    : t('register.resend')}
                </Text>
              </Pressable>
              <Pressable onPress={() => { setVerificationPending(false); setVerificationCode(''); setError(''); }}>
                <Text style={styles.back}>{t('register.changeEmail')}</Text>
              </Pressable>
            </>
          ) : (
          <>
          <AppSelect
            label={t('register.profileType')}
            value={profileType}
            placeholder={t('common.selectOption')}
            cancelLabel={t('common.cancel')}
            error={fieldErrors.profileType}
            onChange={(value) => { setProfileType(value); clearFieldError('profileType'); setError(''); }}
            options={[
              { value: 'single', label: t('register.single') },
              { value: 'couple', label: t('register.couple') },
            ]}
          />
          <AppField label={t('register.firstName')} value={form.firstName} error={fieldErrors.firstName} onChangeText={update('firstName')} autoComplete="given-name" />
          <AppField label={t('register.lastName')} value={form.lastName} error={fieldErrors.lastName} onChangeText={update('lastName')} autoComplete="family-name" />
          <AppField label={t('login.email')} value={form.email} error={fieldErrors.email} onChangeText={update('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <AppField label={t('login.password')} value={form.password} error={fieldErrors.password} onChangeText={update('password')} secureTextEntry autoComplete="new-password" />
          {profileType === 'single' ? (
            <AppSelect
              label={t('register.gender')}
              value={gender}
              placeholder={t('common.selectOption')}
              cancelLabel={t('common.cancel')}
              error={fieldErrors.gender}
              onChange={(value) => { setGender(value); clearFieldError('gender'); }}
              options={[
                { value: 'Male', label: t('value.male') },
                { value: 'Female', label: t('value.female') },
              ]}
            />
          ) : null}
          {profileType === 'couple' ? (
            <>
              <AppField label={t('register.partnerName')} value={partnerFirstName} error={fieldErrors.partnerFirstName} onChangeText={(value) => { setPartnerFirstName(value); clearFieldError('partnerFirstName'); }} autoComplete="given-name" />
              <AppField label={t('register.partnerLastName')} value={partnerLastName} error={fieldErrors.partnerLastName} onChangeText={(value) => { setPartnerLastName(value); clearFieldError('partnerLastName'); }} autoComplete="family-name" />
              <AppSelect
                label={t('register.coupleType')}
                value={coupleType}
                placeholder={t('common.selectOption')}
                cancelLabel={t('common.cancel')}
                error={fieldErrors.coupleType}
                onChange={(value) => { setCoupleType(value); clearFieldError('coupleType'); }}
                options={[
                  { value: 'woman_man', label: t('value.womanMan') },
                  { value: 'two_women', label: t('value.twoWomen') },
                  { value: 'two_men', label: t('value.twoMen') },
                  { value: 'other', label: t('value.otherCouple') },
                ]}
              />
            </>
          ) : null}
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acceptedTerms }} onPress={() => { setAcceptedTerms((value) => !value); setAcceptedError(''); }} style={styles.checkRow}>
            <View style={[styles.checkbox, acceptedError && styles.checkboxError, acceptedTerms && styles.checked]}>{acceptedTerms ? <Text style={styles.check}>✓</Text> : null}</View>
            <Text style={styles.checkText}>{t(profileType === 'couple' ? 'register.confirmAdultsCouple' : 'register.confirmAdult')}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Legal', { document: 'terms' })} style={styles.legalLinkRow}><Text style={styles.legalLink}>{t('register.viewTerms')} →</Text></Pressable>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acknowledgedPrivacy }} onPress={() => { setAcknowledgedPrivacy((value) => !value); setAcceptedError(''); }} style={styles.checkRow}>
            <View style={[styles.checkbox, acceptedError && styles.checkboxError, acknowledgedPrivacy && styles.checked]}>{acknowledgedPrivacy ? <Text style={styles.check}>✓</Text> : null}</View>
            <Text style={styles.checkText}>{t('register.acknowledgePrivacy')}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Legal', { document: 'privacy' })} style={styles.legalLinkRow}><Text style={styles.legalLink}>{t('register.viewPrivacy')} →</Text></Pressable>
          {acceptedError ? <Text style={styles.error}>{acceptedError}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton title={t('register.sendCode')} onPress={submit} loading={loading} />
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>{t('register.haveAccount')}</Text></Pressable>
          </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  eyebrow: { color: colors.primary, fontWeight: '900', letterSpacing: 2.5, fontSize: 12 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: spacing.xs },
  subtitle: { color: colors.textMuted, marginTop: spacing.sm },
  form: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  checkRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxError: { borderColor: colors.danger },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: colors.white, fontWeight: '900' },
  checkText: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  error: { color: colors.danger, fontSize: 13 },
  legalLinkRow: { alignSelf: 'flex-start', marginLeft: 22 + spacing.sm, marginTop: -spacing.sm },
  legalLink: { color: colors.goldSoft, fontSize: 13, fontWeight: '700' },
  back: { color: colors.goldSoft, fontWeight: '700', textAlign: 'center', padding: spacing.sm },
  verificationTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  verificationText: { color: colors.textMuted, lineHeight: 21 },
  codeInput: { textAlign: 'center', fontSize: 24, fontWeight: '800', letterSpacing: 8 },
  secondaryAction: { color: colors.goldSoft, fontWeight: '700', textAlign: 'center', padding: spacing.sm },
  disabledAction: { color: colors.textMuted },
});

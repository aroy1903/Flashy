import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Image, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, layout, radii, spacing } from '../../lib/theme';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null); setInfo(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    if (!data.session) {
      setInfo('Check your email to confirm your account, then sign in.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.brand}>StuddyPebble</Text>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Build flashcard decks you can study anywhere.</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 chars)"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.btn, (pressed || busy) && { opacity: 0.85 }]}
            onPress={submit}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Sign up</Text>}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.muted}>Have an account? </Text>
            <Link href="/(auth)/login" style={styles.link}>Sign in</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  brand: { color: colors.primaryHover, fontSize: 14, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 20, fontSize: 14 },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 14,
    color: colors.text,
    marginBottom: spacing.md,
    minHeight: layout.touchTarget,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: layout.touchTarget,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.sm, fontSize: 13 },
  info: { color: colors.success, marginBottom: spacing.sm, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl, flexWrap: 'wrap' },
  muted: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '600' },
});

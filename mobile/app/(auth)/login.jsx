import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Image, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, layout, radii, spacing } from '../../lib/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message);
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
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Pick up your flashcards right where you left off.</Text>

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
            placeholder="Password"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.btn, (pressed || busy) && { opacity: 0.85 }]}
            onPress={submit}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Sign in</Text>}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.muted}>No account? </Text>
            <Link href="/(auth)/register" style={styles.link}>Create one</Link>
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl, flexWrap: 'wrap' },
  muted: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '600' },
});

import { useMemo } from 'react';
import { Linking, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors, radii, spacing } from './theme';

// Renders markdown using the app's theme. Mirrors the web client's
// Flashcard.jsx mdComponents map so definitions look the same on both.
export default function MarkdownText({
  children,
  size = 'md',
  style,
}) {
  const styles = useMemo(() => buildStyles(size), [size]);
  const text = typeof children === 'string' ? children : String(children ?? '');
  return (
    <Markdown
      style={style ? { ...styles, body: { ...styles.body, ...style } } : styles}
      onLinkPress={(url) => { Linking.openURL(url).catch(() => {}); return true; }}
      mergeStyle
    >
      {text}
    </Markdown>
  );
}

function buildStyles(size) {
  const sizes = {
    sm: { body: 13, h1: 18, h2: 16, h3: 14, code: 12 },
    md: { body: 15, h1: 22, h2: 19, h3: 16, code: 13 },
    lg: { body: 17, h1: 26, h2: 22, h3: 19, code: 15 },
  };
  const s = sizes[size] || sizes.md;
  const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

  return {
    body: {
      color: colors.text,
      fontSize: s.body,
      lineHeight: Math.round(s.body * 1.5),
    },
    heading1: {
      color: colors.text,
      fontSize: s.h1,
      fontWeight: '700',
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    heading2: {
      color: colors.text,
      fontSize: s.h2,
      fontWeight: '700',
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    heading3: {
      color: colors.text,
      fontSize: s.h3,
      fontWeight: '600',
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    heading4: { color: colors.text, fontSize: s.h3, fontWeight: '600', marginTop: spacing.xs },
    heading5: { color: colors.text, fontSize: s.body, fontWeight: '600', marginTop: spacing.xs },
    heading6: { color: colors.textMuted, fontSize: s.body, fontWeight: '600', marginTop: spacing.xs },
    paragraph: {
      color: colors.text,
      fontSize: s.body,
      lineHeight: Math.round(s.body * 1.5),
      marginTop: 0,
      marginBottom: spacing.sm,
    },
    strong: { color: colors.text, fontWeight: '700' },
    em: { color: colors.text, fontStyle: 'italic' },
    s: { color: colors.textMuted, textDecorationLine: 'line-through' },
    link: { color: colors.primaryHover, textDecorationLine: 'underline' },
    blockquote: {
      backgroundColor: 'transparent',
      borderLeftColor: colors.primary,
      borderLeftWidth: 3,
      paddingLeft: spacing.sm,
      marginVertical: spacing.sm,
      color: colors.textMuted,
    },
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: spacing.sm,
    },
    bullet_list: { marginVertical: spacing.xs },
    ordered_list: { marginVertical: spacing.xs },
    list_item: {
      color: colors.text,
      fontSize: s.body,
      lineHeight: Math.round(s.body * 1.5),
      marginVertical: 2,
    },
    bullet_list_icon: { color: colors.primaryHover, marginLeft: 4, marginRight: 8 },
    ordered_list_icon: { color: colors.primaryHover, marginLeft: 4, marginRight: 8 },
    code_inline: {
      backgroundColor: colors.inputBg,
      color: colors.primaryHover,
      borderRadius: radii.sm,
      paddingHorizontal: 6,
      paddingVertical: 1,
      fontFamily: mono,
      fontSize: s.code,
    },
    code_block: {
      backgroundColor: 'rgba(0,0,0,0.4)',
      color: colors.text,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginVertical: spacing.sm,
      fontFamily: mono,
      fontSize: s.code,
      lineHeight: Math.round(s.code * 1.5),
      borderWidth: 1,
      borderColor: colors.border,
    },
    fence: {
      backgroundColor: 'rgba(0,0,0,0.4)',
      color: colors.text,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginVertical: spacing.sm,
      fontFamily: mono,
      fontSize: s.code,
      lineHeight: Math.round(s.code * 1.5),
      borderWidth: 1,
      borderColor: colors.border,
    },
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      marginVertical: spacing.sm,
    },
    thead: { backgroundColor: colors.inputBg },
    th: {
      padding: spacing.xs,
      borderColor: colors.border,
      color: colors.text,
      fontWeight: '700',
      fontSize: s.code,
    },
    tr: { borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row' },
    td: {
      padding: spacing.xs,
      borderColor: colors.border,
      color: colors.text,
      fontSize: s.code,
    },
    image: {
      borderRadius: radii.sm,
      marginVertical: spacing.xs,
    },
  };
}

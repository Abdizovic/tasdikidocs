import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  isLast?: boolean;
  defaultOpen?: boolean;
}

export function AccordionItem({ title, children, isLast, defaultOpen }: AccordionItemProps) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(!!defaultOpen);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  }

  return (
    <View style={[!isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
      <Pressable onPress={toggle} style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
      </Pressable>
      {open ? (
        <View style={styles.body}>
          {typeof children === 'string' ? (
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>{children}</Text>
          ) : (
            children
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  title: { flex: 1, fontSize: 15, fontWeight: '600' },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
  bodyText: { fontSize: 13, lineHeight: 20 },
});

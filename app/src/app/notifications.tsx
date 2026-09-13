import { Card, EmptyState, ScreenContainer } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/format';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import type { AppNotification } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

const TONE_ICON: Record<AppNotification['tone'], keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  danger: 'alert-circle',
};

export default function NotificationsScreen() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const profileId = session!.profile.id;
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);

  const load = useCallback(() => {
    listNotifications(profileId).then(setNotifications);
  }, [profileId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handlePress(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(profileId, n.id);
      load();
    }
    if (n.link) router.push(n.link as Href);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(profileId);
    load();
  }

  const hasUnread = notifications?.some((n) => !n.read) ?? false;

  return (
    <ScreenContainer scroll={false}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerRight: hasUnread
            ? () => (
                <Pressable onPress={handleMarkAllRead}>
                  <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>Mark all read</Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      {!notifications ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : notifications.length === 0 ? (
        <EmptyState icon="notifications-outline" title="No notifications yet" description="Updates about your account will show up here." />
      ) : (
        <View style={{ gap: 10 }}>
          {notifications.map((n) => {
            const fg = theme.colors[n.tone];
            const bg = theme.colors[`${n.tone}Bg` as 'infoBg' | 'successBg' | 'warningBg' | 'dangerBg'];
            return (
              <Pressable key={n.id} onPress={() => handlePress(n)}>
                <Card style={[styles.row, !n.read && { borderColor: theme.colors.primary }]}>
                  <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                    <Ionicons name={TONE_ICON[n.tone]} size={18} color={fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{n.title}</Text>
                    <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{n.body}</Text>
                    <Text style={[styles.time, { color: theme.colors.textMuted }]}>{formatDateTime(n.created_at)}</Text>
                  </View>
                  {!n.read ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  time: { fontSize: 11, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});

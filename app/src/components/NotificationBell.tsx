import { useAuth } from '@/context/AuthContext';
import { listNotifications } from '@/lib/mockApi';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function NotificationBell() {
  const theme = useAppTheme();
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      listNotifications(session.profile.id).then((list) => setUnreadCount(list.filter((n) => !n.read).length));
    }, [session]),
  );

  return (
    <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={styles.wrap}>
      <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
      {unreadCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.colors.danger, borderColor: theme.colors.background }]}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});

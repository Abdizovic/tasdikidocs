import { Button, ScreenContainer } from '@/components/ui';
import { useAppTheme } from '@/theme/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Stack, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

function extractCertificateId(scannedValue: string): string {
  const match = scannedValue.match(/verify\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : scannedValue;
}

export default function ScanScreen() {
  const theme = useAppTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const handledRef = useRef(false);

  function handleScan(result: BarcodeScanningResult) {
    if (handledRef.current) return;
    handledRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const query = extractCertificateId(result.data);
    router.replace({ pathname: '/(verifier)/result', params: { query } });
  }

  if (!permission) {
    return <ScreenContainer scroll={false} />;
  }

  if (!permission.granted) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ headerShown: true, title: 'Scan QR Code' }} />
        <View style={styles.permissionWrap}>
          <Ionicons name="camera-outline" size={40} color={theme.colors.textMuted} />
          <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>Camera access needed</Text>
          <Text style={[styles.permissionBody, { color: theme.colors.textSecondary }]}>
            TasdikiDocs needs your camera to scan certificate QR codes.
          </Text>
          <Button label="Grant camera access" onPress={requestPermission} style={{ marginTop: 16 }} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ headerShown: true, title: 'Scan QR Code', headerTransparent: true, headerTintColor: '#fff' }} />
      <CameraView
        style={styles.flex}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      >
        <View style={styles.overlay}>
          <View style={[styles.frame, { borderColor: theme.colors.primary }]} />
          <Text style={styles.overlayText}>Align the QR code within the frame</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  frame: { width: 240, height: 240, borderWidth: 3, borderRadius: 24, backgroundColor: 'transparent' },
  overlayText: { color: '#fff', fontWeight: '600' },
  permissionWrap: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8, paddingHorizontal: 32 },
  permissionTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  permissionBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

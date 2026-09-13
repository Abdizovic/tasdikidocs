import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/apiError';
import { downloadReport } from '@/lib/reports';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { AccountMenuRow } from './AccountMenuRow';

const SUBTITLES: Record<string, string> = {
  admin: 'Platform summary, institutions, certificates and activity',
  institution: 'Certificates issued and verification activity',
  verifier: 'Your recent certificate verifications',
};

export function DownloadReportRow({ isLast }: { isLast?: boolean }) {
  const { session } = useAuth();
  const [generating, setGenerating] = useState(false);

  async function handlePress() {
    if (!session || generating) return;
    setGenerating(true);
    try {
      await downloadReport(session);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : 'Could not generate the report. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AccountMenuRow
      icon="download-outline"
      label="Download PDF Report"
      subtitle={generating ? 'Preparing your report…' : SUBTITLES[session?.profile.role ?? '']}
      onPress={handlePress}
      loading={generating}
      isLast={isLast}
    />
  );
}

// React Native Web's Alert.alert is a no-op, so fall back to the browser dialog.
function showError(message: string) {
  if (Platform.OS === 'web') {
    window.alert(message);
    return;
  }
  Alert.alert('Report not generated', message);
}

// QR codes encode a deep link into this app's own `verify/[certId]` route
// (also reachable as a public static web page once deployed, since Expo
// Router exports web output for that same route — see app/verify/[certId]).
export function verifyDeepLink(certificateId: string): string {
  return `tasdikidocs://verify/${certificateId}`;
}

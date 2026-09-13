export interface DocSection {
  category: string;
  title: string;
  body: string;
}

export const DOC_SECTIONS: DocSection[] = [
  {
    category: 'Getting Started',
    title: 'What is TasdikiDocs?',
    body: 'TasdikiDocs lets approved institutions issue tamper-proof digital certificates, and lets anyone — an employer or the certificate holder themselves — instantly check whether a certificate is genuine by scanning its QR code or searching its ID, without ever having to call the issuing institution.',
  },
  {
    category: 'Getting Started',
    title: 'The three account types',
    body: '• Institution accounts apply and wait for admin approval before they can issue certificates.\n• Verifier accounts are free and open to anyone — employers and certificate holders use the same account type.\n• The Admin account reviews institution applications and is never created through sign-up; there is exactly one.',
  },
  {
    category: 'For Verifiers',
    title: 'Scanning a certificate',
    body: 'From the Verify tab, choose "Scan QR code" and point your camera at the code printed on (or attached to) the certificate. The result appears immediately with a clear valid, revoked, or not-found status.',
  },
  {
    category: 'For Verifiers',
    title: 'Searching by ID or registration number',
    body: 'If you don’t have the QR code, choose "Search by ID" and type the certificate ID, the student’s registration number, or the certificate hash printed on the document.',
  },
  {
    category: 'For Verifiers',
    title: 'Reading a verification result',
    body: 'Valid (green, shield check) means the certificate is genuine and active. Revoked (red) means the institution has withdrawn it since it was issued — treat it as invalid. Not found (amber) means the value you entered doesn’t match any certificate on record; double-check for typos.',
  },
  {
    category: 'For Institutions',
    title: 'Applying to issue certificates',
    body: 'From the welcome screen, choose "Represent an institution? Apply to issue certificates" and fill in your account details and your institution’s registration information. Your account is created immediately, but you’ll see a "Pending Review" screen instead of a dashboard until a platform admin approves you.',
  },
  {
    category: 'For Institutions',
    title: 'Issuing a certificate',
    body: 'Once approved, use "Issue new certificate" on your dashboard. Enter the student’s details, course, grade, and issue date. TasdikiDocs generates a unique certificate hash and a QR code you can print on or attach to the certificate.',
  },
  {
    category: 'For Institutions',
    title: 'Revoking a certificate',
    body: 'Open the certificate from your Certificates list and choose "Revoke certificate." You’ll be asked for a reason, which is permanently recorded in the audit log — revocation cannot be undone, matching how a real academic record correction would work.',
  },
  {
    category: 'For Admins',
    title: 'Reviewing institution applications',
    body: 'The Applications tab lists every institution by status. Approve, reject (with a reason), or later suspend an institution found issuing fraudulent certificates — every action is written to the audit log with who did it and why.',
  },
  {
    category: 'Security',
    title: 'How certificate verification works',
    body: 'Each certificate’s data is hashed at issuance. That hash — not the certificate document itself — is what gets anchored on-chain, which is what makes tampering detectable: changing even one character of the certificate would produce a different hash than the one on record.',
  },
  {
    category: 'Security',
    title: 'Two-factor authentication',
    body: 'Under Account → Security → Two-Factor Authentication, you can require a code from an authenticator app at sign-in for an extra layer of protection on top of your password.',
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Is verifying a certificate free?',
    answer: 'Yes. Verification is free and open to anyone with a verifier account, which itself is free and instant to create.',
  },
  {
    question: 'Do I need an account to verify a certificate?',
    answer: 'Within the app, yes — verifier sign-up is free and takes seconds. A certificate’s QR code can also resolve to a public web page that requires no account at all, for sharing with someone who doesn’t have the app.',
  },
  {
    question: 'How long does an institution application take to review?',
    answer: 'This depends on the platform admin, but institutions typically hear back within 1-2 business days. You can check your status anytime from the Pending Review screen.',
  },
  {
    question: 'What happens if a certificate is revoked after I already verified it?',
    answer: 'Verification always reflects the certificate’s current status, not a cached result. If you check the same certificate again after it’s revoked, you’ll see the updated "Revoked" status.',
  },
  {
    question: 'What is the difference between "Revoked" and "Not Found"?',
    answer: '"Revoked" means the certificate was genuinely issued but has since been withdrawn by the institution. "Not Found" means the ID, registration number, or hash you entered doesn’t match any certificate on record at all — often a typo.',
  },
  {
    question: 'Can institutions outside Kenya use TasdikiDocs?',
    answer: 'Yes — the institution application and every phone number field support countries worldwide, not just Kenya. Pick your country from the dropdown and your local dialing code from the phone field.',
  },
  {
    question: 'How do I reset my password?',
    answer: 'Choose "Forgot password?" on the sign-in screen. You’ll receive a 6-digit verification code by email, then can set a new password that meets the strength requirements shown on screen.',
  },
  {
    question: 'What data does TasdikiDocs store about me?',
    answer: 'Your profile (name, email, phone), and — for institutions — your organization details and issued certificates. Certificate documents themselves are intended to live on IPFS, with only a hash reference stored on-chain, keeping the on-chain footprint minimal.',
  },
  {
    question: 'Is TasdikiDocs live on a real blockchain yet?',
    answer: 'The app you’re using runs on demo data while the Supabase database and Polygon smart contract integration are finished. The certificate hashing, QR codes, and verification logic you see are the real design — they’ll write to and read from the live chain once that phase is complete.',
  },
];

export class ApiError extends Error {
  code: string;
  // Set when code === 'locked' so the UI can render a live countdown
  // instead of a generic error message.
  retryAfterSeconds?: number;
  // Set when code === 'mfa_required' — the factor the login screen must
  // challenge next to finish signing in.
  mfaFactorId?: string;

  constructor(message: string, code = 'unknown_error', retryAfterSeconds?: number, mfaFactorId?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
    this.mfaFactorId = mfaFactorId;
  }
}

/**
 * Shared validation and normalization for admin contact APIs.
 */

export const MAX_NAME_LEN = 255;
export const MAX_MOBILE_LEN = 20;
export const MAX_EMAIL_LEN = 255;

export type ParsedContactFields = {
  name: string;
  mobile: string | null;
  email: string | null;
};

export type ContactFieldErrorCode =
  | 'MISSING_NAME'
  | 'INVALID_EMAIL'
  | 'FIELD_TOO_LONG';

export function normalizeContactNameKey(name: string): string {
  return name.trim().toLowerCase();
}

function isValidBasicEmail(s: string): boolean {
  const t = s.trim();
  const at = t.indexOf('@');
  if (at <= 0) return false;
  const dot = t.indexOf('.', at + 1);
  return dot > at + 1 && dot < t.length - 1;
}

export function parseContactFields(input: {
  name: unknown;
  mobile?: unknown;
  email?: unknown;
}):
  | { ok: true; value: ParsedContactFields }
  | { ok: false; code: ContactFieldErrorCode } {
  const nameRaw = typeof input.name === 'string' ? input.name.trim() : '';
  if (!nameRaw) {
    return { ok: false, code: 'MISSING_NAME' };
  }
  if (nameRaw.length > MAX_NAME_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }

  const mobileRaw =
    typeof input.mobile === 'string' ? input.mobile.trim() : '';
  if (mobileRaw.length > MAX_MOBILE_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }
  const mobile = mobileRaw === '' ? null : mobileRaw;

  const emailRaw =
    typeof input.email === 'string' ? input.email.trim() : '';
  if (emailRaw.length > MAX_EMAIL_LEN) {
    return { ok: false, code: 'FIELD_TOO_LONG' };
  }
  if (emailRaw !== '' && !isValidBasicEmail(emailRaw)) {
    return { ok: false, code: 'INVALID_EMAIL' };
  }
  const email = emailRaw === '' ? null : emailRaw;

  return {
    ok: true,
    value: {
      name: nameRaw,
      mobile,
      email,
    },
  };
}

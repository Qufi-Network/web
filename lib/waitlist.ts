/**
 * Genesis node register of interest.
 *
 * The endpoint is a build-time variable rather than a hard-coded URL, so the
 * same build can be pointed at whatever the register eventually lives behind —
 * a form service, an internal API, a mailing list — without touching this file.
 *
 * When nothing is configured the form still validates and still responds, but
 * it says plainly that nothing was sent. A sign-up form that thanks you while
 * quietly discarding what you typed is worse than no form at all.
 */

export interface Registration {
  name: string;
  email: string;
  organisation: string;
}

export type SubmitOutcome =
  | { status: 'sent' }
  | { status: 'preview' }
  | { status: 'failed'; reason: string };

const ENDPOINT = process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT ?? '';

/** Good enough to catch a typo; the real check is the confirmation email. */
export function validate(registration: Registration): string | null {
  if (registration.name.trim().length < 2) return 'Please give a name we can address you by.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(registration.email.trim())) {
    return 'That email address does not look right.';
  }
  return null;
}

export async function submitRegistration(registration: Registration): Promise<SubmitOutcome> {
  if (!ENDPOINT) return { status: 'preview' };

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: registration.name.trim(),
        email: registration.email.trim(),
        organisation: registration.organisation.trim(),
        interest: 'genesis-node',
      }),
    });
    if (!response.ok) {
      return { status: 'failed', reason: `The register returned ${response.status}.` };
    }
    return { status: 'sent' };
  } catch {
    return { status: 'failed', reason: 'Could not reach the register. Please try again.' };
  }
}

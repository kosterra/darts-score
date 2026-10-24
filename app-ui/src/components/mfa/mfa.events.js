// the profile tells when two-step login was turned on or off (the reminder follows)
export const MFA_CHANGED = 'darts-score:mfa-changed';
export const announceMfaChange = () => window.dispatchEvent(new Event(MFA_CHANGED));

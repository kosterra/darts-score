import { WebAuthnAbortService, browserSupportsWebAuthn, browserSupportsWebAuthnAutofill, startAuthentication, startRegistration } from '@simplewebauthn/browser';

import AuthService from '../services/auth.service';

/**
 * Passkeys in the browser: whether it can, adding one to the account and
 * logging in with one. The device asks for the fingerprint, the face or its
 * PIN; the API checks the answer.
 */

export const passkeysSupported = () => browserSupportsWebAuthn();
export const passkeyAutofillSupported = () => browserSupportsWebAuthnAutofill().catch(() => false);

// the user closed the device's dialog, or another attempt took its place: nothing to say
export const isCancelled = (error) => ['NotAllowedError', 'AbortError'].includes(error?.name) || error?.code === 'ERROR_CEREMONY_ABORTED';

// adds a passkey of this device: the password (and a code of two-step login) first; answers the list of passkeys
export const addPasskey = async (password, code) => {
    const optionsJSON = await AuthService.passkeyOptions(password, code);
    const response = await startRegistration({ optionsJSON });
    return AuthService.savePasskey(response);
};

/**
 * Logs in with a passkey: answers the account as a login does. autofill: the
 * passkeys offered in the email field (waits until one is chosen), else the
 * device's dialog at once.
 */
export const loginWithPasskey = async ({ autofill = false } = {}) => {
    const optionsJSON = await AuthService.passkeyLoginOptions();
    const response = await startAuthentication({ optionsJSON, useBrowserAutofill: autofill });
    return AuthService.passkeyLogin(response);
};

// an offer in the email field ends when the page goes, or a button starts its own login
export const cancelPasskey = () => WebAuthnAbortService.cancelCeremony();

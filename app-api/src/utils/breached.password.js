import { createHash } from 'node:crypto';
import logger from '../models/logger.model.js';

/**
 * Whether a password is known from a data breach (OWASP ASVS V6: refuse
 * breached passwords), asked of Have I Been Pwned's Pwned Passwords with
 * k-anonymity: only the first five hex characters of the SHA-1 go to the
 * API (with padding, so the answer size says nothing either); the password
 * and its full hash never leave the server.
 *
 * Fails open: a slow or unreachable API (3 s) means "not known", logged once,
 * so nobody is kept from choosing a password by a third party.
 *
 * BREACHED_PASSWORD_CHECK=off turns it off; the tests never call the network
 * unless BREACHED_PASSWORD_CHECK=on.
 */
export const RANGE_URL = 'https://api.pwnedpasswords.com/range/';
export const TIMEOUT_MS = 3000;
export const BREACHED_MESSAGE = 'This password appeared in a data breach. Choose another one.';

let failureLogged = false;

export const isCheckEnabled = () => {
    const setting = process.env.BREACHED_PASSWORD_CHECK;
    if (setting === 'off') return false;
    if (setting === 'on') return true;
    return process.env.NODE_ENV !== 'test';
};

const logFailure = (reason, err) => {
    // one line per start, not one per attempt while the API is down
    if (failureLogged) return logger.debug({ err }, `Breached-password check skipped: ${reason}`);
    failureLogged = true;
    logger.warn({ err }, `Breached-password check skipped: ${reason}. Passwords are accepted unchecked until the API answers again.`);
};

/** Only for tests: forget that a failure was logged. */
export const resetFailureLog = () => { failureLogged = false; };

export const isBreachedPassword = async (password) => {
    if (!isCheckEnabled() || typeof password !== 'string' || !password) return false;

    const hash = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(RANGE_URL + prefix, {
            headers: { 'Add-Padding': 'true', 'User-Agent': 'Legmate' },
            signal: controller.signal,
        });
        if (!response.ok) {
            logFailure(`the API answered ${response.status}`);
            return false;
        }
        const body = await response.text();
        for (const line of body.split(/\r?\n/)) {
            const [lineSuffix, count] = line.trim().split(':');
            // padding lines come with a count of 0
            if (lineSuffix === suffix) return Number.parseInt(count, 10) > 0;
        }
        return false;
    } catch (err) {
        logFailure(err?.name === 'AbortError' ? `no answer within ${TIMEOUT_MS / 1000} s` : 'the API could not be reached', err);
        return false;
    } finally {
        clearTimeout(timer);
    }
};

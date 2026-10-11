import { createHash, randomBytes } from 'crypto';
import { getAppUrl } from './mail.utils.js';

export const RESET_TOKEN_HOURS = 1;
export const INVITE_TOKEN_HOURS = 7 * 24;

// Only the hash is stored, so a database leak does not expose usable links
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

/**
 * Gives the user a fresh single-use "set your password" token and returns the
 * link to mail. The caller saves the user.
 */
export const issuePasswordLink = (user, validHours) => {
    const token = randomBytes(32).toString('hex');
    user.resetTokenHash = hashToken(token);
    user.resetTokenExpires = new Date(Date.now() + validHours * 60 * 60 * 1000);
    return `${getAppUrl()}/reset-password?token=${token}`;
};

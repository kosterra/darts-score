import { randomBytes } from 'crypto';
import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { hashPassword } from './auth.utils.js';
import { issuePasswordLink, INVITE_TOKEN_HOURS } from './auth.tokens.js';
import { isMailConfigured } from './mail.utils.js';

/**
 * Returns the account with this email, creating it when there is none yet —
 * either with the given initial password or, without one, with a mailed
 * "choose your password" link.
 *
 * Resolves to { user, inviteLink } or to { error } when the account cannot be
 * created from what was given.
 */
export const findOrCreateAccount = async ({ email, firstname, lastname, password }, createdBy) => {
    const existing = await db.user.findOne({ email });
    if (existing) return { user: existing, inviteLink: null };

    if (!firstname || !lastname) {
        return { error: 'There is no account with this email yet. Enter a firstname and lastname to create it.' };
    }
    if (!password && !isMailConfigured()) {
        return { error: 'Enter an initial password for the new account.' };
    }

    const user = new db.user({
        email,
        firstname,
        lastname,
        role: ROLES.USER,
        // Without an initial password nobody can log in until the mailed link is used
        passwordHash: await hashPassword(password || randomBytes(32).toString('hex')),
    });
    const inviteLink = password ? null : issuePasswordLink(user, INVITE_TOKEN_HOURS);
    await user.save();
    logger.info(`User ${user.email} created by ${createdBy.email}`);
    return { user, inviteLink };
};

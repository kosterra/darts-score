import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { hashPassword } from './auth.utils.js';
import { runMigrations } from './migrations.js';
import { secretReadable } from './mfa.js';

/**
 * Creates the first global admin from ADMIN_EMAIL / ADMIN_PASSWORD when there
 * is none yet. Later changes to those variables do not touch existing accounts.
 */
const ensureGlobalAdmin = async () => {
    const existing = await db.user.findOne({ role: ROLES.GLOBAL_ADMIN });
    if (existing) return existing;

    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        logger.warn('No global admin exists — set ADMIN_EMAIL and ADMIN_PASSWORD to create one on startup');
        return null;
    }
    if (ADMIN_PASSWORD.length < 8) {
        logger.warn('ADMIN_PASSWORD must have at least 8 characters — no global admin created');
        return null;
    }

    const email = ADMIN_EMAIL.trim().toLowerCase();
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    let admin = await db.user.findOne({ email });
    if (admin) {
        admin.role = ROLES.GLOBAL_ADMIN;
        await admin.save();
    } else {
        admin = await db.user.create({ email, passwordHash, firstname: 'Global', lastname: 'Admin', role: ROLES.GLOBAL_ADMIN });
    }
    logger.info(`Global admin ${email} is ready`);
    return admin;
};

/**
 * The way back in for a global admin who lost both the phone and the
 * recovery codes: ADMIN_RESET_MFA=<email> turns off the two-step login of
 * that account on the next start (remove the variable afterwards).
 */
const resetMfaFromEnv = async () => {
    const email = process.env.ADMIN_RESET_MFA?.trim().toLowerCase();
    if (!email) return;
    const user = await db.user.findOne({ email });
    if (!user?.mfa?.enabledAt) return;
    user.mfa = { secret: null, pendingSecret: null, enabledAt: null, lastStep: null, recoveryHashes: [], trustSalt: null };
    await user.save({ timestamps: false });
    logger.warn(`Two-step login of ${email} turned off by ADMIN_RESET_MFA — remove the variable now`);
};

/**
 * Says at the start when the secrets of two-step login no longer open with
 * MFA_KEY (it was changed or removed): those accounts can only log in with a
 * recovery code (and set it up again) until the old key is back.
 */
const checkMfaKey = async () => {
    const users = await db.user.find({ 'mfa.enabledAt': { $ne: null } }, 'email mfa').lean();
    const lost = users.filter(user => !secretReadable(user));
    if (lost.length) {
        logger.warn(`The two-step login of ${lost.length} of ${users.length} accounts cannot be checked with this MFA_KEY (${lost.map(user => user.email).join(', ')}): put the old key back, or they log in with a recovery code and set it up again (ADMIN_RESET_MFA=<email> for a global admin without one)`);
    }
};

export const bootstrap = async () => {
    const admin = await ensureGlobalAdmin();
    await resetMfaFromEnv();
    await checkMfaKey().catch(err => logger.error(err, 'Checking the secrets of two-step login failed'));
    await runMigrations({ admin });
};

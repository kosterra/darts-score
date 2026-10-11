import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { ROLES } from '../models/user.model.js';
import { hashPassword } from './auth.utils.js';
import { runMigrations } from './migrations.js';

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

export const bootstrap = async () => {
    const admin = await ensureGlobalAdmin();
    await runMigrations({ admin });
};

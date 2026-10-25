import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { getLegalSettings } from './legal.settings.js';
import { isMailConfigured, getAppUrl } from './mail.utils.js';
import { sendTemplateMail } from './mail.service.js';

/**
 * The contact form: a message by mail to the operator of the installation
 * (their address under System settings → Privacy and imprint), answered to its sender.
 * Nothing of it is stored by Legmate.
 */
export const CONTACT_LIMITS = { name: 80, email: 254, message: 3000 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// why a message cannot be sent so, or null
export const contactError = ({ name, email, message } = {}) => {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > CONTACT_LIMITS.name) return 'Give your name, at most 80 characters.';
    if (typeof email !== 'string' || !EMAIL.test(email.trim()) || email.trim().length > CONTACT_LIMITS.email) return 'Give your email address, so the answer reaches you.';
    if (typeof message !== 'string' || message.trim().length < 10 || message.trim().length > CONTACT_LIMITS.message) return 'Write a message of 10 to 3000 characters.';
    return null;
};

/**
 * Sends the message. → 'sent', or 'off' when there is no form (no address of
 * the operator, or no mail server). bot: the hidden field was filled, so it
 * is quietly dropped (and looks sent).
 */
export const sendContactMessage = async ({ name, email, message, bot = false }) => {
    const { email: to } = await getLegalSettings();
    if (!to || !isMailConfigured()) return 'off';
    if (bot) {
        logger.warn('A message of the contact form with the hidden field filled was dropped');
        return 'sent';
    }
    // in the operator's own language when they have an account with that address
    const language = (await db.user.findOne({ email: to.toLowerCase() }, 'language').lean())?.language ?? 'en';
    await sendTemplateMail('contactMessage', to, {
        name: name.trim(), email: email.trim(), message: message.trim(), link: getAppUrl(),
    }, language, { replyTo: email.trim() });
    logger.info('A message of the contact form was sent to the operator');
    return 'sent';
};

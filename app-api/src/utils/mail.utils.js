import nodemailer from 'nodemailer';
import logger from '../models/logger.model.js';

/**
 * Public address of the app, used for links in emails. It deliberately never
 * comes from request headers: those are attacker-controlled and would allow
 * sending a victim a reset link that points to a foreign site.
 */
export const getAppUrl = () => (process.env.APP_URL || process.env.UI_URL || '').replace(/\/+$/, '');

export const isMailConfigured = () => Boolean(process.env.SMTP_HOST && getAppUrl());

let transporter;

const getTransporter = () => {
    if (!transporter) {
        const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD } = process.env;
        const port = Number(SMTP_PORT) || 587;
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port,
            secure: SMTP_SECURE ? SMTP_SECURE === 'true' : port === 465,
            ...(SMTP_USER && { auth: { user: SMTP_USER, pass: SMTP_PASSWORD } }),
        });
    }
    return transporter;
};

export const sendMail = async ({ to, subject, text }) => {
    await getTransporter().sendMail({
        from: process.env.SMTP_FROM || 'Darts Score <no-reply@darts-score.local>',
        to,
        subject,
        text,
    });
    logger.info(`Sent "${subject}" mail to ${to}`);
};

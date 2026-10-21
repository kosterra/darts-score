import db from '../models/db.model.js';
import logger from '../models/logger.model.js';
import { effectiveTemplate, renderMail } from './mail.templates.js';
import { getAppUrl, isMailConfigured, sendMail } from './mail.utils.js';

// what the global admins changed in the mail templates (one setting, "mailTemplates")
const KEY = 'mailTemplates';

export const getTemplateOverrides = async () => (await db.setting.findOne({ key: KEY }).lean())?.value ?? {};

export const saveTemplateOverride = async (id, template) => {
    const overrides = await getTemplateOverrides();
    if (template) overrides[id] = template;
    else delete overrides[id];
    await db.setting.updateOne({ key: KEY }, { $set: { value: overrides } }, { upsert: true });
    return overrides;
};

/**
 * Sends one of the mails of the app to "to", with vars for its placeholders
 * (the address of the installation is added). Resolves to false when mail is
 * not set up; failures are logged by the caller.
 */
export const sendTemplateMail = async (id, to, vars) => {
    if (!isMailConfigured()) return false;
    const mail = renderMail(effectiveTemplate(id, await getTemplateOverrides()), { appUrl: getAppUrl(), ...vars });
    await sendMail({ to, ...mail });
    return true;
};

const plural = (count, word) => `${count} ${count === 1 ? word : `${word}s`}`;

/**
 * How long a link works, in words: "1 hour", "7 days".
 */
export const validityOf = (hours) => hours % 24 === 0 ? plural(hours / 24, 'day') : plural(hours, 'hour');

/**
 * Tells someone they were made an admin of a club ('admin') or given the
 * login of a player ('player'); a new account gets the link to choose its password.
 */
export const sendClubWelcomeMail = (user, inviteLink, kind, { club, inviter, nickname = '', validHours = 7 * 24 }) => {
    const id = `${kind}${inviteLink ? 'Invited' : 'Added'}`;
    sendTemplateMail(id, user.email, {
        firstname: user.firstname,
        club,
        inviter,
        nickname,
        validity: validityOf(validHours),
        link: inviteLink ?? `${getAppUrl()}/login`,
    }).catch(err => logger.error(err, `Failed to send the ${id} mail`));
};

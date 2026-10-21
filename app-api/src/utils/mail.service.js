import db from '../models/db.model.js';
import logger from '../models/logger.model.js';
import { effectiveTemplate, overrideKey, renderMail, validityOf } from './mail.templates.js';
import { getAppUrl, isMailConfigured, sendMail } from './mail.utils.js';

// what the global admins changed in the mail templates (one setting, "mailTemplates")
const KEY = 'mailTemplates';

export const getTemplateOverrides = async () => (await db.setting.findOne({ key: KEY }).lean())?.value ?? {};

export const saveTemplateOverride = async (id, template, language = 'en') => {
    const overrides = await getTemplateOverrides();
    const key = overrideKey(id, language);
    if (template) overrides[key] = template;
    else delete overrides[key];
    await db.setting.updateOne({ key: KEY }, { $set: { value: overrides } }, { upsert: true });
    return overrides;
};

export { validityOf };

/**
 * Sends one of the mails of the app to "to", in their language, with vars
 * for its placeholders (the address of the installation is added). Resolves
 * to false when mail is not set up; failures are logged by the caller.
 */
export const sendTemplateMail = async (id, to, vars, language = 'en') => {
    if (!isMailConfigured()) return false;
    const mail = renderMail(effectiveTemplate(id, await getTemplateOverrides(), language), { appUrl: getAppUrl(), ...vars }, language);
    await sendMail({ to, ...mail });
    return true;
};

/**
 * Tells someone they were made an admin of a club ('admin') or given the
 * login of a player ('player'); a new account gets the link to choose its
 * password. In the user's language; a new account has none yet and gets the
 * language of the admin who invited them (language).
 */
export const sendClubWelcomeMail = (user, inviteLink, kind, { club, inviter, nickname = '', validHours = 7 * 24, language = 'en' }) => {
    const id = `${kind}${inviteLink ? 'Invited' : 'Added'}`;
    const mailLanguage = user.language ?? language ?? 'en';
    sendTemplateMail(id, user.email, {
        firstname: user.firstname,
        club,
        inviter,
        nickname,
        validity: validityOf(validHours, mailLanguage),
        link: inviteLink ?? `${getAppUrl()}/login`,
    }, mailLanguage).catch(err => logger.error(err, `Failed to send the ${id} mail`));
};

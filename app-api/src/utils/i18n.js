/**
 * The texts of the rule files shared with the app (src/rules) stay English on
 * the API: the app translates what it shows. Fills in {{placeholders}} as the
 * app's i18n does.
 */
export const t = (text, values = {}) => String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => (key in values ? String(values[key]) : match));

export const tn = (count, one, other, values) => t(count === 1 ? one : other, { count, ...values });

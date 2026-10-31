/**
 * Defence in depth on top of the output encoding in the UI and the
 * server-rendered meta: free text people enter (club and competition names,
 * descriptions, notes, reasons, messages) is stripped of control characters
 * and angle brackets before it is stored, so a stored value can never carry
 * markup. Secrets and structured auth payloads are left untouched — a password
 * or a recovery code may legitimately contain any character, and a passkey
 * response is base64url data the browser built.
 */

// keys whose values are never display text: left exactly as sent
const SKIP_KEYS = new Set([
    'password', 'currentpassword', 'newpassword',
    'code', 'recoverycode', 'token',
    'response', 'publickey', 'challenge',
]);

// remove control characters (but keep tab, newline and carriage return, so
// multi-line descriptions survive) and the angle brackets that start a tag
const cleanString = (value) => value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '');

export const cleanDeep = (value) => {
    if (typeof value === 'string') return cleanString(value);
    if (Array.isArray(value)) return value.map(cleanDeep);
    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
            if (SKIP_KEYS.has(key.toLowerCase())) continue;
            value[key] = cleanDeep(value[key]);
        }
        return value;
    }
    return value;
};

/**
 * Express middleware: cleans the request body in place. Mounted on /api after
 * the body parsers and before the routes, so every validator and controller
 * sees the cleaned value and its length is what gets checked.
 */
export const sanitizeBody = (req, res, next) => {
    if (req.body && typeof req.body === 'object') cleanDeep(req.body);
    next();
};

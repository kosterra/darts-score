/**
 * Where to report a security problem (RFC 9116, /.well-known/security.txt): the
 * address of the operator of this installation (System settings → Privacy and
 * imprint), else the project's private advisory form; the project's policy
 * (SECURITY.md) in any case. Generated on request, so "Expires" rolls along.
 */
const PROJECT = 'https://github.com/kosterra/darts-score';
export const ADVISORY_URL = `${PROJECT}/security/advisories/new`;
export const POLICY_URL = `${PROJECT}/blob/main/SECURITY.md`;
// how long a copy of the file may be taken as current
export const VALID_DAYS = 90;

export const securityTxtOf = (base, legal = {}, now = new Date()) => {
    const expires = new Date(now.getTime() + VALID_DAYS * 24 * 60 * 60 * 1000);
    const contacts = [legal.email ? `mailto:${legal.email}` : null, ADVISORY_URL].filter(Boolean);
    return [
        ...contacts.map(contact => `Contact: ${contact}`),
        `Expires: ${expires.toISOString()}`,
        'Preferred-Languages: en, de, fr, it, es',
        `Canonical: ${String(base).replace(/\/$/, '')}/.well-known/security.txt`,
        `Policy: ${POLICY_URL}`,
        '',
    ].join('\n');
};

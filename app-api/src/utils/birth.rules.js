// A player with a login may correct their own date of birth, but only as an
// adult: the date decides whether a child is left out of the Hall of Shame
// (and the handicap of someone without games), so a child must not change it
// and nobody can make themselves a child. The admins set it first.

export const ADULT_AGE = 18;

/**
 * The age on a day, in whole years; null without a date.
 */
export const ageOn = (birth, day = new Date()) => {
    if (!birth) return null;
    const date = new Date(birth);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date(day);
    let age = today.getFullYear() - date.getFullYear();
    if (today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())) age -= 1;
    return age;
};

/**
 * The age from which players change it themselves: adult, and at least the
 * highest age limit of the Hall of Shame of their clubs.
 */
export const selfBirthAge = (clubs = []) => Math.max(ADULT_AGE, ...clubs.map(club => Number(club?.shameMinAge) || 0));

/**
 * Whether a player may change their date of birth from current to next
 * themselves: { allowed, reason }.
 */
export const ownBirthChange = (current, next, minAge, day = new Date()) => {
    if (!current) return { allowed: false, reason: 'Your club admins set the date of birth first.' };
    if (ageOn(current, day) < minAge) return { allowed: false, reason: `Under ${minAge} the date of birth is up to your club admins.` };
    if (ageOn(next, day) === null) return { allowed: false, reason: 'Date of birth must be a date.' };
    if (ageOn(next, day) < minAge) return { allowed: false, reason: `A date of birth under ${minAge} years can only be set by your club admins.` };
    return { allowed: true, reason: '' };
};

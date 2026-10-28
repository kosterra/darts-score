/**
 * "Your year in darts": which year a look back opens with (the past one in
 * January, this one otherwise), and when the dashboard tells about it: from
 * the first of December to the middle of January.
 */
export const defaultYear = (now = new Date()) => (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

export const yearInDartsSeason = (now = new Date()) => now.getMonth() === 11 || (now.getMonth() === 0 && now.getDate() <= 15);

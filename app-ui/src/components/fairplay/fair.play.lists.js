// how bad a finding is, worst first
export const LEVELS = { impossible: 3, error: 2, suspicious: 1 };

export const LEVEL_LABELS = { impossible: 'Impossible', error: 'Data error', suspicious: 'Suspicious' };

/**
 * Which list an entry is on: marked as fine (a false alarm) on its own list
 * whatever it is; the impossible ones until deleted; the others watched or by
 * their level.
 */
export const listOf = (entry) => {
    if (entry.review?.status === 'ok') return 'fine';
    if (entry.level === 'impossible') return 'impossible';
    if (entry.review?.status === 'watch') return 'watch';
    return entry.level === 'error' ? 'error' : 'suspicious';
};

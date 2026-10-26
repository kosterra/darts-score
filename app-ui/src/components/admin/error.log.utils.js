/**
 * The same warning or error logged again and again (e.g. at every restart),
 * as one row: the newest of them with how often it came and since when
 * (count, firstTime, times newest first). Entries come newest first; the
 * rows keep that order, by their newest one.
 */
export const groupEntries = (entries = []) => {
    const groups = new Map();
    for (const entry of entries) {
        const key = [entry.level, entry.message ?? '', entry.error?.message ?? ''].join('\u0000');
        const group = groups.get(key);
        if (group) {
            group.count += 1;
            group.firstTime = entry.time;
            group.times.push(entry.time);
        } else {
            groups.set(key, { ...entry, count: 1, firstTime: entry.time, times: [entry.time] });
        }
    }
    return [...groups.values()];
};

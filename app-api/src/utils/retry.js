/**
 * Games finishing at the same moment (four quarter-finals, two league
 * matches) all save the same document: every save but the first fails with a
 * VersionError. work reads the document again and saves; it is run again
 * until it is saved, at most attempts times (then the error is thrown).
 * work(attempt) gets the number of the attempt, 0 the first.
 */
export const SAVE_ATTEMPTS = 8;

export const untilSaved = async (work, { attempts = SAVE_ATTEMPTS, pause = 25 } = {}) => {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await work(attempt);
        } catch (err) {
            if (err?.name !== 'VersionError' || attempt + 1 >= attempts) throw err;
            // a short pause of a random length, so those that lost do not meet again at once
            if (pause > 0) await new Promise(resolve => setTimeout(resolve, Math.random() * pause));
        }
    }
};

import { beforeEach, describe, expect, it } from 'vitest';
import { clearSetup, fitToPlayers, isFormat, loadSetup, saveSetup, X01_QUICK_FORMATS } from './setup.memory';

const storage = () => {
    const items = new Map();
    return {
        getItem: (key) => items.has(key) ? items.get(key) : null,
        setItem: (key, value) => items.set(key, String(value)),
        removeItem: (key) => items.delete(key),
    };
};

describe('setup memory', () => {
    beforeEach(() => {
        globalThis.localStorage = storage();
        localStorage.setItem('darts-score.activeClub', 'club-1');
    });

    it('remembers the last setup per club and game type, without guests', () => {
        saveSetup('x01', {
            settings: { startingScore: 301 },
            players: [{ id: 'a' }, { id: 'g', guest: true }, { id: 'b' }],
            handicap: { a: { startingScore: 501 }, g: { startingScore: 101 } },
        });
        expect(loadSetup('x01')).toEqual({ settings: { startingScore: 301 }, friendly: false, playerIds: ['a', 'b'], handicap: { a: { startingScore: 501 } } });
        expect(loadSetup('cricket')).toBeNull();
        localStorage.setItem('darts-score.activeClub', 'club-2');
        expect(loadSetup('x01')).toBeNull();
    });

    it('forgets the setup', () => {
        saveSetup('x01', { settings: {} });
        clearSetup('x01');
        expect(loadSetup('x01')).toBeNull();
    });

    it('turns "best of" into "first to" for more than two players', () => {
        const settings = { setMode: 'Best of', numberOfSets: 3, legMode: 'Best of', numberOfLegs: 5 };
        expect(fitToPlayers(settings, 2)).toBe(settings);
        expect(fitToPlayers(settings, 3)).toEqual({ setMode: 'First to', numberOfSets: 2, legMode: 'First to', numberOfLegs: 3 });
    });

    it('knows the format a game is set up in', () => {
        const [format] = X01_QUICK_FORMATS;
        expect(isFormat({ ...format.settings }, format, 2)).toBe(true);
        expect(isFormat({ ...format.settings }, format, 3)).toBe(false);
        expect(isFormat(fitToPlayers(format.settings, 3), format, 3)).toBe(true);
    });
});

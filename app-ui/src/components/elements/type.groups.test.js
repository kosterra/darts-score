import { describe, expect, it } from 'vitest';
import { GAME_TYPE_GROUPS, TRAINING_TYPE_GROUPS, typesFrom, typesText } from './type.groups';

describe('the type filter in the address', () => {
    it('reads all, a list, and the links from before', () => {
        expect(typesFrom('all', GAME_TYPE_GROUPS)).toEqual([]);
        expect(typesFrom('', GAME_TYPE_GROUPS)).toEqual([]);
        expect(typesFrom('x01,cricket', GAME_TYPE_GROUPS)).toEqual(['x01', 'cricket']);
        expect(typesFrom('x01', GAME_TYPE_GROUPS)).toEqual(['x01']);
        expect(typesFrom('rules', GAME_TYPE_GROUPS)).toEqual(['shanghai', 'killer', 'halveit', 'golf', 'tactics']);
        expect(typesFrom('rules', TRAINING_TYPE_GROUPS)).toHaveLength(6);
    });

    it('leaves out what is no type of the list', () => {
        expect(typesFrom('x01,nonsense', GAME_TYPE_GROUPS)).toEqual(['x01']);
    });

    it('writes nothing chosen as all', () => {
        expect(typesText([])).toBe('all');
        expect(typesText(['x01', 'golf'])).toBe('x01,golf');
    });
});

import { describe, it, expect, vi } from 'vitest';

// the dictionary as it will be once these texts are translated (the real one comes from the app)
vi.mock('../locales/server.texts.json', () => ({
    default: {
        de: {
            'New personal best in {{title}}: {{value1}}': 'Neue persönliche Bestleistung in {{title}}: {{value1}}',
            '{{nickname}} beat your club record in {{title}}': '{{nickname}} hat deinen Clubrekord in {{title}} geknackt',
            '{{training}} with {{setting}}': '{{training}} mit {{setting}}',
            '{{training}} with {{setting}} and {{other}}': '{{training}} mit {{setting}} und {{other}}',
            '121 Checkout': '121 Checkout',
            '30 attempts': '30 Versuche',
            '9 darts': '9 Darts',
            '60 darts': '60 Darts',
            'Scoring': 'Scoring',
        },
    },
}));
vi.mock('../models/logger.model.js', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

const { trainingOnBoard } = await import('./player.notices.js');
const { translate } = await import('./translate.js');
const { boardLabels, trainingOf } = await import('../rules/trainings.js');

describe('a training record names the board it is on', () => {
    it('with the settings that split the scoreboard, the title alone for a training with one board', () => {
        expect(trainingOnBoard('121 Checkout', boardLabels(trainingOf('checkout121'), { attempts: 30, darts: 9 }))).toBe('121 Checkout with 30 attempts and 9 darts');
        expect(trainingOnBoard('Scoring', boardLabels(trainingOf('scoring'), {}))).toBe('Scoring with 30 darts');
        expect(trainingOnBoard('Treble practice', boardLabels(trainingOf('trebles'), { number: 19 }))).toBe('Treble practice with T19 and 30 darts');
        expect(trainingOnBoard('Catch 40', boardLabels(trainingOf('catch40'), {}))).toBe('Catch 40');
    });

    it('translates part by part: the sentence, the training and each setting', () => {
        expect(translate('de', `New personal best in ${trainingOnBoard('121 Checkout', ['30 attempts', '9 darts'])}: 135`))
            .toBe('Neue persönliche Bestleistung in 121 Checkout mit 30 Versuche und 9 Darts: 135');
        expect(translate('de', `Anna beat your club record in ${trainingOnBoard('Scoring', ['60 darts'])}`))
            .toBe('Anna hat deinen Clubrekord in Scoring mit 60 Darts geknackt');
    });
});

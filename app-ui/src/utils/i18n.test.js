import { beforeAll, describe, expect, it } from 'vitest';
import { initLanguage, t, tn, translateAnswer, translateText } from './i18n';

describe('i18n in German', () => {
    beforeAll(async () => {
        localStorage.setItem('darts-score.language', 'de');
        await initLanguage();
    });

    it('translates the texts of the app, with their values', () => {
        expect(t('Start game')).toBe('Spiel starten');
        expect(t('Choose {{MIN_PLAYERS}} to {{MAX_PLAYERS}} players', { MIN_PLAYERS: 2, MAX_PLAYERS: 4 })).toBe('Wähle 2 bis 4 Spieler');
        expect(tn(1, '{{count}} game', '{{count}} games')).toBe('1 Spiel');
        expect(tn(3, '{{count}} game', '{{count}} games')).toBe('3 Spiele');
        expect(t('A text nobody translated')).toBe('A text nobody translated');
    });

    it('translates what the server sends by its patterns, also inside one another', () => {
        expect(translateText('Club not found.')).toBe('Club nicht gefunden.');
        expect(translateText('Win 10 games in a row')).toBe('Gewinne 10 Spiele in Folge');
        expect(translateText('Needs the level Pro')).toBe('Braucht das Level Pro');
        expect(translateText('A game you played was deleted')).toBe('Ein Spiel, das du gespielt hast: gelöscht');
        // names stay as they are
        expect(translateText('Welcome to Red Lion')).toBe('Willkommen bei Red Lion');
    });

    it('translates the texts of the server in its answers, but not those of clubs and players', () => {
        const answer = translateAnswer({
            message: 'Club not found.',
            errors: ['Nickname is required.'],
            badge: { title: 'First Win', description: 'Win 10 games in a row' },
            level: { id: 'legend', name: 'Legend', xp: 4500 },
            club: { name: 'Darts', description: 'Win 10 games in a row', joinPolicy: 'open' },
            player: { nickname: 'Pro', name: 'Pro' },
        });
        expect(answer.message).toBe('Club nicht gefunden.');
        expect(answer.errors).toEqual(['Der Spitzname ist erforderlich.']);
        expect(answer.badge).toEqual({ title: 'Erster Sieg', description: 'Gewinne 10 Spiele in Folge' });
        expect(answer.level.name).toBe('Legende');
        expect(answer.club).toEqual({ name: 'Darts', description: 'Win 10 games in a row', joinPolicy: 'open' });
        expect(answer.player).toEqual({ nickname: 'Pro', name: 'Pro' });
    });
});

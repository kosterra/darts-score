type DartMultiplier = 'S' | 'D' | 'T';

const validateDartValue = (dart: string): boolean => {
    if (!dart || Number(dart) === 0) return true;

    if (/^[SDT]\d{1,2}$/i.test(dart)) {
        const value = Number(dart.slice(1));
        if ((value >= 1 && value <= 20) || /^[SD]25$/i.test(dart)) return true;
    }

    return false;
};

const dartIsDouble = (value: string): boolean => /^d/i.test(value);

const dartIsTriple = (value: string): boolean => /^t/i.test(value);

const lastDart = (currentThrow: string[]): string | undefined =>
    currentThrow.slice().reverse().find(d => d !== '');

const lastDartIsDouble = (currentThrow: string[]): boolean =>
    lastDart(currentThrow)?.toLowerCase()?.startsWith('d') ?? false;

const lastDartIsTriple = (currentThrow: string[]): boolean =>
    lastDart(currentThrow)?.toLowerCase()?.startsWith('t') ?? false;

interface GameWithPlayers {
    players: string[];
    currentPlayerTurn: string;
}

const changeCurrentPlayer = (game: GameWithPlayers): void => {
    const index = game.players.indexOf(game.currentPlayerTurn);
    game.currentPlayerTurn =
        index === 0
            ? game.players[game.players.length - 1]
            : game.players[index - 1];
};

const cricketGetCurrentScore = (
    currentThrow: string[],
    score: number,
    sectionHit: Record<number, number>
): number => {
    if (!currentThrow.some(v => v !== '')) return score;

    return [15, 16, 17, 18, 19, 20, 25].reduce((acc, n) => {
        const hits = sectionHit[n] ?? 0;
        return acc + (hits > 3 ? (hits - 3) * n : 0);
    }, 0);
};

const getCurrentThrowScore = (throwArr: string[] = []): number => {
    const multipliers: Record<DartMultiplier, number> = { S: 1, D: 2, T: 3 };
    return throwArr.reduce((sum, dart) => {
        if (!dart) return sum;
        const match = dart.match(/^([SDT])(\d{1,2}|25)$/i);
        if (!match) return sum;
        const [, type, value] = match;
        return sum + (multipliers[type as DartMultiplier] ?? 0) * Number(value);
    }, 0);
};

export {
    validateDartValue,
    dartIsDouble,
    dartIsTriple,
    lastDartIsDouble,
    lastDartIsTriple,
    changeCurrentPlayer,
    cricketGetCurrentScore,
    getCurrentThrowScore,
};

import { useContext } from 'react';

import CricketContext from '../../../utils/cricket.context';
import CricketDartBoard from './cricket.dartboard';
import CricketNumbersPanel from './cricket.numbers.panel';
import VisitInput from '../common/visit.input';
import DartKeypad from '../common/dart.keypad';
import useInputMode from '../common/use.input.mode';
import { variantOf } from '../../../utils/cricket.variants';
import { visitMarks } from './cricket.live';
import { t } from '../../../utils/i18n';

// only these count in Cricket; every other dart is a miss
const CRICKET_KEYS = [15, 16, 17, 18, 19, 20];

/**
 * The playing area of Cricket as on the X01 page: the board or the keypad,
 * the visit with its marks and points, and the board of marks below it.
 */
const CricketScoreInputBoard = () => {
    const {
        game,
        players,
        updateCurrentThrowManual,
        updateCurrentThrowDartBoard,
        onClickValidateThrow,
        getCurrentThrowScore,
        getCurrentSectionHit,
        onClickReturnToPreviousPlayer,
        checkIfAllSectionsClosed,
        checkIfScoreIsHighestScore,
        loading
    } = useContext(CricketContext);
    const [input, chooseInput] = useInputMode();

    if (game.hasWinner) return null;

    const darts = game.currentThrow;
    const sectionHit = getCurrentSectionHit();
    const score = getCurrentThrowScore();
    // once the darts so far win the game, the visit can end early
    const decided = checkIfAllSectionsClosed(sectionHit) && checkIfScoreIsHighestScore(score);
    const shown = darts.map(dart => dart !== '' || !decided);
    const entered = darts.filter(dart => dart.trim() !== '').length;
    const marks = visitMarks(darts);
    const gained = score - (game.playerModels[game.currentPlayerTurn]?.score ?? 0);
    const nickname = players.find(player => player.id === game.currentPlayerTurn)?.nickname ?? '';

    const clearLast = () => {
        const index = darts.map(dart => dart.trim() !== '').lastIndexOf(true);
        if (index >= 0) updateCurrentThrowManual('', index);
    };

    const summary = decided
        ? <span><strong>{t('Game shot')}</strong>{' '}{t('· enter the score to win')}</span>
        : <span>{t('Visit')}{' '}<strong>{marks}</strong> {marks === 1 ? t('mark') : t('marks')}{variantOf(game) === 'Standard' && <> · <strong>+{gained}</strong>{' '}{t('points')}</>}</span>;

    return (
        <VisitInput
            nickname={nickname}
            input={input}
            onChooseInput={chooseInput}
            board={<CricketDartBoard />}
            keypad={
                <DartKeypad
                    numbers={CRICKET_KEYS}
                    canThrow={entered < 3 && !decided}
                    onDart={updateCurrentThrowDartBoard}
                    onClearLast={clearLast}
                    entered={entered}
                    className="is-cricket"
                />
            }
            aside={<CricketNumbersPanel />}
            asideTitle={t('Marks')}
            asideFirstOnPhone
            darts={darts}
            shown={shown}
            onDart={(index, value) => updateCurrentThrowManual(value, index)}
            onClearDart={(index) => updateCurrentThrowManual('', index)}
            summary={summary}
            onSubmit={() => onClickValidateThrow(score, sectionHit)}
            onUndo={onClickReturnToPreviousPlayer}
            canUndo={game.allThrows.length > 0}
            loading={loading.validateThrow}
        />
    );
};

export default CricketScoreInputBoard;

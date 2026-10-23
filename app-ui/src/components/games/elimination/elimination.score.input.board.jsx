import { useContext } from 'react';

import EliminationContext from '../../../utils/elimination.context';
import EliminationDartBoard from './elimination.dartboard';
import EliminationStandings from './elimination.standings';
import VisitInput from '../common/visit.input';
import DartKeypad from '../common/dart.keypad';
import useInputMode from '../common/use.input.mode';
import { liveScores } from './elimination.live';
import { t } from '../../../utils/i18n';

/**
 * The playing area of Elimination as on the X01 page: the board or the
 * keypad, the visit with what it scores, and the race to the target below.
 */
const EliminationScoreInputBoard = () => {
    const {
        game,
        players,
        updateCurrentThrowManual,
        updateCurrentThrowDartBoard,
        onClickValidateThrow,
        getCurrentThrowScore,
        onClickReturnToPreviousPlayer,
        checkCanThrowMoreDarts,
        checkIfScoreIsBusted,
        loading
    } = useContext(EliminationContext);
    const [input, chooseInput] = useInputMode();

    if (game.hasWinner) return null;

    const darts = game.currentThrow;
    const throwScore = getCurrentThrowScore();
    const before = game.playerModels[game.currentPlayerTurn]?.score ?? 0;
    const score = before + throwScore;
    const busted = checkIfScoreIsBusted(score);
    // on the target the game is won: no more darts
    const canThrow = checkCanThrowMoreDarts(score) && score !== game.targetScore;
    const shown = [
        true,
        canThrow || darts[1].trim() !== '' || darts[2].trim() !== '',
        canThrow || darts[2].trim() !== '',
    ];
    const entered = darts.filter(dart => dart.trim() !== '').length;
    const nickname = (id) => players.find(player => player.id === id)?.nickname ?? '';
    // whom the score so far would send back to 0
    const scores = liveScores(game, throwScore);
    const sentBack = game.players.filter(id => id !== game.currentPlayerTurn && throwScore > 0 && game.playerModels[id]?.score === scores[game.currentPlayerTurn]);

    const clearLast = () => {
        const index = darts.map(dart => dart.trim() !== '').lastIndexOf(true);
        if (index >= 0) updateCurrentThrowManual(score, '', index);
    };

    const summary = busted
        ? <span><strong>{t('Bust')}</strong>{' '}{t('· the score stays at')}{' '}{before}</span>
        : score === game.targetScore
            ? <span><strong>{t('Game shot')}</strong>{' '}{t('· enter the score to win')}</span>
            : <span>{t('Visit')}{' '}<strong>{throwScore}</strong>{' '}{t('· total')}{' '}<strong>{score}</strong>{sentBack.length > 0 && <> · <strong>{sentBack.map(nickname).join(', ')}</strong>{' '}{t('back to 0')}</>}</span>;

    return (
        <VisitInput
            nickname={nickname(game.currentPlayerTurn)}
            input={input}
            onChooseInput={chooseInput}
            board={<EliminationDartBoard />}
            keypad={
                <DartKeypad
                    canThrow={canThrow}
                    onDart={(value) => updateCurrentThrowDartBoard(score, value)}
                    onClearLast={clearLast}
                    entered={entered}
                />
            }
            aside={<EliminationStandings />}
            asideTitle={t('Race to the target')}
            darts={darts}
            shown={shown}
            onDart={(index, value) => updateCurrentThrowManual(score, value, index)}
            onClearDart={(index) => updateCurrentThrowManual(score, '', index)}
            summary={summary}
            busted={busted}
            onSubmit={() => onClickValidateThrow(score)}
            onUndo={onClickReturnToPreviousPlayer}
            canUndo={(game.allThrows?.length ?? 0) > 0}
            loading={loading.validateThrow}
        />
    );
};

export default EliminationScoreInputBoard;

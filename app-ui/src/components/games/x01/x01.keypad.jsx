import { useContext } from 'react';

import X01Context from '../../../utils/x01.context';
import DartKeypad from '../common/dart.keypad';

/**
 * The keypad of X01: a dart fits as long as the visit can go on.
 */
const X01Keypad = () => {
    const { game, getCurrentThrowScore, checkCanThrowMoreDarts, updateCurrentThrowDartBoard, updateCurrentThrowManual } = useContext(X01Context);

    const score = game.playerModels[game.currentPlayerTurn].score - getCurrentThrowScore();
    const clearLast = () => {
        const index = game.currentThrow.map(dart => dart.trim() !== '').lastIndexOf(true);
        if (index >= 0) updateCurrentThrowManual(score, '', index);
    };

    return (
        <DartKeypad
            canThrow={checkCanThrowMoreDarts(score)}
            onDart={(value) => updateCurrentThrowDartBoard(score, value)}
            onClearLast={clearLast}
            entered={game.currentThrow.filter(dart => dart.trim() !== '').length}
        />
    );
};

export default X01Keypad;

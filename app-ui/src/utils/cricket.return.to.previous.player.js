import {
    changeCurrentPlayer,
    cricketGetCurrentScore
} from './game.utils';

const CricketReturnToPreviousPlayer = game => {
    let prevThrowInfo = game.allThrows.pop();

    changeCurrentPlayer(game);

    game.currentThrow = prevThrowInfo.darts;

    updateTotalThrow(
        game,
        prevThrowInfo.playerId,
        prevThrowInfo.darts.length
    );

    updateSectionHit(game.playerModels[prevThrowInfo.playerId], prevThrowInfo.darts);
    updateHit(game.playerModels[prevThrowInfo.playerId], prevThrowInfo.darts);

    let prevScore = cricketGetCurrentScore(game.currentThrow, game.playerModels[prevThrowInfo.playerId], game.playerModels[prevThrowInfo.playerId].sectionHit);
    game.playerModels[prevThrowInfo.playerId].score = prevScore;

    return game;
}

const updateTotalThrow = (game, playerId, dartsNbr) => {
    let totalThrow = game.playerModels[playerId].totalThrow;
    totalThrow.game.rounds--;
    totalThrow.game.darts -= dartsNbr;
    game.playerModels[playerId].totalThrow = totalThrow;
}

const updateSectionHit = (playerModel, darts) => {
    darts.forEach(dart => {
        let section = Number(dart.slice(1));

        if (section >= 15) {

            if (/t/i.test(dart[0])) {
                playerModel.sectionHit[section] >= 3 ?
                    playerModel.sectionHit[section] = playerModel.sectionHit[section] - 3 : playerModel.sectionHit[section] = 0;
            }

            if (/d/i.test(dart[0])) {
                playerModel.sectionHit[section] >= 2 ?
                    playerModel.sectionHit[section] = playerModel.sectionHit[section] - 2 : playerModel.sectionHit[section] = 0;
            }

            if (/s/i.test(dart[0])) {
                playerModel.sectionHit[section] > 0 && playerModel.sectionHit[section]--;
            }
        }
    })
}

const updateHit = (playerModel, darts) => {
    darts.forEach(dart => {
        if (Number(dart) === 0) dart = 'Missed';
        playerModel.hit[dart] > 0 && playerModel.hit[dart]--;
        playerModel.hit[dart] === 0 && delete playerModel.hit[dart];
    })
}

export default CricketReturnToPreviousPlayer;
import { useId } from 'react';

import { FlightPicture } from './flight.art';
import { flightOf } from '../../utils/flights';

/**
 * The flight a player throws with, small, next to their name (the game
 * headers, the throwing order). seat: their place in the game, for the
 * colour of the game.
 */
const PlayerFlight = ({ player, seat = 0, className = '' }) => {
    const uid = `player-flight-${useId().replace(/:/g, '')}`;
    if (!player) return null;
    const flight = flightOf(player, seat);
    return (
        <span className={`player-flight ${className}`} title={`${player.nickname}'s flight`}>
            <FlightPicture shape={flight.shape} design={flight.design} color={flight.color} uid={uid} />
        </span>
    );
};

export default PlayerFlight;

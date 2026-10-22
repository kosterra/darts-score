import { Link } from 'react-router-dom';
import { Panel } from 'primereact/panel';

import { GAMES } from '../../rules/games';
import { TRAININGS } from '../../rules/trainings';
import { rulesIcon } from './rules.icons';
import { t } from '../../utils/i18n';

const playersLine = (definition) => definition.minPlayers === definition.maxPlayers
    ? t('{{count}} players', { count: definition.minPlayers })
    : definition.minPlayers === 1
        ? t('Alone or with up to {{max}} players', { max: Math.min(definition.maxPlayers, 4) })
        : t('{{min}} to {{max}} players', { min: definition.minPlayers, max: Math.min(definition.maxPlayers, 4) });

/**
 * The games (or trainings) of the rules engine as cards: what each is about,
 * and a tap to set one up.
 */
const MoreGamesPage = ({ trainings = false }) => {
    const definitions = trainings ? TRAININGS : GAMES;
    return (
        <div className="container-fluid p-4 border-0">
            <Panel header={trainings ? t('More trainings') : t('More games')} className="w-100 w-xxl-75 mx-auto">
                <p className="text-subtle fs-7 mt-0 mb-4">
                    {trainings
                        ? t('Practise one thing at a time: the doubles, the checkouts or your scoring. Every attempt is kept, with your best on the scoreboard of the club.')
                        : t('Party and club games beyond X01 and Cricket. They count for your games, wins, XP and flight points like the others.')}
                </p>
                <div className="rules-cards">
                    {definitions.map(definition => {
                        const Icon = rulesIcon(definition.id);
                        return (
                            <Link key={definition.id} to={trainings ? `/training/${definition.id}` : `/play/${definition.id}`} className="rules-card">
                                <span className="rules-card-head">
                                    <span className="rules-card-icon" aria-hidden="true"><Icon /></span>
                                    {definition.title}
                                </span>
                                <p className="rules-card-text">{definition.description}</p>
                                {!trainings && <span className="rules-card-foot">{playersLine(definition)}</span>}
                            </Link>
                        );
                    })}
                </div>
            </Panel>
        </div>
    );
};

export default MoreGamesPage;

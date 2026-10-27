import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';

import { changePartners, teamsOfOrder } from '../../../utils/doubles';
import { t } from '../../../utils/i18n';

/**
 * Singles or doubles, offered from the start so it is found: doubles need
 * four players (the setup says so until there are four). two teams of two who share their
 * score, legs and sets. The teams follow the throwing order (first and third
 * against second and fourth), so the teams and partners take turns.
 * players: the chosen players in their throwing order; doubles: on or off;
 * onChange(doubles); onOrder(players): another order, for other partners.
 */
const X01DoublesConfig = ({ players, doubles, onChange, onOrder }) => {
    const teams = teamsOfOrder(players);
    const names = (team) => team.map(player => player.nickname).join(' & ');
    return (
        <div className="mt-3">
            <p className="setting-title">{t('Format')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2">
                    <SelectButton
                        value={doubles ? 'doubles' : 'singles'}
                        onChange={(e) => e.value && onChange(e.value === 'doubles')}
                        options={[{ label: t('Singles'), value: 'singles' }, { label: t('Doubles'), value: 'doubles' }]}
                        className="p-selectbutton-pills flex-wrap"
                        aria-label={t('Format')}
                    />
                    {doubles && !teams &&
                        <span className="text-faint fs-8">
                            {players.length < 4
                                ? t('Doubles are played by four players: choose {{count}} more, two teams of two who share their score.', { count: 4 - players.length })
                                : t('Doubles are played by four players: two teams of two who share their score.')}
                        </span>}
                    {doubles && teams
                        ? <>
                            <div className="doubles-teams">
                                <span className="doubles-team"><span className="text-faint fs-8">{t('Team 1')}</span>{names(teams[0])}</span>
                                <span className="doubles-against text-faint fs-8">{t('against')}</span>
                                <span className="doubles-team"><span className="text-faint fs-8">{t('Team 2')}</span>{names(teams[1])}</span>
                            </div>
                            <div>
                                <Button type="button" label={t('Change partners')} icon="pi pi-sync" size="small" severity="secondary" onClick={() => onOrder(changePartners(players))} />
                            </div>
                            <span className="text-faint fs-8">{t('Partners share their score, legs and sets; each keeps their own average and figures. The teams follow the throwing order: the first and third against the second and fourth.')}</span>
                        </>
                        : !doubles && <span className="text-faint fs-8">{t('Everyone for themselves, or with four players two teams of two who share their score.')}</span>}
                </div>
            </div>
        </div>
    );
};

export default X01DoublesConfig;

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';

import ClubService from '../../services/club.service';
import ClubLogo from '../elements/club.logo';
import CountryFlag from '../elements/country.flag';
import DeletePopup from '../elements/delete.popup';
import SettingSwitch from '../elements/setting.switch';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';

/**
 * A club's connections to other clubs, for its admins: the clubs it plays
 * shared tournaments with, the requests waiting to be decided, and a search to
 * ask another club. A connection grants no access to the other club's players
 * or statistics; it only lets the two invite each other into tournaments.
 */
const ClubConnections = ({ club, onSaved, onError, onSetting }) => {
    const [links, setLinks] = useState(null);
    const [failed, setFailed] = useState(false);
    const [search, setSearch] = useState('');
    const [found, setFound] = useState(null);
    const [busy, setBusy] = useState(false);
    const searching = useRef(false);

    const load = useCallback(async () => {
        try {
            setLinks(await ClubService.loadConnections(club.id));
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [club.id]);

    useEffect(() => { load(); }, [load]);

    // search for clubs to connect to, once the typing pauses; nothing shows until one types
    useEffect(() => {
        const q = search.trim();
        if (!q) { setFound(null); return undefined; }
        const timer = setTimeout(async () => {
            searching.current = true;
            try {
                setFound(await ClubService.loadConnectable(club.id, q));
            } catch {
                setFound([]);
            } finally {
                searching.current = false;
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search, club.id]);

    const request = async (other) => {
        setBusy(true);
        try {
            await ClubService.requestConnection(club.id, other.id);
            onSaved(t('A connection with {{name}} was requested. Their admins decide.', { name: other.name }));
            setSearch('');
            setFound(null);
            await load();
        } catch (error) {
            onError(t('Request a connection'), error);
        } finally {
            setBusy(false);
        }
    };

    const decide = async (link, accept) => {
        try {
            await ClubService.decideConnection(club.id, link.id, accept);
            onSaved(accept ? t('You are connected with {{name}}.', { name: link.clubName }) : t('The request from {{name}} was declined.', { name: link.clubName }));
            await load();
        } catch (error) {
            onError(t('Decide the connection'), error);
        }
    };

    const remove = async (link) => {
        try {
            await ClubService.removeConnection(club.id, link.id);
            onSaved(link.status === 'accepted' ? t('The connection with {{name}} was ended.', { name: link.clubName }) : t('The request to {{name}} was taken back.', { name: link.clubName }));
            await load();
        } catch (error) {
            onError(t('Remove the connection'), error);
        }
    };

    const accepted = (links ?? []).filter(link => link.status === 'accepted');
    const incoming = (links ?? []).filter(link => link.incoming);
    const outgoing = (links ?? []).filter(link => link.outgoing);
    const connectedIds = new Set((links ?? []).map(link => link.club));

    const clubRow = (link, actions) => (
        <li key={link.id} className="my-club">
            <div className="my-club-head">
                <ClubLogo club={{ name: link.clubName, logo: link.logo }} size="md" />
                <div className="my-club-title">
                    <span className="text-default fw-semibold fs-6 text-break">{link.clubName}{' '}<CountryFlag code={link.country} /></span>
                    {link.status === 'accepted'
                        ? <span className="text-faint fs-8">{t('Connected')}{link.since ? <>{' '}{formatDate(link.since)}</> : null}</span>
                        : link.incoming
                            ? <span className="text-faint fs-8">{t('Wants to connect')}{link.requestedByName ? <>{' · '}{link.requestedByName}</> : null}</span>
                            : <span className="text-faint fs-8">{t('Waiting for their admins')}</span>}
                </div>
                <div className="my-club-actions">{actions}</div>
            </div>
        </li>
    );

    return (
        <div id="connections">
            <Panel header={t('Connected clubs')} className="mt-4">
                <p className="text-subtle fs-7 mt-0 mb-3">
                    {t('Connect with another club to play shared tournaments together. Each club keeps its own players and statistics; a connection only lets you invite each other into a tournament.')}
                </p>

                {onSetting &&
                    <SettingSwitch
                        id="club-connectable"
                        title={t('Findable by other clubs')}
                        hint={t('Other clubs can find yours by name and ask to connect. Turn this off to stay hidden; your existing connections are not affected.')}
                        checked={club.connectable !== false}
                        onChange={(value) => onSetting({ connectable: value }, value ? t('Other clubs can find yours.') : t('Your club is hidden from other clubs.'))}
                    />}

                {failed && <p className="text-subtle fs-7 m-0">{t('The connections could not be loaded. Please reload the page.')}</p>}

                {incoming.length > 0 && <>
                    <p className="setting-title">{t('Requests to you')}</p>
                    <ul className="my-clubs list-unstyled m-0 mb-3">
                        {incoming.map(link => clubRow(link, <>
                            <Button label={t('Accept')} icon="pi pi-check" size="small" onClick={() => decide(link, true)} />
                            <Button label={t('Decline')} size="small" severity="secondary" text onClick={() => decide(link, false)} />
                        </>))}
                    </ul>
                </>}

                {(accepted.length > 0 || outgoing.length > 0) && <>
                    <p className="setting-title">{t('Your connections')}</p>
                    <ul className="my-clubs list-unstyled m-0 mb-3">
                        {accepted.map(link => clubRow(link,
                            <DeletePopup data={link} header={t('End connection')} message={t('the connection with {{name}}', { name: link.clubName })} handleDelete={() => remove(link)} label={t('Disconnect')} size="small" />
                        ))}
                        {outgoing.map(link => clubRow(link,
                            <Button label={t('Take back')} size="small" severity="secondary" text onClick={() => remove(link)} />
                        ))}
                    </ul>
                </>}

                <p className="setting-title">{t('Connect with a club')}</p>
                <div className="row mx-0 mt-0 setting-body">
                    <div className="col d-flex flex-column gap-2 pt-1">
                        {links !== null && accepted.length === 0 && outgoing.length === 0 && incoming.length === 0 &&
                            <span className="text-faint fs-8">{t('No connections yet. Search below to connect with a club.')}</span>}
                        <span className="p-input-icon-left">
                            <i className="pi pi-search" aria-hidden="true" />
                            <InputText value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search clubs by name')} aria-label={t('Search clubs by name')} maxLength={50} style={{ minWidth: '14rem' }} />
                        </span>
                        {found && found.length === 0 && search.trim() &&
                            <span className="text-faint fs-8">{t('No other club called like "{{trim}}".', { trim: search.trim() })}</span>}
                        {found && found.length > 0 &&
                            <ul className="my-clubs list-unstyled m-0">
                                {found.map(other => (
                                    <li key={other.id} className="my-club">
                                        <div className="my-club-head">
                                            <ClubLogo club={other} size="md" />
                                            <div className="my-club-title">
                                                <span className="text-default fw-semibold fs-6 text-break">{other.name}{' '}<CountryFlag code={other.country} /></span>
                                            </div>
                                            <div className="my-club-actions">
                                                {connectedIds.has(other.id)
                                                    ? <Tag value={t('Already connected')} severity="secondary" />
                                                    : <Button label={t('Connect')} icon="pi pi-link" size="small" loading={busy} onClick={() => request(other)} />}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>}
                    </div>
                </div>
            </Panel>
        </div>
    );
};

export default ClubConnections;

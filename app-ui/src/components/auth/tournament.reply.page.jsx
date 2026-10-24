import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';

import AuthLayout from './auth.layout';
import TournamentService from '../../services/tournament.service';
import { useAuth } from '../../utils/auth.context';
import { formatDateTime } from '../../utils/dates';
import { t } from '../../utils/i18n';
import { Lines } from '../elements/skeletons';

/**
 * The links of a tournament invitation (/tournament-reply?token=…&answer=in):
 * entering or declining without logging in. One tap confirms the answer of
 * the link, so a program that opens the links of mails does not answer for
 * anyone; the other answer is offered too.
 */
const TournamentReplyPage = () => {
    const { search } = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const params = new URLSearchParams(search);
    const token = params.get('token') ?? '';
    const wanted = params.get('answer') === 'out' ? 'out' : 'in';
    const [info, setInfo] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [answered, setAnswered] = useState(false);

    useEffect(() => {
        TournamentService.loadReply(token).then(setInfo).catch((err) => setError(err.message));
    }, [token]);

    const send = async (answer) => {
        setBusy(answer);
        setError('');
        try {
            setInfo(await TournamentService.sendReply(token, answer));
            setAnswered(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy('');
        }
    };

    const answer = info?.answer;
    return (
        <AuthLayout hide={user ? 'both' : undefined} title={info ? info.tournament.name : t('Tournament')}>
            {!info && !error && <Lines count={3} />}
            {error && <Message severity="warn" text={error} className="w-100 justify-content-start mb-3" />}
            {info &&
                <div className="d-flex flex-column gap-3 pt-2">
                    <p className="m-0 text-subtle">
                        {t('{{club}} holds a tournament. Hello {{nickname}}: will you play?', { club: info.club, nickname: info.nickname })}
                    </p>
                    <span className="text-faint fs-8">
                        {t('Registration until {{date}} · {{count}} of {{max}} places taken', { date: formatDateTime(info.tournament.closesAt), count: info.tournament.entered, max: info.tournament.maxPlayers })}
                    </span>
                    {answered && <Message severity="success" className="w-100 justify-content-start" text={answer === 'in' ? t('You are in. Good luck!') : t('You are out of this one.')} />}
                    {!answered && answer !== 'invited' && <Message severity="info" className="w-100 justify-content-start" text={answer === 'in' ? t('You are in already.') : t('You declined already.')} />}
                    {info.open
                        ? (
                            <div className="d-flex flex-column gap-2">
                                {answer !== 'in' && <Button type="button" label={t('I\'m in')} icon="pi pi-check" severity={wanted === 'in' ? undefined : 'secondary'} outlined={wanted !== 'in'} loading={busy === 'in'} onClick={() => send('in')} />}
                                {answer !== 'out' && <Button type="button" label={t('Not this time')} icon="pi pi-times" severity="secondary" outlined={wanted !== 'out'} loading={busy === 'out'} onClick={() => send('out')} />}
                            </div>
                        )
                        : <Message severity="warn" className="w-100 justify-content-start" text={info.tournament.status === 'cancelled' ? t('This tournament is cancelled.') : t('The registration is closed.')} />}
                    {user && <Button type="button" label={t('To the tournament')} icon="pi pi-sitemap" severity="secondary" text onClick={() => navigate(`/tournaments/${info.tournament.id}`)} />}
                </div>}
        </AuthLayout>
    );
};

export default TournamentReplyPage;

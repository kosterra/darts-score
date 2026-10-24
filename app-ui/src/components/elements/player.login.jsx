import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Message } from 'primereact/message';

import PlayerService from '../../services/player.service';
import { useAuth } from '../../utils/auth.context';
import { t } from '../../utils/i18n';

/**
 * Lets a club admin give a player a login, so the player can start games and
 * trainings in the club on their own, or take that login away again, right
 * on the page to edit the player (the key of the players list leads there).
 */
const PlayerLogin = ({ player, onChange }) => {
    const { mailEnabled } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    const hasLogin = !!player.user;

    const close = () => {
        setEmail('');
        setPassword('');
        setError('');
    };

    const run = async (action) => {
        setError('');
        setSubmitting(true);
        try {
            await action();
            close();
            await onChange?.();
        } catch (err) {
            setError(err.message);
        }
        setSubmitting(false);
    };

    const resend = async () => {
        setError('');
        setSubmitting(true);
        try {
            await PlayerService.resendInvite(player.id);
            setSent(true);
        } catch (err) {
            setError(err.message);
        }
        setSubmitting(false);
    };

    const onGiveLogin = (event) => {
        event.preventDefault();
        run(() => PlayerService.giveLogin(player.id, { email, password }));
    };

    const content = hasLogin
        ? (
            <div className="d-flex flex-column gap-3 pt-2">
                <span className="text-default">
                    {player.nickname}{' '}{t('logs in as')}{' '}<span className="fw-semibold text-break">{player.accountEmail ?? t('a linked account')}</span>{' '}{t('and can start games and trainings in this club.')}
                </span>
                {player.accountUsed === false &&
                    <span className="fs-7 text-subtle">
                        {sent ? t('The invitation was sent again, with a new link to choose the password.') : t('Not used yet: the invitation may have got lost.')}
                    </span>}
                <span className="fs-7 text-subtle">
                    {t('Removing the login keeps the player, their games and statistics. The account itself stays, in case it is used in other clubs.')}
                </span>
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <div className="d-flex justify-content-end gap-3 flex-wrap">
                    {player.accountUsed === false && mailEnabled && !sent && <Button type="button" label={t('Send the invitation again')} icon="pi pi-send" severity="secondary" size="small" loading={submitting} onClick={resend} />}
                    <Button type="button" label={t('Remove login')} icon="pi pi-times" severity="danger" size="small" loading={submitting} onClick={() => run(() => PlayerService.removeLogin(player.id))} />
                </div>
            </div>
        )
        : (
            <form onSubmit={onGiveLogin} className="d-flex flex-column gap-3 pt-2">
                <span className="fs-7 text-subtle">
                    {t('With a login')}{' '}{player.nickname}{' '}{t('can start games and trainings in this club on their own, but cannot manage players.')}
                    {mailEnabled
                        ? t(' They get a mail to choose their password; or set an initial password here.')
                        : t(' If the email has no account yet, set an initial password.')}
                </span>
                <InputText id={`player-login-email-${player.id}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('Email')} aria-label={t('Email')} required />
                <Password
                    inputId={`player-login-password-${player.id}`}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('Initial password (optional)')}
                    aria-label={t('Initial password')}
                    feedback={false}
                    className="w-100"
                    inputClassName="w-100"
                />
                {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                <div className="d-flex justify-content-end gap-3">
                    <Button type="submit" label={t('Give login')} icon="pi pi-key" size="small" loading={submitting} />
                </div>
            </form>
        );

    return <div className="player-login-inline">{content}</div>;
};

export default PlayerLogin;

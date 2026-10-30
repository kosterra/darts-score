import { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';

import ClubService from '../../services/club.service';
import { CLUB_ROLES } from '../../services/user.service';
import CountryPicker from '../elements/country.picker';
import ImageUploader from '../elements/image.uploader';
import SettingSwitch from '../elements/setting.switch';
import SetupBox from '../elements/setup.box';
import { useAuth } from '../../utils/auth.context';
import { resolveClubLogo } from '../../utils/image.utils';
import { t } from '../../utils/i18n';
import { ACCENT_OPTIONS } from '../../utils/accents';

const DESCRIPTION_MAX = 500;

// the same choices and words as the club settings, so nothing new to learn
const JOIN_POLICIES = [
    { label: t('Open'), value: 'open', hint: t('Anyone with an account finds the club under Join a club and becomes a member at once. The admins are told who joined.') },
    { label: t('Admins accept'), value: 'approval', hint: t('Anyone with an account can ask to join. One of the admins accepts or declines, on the players page.') },
    { label: t('Closed'), value: 'closed', hint: t('The club is not listed under Join a club. Only the admins add players and give them a login.') },
];

// the configuration steps; "Done" is the closing screen
const STEPS = ['basics', 'members', 'public'];

/**
 * A short, skippable walk-through after a club is created: the few things worth
 * setting up first (logo and look, how members join, the public page). Each
 * step is saved as you go and can be skipped; everything else stays on the
 * full Edit club page. Opened at /my-clubs/:id/setup right after creating.
 */
const ClubSetupWizard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useRef(null);
    const { clubs, refreshClubs, selectClub } = useAuth();
    const club = clubs.find(entry => entry.id === id);

    const [step, setStep] = useState(0);
    const [busy, setBusy] = useState(false);
    // step 1 — basics
    const [description, setDescription] = useState(club?.description ?? '');
    const [country, setCountry] = useState(club?.country ?? '');
    const [accent, setAccent] = useState(club?.accent ?? 'green');
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(resolveClubLogo(club?.logo));
    // step 2 — members
    const [joinPolicy, setJoinPolicy] = useState(club?.joinPolicy ?? 'closed');
    // step 3 — public page
    const [isPublic, setIsPublic] = useState(Boolean(club?.isPublic));
    const [publicLiveGames, setPublicLiveGames] = useState(club?.publicLiveGames !== false);
    const [publicResults, setPublicResults] = useState(club?.publicResults !== false);

    if (!club) return clubs.length ? <Navigate replace to="/my-clubs" /> : null;
    if (club.role !== CLUB_ROLES.ADMIN) return <Navigate replace to="/my-clubs" />;

    const showError = (error) => toast.current?.show({ severity: 'error', summary: t('Club settings'), detail: error.message, life: 4000 });

    const leave = (to) => { selectClub(club.id); navigate(to, { replace: true }); };

    // saves the current step; the club's name goes along, as the API needs it
    const saveStep = async () => {
        if (step === 0) {
            await ClubService.updateClub(club.id, { name: club.name, description, country, accent: accent === 'green' ? null : accent });
            if (logo instanceof File) await ClubService.uploadLogo(club.id, logo);
        } else if (step === 1) {
            await ClubService.updateClub(club.id, { name: club.name, joinPolicy });
        } else if (step === 2) {
            await ClubService.updateClub(club.id, { name: club.name, isPublic, publicLiveGames, publicResults });
        }
        await refreshClubs();
    };

    const next = async () => {
        setBusy(true);
        try {
            await saveStep();
            setStep(current => current + 1);
        } catch (error) {
            showError(error);
        } finally {
            setBusy(false);
        }
    };
    const skip = () => setStep(current => current + 1);
    const back = () => setStep(current => Math.max(0, current - 1));

    const done = step >= STEPS.length;

    return (
        <div className="container-fluid p-4">
            <Toast ref={toast} position="bottom-right" />
            <Panel header={done ? t('{{name}} is ready', { name: club.name }) : t('Set up {{name}}', { name: club.name })} className="page-narrow">
                {!done &&
                    <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                        {/* a dot per step, the ones done and the current one filled */}
                        <div className="d-flex align-items-center gap-2" aria-label={t('Step {{n}} of {{total}}', { n: step + 1, total: STEPS.length })}>
                            {STEPS.map((_, index) => (
                                <span key={index} className={`wizard-dot ${index <= step ? 'is-done' : ''}`} aria-hidden="true" />
                            ))}
                            <span className="text-faint fs-8 ms-2">{t('Step {{n}} of {{total}}', { n: step + 1, total: STEPS.length })}</span>
                        </div>
                        <Button label={t('Skip setup')} size="small" text severity="secondary" onClick={() => leave(`/my-clubs/${club.id}`)} />
                    </div>}

                {step === 0 &&
                    <div className="d-flex flex-column gap-3">
                        <p className="text-subtle fs-7 m-0">{t('Give your club a look. You can change all of this later under Edit club.')}</p>
                        <SetupBox title={t('Logo')}>
                            <ImageUploader
                                name={club.name}
                                previewUrl={logoPreview}
                                onFileChange={(file) => { setLogo(file); setLogoPreview(URL.createObjectURL(file)); }}
                                onFileDelete={() => { setLogo(null); setLogoPreview(''); }}
                            />
                        </SetupBox>
                        <SetupBox title={t('Description')} hint={t('Where and when you play, who can join, …')}>
                            <InputTextarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={DESCRIPTION_MAX} rows={3} autoResize aria-label={t('Description')} />
                        </SetupBox>
                        <SetupBox title={t('Country')} hint={t('Where the club plays: its flag is shown next to its name in the lists of clubs.')}>
                            <CountryPicker value={country} onChange={setCountry} />
                        </SetupBox>
                        <SetupBox title={t('Club colour')} hint={t('The accent colour of the app for the members who did not choose their own.')}>
                            <div className="accent-choices" role="radiogroup" aria-label={t('Club colour')}>
                                {ACCENT_OPTIONS.map(option => (
                                    <button key={option.value} type="button" role="radio" aria-checked={accent === option.value}
                                        className={`accent-choice ${accent === option.value ? 'is-chosen' : ''}`} onClick={() => setAccent(option.value)} title={option.label}>
                                        <span className="accent-swatch" style={{ '--swatch': option.color }} aria-hidden="true" />
                                        <span className="accent-choice-label">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </SetupBox>
                    </div>}

                {step === 1 &&
                    <div className="d-flex flex-column gap-3">
                        <p className="text-subtle fs-7 m-0">{t('Decide how people become members of your club.')}</p>
                        <SetupBox title={t('How they join')} hint={JOIN_POLICIES.find(entry => entry.value === joinPolicy)?.hint}>
                            <SelectButton value={joinPolicy} options={JOIN_POLICIES} optionLabel="label" optionValue="value"
                                onChange={(event) => event.value && setJoinPolicy(event.value)} className="p-selectbutton-pills pills-inline flex-wrap" aria-label={t('How new members join')} />
                        </SetupBox>
                    </div>}

                {step === 2 &&
                    <div className="d-flex flex-column gap-3">
                        <p className="text-subtle fs-7 m-0">{t('Show your club on the public start page, or keep it private.')}</p>
                        <SettingSwitch id="wizard-public" title={t('Public club')}
                            hint={t('Listed by name on the public start page, with its figures. Whether people with an account can find and join the club is set under New members.')}
                            checked={isPublic} onChange={setIsPublic} />
                        <SettingSwitch id="wizard-live" title={t('Show running games')} hint={t('Live scores of games in progress appear on the public start page.')}
                            checked={publicLiveGames} disabled={!isPublic} onChange={setPublicLiveGames} />
                        <SettingSwitch id="wizard-results" title={t('Show results')}
                            hint={t('Finished games appear under the latest results. Players are shown without their name unless their nickname is public: their own choice with a login, yours without.')}
                            checked={publicResults} disabled={!isPublic} onChange={setPublicResults} />
                    </div>}

                {done &&
                    <div className="d-flex flex-column gap-4">
                        <p className="text-subtle fs-7 m-0">{t('That\'s the basics done. Add your players next so you can start playing, or open the full settings for shirts, goals, game rules and connecting with other clubs.')}</p>
                        <div className="d-flex flex-wrap gap-2">
                            <Button label={t('Add players')} icon="pi pi-users" size="small" onClick={() => leave('/players')} />
                            <Button label={t('Club settings')} icon="pi pi-cog" size="small" severity="secondary" onClick={() => leave(`/my-clubs/${club.id}`)} />
                            <Button label={t('Go to the dashboard')} icon="pi pi-home" size="small" severity="secondary" outlined onClick={() => leave('/')} />
                        </div>
                    </div>}

                {!done &&
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-4">
                        <Button label={t('Back')} icon="pi pi-arrow-left" size="small" text severity="secondary" disabled={step === 0 || busy} onClick={back} />
                        <div className="d-flex gap-2">
                            <Button label={t('Skip')} size="small" severity="secondary" outlined disabled={busy} onClick={skip} />
                            <Button label={step === STEPS.length - 1 ? t('Finish') : t('Next')} icon={step === STEPS.length - 1 ? 'pi pi-check' : 'pi pi-arrow-right'} iconPos="right" size="small" loading={busy} onClick={next} />
                        </div>
                    </div>}
            </Panel>
        </div>
    );
};

export default ClubSetupWizard;

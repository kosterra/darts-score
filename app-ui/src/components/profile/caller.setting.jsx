import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';

import useGamePreferences from '../../utils/use.game.preferences';
import { DEVICE_VOICE, call, callerSample, callerSupported, callerVoices, chosenVoiceName, setCallerVoiceKind, setChosenVoiceName, unlockCaller } from '../../utils/caller';
import { t } from '../../utils/i18n';

const KINDS = [
    { value: 'male', label: t('Male'), legmate: t('Legmate\'s caller, male'), device: t('A male voice of this device') },
    { value: 'female', label: t('Female'), legmate: t('Legmate\'s caller, female'), device: t('A female voice of this device') },
];
// the dropdown shows no choice for null: Legmate's caller stands for it
const LEGMATE = 'legmate';

/**
 * The caller's voice: male or female with the account (male, as most
 * callers on the stage), and on this device Legmate's own caller (the
 * files, in English) or a voice of the device instead, as each device has
 * voices of its own. Try says a 180 with it.
 */
const CallerSetting = ({ onSaved }) => {
    const [preferences, save] = useGamePreferences();
    const [voices, setVoices] = useState(callerVoices);
    const [chosen, setChosen] = useState(() => chosenVoiceName() ?? LEGMATE);

    // the voices load late on some browsers: the list follows when they come
    useEffect(() => {
        if (!callerSupported()) return undefined;
        const update = () => setVoices(callerVoices());
        window.speechSynthesis.addEventListener?.('voiceschanged', update);
        return () => window.speechSynthesis.removeEventListener?.('voiceschanged', update);
    }, []);
    useEffect(() => setCallerVoiceKind(preferences.callerVoice), [preferences.callerVoice]);

    if (!callerSupported()) return null;

    const kind = KINDS.find(entry => entry.value === preferences.callerVoice);
    const options = [
        { value: LEGMATE, label: kind.legmate },
        ...(voices.length ? [{ value: DEVICE_VOICE, label: kind.device }] : []),
        ...voices.map(voice => ({ value: voice.name, label: `${voice.name} (${voice.lang})` })),
    ];
    const choose = (name) => {
        setChosen(name);
        setChosenVoiceName(name === LEGMATE ? null : name);
        onSaved?.(t('Voice on this device'));
    };

    return (
        <>
            <p className="setting-title">{t('Caller voice')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2">
                    <SelectButton
                        value={preferences.callerVoice}
                        options={KINDS}
                        onChange={(e) => e.value && save({ callerVoice: e.value }).then(() => onSaved?.(t('Caller voice')))}
                        className="p-selectbutton-pills flex-wrap"
                        aria-label={t('Caller voice')}
                    />
                    <span className="text-faint fs-8">{t('The voice that calls the scores when the caller is on in a game: Legmate\'s own caller, in English as on the stage and the more excited the higher the score.')}</span>
                    <div className="d-flex gap-2 align-items-center mt-1">
                        <Dropdown value={options.some(option => option.value === chosen) ? chosen : LEGMATE} options={options} onChange={(e) => choose(e.value)} aria-label={t('Voice on this device')} className="flex-grow-1 min-w-0" />
                        <Button type="button" label={t('Try')} icon="pi pi-volume-up" className="p-button-sm p-button-outlined" onClick={() => {
                            unlockCaller();
                            call(callerSample(), { force: true });
                        }} />
                    </div>
                    <span className="text-faint fs-8">{t('Or a voice of this device, in the language of the app: every phone and computer has voices of its own, so this choice stays on this device. Player names always come from the device.')}</span>
                </div>
            </div>
        </>
    );
};

export default CallerSetting;

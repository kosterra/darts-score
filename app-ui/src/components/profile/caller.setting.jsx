import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { SelectButton } from 'primereact/selectbutton';

import { call, callerSample, callerSupported, callerVoices, chosenVoiceName, setCallerVoiceKind, setChosenVoiceName } from '../../utils/caller';
import { t } from '../../utils/i18n';

const KINDS = [
    { value: 'male', label: t('Male'), automatic: t('Automatic: a male voice') },
    { value: 'female', label: t('Female'), automatic: t('Automatic: a female voice') },
];
// the dropdown shows no choice for null: the voice of the kind stands for it
const AUTOMATIC = 'automatic';

/**
 * The caller's voice: male or female with the account (male, as most
 * callers on the stage), and a voice of this device to call with instead,
 * as each device has voices of its own. Try says a 180 with it.
 * voice: the kind chosen ('male' | 'female'); onChange(kind) saves it with
 * the account, as you go. The device's own voice is kept on the device.
 */
const CallerSetting = ({ voice, onChange }) => {
    const [voices, setVoices] = useState(callerVoices);
    const [chosen, setChosen] = useState(() => chosenVoiceName() ?? AUTOMATIC);

    // the voices load late on some browsers: the list follows when they come
    useEffect(() => {
        if (!callerSupported()) return undefined;
        const update = () => setVoices(callerVoices());
        window.speechSynthesis.addEventListener?.('voiceschanged', update);
        return () => window.speechSynthesis.removeEventListener?.('voiceschanged', update);
    }, []);
    useEffect(() => setCallerVoiceKind(voice), [voice]);

    if (!callerSupported()) return null;

    const options = [
        { value: AUTOMATIC, label: (KINDS.find(kind => kind.value === voice) ?? KINDS[0]).automatic },
        ...voices.map(entry => ({ value: entry.name, label: `${entry.name} (${entry.lang})` })),
    ];
    const choose = (name) => {
        setChosen(name);
        setChosenVoiceName(name === AUTOMATIC ? null : name);
    };

    return (
        <>
            <p className="setting-title">{t('Caller voice')}</p>
            <div className="row mx-0 mt-0 setting-body">
                <div className="col d-flex flex-column gap-2">
                    <SelectButton
                        value={voice}
                        options={KINDS}
                        onChange={(e) => e.value && onChange(e.value)}
                        className="p-selectbutton-pills pills-inline flex-wrap"
                        aria-label={t('Caller voice')}
                    />
                    <span className="text-faint fs-8">{t('The voice that calls the scores when the caller is on in a game. The device takes one of its voices of that kind where it has one.')}</span>
                    <div className="d-flex gap-2 align-items-center mt-1">
                        <Dropdown value={options.some(option => option.value === chosen) ? chosen : AUTOMATIC} options={options} onChange={(e) => choose(e.value)} aria-label={t('Voice on this device')} className="flex-grow-1 min-w-0" />
                        <Button type="button" label={t('Try')} icon="pi pi-volume-up" className="p-button-sm p-button-outlined" onClick={() => call(callerSample(), { force: true })} />
                    </div>
                    <span className="text-faint fs-8">{t('Voice on this device: every phone and computer has voices of its own, so this one stays on this device.')}</span>
                </div>
            </div>
        </>
    );
};

export default CallerSetting;

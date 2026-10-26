import { checkoutRoutes } from './checkout.routes';
import { currentLanguage, locale, t } from './i18n';

/**
 * The caller of an X01 game, as on the stage: the score of every visit
 * ("One hundred and eighty!"), "No score" for a bust, "Game shot" with the
 * leg, set or match, who throws first in the next leg, and what a player on
 * a finish requires. Spoken by the device's own voice in the language of the
 * app; off until switched on, on each device (the switch is in the game).
 */

const KEY = 'darts-score.caller';

export const callerOn = () => {
    try {
        return localStorage.getItem(KEY) === 'on';
    } catch {
        return false;
    }
};

export const setCallerOn = (on) => {
    try {
        localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
        // without storage it lasts until the page reloads
    }
    if (!on) stopCalling();
};

export const callerSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

/**
 * What the caller says after a visit, in order: [text, …].
 * visit: { score (of the visit), busted, wonLeg, wonSet, wonMatch };
 * next: { name, score (left), outMode, legStarts } of the player to throw now, or null when the match is over.
 */
export const callsForVisit = ({ score, busted, wonLeg, wonSet, wonMatch }, next) => {
    const calls = [];
    if (wonMatch) calls.push(t('Game shot, and the match!'));
    else if (wonSet) calls.push(t('Game shot, and the set!'));
    else if (wonLeg) calls.push(t('Game shot, and the leg!'));
    else if (busted || score === 0) calls.push(t('No score'));
    else if (score === 180) calls.push(t('One hundred and eighty!'));
    else calls.push(String(score));
    if (!next || wonMatch) return calls;
    if (next.legStarts) calls.push(t('{{name}} to throw first. Game on!', { name: next.name }));
    // on a finish: what they require, as the caller says before the visit
    if (next.score > 0 && checkoutRoutes(next.score, { outMode: next.outMode }).length) calls.push(t('{{name}}, you require {{score}}', { name: next.name, score: next.score }));
    return calls;
};

// a voice of the app's language: British English for English (darts is called there), else any of the language
const voiceFor = (voices, language) => {
    const wanted = language === 'en' ? ['en-GB', 'en'] : [locale(), language];
    for (const tag of wanted) {
        const voice = voices.find(entry => entry.lang?.toLowerCase().startsWith(tag.toLowerCase()));
        if (voice) return voice;
    }
    return null;
};

export const stopCalling = () => {
    if (callerSupported()) window.speechSynthesis.cancel();
};

/**
 * Says the calls, one after the other; a new visit stops what is still
 * being said. Nothing when the caller is off or the device cannot speak.
 */
export const call = (calls) => {
    if (!calls?.length || !callerOn() || !callerSupported()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const language = currentLanguage();
    const voice = voiceFor(synth.getVoices(), language);
    for (const text of calls) {
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.lang = voice?.lang ?? (language === 'en' ? 'en-GB' : locale());
        if (voice) utterance.voice = voice;
        // the 180 drawn out, as the callers do
        utterance.rate = text === t('One hundred and eighty!') ? 0.8 : 1;
        utterance.pitch = text === t('One hundred and eighty!') ? 1.1 : 1;
        synth.speak(utterance);
    }
};

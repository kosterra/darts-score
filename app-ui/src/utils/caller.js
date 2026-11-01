import { checkoutRoutes } from './checkout.routes';
import { currentLanguage, locale, t } from './i18n';

/**
 * The caller of an X01 game, as on the stage: the score of every visit
 * ("One hundred and eighty!"), "No score" for a bust, "Game shot" with the
 * leg, set or match, who throws first in the next leg, and what a player on
 * a finish requires. Spoken by the device's own voice in the language of the
 * app; off until switched on, on each device (the switch is in the game).
 * Male or female with the account, a voice of its own per device (both under
 * Profile → Playing).
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

// how a call is said: the speed, the pitch, and a voice of its own (the 180 always in British English)
const MOODS = {
    flat: { rate: 0.95, pitch: 0.85 },
    normal: { rate: 1, pitch: 1 },
    lively: { rate: 1.05, pitch: 1.15 },
    ton: { rate: 0.92, pitch: 1.25 },
    bigTon: { rate: 0.85, pitch: 1.35 },
    // the 180 as the callers shout it (about four seconds): "One hundred" and "and" high and level,
    // then "eighty" held twice as long as both, so its end can rise and fall away
    oneEightyBuild: { rate: 0.75, pitch: 1.3, lang: 'en-GB' },
    oneEightyAnd: { rate: 0.5, pitch: 1.35, lang: 'en-GB' },
    oneEightyPeak: { rate: 0.3, pitch: 1.25, lang: 'en-GB' },
};

const said = (text, mood = 'normal') => ({ text, mood });

// the score of a visit, the bigger the louder: a ton and more with emphasis, the 180 drawn out
const scoreCall = (score) => {
    // the 180 is called in English everywhere, as on the stage: never shown, so not translated
    if (score === 180) return [said('One hundred', 'oneEightyBuild'), said('and', 'oneEightyAnd'), said('eighty!', 'oneEightyPeak')];
    if (score >= 140) return [said(`${score}!`, 'bigTon')];
    if (score >= 100) return [said(`${score}!`, 'ton')];
    if (score < 20) return [said(String(score), 'flat')];
    return [said(String(score))];
};

/**
 * What the caller says after a visit, in order: [{ text, mood }, …].
 * visit: { score (of the visit), busted, wonLeg, wonSet, wonMatch };
 * next: { name, score (left), outMode, legStarts } of the player to throw now, or null when the match is over.
 */
export const callsForVisit = ({ score, busted, wonLeg, wonSet, wonMatch }, next) => {
    const calls = [];
    if (wonMatch) calls.push(said(t('Game shot, and the match!'), 'bigTon'));
    else if (wonSet) calls.push(said(t('Game shot, and the set!'), 'ton'));
    else if (wonLeg) calls.push(said(t('Game shot, and the leg!'), 'lively'));
    else if (busted || score === 0) calls.push(said(t('No score'), 'flat'));
    else calls.push(...scoreCall(score));
    if (!next || wonMatch) return calls;
    if (next.legStarts) calls.push(said(t('{{name}} to throw first. Game on!', { name: next.name }), 'lively'));
    // on a finish: what they require, as the caller says before the visit
    if (next.score > 0 && checkoutRoutes(next.score, { outMode: next.outMode }).length) calls.push(said(t('{{name}}, you require {{score}}', { name: next.name, score: next.score })));
    return calls;
};

// the deep male voices of the devices, as most callers on the stage: by name, as voices tell nothing else
const MALE_VOICE = /\b(male|daniel|arthur|oliver|george|ryan|thomas|alfie|elliot|reed|rocko|grandpa|stefan|conrad|jan|markus|yannick|paul|henri|fabrice|cosimo|diego|luca|pablo|alvaro|jorge)\b/i;

export const isMale = (voice) => MALE_VOICE.test(voice.name ?? '');

// a voice for a language tag ('en-GB', 'de-CH', …), else one of its language; one of the kind first (male or female)
export const voiceFor = (voices, tag, kind = 'male') => {
    const lower = tag.toLowerCase();
    const exact = voices.filter(entry => entry.lang?.toLowerCase() === lower);
    const language = voices.filter(entry => entry.lang?.toLowerCase().startsWith(lower.slice(0, 2)));
    const ofKind = (voice) => (kind === 'female' ? !isMale(voice) : isMale(voice));
    return exact.find(ofKind) ?? language.find(ofKind) ?? exact[0] ?? language[0] ?? null;
};

// a voice of the other kind, nearer the one asked for: a little deeper, or a little higher
const NEARER = { male: 0.85, female: 1.2 };

// male or female, with the account: set by the game from the player's preferences
let voiceKind = 'male';
export const setCallerVoiceKind = (kind) => {
    voiceKind = kind === 'female' ? 'female' : 'male';
};

// a voice of this device chosen by its name (voices differ from device to device), else null
const VOICE_KEY = 'darts-score.caller-voice';

export const chosenVoiceName = () => {
    try {
        return localStorage.getItem(VOICE_KEY) || null;
    } catch {
        return null;
    }
};

export const setChosenVoiceName = (name) => {
    try {
        if (name) localStorage.setItem(VOICE_KEY, name);
        else localStorage.removeItem(VOICE_KEY);
    } catch {
        // without storage it lasts until the page reloads
    }
};

// the voices of this device for the app's language (and British English, for the 180), as { name, lang, male }
export const callerVoices = () => {
    if (!callerSupported()) return [];
    const language = currentLanguage();
    return window.speechSynthesis.getVoices()
        .filter(voice => voice.lang?.toLowerCase().startsWith(language) || voice.lang?.toLowerCase() === 'en-gb')
        .map(voice => ({ name: voice.name, lang: voice.lang, male: isMale(voice) }));
};

export const stopCalling = () => {
    if (callerSupported()) window.speechSynthesis.cancel();
};

/**
 * Says the calls, one after the other, each in its mood; a new visit stops
 * what is still being said. Nothing when the caller is off (unless forced,
 * to try a voice) or the device cannot speak. calls: [{ text, mood }] or plain texts.
 */
export const call = (calls, { force = false } = {}) => {
    if (!calls?.length || (!force && !callerOn()) || !callerSupported()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const voices = synth.getVoices();
    const chosen = voices.find(voice => voice.name === chosenVoiceName()) ?? null;
    // the app's language: British English for English (darts is called there)
    const appTag = currentLanguage() === 'en' ? 'en-GB' : locale();
    for (const entry of calls) {
        const { text, mood } = typeof entry === 'string' ? { text: entry, mood: 'lively' } : entry;
        const { rate, pitch, lang } = MOODS[mood] ?? MOODS.normal;
        const tag = lang ?? appTag;
        // the voice chosen on this device where it speaks the language, else one of the account's kind
        const voice = chosen?.lang?.toLowerCase().startsWith(tag.slice(0, 2).toLowerCase()) ? chosen : voiceFor(voices, tag, voiceKind);
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.lang = voice?.lang ?? tag;
        if (voice) utterance.voice = voice;
        utterance.rate = rate;
        // a voice chosen by hand as it is; else one of the other kind nearer the one asked for
        const asked = voice === chosen || (voice && isMale(voice) === (voiceKind === 'male'));
        utterance.pitch = asked ? pitch : pitch * NEARER[voiceKind];
        synth.speak(utterance);
    }
};

// what "Try" says: a 180, as in a game
export const callerSample = () => callsForVisit({ score: 180 }, null);

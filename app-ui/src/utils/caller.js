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

// how a call is said: the speed, the pitch, and a voice of its own (the 180 always in British English)
const MOODS = {
    flat: { rate: 0.95, pitch: 0.85 },
    normal: { rate: 1, pitch: 1 },
    lively: { rate: 1.05, pitch: 1.15 },
    ton: { rate: 0.95, pitch: 1.25 },
    bigTon: { rate: 0.88, pitch: 1.35 },
    // the 180 as the callers draw it out: building up, a breath on "and", the peak on "eighty"
    oneEightyBuild: { rate: 0.85, pitch: 1.1, lang: 'en-GB' },
    oneEightyAnd: { rate: 0.7, pitch: 1.2, lang: 'en-GB' },
    oneEightyPeak: { rate: 0.5, pitch: 1.6, lang: 'en-GB' },
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

// a voice for a language tag ('en-GB', 'de-CH', …), else one of its language
const voiceFor = (voices, tag) => {
    const lower = tag.toLowerCase();
    return voices.find(entry => entry.lang?.toLowerCase() === lower)
        ?? voices.find(entry => entry.lang?.toLowerCase().startsWith(lower.slice(0, 2)))
        ?? null;
};

export const stopCalling = () => {
    if (callerSupported()) window.speechSynthesis.cancel();
};

/**
 * Says the calls, one after the other, each in its mood; a new visit stops
 * what is still being said. Nothing when the caller is off or the device
 * cannot speak. calls: [{ text, mood }] or plain texts.
 */
export const call = (calls) => {
    if (!calls?.length || !callerOn() || !callerSupported()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const voices = synth.getVoices();
    // the app's language: British English for English (darts is called there)
    const appTag = currentLanguage() === 'en' ? 'en-GB' : locale();
    for (const entry of calls) {
        const { text, mood } = typeof entry === 'string' ? { text: entry, mood: 'lively' } : entry;
        const { rate, pitch, lang } = MOODS[mood] ?? MOODS.normal;
        const tag = lang ?? appTag;
        const voice = voiceFor(voices, tag);
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.lang = voice?.lang ?? tag;
        if (voice) utterance.voice = voice;
        utterance.rate = rate;
        utterance.pitch = pitch;
        synth.speak(utterance);
    }
};

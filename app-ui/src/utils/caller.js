import { checkoutRoutes } from './checkout.routes';
import { currentLanguage, locale, t } from './i18n';

/**
 * The caller of an X01 game, as on the stage: the score of every visit
 * ("One hundred and eighty!"), "No score" for a bust, "Game shot" with the
 * leg, set or match, who throws first in the next leg, and what a player on
 * a finish requires. Called by Legmate's own caller in English, as on the
 * stage, the higher the score the more excited (the files in /caller, made by
 * scripts/caller-voice); the names, and every call whose file cannot load,
 * by the device's own voice in the language of the app. Off until switched
 * on, on each device (the switch is in the game). Male or female with the
 * account, a voice of the device instead per device (both under Profile →
 * Playing).
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

const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
const audioSupported = () => typeof window !== 'undefined' && Boolean(window.AudioContext ?? window.webkitAudioContext);

export const callerSupported = () => speechSupported() || audioSupported();

// how the device's voice says a call: the speed, the pitch, and a voice of its own (the 180 always in British English)
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

// the scores three darts cannot make: no file of their own
const IMPOSSIBLE = [163, 166, 169, 172, 173, 175, 176, 178, 179];

// a call: what the device's voice says (in parts, when it says them apart), the file of Legmate's caller,
// and the name the device's voice says before the file
const said = (text, mood = 'normal', clip = null, extra = {}) => ({ text, mood, clip, ...extra });

// the score of a visit, the bigger the louder: a ton and more with emphasis, the 180 drawn out
const scoreCall = (score) => {
    const clip = score > 0 && score < 180 && !IMPOSSIBLE.includes(score) ? `score-${score}` : null;
    // the 180 is called in English everywhere, as on the stage: never shown, so not translated
    if (score === 180) return said('One hundred and eighty!', 'oneEightyBuild', 'score-180', { parts: [said('One hundred', 'oneEightyBuild'), said('and', 'oneEightyAnd'), said('eighty!', 'oneEightyPeak')] });
    if (score >= 140) return said(`${score}!`, 'bigTon', clip);
    if (score >= 100) return said(`${score}!`, 'ton', clip);
    if (score < 20) return said(String(score), 'flat', clip);
    return said(String(score), 'normal', clip);
};

/**
 * What the caller says after a visit, in order: [{ text, mood, clip, name, parts }, …].
 * visit: { score (of the visit), busted, wonLeg, wonSet, wonMatch };
 * next: { name, score (left), outMode, legStarts } of the player to throw now, or null when the match is over.
 */
export const callsForVisit = ({ score, busted, wonLeg, wonSet, wonMatch }, next) => {
    const calls = [];
    if (wonMatch) calls.push(said(t('Game shot, and the match!'), 'bigTon', 'game-shot-match'));
    else if (wonSet) calls.push(said(t('Game shot, and the set!'), 'ton', 'game-shot-set'));
    else if (wonLeg) calls.push(said(t('Game shot, and the leg!'), 'lively', 'game-shot-leg'));
    else if (busted || score === 0) calls.push(said(t('No score'), 'flat', 'no-score'));
    else calls.push(scoreCall(score));
    if (!next || wonMatch) return calls;
    if (next.legStarts) calls.push(said(t('{{name}} to throw first. Game on!', { name: next.name }), 'lively', 'to-throw-first', { name: next.name }));
    // on a finish: what they require, as the caller says before the visit
    if (next.score > 0 && checkoutRoutes(next.score, { outMode: next.outMode }).length) {
        calls.push(said(t('{{name}}, you require {{score}}', { name: next.name, score: next.score }), 'normal', next.score <= 180 ? `require-${next.score}` : null, { name: next.name }));
    }
    return calls;
};

// what the caller says when switched on
export const gameOn = () => [said(t('Game on!'), 'lively', 'game-on')];

// what "Try" says: a 180, as in a game
export const callerSample = () => callsForVisit({ score: 180 }, null);

// every file of Legmate's caller, for loading them ahead
export const CLIPS = [
    'game-on', 'to-throw-first', 'no-score', 'game-shot-leg', 'game-shot-set', 'game-shot-match',
    ...Array.from({ length: 180 }, (_, i) => i + 1).filter(score => !IMPOSSIBLE.includes(score)).map(score => `score-${score}`),
    ...Array.from({ length: 180 }, (_, i) => `require-${i + 1}`),
];

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

// who calls on this device: null for Legmate's caller, DEVICE_VOICE for a voice of the device of the account's
// kind, else the name of a voice of the device (voices differ from device to device)
export const DEVICE_VOICE = 'device';
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

// Legmate's caller, unless a voice of the device is chosen (or the device cannot play sound)
const withClips = () => chosenVoiceName() === null && audioSupported();

// the voices of this device for the app's language (and British English, for the 180), as { name, lang, male }
export const callerVoices = () => {
    if (!speechSupported()) return [];
    const language = currentLanguage();
    return window.speechSynthesis.getVoices()
        .filter(voice => voice.lang?.toLowerCase().startsWith(language) || voice.lang?.toLowerCase() === 'en-gb')
        .map(voice => ({ name: voice.name, lang: voice.lang, male: isMale(voice) }));
};

// the sound of the page: one for all calls, allowed to play by a tap (see unlockCaller)
let context = null;
const audio = () => {
    if (!context && audioSupported()) context = new (window.AudioContext ?? window.webkitAudioContext)();
    return context;
};

// phones play sound only after a tap: the switch, and every tap in the game, allow it
export const unlockCaller = () => {
    if (audio()?.state === 'suspended') audio().resume().catch(() => {});
};

const clipUrl = (id) => `/caller/${voiceKind}/${id}.mp3`;

// the files as sound, the last few kept (a file is small, its sound is not)
const buffers = new Map();
const KEEP = 24;
const loadClip = (id) => {
    const url = clipUrl(id);
    if (!buffers.has(url)) {
        buffers.set(url, fetch(url)
            .then(response => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
            .then(data => new Promise((resolve, reject) => audio().decodeAudioData(data, resolve, reject)))
            .catch(() => {
                buffers.delete(url);
                return null;
            }));
        if (buffers.size > KEEP) buffers.delete(buffers.keys().next().value);
    }
    return buffers.get(url);
};

// loads every file of the caller once (the service worker keeps them), so it calls without a network too
const preloaded = new Set();
export const preloadCaller = async () => {
    if (!withClips() || preloaded.has(voiceKind)) return;
    preloaded.add(voiceKind);
    const queue = CLIPS.map(clipUrl);
    const next = async () => {
        while (queue.length) await fetch(queue.shift()).catch(() => {});
    };
    await Promise.all([next(), next(), next()]);
};

// which run of calls is the current one: a new visit stops the one before
let run = 0;
let playing = null;

export const stopCalling = () => {
    run += 1;
    if (speechSupported()) window.speechSynthesis.cancel();
    try {
        playing?.stop();
    } catch {
        // already over
    }
    playing = null;
};

const playClip = (buffer) => new Promise(resolve => {
    const source = audio().createBufferSource();
    source.buffer = buffer;
    source.connect(audio().destination);
    source.onended = resolve;
    playing = source;
    source.start();
});

// the device's voice, until it has said the call (or it would long have; some browsers never tell)
const speak = ({ text, mood }) => new Promise(resolve => {
    if (!speechSupported() || !text) return resolve();
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const chosen = voices.find(voice => voice.name === chosenVoiceName()) ?? null;
    // the app's language: British English for English (darts is called there)
    const appTag = currentLanguage() === 'en' ? 'en-GB' : locale();
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
    const done = setTimeout(resolve, 1500 + (text.length * 120) / rate);
    utterance.onend = utterance.onerror = () => {
        clearTimeout(done);
        resolve();
    };
    synth.speak(utterance);
});

/**
 * Says the calls, one after the other: Legmate's caller from its files (a
 * name before by the device's voice), else the device's voice, each in its
 * mood. A new visit stops what is still being said. Nothing when the caller
 * is off (unless forced, to try a voice) or the device cannot make a sound.
 * calls: [{ text, mood, clip, name, parts }].
 */
export const call = async (calls, { force = false } = {}) => {
    if (!calls?.length || (!force && !callerOn()) || !callerSupported()) return;
    stopCalling();
    const current = run;
    const clips = withClips();
    // every file loads at once, so the calls follow each other without a wait
    const loading = calls.map(entry => (clips && entry.clip ? loadClip(entry.clip) : null));
    for (const [index, entry] of calls.entries()) {
        const buffer = loading[index] && await loading[index];
        if (current !== run) return;
        if (buffer) {
            if (entry.name) await speak({ text: entry.name, mood: 'normal' });
            if (current !== run) return;
            await playClip(buffer);
        } else {
            for (const part of entry.parts ?? [entry]) {
                if (current !== run) return;
                await speak(part);
            }
        }
    }
};

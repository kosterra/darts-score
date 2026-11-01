"""
Legmate's caller: the voice files in app-ui/public/caller/{male,female}, made
with the open speech model Kokoro (Apache 2.0) in a British voice (George,
Emma): every score three darts make, No score, Game shot (leg, set, match),
Game on, to throw first and "you require" 1-180. The higher the score, the
more excited: the melody higher and wider, the last syllable drawn out, an
edge of a shout and louder; the 180 as the callers shout it. See README.md.

usage: python3 generate.py <model dir> <out dir> [ids...]   (ids: only these, e.g. score-180)
"""
import io, os, re, subprocess, sys

import numpy as np
import parselmouth
from parselmouth.praat import call as pc
import soundfile as sf
from kokoro_onnx import Kokoro

MODEL, OUT = sys.argv[1], sys.argv[2]
ONLY = set(sys.argv[3:])
VOICES = {'male': 'bm_george', 'female': 'bf_emma'}
SR = 24000
k = Kokoro(f'{MODEL}/kokoro-v1.0.onnx', f'{MODEL}/voices-v1.0.bin')

ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'zero ten twenty thirty forty fifty sixty seventy eighty ninety'.split()


def words(n):
    # British: one hundred and forty-five
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ('' if n % 10 == 0 else '-' + ONES[n % 10])
    return 'one hundred' + ('' if n == 100 else ' and ' + words(n - 100))


VOWELS = 'aeiouɑɒɔəɛɜɪʊʌæ'


def lengthen(ph, stressed, final):
    """the last stressed vowel of the call drawn out, and its final vowel: 'fˈɔːti' → 'fˈɔːːːtiːː'"""
    if stressed:
        at = ph.rfind('ˈ')
        if at >= 0:
            i = at + 1
            while i < len(ph) and ph[i] not in VOWELS: i += 1
            while i < len(ph) and (ph[i] in VOWELS or ph[i] == 'ː'): i += 1
            ph = ph[:i] + 'ː' * stressed + ph[i:]
    if final:
        m = re.search(r'([' + VOWELS + r']ː*)([^' + VOWELS + r'ː]*)$', ph)
        if m: ph = ph[:m.end(1)] + 'ː' * final + ph[m.end(1):]
    return ph


def say(text, voice, speed=1.0, stressed=0, final=0, phonemes=None):
    ph = phonemes or k.tokenizer.phonemize(text, 'en-gb')
    ph = lengthen(ph, stressed, final)
    x, sr = k.create(ph, voice=voice, speed=speed, lang='en-gb', is_phonemes=True)
    assert sr == SR
    return trim(np.asarray(x, dtype=np.float32))


def trim(x, level=0.01, pad=0.03):
    loud = np.where(np.abs(x) > level)[0]
    if not len(loud): return x
    p = int(pad * SR)
    return x[max(0, loud[0] - p):loud[-1] + p]


def ffmpeg(x, filters):
    buf = io.BytesIO(); sf.write(buf, x, SR, format='WAV', subtype='FLOAT')
    out = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'wav', '-i', '-', '-af', filters, '-ar', str(SR), '-f', 'wav', '-acodec', 'pcm_f32le', '-'],
                         input=buf.getvalue(), capture_output=True, check=True).stdout
    y, _ = sf.read(io.BytesIO(out), dtype='float32')
    return y


def split_tail(x, lo=0.5, hi=0.85):
    """where the last syllable starts: the quietest moment between lo and hi of the call"""
    win = int(0.02 * SR)
    env = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, 'same'))
    a, b = int(lo * len(x)), int(hi * len(x))
    return a + int(np.argmin(env[a:b]))


# the voices' own middle, the reference of the melodies below (in semitones from it)
REF = {'male': 125.0, 'female': 205.0}


def melody(x, kind, curve, rng=1.0, stretch=None):
    """the call's melody replaced, as with PSOLA in Praat: its own falling trend taken out, its little ups and
    downs on the words kept (times rng), and the curve laid under it ([(where 0-1, semitones from REF)]);
    stretch: [(where 0-1, factor)] for how much slower each part is said"""
    snd = parselmouth.Sound(x.astype(np.float64), SR)
    dur = snd.get_total_duration()
    manip = pc(snd, 'To Manipulation', 0.01, 70, 450)
    pitch = snd.to_pitch(0.01, 70, 450)
    times = pitch.xs()
    f0 = pitch.selected_array['frequency']
    voiced = f0 > 0
    tier = pc('Create PitchTier', 'melody', 0, dur)
    if voiced.sum() > 3:
        t, st = times[voiced], 12 * np.log2(f0[voiced] / REF[kind])
        trend = np.polyval(np.polyfit(t, st, 1), t)
        where, target = zip(*curve)
        aim = np.interp(t / dur, where, target)
        for ti, value in zip(t, aim + rng * (st - trend)):
            pc(tier, 'Add point', float(ti), float(REF[kind] * 2 ** (value / 12)))
        pc([tier, manip], 'Replace pitch tier')
    if stretch:
        dtier = pc('Create DurationTier', 'tempo', 0, dur)
        for where, factor in stretch:
            pc(dtier, 'Add point', float(where * dur), float(factor))
        pc([dtier, manip], 'Replace duration tier')
    out = pc(manip, 'Get resynthesis (overlap-add)')
    return np.asarray(out.values[0], dtype=np.float32)


# how each kind of call is said: the model's speed, the vowels drawn out, the melody (semitones from the voice's
# middle), the range of its ups and downs, the last syllable slower, the edge of a shout (dB at 3 kHz) and how loud (dB)
MOODS = {
    'flat':   dict(speed=1.05, stressed=0, final=0, curve=[(0, 0), (1, -3)], rng=0.7, tail=1.0, edge=0, loud=-21),
    'normal': dict(speed=1.0,  stressed=0, final=0, curve=[(0, 1), (0.6, 1.5), (1, -2)], rng=0.9, tail=1.0, edge=0, loud=-20),
    'down':   dict(speed=0.95, stressed=1, final=0, curve=[(0, 0), (0.5, -0.5), (1, -4)], rng=0.6, tail=1.15, edge=0, loud=-20),
    'good':   dict(speed=1.0,  stressed=1, final=1, curve=[(0, 3), (0.6, 5), (0.85, 4), (1, 0)], rng=1.1, tail=1.2, edge=2, loud=-18),
    'ton':    dict(speed=0.95, stressed=2, final=1, curve=[(0, 6), (0.55, 8), (0.75, 9), (1, 2)], rng=1.25, tail=1.35, edge=3, loud=-16),
    'big':    dict(speed=0.95, stressed=2, final=2, curve=[(0, 8), (0.5, 10), (0.7, 12), (1, 3)], rng=1.35, tail=1.6, edge=4, loud=-15),
}


def mood_of(score):
    if score >= 140: return 'big'
    if score >= 100: return 'ton'
    if score >= 60: return 'good'
    if score >= 20: return 'normal'
    return 'flat'


def call(text, voice, kind, mood):
    m = MOODS[mood]
    x = say(text, voice, m['speed'], m['stressed'], m['final'])
    stretch = None
    if m['tail'] != 1.0:
        at = split_tail(x) / len(x)
        stretch = [(0, 1.0), (max(0, at - 0.02), 1.0), (at, m['tail']), (1, m['tail'])]
    return melody(x, kind, m['curve'], m['rng'], stretch), m['edge'], m['loud']


def one_eighty(voice, kind):
    """as the callers shout it: "One hundred" and "and" high and level (about 1.5 s), "eigh-" held lower,
    "-ty" leaping up and falling away (together about 2.2 s); each part said apart, the melody laid over all"""
    hundred = say('One hundred', voice, 0.95, stressed=1)
    and_ = say(None, voice, 0.9, phonemes='ˈaːːnd')
    eighty = say(None, voice, 0.95, phonemes='ˈeɪːːːːtiːːːː')
    at = split_tail(eighty, 0.35, 0.75)
    parts = [hundred, and_, eighty[:at], eighty[at:]]
    goal = [0.85, 0.6, 1.35, 0.85]
    x = np.concatenate(parts)
    total = len(x)
    # where each part begins and ends (0-1), and how much slower it is said to last as long as on the stage
    edges = np.cumsum([0] + [len(p) for p in parts]) / total
    stretch = []
    for i, p in enumerate(parts):
        factor = goal[i] / (len(p) / SR)
        stretch += [(edges[i] + 0.001, factor), (edges[i + 1] - 0.001, factor)]
    a, b, c, d, e = edges
    curve = [(a, 11), (b - 0.01, 11.5),          # ONE HUNDRED, level and high
             (b, 12), (c - 0.01, 12.5),           # AND
             (c, 6), (d - 0.01, 6.5),             # EIGH-, held lower
             (d, 13), (d + 0.25 * (e - d), 13.5), (e, -1)]  # -TYYY, up and falling away
    return melody(x, kind, curve, 0.3, stretch), 5, -13


def level(x, edge, loud):
    # the edge of a shout, the loudness of the call, its peaks kept below clipping
    if edge: x = ffmpeg(x, f'equalizer=f=3000:t=q:w=1:g={edge}')
    # as loud as the tier over the sounding part of the call (short calls fool loudnorm)
    win = int(0.02 * SR)
    frames = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, 'valid'))
    active = frames[frames > frames.max() * 0.1]
    x = x * 10 ** ((loud - 20 * np.log10(np.sqrt((active ** 2).mean()))) / 20)
    return ffmpeg(x.astype(np.float32), f'alimiter=limit=0.84:level=false:attack=2:release=40,afade=t=out:st={max(0, len(x) / SR - 0.04):.3f}:d=0.04')


def write(path, x):
    buf = io.BytesIO(); sf.write(buf, x, SR, format='WAV', subtype='FLOAT')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'wav', '-i', '-', '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '40k', path],
                   input=buf.getvalue(), check=True)


IMPOSSIBLE = {163, 166, 169, 172, 173, 175, 176, 178, 179}
CALLS = {'no-score': ('No score.', 'down'),
         'game-on': ('Game on!', 'ton'),
         'to-throw-first': ('to throw first. Game on!', 'good'),
         'game-shot-leg': ('Game shot, and the leg!', 'ton'),
         'game-shot-set': ('Game shot, and the set!', 'big'),
         'game-shot-match': ('Game shot, and the match!', 'big')}
for n in range(1, 181):
    if n not in IMPOSSIBLE and n != 180: CALLS[f'score-{n}'] = (words(n).capitalize() + ('!' if n >= 100 else '.'), mood_of(n))
    CALLS[f'require-{n}'] = (f'You require {words(n)}.', 'normal')

for kind, voice in VOICES.items():
    os.makedirs(f'{OUT}/{kind}', exist_ok=True)
    todo = ['score-180'] + list(CALLS)
    for name in todo:
        if ONLY and name not in ONLY: continue
        x, edge, loud = one_eighty(voice, kind) if name == 'score-180' else call(CALLS[name][0], voice, kind, CALLS[name][1])
        write(f'{OUT}/{kind}/{name}.mp3', level(x, edge, loud))
    print(kind, 'done', flush=True)

# Legmate's caller

The voice files of the caller in `app-ui/public/caller/{male,female}/*.mp3`,
played by `app-ui/src/utils/caller.js`. They are made by `generate.py` with
the open speech model [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M)
(Apache 2.0), in its British voices George (male) and Emma (female), and
shaped with [Praat](https://www.fon.hum.uva.nl/praat/) (through parselmouth)
and ffmpeg. No recording of a real caller goes into them.

## What there is

| File | Says | How |
|---|---|---|
| `score-1` … `score-177` | every score three darts make (not 163, 166, 169, 172, 173, 175, 176, 178, 179) | under 20 flat, 20–59 plain, 60–99 lively, 100–139 excited, 140+ shouted |
| `score-180` | One hundred and eighty! | as the callers shout it: "One hundred" and "and" high and level, "eigh-" held, "-ty" leaping up and falling away |
| `no-score` | No score. | a little let down |
| `game-shot-leg`, `-set`, `-match` | Game shot, and the leg/set/match! | excited, the set and match shouted |
| `game-on` | Game on! | excited |
| `to-throw-first` | to throw first. Game on! | after the name, said by the device |
| `require-1` … `require-180` | You require … | plain, after the name |

The higher the score, the more emotion: the melody higher and wider, the last
syllable drawn out, the edge of a shout (more at 3 kHz) and louder. The
moods are in `MOODS` in `generate.py`; the 180 in `one_eighty`.

## Making them again

Needs Python 3, ffmpeg (with libmp3lame) and about 400 MB for the model.
Takes some 20 minutes on a laptop CPU.

```sh
pip install --target ./lib kokoro-onnx praat-parselmouth soundfile
mkdir model && cd model
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ..
PYTHONPATH=./lib python3 generate.py ./model ./out              # all of them
PYTHONPATH=./lib python3 generate.py ./model ./out score-180    # only these
```

Then replace `app-ui/public/caller/` with `out/` as a whole (not file by
file into the folder a running Vite watches). A new file name also goes into
`CLIPS` in `caller.js`.

import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { BeatsFileShape } from './beat-grid.js';
const SAMPLE_RATE = 44100;
const INSTALL_HINT = `beat_this is an optional install (PyTorch, about 800 MB). Put it in its own venv, e.g.:
  python3 -m venv ~/.cache/visualfries/beat_this
  ~/.cache/visualfries/beat_this/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
  ~/.cache/visualfries/beat_this/bin/pip install https://github.com/CPJKU/beat_this/archive/main.zip
and set VISUALFRIES_BEAT_THIS=~/.cache/visualfries/beat_this/bin/beat_this, or pass any tool with --command "tool {input} {output}".`;
function run(cmd, args, label, options = {}) {
    return new Promise((resolve, reject) => {
        const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
        let out = '';
        let err = '';
        p.stdout.on('data', (d) => (out += d));
        p.stderr.on('data', (d) => (err += d));
        p.on('error', reject);
        p.on('close', (code) => code === 0 ? resolve(out) : reject(new Error(`${label} failed (${code}): ${err.slice(-600)}`)));
    });
}
/** The interpreter named in a script's `#!` line, if it is a Python. */
async function scriptPython(executable) {
    const dirs = executable.includes(path.sep)
        ? ['']
        : (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
    for (const dir of dirs) {
        const file = dir ? path.join(dir, executable) : executable;
        try {
            const head = (await fs.readFile(file, 'utf8')).slice(0, 300);
            const python = /^#!\s*(\S*python[\d.]*)/.exec(head)?.[1];
            if (python)
                return python;
        }
        catch {
            // not here: try the next PATH entry
        }
    }
    return null;
}
/**
 * beat_this (beats and downbeats; MIT code and weights), run through its own `beat_this`
 * command: `VISUALFRIES_BEAT_THIS` or `beat_this` on the PATH. `model` is a checkpoint name
 * (`final0` default, `small0` is about twice as fast). PyTorch threads are capped (default 4):
 * results are identical for any thread count and a busy machine is much faster with fewer.
 */
export function beatThis(opts = {}) {
    const executable = opts.executable ?? process.env.VISUALFRIES_BEAT_THIS ?? 'beat_this';
    const model = opts.model ?? 'final0';
    const threads = opts.threads ?? Math.min(4, os.cpus().length);
    return {
        name: 'beat_this',
        async info() {
            const python = await scriptPython(executable);
            let version = null;
            if (python) {
                try {
                    version =
                        (await run(python, ['-c', "import importlib.metadata as m; print(m.version('beat_this'))"], 'beat_this version')).trim() || null;
                }
                catch {
                    version = null;
                }
            }
            return { name: 'beat_this', version, model };
        },
        async analyze(input, output) {
            try {
                await run(executable, [input, '-o', output, '--model', model], 'beat_this', {
                    env: { ...process.env, OMP_NUM_THREADS: process.env.OMP_NUM_THREADS ?? String(threads) }
                });
            }
            catch (error) {
                if (error.code === 'ENOENT')
                    throw new Error(`beat_this not found ("${executable}").\n${INSTALL_HINT}`);
                throw error;
            }
        }
    };
}
/**
 * Any local beat tracker. `template` is a shell command with `{input}` (the decoded WAV) and
 * `{output}` (where the tool writes its beats) placeholders. The tool writes either text lines
 * `time [position-in-bar]` (1 = downbeat) or JSON (see `parseAnalyzerOutput`).
 *
 *   commandBeats('my-tracker --in {input} --out {output}')
 */
export function commandBeats(template, opts = {}) {
    if (!template.includes('{input}') || !template.includes('{output}'))
        throw new Error('The beats command needs {input} and {output} placeholders.');
    const windows = process.platform === 'win32';
    // Paths reach the shell as environment variables, expanded once and never parsed again.
    const variable = (name) => (windows ? `"%${name}%"` : `"$${name}"`);
    const name = opts.name ?? template.trim().split(/\s+/)[0];
    return {
        name,
        async info() {
            return { name, version: opts.version ?? null, command: template };
        },
        async analyze(input, output) {
            const command = template.replace(/\{(input|output)\}/g, (_, key) => variable(key === 'input' ? 'VF_BEATS_INPUT' : 'VF_BEATS_OUTPUT'));
            await run(windows ? process.env.ComSpec || 'cmd.exe' : 'sh', windows ? ['/d', '/s', '/c', `"${command}"`] : ['-c', command], 'Beats command', {
                env: { ...process.env, VF_BEATS_INPUT: input, VF_BEATS_OUTPUT: output },
                windowsVerbatimArguments: windows
            });
        }
    };
}
/** Most common number of beats between downbeats. */
function commonBarLength(positions) {
    const counts = new Map();
    let length = 0;
    for (const p of positions) {
        if (p === 1 && length)
            counts.set(length, (counts.get(length) ?? 0) + 1);
        length = p === 1 ? 1 : length ? length + 1 : 0;
    }
    let best = Math.max(1, ...positions);
    let most = 0;
    for (const [n, c] of counts)
        if (c > most || (c === most && n < best))
            [best, most] = [n, c];
    return best;
}
/** Positions from a separate downbeat list; pickup beats count back from the first downbeat. */
function positionsFromDownbeats(times, downbeats) {
    if (!downbeats.length)
        return null;
    const isDown = times.map((t) => downbeats.some((d) => Math.abs(d - t) < 0.035));
    if (!isDown.some(Boolean))
        return null;
    const positions = [];
    let p = 0;
    for (const down of isDown)
        positions.push((p = down ? 1 : p ? p + 1 : 0));
    const perBar = commonBarLength(positions);
    const first = isDown.indexOf(true);
    for (let i = 0; i < first; i++)
        positions[i] = ((((i - first) % perBar) + perBar) % perBar) + 1;
    return positions;
}
/**
 * Reads what an analyzer wrote. Accepted:
 * - text, one beat per line: `time` or `time<TAB or space>position` (1 = downbeat), `#` comments
 * - JSON `{ "beats": [0.5, …] | [{ "time", "beat" }, …], "downbeats"?: [...], "analyzer"? }`
 *   or a plain array of times
 */
export function parseAnalyzerOutput(text) {
    const trimmed = text.trim();
    let times = [];
    let positions = [];
    let downbeats = [];
    let analyzer;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const data = JSON.parse(trimmed);
        const list = Array.isArray(data) ? data : (data.beats ?? []);
        for (const item of list) {
            if (typeof item === 'number') {
                times.push(item);
                positions.push(null);
            }
            else if (item && typeof item === 'object') {
                const b = item;
                times.push(Number(b.time));
                positions.push(b.beat ?? b.position ?? null);
            }
        }
        if (!Array.isArray(data)) {
            downbeats = (data.downbeats ?? []).map(Number);
            analyzer = data.analyzer;
        }
    }
    else {
        for (const line of trimmed.split(/\r?\n/)) {
            const clean = line.replace(/#.*/, '').trim();
            if (!clean)
                continue;
            const [t, p] = clean.split(/[\s,;]+/);
            times.push(Number(t));
            positions.push(p === undefined ? null : Math.round(Number(p)));
        }
    }
    const bad = times.findIndex((t) => !Number.isFinite(t));
    if (bad >= 0)
        throw new Error(`Analyzer output: beat ${bad + 1} has no valid time.`);
    if (positions.some((p) => p !== null && !(Number.isInteger(p) && p >= 1)))
        throw new Error('Analyzer output: positions in the bar must be whole numbers from 1.');
    const order = times.map((t, i) => [t, positions[i]]).sort((a, b) => a[0] - b[0]);
    const unique = order.filter((b, i) => i === 0 || b[0] !== order[i - 1][0]);
    times = unique.map((b) => b[0]);
    positions = unique.map((b) => b[1]);
    if (times.length < 2)
        throw new Error('Analyzer output has fewer than two beats.');
    const withPositions = positions.every((p) => p !== null) && positions.includes(1);
    return {
        times,
        positions: withPositions ? positions : positionsFromDownbeats(times, downbeats),
        ...(analyzer ? { analyzer } : {})
    };
}
// ---------------------------------------------------------------- the beats file
/** SHA-256 of a file, hex. */
export async function fileSha256(file) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(file))
        hash.update(chunk);
    return hash.digest('hex');
}
const round = (x, digits = 3) => Math.round(x * 10 ** digits) / 10 ** digits;
function rmsDb(samples, from, to) {
    const a = Math.max(0, Math.floor(from * SAMPLE_RATE));
    const b = Math.min(samples.length, Math.floor(to * SAMPLE_RATE));
    if (b <= a)
        return -120;
    let sum = 0;
    for (let i = a; i < b; i++)
        sum += samples[i] * samples[i];
    return Math.max(-120, round(10 * Math.log10(sum / (b - a) || 1e-12), 1));
}
/**
 * Where there is sound: the first and last 50 ms window within 50 dB of the loudest one, and
 * that threshold (`floor`, dB). Trackers can place beats in silence around the music.
 */
function audible(samples) {
    const size = Math.round(SAMPLE_RATE * 0.05);
    const levels = [];
    for (let i = 0; i < samples.length; i += size) {
        let sum = 0;
        const end = Math.min(samples.length, i + size);
        for (let k = i; k < end; k++)
            sum += samples[k] * samples[k];
        levels.push(10 * Math.log10(sum / (end - i) || 1e-12));
    }
    const floor = Math.max(...levels) - 50;
    const first = levels.findIndex((l) => l > floor);
    const last = levels.length - 1 - [...levels].reverse().findIndex((l) => l > floor);
    return first < 0
        ? { from: 0, to: samples.length / SAMPLE_RATE, floor }
        : { from: (first * size) / SAMPLE_RATE, to: ((last + 1) * size) / SAMPLE_RATE, floor };
}
/** Beats per minute: mean of the intervals within 25 % of the median (robust to a 20 ms grid). */
function tempoOf(times) {
    const intervals = times.slice(1).map((t, i) => t - times[i]);
    const median = [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
    const steady = intervals.filter((d) => Math.abs(d - median) <= median / 4);
    const beat = steady.reduce((sum, d) => sum + d, 0) / steady.length;
    return { tempo: round(60 / beat, 1), beat };
}
/**
 * Turns analyzer beats and the decoded music into a beats file: drops beats placed in silence
 * before or after the music, numbers bars (beats before the first downbeat are bar 0), and
 * measures RMS energy per beat and per bar.
 */
export function buildBeatsFile(beats, samples, source, analyzer) {
    const duration = samples.length / SAMPLE_RATE;
    const sound = audible(samples);
    const keep = beats.times
        .map((time, i) => ({ time, position: beats.positions?.[i] ?? null }))
        .filter((b) => b.time >= sound.from - 0.05 && b.time <= sound.to + 0.05);
    if (keep.length < 2)
        throw new Error('The analyzer found fewer than two beats where there is sound.');
    const { beat: beatLength } = tempoOf(keep.map((b) => b.time));
    const spanEnd = (i) => keep[i + 1]?.time ?? Math.min(duration, keep[i].time + beatLength);
    // A last beat where the music has already stopped (its whole span is silent).
    while (keep.length > 2 &&
        rmsDb(samples, keep[keep.length - 1].time, spanEnd(keep.length - 1)) < sound.floor)
        keep.pop();
    const { tempo } = tempoOf(keep.map((b) => b.time));
    const hasBars = beats.positions !== null && keep.some((b) => b.position === 1);
    let bar = 0;
    const list = keep.map((b, i) => {
        if (hasBars && b.position === 1)
            bar++;
        return {
            time: round(b.time),
            ...(hasBars ? { bar, beat: b.position } : {}),
            energy: rmsDb(samples, b.time, spanEnd(i))
        };
    });
    const bars = [];
    if (hasBars) {
        const downbeats = keep.map((b, i) => [b, i]).filter(([b]) => b.position === 1);
        downbeats.forEach(([b, i], k) => {
            const next = downbeats[k + 1];
            const end = next ? next[0].time : spanEnd(keep.length - 1);
            bars.push({ bar: list[i].bar, start: round(b.time), energy: rmsDb(samples, b.time, end) });
        });
    }
    const file = {
        version: 1,
        source: { file: source.file, sha256: source.sha256, duration: round(duration) },
        analyzer,
        tempo,
        beatsPerBar: hasBars ? commonBarLength(keep.map((b) => b.position ?? 0)) : null,
        beats: list,
        bars
    };
    return { file: BeatsFileShape.parse(file), dropped: beats.times.length - keep.length };
}
const inline = (o) => `{ ${Object.entries(o)
    .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(', ')} }`;
/** The beats file as JSON with one beat and one bar per line. */
export function formatBeatsFile(file) {
    const { beats, bars, ...head } = file;
    const list = (items) => items.length ? `[\n${items.map((i) => `\t\t${inline(i)}`).join(',\n')}\n\t]` : '[]';
    const top = JSON.stringify(head, null, '\t');
    return `${top.slice(0, -2)},\n\t"beats": ${list(beats)},\n\t"bars": ${list(bars)}\n}\n`;
}
async function decode(input, args, output) {
    await run(process.env.FFMPEG_PATH || 'ffmpeg', [
        '-y',
        '-v',
        'error',
        '-i',
        input,
        '-vn',
        '-ac',
        '1',
        '-ar',
        String(SAMPLE_RATE),
        ...args,
        output
    ], `Decoding ${input}`);
}
/** Default beats file for a music file: `music.mp3` → `music.beats.json`. */
export function defaultBeatsPath(music) {
    const parsed = path.parse(music);
    return path.join(parsed.dir, `${parsed.name}.beats.json`);
}
/**
 * Analyses a music file once and writes its beats file (see `BeatsFileShape`). Render and
 * `check` only ever read that file. Default analyzer: `beatThis()`.
 */
export async function analyzeBeats(music, opts = {}) {
    const started = Date.now();
    const analyzer = opts.analyzer ?? beatThis();
    const output = opts.output ?? defaultBeatsPath(music);
    const log = opts.onProgress ?? (() => { });
    const work = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-beats-'));
    try {
        const sha256 = await fileSha256(music);
        const wav = path.join(work, 'music.wav');
        const raw = path.join(work, 'music.f32');
        await decode(music, ['-c:a', 'pcm_s16le'], wav);
        await decode(music, ['-f', 'f32le'], raw);
        const pcm = await fs.readFile(raw);
        const samples = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 4));
        log(`beats: running ${analyzer.name}`);
        const beatsOut = path.join(work, 'analysis.beats');
        await analyzer.analyze(wav, beatsOut);
        let text;
        try {
            text = await fs.readFile(beatsOut, 'utf8');
        }
        catch {
            throw new Error(`${analyzer.name} wrote no beats to {output}.`);
        }
        const parsed = parseAnalyzerOutput(text);
        const info = { ...(await analyzer.info()), ...parsed.analyzer };
        info.version ??= null;
        const { file, dropped } = buildBeatsFile(parsed, samples, { file: path.basename(music), sha256 }, info);
        if (dropped)
            log(`beats: left out ${dropped} beat(s) placed in silence`);
        await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
        await fs.writeFile(output, formatBeatsFile(file));
        return {
            output,
            analyzer: info,
            tempo: file.tempo,
            beatsPerBar: file.beatsPerBar,
            beats: file.beats.length,
            bars: file.bars.length,
            dropped,
            seconds: (Date.now() - started) / 1000
        };
    }
    finally {
        await fs.rm(work, { recursive: true, force: true });
    }
}

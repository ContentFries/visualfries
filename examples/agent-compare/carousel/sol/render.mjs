import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const cli = process.env.VISUALFRIES_CLI || '<visualfries repo>/bin/visualfries.js';
const ids = ['01-hook', '02-record', '03-agent', '04-formats', '05-install'];
mkdirSync(join(root, '.tmp'), { recursive: true });
mkdirSync(join(root, 'qa'), { recursive: true });
mkdirSync(join(root, 'out/slides'), { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, TMPDIR: join(root, '.tmp') },
    stdio: 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

const vf = (...args) => run(process.execPath, [cli, ...args]);
vf('check', 'project.vf.json', '--determinism');

// Frame 89 is the actual last frame of each 90-frame clip.
for (const id of ids) {
  vf('still', 'project.vf.json', '--clip', id, '--at', 'f89', '--output', `out/slides/${id}.png`);
  vf('still', 'project.vf.json', '--clip', id,
    '--at', '0.2s', '--at', '0.7s', '--at', '1.5s', '--at', 'f89',
    '--output', `qa/${id}-entrance.png`);
}

// Motion-project renders produce individual clip files, so concatenate them in program order.
vf('render', 'project.vf.json', '--output', 'out/clips');
writeFileSync(join(root, 'out/clips/concat.txt'), ids.map(id => `file '${id}.mp4'`).join('\n') + '\n');
run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0',
  '-i', 'out/clips/concat.txt', '-c', 'copy', '-movflags', '+faststart', 'out/out.mp4']);
run('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames:format=duration',
  '-of', 'json', 'out/out.mp4']);
console.log('Finished: out/out.mp4, out/clips/, out/slides/, and qa/ entrance sheets.');

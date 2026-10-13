"""RobustVideoMatting (mobilenetv3, CPU) -> greyscale matte video, white = subject.

usage: python rvm-matte.py <input video> <output matte.mp4> [threads]

Used by `visualfries matte --provider rvm` (runs through `uv`, which brings torch, torchvision and
numpy). The model is fetched once by torch.hub from github.com/PeterL1n/RobustVideoMatting.
Temporally stable, hair edges about as good as BiRefNet, ~3 fps at 1080p and ~16 fps at 540p
on a 12-core CPU. Output: H.264 grey (yuv420p, CRF 12), same size and frame rate as the input.
"""
import subprocess
import sys
import time

import numpy as np
import torch

inp, out = sys.argv[1], sys.argv[2]
torch.set_num_threads(int(sys.argv[3]) if len(sys.argv) > 3 else 6)
model = torch.hub.load("PeterL1n/RobustVideoMatting", "mobilenetv3", trust_repo=True).eval()


def probe(entry):
    return subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", f"stream={entry}",
                           "-of", "csv=p=0", inp], capture_output=True, text=True, check=True).stdout.strip()


W, H = map(int, probe("width,height").split(","))
fps = probe("r_frame_rate")
dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", inp, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}", "-r", fps,
                        "-i", "-", "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
rec, n, t0 = [None] * 4, 0, time.time()
# the model works on a quarter-size copy internally; 0.25 suits 1080p, larger inputs could use less
ratio = 0.25 if max(W, H) <= 1920 else 0.125
with torch.no_grad():
    while True:
        b = dec.stdout.read(W * H * 3)
        if len(b) < W * H * 3:
            break
        x = torch.from_numpy(np.frombuffer(b, np.uint8).reshape(H, W, 3).copy()).permute(2, 0, 1)[None].float() / 255
        fgr, pha, *rec = model(x, *rec, downsample_ratio=ratio)
        enc.stdin.write((pha[0, 0].clamp(0, 1).numpy() * 255).astype(np.uint8).tobytes())
        n += 1
enc.stdin.close()
if enc.wait() or dec.wait():
    sys.exit("ffmpeg failed")
print(f"{n} frames in {time.time() - t0:.1f} s ({n / max(1e-9, time.time() - t0):.2f} fps)", file=sys.stderr)

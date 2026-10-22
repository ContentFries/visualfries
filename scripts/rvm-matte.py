"""RobustVideoMatting (mobilenetv3, CPU) -> greyscale matte video, white = subject.

usage: python rvm-matte.py <input video> <output matte.mp4> [threads]

Used by `visualfries matte --provider rvm`, which runs it through `uv` with torch, torchvision and
numpy (CPU wheels, current releases). The model code comes once through torch.hub from
github.com/PeterL1n/RobustVideoMatting, pinned to the v1.0.0 tag; the weights come once from that
tag's GitHub release and are checked against their SHA-256. Both are cached in torch.hub's
directory ($TORCH_HOME, ~/.cache/torch by default).

Temporally stable, hair edges about as good as BiRefNet, ~3 fps at 1080p and ~16 fps at 540p
on a 12-core CPU. Output: H.264 grey (yuv420p, CRF 12), same size and frame rate as the input.
"""
import hashlib
import os
import subprocess
import sys
import time
import types

HUB_REPO = "PeterL1n/RobustVideoMatting:v1.0.0"
WEIGHTS_URL = "https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3.pth"
WEIGHTS_SHA256 = "3c7c1d92033f7c38d6577c481d13a195d7d80a159b960f4f3119ac7b534cf4f8"


def install_torchvision_compat(torch):
    """Give RVM v1.0.0 the `torchvision.models.utils` module it imports.

    The model code does `from torchvision.models.utils import load_state_dict_from_url`. That
    module was only ever an alias of torch.hub's function, and current torchvision releases no
    longer ship it. When it is missing, register a module with the same function so the pinned
    model code loads unchanged on any torch. Returns True when the module was added.
    """
    try:
        import torchvision.models.utils  # noqa: F401
        return False
    except ModuleNotFoundError as error:
        # torchvision itself (or torchvision.models) missing is a real error, not this one.
        if error.name != "torchvision.models.utils":
            raise
    import torchvision.models

    utils = types.ModuleType("torchvision.models.utils")
    utils.load_state_dict_from_url = torch.hub.load_state_dict_from_url
    sys.modules["torchvision.models.utils"] = utils
    torchvision.models.utils = utils
    return True


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def fetch_weights(torch):
    """Download the official weights into torch.hub's cache once, verified, and check a cached copy."""
    path = os.path.join(torch.hub.get_dir(), "checkpoints", os.path.basename(WEIGHTS_URL))
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        # Writes to a temporary file and moves it into place only when the SHA-256 matches.
        torch.hub.download_url_to_file(WEIGHTS_URL, path, hash_prefix=WEIGHTS_SHA256)
    elif sha256(path) != WEIGHTS_SHA256:
        sys.exit(f"{path} is not the RobustVideoMatting v1.0.0 mobilenetv3 release file "
                 f"(SHA-256 mismatch). Delete it and run again to download {WEIGHTS_URL}.")
    return path


def load_model(torch):
    install_torchvision_compat(torch)
    fetch_weights(torch)
    # hubconf.py loads WEIGHTS_URL through torch.hub.load_state_dict_from_url, which finds the
    # verified file in the cache.
    return torch.hub.load(HUB_REPO, "mobilenetv3", trust_repo=True).eval()


def main(argv):
    import numpy as np
    import torch

    inp, out = argv[1], argv[2]
    torch.set_num_threads(int(argv[3]) if len(argv) > 3 else 6)
    model = load_model(torch)

    def probe(entry):
        return subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", f"stream={entry}",
                               "-of", "csv=p=0", inp], capture_output=True, text=True, check=True).stdout.strip()

    W, H = map(int, probe("width,height").split(","))
    fps = probe("r_frame_rate")
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", inp, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}",
                            "-r", fps, "-i", "-", "-c:v", "libx264", "-crf", "12", "-pix_fmt", "yuv420p", out],
                           stdin=subprocess.PIPE)
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


if __name__ == "__main__":
    main(sys.argv)

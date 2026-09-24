"""Train KIMO's handwritten-digit reader.

Data:
  * 9,999 MNIST digits from the `mnist` npm package (MIT) — real handwriting.
  * Synthetic Apple-Pencil-style digits: stroke templates in several children's styles,
    randomly wobbled, stretched, slanted and rendered exactly the way the app renders
    pen strokes (see render()), so the model sees what the iPad will give it.

Model: small MLP (784-192-10, ReLU), exported with int8 weights for the browser.
The renderer here must stay identical to src/lib/digits.ts.
"""
import json, math, sys
import numpy as np
from scipy import ndimage

RNG = np.random.default_rng(7)
SIZE = 28
BOX = 20.0
HALF_WIDTH = 1.25  # pen half-width in 28x28 pixels
SUB = 4  # supersampling per axis

# ---------------------------------------------------------------- templates
# Units: x 0..1, y 0 (top) .. 1.6 (bottom). Each template = list of strokes (polylines).


def arc(cx, cy, rx, ry, a0, a1, n=None):
    n = n or max(3, int(abs(a1 - a0) / 8))
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def fig8(n=60):
    return [(0.5 - 0.38 * math.sin(4 * math.pi * t / n), 0.8 - 0.75 * math.cos(2 * math.pi * t / n)) for t in range(n + 1)]


TEMPLATES = {
    0: [[arc(0.5, 0.8, 0.4, 0.78, -90, -450)], [arc(0.5, 0.8, 0.36, 0.78, -100, 250)]],
    1: [[[(0.5, 0.0), (0.5, 1.6)]], [[(0.25, 0.3), (0.55, 0.0), (0.55, 1.6)]], [[(0.25, 0.3), (0.55, 0.0), (0.55, 1.6)], [(0.25, 1.6), (0.85, 1.6)]]],
    2: [[arc(0.5, 0.42, 0.38, 0.4, 200, 380) + [(0.1, 1.6), (0.92, 1.6)]], [arc(0.48, 0.45, 0.4, 0.45, 190, 345) + [(0.12, 1.55), (0.9, 1.6)]]],
    3: [[arc(0.45, 0.4, 0.4, 0.38, 210, 450) + arc(0.45, 1.18, 0.45, 0.42, -90, 150)], [[(0.1, 0.0), (0.85, 0.0), (0.4, 0.65)] + arc(0.45, 1.12, 0.45, 0.47, -80, 150)]],
    4: [[[(0.65, 0.0), (0.05, 1.05), (0.95, 1.05)], [(0.68, 0.35), (0.68, 1.6)]], [[(0.15, 0.0), (0.12, 0.95), (0.95, 0.95)], [(0.72, 0.0), (0.72, 1.6)]]],
    5: [[[(0.22, 0.0), (0.18, 0.72)] + arc(0.45, 1.12, 0.42, 0.45, -130, 150), [(0.22, 0.0), (0.88, 0.0)]], [[(0.88, 0.0), (0.22, 0.0), (0.18, 0.7)] + arc(0.45, 1.12, 0.42, 0.45, -130, 150)]],
    6: [[[(0.78, 0.0)] + arc(0.5, 1.12, 0.4, 0.45, 185, 540 + 175)[:1] + arc(0.5, 1.12, 0.4, 0.45, 180, 540)], [arc(0.9, 0.9, 0.8, 0.9, -110, -180) + arc(0.5, 1.15, 0.4, 0.42, 180, 540)]],
    7: [[[(0.08, 0.0), (0.92, 0.0), (0.35, 1.6)]], [[(0.08, 0.0), (0.92, 0.0), (0.35, 1.6)], [(0.3, 0.8), (0.85, 0.8)]]],
    8: [[fig8()], [arc(0.5, 0.42, 0.33, 0.4, -60, -300) + arc(0.5, 1.18, 0.42, 0.42, -90, 270) + arc(0.5, 0.42, 0.33, 0.4, 60, -60)]],
    9: [[arc(0.5, 0.42, 0.38, 0.42, -10, -370) + [(0.86, 0.42), (0.8, 1.6)]], [arc(0.5, 0.45, 0.38, 0.42, 0, -360) + [(0.88, 0.45), (0.88, 1.6)]]],
}


# ---------------------------------------------------------------- renderer (mirror of src/lib/digits.ts)
def render(strokes, half_width=HALF_WIDTH):
    """Pen strokes (any units, y down) -> 28x28 float image in [0,1], MNIST-style framing."""
    pts = np.array([p for s in strokes for p in s], dtype=np.float64)
    minx, miny = pts.min(0)
    maxx, maxy = pts.max(0)
    w, h = maxx - minx, maxy - miny
    scale = BOX / max(w, h, 1e-6)
    ox = (SIZE - w * scale) / 2
    oy = (SIZE - h * scale) / 2
    segs = []
    for s in strokes:
        q = [((x - minx) * scale + ox, (y - miny) * scale + oy) for x, y in s]
        if len(q) == 1:
            q = [q[0], q[0]]
        for a, b in zip(q[:-1], q[1:]):
            segs.append((a[0], a[1], b[0], b[1]))
    segs = np.array(segs)
    # subsample centres
    g = (np.arange(SIZE * SUB) + 0.5) / SUB
    X, Y = np.meshgrid(g, g)  # [row=y, col=x]
    P = np.stack([X.ravel(), Y.ravel()], 1)
    best = np.full(len(P), np.inf)
    for x1, y1, x2, y2 in segs:
        dx, dy = x2 - x1, y2 - y1
        L2 = dx * dx + dy * dy
        if L2 < 1e-12:
            t = np.zeros(len(P))
        else:
            t = np.clip(((P[:, 0] - x1) * dx + (P[:, 1] - y1) * dy) / L2, 0, 1)
        d2 = (P[:, 0] - (x1 + t * dx)) ** 2 + (P[:, 1] - (y1 + t * dy)) ** 2
        best = np.minimum(best, d2)
    inside = (best <= half_width * half_width).astype(np.float32).reshape(SIZE * SUB, SIZE * SUB)
    img = inside.reshape(SIZE, SUB, SIZE, SUB).mean(axis=(1, 3))
    return center_of_mass_shift(img)


def center_of_mass_shift(img):
    tot = img.sum()
    if tot <= 0:
        return img
    ys, xs = np.mgrid[0:SIZE, 0:SIZE]
    cy = (img * (ys + 0.5)).sum() / tot
    cx = (img * (xs + 0.5)).sum() / tot
    sy = int(round(SIZE / 2 - cy))
    sx = int(round(SIZE / 2 - cx))
    out = np.zeros_like(img)
    ys0, ys1 = max(0, sy), min(SIZE, SIZE + sy)
    xs0, xs1 = max(0, sx), min(SIZE, SIZE + sx)
    out[ys0:ys1, xs0:xs1] = img[ys0 - sy : ys1 - sy, xs0 - sx : xs1 - sx]
    return out


# ---------------------------------------------------------------- synthetic pen digits
def resample(stroke, step=0.04):
    s = np.array(stroke, dtype=np.float64)
    if len(s) < 2:
        return s
    seg = np.linalg.norm(np.diff(s, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    n = max(2, int(cum[-1] / step) + 1)
    t = np.linspace(0, cum[-1], n)
    return np.stack([np.interp(t, cum, s[:, 0]), np.interp(t, cum, s[:, 1])], 1)


def wobble_strokes(strokes, rng, amount):
    out = []
    # smooth low-frequency wobble = shaky hand, plus a little jitter
    for s in strokes:
        r = resample(s)
        n = len(r)
        k = max(2, n // 8)
        base = rng.normal(0, amount, (k, 2))
        smooth = np.stack([np.interp(np.linspace(0, k - 1, n), np.arange(k), base[:, j]) for j in range(2)], 1)
        r = r + smooth + rng.normal(0, amount * 0.15, r.shape)
        out.append(r)
    return out


def random_affine(strokes, rng, strength=1.0):
    ang = math.radians(rng.normal(0, 7) * strength)
    shear = rng.normal(0, 0.18) * strength
    sx = math.exp(rng.normal(0, 0.12) * strength)
    sy = math.exp(rng.normal(0, 0.08) * strength)
    M = np.array([[math.cos(ang), -math.sin(ang)], [math.sin(ang), math.cos(ang)]]) @ np.array([[1, shear], [0, 1]]) @ np.diag([sx, sy])
    return [np.asarray(s) @ M.T for s in strokes]


def maybe_drop_tail(strokes, rng):
    # Children often lift early / stop short: trim a little off stroke ends sometimes.
    out = []
    for s in strokes:
        s = np.asarray(s)
        if len(s) > 8 and rng.random() < 0.3:
            cut = rng.integers(0, max(1, len(s) // 12) + 1)
            s = s[: len(s) - cut] if cut else s
        out.append(s)
    return out


def synth(digit, rng, style=None):
    styles = TEMPLATES[digit]
    st = styles[style if style is not None else rng.integers(len(styles))]
    s = wobble_strokes(st, rng, rng.uniform(0.01, 0.045))
    s = random_affine(s, rng)
    s = maybe_drop_tail(s, rng)
    return render(s, half_width=rng.uniform(1.0, 1.6))


# ---------------------------------------------------------------- MNIST + augmentation
def load_mnist():
    X, y = [], []
    for d in range(10):
        a = np.array(json.load(open(f"mnist/{d}.json"))["data"], dtype=np.float32).reshape(-1, 784)
        X.append(a)
        y.append(np.full(len(a), d))
    return np.concatenate(X), np.concatenate(y)


def augment_mnist(img, rng):
    im = img.reshape(28, 28)
    ang = rng.normal(0, 8)
    sh = rng.normal(0, 0.15)
    sc = math.exp(rng.normal(0, 0.08))
    a = math.radians(ang)
    M = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]]) @ np.array([[1, sh], [0, 1]]) * sc
    Minv = np.linalg.inv(M)
    c = np.array([14, 14])
    off = c - Minv @ c
    out = ndimage.affine_transform(im, Minv, offset=off, order=1, mode="constant")
    r = rng.random()
    if r < 0.2:
        out = ndimage.grey_dilation(out, size=(2, 2))
    elif r < 0.35:
        out = ndimage.grey_erosion(out, size=(2, 2)) * 0.6 + out * 0.4
    return center_of_mass_shift(np.clip(out, 0, 1)).ravel()


# ---------------------------------------------------------------- tiny MLP (numpy, so export matches inference exactly)
def train(X, y, Xv, yv, hidden=192, epochs=30, lr=0.002, batch=128, seed=0):
    rng = np.random.default_rng(seed)
    W1 = rng.normal(0, math.sqrt(2 / 784), (784, hidden)).astype(np.float32)
    b1 = np.zeros(hidden, np.float32)
    W2 = rng.normal(0, math.sqrt(2 / hidden), (hidden, 10)).astype(np.float32)
    b2 = np.zeros(10, np.float32)
    params = [W1, b1, W2, b2]
    m = [np.zeros_like(p) for p in params]
    v = [np.zeros_like(p) for p in params]
    t = 0
    Y = np.eye(10, dtype=np.float32)[y]
    best = (0, None)
    for ep in range(epochs):
        idx = rng.permutation(len(X))
        for i in range(0, len(X), batch):
            bi = idx[i : i + batch]
            xb, yb = X[bi], Y[bi]
            # forward (with dropout on hidden)
            h = xb @ W1 + b1
            hr = np.maximum(h, 0)
            mask = (rng.random(hr.shape) > 0.2).astype(np.float32) / 0.8
            hd = hr * mask
            z = hd @ W2 + b2
            z -= z.max(1, keepdims=True)
            p = np.exp(z)
            p /= p.sum(1, keepdims=True)
            # backward
            dz = (p - yb) / len(xb)
            gW2 = hd.T @ dz + 1e-5 * W2
            gb2 = dz.sum(0)
            dh = (dz @ W2.T) * mask * (h > 0)
            gW1 = xb.T @ dh + 1e-5 * W1
            gb1 = dh.sum(0)
            t += 1
            for k, (pp, gg) in enumerate(zip(params, [gW1, gb1, gW2, gb2])):
                m[k] = 0.9 * m[k] + 0.1 * gg
                v[k] = 0.999 * v[k] + 0.001 * gg * gg
                mh = m[k] / (1 - 0.9**t)
                vh = v[k] / (1 - 0.999**t)
                pp -= (lr * (0.93**ep)) * mh / (np.sqrt(vh) + 1e-8)
        acc = (predict(params, Xv).argmax(1) == yv).mean()
        print(f"epoch {ep+1:2d}  val acc {acc:.4f}", flush=True)
        if acc > best[0]:
            best = (acc, [p.copy() for p in params])
    return best[1]


def predict(params, X):
    W1, b1, W2, b2 = params
    z = np.maximum(X @ W1 + b1, 0) @ W2 + b2
    z -= z.max(1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(1, keepdims=True)


def quantize(W):
    scale = np.abs(W).max() / 127.0
    q = np.clip(np.round(W / scale), -127, 127).astype(np.int8)
    return q, float(scale)


if __name__ == "__main__":
    import base64

    Xm, ym = load_mnist()
    perm = RNG.permutation(len(Xm))
    Xm, ym = Xm[perm], ym[perm]
    Xm = np.stack([center_of_mass_shift(x.reshape(28, 28)).ravel() for x in Xm])
    n_test = 1500
    Xm_test, ym_test = Xm[:n_test], ym[:n_test]
    Xm_tr, ym_tr = Xm[n_test:], ym[n_test:]

    print("building training set…", flush=True)
    aug = [augment_mnist(x, RNG) for x in Xm_tr for _ in range(2)]
    aug_y = np.repeat(ym_tr, 2)
    syn_n = 1500
    syn = [synth(d, RNG).ravel() for d in range(10) for _ in range(syn_n)]
    syn_y = np.repeat(np.arange(10), syn_n)
    Xtr = np.concatenate([Xm_tr, np.array(aug), np.array(syn)]).astype(np.float32)
    ytr = np.concatenate([ym_tr, aug_y, syn_y])
    print("train size", Xtr.shape, flush=True)

    # Separate synthetic test set (different RNG) to measure pen-style accuracy.
    trng = np.random.default_rng(12345)
    Xs_test = np.array([synth(d, trng).ravel() for d in range(10) for _ in range(300)], dtype=np.float32)
    ys_test = np.repeat(np.arange(10), 300)

    params = train(Xtr, ytr, np.concatenate([Xm_test, Xs_test]), np.concatenate([ym_test, ys_test]), epochs=int(sys.argv[1]) if len(sys.argv) > 1 else 25)

    def acc(P, X, y):
        return (predict(P, X).argmax(1) == y).mean()

    print(f"FLOAT  mnist test {acc(params, Xm_test, ym_test):.4f}   pen-style test {acc(params, Xs_test, ys_test):.4f}")
    W1, b1, W2, b2 = params
    q1, s1 = quantize(W1)
    q2, s2 = quantize(W2)
    qparams = [q1.astype(np.float32) * s1, b1, q2.astype(np.float32) * s2, b2]
    print(f"INT8   mnist test {acc(qparams, Xm_test, ym_test):.4f}   pen-style test {acc(qparams, Xs_test, ys_test):.4f}")

    model = {
        "version": 1,
        "input": 784,
        "hidden": int(W1.shape[1]),
        "render": {"size": SIZE, "box": BOX, "halfWidth": HALF_WIDTH, "sub": SUB},
        "W1": base64.b64encode(q1.tobytes()).decode(),
        "s1": s1,
        "b1": [round(float(x), 6) for x in b1],
        "W2": base64.b64encode(q2.tobytes()).decode(),
        "s2": s2,
        "b2": [round(float(x), 6) for x in b2],
        "note": "Trained on MNIST (via the MIT-licensed `mnist` npm package) + synthetic pen digits. See ml/digits.py.",
    }
    json.dump(model, open("digits-model.json", "w"))
    # Test fixtures for the TS implementation: a few strokes + the python-rendered image and prediction.
    fx = []
    frng = np.random.default_rng(99)
    for d in range(10):
        st = TEMPLATES[d][0]
        s = [r.tolist() for r in random_affine(wobble_strokes(st, frng, 0.02), frng, 0.5)]
        img = render(s)
        fx.append({"digit": d, "strokes": s, "image": [round(float(v), 5) for v in img.ravel()], "probs": [round(float(p), 5) for p in predict(qparams, img.ravel()[None])[0]]})
    json.dump(fx, open("digits-fixtures.json", "w"))
    json.dump({str(k): v for k, v in TEMPLATES.items()}, open("digits-templates.json", "w"))
    print("saved")

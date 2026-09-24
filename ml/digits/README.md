# Digit reader training

`train.py` trains the small network in `public/models/digits-v1.json`.

- Data: MNIST digits from the MIT-licensed `mnist` npm package (`npm pack mnist`, copy `package/src/digits/*.json` to `ml/digits/mnist/`), plus synthetic Apple-Pencil-style digits drawn from stroke templates.
- Run: `cd ml/digits && python3 train.py 25` (≈5 min on 2 CPUs; needs numpy + scipy).
- Outputs `digits-model.json` (copy to `public/models/`), and test fixtures/templates (copy to `src/lib/__fixtures__/`).
- `render()` here must stay identical to `renderDigit()` in `src/lib/digits.ts` — `src/lib/digits.test.ts` checks this.

Last run: 97.9% on 1,500 held-out real MNIST digits; 99.8% on held-out pen-style digits.

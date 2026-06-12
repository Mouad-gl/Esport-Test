// Tiny seeded value-noise with fractal octaves. Good enough for terrain.

export function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    // xorshift32
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 2246822519;
  h = (h ^ (h >> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  return (h & 0xffffff) / 0xffffff; // 0..1
}

function smooth(t) { return t * t * (3 - 2 * t); }

function valueNoise2(x, y, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = smooth(x - x0), fy = smooth(y - y0);
  const v00 = hash2(x0,     y0,     seed);
  const v10 = hash2(x0 + 1, y0,     seed);
  const v01 = hash2(x0,     y0 + 1, seed);
  const v11 = hash2(x0 + 1, y0 + 1, seed);
  const a = v00 + (v10 - v00) * fx;
  const b = v01 + (v11 - v01) * fx;
  return a + (b - a) * fy;
}

// Fractal Brownian motion -> 0..1
export function fbm(x, y, seed, octaves = 4, freq = 1, lacunarity = 2, gain = 0.5) {
  let amp = 1, sum = 0, norm = 0, f = freq;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise2(x * f, y * f, seed + o * 1013);
    norm += amp;
    amp *= gain;
    f *= lacunarity;
  }
  return sum / norm;
}

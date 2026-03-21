import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSamples, playSample } from './samples.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function createAudioContext() {
  const audioCtx = {
    destination: { kind: 'destination' },
    lastGain: null,
    createBufferSource: () => ({
      connect: vi.fn(),
      start: vi.fn(),
      buffer: null,
    }),
    createGain: () => {
      audioCtx.lastGain = {
        connect: vi.fn(),
        gain: { value: 0 },
      };
      return audioCtx.lastGain;
    },
    decodeAudioData: vi.fn(async (arrayBuffer) => ({ decoded: arrayBuffer.byteLength })),
  };
  return audioCtx;
}

describe('loadSamples', () => {
  it('returns an empty map immediately (procedural-only mode)', async () => {
    const audioCtx = createAudioContext();
    const samples = await loadSamples(audioCtx, '/assets/audio');

    expect(samples).toBeInstanceOf(Map);
    expect(samples.size).toBe(0);
  });
});

describe('playSample', () => {
  it('creates a buffer source, routes it through gain, and starts playback', () => {
    const audioCtx = createAudioContext();
    const source = playSample(audioCtx, { id: 'buffer' }, 0.5);

    expect(source.buffer).toEqual({ id: 'buffer' });
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(source.connect).toHaveBeenCalledTimes(1);
    expect(audioCtx.lastGain.gain.value).toBe(0.5);
  });
});

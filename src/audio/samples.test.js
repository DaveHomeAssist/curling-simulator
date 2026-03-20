import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSamples, playSample } from './samples.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function createAudioContext() {
  return {
    destination: { kind: 'destination' },
    createBufferSource: () => ({
      connect: vi.fn(),
      start: vi.fn(),
      buffer: null,
    }),
    createGain: () => ({
      connect: vi.fn(),
      gain: { value: 0 },
    }),
    decodeAudioData: vi.fn(async (arrayBuffer) => ({ decoded: arrayBuffer.byteLength })),
  };
}

describe('loadSamples', () => {
  it('loads and decodes all configured samples with a normalized base path', async () => {
    const audioCtx = createAudioContext();
    const requested = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        requested.push(url);
        return {
          ok: true,
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        };
      }),
    );

    const samples = await loadSamples(audioCtx, '/assets/audio');

    expect(requested[0]).toBe('/assets/audio/crowd-ambient.mp3');
    expect(requested).toHaveLength(5);
    expect(samples.get('crowd-ambient')).toEqual({ decoded: 3 });
    expect(samples.get('skip-whoa')).toEqual({ decoded: 3 });
  });

  it('returns an empty map when all fetches fail', async () => {
    const audioCtx = createAudioContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    const samples = await loadSamples(audioCtx, '/base');

    expect(samples.size).toBe(0);
    expect(warn).toHaveBeenCalled();
  });
});

describe('playSample', () => {
  it('creates a buffer source, routes it through gain, and starts playback', () => {
    const audioCtx = createAudioContext();
    const source = playSample(audioCtx, { id: 'buffer' }, 0.5);

    expect(source.buffer).toEqual({ id: 'buffer' });
    expect(source.start).toHaveBeenCalledTimes(1);
    expect(source.connect).toHaveBeenCalledTimes(1);
    expect(audioCtx.createGain().gain.value).not.toBe(0);
  });
});

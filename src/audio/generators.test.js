import { describe, expect, it, vi } from 'vitest';
import { createImpact, createRumble, createScrape } from './generators.js';

function createMockAudioContext() {
  const nodes = [];

  const makeNode = (kind) => {
    const node = {
      kind,
      connect: vi.fn(),
    };
    nodes.push(node);
    return node;
  };

  return {
    sampleRate: 48000,
    createOscillator: () => {
      const oscillator = makeNode('oscillator');
      oscillator.type = 'sine';
      oscillator.frequency = { value: 0 };
      oscillator.start = vi.fn();
      oscillator.stop = vi.fn();
      return oscillator;
    },
    createGain: () => {
      const gain = makeNode('gain');
      gain.gain = { value: 0 };
      return gain;
    },
    createBiquadFilter: () => {
      const filter = makeNode('filter');
      filter.type = '';
      filter.frequency = { value: 0 };
      filter.Q = { value: 0 };
      return filter;
    },
    createBuffer: (_channels, length, sampleRate) => {
      const buffer = {
        length,
        sampleRate,
        getChannelData: () => new Float32Array(length),
      };
      return buffer;
    },
    createBufferSource: () => {
      const source = makeNode('source');
      source.buffer = null;
      source.start = vi.fn();
      source.stop = vi.fn();
      return source;
    },
    nodes,
  };
}

describe('audio generators', () => {
  it('creates a rumble wrapper with a connectable node and lifecycle methods', () => {
    const audioCtx = createMockAudioContext();
    const rumble = createRumble(audioCtx, 4);

    expect(rumble.node.kind).toBe('gain');
    expect(rumble.node.gain.value).toBeGreaterThan(0);
    expect(rumble.start).toEqual(expect.any(Function));
    expect(rumble.stop).toEqual(expect.any(Function));

    rumble.start();
    rumble.stop();

    const oscillator = audioCtx.nodes.find((node) => node.kind === 'oscillator');
    expect(oscillator.frequency.value).toBeGreaterThanOrEqual(60);
    expect(oscillator.frequency.value).toBeLessThanOrEqual(120);
    expect(oscillator.start).toHaveBeenCalledTimes(1);
    expect(oscillator.stop).toHaveBeenCalledTimes(1);
  });

  it('creates scrape and impact wrappers that start their buffer sources', () => {
    const audioCtx = createMockAudioContext();
    const scrape = createScrape(audioCtx, 5);
    const impact = createImpact(audioCtx, 6);

    expect(scrape.node.kind).toBe('gain');
    expect(impact.node.kind).toBe('gain');
    expect(scrape.start).toEqual(expect.any(Function));
    expect(impact.start).toEqual(expect.any(Function));

    scrape.start();
    impact.start();

    const [scrapeSource, scrapeFilter] = audioCtx.nodes.filter((node) => node.kind === 'source' || node.kind === 'filter').slice(0, 2);
    expect(scrapeSource.buffer).toBeTruthy();
    expect(scrapeFilter.type).toBe('bandpass');
    expect(scrapeSource.start).toHaveBeenCalledTimes(1);
    expect(impact.node.gain.value).toBeGreaterThan(0);
  });
});

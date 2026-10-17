import { describe, it, expect } from 'vitest';
import { createBroadcast } from './broadcast.js';
import { createReplay } from './replay.js';
describe('independent pavilion replay', () => {
  it('plays a detached settled clip while manual replay and subsequent recording remain independent', () => {
    const replay = createReplay(), feed = createBroadcast();
    replay.begin({position:{x:0}}, 1);
    replay.capture({position:{x:1}}); replay.finish({position:{x:2}}, 1);
    feed.play(replay.lastClip()); replay.start(); replay.seek(0.5);
    const manual = replay.snapshot(); replay.begin({position:{x:100}}, 0);
    feed.step(1); expect(feed.frame().position.x).toBe(2);
    expect(feed.snapshot()).toMatchObject({end:1,playing:false});
    expect(replay.snapshot()).toEqual(manual);
    replay.clear(); expect(feed.frame().position.x).toBe(2);
    feed.clear(); expect(feed.frame()).toBeNull();
  });
  it('holds final frame, rejects reverse time and resets when superseded', () => {
    const feed=createBroadcast(), clip={end:0,frames:Array.from({length:31},(_,x)=>({position:{x}}))};
    feed.play(clip);clip.frames[0].position.x=99;
    feed.step(-10);expect(feed.frame().position.x).toBe(0);
    feed.step(0.5);expect(feed.frame().position.x).toBeGreaterThan(0);
    feed.step(100);expect(feed.frame().position.x).toBe(30);
    feed.play({end:1,frames:[{position:{x:4}}]});expect(feed.snapshot().time).toBe(0);expect(feed.frame().position.x).toBe(4);
  });
});

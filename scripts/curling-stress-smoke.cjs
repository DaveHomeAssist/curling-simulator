// Real browser regressions: delivery, input interruption, camera and layouts.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const output = process.env.CURLING_OUTPUT || '/tmp/curling-smoke';
const url = process.env.CURLING_URL || 'http://127.0.0.1:5173/';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const [width, height] of JSON.parse(process.env.CURLING_VIEWPORTS || '[[1440,900],[375,812],[667,375],[2560,720]]')) {
      const page = await browser.newPage({ viewport: { width, height } });
      page.setDefaultTimeout(60000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      // Fonts are optional; the test runner has no dependency on Google availability.
      await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
      await page.goto(`${url}?diagnostics=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.render_game_to_text);
      await page.evaluate(() => pauseRendering());
      const step = (ms = 16) => page.evaluate(ms => advanceTime(ms), ms);
      const state = async () => JSON.parse(await page.evaluate(() => render_game_to_text()));
      const click = async selector => { await page.locator(selector).click(); await step(); };
      await click('#tutorial-dismiss');
      assert.equal((await state()).renderer, '3d');
      const layout = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth), true);
      await layout();
      // Every shot control must fit without scrolling the dock.
      for (const selector of ['#charge-button', '#turn-in', '[data-preset="peel"]']) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box && box.y >= 0 && box.y + box.height <= height, `${selector} clipped at ${width}x${height}`);
      }
      await page.screenshot({ path: `${output}/${width}-light.png`, timeout: 60000 });
      await click('#theme-toggle');
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await page.screenshot({ path: `${output}/${width}-dark.png`, timeout: 60000 });
      // Menus must not steer the broom.
      const before = (await state()).aimX;
      await click('#settings-toggle');
      await page.keyboard.press('ArrowRight'); await step();
      assert.equal((await state()).aimX, before);
      await page.locator('#mode-select').selectOption('practice'); await step();
      await click('[data-preset="draw"]'); await click('#turn-in');
      await click('#charge-button');
      const ice = await page.locator('#input-overlay').boundingBox();
      const x = ice.x + ice.width * 0.5, y = ice.y + ice.height * 0.8;
      // Cancelling a pointer or losing focus must never release a shot.
      await page.mouse.move(x, y); await page.mouse.down(); await step(150);
      assert.equal((await state()).mode, 'power');
      await page.locator('#input-overlay').dispatchEvent('pointercancel'); await page.mouse.up(); await step();
      assert.equal((await state()).shotNumber, 0);
      assert.notEqual((await state()).mode, 'power');
      for (let n=0; n<6; n++) {
        await click('#charge-button');
        await page.mouse.move(x,y); await page.mouse.down(); await step(100 + n*100); await page.mouse.up(); await step();
        assert.equal((await state()).mode, 'travel');
        await page.locator('#sweep-button').dispatchEvent('pointerdown'); await step(100);
        assert.equal((await state()).sweeping, true);
        await page.locator('#sweep-button').dispatchEvent('pointercancel');
        await step(90000);
        assert.equal((await state()).gameMode, 'practice');
        assert.equal((await state()).shotNumber, n+1);
        assert.notEqual((await state()).mode, 'travel');
      }
      await page.screenshot({path:`${output}/${width}-played.png`,timeout:60000});
      await click('#orbit-toggle');
      const orbitBefore = (await state()).orbit;
      await page.mouse.move(x,y); await page.mouse.down();
      await page.mouse.move(x+Math.min(ice.width*.7,400),y-30,{steps:5}); await page.mouse.up(); await step();
      assert.notEqual((await state()).orbit.azimuth,orbitBefore.azimuth);
      await click('#zoom-in');
      assert.ok((await state()).orbit.distance < orbitBefore.distance);
      assert.equal((await state()).shotNumber,6);
      await page.screenshot({path:`${output}/${width}-orbit.png`,timeout:60000});
      await click('#orbit-toggle');
      await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.render_game_to_text);
      await page.evaluate(()=>pauseRendering());
      assert.equal((await state()).shotNumber,6);
      assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
      await layout();
      assert.deepEqual(errors,[]);
      results.push({width,height,throws:6,renderer:'3d',errors});
      await page.close();
      console.log('PASS',width,height);
    }
    fs.writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });

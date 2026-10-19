// Keyboard, touch interruption, fullscreen and WebGL fallback acceptance.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const url = process.env.CURLING_URL || 'http://127.0.0.1:5173/';
(async()=>{
  const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:960,height:720},hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
    await page.goto(`${url}?diagnostics=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.render_game_to_text);
    await page.evaluate(()=>pauseRendering());
    const step=(ms=16)=>page.evaluate(ms=>advanceTime(ms),ms);
    const state=async()=>JSON.parse(await page.evaluate(()=>render_game_to_text()));
    const click=async s=>{await page.locator(s).tap();await step();};
    await click('#tutorial-dismiss');await click('#settings-toggle');
    await page.locator('#mode-select').selectOption('practice');await step();
    await page.locator('#input-overlay').tap({position:{x:100,y:40}});await step();
    await page.keyboard.press('Digit3');await page.keyboard.press('KeyE');await step();
    assert.equal((await state()).spin,-1);
    assert.match(await page.locator('#shot-summary').innerText(),/FREEZE/);
    await page.keyboard.press('Space');await step();
    assert.equal((await state()).mode,'charge-ready');
    await page.keyboard.down('Space');await step(200);
    assert.equal((await state()).mode,'power');
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await page.keyboard.up('Space');await step();assert.equal((await state()).shotNumber,0);
    await page.keyboard.press('Space');await page.keyboard.down('Space');await step(300);await page.keyboard.up('Space');await step();
    assert.equal((await state()).mode,'travel');
    await page.keyboard.down('Space');await step();assert.equal((await state()).sweeping,true);
    await page.keyboard.up('Space');await step(90000);
    assert.equal((await state()).shotNumber,1);
    await page.keyboard.press('KeyF');
    await page.waitForFunction(()=>document.fullscreenElement?.id==='app');
    await page.keyboard.press('KeyF');await page.waitForFunction(()=>!document.fullscreenElement);
    await click('#orbit-toggle');
    const orbitStart = (await state()).orbit.azimuth;
    const rink = await page.locator('#input-overlay').boundingBox();
    for (let n=0;n<3;n++) {
      await page.mouse.move(rink.x+100,rink.y+100); await page.mouse.down();
      await page.mouse.move(rink.x+500,rink.y+100,{steps:4}); await page.mouse.up(); await step();
    }
    assert.ok(Math.abs((await state()).orbit.azimuth-orbitStart)>Math.PI*2);
    await page.mouse.wheel(0,100000);await step();assert.equal((await state()).orbit.distance,36);
    await page.mouse.wheel(0,-100000);await step();assert.equal((await state()).orbit.distance,5);
    await click('#orbit-toggle');
    await click('#settings-toggle');await page.locator('#mode-select').selectOption('challenge');await step();
    await click('[data-preset="draw"]');await click('#turn-in');await click('#charge-button');
    const box=await page.locator('#input-overlay').boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height*.8);await page.mouse.down();await step(300);await page.mouse.up();await step(90000);
    assert.equal((await state()).gameMode,'challenge');
    await click('#challenge-try-again');assert.equal((await state()).shotNumber,0);
    assert.deepEqual(errors,[]);await page.close();
    const fallback=await browser.newPage({viewport:{width:375,height:812}});
    await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args)};});
    await fallback.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
    await fallback.goto(`${url}?diagnostics=1`,{waitUntil:'domcontentloaded'});
    await fallback.waitForFunction(()=>window.render_game_to_text);
    assert.equal(JSON.parse(await fallback.evaluate(()=>render_game_to_text())).renderer,'2d');
    await fallback.locator('#tutorial-dismiss').click();
    await fallback.screenshot({path:process.env.CURLING_FALLBACK_IMAGE || '/tmp/curling-fallback.png'});
    console.log('PASS keyboard, touch taps, interrupted charge, fullscreen, challenge retry, WebGL fallback');
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

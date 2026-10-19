// Verify the deployed 3D build can actually place a draw in the house.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
    await page.goto(`${process.env.CURLING_URL || 'http://127.0.0.1:5173/'}?diagnostics=1`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.render_game_to_text);
    await page.evaluate(()=>pauseRendering());
    const step=()=>page.evaluate(()=>advanceTime(16));
    const click=async s=>{await page.locator(s).click();await step()};
    await click('#tutorial-dismiss');await click('#settings-toggle');
    await page.locator('#mode-select').selectOption('practice');await step();
    await click('[data-preset="draw"]');await click('#turn-in');await click('#charge-button');
    const box=await page.locator('#input-overlay').boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height*.8);
    await page.mouse.down();await page.mouse.up();
    const state=JSON.parse(await page.evaluate(()=>advanceTime(90000)));
    assert.equal(state.renderer,'3d');assert.equal(state.shotNumber,1);
    assert.equal(state.stones.length,1);
    assert.ok(Math.hypot(state.stones[0].x,state.stones[0].y-23.47)<1.83);
    await click('#orbit-toggle');
    for(let n=0;n<5;n++) await click('#zoom-in');
    await click('#theme-toggle');
    await page.screenshot({path:process.env.CURLING_IMAGE || '/tmp/curling-live.png',timeout:60000});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({url:page.url(),renderer:state.renderer,stone:state.stones[0],errors}));
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

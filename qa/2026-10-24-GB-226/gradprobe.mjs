import { launch } from '../../tools/cdp.mjs';
for (const headless of [false, true]) {
  const b = await launch({ headless, args: headless ? [] : ['--window-size=800,600'] });
  const p = await b.newPage({ width: 800, height: 600 });
  await p.goto('data:text/html,<div id=a style="position:fixed;inset:0;background:linear-gradient(red,red)"></div><div id=b style="background-image:url(data:image/gif;base64,R0lGODlhAQABAAAAACw=)"></div>', { timeout: 30000 });
  console.log('headless', headless, await p.evaluate(`JSON.stringify({a:getComputedStyle(document.getElementById('a')).backgroundImage, b:getComputedStyle(document.getElementById('b')).backgroundImage.slice(0,40), forced:matchMedia('(forced-colors: active)').matches, supports:CSS.supports('background-image','linear-gradient(red,red)'), ua:navigator.userAgent})`));
  await b.close?.();
}
process.exit(0);
const fs = require('fs');
const code = fs.readFileSync('qa/run-ag20.mjs', 'utf8');
const runCodeStart = code.indexOf('async function run()');
const setupCode = code.substring(0, runCodeStart);

const newRunCode = `
async function run() {
  const port = 5744;
  const server = serve(ROOT, port);
  console.log('[Harness] Server running at http://127.0.0.1:' + port);
  
  const exe = findChrome();
  const chrome = new Chrome(exe);
  await chrome.start();
  
  const results = {};
  
  async function testPage(urlPath, name) {
    console.log('[Test] Loading ' + name + '...');
    const page = await chrome.newPage();
    await page.navigate('http://127.0.0.1:' + port + urlPath);
    await sleep(5000); // Wait for animations to run
    
    // Attempt to read FPS if available on window.fps or from performance metrics
    const fps = await page.evaluate(\`(() => {
      // try to find any fps variable or just return frame count over time
      return new Promise(resolve => {
        let frames = 0;
        let lastTime = performance.now();
        function loop() {
           frames++;
           if (performance.now() - lastTime > 1000) {
              resolve(frames);
           } else {
              requestAnimationFrame(loop);
           }
        }
        requestAnimationFrame(loop);
      });
    })()\`).catch((err) => 'Error: ' + err.message);
    
    console.log('[' + name + '] FPS measured: ' + fps);
    results[name] = fps;
    await page.close();
  }

  await testPage('/studio/motion-lab.html', 'Motion Lab');
  await testPage('/review/motion-marine-marine/index.html', 'Marine Reactions');
  await testPage('/review/zombie-reactions/index.html', 'Zombie Reactions');
  
  chrome.kill();
  server.close();
  
  console.log('\\n[Results] \\n' + JSON.stringify(results, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
`;

fs.writeFileSync('qa/run-ag21.mjs', setupCode + newRunCode);

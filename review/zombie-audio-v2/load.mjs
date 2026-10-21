import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Engine} from '../../tools/camera.mjs';
const baseline={
  '/core/audio.js':fs.readFileSync('review/zombie-audio-v2/before-core.txt','utf8'),
  '/ui/zombie-audio.js':fs.readFileSync('review/zombie-audio-v2/before-profiles.txt','utf8')
};
class Compare extends Engine{
  async load(){
    if(!this.intercept){
      this.intercept=true;this.before=true;this.fulfilled=[];this.fetchErrors=[];
      this.page.conn.onEvent(msg=>{
        if(msg.sessionId!==this.page.sessionId||msg.method!=='Fetch.requestPaused')return;
        const {requestId,request}=msg.params,route=new URL(request.url).pathname;
        const source=this.before?baseline[route]:null;
        if(source){this.fulfilled.push(route);this.page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(source).toString('base64')}).catch(e=>this.fetchErrors.push(String(e)));}
        else this.page.send('Fetch.continueRequest',{requestId}).catch(e=>this.fetchErrors.push(String(e)));
      });
      await this.page.send('Fetch.enable',{patterns:[{urlPattern:'*/core/audio.js*',requestStage:'Request'},{urlPattern:'*/ui/zombie-audio.js*',requestStage:'Request'}]});
    }
    await super.load();
  }
}
const E=new Compare({warm:'none',size:'1440x900'}),proof={startedAt:new Date().toISOString(),method:'Two sequential title loads in one real GPU Engine: baseline then revised; warm:none, 1440x900. Both baseline audio modules are intercepted at their original routes.',loads:[],limitations:'Only one load per version; first uses a newly launched browser, second may benefit from browser/OS warm caches. Engine includes opening-screen dismissal and its fixed settling waits. This is a short regression check, not a cold/warm benchmark.'};
async function record(version){
  const details=await E.page.evaluate(`(() => { const n=performance.getEntriesByType('navigation')[0];return {ready:!!window.TT,openingDismissed:!window.DWOpening||DWOpening.active===false,domContentLoadedSeconds:n.domContentLoadedEventEnd/1000,loadEventSeconds:n.loadEventEnd/1000,elapsedSinceNavigationSeconds:performance.now()/1000}; })()`);
  assert(details.ready&&details.openingDismissed,version+' title not ready');
  proof.loads.push({version,engineLoadSeconds:E.loadSec,mode:E.mode,renderer:E.renderer,...details});
}
try{
  await E.open();await record('baseline');
  assert.deepEqual([...new Set(E.fulfilled)].sort(),Object.keys(baseline).sort(),'baseline audio routes did not both load');
  proof.baselineRoutes=E.fulfilled;proof.baselineHashes=Object.fromEntries(Object.entries(baseline).map(([p,s])=>[p,createHash('sha256').update(s).digest('hex')]));
  E.before=false;await E.load();await record('revised');
  proof.errors=E.page.errors;proof.fetchErrors=E.fetchErrors;assert.equal(proof.errors.length,0);assert.equal(proof.fetchErrors.length,0);
  proof.engineDifferenceSeconds=proof.loads[1].engineLoadSeconds-proof.loads[0].engineLoadSeconds;
  console.log(JSON.stringify(proof,null,2));
}catch(e){proof.failure=String(e.stack||e);throw e;}
finally{proof.completedAt=new Date().toISOString();fs.writeFileSync('review/zombie-audio-v2/load-proof.json',JSON.stringify(proof,null,2));await E.close();}
process.exit(0);

import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const before=fs.readFileSync('review/zombie-audio/before-core.txt','utf8');
class Compare extends Engine{
  async load(){
    if(!this.intercept){this.intercept=true;this.before=true;this.page.conn.onEvent(msg=>{
      if(msg.sessionId===this.page.sessionId&&msg.method==='Fetch.requestPaused'){
        const {requestId}=msg.params;this.page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'}],body:Buffer.from(this.before?before:fs.readFileSync('core/audio.js','utf8')).toString('base64')}).catch(e=>console.error(e.message));
      }
    });await this.page.send('Fetch.enable',{patterns:[{urlPattern:'*/core/audio.js*',requestStage:'Request'}]});}
    await super.load();
  }
}
const E=new Compare({warm:'none',size:'1440x900'}),proof={};
try{await E.open();proof.beforeFirstSeconds=E.loadSec;E.before=false;await E.load();proof.afterWarmSeconds=E.loadSec;E.before=true;await E.load();proof.beforeWarmSeconds=E.loadSec;proof.repeated=[];for(const isBefore of [false,true,false,true]){E.before=isBefore;await E.load();proof.repeated.push({before:isBefore,seconds:E.loadSec});}proof.errors=E.page.errors;fs.writeFileSync('review/zombie-audio/load-proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));}finally{await E.close();}process.exit(0);

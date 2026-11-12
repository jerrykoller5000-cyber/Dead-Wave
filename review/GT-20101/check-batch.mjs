import {spawn} from 'node:child_process';
const groups={art:[['review/GT-20101/review.mjs','after'],['review/GT-20101/pistol-live.mjs'],['review/GT-20101/pistol-extension.mjs']],hands:[['review/GT-20101/pistol-hands.mjs'],['tools/realtest.mjs','tcb294b','--all']]};
const group=groups[process.argv[2]];if(!group)throw Error('Batch name');
for(const args of group){console.log('COMMAND node '+args.join(' '));const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{stdio:'inherit',windowsHide:true});child.on('error',reject);child.on('exit',resolve);});if(code!==0){process.exitCode=code||1;break;}}

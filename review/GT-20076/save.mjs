import {rename,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

// An open crew-panel preview can keep the previous image mapped on Windows.
// Finish the new capture beside it, then replace the directory entry atomically.
export async function save(target,data){
  const temp=new URL(target.href+'.'+randomUUID()+'.tmp');
  await writeFile(temp,data);
  await rename(temp,target);
}

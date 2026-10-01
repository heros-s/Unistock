import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
async function modules(directory) {
  const entries=await readdir(directory,{withFileTypes:true});
  const result=[];
  for(const entry of entries) {
    const file=join(directory,entry.name);
    if(entry.isDirectory()) result.push(...await modules(file));
    else if(entry.name.endsWith('.mjs')) result.push(file);
  }
  return result;
}
for(const directory of ['src','scripts','tests']) for(const file of await modules(directory)) {
  const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
  if(result.error||result.status!==0) process.exit(1);
}
console.log('Sintaxe dos módulos verificada.');

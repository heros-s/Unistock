import test from 'node:test';
import assert from 'node:assert/strict';
import {createStaticServer} from '../scripts/serve.mjs';
test('serve o protótipo e não expõe documentos ou arquivos internos',async t=>{
  const server=createStaticServer();
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  t.after(()=>new Promise((resolve,reject)=>{
    server.close(error=>error?reject(error):resolve());
    server.closeAllConnections();
  }));
  const base=`http://127.0.0.1:${server.address().port}`;
  const page=await fetch(base+'/');
  assert.equal(page.status,200);
  assert.match(await page.text(),/lang="pt-BR"/);
  const css=await fetch(base+'/src/styles.css');
  assert.equal(css.status,200);
  assert.match(css.headers.get('content-type'),/text\/css/);
  await css.text();
  for(const path of ['/AGENTS.md','/.git/config','/package.json','/../AGENTS.md']) {
    const result=await fetch(base+path);
    assert.equal(result.status,404);
    await result.text();
  }
});
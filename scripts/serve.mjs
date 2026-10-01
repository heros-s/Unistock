import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const routes = new Map([
  ['/', {file:'index.html', type:'text/html'}],
  ['/index.html', {file:'index.html', type:'text/html'}],
  ['/src/styles.css', {file:'src/styles.css', type:'text/css'}],
  ...['main', 'store', 'demo', 'domain/validation', 'domain/inventory', 'domain/workflow',
    'ui/dom', 'ui/shared', 'ui/student', 'ui/team'].map(name =>
    [`/src/${name}.mjs`, {file:`src/${name}.mjs`, type:'text/javascript'}])
]);
export function createStaticServer() {
  return createServer(async (req, res) => {
    let path;
    try { path = new URL(req.url, 'http://localhost').pathname; }
    catch { res.writeHead(400); res.end('Endereço inválido'); return; }
    const route = routes.get(path);
    if (req.method !== 'GET' || !route) { res.writeHead(404); res.end('Não encontrado'); return; }
    try {
      const body = await readFile(new URL('../' + route.file, import.meta.url));
      res.writeHead(200, {'Content-Type': route.type + '; charset=utf-8', 'Cache-Control':'no-store'});
      res.end(body);
    } catch { res.writeHead(404); res.end('Não encontrado'); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createStaticServer();
  server.on('error', error => { console.error(`Não foi possível iniciar o preview: ${error.message}`); process.exitCode = 1; });
  server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () =>
    console.log(`Unistock disponível em http://127.0.0.1:${server.address().port}`));
}

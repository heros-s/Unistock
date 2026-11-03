// local.mjs — o que fica só neste navegador: ids das solicitações enviadas e o último nome/curso usado.
// O armazenamento pode estar bloqueado (aba anônima, dados limpos); tudo falha em silêncio.
const KEY_REQUESTS = 'unistock:solicitacoes';
const KEY_REQUESTER = 'unistock:solicitante';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function read(storage, key, fallback) {
  try { const value = JSON.parse(storage.getItem(key)); return value ?? fallback; } catch { return fallback; }
}
function write(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function createLocalData(storage = defaultStorage()) {
  return {
    requestIds() {
      const ids = read(storage, KEY_REQUESTS, []);
      return Array.isArray(ids) ? ids.filter(id => typeof id === 'string' && UUID.test(id)) : [];
    },
    addRequestId(id) {
      const ids = this.requestIds().filter(other => other !== id);
      // Mais recentes primeiro na lista guardada; o servidor aceita até 200 ids por consulta.
      return write(storage, KEY_REQUESTS, [id, ...ids].slice(0, 200));
    },
    requester() {
      const value = read(storage, KEY_REQUESTER, {});
      return {name: typeof value.name === 'string' ? value.name : '', course: typeof value.course === 'string' ? value.course : ''};
    },
    saveRequester({name, course}) { return write(storage, KEY_REQUESTER, {name, course}); }
  };
}

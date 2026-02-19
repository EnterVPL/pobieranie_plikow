// ── Tablica plików do pobrania ────────────────────────────────────────────
const FILES = [
  './files/file1.txt', // z lokalnego hosta
  './files/file2.txt',
  './files/file3.txt',
  './files/file4.txt',
  './files/file5.txt',
  'https://i.postimg.cc/3NZj5tpj/images-q-tbn-ANd9Gc-RN2z0ERw-XQUq-H29ur-Puz-Wue-LXKh-JAY6SMy-AA-s.jpg' // z zewnętrznego hosta
];
// ─────────────────────────────────────────────────────────────────────────

function buildUI() {
  const list = document.getElementById('file-list');
  list.innerHTML = '';
  FILES.forEach((path, i) => {
    const name = path.split('/').pop();
    list.insertAdjacentHTML('beforeend', `
      <li class="file-item" id="item-${i}">
        <div class="file-header">
          <span class="file-name">${name}</span>
          <span class="file-status status-pending" id="status-${i}">oczekuje</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" id="bar-${i}"></div>
        </div>
      </li>
    `);
  });
  setOverall(0, FILES.length);
}

function setBar(i, pct) {
  document.getElementById(`bar-${i}`).style.width = `${pct}%`;
}

function setStatus(i, label, cls) {
  const el = document.getElementById(`status-${i}`);
  el.textContent = label;
  el.className = `file-status ${cls}`;
}

function setOverall(done, total) {
  document.getElementById('overall-label').textContent = `${done} / ${total}`;
  document.getElementById('overall-bar').style.width =
    total ? `${Math.round((done / total) * 100)}%` : '0%';
}

function setLog(msg) {
  document.getElementById('log').textContent = msg;
}

async function fetchWithProgress(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const contentLength = res.headers.get('Content-Length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(total ? received / total : 0.5);
  }

  // Składamy chunki w jeden Uint8Array
  const result = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function start() {
  const btn = document.getElementById('btn');
  btn.disabled = true;
  buildUI();

  const zip = new JSZip();
  let done = 0;

  for (let i = 0; i < FILES.length; i++) {
    const path = FILES[i];
    const name = path.split('/').pop();
    setStatus(i, 'pobieranie…', 'status-loading');

    try {
      const data = await fetchWithProgress(path, pct => {
        setBar(i, Math.round(pct * 100));
      });

      setBar(i, 100);
      setStatus(i, 'gotowy', 'status-done');
      zip.file(name, data);
    } catch (err) {
      setStatus(i, 'błąd', 'status-error');
      setLog(`Błąd pobierania: ${name} – ${err.message}`);
    }

    done++;
    setOverall(done, FILES.length);
  }

  setLog('Pakowanie do ZIP…');

  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE' },
    meta => setLog(`Pakowanie… ${meta.percent.toFixed(0)}%`)
  );

  // Pobierz ZIP
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  
  // Nazwa pobranego pliku
  a.download = 'files.zip';
  a.click();
  URL.revokeObjectURL(url);

  setLog('Gotowe! Plik pliki.zip został pobrany.');
  btn.disabled = false;
}

buildUI();

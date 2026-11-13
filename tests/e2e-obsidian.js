// Запуск: node tests/e2e-obsidian.js
// Настоящий Obsidian во временном профиле и временном хранилище: твои заметки и открытый Obsidian не затрагиваются.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execSync } = require('child_process');
const assert = require('assert');

const SRC = path.join(__dirname, '..');
const BASE = path.join(os.tmpdir(), 'logic-tree-e2e');
const DATA = path.join(BASE, 'profile');
const VAULT = path.join(BASE, 'vault');
const SHOTS = path.join(BASE, 'shots');
const PORT = 9333;
const EXE = path.join(process.env.LOCALAPPDATA, 'Programs', 'Obsidian', 'Obsidian.exe');
const sleep = ms => new Promise(r => setTimeout(r, ms));

fs.rmSync(BASE, { recursive: true, force: true });
const pluginDir = path.join(VAULT, '.obsidian', 'plugins', 'logic-tree');
fs.mkdirSync(pluginDir, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });
for (const f of ['manifest.json', 'main.js', 'styles.css']) fs.copyFileSync(path.join(SRC, f), path.join(pluginDir, f));
fs.writeFileSync(path.join(VAULT, '.obsidian', 'community-plugins.json'), '["logic-tree"]');
fs.writeFileSync(path.join(pluginDir, 'data.json'), JSON.stringify({ language: 'ru' }));
fs.writeFileSync(path.join(DATA, 'obsidian.json'), JSON.stringify({ vaults: { aaaabbbbccccdddd: { path: VAULT, ts: Date.now(), open: true } } }));
const roaming = path.join(process.env.APPDATA, 'obsidian');
const newest = fs.readdirSync(roaming).filter(f => /^obsidian-.*\.asar$/.test(f)).sort().pop();
if (newest) fs.copyFileSync(path.join(roaming, newest), path.join(DATA, newest));

const proc = spawn(EXE, [`--user-data-dir=${DATA}`, `--remote-debugging-port=${PORT}`], { stdio: 'ignore', detached: false });
const stop = () => { try { execSync(`taskkill /PID ${proc.pid} /T /F`, { stdio: 'ignore' }); } catch (e) { /* уже закрыт */ } };

let ws;
let nextId = 1;
const waiting = new Map();
const pageErrors = [];
const closeDialogs = () => ev(`document.querySelectorAll('.modal-close-button').forEach(b => b.click())`);
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  waiting.set(id, { resolve, reject, method });
  ws.send(JSON.stringify({ id, method, params }));
});
const PAGE_HELPERS = `
window.ltRoot = () => document.querySelector('.workspace-leaf.mod-active .lt-root');
window.ltFind = (sel, text) => [...ltRoot().querySelectorAll(sel)].find(e => text === undefined || e.textContent === text || e.getAttribute('aria-label') === text);
window.ltBlock = text => [...ltRoot().querySelectorAll('.lt-node')].find(b => b.querySelector('.lt-text').textContent === text);
window.ltCenter = e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
window.ltView = () => app.workspace.activeLeaf.view;
`;
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`${expr.slice(0, 160)} => ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r.result.value;
}
async function connect() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find(t => t.type === 'page' && t.url.includes('index.html'));
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise(r => { ws.onopen = r; });
        ws.onmessage = m => {
          const d = JSON.parse(m.data);
          if (d.method === 'Runtime.exceptionThrown') {
            const x = d.params.exceptionDetails;
            pageErrors.push(x.exception?.description || x.text);
          }
          if (d.id && waiting.has(d.id)) {
            const w = waiting.get(d.id);
            waiting.delete(d.id);
            if (d.error) w.reject(new Error(`${w.method}: ${d.error.message}`));
            else w.resolve(d.result);
          }
        };
        await send('Runtime.enable');
        await send('Page.enable');
        return;
      }
    } catch (e) { /* ещё запускается */ }
    await sleep(500);
  }
  throw new Error('Obsidian не открыл страницу для отладки');
}
async function ready() {
  for (let i = 0; i < 80; i++) {
    try {
      if (await ev('!!(window.app && app.workspace && app.workspace.layoutReady)')) {
        await ev(PAGE_HELPERS);
        return;
      }
    } catch (e) { /* ещё грузится */ }
    await sleep(500);
  }
  throw new Error('Obsidian не загрузился');
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(r.data, 'base64'));
}
async function step(name, fn) {
  await fn();
  console.log(`ok  ${name}`);
}

async function key(k, modifiers = 0) {
  const codes = { Enter: [13, 'Enter', '\r'], Tab: [9, 'Tab'], Escape: [27, 'Escape'], z: [90, 'KeyZ'], Delete: [46, 'Delete'], 2: [50, 'Digit2', '2'], 3: [51, 'Digit3', '3'] };
  const [vk, code, char] = codes[k];
  const text = modifiers ? undefined : char;
  await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers, ...(text ? { text, unmodifiedText: text } : {}) });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers });
  await sleep(120);
}
const type = async text => {
  await send('Input.insertText', { text });
  await sleep(70);
};
async function tap(x, y) {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await sleep(40);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(220);
}
async function touchPath(from, to, holdMs = 0) {
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  if (holdMs) await sleep(holdMs);
  for (let i = 1; i <= 10; i++) {
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * i / 10, y: from.y + (to.y - from.y) * i / 10 }] });
    await sleep(16);
  }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(240);
}
async function pinch(cx, cy, from, to) {
  const pts = d => [{ x: cx - d, y: cy, id: 0 }, { x: cx + d, y: cy, id: 1 }];
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(from) });
  for (let i = 1; i <= 8; i++) {
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(from + (to - from) * i / 8) });
    await sleep(16);
  }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(200);
}
async function tapIn(sel, text, label = `${sel} ${text}`) {
  const scroll = sel === '.lt-chip' ? `e.scrollIntoView({ inline: 'center', block: 'nearest' });` : '';
  const c = await ev(`(() => { const e = ltFind(${JSON.stringify(sel)}, ${JSON.stringify(text)}); if (!e) return null; ${scroll} return ltCenter(e); })()`);
  assert.ok(c, `не найдено: ${label}`);
  await tap(c.x, c.y);
}
const chip = t => tapIn('.lt-chip', t, `вопрос ${t}`);
// Нажимает вопрос, только если он ещё не подставлен: повторное нажатие снимает его.
const pick = async t => {
  const s = await state();
  if (!s.edit || s.edit.q !== t) await chip(t);
};
const beside = () => tapIn('.lt-strip-beside', undefined, 'Рядом');
const dock = t => tapIn('.lt-dock button', t, `кнопка ${t}`);
const qbtn = t => tapIn('.lt-qbtn', t, `вопрос в панели ${t}`);
async function click(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(220);
}
const panel = () => ev(`(() => {
  const p = ltFind('.lt-qpanel');
  const r = p.getBoundingClientRect();
  const root = ltRoot().getBoundingClientRect();
  const btns = [...p.querySelectorAll('.lt-qbtn')];
  return {
    mode: ltView().mode,
    shown: getComputedStyle(p).display !== 'none',
    count: btns.length,
    inside: btns.every(b => { const x = b.getBoundingClientRect(); return x.height >= 40 && x.left >= r.left && x.right <= r.right + 1 && x.top >= r.top && x.bottom <= r.bottom + 1; }),
    onScreen: r.top >= root.top && r.bottom <= root.bottom + 1 && r.left >= 0 && r.right <= innerWidth + 1,
    noScroll: p.scrollHeight <= p.clientHeight + 1 && p.scrollWidth <= p.clientWidth + 1,
    badge: btns.length ? getComputedStyle(btns[0], '::before').content : '',
    list: btns.map(b => b.dataset.q),
    on: btns.filter(b => b.classList.contains('is-on')).map(b => b.dataset.q),
  };
})()`);
const wiz = () => ev(`(() => {
  const v = ltView();
  const w = ltFind('.lt-wizard');
  const on = ltFind('.lt-wiz-type.is-on');
  const input = ltFind('.lt-wiz-input');
  return {
    open: v.mode === 'wizard' && getComputedStyle(w).display !== 'none',
    stage: v.wiz ? v.wiz.stage : null,
    on: on ? on.dataset.type : null,
    types: w.querySelectorAll('.lt-wiz-type').length,
    prompt: ltFind('.lt-wiz-prompt').textContent,
    hint: ltFind('.lt-wiz-hint').textContent,
    timer: getComputedStyle(ltFind('.lt-wiz-timer')).display === 'none' ? '' : ltFind('.lt-wiz-timer').textContent,
    chips: [...w.querySelectorAll('.lt-wiz-chip')].filter(c => c.offsetParent).map(c => c.textContent),
    count: ltFind('.lt-wiz-count').textContent,
    added: ltFind('.lt-wiz-added').textContent,
    next: ltFind('.lt-wiz-next').textContent,
    backOff: ltFind('.lt-wiz-back').disabled,
    focused: document.activeElement === input,
    value: input.value,
  };
})()`);
const wizNext = () => tapIn('.lt-wiz-next', undefined, 'Дальше');
const sideChip = () => ev(`ltFind('.lt-wiz-side-name').textContent`);
const choicesFit = () => ev(`(() => { const w = ltFind('.lt-wizard').getBoundingClientRect(); return [...ltRoot().querySelectorAll('.lt-wiz-type')].every(b => { const r = b.getBoundingClientRect(); return r.height >= 44 && r.left >= w.left && r.right <= w.right && r.bottom <= w.bottom + 1; }); })()`);
// Слова блока, которые перенеслись посреди: у целого слова все буквы стоят в одной строке.
const brokenWords = text => ev(`(() => {
  const data = ltBlock(${JSON.stringify(text)}).querySelector('.lt-text').firstChild;
  const broken = [];
  const re = /\\S+/g;
  for (let m = re.exec(data.data); m; m = re.exec(data.data)) {
    const r = document.createRange();
    r.setStart(data, m.index);
    r.setEnd(data, m.index + m[0].length);
    if (new Set([...r.getClientRects()].map(x => Math.round(x.top))).size > 1) broken.push(m[0]);
  }
  return broken;
})()`);
// Проверяет файл с диска, разбирает его движком PDF самого Obsidian и смотрит на пиксели картинки.
async function checkPdf(name, rel) {
  const buf = fs.readFileSync(path.join(VAULT, rel));
  const text = buf.toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4'), 'файл начинается как PDF');
  const m = text.match(/\/Width (\d+) \/Height (\d+)[^>]*\/Length (\d+) >>\nstream\n/);
  assert.ok(m, 'в PDF есть картинка');
  const start = m.index + m[0].length;
  const length = Number(m[3]);
  const jpeg = buf.subarray(start, start + length);
  assert.deepStrictEqual([jpeg[0], jpeg[1], jpeg[length - 2], jpeg[length - 1]], [0xff, 0xd8, 0xff, 0xd9], 'картинка целая');
  fs.writeFileSync(path.join(SHOTS, `pdf-${name}.jpg`), jpeg);
  const info = await ev(`(async () => {
    const data = new Uint8Array(await app.vault.adapter.readBinary(${JSON.stringify(rel)}));
    const out = { size: data.length };
    const bitmap = await createImageBitmap(new Blob([data.subarray(${start}, ${start + length})], { type: 'image/jpeg' }));
    const c = document.createElement('canvas');
    c.width = bitmap.width;
    c.height = bitmap.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    out.img = [c.width, c.height];
    out.corner = [px[0], px[1], px[2]];
    out.yellow = 0;
    out.blue = 0;
    out.dark = 0;
    for (let i = 0; i < px.length; i += 4 * 97) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      if (r > 235 && g > 200 && b < 130) out.yellow++;
      else if (r < 190 && g > 190 && b > 235) out.blue++;
      else if (r < 60 && g < 60 && b < 60) out.dark++;
    }
    if (typeof pdfjsLib === 'undefined') return out;
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const v = page.getViewport({ scale: 1 });
    const ops = await page.getOperatorList();
    out.pdf = { pages: doc.numPages, w: v.width, h: v.height, title: (await doc.getMetadata()).info.Title, images: ops.fnArray.filter(f => f === pdfjsLib.OPS.paintImageXObject).length };
    return out;
  })()`);
  assert.deepStrictEqual(info.img, [Number(m[1]), Number(m[2])], 'размер картинки записан верно');
  assert.ok(info.corner.every(v => v > 245), `фон белый: ${info.corner}`);
  assert.ok(info.yellow > 20, `жёлтые блоки нарисованы: ${info.yellow}`);
  assert.ok(info.dark > 5, `текст нарисован: ${info.dark}`);
  assert.ok(info.pdf, 'движок PDF в Obsidian доступен');
  assert.strictEqual(info.pdf.pages, 1);
  assert.strictEqual(info.pdf.images, 1);
  assert.ok(Math.abs(info.pdf.w / info.pdf.h - info.img[0] / info.img[1]) < 0.01, 'страница по форме совпадает с картинкой');
  return info;
}
const pill = t => tapIn('.lt-pill button', t, `кнопка ${t}`);
const handle = a => tapIn(`.lt-handle[data-action="${a}"]`, undefined, `плюс ${a}`);
async function blockPoint(text) {
  const c = await ev(`(() => { const b = ltBlock(${JSON.stringify(text)}); if (!b) return null; const r = b.getBoundingClientRect(); const v = ltRoot().querySelector('.lt-viewport').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, x: r.left + r.width / 2, y: r.top + r.height / 2, ok: r.top + r.height / 2 > v.top && r.top + r.height / 2 < v.bottom && r.left + r.width / 2 > v.left && r.left + r.width / 2 < v.right }; })()`);
  assert.ok(c, `нет блока: ${text}`);
  assert.ok(c.ok, `блок за экраном: ${text}`);
  return c;
}
async function tapBlock(text) {
  const c = await blockPoint(text);
  await tap(c.x, c.y);
}
async function tapBackground() {
  const c = await ev(`(() => {
    const v = ltRoot().querySelector('.lt-viewport');
    const r = v.getBoundingClientRect();
    for (let y = r.top + 14; y < r.bottom - 150; y += 12) {
      for (let x = r.left + 14; x < r.right - 14; x += 12) {
        const e = document.elementFromPoint(x, y);
        if (e && (e === v || e.classList.contains('lt-stage') || e.classList.contains('lt-layer'))) return { x, y };
      }
    }
    return null;
  })()`);
  assert.ok(c, 'нет пустого места на экране');
  await tap(c.x, c.y);
}
async function fitAll(label = 'Вся схема') {
  for (let i = 0; i < 3; i++) {
    const s = await state();
    if (!s.edit && !s.sel && !s.mode) break;
    await tapBackground();
  }
  await pill(label);
  await sleep(320);
}
async function menu(item) {
  await dock('Ещё');
  await sleep(250);
  // На медленной машине меню ещё выезжает снизу: ждём, пока оно встанет на место.
  for (let i = 0, prev = null; i < 20; i++) {
    const top = await ev(`(() => { const m = document.querySelector('.menu'); return m ? Math.round(m.getBoundingClientRect().top) : null; })()`);
    if (top !== null && top === prev) break;
    prev = top;
    await sleep(100);
  }
  const c = await ev(`(() => { const e = [...document.querySelectorAll('.menu .menu-item')].find(m => m.querySelector('.menu-item-title').textContent === ${JSON.stringify(item)}); return e ? ltCenter(e) : null; })()`);
  assert.ok(c, `нет пункта меню: ${item}`);
  const last = await ev(`(() => { const all = [...document.querySelectorAll('.menu .menu-item')]; return all[all.length - 1].getBoundingClientRect().bottom <= innerHeight; })()`);
  assert.ok(last, 'последний пункт меню виден без прокрутки');
  assert.strictEqual(await ev(`[...document.querySelectorAll('.menu .menu-item')].filter(m => !m.querySelector('.menu-item-icon svg')).length`), 0, 'у пунктов меню должны быть значки');
  await shot('menu');
  await tap(c.x, c.y);
  await sleep(200);
}
// Меню с тремя точками в правом верхнем углу вкладки: возвращает место пункта на экране.
async function paneMenu(item) {
  // Всплывающее уведомление Obsidian ложится поверх кнопки и забирает первое нажатие.
  await ev(`document.querySelectorAll('.notice').forEach(n => n.remove())`);
  const more = await ev(`(() => { const all = [...document.querySelectorAll('.workspace-leaf.mod-active .view-actions .clickable-icon, .workspace-leaf.mod-active .view-header .view-action')].filter(x => x.getBoundingClientRect().width > 0); const e = all[all.length - 1]; return e ? ltCenter(e) : null; })()`);
  assert.ok(more, 'нет кнопки с тремя точками');
  await tap(more.x, more.y);
  await sleep(400);
  const c = await ev(`(() => { const e = [...document.querySelectorAll('.menu .menu-item')].find(m => m.querySelector('.menu-item-title') && m.querySelector('.menu-item-title').textContent === ${JSON.stringify(item)}); return e ? ltCenter(e) : null; })()`);
  assert.ok(c, `в меню с тремя точками нет пункта: ${item}`);
  assert.ok(c.y < await ev(`innerHeight`) - 20, `пункт виден без прокрутки: y=${c.y}`);
  return c;
}
const state = () => ev(`(() => {
  const v = ltView();
  return {
    type: v.getViewType(),
    nodes: v.doc.nodes.map(n => n.text),
    edges: v.doc.edges.length,
    sel: v.sel && v.node(v.sel) ? v.node(v.sel).text : null,
    mode: v.mode,
    edit: v.edit ? { kind: v.edit.kind, parents: (v.edit.parents || []).map(p => v.node(p).text), q: v.edit.q, value: v.editor.value } : null,
    k: v.view.k,
    x: v.view.x,
    y: v.view.y,
    focused: document.activeElement === v.editor,
  };
})()`);
const blockData = text => ev(`(() => { const v = ltView(); const n = v.doc.nodes.find(b => b.text === ${JSON.stringify(text)}); return n ? { q: n.q, side: n.side || '', collapsed: !!n.collapsed, parents: v.doc.edges.filter(e => e[1] === n.id).map(e => v.node(e[0]).text) } : null; })()`);
const childrenText = text => ev(`(() => { const v = ltView(); const n = v.doc.nodes.find(b => b.text === ${JSON.stringify(text)}); return v.doc.edges.filter(e => e[0] === n.id).map(e => v.node(e[1]).text); })()`);
const hasClass = (text, cls) => ev(`ltBlock(${JSON.stringify(text)}).classList.contains(${JSON.stringify(cls)})`);
const newTree = async () => {
  await ev(`app.commands.executeCommandById('logic-tree:new-tree')`);
  await sleep(900);
};
const keyboard = async open => {
  await ev(`(() => { document.body.style.setProperty('--keyboard-height', '${open ? 290 : 0}px'); window.dispatchEvent(new Event('${open ? 'keyboardWillShow' : 'keyboardWillHide'}')); })()`);
  await sleep(520);
};

(async () => {
  await connect();
  await ready();
  console.log(`Obsidian ${await ev('electron.ipcRenderer.sendSync("version")')}`);
  assert.strictEqual(path.resolve(await ev('app.vault.adapter.basePath')).toLowerCase(), path.resolve(VAULT).toLowerCase(), 'открылось не то хранилище');
  // Временное хранилище открывается впервые, поэтому Obsidian спрашивает, доверять ли ему.
  for (let i = 0; i < 40; i++) {
    const answered = await ev(`(() => {
      const modal = document.querySelector('.modal-container .modal');
      const trust = modal && [...modal.querySelectorAll('button')].find(b => !b.classList.contains('mod-cancel') && !b.classList.contains('modal-close-button'));
      if (!trust) return false;
      trust.click();
      return true;
    })()`);
    if (answered) break;
    await sleep(250);
  }
  await sleep(1500);
  await ev(`app.setting && app.setting.close()`);
  await closeDialogs();
  await sleep(300);
  assert.ok(await ev(`!!app.plugins.plugins['logic-tree']`), 'плагин не загрузился');
  assert.deepStrictEqual(await ev(`Object.keys(app.plugins.plugins)`), ['logic-tree']);

  await newTree();
  await step('ПК: новое дерево сразу ждёт тезис', async () => {
    const s = await state();
    assert.strictEqual(s.type, 'logic-tree-view');
    assert.deepStrictEqual(s.nodes, []);
    assert.strictEqual(s.edit.kind, 'draft');
    assert.ok(s.focused, await ev(`[document.activeElement.tagName, document.activeElement.className, 'hasFocus=' + document.hasFocus(), 'editor=' + ltView().editor.style.display, 'connected=' + ltView().editor.isConnected, 'w=' + ltView().viewport.clientWidth, 'active=' + (app.workspace.activeLeaf === ltView().leaf)].join(' | ')`));
  });
  await type('Тезис на ПК');
  await key('Enter');
  await step('ПК: Enter сохраняет блок и начинает следующий', async () => {
    const s = await state();
    assert.deepStrictEqual(s.nodes, ['Тезис на ПК']);
    assert.deepStrictEqual(s.edit.parents, ['Тезис на ПК']);
    assert.strictEqual(s.edit.value, '');
    assert.ok(s.focused);
  });
  await type('Первая ветка');
  await key('Tab');
  await step('ПК: Tab добавляет блок рядом', async () => {
    const s = await state();
    assert.deepStrictEqual(s.nodes, ['Тезис на ПК', 'Первая ветка']);
    assert.deepStrictEqual(s.edit.parents, ['Тезис на ПК']);
  });
  await key('Escape');
  await step('ПК: Esc закрывает пустой блок', async () => {
    const s = await state();
    assert.strictEqual(s.edit, null);
    assert.strictEqual(s.sel, 'Первая ветка');
  });
  await key('z', 2);
  await step('ПК: Ctrl+Z отменяет', async () => {
    assert.deepStrictEqual((await state()).nodes, ['Тезис на ПК']);
  });
  await key('Enter');
  await type('Блок на ПК');
  await key('Enter');
  await key('Escape');
  const labelAt = () => ev(`ltCenter(ltFind('.lt-label'))`);
  let at = await labelAt();
  await click(at.x, at.y);
  let third;
  await step('ПК: нажатие на подпись показывает все вопросы сразу, без прокрутки', async () => {
    const p = await panel();
    assert.strictEqual(p.mode, 'question');
    assert.ok(p.shown && p.inside && p.onScreen && p.noScroll, JSON.stringify(p));
    assert.ok(p.count >= 9, `вопросов ${p.count}`);
    assert.strictEqual(p.badge, '"1"', 'на ПК у вопросов есть цифры');
    assert.deepStrictEqual(p.on, ['Что происходит?']);
    [, , third] = p.list;
    await shot('01b-desktop-questions');
  });
  await key('3');
  await step('ПК: цифра выбирает вопрос', async () => {
    assert.strictEqual((await blockData('Блок на ПК')).q, third);
    assert.strictEqual((await state()).mode, null);
  });
  at = await labelAt();
  await click(at.x, at.y);
  await key('Escape');
  await step('ПК: Esc закрывает панель и ничего не меняет', async () => {
    assert.strictEqual((await state()).mode, null);
    assert.strictEqual((await blockData('Блок на ПК')).q, third);
    assert.strictEqual(await ev(`getComputedStyle(ltFind('.lt-qpanel')).display`), 'none');
  });
  await key('Enter');
  await step('ПК: вопросы над полем ввода видны все, строка переносится', async () => {
    const g = await ev(`(() => { const c = ltFind('.lt-strip-chips'); const r = ltRoot().getBoundingClientRect(); return { fits: c.scrollWidth <= c.clientWidth + 1, inside: [...c.children].every(b => b.getBoundingClientRect().right <= r.right + 1) }; })()`);
    assert.ok(g.fits && g.inside, JSON.stringify(g));
  });
  const second = await ev(`ltView().stripList[1]`);
  await key('2', 1);
  await step('ПК: Alt с цифрой меняет вопрос во время ввода', async () => {
    const s = await state();
    assert.strictEqual(s.edit.q, second);
    assert.ok(s.focused);
  });
  await key('Escape');
  await shot('01-desktop');
  await ev(`app.commands.executeCommandById('logic-tree:export-pdf')`);
  await sleep(3000);
  await step('ПК: экспорт сохраняет PDF рядом со схемой и открывает его', async () => {
    const info = await checkPdf('desktop', 'Дерево 1.pdf');
    assert.strictEqual(info.pdf.title, 'Дерево 1');
    assert.ok(info.img[0] >= 600, `картинка чёткая: ${info.img}`);
    assert.strictEqual(await ev(`app.workspace.activeLeaf.view.getViewType()`), 'pdf');
    await shot('01c-desktop-pdf');
  });

  await ev(`app.emulateMobile(true)`).catch(() => {});
  await sleep(2500);
  await connect();
  await ready();
  await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 780, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await sleep(900);
  assert.ok(await ev(`app.isMobile && document.body.classList.contains('is-mobile')`), 'нет режима телефона');
  await ev(`document.querySelectorAll('.modal-close-button').forEach(b => b.click())`);
  await ev(`(() => { const p = app.plugins.plugins['logic-tree']; p.data.stats = {}; p.data.focus = true; p.data.tips = {}; })()`);

  await newTree();
  await step('Телефон: верхних панелей нет, почти весь экран под схему', async () => {
    const g = await ev(`(() => { const r = ltRoot().querySelector('.lt-viewport').getBoundingClientRect(); return { top: r.top, height: r.height, composer: !!ltRoot().querySelector('.lt-composer') }; })()`);
    assert.strictEqual(g.composer, false);
    assert.ok(g.height >= 620, `высота области схемы ${g.height}`);
  });
  await step('Телефон: первая подсказка видна', async () => {
    assert.notStrictEqual(await ev(`getComputedStyle(ltFind('.lt-tip')).display`), 'none');
    await shot('02-mobile-start');
  });

  await type('ЭП ограничит количество туристов в туристических городах');
  await key('Enter');
  await step('Вопрос подставляется сам', async () => {
    const s = await state();
    assert.strictEqual(s.edit.q, 'Что происходит?');
    assert.ok(s.focused, 'клавиатура не должна закрываться');
  });
  await type('Становится слишком много людей в городе');
  await key('Enter');
  await step('Вопрос идёт по цепочке', async () => {
    assert.strictEqual((await state()).edit.q, 'Почему так происходит?');
    assert.strictEqual((await blockData('Становится слишком много людей в городе')).q, 'Что происходит?');
  });
  await type('Некоторые города привлекают больше людей');
  await key('Enter');
  await step('Цепочка вопросов продолжается', async () => {
    assert.strictEqual((await state()).edit.q, 'Что это значит?');
  });
  await chip('Почему так происходит?');
  await step('Вопрос меняется одним нажатием, клавиатура остаётся', async () => {
    const s = await state();
    assert.strictEqual(s.edit.q, 'Почему так происходит?');
    assert.ok(s.focused);
  });
  await type('Отдых лучше\n');
  await step('Перенос строки сохраняет блок', async () => {
    const s = await state();
    assert.ok(s.nodes.includes('Отдых лучше'));
    assert.strictEqual(s.edit.value, '');
    assert.strictEqual((await blockData('Отдых лучше')).q, 'Почему так происходит?');
  });
  await step('Исправление запоминается', async () => {
    assert.strictEqual((await state()).edit.q, 'Почему так происходит?');
  });
  await tapIn('.lt-strip-all', undefined, 'Все вопросы');
  await step('Во время ввода панель вопросов открывается, клавиатура остаётся', async () => {
    const p = await panel();
    assert.ok(p.shown && p.inside && p.onScreen, JSON.stringify(p));
    assert.ok(p.count >= 9);
    assert.strictEqual(p.badge, 'none', 'на телефоне цифр нет');
    assert.ok((await state()).focused);
    await shot('02b-mobile-questions');
  });
  await qbtn('Что это значит?');
  await step('Выбор в панели ставит вопрос и возвращает к вводу', async () => {
    const s = await state();
    assert.strictEqual(s.edit.q, 'Что это значит?');
    assert.ok(s.focused);
    assert.strictEqual(await ev(`getComputedStyle(ltFind('.lt-qpanel')).display`), 'none');
  });
  await type('Курорт');
  await beside();
  await step('«Рядом» с текстом добавляет соседний блок с тем же вопросом', async () => {
    const s = await state();
    assert.ok(s.nodes.includes('Курорт'));
    assert.deepStrictEqual(s.edit.parents, ['Отдых лучше']);
    assert.strictEqual(s.edit.q, 'Что это значит?');
    assert.ok(s.focused);
  });
  await type('Исторические объекты');
  await beside();
  await type('Культурные объекты');
  await key('Enter');
  await step('После «Готово» начат блок ниже', async () => {
    assert.deepStrictEqual((await state()).edit.parents, ['Культурные объекты']);
  });
  await beside();
  await step('«Рядом» на пустом блоке переставляет его к соседям', async () => {
    const s = await state();
    assert.deepStrictEqual(s.edit.parents, ['Отдых лучше']);
    assert.strictEqual(s.edit.q, 'Что это значит?');
  });
  await keyboard(true);
  await step('С клавиатурой: полоска над клавиатурой, блок виден, места хватает', async () => {
    const g = await ev(`(() => {
      const root = ltRoot();
      const strip = root.querySelector('.lt-strip').getBoundingClientRect();
      const ed = root.querySelector('.lt-editor').getBoundingClientRect();
      const vp = root.querySelector('.lt-viewport').getBoundingClientRect();
      return { stripBottom: strip.bottom, stripTop: strip.top, edTop: ed.top, edBottom: ed.bottom, vpTop: vp.top, h: innerHeight };
    })()`);
    assert.ok(g.stripBottom <= g.h - 290 + 1, `полоска под клавиатурой: ${JSON.stringify(g)}`);
    assert.ok(g.edBottom <= g.stripTop, `блок закрыт полоской: ${JSON.stringify(g)}`);
    assert.ok(g.edTop >= g.vpTop, `блок выше области: ${JSON.stringify(g)}`);
    assert.ok(g.stripTop - g.vpTop >= 280, `мало места: ${g.stripTop - g.vpTop}`);
    await shot('03-mobile-keyboard');
  });
  await keyboard(false);
  await step('Клавиатура закрыта: пустой блок исчезает', async () => {
    const s = await state();
    assert.strictEqual(s.edit, null);
    assert.strictEqual(s.sel, 'Культурные объекты');
  });

  await tapBackground();
  await step('Нажатие мимо снимает выбор и не создаёт оторванных блоков', async () => {
    const s = await state();
    assert.strictEqual(s.sel, null);
    assert.strictEqual(await ev(`!!ltFind('.lt-pill button', 'Новый тезис')`), true);
  });
  await step('Без выбора панель стоит над панелью Obsidian', async () => {
    const g = await ev(`(() => { const nav = document.querySelector('.mobile-navbar').getBoundingClientRect(); const pill = ltFind('.lt-pill').getBoundingClientRect(); return { navTop: nav.top, pillBottom: pill.bottom }; })()`);
    assert.ok(g.pillBottom <= g.navTop, JSON.stringify(g));
  });
  await pill('Вся схема');
  await sleep(320);

  await tapBlock('Курорт');
  await step('Выбранный блок: плюсы рядом с ним, панель Obsidian спрятана', async () => {
    const g = await ev(`(() => {
      const b = ltFind('.lt-node.is-selected').getBoundingClientRect();
      const below = ltFind('.lt-handle[data-action="below"]').getBoundingClientRect();
      const beside = ltFind('.lt-handle[data-action="beside"]').getBoundingClientRect();
      const dock = ltFind('.lt-dock');
      const nav = document.querySelector('.mobile-navbar');
      return { b: { left: b.left, right: b.right, top: b.top, bottom: b.bottom }, below: { w: below.width, top: below.top, cx: below.left + below.width / 2 }, beside: { w: beside.width, left: beside.left, cy: beside.top + beside.height / 2 }, dockFits: dock.scrollWidth <= dock.clientWidth, dockBottom: dock.getBoundingClientRect().bottom, h: innerHeight, navOpacity: getComputedStyle(nav).opacity };
    })()`);
    assert.ok(g.below.w >= 36, 'плюс снизу слишком мал');
    assert.ok(g.below.top >= g.b.bottom, 'плюс снизу должен быть под блоком');
    assert.ok(Math.abs(g.below.cx - (g.b.left + g.b.right) / 2) < 2, 'плюс снизу по центру');
    assert.ok(g.beside.left + g.beside.w / 2 >= g.b.right, 'плюс сбоку должен быть справа');
    assert.ok(g.dockFits, 'кнопки не помещаются');
    assert.ok(g.dockBottom <= g.h + 1, `кнопки за экраном: низ ${g.dockBottom}, экран ${g.h}`);
    await sleep(350);
    assert.strictEqual(await ev(`getComputedStyle(document.querySelector('.mobile-navbar')).opacity`), '0', 'панель Obsidian должна быть спрятана');
    await shot('04-mobile-selected');
  });
  await step('Фокус: своя ветка яркая, соседние бледные', async () => {
    assert.strictEqual(await hasClass('Курорт', 'is-dim'), false);
    assert.strictEqual(await hasClass('Отдых лучше', 'is-dim'), false);
    assert.strictEqual(await hasClass('Исторические объекты', 'is-dim'), true);
    assert.ok(await ev(`[...ltRoot().querySelectorAll('.lt-svg path.is-dim')].some(p => p.getAttribute('d'))`), 'бледные линии');
  });
  await menu('Фокус на ветке');
  await step('Фокус можно выключить', async () => {
    assert.strictEqual(await hasClass('Исторические объекты', 'is-dim'), false);
  });
  await menu('Фокус на ветке');

  await dock('Свести');
  await tapBlock('Исторические объекты');
  await tapBlock('Культурные объекты');
  await step('Сведение: блоки отмечены, на экране подсказка', async () => {
    assert.strictEqual(await hasClass('Исторические объекты', 'is-marked'), true);
    assert.ok(await ev(`!!ltFind('.lt-dock button', 'Свести (3)')`));
    await shot('05-mobile-merge');
  });
  await dock('Свести (3)');
  await step('После сведения общий блок пишется сразу', async () => {
    const s = await state();
    assert.deepStrictEqual(s.edit.parents.slice().sort(), ['Исторические объекты', 'Культурные объекты', 'Курорт'].sort());
    assert.strictEqual(s.edit.q, 'К чему это приводит?');
    assert.ok(s.focused);
  });
  await type('Туристическая нагрузка возрастает');
  await key('Enter');
  await pick('Почему это важно?');
  await type('Инфраструктура страдает');
  await key('Enter');
  await chip('Свой…');
  await type('Что с ней происходит?');
  await key('Enter');
  await step('Свой вопрос принят, курсор вернулся в блок', async () => {
    const s = await state();
    assert.strictEqual(s.edit.q, 'Что с ней происходит?');
    assert.ok(s.focused);
  });
  await type('Исчезает');
  await beside();
  await type('Уменьшается пропускная способность');
  await beside();
  await type('Дорожает');
  await tapBackground();
  await step('Нажатие мимо во время ввода сохраняет написанное и не теряет связь', async () => {
    const s = await state();
    assert.strictEqual(s.edit, null);
    assert.strictEqual(s.sel, 'Дорожает');
    assert.deepStrictEqual((await blockData('Дорожает')).parents, ['Инфраструктура страдает']);
  });
  assert.ok(await ev(`!ltFind('.lt-strip') || getComputedStyle(ltFind('.lt-strip')).display === 'none'`), 'полоска должна скрыться');

  await fitAll();
  await tapBlock('Исчезает');
  await handle('below');
  await step('Плюс снизу начинает блок ниже', async () => {
    const s = await state();
    assert.deepStrictEqual(s.edit.parents, ['Исчезает']);
    assert.ok(s.focused);
    assert.ok(s.k >= 0.9, `при вводе текст должен быть читаем, масштаб ${s.k}`);
  });
  await pick('Что именно?');
  await type('Туристические объекты вместо повседневных');
  await tapBackground();

  await fitAll();
  await tapBlock('Уменьшается пропускная способность');
  await handle('below');
  await pick('Что именно?');
  await type('Пробки');
  await beside();
  await type('Очереди');
  await tapBackground();

  await fitAll();
  await tapBlock('Дорожает');
  await handle('below');
  await step('Выученный вопрос подставляется сам', async () => {
    assert.strictEqual((await state()).edit.q, 'Что именно?');
  });
  await type('Аренда жилья');
  await beside();
  await type('Транспорт');
  await tapBackground();
  await handle('beside');
  await step('Плюс справа начинает блок рядом', async () => {
    const s = await state();
    assert.deepStrictEqual(s.edit.parents, ['Дорожает']);
    assert.strictEqual(s.edit.q, 'Что именно?');
  });
  await type('Товары и услуги');
  await tapBackground();

  await fitAll();
  await tapBlock('Туристические объекты вместо повседневных');
  await dock('Свести');
  for (const t of ['Пробки', 'Очереди', 'Аренда жилья', 'Транспорт', 'Товары и услуги']) await tapBlock(t);
  await dock('Свести (6)');
  await type('Что с этим делать?');
  await tapBackground();
  await step('Оба скрина собраны, 19 блоков', async () => {
    assert.strictEqual((await state()).nodes.length, 19);
  });
  await step('Свой вопрос появился в списке', async () => {
    await fitAll();
    await tapBlock('Отдых лучше');
    await handle('below');
    assert.ok(await ev(`!!ltFind('.lt-chip', 'Что с ней происходит?')`));
    await key('Escape');
  });
  await fitAll();
  await shot('06-mobile-full');

  await step('Жесты: перетаскивание двигает схему, панели не выезжают', async () => {
    const vp = await ev(`(() => { const r = ltRoot().querySelector('.lt-viewport').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; })()`);
    const before = await state();
    await touchPath({ x: vp.l + 6, y: vp.t + 30 }, { x: vp.l + 300, y: vp.t + 30 });
    await sleep(400);
    const after = await state();
    assert.ok(Math.abs(after.x - before.x - 294) < 40, `сдвиг ${after.x - before.x}`);
    assert.ok(await ev(`app.workspace.leftSplit.collapsed`), 'левая панель открылась');
    await pinch(vp.l + vp.w / 2, vp.t + vp.h / 2, 40, 120);
    assert.ok((await state()).k > after.k * 2, 'масштаб');
  });
  await fitAll();

  await tapBlock('Дорожает');
  await dock('Оппонент');
  await step('Цвет стороны применяется к ветке одним нажатием', async () => {
    assert.strictEqual((await blockData('Дорожает')).side, 'o');
    assert.strictEqual((await blockData('Транспорт')).side, 'o');
    assert.strictEqual(await hasClass('Транспорт', 'lt-opp'), true);
    assert.strictEqual(await hasClass('Пробки', 'lt-opp'), false);
    assert.ok(await ev(`!!ltFind('.lt-dock button', 'Моя сторона')`));
    await shot('07-mobile-sides');
  });

  const nodesBefore = await ev(`ltRoot().querySelectorAll('.lt-node').length`);
  await handle('fold');
  await step('Ветка сворачивается, виден счётчик', async () => {
    assert.strictEqual(await ev(`ltRoot().querySelectorAll('.lt-node').length`), nodesBefore - 3);
    assert.strictEqual(await ev(`ltBlock('Дорожает').querySelector('.lt-count').textContent`), '+3');
    await shot('08-mobile-folded');
  });
  await step('Плюс не перекрывает счётчик свёрнутой ветки', async () => {
    const g = await ev(`(() => { const c = ltFind('.lt-node .lt-count', '+3').getBoundingClientRect(); const h = ltFind('.lt-handle[data-action="below"]').getBoundingClientRect(); return { countBottom: c.bottom, handleTop: h.top }; })()`);
    assert.ok(g.handleTop - g.countBottom >= 6, JSON.stringify(g));
  });
  await tapIn('.lt-node .lt-count', '+3', 'счётчик');
  await step('Нажатие на счётчик разворачивает', async () => {
    assert.strictEqual(await ev(`ltRoot().querySelectorAll('.lt-node').length`), nodesBefore);
  });
  await fitAll();

  await step('Удержание и перенос под другой блок', async () => {
    const from = await blockPoint('Транспорт');
    const to = await blockPoint('Очереди');
    await touchPath({ x: from.x, y: from.y }, { x: to.x, y: to.y }, 560);
    assert.deepStrictEqual((await blockData('Транспорт')).parents, ['Очереди']);
  });
  await step('Перенос отменяется', async () => {
    await dock('Назад');
    assert.deepStrictEqual((await blockData('Транспорт')).parents, ['Дорожает']);
  });
  await fitAll();
  await step('Удержание и перенос к соседу меняет порядок', async () => {
    const from = await blockPoint('Товары и услуги');
    const to = await blockPoint('Аренда жилья');
    await touchPath({ x: from.x, y: from.y }, { x: to.left + to.width * 0.12, y: to.y }, 560);
    assert.deepStrictEqual(await childrenText('Дорожает'), ['Товары и услуги', 'Аренда жилья', 'Транспорт']);
  });
  await step('Нельзя перенести блок в собственную ветку', async () => {
    await dock('Назад');
    await fitAll();
    const from = await blockPoint('Дорожает');
    const to = await blockPoint('Транспорт');
    await touchPath({ x: from.x, y: from.y }, { x: to.x, y: to.y }, 560);
    assert.deepStrictEqual((await blockData('Дорожает')).parents, ['Инфраструктура страдает']);
  });
  await fitAll();

  await tapIn('.lt-label', 'Что это значит?', 'подпись');
  await step('Нажатие на подпись открывает выбор вопроса', async () => {
    const p = await panel();
    assert.strictEqual(p.mode, 'question');
    assert.ok(p.shown && p.inside && p.onScreen && p.noScroll, JSON.stringify(p));
    assert.deepStrictEqual(p.on, ['Что это значит?']);
    await shot('09-mobile-question');
  });
  await qbtn('Что именно?');
  await step('Вопрос меняется сразу у всей развилки', async () => {
    assert.strictEqual((await blockData('Курорт')).q, 'Что именно?');
    assert.strictEqual((await blockData('Культурные объекты')).q, 'Что именно?');
    assert.strictEqual((await state()).mode, null);
  });

  await fitAll();
  await tapBlock('Отдых лучше');
  await tapBlock('Отдых лучше');
  await step('Повторное нажатие открывает правку прямо в блоке', async () => {
    const s = await state();
    assert.strictEqual(s.edit.kind, 'node');
    assert.strictEqual(s.edit.value, 'Отдых лучше');
    assert.ok(s.focused);
  });
  await type(' там');
  await key('Enter');
  await step('Правка сохраняется, цепочка не продолжается', async () => {
    const s = await state();
    assert.strictEqual(s.edit, null);
    assert.ok(s.nodes.includes('Отдых лучше там'), JSON.stringify(s.nodes.filter(t => t.includes('Отдых') || t.includes('там'))));
  });

  await fitAll();
  await tapBlock('Курорт');
  await dock('Связать');
  await tapBlock('Пробки');
  const withLink = (await state()).edges;
  await step('Связать добавляет стрелку', async () => {
    assert.deepStrictEqual((await blockData('Пробки')).parents.slice().sort(), ['Курорт', 'Уменьшается пропускная способность'].sort());
  });
  await dock('Связать');
  await tapBlock('Пробки');
  await step('Повторное «Связать» убирает стрелку', async () => {
    assert.strictEqual((await state()).edges, withLink - 1);
  });
  await dock('Связать');
  await tapBlock('Отдых лучше там');
  await step('Петлю создать нельзя', async () => {
    assert.strictEqual((await state()).edges, withLink - 1);
  });

  await fitAll();
  await tapBlock('Очереди');
  await menu('Удалить блок');
  await step('Удаление блока переводит выбор на родителя', async () => {
    const s = await state();
    assert.ok(!s.nodes.includes('Очереди'));
    assert.strictEqual(s.sel, 'Уменьшается пропускная способность');
  });
  await dock('Назад');
  await step('Назад возвращает блок', async () => {
    assert.ok((await state()).nodes.includes('Очереди'));
  });
  await fitAll();
  await tapBlock('Уменьшается пропускная способность');
  await menu('Удалить ветку');
  await step('Удаление ветки убирает блок и его продолжения', async () => {
    const s = await state();
    assert.ok(!s.nodes.includes('Уменьшается пропускная способность'));
    assert.ok(!s.nodes.includes('Пробки'));
    assert.ok(s.nodes.includes('Что с этим делать?'), 'блок с другими родителями остаётся');
  });
  await dock('Назад');

  await fitAll();
  await tapBlock('Отдых лучше там');
  const helpItem = await paneMenu('Как пользоваться');
  await tap(helpItem.x, helpItem.y);
  await sleep(250);
  await step('Справка открывается внутри экрана и закрывается', async () => {
    assert.ok(await ev(`!!ltFind('.lt-help')`));
    await shot('10-mobile-help');
    await tapIn('.lt-help-close', undefined, 'закрыть справку');
    assert.ok(await ev(`getComputedStyle(ltFind('.lt-help')).display === 'none'`));
  });

  await sleep(700);
  const file = await ev(`ltView().file.path`);
  await step('Блоки попадают на диск почти сразу', async () => {
    const before = fs.readFileSync(path.join(VAULT, file), 'utf8');
    await fitAll();
    await tapBlock('Отдых лучше там');
    await handle('below');
    await type('Быстрый блок');
    await key('Enter');
    await sleep(700);
    const disk = JSON.parse(fs.readFileSync(path.join(VAULT, file), 'utf8'));
    assert.notStrictEqual(JSON.stringify(disk), before);
    assert.ok(disk.nodes.some(n => n.text === 'Быстрый блок'));
  });
  await step('При сворачивании приложения написанное не теряется', async () => {
    await type('Несохранённый текст');
    await ev(`(() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); delete document.visibilityState; })()`);
    await sleep(700);
    const disk = JSON.parse(fs.readFileSync(path.join(VAULT, file), 'utf8'));
    assert.ok(disk.nodes.some(n => n.text === 'Несохранённый текст'));
  });

  await fitAll();
  await tapBlock('Дорожает');
  await handle('fold');
  await sleep(700);
  const saved = JSON.parse(fs.readFileSync(path.join(VAULT, file), 'utf8'));
  await ev(`(async () => { await app.workspace.activeLeaf.detach(); })()`);
  await sleep(500);
  await ev(`app.workspace.getLeaf(true).openFile(app.vault.getAbstractFileByPath(${JSON.stringify(file)}))`);
  await sleep(1100);
  await step('После повторного открытия всё на месте', async () => {
    const s = await state();
    assert.strictEqual(s.nodes.length, saved.nodes.length);
    assert.strictEqual(s.edges, saved.edges.length);
    assert.strictEqual((await blockData('Дорожает')).collapsed, true);
    assert.strictEqual((await blockData('Дорожает')).side, 'o');
    assert.ok(await ev(`!!ltBlock('Дорожает').querySelector('.lt-count')`));
  });

  fs.writeFileSync(path.join(VAULT, 'old.tree'), JSON.stringify({ version: 1, nextId: 3, nodes: [{ id: 'n1', text: 'Старый тезис', q: '' }, { id: 'n2', text: 'Старый блок', q: 'Что именно?' }], edges: [['n1', 'n2']] }));
  fs.writeFileSync(path.join(VAULT, 'broken.tree'), '{oops');
  await sleep(1300);
  await ev(`app.workspace.getLeaf(true).openFile(app.vault.getAbstractFileByPath('old.tree'))`);
  await sleep(900);
  await step('Файл первой версии открывается', async () => {
    assert.deepStrictEqual((await state()).nodes, ['Старый тезис', 'Старый блок']);
    assert.ok(await ev(`!!ltBlock('Старый блок')`));
    assert.ok(await ev(`!!ltFind('.lt-label', 'Что именно?')`));
  });
  await tapBlock('Старый тезис');
  await menu('Разбор');
  await step('Разбор можно начать на готовой схеме', async () => {
    const s = await wiz();
    assert.ok(s.open);
    assert.strictEqual(s.stage, 'type');
    assert.ok(s.backOff, 'резолюция уже есть, назад идти некуда');
    assert.strictEqual(await ev(`ltFind('.lt-wiz-kind.is-on').dataset.kind`), 'life', 'по умолчанию разбирается решение');
    await tapIn('.lt-wiz-kind[data-kind="debate"]', undefined, 'Дебаты');
    await tapIn('.lt-wiz-type[data-type="value"]', undefined, 'тип «Оценка»');
    assert.strictEqual((await wiz()).stage, 'side');
    await tapIn('.lt-wiz-type[data-type="none"]', undefined, 'позиция неизвестна');
    assert.strictEqual((await state()).nodes.length, 10);
    assert.deepStrictEqual((await blockData('Критерий')).parents, ['Старый тезис']);
    assert.deepStrictEqual((await blockData('Старый блок')).parents, ['Старый тезис']);
    await tapIn('.lt-wiz-close', undefined, 'закрыть разбор');
    assert.strictEqual((await state()).mode, null);
  });
  await ev(`app.workspace.getLeaf(true).openFile(app.vault.getAbstractFileByPath('broken.tree'))`);
  await sleep(900);
  await step('Нечитаемый файл не трогается и объясняет, что делать', async () => {
    assert.strictEqual(await ev(`ltView().getViewData()`), '{oops');
    assert.ok(await ev(`ltRoot().classList.contains('lt-is-broken')`));
    await ev(`ltView().save()`);
    await sleep(300);
    assert.strictEqual(fs.readFileSync(path.join(VAULT, 'broken.tree'), 'utf8'), '{oops');
    await shot('11-mobile-broken');
  });

  // Разбор резолюции
  await newTree();
  await step('На пустой схеме есть вход в разбор резолюции', async () => {
    assert.notStrictEqual(await ev(`getComputedStyle(ltFind('.lt-strip-analyze')).display`), 'none');
    assert.strictEqual(await ev(`getComputedStyle(ltFind('.lt-strip-beside')).display`), 'none');
  });
  await type('ЭП сожалеет о романтизации материнства');
  await tapIn('.lt-strip-analyze', undefined, 'Разбор');
  await step('Текст из блока становится резолюцией, тип определён', async () => {
    const s = await wiz();
    assert.ok(s.open);
    assert.strictEqual(s.stage, 'type');
    assert.strictEqual(s.on, 'regret');
    assert.strictEqual(s.types, 6);
    assert.strictEqual((await state()).edit, null);
  });
  await tapIn('.lt-wiz-back', undefined, 'назад');
  await step('Назад возвращает к тексту резолюции', async () => {
    const s = await wiz();
    assert.strictEqual(s.stage, 'motion');
    assert.strictEqual(s.value, 'ЭП сожалеет о романтизации материнства');
  });
  await ev(`(() => { const i = ltFind('.lt-wiz-input'); i.focus(); i.select(); })()`);
  await type('ЭП поддерживает романтизацию материнства');
  await key('Enter');
  await step('Другая резолюция даёт другой тип', async () => {
    const s = await wiz();
    assert.strictEqual(s.stage, 'type');
    assert.strictEqual(s.on, 'support');
    const g = await ev(`(() => { const w = ltFind('.lt-wizard').getBoundingClientRect(); return [...ltRoot().querySelectorAll('.lt-wiz-type')].every(b => { const r = b.getBoundingClientRect(); return r.height >= 44 && r.left >= w.left && r.right <= w.right; }); })()`);
    assert.ok(g, 'кнопки типов помещаются');
    await shot('13-wizard-type');
  });
  await wizNext();
  await wizNext();
  await step('Каркас построен: резолюция и девять разделов, с бременем и фреймом', async () => {
    const s = await state();
    assert.deepStrictEqual(s.nodes, ['ЭП поддерживает романтизацию материнства', 'Определения', 'Бремя', 'Фрейм', 'Участники', 'Что поддерживаем', 'Последствия', 'Правительство', 'Оппозиция', 'Столкновение']);
    assert.strictEqual(s.sel, 'Определения');
    assert.ok(await hasClass('Определения', 'lt-head'));
    assert.ok(await hasClass('Оппозиция', 'lt-opp'));
    assert.strictEqual(await hasClass('Определения', 'is-dim'), false);
    assert.strictEqual(await hasClass('Оппозиция', 'is-dim'), true);
    const w = await wiz();
    assert.strictEqual(w.stage, 'steps');
    assert.strictEqual(w.count, 'Шаг 1 из 11');
    assert.ok(w.prompt.includes('ключевые слова'), w.prompt);
    assert.ok(w.backOff);
    assert.ok(w.focused, 'поле ответа готово к вводу');
    assert.match(w.timer, /^1[45]:\d\d$/, 'таймер подготовки пошёл');
    const box = await blockPoint('Определения');
    assert.ok(box.width > 140, 'раздел показан крупно');
  });
  await type('Романтизация: показывать только хорошее');
  await key('Enter');
  await step('Ответ становится блоком в своём разделе, шаг остаётся', async () => {
    assert.deepStrictEqual((await blockData('Романтизация: показывать только хорошее')).parents, ['Определения']);
    const w = await wiz();
    assert.strictEqual(w.value, '');
    assert.ok(w.focused);
    assert.strictEqual(w.count, 'Шаг 1 из 11');
    assert.strictEqual(w.added, 'Добавлено: 1');
  });
  await wizNext();
  await step('Второй шаг: бремя доказывания за обе стороны', async () => {
    const w = await wiz();
    assert.strictEqual(w.prompt, 'Бремя: что нужно доказать каждой стороне?');
    assert.ok(w.hint.includes('Правительству') && w.hint.includes('Оппозиции'), w.hint);
  });
  await type('Что романтизация в целом полезна');
  await wizNext();
  await step('Третий шаг: фрейм, за ним вопрос о том, кого задевает сильнее', async () => {
    assert.ok((await wiz()).prompt.startsWith('Фрейм'));
  });
  await type('Матерей хвалят только за жертвы');
  await wizNext();
  await type('Бедные матери');
  await wizNext();
  await step('Ответы бремени и фрейма стоят в своих разделах', async () => {
    assert.deepStrictEqual((await blockData('Что романтизация в целом полезна')).parents, ['Бремя']);
    assert.deepStrictEqual((await blockData('Матерей хвалят только за жертвы')).parents, ['Фрейм']);
    const who = await blockData('Бедные матери');
    assert.deepStrictEqual(who.parents, ['Фрейм']);
    assert.strictEqual(who.q, 'Кого задевает сильнее?');
    assert.strictEqual((await wiz()).prompt, 'Кого это затрагивает?');
  });
  await type('Матери');
  await key('Enter');
  await type('Дети');
  await tapIn('.lt-wiz-add', undefined, 'добавить');
  await step('У каждого участника появляются свои шаги', async () => {
    assert.deepStrictEqual(await childrenText('Участники'), ['Матери', 'Дети']);
    const w = await wiz();
    assert.strictEqual(w.count, 'Шаг 5 из 15');
  });
  await wizNext();
  await type('Признание');
  await wizNext();
  await step('«Дальше» сохраняет написанное и ведёт к следующему вопросу', async () => {
    const b = await blockData('Признание');
    assert.deepStrictEqual(b.parents, ['Матери']);
    assert.strictEqual(b.q, 'Что получает?');
    const w = await wiz();
    assert.strictEqual(w.prompt, 'Матери: что теряет?');
    assert.strictEqual((await state()).sel, 'Матери');
  });
  await keyboard(true);
  await step('С клавиатурой разбор стоит над ней, а раздел виден', async () => {
    const g = await ev(`(() => { const w = ltFind('.lt-wizard').getBoundingClientRect(); const b = ltFind('.lt-node.is-selected').getBoundingClientRect(); const v = ltRoot().querySelector('.lt-viewport').getBoundingClientRect(); return { wizBottom: w.bottom, wizTop: w.top, blockTop: b.top, blockBottom: b.bottom, vpTop: v.top, h: innerHeight }; })()`);
    assert.ok(g.wizBottom <= g.h - 290 + 1, JSON.stringify(g));
    assert.ok(g.blockBottom <= g.wizTop && g.blockTop >= g.vpTop, JSON.stringify(g));
    await shot('14-wizard-keyboard');
  });
  await keyboard(false);
  await tapIn('.lt-wiz-back', undefined, 'назад');
  await step('Назад возвращает на прошлый шаг', async () => {
    assert.strictEqual((await wiz()).prompt, 'Матери: что получает?');
  });
  for (let i = 0; i < 12 && !(await wiz()).prompt.startsWith('Аргументы Оппозиции'); i++) await wizNext();
  await type('Давление на женщин');
  await key('Enter');
  await step('Аргументы Оппозиции получают её цвет', async () => {
    const b = await blockData('Давление на женщин');
    assert.deepStrictEqual(b.parents, ['Оппозиция']);
    assert.strictEqual(b.side, 'o');
    assert.ok(await hasClass('Давление на женщин', 'lt-opp'));
  });
  await tapIn('.lt-wiz-undo', undefined, 'отменить');
  await step('Отмена убирает ответ и не закрывает разбор', async () => {
    assert.strictEqual(await blockData('Давление на женщин'), null);
    const w = await wiz();
    assert.ok(w.open);
    assert.ok(w.prompt.includes('Оппозиции'));
  });
  await type('Давление на женщин');
  await key('Enter');
  await wizNext();
  await step('Свой аргумент разбирается по FRIC: сначала «почему правда?»', async () => {
    const w = await wiz();
    assert.strictEqual(w.prompt, '«Давление на женщин»: почему это правда?');
    assert.strictEqual((await state()).sel, 'Давление на женщин');
    const ric = await ev(`[...ltBlock('Давление на женщин').querySelectorAll('.lt-ric-letter')].map(l => l.textContent + (l.classList.contains('is-on') ? '+' : '-')).join(' ')`);
    assert.strictEqual(ric, 'Р- И- С-');
  });
  await type('Мать без жертв считают плохой');
  await wizNext();
  await step('Пример можно пропустить', async () => {
    assert.ok((await wiz()).prompt.endsWith('какой пример?'));
  });
  await wizNext();
  await type('Матери выгорают и молчат');
  await wizNext();
  await step('На сравнении есть кнопки-критерии, и они помещаются', async () => {
    const w = await wiz();
    assert.ok(w.prompt.endsWith('почему это важнее?'), w.prompt);
    assert.deepStrictEqual(w.chips, ['Вероятность', 'Масштаб', 'Критичность', 'Меньшинства', 'Необратимость']);
    const fits = await ev(`(() => { const r = ltFind('.lt-wizard').getBoundingClientRect(); return [...ltRoot().querySelectorAll('.lt-wiz-chip')].every(c => { const x = c.getBoundingClientRect(); return x.left >= r.left && x.right <= r.right && x.height >= 32; }); })()`);
    assert.ok(fits, 'кнопки критериев помещаются');
    assert.ok(await ev(`(() => { const c = ltFind('.lt-wiz-count'); return c.scrollWidth <= c.clientWidth + 1; })()`), 'номер шага не обрезан рядом с таймером');
    await shot('15a-wizard-weigh');
  });
  await ev(`(() => { const v = ltView(); v.doc.analysis.t0 = Date.now() - 14 * 60000; v.paintTimer(); })()`);
  await step('Когда время идёт быстрее плана, разбор подсказывает, куда двигаться', async () => {
    const pace = await ev(`(() => { const p = ltFind('.lt-wiz-pace'); return getComputedStyle(p).display === 'none' ? '' : p.textContent; })()`);
    assert.strictEqual(pace, 'Время идёт быстрее: пора к ответам и столкновению.');
    assert.ok(await ev(`ltFind('.lt-wiz-timer').classList.contains('is-late')`));
    assert.match((await wiz()).timer, /^[01]:\d\d$/);
    await shot('15b-wizard-late');
  });
  await ev(`(() => { const v = ltView(); v.doc.analysis.t0 = Date.now(); v.paintTimer(); })()`);
  await tapIn('.lt-wiz-chip', 'Масштаб', 'критерий «Масштаб»');
  await step('Критерий начинает ответ, поле ввода в фокусе', async () => {
    const w = await wiz();
    assert.strictEqual(w.value, 'Масштаб: ');
    assert.ok(w.focused);
  });
  await type('каждая вторая мать');
  await wizNext();
  await step('Звенья записаны под аргументом своими вопросами, буквы Р И С горят', async () => {
    assert.strictEqual((await blockData('Мать без жертв считают плохой')).q, 'Почему правда?');
    assert.strictEqual((await blockData('Матери выгорают и молчат')).q, 'К чему ведёт?');
    const w = await blockData('Масштаб: каждая вторая мать');
    assert.strictEqual(w.q, 'Почему важнее?');
    assert.deepStrictEqual(w.parents, ['Давление на женщин']);
    const ric = await ev(`[...ltBlock('Давление на женщин').querySelectorAll('.lt-ric-letter.is-on')].length`);
    assert.strictEqual(ric, 3);
  });
  await step('Без выбора стороны на аргумент Оппозиции отвечает Правительство', async () => {
    assert.strictEqual((await wiz()).prompt, 'Правительство отвечает на «Давление на женщин»');
  });
  await type('Никто не давит: это выбор');
  await wizNext();
  await step('Ответ Правительства жёлтый и стоит под аргументом Оппозиции', async () => {
    const b = await blockData('Никто не давит: это выбор');
    assert.deepStrictEqual(b.parents, ['Давление на женщин']);
    assert.strictEqual(b.q, 'Чем ответить?');
    assert.strictEqual(b.side, '');
  });
  await step('Последний шаг: столкновение', async () => {
    const w = await wiz();
    assert.ok(w.prompt.includes('столкновение'), w.prompt);
    assert.strictEqual(w.next, 'Готово');
    await shot('15-wizard-clash');
  });
  await type('Свобода выбора против поддержки семьи');
  await wizNext();
  await step('«Готово» закрывает разбор и показывает всю схему', async () => {
    const s = await state();
    assert.strictEqual(s.mode, null);
    assert.ok(s.nodes.includes('Свобода выбора против поддержки семьи'));
    assert.strictEqual(s.nodes.length, 23);
    assert.strictEqual(await ev(`getComputedStyle(ltFind('.lt-wizard')).display`), 'none');
    await sleep(350);
    await shot('16-wizard-done');
  });
  await pill('Разбор');
  await step('Разбор можно продолжить с того же шага', async () => {
    const w = await wiz();
    assert.ok(w.open);
    assert.strictEqual(w.stage, 'steps');
    assert.ok(w.prompt.includes('столкновение'));
    assert.strictEqual(w.added, 'Добавлено: 1');
  });
  await tapIn('.lt-wiz-close', undefined, 'закрыть разбор');
  await sleep(700);
  await step('Разбор сохранён в файле', async () => {
    const disk = JSON.parse(fs.readFileSync(path.join(VAULT, await ev(`ltView().file.path`)), 'utf8'));
    assert.strictEqual(disk.analysis.type, 'support');
    assert.strictEqual(disk.analysis.step, 'clash');
    assert.strictEqual(disk.nodes.filter(n => n.h).length, 9);
    assert.ok(Number.isFinite(disk.analysis.t0), 'время начала подготовки записано');
  });

  // Сторона в дебатах
  await newTree();
  await type('ЭП запретит рекламу фастфуда');
  await tapIn('.lt-strip-analyze', undefined, 'Разбор');
  await step('Вид разбора выбран по тексту: дебаты', async () => {
    const s = await wiz();
    assert.strictEqual(s.stage, 'type');
    assert.strictEqual(s.on, 'policy');
    assert.strictEqual(await ev(`ltFind('.lt-wiz-kind.is-on').dataset.kind`), 'debate');
  });
  await wizNext();
  await step('После типа резолюции спрашивается сторона', async () => {
    const s = await wiz();
    assert.strictEqual(s.stage, 'side');
    assert.strictEqual(s.types, 5);
    assert.strictEqual(s.on, 'none');
    assert.strictEqual(s.backOff, false);
    assert.strictEqual(await ev(`getComputedStyle(ltFind('.lt-wiz-kinds')).display`), 'none');
    assert.ok(await choicesFit(), 'кнопки сторон помещаются');
    await shot('19-wizard-side');
  });
  await tapIn('.lt-wiz-close', undefined, 'закрыть разбор');
  await step('Закрытый на полпути разбор не теряет резолюцию', async () => {
    const s = await state();
    assert.strictEqual(s.mode, null);
    assert.deepStrictEqual(s.nodes, ['ЭП запретит рекламу фастфуда']);
    assert.strictEqual(s.sel, 'ЭП запретит рекламу фастфуда');
  });
  await menu('Разбор');
  await wizNext();
  await tapIn('.lt-wiz-type[data-type="oo"]', undefined, 'позиция ОО');
  await step('За Оппозицию её раздел жёлтый, а Правительство синее', async () => {
    assert.strictEqual(await hasClass('Оппозиция', 'lt-opp'), false);
    assert.ok(await hasClass('Правительство', 'lt-opp'));
    const w = await wiz();
    assert.strictEqual(w.stage, 'steps');
    assert.strictEqual(w.count, 'Шаг 1 из 10');
    assert.strictEqual(await sideChip(), 'ОО');
    assert.ok(await ev(`(() => { const h = ltFind('.lt-wiz-head'); return h.scrollWidth <= h.clientWidth + 1; })()`), 'шапка разбора помещается');
  });
  for (let i = 0; i < 12 && !(await wiz()).prompt.startsWith('Что скажет Правительство'); i++) await wizNext();
  await type('Дети меньше болеют');
  await key('Enter');
  await wizNext();
  await step('Линия Оппозиции идёт отдельным шагом', async () => {
    assert.ok((await wiz()).prompt.startsWith('Твоя линия'), (await wiz()).prompt);
  });
  await type('Оставить как есть');
  await wizNext();
  await step('Линия записана под Оппозицией своим вопросом и своим цветом', async () => {
    const b = await blockData('Оставить как есть');
    assert.deepStrictEqual(b.parents, ['Оппозиция']);
    assert.strictEqual(b.q, 'Что защищает?');
    assert.strictEqual(b.side, '');
    assert.ok((await wiz()).prompt.startsWith('Твои аргументы'));
  });
  await type('Запрет не работает');
  await wizNext();
  await step('За ОО звенья FRIC идут по своему аргументу, а не по аргументу Правительства', async () => {
    assert.strictEqual((await wiz()).prompt, '«Запрет не работает»: почему это правда?');
    assert.strictEqual(await ev(`!!ltBlock('Дети меньше болеют').querySelector('.lt-ric')`), false);
    assert.ok(await ev(`!!ltBlock('Запрет не работает').querySelector('.lt-ric')`));
  });
  for (let i = 0; i < 4; i++) await wizNext();
  await step('На аргумент соперника есть шаг ответа', async () => {
    const w = await wiz();
    assert.strictEqual(w.prompt, 'Ответ на «Дети меньше болеют»');
    assert.strictEqual((await state()).sel, 'Дети меньше болеют');
  });
  await type('Болеют из-за цен, а не рекламы');
  await key('Enter');
  await step('Ответ стоит под аргументом соперника, но своим цветом', async () => {
    const b = await blockData('Болеют из-за цен, а не рекламы');
    assert.deepStrictEqual(b.parents, ['Дети меньше болеют']);
    assert.strictEqual(b.q, 'Чем ответить?');
    assert.strictEqual(b.side, '');
    assert.ok(await hasClass('Дети меньше болеют', 'lt-opp'));
    assert.strictEqual(await hasClass('Болеют из-за цен, а не рекламы', 'lt-opp'), false);
    assert.strictEqual(await ev(`ltFind('.lt-wiz-input').placeholder`), 'Добавлено: 1. Ещё один?');
    await shot('20-wizard-reply');
  });
  await tapIn('.lt-wiz-side', undefined, 'сменить сторону');
  await step('Сторону можно сменить из шапки разбора', async () => {
    const s = await wiz();
    assert.strictEqual(s.stage, 'side');
    assert.strictEqual(s.on, 'oo');
  });
  await tapIn('.lt-wiz-type[data-type="og"]', undefined, 'позиция ОП');
  await step('Смена стороны меняет цвета местами', async () => {
    assert.ok(await hasClass('Оппозиция', 'lt-opp'));
    assert.strictEqual(await hasClass('Правительство', 'lt-opp'), false);
    assert.strictEqual(await hasClass('Дети меньше болеют', 'lt-opp'), false);
    assert.ok(await hasClass('Болеют из-за цен, а не рекламы', 'lt-opp'));
    assert.ok(await hasClass('Запрет не работает', 'lt-opp'));
    const w = await wiz();
    assert.strictEqual(w.stage, 'steps');
    assert.ok(w.prompt.startsWith('Твои аргументы: почему да'), w.prompt);
    assert.strictEqual(await sideChip(), 'ОП');
  });
  await tapIn('.lt-wiz-undo', undefined, 'отменить');
  await step('Отмена возвращает прежнюю сторону', async () => {
    assert.ok(await hasClass('Правительство', 'lt-opp'));
    assert.strictEqual(await hasClass('Болеют из-за цен, а не рекламы', 'lt-opp'), false);
    assert.strictEqual(await sideChip(), 'ОО');
  });
  await tapIn('.lt-wiz-close', undefined, 'закрыть разбор');
  await fitAll();
  await tapBlock('Дети меньше болеют');
  await step('У блока соперника есть кнопка «Ответить», и панель помещается', async () => {
    const d = await ev(`(() => { const r = ltFind('.lt-dock').getBoundingClientRect(); const bs = [...ltRoot().querySelectorAll('.lt-dock button')]; return { labels: bs.map(b => b.textContent || b.getAttribute('aria-label')), fits: bs.every(b => { const x = b.getBoundingClientRect(); return x.left >= r.left - 1 && x.right <= r.right + 1 && x.height >= 40; }) }; })()`);
    assert.ok(d.labels.includes('Ответить'), d.labels.join());
    assert.strictEqual(d.labels.includes('Связать'), false);
    assert.ok(d.fits, 'кнопки панели помещаются');
    await shot('21-dock-reply');
  });
  await dock('Ответить');
  await step('«Ответить» начинает блок под аргументом соперника своим цветом', async () => {
    const e = await ev(`(() => { const { edit } = ltView(); return edit && { kind: edit.kind, q: edit.q, side: edit.side }; })()`);
    assert.deepStrictEqual(e, { kind: 'draft', q: 'Чем ответить?', side: '' });
  });
  await type('Это не доказано');
  await key('Enter');
  await key('Escape');
  await step('Ответ записан, а подбор вопросов на нём не учится', async () => {
    const b = await blockData('Это не доказано');
    assert.deepStrictEqual(b.parents, ['Дети меньше болеют']);
    assert.strictEqual(b.q, 'Чем ответить?');
    assert.strictEqual(b.side, '');
    assert.strictEqual(await ev(`JSON.stringify(ltView().plugin.data.stats).includes('Чем ответить?')`), false);
  });
  await fitAll();
  await tapBlock('Запрет не работает');
  await step('У своего блока в панели остаётся «Связать», ответ есть в меню', async () => {
    const labels = await ev(`[...ltRoot().querySelectorAll('.lt-dock button')].map(b => b.textContent || b.getAttribute('aria-label'))`);
    assert.ok(labels.includes('Связать') && !labels.includes('Ответить'), labels.join());
  });
  await menu('Ответить на блок');
  await step('Ответ на свой блок получает цвет соперника', async () => {
    assert.strictEqual(await ev(`ltView().edit.side`), 'o');
  });
  await key('Escape');

  // Второй стол и план речи
  await newTree();
  await type('ЭП запретит домашние задания');
  await tapIn('.lt-strip-analyze', undefined, 'Разбор');
  await wizNext();
  await tapIn('.lt-wiz-type[data-type="co"]', undefined, 'позиция ЗО');
  await step('У ЗО есть раздел «Расширение» сразу после Оппозиции, своим цветом', async () => {
    const kids = await childrenText('ЭП запретит домашние задания');
    assert.strictEqual(kids[kids.indexOf('Оппозиция') + 1], 'Расширение');
    assert.strictEqual(await sideChip(), 'ЗО');
    assert.strictEqual(await hasClass('Расширение', 'lt-opp'), false);
    assert.ok(await hasClass('Правительство', 'lt-opp'));
  });
  for (let i = 0; i < 20 && !(await wiz()).prompt.startsWith('Что скажет первый стол'); i++) await wizNext();
  await type('Дети отдыхают');
  await key('Enter');
  await wizNext();
  await step('После первого стола идёт расширение с подсказкой, где искать новое', async () => {
    const w = await wiz();
    assert.strictEqual(w.prompt, 'Расширение: что нового скажешь ты?');
    assert.ok(w.hint.includes('другой участник'), w.hint);
    assert.strictEqual(await ev(`!!ltBlock('Дети отдыхают').querySelector('.lt-ric')`), false, 'первый стол без звеньев FRIC');
  });
  await type('Учителя тратят вечера на проверку');
  await key('Enter');
  await wizNext();
  await step('Расширение разбирается по FRIC', async () => {
    assert.strictEqual((await wiz()).prompt, '«Учителя тратят вечера на проверку»: почему это правда?');
  });
  await type('Проверка тетрадей без оплаты');
  await wizNext();
  await wizNext();
  await type('Учителя выгорают и уходят');
  await wizNext();
  await tapIn('.lt-wiz-chip', 'Критичность', 'критерий «Критичность»');
  await type('учителей и так не хватает');
  await wizNext();
  await tapIn('.lt-wiz-close', undefined, 'закрыть разбор');
  const treePath = await ev(`ltView().file.path`);
  const planItem = await paneMenu('План речи');
  await tap(planItem.x, planItem.y);
  await sleep(900);
  await step('План речи открыт рядом с деревом: спикеры, расширение, без новых аргументов у второго', async () => {
    const planPath = treePath.replace(/\.tree$/, ' — план речи.md');
    assert.strictEqual(await ev(`app.workspace.getActiveFile().path`), planPath);
    const text = fs.readFileSync(path.join(VAULT, planPath), 'utf8');
    assert.ok(text.includes('**Позиция:** ЗО, Закрывающая Оппозиция'), text.slice(0, 300));
    const first = text.slice(text.indexOf('## Первый спикер'), text.indexOf('## Второй спикер'));
    assert.ok(first.includes('Дети отдыхают'), 'что скажет первый стол');
    assert.ok(first.includes('### 1. Учителя тратят вечера на проверку'));
    assert.ok(first.includes('- **Почему правда:** Проверка тетрадей без оплаты'));
    assert.ok(first.includes('- **Почему важнее:** Критичность: учителей и так не хватает'));
    const second = text.slice(text.indexOf('## Второй спикер'));
    assert.ok(second.includes('Без новых аргументов'));
    assert.ok(await ev(`!!document.querySelector('.workspace-leaf.mod-active .markdown-preview-view.lt-speech')`), 'режим чтения с крупным шрифтом');
    assert.ok(await ev(`[...document.querySelectorAll('.workspace-leaf.mod-active .lt-speech .metadata-container')].every(m => !m.offsetParent)`), 'служебные свойства спрятаны');
    await shot('23-speech-plan');
  });

  // Жизненные решения
  await newTree();
  await tapIn('.lt-strip-analyze', undefined, 'Разбор');
  await step('На пустой схеме разбор спрашивает текст и даёт выбрать вид', async () => {
    const s = await wiz();
    assert.strictEqual(s.stage, 'motion');
    assert.strictEqual(s.prompt, 'Какая резолюция?');
    assert.notStrictEqual(await ev(`getComputedStyle(ltFind('.lt-wiz-kinds')).display`), 'none');
  });
  await tapIn('.lt-wiz-kind[data-kind="life"]', undefined, 'Жизнь');
  await step('Вкладка «Жизнь» меняет вопрос и не закрывает клавиатуру', async () => {
    const s = await wiz();
    assert.strictEqual(s.prompt, 'Какой вопрос решаешь?');
    assert.ok(s.focused);
    assert.ok(await ev(`(() => { const b = ltFind('.lt-wiz-kind.is-on').getBoundingClientRect(); return b.height >= 40; })()`));
    await shot('22-wizard-life-start');
  });
  await type('Общага или квартира?');
  await key('Enter');
  await step('Вид жизненного решения определён по вопросу', async () => {
    const s = await wiz();
    assert.strictEqual(s.stage, 'type');
    assert.strictEqual(s.on, 'choice');
    assert.strictEqual(s.types, 3);
    assert.ok(await choicesFit(), 'кнопки видов помещаются');
  });
  await wizNext();
  await step('Каркас жизненного решения строится сразу, без выбора стороны', async () => {
    assert.deepStrictEqual((await state()).nodes, ['Общага или квартира?', 'Что важно', 'Варианты', 'Решение']);
    const w = await wiz();
    assert.strictEqual(w.stage, 'steps');
    assert.strictEqual(w.count, 'Шаг 1 из 3 · Выбор из вариантов');
    assert.strictEqual(w.timer, '', 'в жизненном решении таймера нет');
    assert.strictEqual(await ev(`getComputedStyle(ltFind('.lt-wiz-side')).display`), 'none');
  });
  await type('Деньги');
  await key('Enter');
  await wizNext();
  await type('Общага');
  await key('Enter');
  await type('Квартира');
  await key('Enter');
  await wizNext();
  await step('У каждого варианта спрашиваются плюсы и минусы', async () => {
    const w = await wiz();
    assert.strictEqual(w.prompt, 'Общага: какие плюсы?');
    assert.strictEqual(w.count, 'Шаг 3 из 7 · Выбор из вариантов');
  });
  await type('Дёшево');
  await wizNext();
  await type('Шумно');
  await key('Enter');
  await step('Плюсы жёлтые, минусы синие', async () => {
    assert.strictEqual(await hasClass('Дёшево', 'lt-opp'), false);
    assert.ok(await hasClass('Шумно', 'lt-opp'));
    assert.strictEqual((await blockData('Шумно')).q, 'Какие минусы?');
    await shot('23-wizard-life');
  });
  await tapIn('.lt-wiz-close', undefined, 'закрыть разбор');
  await newTree();
  await type('Купить ноутбук');
  await tapIn('.lt-strip-analyze', undefined, 'Разбор');
  await step('Последний вид разбора запоминается для неясного текста', async () => {
    const s = await wiz();
    assert.strictEqual(await ev(`ltFind('.lt-wiz-kind.is-on').dataset.kind`), 'life');
    assert.strictEqual(s.on, 'yesno');
  });
  await tapIn('.lt-wiz-kind[data-kind="debate"]', undefined, 'Дебаты');
  await step('Вкладка «Дебаты» показывает типы резолюций', async () => {
    const s = await wiz();
    assert.strictEqual(s.types, 6);
    assert.strictEqual(s.on, 'policy');
  });
  await tapIn('.lt-wiz-close', undefined, 'закрыть разбор');

  // Длинная резолюция и длинные слова
  const LONG = 'ЭП предпочитает жёсткую демократизацию мягкой в отношении государств, неспособных самостоятельно обеспечить безопасность населения';
  await newTree();
  await type(LONG);
  await step('Длинный верхний блок становится широким уже при вводе', async () => {
    assert.strictEqual(await ev(`ltFind('.lt-editor').offsetWidth`), 320);
  });
  await tapIn('.lt-strip-analyze', undefined, 'Разбор');
  await wizNext();
  await wizNext();
  await step('Длинная резолюция стоит широким невысоким блоком', async () => {
    const b = await ev(`(() => { const b = ltBlock(${JSON.stringify(LONG)}); return { w: b.offsetWidth, h: b.offsetHeight, wide: b.classList.contains('lt-wide') }; })()`);
    assert.strictEqual(b.w, 320);
    assert.ok(b.wide);
    assert.ok(b.h < 130, `высота ${b.h}`);
    assert.deepStrictEqual(await brokenWords(LONG), []);
  });
  await step('Слово «Правительство» в заголовке не рвётся', async () => {
    assert.deepStrictEqual(await brokenWords('Правительство'), []);
    assert.ok(await ev(`ltBlock('Правительство').offsetHeight`) <= 46, 'заголовок в одну строку');
  });
  for (let i = 0; i < 12 && !(await wiz()).prompt.includes('столкновение'); i++) await wizNext();
  await type('Справедливость');
  await key('Enter');
  await type('Функционирование государственных институтов');
  await key('Enter');
  await step('Длинные слова пишутся целиком', async () => {
    assert.deepStrictEqual(await brokenWords('Справедливость'), []);
    assert.deepStrictEqual(await brokenWords('Функционирование государственных институтов'), []);
  });
  await tapIn('.lt-wiz-close', undefined, 'закрыть разбор');
  await fitAll();
  await shot('24-wide-root');
  await tapBlock(LONG);
  await tapBlock(LONG);
  await step('При правке широкого блока поле ввода той же ширины', async () => {
    assert.strictEqual(await ev(`ltFind('.lt-editor').offsetWidth`), 320);
  });
  await key('Escape');
  const widePdf = (await ev(`ltView().file.path`)).replace(/\.tree$/, '.pdf');
  await fitAll();
  await tapBlock('Справедливость');
  await menu('Экспорт в PDF');
  await sleep(3500);
  await step('В PDF резолюция тоже широкая, а слова целые', async () => {
    const info = await checkPdf('wide', widePdf);
    assert.ok(info.pdf.h < 420, `страница невысокая: ${info.pdf.h}`);
  });

  await ev(`app.workspace.getLeaf(true).openFile(app.vault.getAbstractFileByPath(${JSON.stringify(file)}))`);
  await sleep(1000);
  await ev(`document.body.classList.replace('theme-light', 'theme-dark')`);
  await fitAll();
  await tapBlock('Отдых лучше там');
  await sleep(400);
  await shot('12-mobile-dark');

  const pdfFile = file.replace(/\.tree$/, '.pdf');
  await menu('Экспорт в PDF');
  await sleep(3500);
  await step('Телефон: PDF со всем деревом, на белом фоне даже в тёмной теме', async () => {
    const info = await checkPdf('mobile', pdfFile);
    assert.ok(info.blue > 5, `синие блоки оппонента нарисованы: ${info.blue}`);
    assert.ok(info.img[0] * info.img[1] <= 8e6 + 1e5, `картинка умещается в память телефона: ${info.img}`);
    assert.strictEqual(await ev(`app.workspace.activeLeaf.view.getViewType()`), 'pdf');
    await shot('17-mobile-pdf');
  });
  await ev(`app.workspace.getLeaf(true).openFile(app.vault.getAbstractFileByPath(${JSON.stringify(file)}))`);
  await sleep(1000);
  const sizeBefore = fs.statSync(path.join(VAULT, pdfFile)).mtimeMs;
  await step('Экспорт есть в меню с тремя точками', async () => {
    const c = await paneMenu('Экспорт в PDF');
    await shot('18-mobile-pane-menu');
    await tap(c.x, c.y);
    await sleep(3500);
  });
  await step('Повторный экспорт заменяет прежний файл', async () => {
    assert.ok(fs.statSync(path.join(VAULT, pdfFile)).mtimeMs > sizeBefore);
    await checkPdf('mobile-again', pdfFile);
    assert.strictEqual(fs.readdirSync(VAULT).filter(f => f.endsWith('.pdf')).length, 3);
  });

  // ---------- 2.5: тренажёр (телефон) ----------
  const OWN_MOTION = 'ЭП обязала бы врачей учить пациентов первой помощи';
  const CAR_MOTION = 'ЭП запретила бы автомобили в центре крупных городов';
  fs.writeFileSync(path.join(VAULT, 'Резолюции.md'), `# Мои резолюции\n- ${OWN_MOTION}\n`);
  await sleep(800);
  // Все встроенные резолюции уже были недавно: свежей остаётся только своя.
  await ev(`(() => { const p = app.plugins.plugins['logic-tree']; p.data.recentMotions = p.constructor.TRAIN_MOTIONS.slice(); p.data.training = null; })()`);
  const tr = () => ev(`(() => {
    const v = ltView();
    const root = ltRoot();
    const q = s => [...root.querySelectorAll(s)];
    const text = s => { const e = root.querySelector(s); return e ? e.textContent : null; };
    return {
      type: v.getViewType(),
      stage: root.dataset.stage,
      clock: text('.lt-tr-clock'),
      clockLate: !!root.querySelector('.lt-tr-clock.is-late'),
      pace: (() => { const p = root.querySelector('.lt-tr-pace'); return p && p.style.display !== 'none' ? p.textContent : ''; })(),
      tabs: q('.lt-tr-tab').map(b => b.querySelector('.lt-tr-tabname').textContent),
      tabOn: text('.lt-tr-tab.is-on .lt-tr-tabname'),
      tabDue: text('.lt-tr-tab.is-due .lt-tr-tabname'),
      fields: q('textarea.lt-tr-field').map(a => a.dataset.key || 'motion'),
      values: Object.fromEntries(q('textarea.lt-tr-field').map(a => [a.dataset.key || 'motion', a.value])),
      pos: q('.lt-tr-posbtn.is-on').map(b => b.dataset.pos),
      marks: q('.lt-tr-mark').map(m => m.textContent),
      chips: q('.lt-tr-chip').map(c => c.textContent),
      now: text('.lt-tr-now'),
      nowPart: text('.lt-tr-saypart.is-now .lt-tr-parttitle'),
      thesis: q('.lt-tr-thesis').map(e => e.textContent),
      missing: q('.lt-tr-missing li').map(e => e.textContent),
      late: q('.lt-tr-statvalue.is-late').length,
      wide: root.scrollWidth > root.clientWidth + 1 || q('.lt-tr-scroll').some(s => s.scrollWidth > s.clientWidth + 1),
      small: q('button').filter(b => b.offsetParent && b.getBoundingClientRect().height < 34).map(b => b.textContent),
    };
  })()`);
  const trTap = async (sel, text) => {
    const c = await ev(`(() => { const e = [...ltRoot().querySelectorAll(${JSON.stringify(sel)})].find(x => ${JSON.stringify(text)} === null || x.textContent === ${JSON.stringify(text)} || x.dataset.key === ${JSON.stringify(text)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const c = ltCenter(e); const top = document.elementFromPoint(c.x, c.y); c.free = !!top && (top === e || e.contains(top) || top.contains(e) && top.tagName === 'LABEL'); return c; })()`);
    assert.ok(c, `нет в тренажёре: ${sel} ${text}`);
    assert.ok(c.free, `кнопку закрывает что-то другое: ${sel} ${text}`);
    await tap(c.x, c.y);
  };
  const trData = () => ev(`JSON.parse(JSON.stringify(app.plugins.plugins['logic-tree'].data.training))`);
  const trNote = async () => {
    const t = await trData();
    return t && t.path && fs.existsSync(path.join(VAULT, t.path)) ? fs.readFileSync(path.join(VAULT, t.path), 'utf8') : '';
  };

  await step('Тренировка открывается значком таймера', async () => {
    // На телефоне значки левой панели собраны в меню действий Obsidian: здесь нажимается сам значок.
    const found = await ev(`(() => {
      const item = (app.workspace.leftRibbon.items || []).find(i => i.title === 'Тренировка дебатов');
      if (!item) return false;
      item.callback();
      return true;
    })()`);
    assert.ok(found, 'есть значок таймера «Тренировка дебатов»');
    await sleep(900);
    await ev(PAGE_HELPERS);
    const s = await tr();
    assert.strictEqual(s.type, 'logic-tree-trainer');
    assert.strictEqual(s.stage, 'start');
  });
  await step('Старт: своя резолюция из заметки «Резолюции», случайная позиция', async () => {
    const s = await tr();
    assert.strictEqual(s.values.motion, OWN_MOTION);
    assert.strictEqual(s.pos.length, 1);
    assert.ok(!s.wide, 'нет прокрутки вбок');
    assert.deepStrictEqual(s.small, []);
    await shot('30-trainer-start');
  });
  await step('«Другая резолюция» меняет текст, позицию можно выбрать', async () => {
    await trTap('.lt-tr-again', null);
    assert.notStrictEqual((await tr()).values.motion, OWN_MOTION);
    await trTap('.lt-tr-posbtn', 'ЗОЗакрывающая Оппозиция');
    assert.deepStrictEqual((await tr()).pos, ['co']);
  });
  await trTap('textarea.lt-tr-motion', null);
  await ev(`(() => { const a = ltRoot().querySelector('textarea.lt-tr-motion'); a.select(); })()`);
  await type(CAR_MOTION);
  await trTap('.lt-tr-go', null);
  await sleep(1500);
  await step('Подготовка: таймер 15 минут, три вкладки, заметка создана', async () => {
    const s = await tr();
    assert.strictEqual(s.stage, 'prep');
    assert.ok(['15:00', '14:59', '14:58'].includes(s.clock), s.clock);
    assert.deepStrictEqual(s.tabs, ['О чём спор', 'Все идеи', 'Лист речи']);
    assert.strictEqual(s.tabOn, 'О чём спор');
    assert.deepStrictEqual(s.fields, ['words', 'prove', 'win', 'lose']);
    assert.strictEqual(s.pace, '');
    const t = await trData();
    assert.strictEqual(t.motion, CAR_MOTION);
    assert.strictEqual(t.pos, 'co');
    assert.match(t.path, /^Тренировки\/Тренировка \d{4}-\d\d-\d\d \d\d-\d\d\.md$/);
    assert.match(await trNote(), /\*\*Позиция:\*\* ЗО, Закрывающая Оппозиция/);
    assert.ok(!s.wide);
    assert.deepStrictEqual(s.small, []);
  });
  await trTap('textarea.lt-tr-field', 'words');
  await type('центр — внутри кольца');
  await sleep(700);
  await step('Текст поля сразу запоминается', async () => {
    assert.strictEqual((await trData()).f.words, 'центр — внутри кольца');
  });
  await ev(`(() => { const v = ltView(); v.t.t0 -= 4 * 60000; v.tick(); })()`);
  await step('Отстаёшь от времени: подсказка «пора к идеям» и метка на вкладке', async () => {
    const s = await tr();
    assert.match(s.pace, /идеи/);
    assert.ok(s.clockLate);
    assert.strictEqual(s.tabDue, 'Все идеи');
    await shot('31-trainer-late');
  });
  await trTap('.lt-tr-pace', null);
  await step('Нажатие на подсказку открывает нужную вкладку', async () => {
    const s = await tr();
    assert.strictEqual(s.tabOn, 'Все идеи');
    assert.deepStrictEqual(s.fields, ['ours', 'theirs']);
    assert.strictEqual(s.pace, '');
  });
  await trTap('textarea.lt-tr-field', 'ours');
  await type('воздух\nпробки\nбедные районы');
  await trTap('.lt-tr-next', null);
  await step('Лист речи: отметки времени как на бумаге, у ЗО расширение', async () => {
    const s = await tr();
    assert.strictEqual(s.tabOn, 'Лист речи');
    assert.deepStrictEqual(s.marks, ['0:00', '0:30', '1:30', '4:00', '6:30']);
    assert.ok(await ev(`ltRoot().querySelector('[data-part="a1"] .lt-tr-hint').textContent.includes('Расширение')`));
    assert.deepStrictEqual(s.chips.slice(0, 3), ['воздух', 'пробки', 'бедные районы']);
    assert.ok(s.chips.includes('Масштаб'));
    assert.ok(!s.wide);
    assert.deepStrictEqual(s.small, []);
  });
  await trTap('[data-for="a1.thesis"] .lt-tr-chip', 'бедные районы');
  await type(' теряют доступ к работе');
  await trTap('[data-for="a1.weigh"] .lt-tr-chip', 'Масштаб');
  await type('тысячи семей');
  await trTap('textarea.lt-tr-field', 'a1.why');
  await type('дальние районы → нет метро → машина');
  await trTap('textarea.lt-tr-field', 'intro');
  await type('Город для людей, а не для машин.');
  await sleep(300);
  await step('Идея становится тезисом, критерий подставляется в «Почему важнее»', async () => {
    const f = (await trData()).f;
    assert.strictEqual(f['a1.thesis'], 'бедные районы теряют доступ к работе');
    assert.strictEqual(f['a1.weigh'], 'Масштаб: тысячи семей');
    await ev(`ltRoot().querySelector('[data-part="a1"]').scrollIntoView()`);
    await shot('32-trainer-sheet');
  });
  await step('Тренировка переживает закрытие вкладки', async () => {
    await ev(`ltView().leaf.detach()`);
    await sleep(600);
    assert.match(await trNote(), /### 1:30 Аргумент 1: бедные районы теряют доступ к работе/);
    await ev(`app.commands.executeCommandById('logic-tree:trainer')`);
    await sleep(900);
    await ev(PAGE_HELPERS);
    const s = await tr();
    assert.strictEqual(s.stage, 'prep');
    assert.strictEqual(s.tabOn, 'Все идеи', 'открывается вкладка по времени');
    assert.strictEqual(s.values.ours, 'воздух\nпробки\nбедные районы');
  });
  await ev(`(() => { const v = ltView(); v.goTab(2); })()`);
  await trTap('.lt-tr-next', null);
  await step('Речь: лист крупно, таймер 7 минут ждёт кнопку', async () => {
    const s = await tr();
    assert.strictEqual(s.stage, 'speak');
    assert.strictEqual(s.clock, '7:00');
    assert.deepStrictEqual(s.thesis, ['бедные районы теряют доступ к работе', 'Тезис не записан']);
    assert.ok((await trData()).p1 > 0);
    assert.ok(!s.wide);
  });
  await trTap('.lt-tr-start', null);
  await ev(`(() => { const v = ltView(); v.t.s0 -= 95000; v.tick(); })()`);
  await sleep(700);
  await step('Через 1:35 подсвечен аргумент 1', async () => {
    const s = await tr();
    assert.match(s.clock, /^1:3[5-8]$/);
    assert.strictEqual(s.nowPart, 'Аргумент 1');
    assert.strictEqual(s.now, 'Сейчас: Аргумент 1');
    await shot('33-trainer-speak');
  });
  await ev(`(() => { const v = ltView(); v.t.s0 -= 340000; v.tick(); })()`);
  await step('После 7 минут: время вышло', async () => {
    const s = await tr();
    assert.match(s.now, /Время вышло/);
    assert.ok(s.clockLate);
    assert.strictEqual(s.nowPart, 'Вывод');
  });
  await trTap('.lt-tr-stop', null);
  await sleep(1500);
  await step('Итог: время и что осталось пустым', async () => {
    const s = await tr();
    assert.strictEqual(s.stage, 'done');
    assert.strictEqual(s.late, 1, 'речь дольше 7 минут');
    assert.ok(s.missing.includes('Аргумент 2: тезис'));
    assert.ok(s.missing.includes('Вывод'));
    assert.ok(!s.missing.includes('Вступление'));
    await shot('34-trainer-done');
    const note = await trNote();
    assert.match(note, /\*\*Время:\*\* подготовка \d+:\d\d из 15:00, речь 7:1\d из 7:00/);
    assert.match(note, /- \*\*Почему важнее:\*\* Масштаб: тысячи семей/);
    assert.match(note, /\*\*За нашу сторону\*\*\n- воздух\n- пробки\n- бедные районы/);
  });
  await trTap('.lt-tr-open', null);
  await sleep(1200);
  await step('Заметка тренировки открывается в режиме чтения', async () => {
    const v = await ev(`(() => { const v = app.workspace.activeLeaf.view; return { type: v.getViewType(), mode: v.getMode && v.getMode(), cls: !!document.querySelector('.workspace-leaf.mod-active .markdown-preview-view.lt-speech') }; })()`);
    assert.deepStrictEqual(v, { type: 'markdown', mode: 'preview', cls: true });
    await shot('35-trainer-note');
  });
  await ev(`app.commands.executeCommandById('logic-tree:trainer')`);
  await sleep(700);
  await ev(PAGE_HELPERS);
  await trTap('.lt-tr-new', null);
  await sleep(600);
  await step('«Новая тренировка» начинает заново, старая заметка остаётся', async () => {
    const s = await tr();
    assert.strictEqual(s.stage, 'start');
    assert.strictEqual(await trData(), null);
    assert.strictEqual(fs.readdirSync(path.join(VAULT, 'Тренировки')).length, 1);
  });

  // ---------- 3.0: английский интерфейс ----------
  // Весь текст плагина на экране: видимые надписи, подсказки в полях и подписи для экранного доступа.
  const cyrillicOnScreen = () => ev(`(() => {
    const root = ltRoot();
    const bad = [];
    const add = (s, where) => { if (s && /[А-Яа-яЁё]/.test(s)) bad.push(where + ': ' + s.slice(0, 90)); };
    [root, ...root.querySelectorAll('*')].forEach(e => {
      if (e !== root && !e.offsetParent && getComputedStyle(e).position !== 'fixed') return;
      for (const n of e.childNodes) if (n.nodeType === 3) add(n.data, e.className || e.tagName);
      ['aria-label', 'title', 'placeholder'].forEach(a => add(e.getAttribute(a), a));
    });
    return bad;
  })()`);
  await ev(`(() => {
    const p = app.plugins.plugins['logic-tree'];
    p.data.language = 'en';
    p.applyLanguage();
    app.workspace.getLeavesOfType('logic-tree-trainer').forEach(l => l.detach());
    document.body.classList.replace('theme-dark', 'theme-light');
  })()`);
  await newTree();
  await ev(PAGE_HELPERS);
  await step('English: new tree is named in English and its UI has no Cyrillic', async () => {
    assert.match(await ev(`ltView().file.basename`), /^Tree \d+$/);
    assert.deepStrictEqual(await cyrillicOnScreen(), []);
  });
  await tapIn('.lt-strip-analyze', undefined, 'Guide');
  await step('English: the guide offers Decision, Topic and Debate in that order', async () => {
    assert.deepStrictEqual(await ev(`[...ltRoot().querySelectorAll('.lt-wiz-kind')].map(b => b.textContent)`), ['Decision', 'Topic', 'Debate']);
  });
  await tapIn('.lt-wiz-kind[data-kind="study"]', undefined, 'Topic');
  await step('English: topic mode asks for a topic', async () => {
    const s = await wiz();
    assert.strictEqual(s.prompt, 'What topic are you studying?');
    assert.deepStrictEqual(await cyrillicOnScreen(), []);
  });
  await type('The Krebs cycle');
  await key('Enter');
  await step('English: a topic gets its skeleton right away, without a type step', async () => {
    const s = await wiz();
    assert.strictEqual(s.stage, 'steps');
    assert.strictEqual(s.prompt, 'What is it?');
    assert.strictEqual(s.count, 'Step 1 of 6 · Study a topic');
    assert.deepStrictEqual((await state()).nodes, ['The Krebs cycle', 'What it is', 'Why it matters', 'How it works', 'Examples', 'Connections', 'Open questions']);
  });
  await type('How cells turn food into energy');
  await key('Enter');
  await wizNext();
  await type('Core of cellular respiration');
  await key('Enter');
  await wizNext();
  await type('Acetyl-CoA enters');
  await key('Enter');
  await type('8 enzyme steps');
  await key('Enter');
  await step('English: topic steps and the wizard stay in English', async () => {
    assert.strictEqual((await wiz()).prompt, 'What is it made of?');
    assert.deepStrictEqual(await cyrillicOnScreen(), []);
    await shot('en-1-topic-guide');
  });
  await tapIn('.lt-wiz-close', undefined, 'Close guide');
  await fitAll('Whole tree');
  await shot('en-2-topic-tree');

  await newTree();
  await tapIn('.lt-strip-analyze', undefined, 'Guide');
  await tapIn('.lt-wiz-kind[data-kind="life"]', undefined, 'Decision');
  await type('Should I switch universities?');
  await key('Enter');
  await step('English: a decision question is recognised as yes or no', async () => {
    const s = await wiz();
    assert.strictEqual(s.stage, 'type');
    assert.strictEqual(s.on, 'yesno');
    assert.deepStrictEqual(await cyrillicOnScreen(), []);
  });
  await wizNext();
  await type('A stronger medical program');
  await key('Enter');
  await wizNext();
  await type('Better teachers');
  await key('Enter');
  await type('Closer to home');
  await key('Enter');
  await wizNext();
  await type('Leaving my friends');
  await key('Enter');
  await type('Extra paperwork');
  await key('Enter');
  await step('English: pros are yellow, cons blue, prompts in English', async () => {
    const s = await wiz();
    assert.strictEqual(s.prompt, 'What will I lose?');
    assert.strictEqual(s.count, 'Step 3 of 5 · Yes or no');
    assert.deepStrictEqual(await cyrillicOnScreen(), []);
  });
  await tapIn('.lt-wiz-close', undefined, 'Close guide');
  await fitAll('Whole tree');
  await shot('en-3-decision-tree');
  await step('English: the decision exports to PDF', async () => {
    const tree = await ev(`ltView().file.path`);
    const pdf = tree.replace(/\.tree$/, '.pdf');
    const c = await paneMenu('Export to PDF');
    await tap(c.x, c.y);
    await sleep(3500);
    await checkPdf('en-decision', pdf);
    // Экспорт открывает PDF: возвращаемся к дереву.
    await ev(`app.workspace.getLeaf(true).openFile(app.vault.getAbstractFileByPath(${JSON.stringify(tree)}))`);
    await sleep(900);
    await ev(PAGE_HELPERS);
  });
  await step('English: help is in English', async () => {
    const c = await paneMenu('How to use');
    await tap(c.x, c.y);
    await sleep(300);
    assert.ok(await ev(`ltFind('.lt-help').textContent.includes('Guide: choose')`));
    assert.deepStrictEqual(await cyrillicOnScreen(), []);
    await tapIn('.lt-help-close', undefined, 'Close help');
  });
  await ev(`app.commands.executeCommandById('logic-tree:trainer')`);
  await sleep(900);
  await ev(PAGE_HELPERS);
  await step('English: debate practice uses English motions and labels', async () => {
    const s = await tr();
    assert.strictEqual(s.stage, 'start');
    assert.match(s.values.motion, /^This House\b/);
    assert.deepStrictEqual(await cyrillicOnScreen(), []);
    await shot('en-4-practice');
  });
  await step('English: settings tab has a language choice', async () => {
    await ev(`(() => { app.setting.open(); app.setting.openTabById('logic-tree'); })()`);
    await sleep(500);
    const text = await ev(`document.querySelector('.modal.mod-settings .vertical-tab-content').innerText`);
    assert.match(text, /Language/);
    assert.match(text, /Same as Obsidian|English/);
    await ev(`app.setting.close()`);
  });

  await step('На странице нет ошибок плагина', async () => {
    const own = pageErrors.filter(e => /logic-tree|LogicTree/.test(e));
    assert.deepStrictEqual(own, []);
  });

  console.log(`\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ\nСнимки: ${SHOTS}`);
})().catch(async e => {
  console.error(`\nНЕ ПРОШЛО: ${e.stack || e}`);
  try { await shot('zz-failure'); } catch (x) { /* окно уже закрыто */ }
  console.error(`Снимки: ${SHOTS}`);
  process.exitCode = 1;
}).finally(() => {
  stop();
  setTimeout(() => process.exit(), 300);
});

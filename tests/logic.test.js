// Запуск: node --test tests/logic.test.js
const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const path = require('path');

const original = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'obsidian') {
    return { Plugin: class {}, PluginSettingTab: class {}, Setting: class {}, TextFileView: class {}, ItemView: class {}, Notice: class {}, Menu: class {}, Platform: {}, normalizePath: p => p, setIcon() {} };
  }
  return original.call(this, request, ...rest);
};
const P = require(path.join(__dirname, '..', 'main.js'));
// Старые проверки написаны для русского интерфейса; английский проверяется отдельно в конце файла.
P.setLanguage('ru');

const NODE_W = P.NODE_W;
const makeDoc = (nodes, edges) => ({
  version: 2,
  nextId: nodes.length + 1,
  nodes: nodes.map(n => (typeof n === 'string' ? { id: n, text: n, q: '' } : n)),
  edges: edges.map(e => e.slice()),
});
const ids = doc => doc.nodes.map(n => n.id);
const node = (doc, id) => doc.nodes.find(n => n.id === id);
const sorted = set => [...set].sort();

// Файлы

test('файл первой версии открывается без потерь', () => {
  const v1 = JSON.stringify({ version: 1, nextId: 3, nodes: [{ id: 'n1', text: 'Тезис', q: '' }, { id: 'n2', text: 'Да', q: 'Что именно?' }], edges: [['n1', 'n2']] });
  const doc = P.parseDoc(v1);
  assert.strictEqual(doc.version, 2);
  assert.deepStrictEqual(doc.nodes, [{ id: 'n1', text: 'Тезис', q: '' }, { id: 'n2', text: 'Да', q: 'Что именно?' }]);
  assert.deepStrictEqual(doc.edges, [['n1', 'n2']]);
  assert.strictEqual(doc.nextId, 3);
});

test('сторона и свёрнутость сохраняются, мусор отбрасывается', () => {
  const doc = P.parseDoc(JSON.stringify({ nodes: [{ id: 'n1', text: 'a', side: 'o', collapsed: true }, { id: 'n2', text: 'b', side: 'zzz', collapsed: 'yes' }], edges: [] }));
  assert.strictEqual(node(doc, 'n1').side, 'o');
  assert.strictEqual(node(doc, 'n1').collapsed, true);
  assert.strictEqual('side' in node(doc, 'n2'), false);
  assert.strictEqual('collapsed' in node(doc, 'n2'), false);
});

test('петли и неизвестные блоки отбрасываются, номера не повторяются', () => {
  const doc = P.parseDoc(JSON.stringify({ nodes: [{ id: 'n1' }, { id: 'n2' }], edges: [['n1', 'n2'], ['n2', 'n1'], ['n1', 'zz']], nextId: 1 }));
  assert.deepStrictEqual(doc.edges, [['n1', 'n2']]);
  assert.strictEqual(doc.nextId, 3);
});

test('пустой файл даёт пустое дерево, битый вызывает ошибку', () => {
  assert.deepStrictEqual(P.parseDoc('').nodes, []);
  assert.throws(() => P.parseDoc('{oops'));
  assert.throws(() => P.parseDoc('{"a":1}'));
});

// Сворачивание

test('свёрнутый блок прячет свою ветку', () => {
  const doc = makeDoc([{ id: 'a', text: 'a', q: '', collapsed: true }, 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  assert.deepStrictEqual(sorted(P.visibleIds(doc)), ['a']);
});

test('блок с открытым вторым родителем остаётся виден', () => {
  const doc = makeDoc(['r', { id: 'a', text: 'a', q: '', collapsed: true }, 'b', 'm'], [['r', 'a'], ['r', 'b'], ['a', 'm'], ['b', 'm']]);
  assert.deepStrictEqual(sorted(P.visibleIds(doc)), ['a', 'b', 'm', 'r']);
});

test('счётчик показывает только реально скрытые блоки', () => {
  const doc = makeDoc([{ id: 'a', text: 'a', q: '', collapsed: true }, 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['a', 'd']]);
  assert.strictEqual(P.hiddenCount(doc, 'a', P.visibleIds(doc)), 3);
});

// Фокус

test('фокус включает путь к блоку и всё под ним, но не соседние ветки', () => {
  const doc = makeDoc(['r', 'a', 'b', 'a1', 'b1'], [['r', 'a'], ['r', 'b'], ['a', 'a1'], ['b', 'b1']]);
  assert.deepStrictEqual(sorted(P.focusIds(doc, ['a'])), ['a', 'a1', 'r']);
});

// Добавление

test('новый блок получает стрелки от родителей', () => {
  const doc = makeDoc(['a', 'b'], []);
  doc.nextId = 7;
  const id = P.addBlock(doc, { parents: ['a', 'b'], text: 'итог', q: 'К чему?' });
  assert.strictEqual(id, 'n7');
  assert.strictEqual(doc.nextId, 8);
  assert.deepStrictEqual(doc.edges, [['a', 'n7'], ['b', 'n7']]);
  assert.deepStrictEqual(node(doc, id), { id: 'n7', text: 'итог', q: 'К чему?' });
});

test('блок «рядом» встаёт сразу за соседом', () => {
  const doc = makeDoc(['r', 'a', 'b'], [['r', 'a'], ['r', 'b']]);
  doc.nextId = 4;
  const id = P.addBlock(doc, { parents: ['r'], text: 'x', q: '', after: 'a' });
  assert.deepStrictEqual(doc.edges, [['r', 'a'], ['r', id], ['r', 'b']]);
});

test('новый тезис рядом с тезисом встаёт сразу за ним', () => {
  const doc = makeDoc(['a', 'b'], []);
  doc.nextId = 3;
  const id = P.addBlock(doc, { parents: [], text: 'x', q: 'лишний', after: 'a' });
  assert.deepStrictEqual(ids(doc), ['a', id, 'b']);
  assert.strictEqual(node(doc, id).q, '', 'у верхнего блока нет вопроса');
});

test('сторона блока записывается только для оппонента', () => {
  const doc = makeDoc(['a'], []);
  const own = P.addBlock(doc, { parents: ['a'], text: 'x', q: '', side: '' });
  const opp = P.addBlock(doc, { parents: ['a'], text: 'y', q: '', side: 'o' });
  assert.strictEqual('side' in node(doc, own), false);
  assert.strictEqual(node(doc, opp).side, 'o');
});

// Удаление

test('удаление блока соединяет родителя с детьми', () => {
  const doc = makeDoc(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  assert.strictEqual(P.removeBlock(doc, 'b'), 'a');
  assert.deepStrictEqual(ids(doc), ['a', 'c']);
  assert.deepStrictEqual(doc.edges, [['a', 'c']]);
});

test('удаление верхнего блока переводит выбор на ребёнка', () => {
  const doc = makeDoc(['a', 'b'], [['a', 'b']]);
  assert.strictEqual(P.removeBlock(doc, 'a'), 'b');
});

test('удаление ветки убирает блок и всё под ним', () => {
  const doc = makeDoc(['r', 'a', 'a1', 'a2'], [['r', 'a'], ['a', 'a1'], ['a1', 'a2']]);
  assert.deepStrictEqual(P.removeBranch(doc, 'a'), { next: 'r', removed: 3 });
  assert.deepStrictEqual(ids(doc), ['r']);
  assert.deepStrictEqual(doc.edges, []);
});

test('удаление ветки не трогает блок, к которому ведёт другая ветка', () => {
  const doc = makeDoc(['r', 'a', 'b', 'm'], [['r', 'a'], ['r', 'b'], ['a', 'm'], ['b', 'm']]);
  assert.deepStrictEqual(P.removeBranch(doc, 'a'), { next: 'r', removed: 1 });
  assert.deepStrictEqual(ids(doc), ['r', 'b', 'm']);
  assert.deepStrictEqual(doc.edges, [['r', 'b'], ['b', 'm']]);
});

// Перенос

test('перенос под другой блок забирает всю ветку', () => {
  const doc = makeDoc(['r', 'a', 'b', 'a1'], [['r', 'a'], ['r', 'b'], ['a', 'a1']]);
  assert.strictEqual(P.moveBlock(doc, 'a', 'b', 'child'), true);
  assert.deepStrictEqual(doc.edges, [['r', 'b'], ['a', 'a1'], ['b', 'a']]);
});

test('перенос рядом ставит блок перед соседом и берёт его вопрос', () => {
  const doc = makeDoc(['r', { id: 'a', text: 'a', q: 'Q1' }, { id: 'b', text: 'b', q: 'Q2' }, { id: 'c', text: 'c', q: 'Q3' }], [['r', 'a'], ['r', 'b'], ['r', 'c']]);
  assert.strictEqual(P.moveBlock(doc, 'c', 'a', 'before'), true);
  assert.deepStrictEqual(doc.edges, [['r', 'c'], ['r', 'a'], ['r', 'b']]);
  assert.strictEqual(node(doc, 'c').q, 'Q1');
});

test('перенос рядом ставит блок после соседа', () => {
  const doc = makeDoc(['r', 'a', 'b', 'c'], [['r', 'a'], ['r', 'b'], ['r', 'c']]);
  assert.strictEqual(P.moveBlock(doc, 'a', 'b', 'after'), true);
  assert.deepStrictEqual(doc.edges, [['r', 'b'], ['r', 'a'], ['r', 'c']]);
});

test('перенос рядом с верхним блоком меняет порядок тезисов', () => {
  const doc = makeDoc(['a', 'b', 'c'], []);
  assert.strictEqual(P.moveBlock(doc, 'c', 'a', 'before'), true);
  assert.deepStrictEqual(ids(doc), ['c', 'a', 'b']);
});

test('нельзя перенести блок в собственную ветку', () => {
  const doc = makeDoc(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
  const before = JSON.stringify(doc);
  assert.strictEqual(P.moveBlock(doc, 'a', 'c', 'child'), false);
  assert.strictEqual(P.moveBlock(doc, 'a', 'c', 'after'), false);
  assert.strictEqual(P.moveBlock(doc, 'a', 'b', 'before'), false);
  assert.strictEqual(P.moveBlock(doc, 'a', 'a', 'child'), false);
  assert.strictEqual(JSON.stringify(doc), before, 'отказ ничего не меняет');
});

test('canMove отвечает так же, как moveBlock', () => {
  const doc = makeDoc(['a', 'b', 'c'], [['a', 'b']]);
  assert.strictEqual(P.canMove(doc, 'a', 'b', 'child'), false);
  assert.strictEqual(P.canMove(doc, 'c', 'b', 'child'), true);
});

// Стороны

test('смена стороны применяется ко всей ветке', () => {
  const doc = makeDoc(['r', 'a', 'a1', 'b'], [['r', 'a'], ['a', 'a1'], ['r', 'b']]);
  P.setSide(doc, 'a', 'o');
  assert.strictEqual(node(doc, 'a').side, 'o');
  assert.strictEqual(node(doc, 'a1').side, 'o');
  assert.strictEqual('side' in node(doc, 'b'), false);
  assert.strictEqual('side' in node(doc, 'r'), false);
  P.setSide(doc, 'a', '');
  assert.strictEqual('side' in node(doc, 'a'), false);
  assert.strictEqual('side' in node(doc, 'a1'), false);
});

// Подбор вопроса

test('под тезисом первым идёт «Что происходит?»', () => {
  assert.strictEqual(P.rankQuestions('', {}, [])[0], 'Что происходит?');
});

test('вопросы идут по цепочке из видео', () => {
  P.CHAIN.slice(0, -1).forEach((q, i) => {
    assert.strictEqual(P.rankQuestions(q, {}, [])[0], P.CHAIN[i + 1]);
  });
});

test('исправление запоминается и выигрывает у цепочки', () => {
  const stats = {};
  P.recordTransition(stats, 'Что происходит?', 'Что именно?');
  assert.strictEqual(P.rankQuestions('Что происходит?', stats, [])[0], 'Что именно?');
});

test('пустой вопрос не запоминается', () => {
  const stats = {};
  P.recordTransition(stats, 'Что происходит?', '');
  assert.deepStrictEqual(stats, {});
});

test('свои вопросы попадают в список', () => {
  assert.ok(P.rankQuestions('', {}, ['Кто платит?']).includes('Кто платит?'));
});

test('каждый вопрос в списке встречается один раз', () => {
  const list = P.rankQuestions('', { '': { 'Да': 2 } }, ['Да', 'Что именно?']);
  assert.strictEqual(new Set(list).size, list.length);
});

// Раскладка

const q = (id, text = '') => ({ id, text: id, q: text });

function checkLayout(name, nodes, edges) {
  const heights = Object.fromEntries(nodes.map(n => [n.id, n.h || 44]));
  const g = P.layout(nodes, edges, heights);
  const rects = nodes.map(n => ({ id: n.id, x: g.pos[n.id].x, y: g.pos[n.id].y, w: NODE_W, h: heights[n.id] }));
  for (const a of rects) {
    assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y), `${name}: координаты`);
    assert.ok(a.x >= 0 && a.x + a.w <= g.width + 0.5, `${name}: ${a.id} вне ширины`);
    assert.ok(a.y >= 0 && a.y + a.h <= g.height + 0.5, `${name}: ${a.id} вне высоты`);
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      assert.ok(!(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h), `${name}: ${a.id} и ${b.id} наезжают`);
    }
  }
  edges.forEach(([a, b]) => assert.ok(g.pos[a].y < g.pos[b].y, `${name}: стрелка ${a}->${b} не вниз`));
  for (const p of g.paths) {
    assert.ok(g.pos[p.from] && g.pos[p.to], `${name}: у линии должны быть блоки`);
    for (let i = 1; i < p.pts.length; i++) {
      const [x1, y1] = p.pts[i - 1];
      const [x2, y2] = p.pts[i];
      assert.ok(x1 === x2 || y1 === y2, `${name}: косая линия`);
      const lx = Math.min(x1, x2);
      const hx = Math.max(x1, x2);
      const ly = Math.min(y1, y2);
      const hy = Math.max(y1, y2);
      for (const r of rects) {
        assert.ok(!(lx < r.x + r.w - 0.5 && hx > r.x + 0.5 && ly < r.y + r.h - 0.5 && hy > r.y + 0.5), `${name}: линия сквозь ${r.id}`);
      }
    }
  }
  assert.strictEqual(g.arrows.length, new Set(edges.map(e => e[1])).size, `${name}: наконечники`);
  return g;
}

test('схема с первого скрина: цепочка прямая, вопрос один на всю развилку', () => {
  const nodes = [q('a'), q('b', 'Что происходит?'), q('d', 'Почему?'), q('e', 'Что это значит?'), q('f', 'Что это значит?'), q('g', 'Что это значит?'), q('h', 'К чему?')];
  const edges = [['a', 'b'], ['b', 'd'], ['d', 'e'], ['d', 'f'], ['d', 'g'], ['e', 'h'], ['f', 'h'], ['g', 'h']];
  const g = checkLayout('скрин 1', nodes, edges);
  const fan = g.labels.filter(l => l.text === 'Что это значит?');
  assert.strictEqual(fan.length, 1);
  assert.deepStrictEqual(fan[0].ids.slice().sort(), ['e', 'f', 'g']);
  assert.deepStrictEqual(g.labels.find(l => l.text === 'К чему?').ids, ['h']);
  assert.strictEqual(g.pos.a.x, g.pos.d.x);
  assert.strictEqual(g.pos.f.x, g.pos.d.x);
  assert.strictEqual(g.pos.h.x, g.pos.d.x);
});

test('длинная стрелка размечена настоящими концами', () => {
  const nodes = [q('a'), q('b'), q('c'), q('d')];
  const edges = [['a', 'b'], ['b', 'c'], ['a', 'c'], ['c', 'd']];
  const g = checkLayout('длинная', nodes, edges);
  const long = g.paths.filter(p => p.from === 'a' && p.to === 'c');
  assert.ok(long.length >= 2, 'длинная стрелка состоит из нескольких участков');
});

test('случайные схемы без наездов и косых линий', () => {
  let seed = 54321;
  const rnd = m => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % m; };
  for (let t = 0; t < 300; t++) {
    const size = 1 + rnd(28);
    const nodes = Array.from({ length: size }, (_, i) => ({ id: `n${i}`, text: 'x', q: rnd(3) ? `q${rnd(3)}` : '', h: 44 + rnd(4) * 16 }));
    const edges = [];
    for (let i = 1; i < size; i++) {
      if (rnd(12) === 0) continue;
      const parents = new Set();
      for (let k = 0, n = 1 + rnd(3) * rnd(2); k < n; k++) parents.add(rnd(i));
      parents.forEach(p => edges.push([`n${p}`, `n${i}`]));
    }
    checkLayout(`случайная ${t}`, nodes, edges);
  }
});

test('пустая схема', () => {
  const g = P.layout([], [], {});
  assert.strictEqual(g.width, 0);
  assert.deepStrictEqual(g.paths, []);
});

test('у подписей отдельных веток есть пометка, чтобы сделать их уже', () => {
  const g = P.layout([q('r'), q('a', 'Один?'), q('b', 'Другой?')], [['r', 'a'], ['r', 'b']], {});
  assert.deepStrictEqual(g.labels.map(l => l.place), ['child', 'child']);
});

// Выбор вопроса

test('в списке выбора текущий вопрос стоит первым и не повторяется', () => {
  const list = P.questionChoices('Что именно?', '', {}, ['Кто платит?']);
  assert.strictEqual(list[0], 'Что именно?');
  assert.strictEqual(new Set(list).size, list.length);
  assert.ok(list.includes('Кто платит?'));
  assert.strictEqual(P.questionChoices('', '', {}, [])[0], 'Что происходит?');
});

// Разбор резолюции

test('тип резолюции определяется по началу фразы', () => {
  const cases = {
    'ЭП ограничит количество туристов в туристических городах': 'policy',
    'ЭП запретит рекламу фастфуда': 'policy',
    'Эта палата введёт налог на роскошь': 'policy',
    'ЭП сожалеет о романтизации материнства': 'regret',
    'эп поддерживает романтизацию материнства': 'support',
    'ЭП выступает против школьной формы': 'support',
    'ЭП считает, что соцсети вредят демократии': 'value',
    'ЭП верит, что цель оправдывает средства': 'value',
    'ЭП предпочитает мир без соцсетей': 'prefer',
    'ЭП, будучи родителем, отдала бы ребёнка в частную школу': 'actor',
    'ЭП как феминистское движение отвергнет бренды': 'actor',
    'Туризм': 'policy',
  };
  Object.entries(cases).forEach(([text, type]) => assert.strictEqual(P.detectMotion(text), type, text));
});

test('у каждого типа есть название, пример начала и свои разделы', () => {
  assert.deepStrictEqual(Object.keys(P.MOTION_TYPES).sort(), ['actor', 'policy', 'prefer', 'regret', 'support', 'value']);
  Object.values(P.MOTION_TYPES).forEach(t => {
    assert.ok(t.name && t.lead);
    assert.ok(t.sections.length >= 1 && t.sections.length <= 2);
    t.sections.forEach(s => assert.ok(s.key && s.title && s.q && s.hint));
  });
});

const motionDoc = (type, me) => {
  const doc = makeDoc([], []);
  const root = P.addBlock(doc, { parents: [], text: 'ЭП сожалеет о романтизации материнства', q: '' });
  P.buildSkeleton(doc, root, type, me);
  return { doc, root };
};
const titles = (doc, id) => doc.edges.filter(e => e[0] === id).map(e => node(doc, e[1]).text);

test('каркас сожаления: общие разделы, два своих, стороны и столкновение', () => {
  const { doc, root } = motionDoc('regret');
  assert.deepStrictEqual(titles(doc, root), ['Определения', 'Бремя', 'Фрейм', 'Участники', 'Сейчас', 'Мир без этого', 'Правительство', 'Оппозиция', 'Столкновение']);
  const opp = node(doc, doc.analysis.sections.opp);
  assert.strictEqual(opp.side, 'o');
  assert.strictEqual(opp.h, true);
  assert.strictEqual(opp.q, 'Почему нет?');
  assert.strictEqual('side' in node(doc, doc.analysis.sections.gov), false);
  assert.strictEqual(doc.analysis.type, 'regret');
  assert.strictEqual(doc.analysis.root, root);
  assert.strictEqual(doc.analysis.step, 'defs');
});

test('каркас действия содержит механизм, а проблему разбирает фрейм', () => {
  const { doc, root } = motionDoc('policy');
  assert.deepStrictEqual(titles(doc, root).slice(3, 5), ['Участники', 'Механизм']);
  assert.strictEqual(titles(doc, root).includes('Проблема'), false);
});

test('шаги разбора идут по разделам каркаса', () => {
  const { doc } = motionDoc('regret');
  const steps = P.analysisSteps(doc);
  assert.deepStrictEqual(steps.map(s => s.key), ['defs', 'burden', 'frame', 'frame:who', 'actors', 'now', 'without', 'gov', 'stance', 'opp', 'clash']);
  steps.forEach(s => assert.ok(s.prompt && s.hint && node(doc, s.parent)));
  assert.strictEqual(steps.find(s => s.key === 'opp').side, 'o');
});

test('для каждого участника появляются шаги «что получает» и «что теряет»', () => {
  const { doc } = motionDoc('regret');
  const actors = doc.analysis.sections.actors;
  const mothers = P.addBlock(doc, { parents: [actors], text: 'Матери', q: '' });
  const kids = P.addBlock(doc, { parents: [actors], text: 'Дети', q: '' });
  const steps = P.analysisSteps(doc);
  assert.deepStrictEqual(steps.map(s => s.key).slice(4, 9), ['actors', `gain:${mothers}`, `lose:${mothers}`, `gain:${kids}`, `lose:${kids}`]);
  const gain = steps.find(s => s.key === `gain:${mothers}`);
  assert.strictEqual(gain.parent, mothers);
  assert.strictEqual(gain.q, 'Что получает?');
  assert.ok(gain.prompt.includes('Матери'));
  assert.strictEqual(steps.find(s => s.key === `lose:${kids}`).q, 'Что теряет?');
});

test('ответы шага считаются по его вопросу', () => {
  const { doc } = motionDoc('regret');
  const mothers = P.addBlock(doc, { parents: [doc.analysis.sections.actors], text: 'Матери', q: '' });
  const plus = P.addBlock(doc, { parents: [mothers], text: 'Признание', q: 'Что получает?' });
  P.addBlock(doc, { parents: [mothers], text: 'Свободу', q: 'Что теряет?' });
  const steps = P.analysisSteps(doc);
  assert.deepStrictEqual(P.stepAnswers(doc, steps.find(s => s.key === `gain:${mothers}`)), [plus]);
  assert.deepStrictEqual(P.stepAnswers(doc, steps.find(s => s.key === 'actors')), [mothers]);
});

test('удалённый раздел пропадает из шагов', () => {
  const { doc } = motionDoc('regret');
  P.removeBlock(doc, doc.analysis.sections.now);
  assert.deepStrictEqual(P.analysisSteps(doc).map(s => s.key), ['defs', 'burden', 'frame', 'frame:who', 'actors', 'without', 'gov', 'stance', 'opp', 'clash']);
});

test('без разбора шагов нет', () => {
  assert.deepStrictEqual(P.analysisSteps(makeDoc(['a'], [])), []);
});

test('разбор и заголовки разделов сохраняются в файле', () => {
  const { doc } = motionDoc('regret');
  doc.analysis.step = 'gov';
  const again = P.parseDoc(JSON.stringify(doc));
  assert.deepStrictEqual(again.analysis, doc.analysis);
  assert.strictEqual(node(again, doc.analysis.sections.gov).h, true);
  assert.deepStrictEqual(P.analysisSteps(again).map(s => s.key), P.analysisSteps(doc).map(s => s.key));
});

test('мусор в разборе отбрасывается при чтении файла', () => {
  const base = { nodes: [{ id: 'n1', text: 'a' }], edges: [] };
  assert.strictEqual('analysis' in P.parseDoc(JSON.stringify({ ...base, analysis: { type: 'нет такого', root: 'n1', sections: {} } })), false);
  assert.strictEqual('analysis' in P.parseDoc(JSON.stringify({ ...base, analysis: { type: 'policy', root: 'zz', sections: {} } })), false);
  const kept = P.parseDoc(JSON.stringify({ ...base, analysis: { type: 'policy', root: 'n1', sections: { defs: 'n1', gov: 'zz', __proto__: 'n1' }, step: 5 } }));
  assert.deepStrictEqual(kept.analysis, { type: 'policy', root: 'n1', sections: { defs: 'n1' }, step: '5' });
});

// Сторона в дебатах

const side = (doc, id) => node(doc, id).side || '';
const stepOf = (doc, key) => P.analysisSteps(doc).find(s => s.key === key);

test('без выбора стороны Правительство жёлтое, Оппозиция синяя', () => {
  const { doc } = motionDoc('regret');
  assert.strictEqual('me' in doc.analysis, false);
  assert.strictEqual(side(doc, doc.analysis.sections.gov), '');
  assert.strictEqual(side(doc, doc.analysis.sections.opp), 'o');
});

test('за Оппозицию свои блоки жёлтые, а Правительство становится соперником', () => {
  const { doc } = motionDoc('regret', 'opp');
  assert.strictEqual(doc.analysis.me, 'opp');
  assert.strictEqual(side(doc, doc.analysis.sections.gov), 'o');
  assert.strictEqual(side(doc, doc.analysis.sections.opp), '');
  assert.strictEqual(stepOf(doc, 'gov').side, 'o');
  assert.strictEqual(stepOf(doc, 'opp').side, '');
  assert.strictEqual(stepOf(doc, 'stance').side, '');
});

test('за Правительство цвета такие же, как без выбора, а сторона запомнена', () => {
  const { doc } = motionDoc('regret', 'gov');
  assert.strictEqual(doc.analysis.me, 'gov');
  assert.strictEqual(side(doc, doc.analysis.sections.opp), 'o');
  assert.strictEqual(stepOf(doc, 'gov').side, '');
});

test('вопросы шагов говорят, где твои аргументы, а где соперника', () => {
  const asOpp = motionDoc('regret', 'opp').doc;
  assert.match(stepOf(asOpp, 'opp').prompt, /^Твои аргументы/);
  assert.match(stepOf(asOpp, 'gov').prompt, /^Что скажет Правительство/);
  assert.match(stepOf(asOpp, 'stance').prompt, /^Твоя линия/);
  const asGov = motionDoc('regret', 'gov').doc;
  assert.match(stepOf(asGov, 'gov').prompt, /^Твои аргументы/);
  assert.match(stepOf(asGov, 'opp').prompt, /^Что скажет Оппозиция/);
  const both = motionDoc('regret').doc;
  assert.match(stepOf(both, 'gov').prompt, /^Аргументы Правительства/);
});

test('линия Оппозиции идёт отдельным шагом перед её аргументами', () => {
  const { doc } = motionDoc('policy');
  const { opp } = doc.analysis.sections;
  const stance = stepOf(doc, 'stance');
  assert.strictEqual(stance.parent, opp);
  assert.strictEqual(stance.q, 'Что защищает?');
  assert.strictEqual(stance.side, 'o');
  const line = P.addBlock(doc, { parents: [opp], text: 'Оставить как есть', q: stance.q, side: 'o' });
  const arg = P.addBlock(doc, { parents: [opp], text: 'Это дорого', q: '', side: 'o' });
  assert.deepStrictEqual(P.stepAnswers(doc, stepOf(doc, 'stance')), [line]);
  assert.deepStrictEqual(P.stepAnswers(doc, stepOf(doc, 'opp')), [arg]);
});

test('подсказка к линии Оппозиции зависит от типа резолюции', () => {
  const hints = Object.keys(P.MOTION_TYPES).map(type => stepOf(motionDoc(type).doc, 'stance').hint);
  hints.forEach(h => assert.ok(h));
  assert.strictEqual(new Set(hints).size, hints.length);
});

const debate = me => {
  const { doc } = motionDoc('regret', me);
  const { gov, opp, actors, defs } = doc.analysis.sections;
  const mine = me === 'opp' ? 'o' : '';
  const theirs = me === 'opp' ? '' : 'o';
  const a1 = P.addBlock(doc, { parents: [gov], text: 'Матери выгорают', q: '', side: mine });
  const a2 = P.addBlock(doc, { parents: [gov], text: 'Дети страдают', q: '', side: mine });
  const b1 = P.addBlock(doc, { parents: [opp], text: 'Это поддержка', q: '', side: theirs });
  const mothers = P.addBlock(doc, { parents: [actors], text: 'Матери', q: '' });
  const word = P.addBlock(doc, { parents: [defs], text: 'Романтизация', q: '' });
  return { doc, a1, a2, b1, mothers, word, gov, opp };
};

test('за Оппозицию на каждый аргумент Правительства есть шаг ответа', () => {
  const { doc, a1, a2, b1 } = debate('opp');
  const keys = P.analysisSteps(doc).map(s => s.key);
  assert.deepStrictEqual(keys.slice(keys.indexOf('opp')), ['opp', `why:${b1}`, `example:${b1}`, `impact:${b1}`, `weigh:${b1}`, `reply:${a1}`, `reply:${a2}`, 'clash']);
  assert.strictEqual(keys.includes(`reply:${b1}`), false);
  const reply = stepOf(doc, `reply:${a1}`);
  assert.strictEqual(reply.parent, a1);
  assert.strictEqual(reply.q, 'Чем ответить?');
  assert.strictEqual(reply.side, '');
  assert.ok(reply.prompt.includes('Матери выгорают'));
  assert.ok(reply.hint);
});

test('за Правительство отвечаем на аргументы Оппозиции', () => {
  const { doc, a1, b1 } = debate('gov');
  const keys = P.analysisSteps(doc).map(s => s.key);
  assert.strictEqual(keys.includes(`reply:${a1}`), false);
  assert.strictEqual(stepOf(doc, `reply:${b1}`).side, '');
});

test('без выбора стороны отвечают обе стороны, каждая своим цветом', () => {
  const { doc, a1, b1 } = debate();
  assert.strictEqual(stepOf(doc, `reply:${a1}`).side, 'o');
  assert.strictEqual(stepOf(doc, `reply:${b1}`).side, '');
  assert.match(stepOf(doc, `reply:${a1}`).prompt, /^Оппозиция отвечает/);
  assert.match(stepOf(doc, `reply:${b1}`).prompt, /^Правительство отвечает/);
});

test('линия Оппозиции не считается аргументом, на который надо отвечать', () => {
  const { doc, opp } = debate('gov');
  const line = P.addBlock(doc, { parents: [opp], text: 'Оставить как есть', q: 'Что защищает?', side: 'o' });
  assert.strictEqual(P.analysisSteps(doc).some(s => s.key === `reply:${line}`), false);
});

test('длинный аргумент в вопросе шага сокращается', () => {
  const { doc, gov } = debate('opp');
  const long = P.addBlock(doc, { parents: [gov], text: 'слово '.repeat(40).trim(), q: '', side: 'o' });
  const { prompt } = stepOf(doc, `reply:${long}`);
  assert.ok(prompt.length < 90, String(prompt.length));
  assert.ok(prompt.includes('…'));
});

test('выгоды участника идут цветом Правительства, потери цветом Оппозиции', () => {
  const both = debate();
  assert.strictEqual(stepOf(both.doc, `gain:${both.mothers}`).side, '');
  assert.strictEqual(stepOf(both.doc, `lose:${both.mothers}`).side, 'o');
  const asOpp = debate('opp');
  assert.strictEqual(stepOf(asOpp.doc, `gain:${asOpp.mothers}`).side, 'o');
  assert.strictEqual(stepOf(asOpp.doc, `lose:${asOpp.mothers}`).side, '');
});

test('у обычных шагов сторона не задана: блок берёт её у родителя', () => {
  const { doc } = motionDoc('regret', 'opp');
  assert.strictEqual(stepOf(doc, 'defs').side, undefined);
  assert.strictEqual(stepOf(doc, 'clash').side, undefined);
});

test('смена стороны перекрашивает аргументы, ответы, выгоды и потери', () => {
  const { doc, a1, b1, mothers, word, gov, opp } = debate();
  const reply = P.addBlock(doc, { parents: [b1], text: 'Поддержка бывает честной', q: 'Чем ответить?' });
  const gain = P.addBlock(doc, { parents: [mothers], text: 'Честность', q: 'Что получает?' });
  const lose = P.addBlock(doc, { parents: [mothers], text: 'Уважение', q: 'Что теряет?', side: 'o' });
  const deep = P.addBlock(doc, { parents: [lose], text: 'Меньше помощи', q: 'Что это значит?', side: 'o' });
  const colors = () => [gov, opp, a1, b1, reply, gain, lose, deep, mothers, word].map(id => side(doc, id)).join(',');
  assert.strictEqual(colors(), ',o,,o,,,o,o,,');
  P.setMySide(doc, 'opp');
  assert.strictEqual(doc.analysis.me, 'opp');
  assert.strictEqual(colors(), 'o,,o,,o,o,,,,');
  P.setMySide(doc, 'gov');
  assert.strictEqual(doc.analysis.me, 'gov');
  assert.strictEqual(colors(), ',o,,o,,,o,o,,');
  P.setMySide(doc, '');
  assert.strictEqual('me' in doc.analysis, false);
  assert.strictEqual(colors(), ',o,,o,,,o,o,,');
});

test('блок, сведённый из двух веток, перекрашивается один раз', () => {
  const { doc, a1, b1 } = debate();
  const merged = P.addBlock(doc, { parents: [a1, b1], text: 'Общий вывод', q: 'Что это значит?' });
  P.setMySide(doc, 'opp');
  assert.strictEqual(side(doc, merged), 'o');
});

test('сторона сохраняется в файле, мусор отбрасывается', () => {
  const { doc } = motionDoc('regret', 'opp');
  assert.strictEqual(P.parseDoc(JSON.stringify(doc)).analysis.me, 'opp');
  doc.analysis.me = 'судья';
  assert.strictEqual('me' in P.parseDoc(JSON.stringify(doc)).analysis, false);
});

test('старый разбор без выбранной стороны открывается и получает новые шаги', () => {
  const old = {
    nodes: [
      { id: 'n1', text: 'ЭП запретит рекламу' },
      { id: 'n2', text: 'Правительство', q: 'Почему да?', h: true },
      { id: 'n3', text: 'Оппозиция', q: 'Почему нет?', h: true, side: 'o' },
      { id: 'n4', text: 'Свобода слова', side: 'o' },
    ],
    edges: [['n1', 'n2'], ['n1', 'n3'], ['n3', 'n4']],
    analysis: { type: 'policy', root: 'n1', sections: { gov: 'n2', opp: 'n3' }, step: 'opp' },
  };
  const doc = P.parseDoc(JSON.stringify(old));
  assert.deepStrictEqual(P.analysisSteps(doc).map(s => s.key), ['gov', 'stance', 'opp', 'why:n4', 'example:n4', 'impact:n4', 'weigh:n4', 'reply:n4']);
});

// Жизненные решения

test('вид разбора виден по тексту: резолюция, вопрос или неясно', () => {
  assert.strictEqual(P.detectKind('ЭП запретит рекламу фастфуда'), 'debate');
  assert.strictEqual(P.detectKind('эта палата сожалеет'), 'debate');
  assert.strictEqual(P.detectKind('ЭП, будучи родителем, отдала бы ребёнка'), 'debate');
  assert.strictEqual(P.detectKind('Переводиться ли в другой вуз?'), 'life');
  assert.strictEqual(P.detectKind('Туризм'), '');
  assert.strictEqual(P.detectKind('Эпидемия гриппа'), '');
});

test('вид жизненного решения определяется по вопросу', () => {
  const cases = {
    'Переводиться ли в другой вуз?': 'yesno',
    'Стоит ли брать подработку': 'yesno',
    'Бросить подработку или нет?': 'yesno',
    'Купить ноутбук': 'yesno',
    'Общага или квартира?': 'choice',
    'Идти ли в ординатуру или сразу работать?': 'choice',
    'Какую подработку взять?': 'choice',
    'Не успеваю готовиться к модулю': 'problem',
    'Как высыпаться во время сессии?': 'problem',
    'Почему я всё откладываю': 'problem',
    'Что делать с долгами по учёбе': 'problem',
  };
  Object.entries(cases).forEach(([text, type]) => assert.strictEqual(P.detectLife(text), type, text));
});

test('у жизненных типов есть название, пример и разделы, а ключи не совпадают с дебатными', () => {
  assert.deepStrictEqual(Object.keys(P.LIFE_TYPES).sort(), ['choice', 'problem', 'yesno']);
  Object.entries(P.LIFE_TYPES).forEach(([key, t]) => {
    assert.ok(t.name && t.lead);
    t.sections.forEach(s => assert.ok(s.key && s.title && s.q && s.hint));
    assert.strictEqual(key in P.MOTION_TYPES, false);
    assert.strictEqual(P.kindOf(key), 'life');
  });
  assert.strictEqual(P.kindOf('regret'), 'debate');
});

const lifeDoc = type => {
  const doc = makeDoc([], []);
  const root = P.addBlock(doc, { parents: [], text: 'Переводиться ли в другой вуз?', q: '' });
  P.buildSkeleton(doc, root, type);
  return { doc, root };
};

test('каркас «делать или нет»: цель, за, против, худший случай, решение', () => {
  const { doc, root } = lifeDoc('yesno');
  assert.deepStrictEqual(titles(doc, root), ['Цель', 'За', 'Против', 'Худший случай', 'Решение']);
  assert.strictEqual(side(doc, doc.analysis.sections.con), 'o');
  assert.strictEqual(side(doc, doc.analysis.sections.pro), '');
  assert.strictEqual(doc.analysis.step, 'goal');
  const steps = P.analysisSteps(doc);
  assert.deepStrictEqual(steps.map(s => s.key), ['goal', 'pro', 'con', 'worst', 'decision']);
  assert.strictEqual(steps[2].side, 'o');
  steps.forEach(s => assert.ok(s.prompt && s.hint));
});

test('в жизненном разборе нет сторон: ни линии Оппозиции, ни ответов', () => {
  const { doc } = lifeDoc('yesno');
  P.addBlock(doc, { parents: [doc.analysis.sections.con], text: 'Потеряю год', q: '', side: 'o' });
  assert.strictEqual(P.analysisSteps(doc).some(s => s.key === 'stance' || s.key.startsWith('reply:')), false);
  P.setMySide(doc, 'opp');
  assert.strictEqual('me' in doc.analysis, false);
  assert.strictEqual(side(doc, doc.analysis.sections.con), 'o');
});

test('у каждого варианта свои плюсы и минусы, минусы синие', () => {
  const { doc, root } = lifeDoc('choice');
  assert.deepStrictEqual(titles(doc, root), ['Что важно', 'Варианты', 'Решение']);
  const { options } = doc.analysis.sections;
  const dorm = P.addBlock(doc, { parents: [options], text: 'Общага', q: '' });
  const flat = P.addBlock(doc, { parents: [options], text: 'Квартира', q: '' });
  const steps = P.analysisSteps(doc);
  assert.deepStrictEqual(steps.map(s => s.key), ['criteria', 'options', `plus:${dorm}`, `minus:${dorm}`, `plus:${flat}`, `minus:${flat}`, 'decision']);
  const minus = steps.find(s => s.key === `minus:${flat}`);
  assert.strictEqual(minus.parent, flat);
  assert.strictEqual(minus.q, 'Какие минусы?');
  assert.strictEqual(minus.side, 'o');
  assert.ok(minus.prompt.includes('Квартира'));
  assert.strictEqual(steps.find(s => s.key === `plus:${dorm}`).side, '');
});

test('каркас проблемы: проблема, причины, способы, первый шаг', () => {
  const { doc, root } = lifeDoc('problem');
  assert.deepStrictEqual(titles(doc, root), ['Проблема', 'Причины', 'Способы', 'Первый шаг']);
  assert.deepStrictEqual(P.analysisSteps(doc).map(s => s.key), ['what', 'causes', 'ways', 'decision']);
});

test('жизненный разбор сохраняется в файле', () => {
  const { doc } = lifeDoc('choice');
  doc.analysis.step = 'options';
  assert.deepStrictEqual(P.parseDoc(JSON.stringify(doc)).analysis, doc.analysis);
});

// Текст в блоке

const fake = (word, size) => word.length * size * 0.7;

test('короткое слово пишется крупно', () => {
  assert.strictEqual(P.pickSize('Безопасность', 139, fake), 16);
});

test('длинное слово не рвётся: шрифт становится меньше', () => {
  assert.strictEqual(P.pickSize('Правительство', 139, fake), 13);
  assert.strictEqual(P.pickSize('Функционирование институтов', 139, fake), 11);
});

test('длинный текст из коротких слов остаётся обычным', () => {
  assert.strictEqual(P.pickSize('Даёт безопасность для правительства', 139, fake), 13);
});

test('слово, которое не влезает никаким шрифтом, пишется самым мелким', () => {
  assert.strictEqual(P.pickSize('а'.repeat(40), 139, fake), 11);
});

test('длинная резолюция получает широкий блок, остальные блоки обычные', () => {
  const long = 'ЭП предпочитает жёсткую демократизацию мягкой в отношении государств, неспособных обеспечить безопасность';
  assert.strictEqual(P.blockWidth(long, true), NODE_W * 2);
  assert.strictEqual(P.blockWidth(long, false), NODE_W);
  assert.strictEqual(P.blockWidth('ЭП запретит рекламу', true), NODE_W);
});

test('раскладка учитывает ширину блока', () => {
  const nodes = [q('a'), q('b'), q('c'), q('z')];
  const g = P.layout(nodes, [['a', 'b'], ['a', 'c']], { a: 40, b: 40, c: 40, z: 40 }, { a: NODE_W * 2 });
  assert.strictEqual(g.pos.a.w, NODE_W * 2);
  assert.strictEqual(g.pos.b.w, NODE_W);
  assert.ok(g.pos.a.x >= 0 && g.pos.b.x >= 0);
  assert.ok(g.pos.z.x >= g.pos.a.x + g.pos.a.w + 10, 'соседний тезис не наезжает на широкий блок');
  assert.ok(g.width >= g.pos.z.x + g.pos.z.w);
  const mid = p => p.x + p.w / 2;
  assert.ok(Math.abs(mid(g.pos.a) - (mid(g.pos.b) + mid(g.pos.c)) / 2) <= 1, 'широкий блок стоит по центру над своими ветками');
});

test('без заданной ширины раскладка прежняя', () => {
  const g = P.layout([q('a'), q('b')], [['a', 'b']], { a: 40, b: 40 });
  assert.strictEqual(g.pos.a.w, NODE_W);
  assert.strictEqual(g.pos.a.x, g.pos.b.x);
});

// Экспорт в PDF

const width10 = s => s.length * 10;

test('текст переносится по словам', () => {
  assert.deepStrictEqual(P.wrapText('аа бб вв', 50, width10), ['аа бб', 'вв']);
  assert.deepStrictEqual(P.wrapText('  аа   бб  ', 100, width10), ['аа бб']);
});

test('слово длиннее строки режется по буквам', () => {
  assert.deepStrictEqual(P.wrapText('абвгдежз ик', 30, width10), ['абв', 'где', 'жз', 'ик']);
});

test('пустой текст даёт одну пустую строку', () => {
  assert.deepStrictEqual(P.wrapText('', 50, width10), ['']);
});

test('масштаб картинки не больше трёх и не выходит за пределы памяти', () => {
  assert.strictEqual(P.exportScale(400, 600, 8e6), 3);
  const s = P.exportScale(2000, 4000, 8e6);
  assert.ok(s < 3 && 2000 * s * 4000 * s <= 8e6 + 1);
  assert.ok(20000 * P.exportScale(20000, 100, 8e6) <= 8000 + 1, 'сторона не длиннее 8000 точек');
});

test('PDF кладётся рядом со схемой под тем же именем', () => {
  assert.strictEqual(P.pdfPathFor('Дебаты/Дерево 1.tree'), 'Дебаты/Дерево 1.pdf');
  assert.strictEqual(P.pdfPathFor('v1.2 схема.tree'), 'v1.2 схема.pdf');
});

test('PDF собран правильно: одна страница с картинкой и точные смещения объектов', () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
  const pdf = P.buildPdf({ jpeg, imgW: 300, imgH: 600, pageW: 75, pageH: 150.5, title: 'Дерево 1' });
  assert.ok(pdf instanceof Uint8Array);
  const text = Buffer.from(pdf).toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4\n'));
  assert.ok(text.endsWith('%%EOF\n'));
  assert.ok(text.includes('/MediaBox [0 0 75 150.5]'));
  assert.ok(text.includes('/Width 300 /Height 600'));
  assert.ok(text.includes('/Filter /DCTDecode'));
  assert.ok(text.includes(`/Length ${jpeg.length} >>\nstream\n`));
  assert.ok(text.includes('/Count 1'));
  assert.ok(text.includes('/Title <FEFF0414'), 'название записано в UTF-16');
  const at = text.indexOf(`/Length ${jpeg.length} >>\nstream\n`) + `/Length ${jpeg.length} >>\nstream\n`.length;
  assert.deepStrictEqual([...pdf.slice(at, at + jpeg.length)], [...jpeg], 'байты картинки не изменены');

  const xrefAt = Number(text.match(/startxref\n(\d+)\n%%EOF\n$/)[1]);
  assert.ok(text.startsWith('xref\n0 7\n', xrefAt));
  const rows = text.slice(xrefAt).split('\n').slice(2, 9);
  assert.strictEqual(rows[0], '0000000000 65535 f ');
  rows.slice(1).forEach((row, i) => {
    assert.match(row, /^\d{10} 00000 n $/);
    assert.ok(text.startsWith(`${i + 1} 0 obj\n`, Number(row.slice(0, 10))), `объект ${i + 1}`);
  });
  assert.ok(text.includes('/Size 7 /Root 1 0 R /Info 6 0 R'));
});

// ---------- 2.4: британский формат и FRIC ----------

const keysOf = doc => P.analysisSteps(doc).map(s => s.key);

test('позиция в БП задаёт сторону: ЗО играет за Оппозицию', () => {
  const { doc } = motionDoc('regret', 'co');
  assert.strictEqual(doc.analysis.pos, 'co');
  assert.strictEqual(doc.analysis.me, 'opp');
  assert.strictEqual(side(doc, doc.analysis.sections.opp), '');
  assert.strictEqual(side(doc, doc.analysis.sections.gov), 'o');
  assert.strictEqual(P.teamOf('og'), 'gov');
  assert.strictEqual(P.teamOf('cg'), 'gov');
  assert.strictEqual(P.teamOf('oo'), 'opp');
  assert.strictEqual(P.teamOf('нет'), '');
});

test('у закрывающей команды есть раздел «Расширение» сразу после Оппозиции, у открывающей нет', () => {
  const closing = motionDoc('regret', 'cg');
  const t = titles(closing.doc, closing.root);
  assert.strictEqual(t[t.indexOf('Оппозиция') + 1], 'Расширение');
  const ext = node(closing.doc, closing.doc.analysis.sections.ext);
  assert.strictEqual(ext.h, true);
  assert.strictEqual(side(closing.doc, ext.id), '');
  const opening = motionDoc('regret', 'og');
  assert.strictEqual('ext' in opening.doc.analysis.sections, false);
  assert.strictEqual(titles(opening.doc, opening.root).includes('Расширение'), false);
});

test('смена позиции перекрашивает стороны и добавляет расширение один раз', () => {
  const { doc } = motionDoc('regret', 'og');
  P.setPosition(doc, 'cg');
  assert.strictEqual(doc.analysis.me, 'gov');
  const ext = doc.analysis.sections.ext;
  assert.ok(ext);
  P.setPosition(doc, 'cg');
  assert.strictEqual(doc.nodes.filter(n => n.text === 'Расширение').length, 1);
  P.setPosition(doc, 'co');
  assert.strictEqual(doc.analysis.me, 'opp');
  assert.strictEqual(doc.analysis.pos, 'co');
  assert.strictEqual(side(doc, doc.analysis.sections.opp), '');
  assert.strictEqual(side(doc, ext), '', 'расширение всегда своё');
  P.setPosition(doc, '');
  assert.strictEqual('pos' in doc.analysis, false);
  assert.strictEqual('me' in doc.analysis, false);
});

test('старый выбор стороны без позиции сбрасывает несовпадающую позицию', () => {
  const { doc } = motionDoc('regret', 'og');
  P.setMySide(doc, 'opp');
  assert.strictEqual('pos' in doc.analysis, false);
  assert.strictEqual(doc.analysis.me, 'opp');
});

test('позиция и время начала сохраняются в файле, мусор отбрасывается', () => {
  const { doc } = motionDoc('regret', 'co');
  doc.analysis.t0 = 1700000000000;
  const again = P.parseDoc(JSON.stringify(doc)).analysis;
  assert.strictEqual(again.pos, 'co');
  assert.strictEqual(again.t0, 1700000000000);
  assert.strictEqual(again.sections.ext, doc.analysis.sections.ext);
  doc.analysis.pos = 'судья';
  doc.analysis.t0 = 'вчера';
  const bad = P.parseDoc(JSON.stringify(doc)).analysis;
  assert.strictEqual('pos' in bad, false);
  assert.strictEqual('t0' in bad, false);
});

test('бремя доказывания: подсказка своя у каждого типа и у каждой стороны', () => {
  const types = Object.keys(P.MOTION_TYPES);
  const gov = types.map(type => stepOf(motionDoc(type, 'gov').doc, 'burden').hint);
  const opp = types.map(type => stepOf(motionDoc(type, 'opp').doc, 'burden').hint);
  assert.strictEqual(new Set([...gov, ...opp]).size, types.length * 2);
  const both = stepOf(motionDoc('policy').doc, 'burden');
  assert.ok(both.hint.includes('Правительству') && both.hint.includes('Оппозиции'));
  assert.match(stepOf(motionDoc('policy', 'opp').doc, 'burden').prompt, /твоей стороне/);
});

test('фрейм: общий шаг и отдельный шаг о том, кого задевает сильнее всего', () => {
  const { doc } = motionDoc('regret', 'opp');
  const frame = doc.analysis.sections.frame;
  const main = stepOf(doc, 'frame');
  const who = stepOf(doc, 'frame:who');
  assert.strictEqual(main.parent, frame);
  assert.strictEqual(who.parent, frame);
  assert.strictEqual(who.q, 'Кого задевает сильнее?');
  const a = P.addBlock(doc, { parents: [frame], text: 'Матерей хвалят за жертвы', q: '' });
  const b = P.addBlock(doc, { parents: [frame], text: 'Бедные матери', q: who.q });
  assert.deepStrictEqual(P.stepAnswers(doc, main), [a]);
  assert.deepStrictEqual(P.stepAnswers(doc, who), [b]);
});

test('у своего аргумента четыре звена FRIC, у аргумента соперника их нет', () => {
  const { doc, a1, b1 } = debate('gov');
  const keys = keysOf(doc);
  const at = keys.indexOf('gov');
  assert.deepStrictEqual(keys.slice(at, at + 5), ['gov', `why:${a1}`, `example:${a1}`, `impact:${a1}`, `weigh:${a1}`]);
  assert.strictEqual(keys.includes(`why:${b1}`), false);
  const why = stepOf(doc, `why:${a1}`);
  assert.strictEqual(why.parent, a1);
  assert.strictEqual(why.q, 'Почему правда?');
  assert.ok(why.prompt.includes('Матери выгорают'));
  assert.strictEqual(stepOf(doc, `example:${a1}`).q, 'Например?');
  assert.strictEqual(stepOf(doc, `impact:${a1}`).q, 'К чему ведёт?');
  const weigh = stepOf(doc, `weigh:${a1}`);
  assert.strictEqual(weigh.q, 'Почему важнее?');
  assert.deepStrictEqual(weigh.chips, ['Вероятность', 'Масштаб', 'Критичность', 'Меньшинства', 'Необратимость']);
  ['why', 'example', 'impact', 'weigh'].forEach(k => assert.ok(stepOf(doc, `${k}:${a1}`).hint));
});

test('у закрывающей команды FRIC идёт по расширению, а раздел стороны — это первый стол', () => {
  const { doc } = motionDoc('regret', 'cg');
  const { gov, ext } = doc.analysis.sections;
  const said = P.addBlock(doc, { parents: [gov], text: 'Матери выгорают', q: '' });
  const mine = P.addBlock(doc, { parents: [ext], text: 'Отцы выпадают из семьи', q: '' });
  const keys = keysOf(doc);
  assert.match(stepOf(doc, 'gov').prompt, /первый стол/);
  assert.strictEqual(keys.includes(`why:${said}`), false);
  const at = keys.indexOf('ext');
  assert.ok(at > keys.indexOf('opp'));
  assert.deepStrictEqual(keys.slice(at, at + 5), ['ext', `why:${mine}`, `example:${mine}`, `impact:${mine}`, `weigh:${mine}`]);
  assert.match(stepOf(doc, 'ext').hint, /другой участник/);
  assert.deepStrictEqual(P.fricTargets(doc), [mine]);
});

test('без стороны свои аргументы у обеих сторон', () => {
  const { doc, a1, a2, b1 } = debate();
  assert.deepStrictEqual(P.fricTargets(doc), [a1, a2, b1]);
});

test('буквы Р И С горят по заполненным звеньям', () => {
  const { doc, a1 } = debate('gov');
  assert.deepStrictEqual(P.ricOf(doc, a1), { r: false, i: false, c: false });
  P.addBlock(doc, { parents: [a1], text: 'Нет отдыха', q: 'Почему правда?' });
  P.addBlock(doc, { parents: [a1], text: 'Депрессия', q: 'К чему ведёт?' });
  assert.deepStrictEqual(P.ricOf(doc, a1), { r: true, i: true, c: false });
  P.addBlock(doc, { parents: [a1], text: 'Масштаб: каждая третья', q: 'Почему важнее?' });
  assert.deepStrictEqual(P.ricOf(doc, a1), { r: true, i: true, c: true });
});

const MIN = 60000;

test('таймер: в начале всё по плану, 15 минут впереди', () => {
  const s = P.prepStatus('defs', 0);
  assert.strictEqual(s.left, 900);
  assert.strictEqual(s.late, false);
  assert.strictEqual(s.over, false);
});

test('таймер: застрял на фрейме дольше трёх минут — пора к участникам', () => {
  const s = P.prepStatus('frame', 4 * MIN);
  assert.strictEqual(s.late, true);
  assert.match(s.label, /участник/i);
  assert.strictEqual(P.prepStatus('actors', 4 * MIN).late, false);
  assert.strictEqual(P.prepStatus('why:n9', 10 * MIN).late, false);
  assert.strictEqual(P.prepStatus('gain:n3', 10 * MIN).late, true);
  assert.strictEqual(P.prepStatus('clash', 14 * MIN).late, false);
});

test('таймер: после 15 минут время вышло, после 30 таймер прячется', () => {
  const s = P.prepStatus('clash', 16 * MIN);
  assert.strictEqual(s.over, true);
  assert.strictEqual(s.left, 0);
  assert.strictEqual(P.prepStatus('clash', 31 * MIN), null);
  assert.strictEqual(P.prepStatus('defs', -5 * MIN), null);
});

const EXT_WEIGH = "Масштаб: весь рынок";
const caseDoc = pos => {
  const { doc } = motionDoc('policy', pos);
  const s = doc.analysis.sections;
  const team = P.teamOf(pos) || 'gov';
  const rival = team === 'gov' ? 'opp' : 'gov';
  P.addBlock(doc, { parents: [s.defs], text: 'Реклама: платные сообщения', q: '' });
  P.addBlock(doc, { parents: [s.burden], text: 'Что запрет снизит вред', q: '' });
  P.addBlock(doc, { parents: [s.frame], text: 'Дети видят рекламу каждый день', q: '' });
  P.addBlock(doc, { parents: [s.mechanism], text: 'Штраф за нарушение', q: '' });
  const args = ['Дети меньше покупают', 'Родителям легче', 'Меньше долгов'].map(text => P.addBlock(doc, { parents: [s[team]], text, q: '' }));
  P.addBlock(doc, { parents: [args[0]], text: 'Нет соблазна', q: 'Почему правда?' });
  P.addBlock(doc, { parents: [args[0]], text: 'Здоровее', q: 'К чему ведёт?' });
  P.addBlock(doc, { parents: [args[0]], text: 'Критичность', q: 'Почему важнее?' });
  const rivalArg = P.addBlock(doc, { parents: [s[rival]], text: 'Свобода слова', q: '' });
  P.addBlock(doc, { parents: [rivalArg], text: 'Реклама не мнение', q: 'Чем ответить?' });
  P.addBlock(doc, { parents: [s.clash], text: 'Свобода против здоровья', q: '' });
  if (s.ext) {
    const ext = P.addBlock(doc, { parents: [s.ext], text: 'Бизнес честнее', q: '' });
    P.addBlock(doc, { parents: [ext], text: EXT_WEIGH, q: 'Почему важнее?' });
  }
  return doc;
};
const section = (text, head) => {
  const start = text.indexOf(head);
  assert.ok(start >= 0, `нет раздела ${head}`);
  const rest = text.slice(start + head.length);
  const end = rest.search(/\n#{1,2} /);
  return end < 0 ? rest : rest.slice(0, end);
};

test('план речи ОП: первый спикер с определениями, фреймом и двумя аргументами', () => {
  const text = P.speechPlan(caseDoc('og'), 'Реклама');
  assert.ok(text.startsWith('---\ncssclasses: lt-speech\n---\n'));
  assert.ok(text.includes('ЭП сожалеет о романтизации материнства'));
  assert.ok(text.includes('ОП'));
  assert.ok(text.includes('Что запрет снизит вред'));
  const first = section(text, '## Первый спикер');
  ['Реклама: платные сообщения', 'Дети видят рекламу каждый день', 'Штраф за нарушение', 'Дети меньше покупают', 'Родителям легче', 'Нет соблазна', 'Здоровее', 'Критичность'].forEach(s => assert.ok(first.includes(s), s));
  assert.strictEqual(first.includes('Меньше долгов'), false);
  assert.ok(first.includes('не заполнено'), 'пустое звено видно');
  const second = section(text, '## Второй спикер');
  ['Меньше долгов', 'Свобода слова', 'Реклама не мнение', 'Свобода против здоровья'].forEach(s => assert.ok(second.includes(s), s));
});

test('план речи ОО: первый спикер даёт линию и отвечает Правительству', () => {
  const text = P.speechPlan(caseDoc('oo'), 'Реклама');
  const first = section(text, '## Первый спикер');
  assert.ok(first.includes('Реклама не мнение'));
  assert.strictEqual(first.includes('Штраф за нарушение'), false, 'механизм говорит Правительство');
});

test('план речи ЗО: расширение у первого спикера, у второго только сравнение', () => {
  const text = P.speechPlan(caseDoc('co'), 'Реклама');
  const first = section(text, '## Первый спикер');
  assert.ok(first.includes('Бизнес честнее'));
  assert.ok(first.includes('Дети меньше покупают'), 'что скажет первый стол, чтобы не повторять');
  const second = section(text, '## Второй спикер');
  assert.ok(second.includes('Свобода против здоровья'));
  assert.ok(second.includes('Без новых аргументов'));
  assert.ok(second.includes(EXT_WEIGH), 'сравнение по своему расширению');
});

test('план речи без позиции: за обе стороны первого стола', () => {
  const text = P.speechPlan(caseDoc(''), 'Реклама');
  assert.ok(text.includes('# За Правительство'));
  assert.ok(text.includes('# За Оппозицию'));
});

test('план речи пишется рядом с деревом', () => {
  assert.strictEqual(P.planPathFor('Дебаты/Реклама.tree'), 'Дебаты/Реклама — план речи.md');
});

// ---------- 2.5: тренажёр ----------


test('встроенные резолюции: много, без повторов, в формате «ЭП …»', () => {
  assert.ok(P.TRAIN_MOTIONS.length >= 30, `всего ${P.TRAIN_MOTIONS.length}`);
  assert.strictEqual(new Set(P.TRAIN_MOTIONS).size, P.TRAIN_MOTIONS.length);
  P.TRAIN_MOTIONS.forEach(m => assert.match(m, /^ЭП[ ,]/, m));
});

test('свой список резолюций: строки списка, без заголовков, свойств и коротких строк', () => {
  const text = '---\ntags: дебаты\n---\n# Мои резолюции\n- ЭП запретила бы рекламу фастфуда\n1. ЭП сожалеет о соцсетях\n\n* ЭП ввела бы налог на роскошь\nкоротко\n  ЭП поддерживает четырёхдневку  ';
  assert.deepStrictEqual(P.motionBank(text), [
    'ЭП запретила бы рекламу фастфуда',
    'ЭП сожалеет о соцсетях',
    'ЭП ввела бы налог на роскошь',
    'ЭП поддерживает четырёхдневку',
  ]);
});

test('случайная резолюция не повторяет недавние, а если все недавние, берёт любую', () => {
  const list = ['a1 aaaaaaaaaa', 'b2 bbbbbbbbbb', 'c3 cccccccccc'];
  assert.strictEqual(P.pickMotion(list, ['a1 aaaaaaaaaa', 'b2 bbbbbbbbbb'], () => 0.99), 'c3 cccccccccc');
  assert.strictEqual(P.pickMotion(list, list, () => 0), 'a1 aaaaaaaaaa');
  assert.strictEqual(P.pickMotion([], [], () => 0), '');
});

test('часы тренажёра', () => {
  assert.strictEqual(P.clock(0), '0:00');
  assert.strictEqual(P.clock(65), '1:05');
  assert.strictEqual(P.clock(600), '10:00');
});

test('темп подготовки: этапы 0–3, 3–9, 9–15 минут, как на бумажном шаблоне', () => {
  assert.deepStrictEqual(P.trainPace(0, 1 * MIN), { left: 14 * 60, over: false, late: false, due: 0, text: '' });
  const late = P.trainPace(0, 4 * MIN);
  assert.ok(late.late);
  assert.strictEqual(late.due, 1);
  assert.match(late.text, /идеи/);
  assert.ok(P.trainPace(1, 10 * MIN).late);
  assert.match(P.trainPace(1, 10 * MIN).text, /лист речи/i);
  assert.ok(!P.trainPace(2, 10 * MIN).late);
  const over = P.trainPace(2, 15.5 * MIN);
  assert.ok(over.over);
  assert.strictEqual(over.left, 0);
  assert.match(over.text, /вышло/);
  assert.strictEqual(P.trainPace(0, -5), null);
});

test('часть речи по времени: 0:00, 0:30, 1:30, 4:00, 6:30', () => {
  const at = s => P.speakPart(s * 1000);
  assert.deepStrictEqual([at(0), at(29), at(30), at(89), at(90), at(239), at(240), at(389), at(390), at(419)], [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  assert.strictEqual(at(500), 4);
});

test('лист речи: у ОП вместо ответа определения, у закрывающих расширение', () => {
  const og = P.sheetParts('og');
  assert.deepStrictEqual(og.map(p => p.key), ['intro', 'answer', 'a1', 'a2', 'end']);
  assert.deepStrictEqual(og.map(p => P.clock(p.at)), ['0:00', '0:30', '1:30', '4:00', '6:30']);
  assert.strictEqual(og[1].title, 'Определения');
  assert.strictEqual(P.sheetParts('oo')[1].title, 'Ответ соперникам');
  assert.match(P.sheetParts('co')[2].hint, /Расширение/);
  assert.doesNotMatch(P.sheetParts('og')[2].hint, /Расширение/);
});

test('идеи становятся кнопками: по строкам, без маркеров и повторов', () => {
  assert.deepStrictEqual(P.ideaLines('- рабочие места\n\n2) налоги\nрабочие места\n  меньше пробок '), ['рабочие места', 'налоги', 'меньше пробок']);
  assert.deepStrictEqual(P.ideaLines(undefined), []);
});

const trainDoc = () => ({
  motion: 'ЭП запретила бы автомобили в центре города',
  pos: 'co',
  t0: 1000,
  p1: 1000 + 14 * MIN + 12000,
  s0: 2000000,
  s1: 2000000 + 6 * MIN + 48000,
  f: {
    words: 'центр — внутри кольца',
    prove: 'что выгода больше вреда',
    ours: 'воздух\nпробки',
    intro: 'Город для людей, а не для машин.',
    answer: 'ЗП: экономика → торговля растёт\nОП: воздух',
    'a1.thesis': 'Пострадают бедные районы',
    'a1.why': 'дальние районы → нет метро → машина единственный путь',
    'a1.impact': 'люди теряют работу в центре',
    'a1.weigh': 'Масштаб: тысячи семей',
    end: 'Мы защищаем тех, кого не слышно.',
  },
  path: 'Тренировки/Тренировка 2026-11-12 23-40.md',
});

test('заметка тренировки: лист речи сверху, подготовка ниже, пустое отмечено', () => {
  const md = P.trainingNote(trainDoc());
  assert.ok(md.startsWith('---\ncssclasses: lt-speech\n---\n'));
  assert.match(md, /\*\*Резолюция:\*\* ЭП запретила бы автомобили в центре города/);
  assert.match(md, /\*\*Позиция:\*\* ЗО, Закрывающая Оппозиция/);
  assert.match(md, /подготовка 14:12 из 15:00, речь 6:48 из 7:00/);
  const sheet = md.indexOf('## Лист речи');
  const prep = md.indexOf('## Подготовка');
  assert.ok(sheet > 0 && prep > sheet);
  assert.match(md, /### 1:30 Аргумент 1: Пострадают бедные районы/);
  assert.match(md, /- \*\*Почему правда:\*\* дальние районы → нет метро → машина единственный путь/);
  assert.match(md, /### 4:00 Аргумент 2: _не заполнено_/);
  assert.match(md, /\*\*0:30 Ответ соперникам\*\*\n- ЗП: экономика → торговля растёт\n- ОП: воздух/);
  assert.ok(!/Пример:/.test(md.slice(sheet, md.indexOf('### 4:00'))), 'пустой пример не мешает');
  assert.match(md.slice(prep), /\*\*За нашу сторону\*\*\n- воздух\n- пробки/);
  assert.ok(!/Кто теряет/.test(md.slice(prep)), 'пустые поля подготовки не пишутся');
});

test('заметка во время подготовки: время ещё идёт', () => {
  const t = { ...trainDoc(), p1: null, s0: null, s1: null };
  assert.match(P.trainingNote(t), /\*\*Время:\*\* подготовка идёт/);
});

test('что не заполнено в листе речи', () => {
  assert.deepStrictEqual(P.missingFields(trainDoc()), [
    'Аргумент 2: тезис', 'Аргумент 2: почему правда', 'Аргумент 2: к чему ведёт', 'Аргумент 2: почему важнее',
  ]);
  const full = trainDoc();
  ['thesis', 'why', 'impact', 'weigh'].forEach(k => { full.f[`a2.${k}`] = 'x'; });
  assert.deepStrictEqual(P.missingFields(full), []);
  assert.ok(P.missingFields({ ...full, f: {} }).includes('Вступление'));
});

test('тренировка из data.json: проверка полей', () => {
  const ok = P.parseTraining(JSON.parse(JSON.stringify(trainDoc())));
  assert.deepStrictEqual(ok, trainDoc());
  assert.strictEqual(P.parseTraining(null), null);
  assert.strictEqual(P.parseTraining({ motion: '', t0: 1 }), null);
  assert.strictEqual(P.parseTraining({ motion: 'ЭП x', t0: 'вчера' }), null);
  const odd = P.parseTraining({ motion: 'ЭП x', t0: 5, pos: 'zz', f: { intro: 'a', bad: 7, words: ['x'] }, s0: 'x', path: 3 });
  assert.deepStrictEqual(odd, { motion: 'ЭП x', pos: '', t0: 5, p1: null, s0: null, s1: null, f: { intro: 'a' }, path: null });
});

test('имя заметки тренировки по дате, без затирания старой', () => {
  const d = new Date(2026, 10, 2, 9, 5);
  assert.strictEqual(P.trainingPath(d, () => false), 'Тренировки/Тренировка 2026-11-02 09-05.md');
  const taken = new Set(['Тренировки/Тренировка 2026-11-02 09-05.md']);
  assert.strictEqual(P.trainingPath(d, p => taken.has(p)), 'Тренировки/Тренировка 2026-11-02 09-05 (2).md');
});

// ---------- 3.0: английский и русский ----------

const inLang = (lang, fn) => {
  P.setLanguage(lang);
  try {
    return fn();
  } finally {
    P.setLanguage('ru');
  }
};
const CYR = /[А-Яа-яЁё]/;
const cyrillicIn = (value, at = '') => {
  if (typeof value === 'string') return CYR.test(value) ? [`${at}: ${value}`] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => cyrillicIn(v, `${at}[${i}]`));
  if (value && typeof value === 'object') return Object.keys(value).flatMap(k => cyrillicIn(value[k], `${at}.${k}`));
  return [];
};

test('tr: английский перевод, русский как есть', () => {
  assert.strictEqual(inLang('en', () => P.tr('Да')), 'Yes');
  assert.strictEqual(P.tr('Да'), 'Да');
});

test('tr подставляет значения на обоих языках', () => {
  assert.strictEqual(inLang('en', () => P.tr('Ответ на {quote}', { quote: '«x»' })), 'Reply to «x»');
  assert.strictEqual(P.tr('Ответ на {quote}', { quote: '«x»' }), 'Ответ на «x»');
});

test('неизвестная строка остаётся как есть', () => {
  assert.strictEqual(inLang('en', () => P.tr('Свой текст')), 'Свой текст');
});

test('вопросы на стрелках совпадают по смыслу на обоих языках', () => {
  assert.ok(P.sameQ('Why is it true?', 'Почему правда?'));
  assert.ok(P.sameQ('Почему правда?', 'Почему правда?'));
  assert.ok(!P.sameQ('Why is it true?', 'Например?'));
  assert.ok(P.sameQ('', ''));
  assert.strictEqual(P.canonQ('Why is it true?'), 'Почему правда?');
  assert.strictEqual(P.canonQ('Свой вопрос'), 'Свой вопрос');
});

test('язык: «авто» берёт язык Obsidian, по умолчанию английский', () => {
  assert.strictEqual(P.languageFor('auto', 'ru'), 'ru');
  assert.strictEqual(P.languageFor('auto', 'ru-RU'), 'ru');
  assert.strictEqual(P.languageFor('auto', 'de'), 'en');
  assert.strictEqual(P.languageFor('auto', ''), 'en');
  assert.strictEqual(P.languageFor(undefined, 'ru'), 'ru');
  assert.strictEqual(P.languageFor('en', 'ru'), 'en');
  assert.strictEqual(P.languageFor('ru', 'en'), 'ru');
});

test('английский интерфейс: в таблицах нет кириллицы', () => {
  assert.deepStrictEqual(inLang('en', () => cyrillicIn(P.localizedTables())), []);
});

test('русский интерфейс: таблицы не тронуты', () => {
  const ru = P.localizedTables();
  assert.strictEqual(ru.QUESTIONS[0], 'Что происходит?');
  assert.strictEqual(ru.MOTION_TYPES.policy.name, 'Действие');
});

test('у каждой строки tr() в коде есть английский перевод', () => {
  const src = require('fs').readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const missing = [];
  for (const m of src.matchAll(/\btr\('((?:[^'\\]|\\.)*)'/g)) {
    const key = m[1].replace(/\\'/g, "'");
    if (CYR.test(key) && !Object.prototype.hasOwnProperty.call(P.EN, key)) missing.push(key);
  }
  assert.deepStrictEqual(missing, []);
});

test('в английском словаре нет кириллицы и пустых переводов', () => {
  const bad = Object.entries(P.EN).filter(([, en]) => !en || CYR.test(en)).map(([ru]) => ru);
  assert.deepStrictEqual(bad, []);
});

test('старое русское дерево работает в английском интерфейсе', () => {
  const doc = caseDoc('og');
  const arg = doc.nodes.find(n => n.text === 'Дети меньше покупают').id;
  inLang('en', () => {
    assert.deepStrictEqual(P.ricOf(doc, arg), { r: true, i: true, c: true });
    const why = P.analysisSteps(doc).find(s => s.key === `why:${arg}`);
    assert.strictEqual(why.q, 'Why is it true?');
    assert.strictEqual(P.stepAnswers(doc, why).length, 1);
  });
});

test('новое английское дерево работает в русском интерфейсе', () => {
  const doc = inLang('en', () => {
    const d = caseDoc('og');
    const arg = d.nodes.find(n => n.text === 'Родителям легче').id;
    P.addBlock(d, { parents: [arg], text: 'Less stress', q: P.tr('Почему правда?') });
    return d;
  });
  const arg = doc.nodes.find(n => n.text === 'Родителям легче').id;
  assert.strictEqual(doc.nodes.find(n => n.text === 'Less stress').q, 'Why is it true?');
  assert.ok(P.ricOf(doc, arg).r);
});

test('английский план речи без кириллицы, кроме текста пользователя', () => {
  const doc = inLang('en', () => {
    const { doc: d } = motionDoc('policy', 'og');
    const s = d.analysis.sections;
    const a = P.addBlock(d, { parents: [s.gov], text: 'Kids buy less', q: '' });
    P.addBlock(d, { parents: [a], text: 'No temptation', q: P.tr('Почему правда?') });
    return d;
  });
  const md = inLang('en', () => P.speechPlan(doc, 'Tree 1'));
  assert.deepStrictEqual(cyrillicIn(md.split('\n').filter(l => !l.includes('ЭП '))), []);
  assert.match(md, /Kids buy less/);
  assert.match(md, /Opening Government/);
});

test('английская резолюция распознаётся как дебаты', () => {
  assert.strictEqual(P.detectKind('This House would ban cars'), 'debate');
  assert.strictEqual(P.detectKind('THBT money is overrated'), 'debate');
  assert.strictEqual(P.detectKind('TH, as a parent, would homeschool'), 'debate');
  assert.strictEqual(P.detectKind('Should I move to Berlin?'), 'life');
  assert.strictEqual(P.detectKind('The Krebs cycle'), '');
  assert.strictEqual(P.detectKind('Thermodynamics'), '');
});

test('тип английской резолюции', () => {
  assert.strictEqual(P.detectMotion('This House would ban cars'), 'policy');
  assert.strictEqual(P.detectMotion('THW ban cars'), 'policy');
  assert.strictEqual(P.detectMotion('This House regrets hustle culture'), 'regret');
  assert.strictEqual(P.detectMotion('This House prefers a world without money'), 'prefer');
  assert.strictEqual(P.detectMotion('This House supports remote work'), 'support');
  assert.strictEqual(P.detectMotion('This House believes that art matters'), 'value');
  assert.strictEqual(P.detectMotion('THBT art matters'), 'value');
  assert.strictEqual(P.detectMotion('This House, as a doctor, would lie'), 'actor');
});

test('вид английского жизненного решения', () => {
  assert.strictEqual(P.detectLife('Should I quit my job?'), 'yesno');
  assert.strictEqual(P.detectLife('Should I go or not?'), 'yesno');
  assert.strictEqual(P.detectLife('Berlin or Munich?'), 'choice');
  assert.strictEqual(P.detectLife('Which laptop should I buy?'), 'choice');
  assert.strictEqual(P.detectLife('How do I stop procrastinating?'), 'problem');
  assert.strictEqual(P.detectLife("I can't wake up early"), 'problem');
});

test('разбор темы: свой вид, шесть разделов, без сторон', () => {
  assert.strictEqual(P.kindOf('topic'), 'study');
  const doc = makeDoc([], []);
  const root = P.addBlock(doc, { parents: [], text: 'Цикл Кребса', q: '' });
  P.buildSkeleton(doc, root, 'topic', 'og');
  assert.deepStrictEqual(Object.keys(doc.analysis.sections), ['what', 'why', 'parts', 'examples', 'links', 'gaps']);
  assert.strictEqual(doc.analysis.me, undefined);
  assert.strictEqual(doc.analysis.pos, undefined);
  assert.deepStrictEqual(P.analysisSteps(doc).map(s => s.key), ['what', 'why', 'parts', 'examples', 'links', 'gaps']);
  assert.deepStrictEqual(titles(doc, root), ['Что это', 'Зачем это', 'Как устроено', 'Примеры', 'Связи', 'Что непонятно']);
});

test('разбор темы на английском', () => {
  inLang('en', () => {
    const doc = makeDoc([], []);
    const root = P.addBlock(doc, { parents: [], text: 'The Krebs cycle', q: '' });
    P.buildSkeleton(doc, root, 'topic');
    assert.deepStrictEqual(titles(doc, root), ['What it is', 'Why it matters', 'How it works', 'Examples', 'Connections', 'Open questions']);
    assert.strictEqual(P.analysisSteps(doc)[0].prompt, 'What is it?');
  });
});

test('английский тренажёр: свои резолюции, папка и заметка', () => {
  inLang('en', () => {
    assert.ok(P.TRAIN_MOTIONS.length >= 30);
    P.TRAIN_MOTIONS.forEach(m => assert.match(m, /^This House\b/, m));
    assert.strictEqual(P.trainingPath(new Date(2026, 10, 2, 9, 5), () => false), 'Debate practice/Practice 2026-11-02 09-05.md');
    const t = { ...trainDoc(), motion: 'This House would ban cars from city centres', f: { 'a1.thesis': 'Poorer districts lose out' } };
    const md = P.trainingNote(t);
    assert.deepStrictEqual(cyrillicIn(md), []);
    assert.match(md, /\*\*Position:\*\* CO, Closing Opposition/);
    assert.match(md, /### 1:30 Argument 1: Poorer districts lose out/);
    assert.match(md, /prep 14:12 of 15:00, speech 6:48 of 7:00/);
    assert.deepStrictEqual(P.missingFields(t).slice(0, 2), ['Opening', 'Argument 1: why it is true']);
  });
});

test('английские вопросы на стрелках не повторяются', () => {
  const qs = Object.entries(P.EN).filter(([ru]) => ru.endsWith('?')).map(([, en]) => en);
  assert.deepStrictEqual(qs.filter((q, i) => qs.indexOf(q) !== i), []);
});

test('«Да» и «Нет» на стрелках узнаются на обоих языках', () => {
  assert.ok(P.sameQ('Yes', 'Да'));
  assert.ok(P.sameQ('No', 'Нет'));
  assert.strictEqual(P.canonQ('Yes'), 'Да');
});

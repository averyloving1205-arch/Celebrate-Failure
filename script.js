/* Celebrate Failure — Git Bash–style
   Version 3: robust multi-page script

   Works with:
   - index.html  (terminal + recent lists)
   - fails.html  (full fail log with delete)
   - mottos.html (full motto list with add)

   Data is stored in localStorage and shared across pages.
*/
(() => {
  'use strict';

  // ---------- State ----------
  const STORAGE_KEY = 'celebrate-failure:v3';

  const defaultState = {
    pending: [],
    entries: seedEntries(),
    mottos: seedMottos(),
  };

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }
    catch { return null; }
  }

  function saveState(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  // Ensure state exists
  let state = loadState() || defaultState;
  if (!loadState()) saveState(state);

  // ---------- DOM Ready ----------
  document.addEventListener('DOMContentLoaded', () => {
    const els = {
      screen: document.getElementById('screen'),
      cli: document.getElementById('cli'),
      input: document.getElementById('command'),
      list: document.getElementById('fail-list'),
      mottosList: document.getElementById('mottos'),
      failsRoot: document.getElementById('fails-root'),
      mottosRoot: document.getElementById('mottos-root'),
      confetti: document.getElementById('confetti'),
    };

    // Page routing by element presence
    if (els.cli && els.input && els.screen) initHome(els);
    if (els.failsRoot) renderFailsPage(els);
    if (els.mottosRoot) renderMottosPage(els);
  });

  // ---------- Home (index.html) ----------
  function initHome(els) {
    renderHomeLists(els);

    els.cli.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = (els.input.value || '').trim();
      if (!raw) return;
      print(els, `$ ${raw}`);
      handleCommand(els, raw);
      els.input.value = '';
    });

    // Boot text
    print(els, 'Welcome to git bash – celebrate-failure v3');
    print(els, 'Type about to read the story, or commit "I broke prod" to start.');
    help(els);
  }

  function handleCommand(els, raw) {
    const [cmd, ...rest] = tokenize(raw);
    const c = (cmd || '').toLowerCase();

    switch (c) {
      case 'help':   return help(els);
      case 'about':  return aboutCmd(els);
      case 'log':    return logCmd(els);
      case 'commit': return commitCmd(els, rest.join(' '));
      case 'push':   return pushCmd(els);
      case 'clear':  return clearScreen(els);
      case 'motto':  return mottoCmd(els, rest.join(' '));
      case 'stats':  return statsCmd(els);
      default:
        return print(els, `git: '${cmd}' is not a git command. See 'help'.`, 'err');
    }
  }

  function help(els) {
    const lines = [
      ['help', 'show available commands'],
      ['about', 'story behind the project'],
      ['log', 'print your failure log'],
      ['commit "message"', 'stage a new failure → lesson'],
      ['push', 'celebrate & save staged items'],
      ['motto "text"', 'add a team motto'],
      ['stats', 'show counts & streak'],
      ['clear', 'clear the terminal'],
    ];
    lines.forEach(([c, d]) => print(els, `${c.padEnd(18)} ${d}`, 'info'));
  }

  function aboutCmd(els) {
    print(els, '--- about celebrate-failure ---', 'info');
    print(els, 'This project is a love letter to iteration.');
    print(els, 'We fail, we learn, we commit again — like git history itself.');
    print(els, 'Inspired by terminal life, open source, and creative growth.', 'info');
    print(els, 'Built with HTML, CSS, JS — no frameworks, just curiosity.', 'info');
    print(els, 'Concept: Failure logs → lessons → a changelog of resilience.');
    print(els, 'Great for classrooms, teams, and solo devs to reframe failure.');
    print(els, '--------------------------------', 'info');
  }

  function logCmd(els) {
    if (!state.entries.length) return print(els, 'no commits yet — make one with commit "message"', 'warn');
    state.entries.slice().reverse().forEach(e => {
      print(els, `commit ${e.id} (${e.date})
  fail:   ${e.message}
  lesson: ${e.lesson}`, 'ok');
    });
  }

  function commitCmd(els, message) {
    const msg = message && message.trim() ? message.trim() : randomFailure();
    state.pending.push({ message: msg, lesson: suggestLesson(msg) });
    saveState(state);
    print(els, 'staged 1 file for commit', 'ok');
    state.pending.slice(-1).forEach((p, i) => {
      print(els, `changes staged:
  fail:   ${p.message}
  lesson: ${p.lesson}`, 'info');
    });
  }

  function pushCmd(els) {
    if (!state.pending.length) return print(els, 'nothing to push', 'warn');
    state.pending.forEach(p => {
      state.entries.push({
        id: shortId(),
        date: new Date().toLocaleDateString(),
        ...p
      });
    });
    state.pending = [];
    saveState(state);
    print(els, 'pushed to origin 🎉 failures celebrated', 'ok');
    party(els);
    renderHomeLists(els);
  }

  function mottoCmd(els, text) {
    const t = text && text.trim();
    if (!t) return print(els, 'usage: motto "text"', 'warn');
    state.mottos.push(t);
    saveState(state);
    renderHomeLists(els);
    print(els, 'motto added', 'ok');
  }

  function statsCmd(els) {
    const total = state.entries.length;
    const week = countSince(7);
    const month = countSince(30);
    print(els, `stats → total: ${total}, last 7d: ${week}, last 30d: ${month}`, 'info');
  }

  function clearScreen(els) {
    if (els.screen) els.screen.innerHTML = '';
  }

  function renderHomeLists(els) {
    // recent fails (max 5)
    if (els.list) {
      els.list.innerHTML = '';
      state.entries.slice().reverse().slice(0, 5).forEach(e => {
        const li = document.createElement('li');
        li.className = 'fail-item';
        li.innerHTML = `
          <span class="badge">fail</span>
          <div>
            <p class="lesson"><strong>${escapeHtml(e.message)}</strong><br/>→ ${escapeHtml(e.lesson)}</p>
            <p class="meta">commit ${e.id} • ${e.date}</p>
          </div>
        `;
        els.list.appendChild(li);
      });
    }
    // mottos (last 6)
    if (els.mottosList) {
      els.mottosList.innerHTML = '';
      state.mottos.slice(-6).forEach(m => {
        const li = document.createElement('li');
        li.textContent = m;
        els.mottosList.appendChild(li);
      });
    }
  }

  // ---------- fails.html ----------
  function renderFailsPage(els) {
    const root = els.failsRoot;
    root.innerHTML = '';
    const back = buttonLink('← Back to Home', 'index.html');
    const ul = document.createElement('ul');
    ul.className = 'fail-list';

    state.entries.slice().reverse().forEach(e => {
      const li = document.createElement('li');
      li.className = 'fail-item';
      li.innerHTML = `
        <span class="badge">fail</span>
        <div>
          <p class="lesson"><strong>${escapeHtml(e.message)}</strong><br/>→ ${escapeHtml(e.lesson)}</p>
          <p class="meta">commit ${e.id} • ${e.date}</p>
        </div>
        <button class="btn-del" aria-label="delete entry" title="delete">×</button>
      `;
      li.querySelector('.btn-del').addEventListener('click', () => {
        const idx = state.entries.findIndex(x => x.id === e.id);
        if (idx !== -1) {
          state.entries.splice(idx, 1);
          saveState(state);
          renderFailsPage(els);
        }
      });
      ul.appendChild(li);
    });

    root.appendChild(back);
    root.appendChild(ul);
  }

  // ---------- mottos.html ----------
  function renderMottosPage(els) {
    const root = els.mottosRoot;
    root.innerHTML = '';

    const back = buttonLink('← Back to Home', 'index.html');

    const form = document.createElement('form');
    form.style.margin = '10px 0 14px';
    form.innerHTML = `
      <label class="sr-only" for="motto-input">Add motto</label>
      <input id="motto-input" type="text" placeholder="Add a new motto…" class="command"
             style="border:1px solid hsla(203, 73%, 61%, 1.00); padding:10px; border-radius:10px; width:100%; background:#0f1518;" />
    `;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = form.querySelector('#motto-input');
      const val = (inp.value || '').trim();
      if (!val) return;
      state.mottos.push(val);
      saveState(state);
      renderMottosPage(els);
    });

    const ul = document.createElement('ul');
    ul.className = 'mottos';
    state.mottos.forEach(m => {
      const li = document.createElement('li');
      li.textContent = m;
      ul.appendChild(li);
    });

    root.appendChild(back);
    root.appendChild(form);
    root.appendChild(ul);
  }

  // ---------- Utils ----------
  function buttonLink(text, href) {
    const a = document.createElement('a');
    a.href = href;
    a.className = 'btn';
    a.textContent = text;
    return a;
  }

  function print(els, text, cls = 'line') {
    if (!els.screen) return;
    const div = document.createElement('div');
    div.className = `line ${cls}`;
    div.textContent = text;
    els.screen.appendChild(div);
    els.screen.scrollTop = els.screen.scrollHeight;
  }

  function tokenize(s) {
    // supports "double", 'single', or bare tokens
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    const out = [];
    let m;
    while ((m = re.exec(s))) out.push(m[1] ?? m[2] ?? m[3]);
    return out;
  }

  function escapeHtml(s) {
    const map = {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"};
    return String(s).replace(/[&<>"']/g, ch => map[ch]);
  }

  function shortId() {
    return Math.random().toString(36).slice(2, 9);
  }

  function countSince(days) {
    const since = Date.now() - days * 86400000;
    return state.entries.filter(e => new Date(e.date).getTime() >= since).length;
  }

  function party(els) {
    const root = document.getElementById('confetti');
    if (!root) return;
    root.innerHTML = '';
    const n = 120;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'piece';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.top = -10 + 'px';
      el.style.background = randColor();
      const dx = (Math.random() - 0.5) * 200;
      const rot = Math.random() * 720;
      const dur = 4000 + Math.random() * 2500;
      el.animate(
        [
          { transform: 'translate(0, -100vh) rotate(0deg)' },
          { transform: `translate(${dx}px, 110vh) rotate(${rot}deg)` }
        ],
        { duration: dur, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'forwards' }
      );
      root.appendChild(el);
    }
    setTimeout(() => (root.innerHTML = ''), 7000);
  }

  function randColor() {
    const p = ['#5af78e', '#57c7ff', '#f3f99d', '#ff6e67', '#ff6ac1', '#9aedfe'];
    return p[Math.floor(Math.random() * p.length)];
  }

  function seedEntries() {
    return [
      { id: shortId(), date: new Date().toLocaleDateString(), message: 'Pushed broken config to prod', lesson: 'Add CI checks & use feature flags' },
      { id: shortId(), date: new Date().toLocaleDateString(), message: 'Forgot to save before running benchmarks', lesson: 'Automate benchmarks in npm scripts' }
    ];
  }

  function seedMottos() {
    return [
      'Blameless, then curious.',
      'Ship, learn, repeat.',
      'If it hurts, document it.',
    ];
  }
})();

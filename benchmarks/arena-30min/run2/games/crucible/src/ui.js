// HUD + screens. Interface: studio/ARCHITECTURE.md (ui.js)
const WEAPON_ICONS = {
  rifle: '<svg viewBox="0 0 64 20"><path d="M2 8h34l4-3h14v4h8v3h-8l-2 3h-6l-2 5h-6l1-5H14l-3 4H5l2-4H2z" fill="currentColor"/></svg>',
  shotgun: '<svg viewBox="0 0 64 20"><path d="M2 7h44v2h16v3H46l-4 2H22l-4 5h-7l3-5H2z M26 12h12v2H26z" fill="currentColor"/></svg>',
};

export function createUI(actions) {
  const root = document.getElementById('ui-root');
  root.classList.add('ui');
  root.innerHTML = `
  <div class="hud" id="hud" data-hud>
    <div class="vignette" data-vig></div>
    <div class="dmg-ring" data-ring></div>
    <div class="xhair crosshair" id="crosshair" data-xh><i class="t"></i><i class="b"></i><i class="l"></i><i class="r"></i><i class="dot"></i></div>
    <div class="hitm" data-hit><i></i><i></i><i></i><i></i></div>
    <div class="top panel">
      <div class="wave"><span class="lbl">WAVE</span><b data-wave>1</b><span class="of">/<span data-tw>5</span></span></div>
      <div class="sep"></div>
      <div class="stat"><span class="lbl">HOSTILES</span><b data-en>0</b></div>
      <div class="sep"></div>
      <div class="stat"><span class="lbl">SCORE</span><b data-score>0</b></div>
    </div>
    <div class="breakt" data-break><span class="lbl">NEXT WAVE IN</span><b data-bt>5</b></div>
    <div class="health panel" data-hp>
      <div class="plus">+</div>
      <b data-hpn>100</b>
      <div class="bar"><div class="fill" data-hpf></div><div class="ticks"></div></div>
    </div>
    <div class="ammo panel" data-am>
      <div class="row"><b data-mag>30</b><span class="res">/ <span data-res>90</span></span></div>
      <div class="wrow"><span class="icon" data-icon></span><span class="wname" data-wn>RIFLE</span></div>
      <div class="reload" data-rl>RELOADING</div>
    </div>
    <div class="banner" data-banner><div class="bt" data-bt1></div><div class="bs" data-bs1></div></div>
  </div>
  <div class="screen" data-s="menu">
    <div class="card">
      <div class="kicker">OUTPOST DEFENSE PROTOCOL</div>
      <h1>ARENA</h1>
      <div class="btns"><button data-a="play" class="primary">PLAY</button><button data-a="settings">SETTINGS</button></div>
      <ul class="controls">
        <li><kbd>WASD</kbd> MOVE</li><li><kbd>MOUSE</kbd> AIM / FIRE</li><li><kbd>SPACE</kbd> JUMP</li>
        <li><kbd>R</kbd> RELOAD</li><li><kbd>1</kbd><kbd>2</kbd> WEAPONS</li><li><kbd>ESC</kbd> PAUSE</li>
      </ul>
    </div>
  </div>
  <div class="screen" data-s="settings">
    <div class="card">
      <div class="kicker">SYSTEM</div><h2>SETTINGS</h2>
      <label class="slider"><span>MOUSE SENSITIVITY</span><input type="range" min="0.1" max="3" step="0.05" data-sens><output data-sensv></output></label>
      <label class="slider"><span>MASTER VOLUME</span><input type="range" min="0" max="1" step="0.01" data-vol><output data-volv></output></label>
      <div class="btns"><button data-a="back" class="primary">BACK</button></div>
    </div>
  </div>
  <div class="screen" data-s="pause">
    <div class="card">
      <div class="kicker">SIMULATION HALTED</div><h2>PAUSED</h2>
      <div class="btns"><button data-a="resume" class="primary">RESUME</button><button data-a="settings">SETTINGS</button><button data-a="menu">QUIT TO MENU</button></div>
      <p class="hint">ESC / CLICK TO RESUME</p>
    </div>
  </div>
  <div class="screen" data-s="gameover">
    <div class="card bad">
      <div class="kicker">SIGNAL LOST</div><h2>YOU DIED</h2>
      <div class="results"><div><span class="lbl">SCORE</span><b data-rs></b></div><div><span class="lbl">WAVE REACHED</span><b data-rw></b></div></div>
      <div class="btns"><button data-a="restart" class="primary">RESTART</button><button data-a="menu">MAIN MENU</button></div>
    </div>
  </div>
  <div class="screen" data-s="victory">
    <div class="card good">
      <div class="kicker">ALL WAVES CLEARED</div><h2>VICTORY</h2>
      <div class="results"><div><span class="lbl">SCORE</span><b data-rs></b></div><div><span class="lbl">WAVE REACHED</span><b data-rw></b></div></div>
      <div class="btns"><button data-a="restart" class="primary">RESTART</button><button data-a="menu">MAIN MENU</button></div>
    </div>
  </div>`;

  const q = (s) => root.querySelector(`[data-${s}]`);
  const el = {
    hud: q('hud'), vig: q('vig'), ring: q('ring'), xh: q('xh'), hit: q('hit'),
    wave: q('wave'), tw: q('tw'), en: q('en'), score: q('score'), brk: q('break'), bt: q('bt'),
    hp: q('hp'), hpn: q('hpn'), hpf: q('hpf'), am: q('am'), mag: q('mag'), res: q('res'),
    icon: q('icon'), wn: q('wn'), rl: q('rl'), banner: q('banner'), b1: q('bt1'), b2: q('bs1'),
    sens: q('sens'), sensv: q('sensv'), vol: q('vol'), volv: q('volv'),
  };
  const screens = {};
  root.querySelectorAll('.screen').forEach((s) => { screens[s.dataset.s] = s; });

  let current = null, settingsFrom = 'menu', lastScore = 0, lastWave = 1;

  function syncSettings() {
    const s = (actions.getSettings && actions.getSettings()) || { sensitivity: 1, volume: 0.8 };
    el.sens.value = s.sensitivity; el.vol.value = s.volume;
    el.sensv.textContent = (+s.sensitivity).toFixed(2);
    el.volv.textContent = Math.round(s.volume * 100) + '%';
  }
  el.sens.addEventListener('input', () => { const v = +el.sens.value; el.sensv.textContent = v.toFixed(2); actions.setSensitivity && actions.setSensitivity(v); });
  el.vol.addEventListener('input', () => { const v = +el.vol.value; el.volv.textContent = Math.round(v * 100) + '%'; actions.setVolume && actions.setVolume(v); });

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]');
    if (!b) {
      // click on the pause backdrop resumes
      if (current === 'pause' && e.target === screens.pause) actions.resume && actions.resume();
      return;
    }
    e.stopPropagation();
    const a = b.dataset.a;
    if (a === 'play') actions.play && actions.play();
    else if (a === 'resume') actions.resume && actions.resume();
    else if (a === 'restart') actions.restart && actions.restart();
    else if (a === 'menu') actions.toMenu && actions.toMenu();
    else if (a === 'settings') { settingsFrom = current || 'menu'; show('settings'); }
    else if (a === 'back') show(settingsFrom);
  });

  function show(screen) {
    current = screen || null;
    for (const k in screens) screens[k].classList.toggle('on', k === current);
    root.classList.toggle('menu-bg', current === 'menu' || current === 'settings' && settingsFrom === 'menu');
    el.hud.classList.toggle('dim', !!current);
    if (current === 'settings') syncSettings();
    if (current === 'gameover' || current === 'victory') {
      screens[current].querySelector('[data-rs]').textContent = lastScore.toLocaleString('en-US');
      screens[current].querySelector('[data-rw]').textContent = String(lastWave);
    }
    const f = current && screens[current].querySelector('button.primary');
    if (f) f.focus({ preventScroll: true });
  }

  const last = {};
  function set(key, node, val) { if (last[key] !== val) { last[key] = val; node.textContent = val; } }
  function updateHUD(s) {
    if (!s) return;
    const hp = Math.max(0, Math.ceil(s.health)), mx = s.maxHealth || 100;
    if (last.hp !== hp || last.mx !== mx) {
      last.hp = hp; last.mx = mx;
      el.hpn.textContent = hp;
      el.hpf.style.transform = `scaleX(${Math.max(0, Math.min(1, hp / mx))})`;
      el.hp.classList.toggle('low', hp / mx <= 0.3);
      el.hp.classList.toggle('mid', hp / mx > 0.3 && hp / mx <= 0.6);
    }
    set('mag', el.mag, s.ammo);
    set('res', el.res, s.reserve);
    if (last.w !== s.weapon) {
      last.w = s.weapon;
      const w = String(s.weapon || '').toLowerCase();
      el.wn.textContent = w.toUpperCase();
      el.icon.innerHTML = WEAPON_ICONS[w] || WEAPON_ICONS.rifle;
    }
    if (last.rl !== !!s.reloading) { last.rl = !!s.reloading; el.am.classList.toggle('reloading', last.rl); }
    const lowAmmo = s.ammo === 0 ? 2 : (s.ammo <= Math.max(3, (s.maxAmmo || 30) * 0.25) ? 1 : 0);
    if (last.la !== lowAmmo) { last.la = lowAmmo; el.am.classList.toggle('low', lowAmmo === 1); el.am.classList.toggle('empty', lowAmmo === 2); }
    set('wave', el.wave, s.wave); set('tw', el.tw, s.totalWaves);
    set('en', el.en, s.enemiesAlive);
    if (last.sc !== s.score) { last.sc = s.score; el.score.textContent = (s.score || 0).toLocaleString('en-US'); }
    lastScore = s.score || 0; lastWave = s.wave || 1;
    const bt = s.breakTime > 0 ? Math.ceil(s.breakTime) : 0;
    if (last.bt !== bt) { last.bt = bt; el.brk.classList.toggle('on', bt > 0); el.bt.textContent = bt; }
  }

  let hitTimer = 0;
  function hitMarker(kill) {
    el.hit.classList.remove('on', 'kill'); void el.hit.offsetWidth;
    el.hit.classList.add('on'); if (kill) el.hit.classList.add('kill');
    el.xh.classList.remove('kick'); void el.xh.offsetWidth; el.xh.classList.add('kick');
    clearTimeout(hitTimer); hitTimer = setTimeout(() => el.hit.classList.remove('on', 'kill'), kill ? 220 : 150);
  }

  // pool of damage arcs
  const arcs = [];
  for (let i = 0; i < 6; i++) { const d = document.createElement('div'); d.className = 'arc'; d.innerHTML = '<i></i>'; el.ring.appendChild(d); arcs.push(d); }
  let arcIdx = 0;
  function damageIndicator(angleRad) {
    const d = arcs[arcIdx++ % arcs.length];
    d.style.transform = `rotate(${angleRad}rad)`;
    d.classList.remove('on'); void d.offsetWidth; d.classList.add('on');
  }
  function flash() { el.vig.classList.remove('on'); void el.vig.offsetWidth; el.vig.classList.add('on'); }
  let banT = 0;
  function banner(text, sub) {
    el.b1.textContent = text || ''; el.b2.textContent = sub || '';
    el.banner.classList.remove('on'); void el.banner.offsetWidth; el.banner.classList.add('on');
    clearTimeout(banT); banT = setTimeout(() => el.banner.classList.remove("on"), 2000);
  }

  show('menu');
  return { show, updateHUD, hitMarker, damageIndicator, banner, flash };
}

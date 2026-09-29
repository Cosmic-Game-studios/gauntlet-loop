export class HUD {
  constructor() {
    const root = document.getElementById('hud');
    root.innerHTML = `
      <div id="h-top"><div class="panel"><span id="h-wave">WAVE 1</span><span class="sep">|</span><span id="h-score">0</span><span class="sep">|</span><span id="h-left">0 LEFT</span></div></div>
      <div id="h-health" class="panel"><div class="lbl">HEALTH</div><div class="row"><span id="h-hpnum">100</span><div id="h-hpbar"><div id="h-hpfill"></div></div></div></div>
      <div id="h-ammo" class="panel"><div class="lbl" id="h-wname">RIFLE</div><div><span id="h-mag">30</span><span id="h-res"> / 90</span></div></div>
      <div id="h-cross"><i class="t"></i><i class="b"></i><i class="l"></i><i class="r"></i><i class="dot"></i></div>
      <div id="h-hit"><i></i><i></i><i></i><i></i></div>
      <div id="h-dmgdir"></div>
      <div id="h-flash"></div>
      <div id="h-banner"></div>
      <div id="h-reload">RELOADING</div>`;
    this.root = root;
    this.$ = id => document.getElementById(id);
    this.el = {};
    for (const id of ['h-wave', 'h-score', 'h-left', 'h-hpnum', 'h-hpfill', 'h-wname', 'h-mag', 'h-res', 'h-cross', 'h-hit', 'h-dmgdir', 'h-flash', 'h-banner', 'h-reload']) this.el[id] = this.$(id);
    this.hitT = 0; this.flashT = 0; this.bannerT = 0; this.dirs = [];
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div'); d.className = 'dmgarc'; this.el['h-dmgdir'].appendChild(d);
      this.dirs.push({ el: d, t: 0, x: 0, z: 0 });
    }
    this.dirIdx = 0; this.cache = {};
  }
  set(key, el, val) { if (this.cache[key] !== val) { this.cache[key] = val; el.textContent = val; } }
  hitMarker(kill) {
    this.hitT = 0.25;
    const e = this.el['h-hit']; e.classList.toggle('kill', !!kill); e.style.opacity = 1;
  }
  damage(fromPos) {
    this.flashT = 0.35;
    if (!fromPos) return;
    const d = this.dirs[this.dirIdx++ % this.dirs.length];
    d.x = fromPos.x; d.z = fromPos.z; d.t = 1.2;
  }
  banner(text, dur = 2.5) { this.el['h-banner'].textContent = text; this.bannerT = dur; }
  update(dt, s) {
    this.set('wave', this.el['h-wave'], 'WAVE ' + s.wave + ' / 5');
    this.set('score', this.el['h-score'], String(s.score));
    this.set('left', this.el['h-left'], s.breakText || (s.enemiesAlive + ' LEFT'));
    const hp = Math.ceil(s.health);
    this.set('hp', this.el['h-hpnum'], String(hp));
    if (this.cache.hpw !== hp) { this.cache.hpw = hp; this.el['h-hpfill'].style.width = hp + '%'; this.el['h-hpfill'].style.background = hp > 35 ? '#f4f4f8' : '#ff3b4a'; }
    this.set('wn', this.el['h-wname'], s.weapon.toUpperCase());
    this.set('mag', this.el['h-mag'], String(s.ammo));
    this.set('res', this.el['h-res'], ' / ' + s.reserve);
    const rl = s.reloading ? 'block' : (s.ammo === 0 && s.reserve > 0 ? 'block' : 'none');
    if (this.cache.rl !== rl) { this.cache.rl = rl; this.el['h-reload'].style.display = rl; }
    this.set('rlt', this.el['h-reload'], s.reloading ? 'RELOADING' : 'PRESS R TO RELOAD');
    const gap = Math.round(6 + s.spread * 14);
    if (this.cache.gap !== gap) { this.cache.gap = gap; this.el['h-cross'].style.setProperty('--gap', gap + 'px'); }
    if (this.hitT > 0) { this.hitT -= dt; if (this.hitT <= 0) this.el['h-hit'].style.opacity = 0; }
    if (this.flashT > 0) { this.flashT -= dt; this.el['h-flash'].style.opacity = Math.max(0, this.flashT / 0.35 * 0.45); }
    if (this.bannerT > 0) { this.bannerT -= dt; this.el['h-banner'].style.opacity = Math.min(1, this.bannerT * 2); }
    for (const d of this.dirs) {
      if (d.t <= 0) { if (d.el.style.opacity !== '0') d.el.style.opacity = 0; continue; }
      d.t -= dt;
      const dx = d.x - s.px, dz = d.z - s.pz;
      // angle relative to view: forward is -z rotated by yaw
      const ang = Math.atan2(dx, -dz) + s.yaw; // world angle of source (clockwise from -z) minus facing
      d.el.style.transform = `translate(-50%,-50%) rotate(${ang * 180 / Math.PI}deg)`;
      d.el.style.opacity = Math.min(1, d.t);
    }
  }
  show(v) { this.root.style.display = v ? 'block' : 'none'; }
}

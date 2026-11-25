/* A copy of Aspera Biomedicines' own homepage 3D world (its website's js/world.js), run here so the portfolio slide shows the
   site's real motion. Unchanged except that positions are measured against this canvas instead of the window, because
   here the canvas sits inside one slide rather than behind a whole page (pose, near and the pointer), and the pointer moves
   the window only while it is over this canvas (a grid has other cards beside it). 2026-11-25. */
/* ============================================================================
   Aspera — the homepage's 3D world. Raw WebGL2, no library.
   One fixed canvas behind the whole page. Two objects are drawn into it, each
   placed INSIDE a DOM box marked data-slot, so layout stays in CSS and the 3D
   simply follows the page:
     figure        one resting tumor in any page's box (science hero): the same
                   object as the homepage, so the concept looks the same everywhere.
     hero / core   one tumor: blue cells around a red core of cancer stem cells.
                   Scrolling the hero pulls the blue cells away; the bare core then
                   settles into a `core` slot if the page has one, else scrolls off
                   with the hero.
     a / b         the same tumor twice, under traditional therapy and under
                   Rebecsinib, stepped through three moments in time.
   Everything is drawn as lit sphere impostors (one point sprite per sphere).

   Progressive enhancement: this file adds html.world-on only once it is drawing.
   Without WebGL2, or under reduced motion, it does nothing and the page shows its
   still images instead. These are ILLUSTRATIONS, labelled as such in the markup.
   ========================================================================== */
(function () {
  'use strict';
  var canvas = document.getElementById('world');
  if (!canvas || window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) return;

  /* ── tumor cells ───────────────────────────────────────────────────────── */
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var R = rng(11), cells = [];                        /* x,y,z, radius, type, seed — type 0 bulk · 1 stem */
  function shell(n, rad, cr) {
    for (var i = 0; i < n; i++) {                     /* Fibonacci sphere: even packing, no poles */
      var y = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - y * y), th = i * 2.399963 + R() * 0.25;
      var k = rad * (1 + (R() - 0.5) * 0.09);
      cells.push(Math.cos(th) * rr * k, y * k, Math.sin(th) * rr * k, cr * (0.86 + R() * 0.3), 0, R());
    }
  }
  shell(210, 1.0, 0.142);
  shell(96, 0.71, 0.13);
  for (var s = 0; s < 14; s++) {                      /* a few strays break the perfect silhouette */
    var u = R() * 2 - 1, a = R() * 6.2832, q = Math.sqrt(1 - u * u), d = 1.16 + R() * 0.2;
    cells.push(Math.cos(a) * q * d, u * d, Math.sin(a) * q * d, 0.07 + R() * 0.045, 0, R());
  }
  for (var c = 0; c < 15;) {                          /* the core: a rare population of stem cells (Scott, 11 Nov 2026: a third of the old 46) */
    var x = R() * 2 - 1, yy = R() * 2 - 1, z = R() * 2 - 1;
    if (x * x + yy * yy + z * z > 1) continue;
    cells.push(x * 0.43, yy * 0.43, z * 0.43, 0.105 + R() * 0.04, 1, R());
    c++;
  }

  /* ── shaders ───────────────────────────────────────────────────────────── */
  var VS = [
    '#version 300 es',
    'in vec3 aPos; in vec3 aInfo;',
    'uniform mat3 uRot; uniform vec3 uWin; uniform vec2 uShift;',
    'uniform float uTime,uOpen,uBulk,uCore,uVis,uScale,uCamZ,uFocal,uAspect,uH,uA,uB,uGlow,uMaxPt;',
    'out vec3 vRel; out float vRad,vType,vSeed,vAlpha,vViewZ,vPtScale;',
    'void main(){',
    '  float r=aInfo.x, type=aInfo.y, seed=aInfo.z;',
    '  float bulk=1.0-type, stem=type;',
    '  vec3 p=aPos, dir=normalize(aPos+1e-4); float alpha=1.0;',
    '  p*=1.0+mix(0.03,0.055,stem)*sin(uTime*mix(0.6,1.25,stem)+seed*40.0);',       /* breathing */
    '  p+=0.022*vec3(sin(uTime*0.7+seed*91.0),cos(uTime*0.5+seed*57.0),sin(uTime*0.9+seed*23.0));',
    '  float pres=clamp((mix(uBulk,uCore,stem)-fract(seed*7.317+0.13)*0.9)/0.1,0.0,1.0);',  /* how much of each */
    '  pres=pres*pres*(3.0-2.0*pres);',                                              /* population is left   */
    '  p+=dir*(1.0-pres)*mix(0.9,0.6,stem); r*=pres;',                              /* the rest drift off   */
    '  float open=uOpen*(0.55+0.9*seed);',                                           /* hero scroll: bulk parts */
    '  p+=dir*bulk*open*(1.2+2.4*seed);',
    '  r*=1.0-bulk*smoothstep(0.15,1.0,open)*0.75;',
    '  alpha=1.0-bulk*smoothstep(0.45,1.0,open);',
    '  p*=uScale; r*=uScale*uVis;',
    '  vec3 v=uRot*p;',
    '  float front=smoothstep(-0.2,0.4,v.z);',                                         /* the window: parts the */
    '  vec2 d=v.xy-uWin.xy; float dl=length(d);',                                      /* camera-facing bulk cells */
    '  float w=(1.0-smoothstep(uWin.z*0.3,uWin.z,dl))*front*bulk;',
    '  v.xy+=(d/(dl+1e-3))*w*0.3;',
    '  r*=1.0-0.94*w;',
    '  vRel=v; vRad=r; vType=type; vSeed=seed; vAlpha=alpha;',
    '  v.z-=uCamZ; vViewZ=v.z;',
    '  gl_Position=vec4(v.x*uFocal/uAspect, v.y*uFocal, uA*v.z+uB, -v.z);',
    '  gl_Position.xy+=uShift*gl_Position.w;',
    '  float px=r*uFocal*uH/(-v.z);',
    '  if(uGlow>0.5){ px*=stem*4.2; }',                                                /* only the core glows */
    '  vPtScale=px>uMaxPt? uMaxPt/px : 1.0;',
    '  gl_PointSize=min(px,uMaxPt);',
    '}'
  ].join('\n');
  var FS = [
    '#version 300 es',
    'precision highp float;',
    'in vec3 vRel; in float vRad,vType,vSeed,vAlpha,vViewZ,vPtScale;',
    'uniform float uA,uB,uGlow,uA2C,uCamZ,uCore,uVis;',
    'out vec4 o;',
    'void main(){',
    '  gl_FragDepth=gl_FragCoord.z;',
    '  vec2 q=(gl_PointCoord*2.0-1.0)*vPtScale; q.y=-q.y;',
    '  float r2=dot(q,q); float edge=fwidth(r2);',
    '  if(uGlow>0.5){ float g=exp(-r2*5.5)*(1.0-smoothstep(0.55,1.0,r2)); o=vec4(vec3(1.0,0.30,0.20)*g*0.075*vAlpha*uVis,0.0); return; }',
    '  if(r2>1.0) discard;',
    '  float z=sqrt(1.0-r2); vec3 n=vec3(q,z);',
    '  vec3 L=normalize(vec3(-0.55,0.65,0.52));',
    '  float diff=max(dot(n,L),0.0), fres=pow(1.0-z,2.4);',
    '  float spec=pow(max(dot(reflect(-L,n),vec3(0.0,0.0,1.0)),0.0),38.0);',
    '  vec3 col;',
    '  if(vType<0.5){',                                                                /* tumor cell — brand teal family */
    '    vec3 deep=vec3(0.012,0.085,0.125), mid=vec3(0.115,0.38,0.50)*(0.84+0.32*vSeed);',
    '    col=mix(deep,mid,diff*0.9+0.1)+fres*vec3(0.36,0.62,0.72)*0.75+spec*0.22;',
    '    float warm=pow(max(dot(n,normalize(-vRel)),0.0),2.0)/(1.0+2.2*dot(vRel,vRel));',  /* core light on inner faces */
    '    col+=warm*vec3(1.0,0.26,0.16)*1.15*uCore;',
    '  }else{',                                                                        /* cancer stem cell */
    '    vec3 deep=vec3(0.30,0.025,0.03), mid=vec3(0.86,0.24,0.18)*(0.88+0.24*vSeed);',
    '    col=mix(deep,mid,diff*0.85+0.15)+pow(z,3.0)*vec3(1.0,0.42,0.26)*0.30+fres*vec3(1.0,0.56,0.46)*0.45+spec*0.30;',
    '  }',
    '  float fog=smoothstep(-1.25,1.35,-(vViewZ+uCamZ));',                             /* depth cue toward onyx */
    '  col=mix(col,vec3(0.0,0.067,0.098),fog*0.62);',
    '  float vz=vViewZ+z*vRad;',
    '  gl_FragDepth=((uA*vz+uB)/(-vz))*0.5+0.5;',
    '  float cov=1.0-smoothstep(1.0-edge*1.5,1.0,r2);',
    '  o=vec4(col,mix(1.0,cov*vAlpha,uA2C));',
    '}'
  ].join('\n');

  function compile(type, src) {
    var sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn('world shader:', gl.getShaderInfoLog(sh)); return null; }
    return sh;
  }
  var vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'aPos'); gl.bindAttribLocation(prog, 1, 'aInfo');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('world link:', gl.getProgramInfoLog(prog)); return; }
  gl.useProgram(prog);
  var U = {};
  ['uRot', 'uWin', 'uShift', 'uTime', 'uOpen', 'uBulk', 'uCore', 'uVis', 'uScale', 'uCamZ', 'uFocal', 'uAspect', 'uH', 'uA', 'uB', 'uGlow', 'uMaxPt', 'uA2C'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  function mesh(data) {
    var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    return { vao: vao, count: data.length / 6 };
  }
  var TUMOR = mesh(cells);
  /* A distinct loose population for regenerative stem cells: no malignant core.
     This is a conceptual illustration, not a molecular or clinical simulation. */
  var regenerative = [];
  for (var rc = 0; rc < 24; rc++) {
    var ry = 1 - 2 * (rc + 0.5) / 24, rr = Math.sqrt(1 - ry * ry), ra = rc * 2.399963;
    regenerative.push(Math.cos(ra) * rr * 0.8, ry * 0.8, Math.sin(ra) * rr * 0.8, 0.18 + R() * 0.04, 0, R());
  }
  var REGENERATIVE = mesh(regenerative);

  var FOCAL = 3.17, NEAR = 0.4, FAR = 60;             /* ~35° lens */
  gl.uniform1f(U.uFocal, FOCAL);
  gl.uniform1f(U.uA, (FAR + NEAR) / (NEAR - FAR));
  gl.uniform1f(U.uB, 2 * FAR * NEAR / (NEAR - FAR));
  gl.uniform1f(U.uMaxPt, gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]);
  gl.uniform1f(U.uA2C, gl.getParameter(gl.SAMPLES) > 0 ? 1 : 0);
  gl.clearColor(0, 0, 0, 0);

  /* ── the page ──────────────────────────────────────────────────────────── */
  var slots = {};
  Array.prototype.forEach.call(document.querySelectorAll('[data-slot]'), function (el) { slots[el.getAttribute('data-slot')] = el; });
  var hero = document.querySelector('.chero'), mech = document.querySelector('.mech');
  var story = document.querySelector('.story');
  var steps = mech ? mech.querySelectorAll('.mech__step') : [];
  var halos = [document.getElementById('haloA'), document.getElementById('haloB')];
  if (!(hero && slots.hero) && !slots.figure) return;

  /* What each therapy leaves, at each moment. bulk/core = share of each population present. */
  var MECH = [
    [{ bulk: 1.00, core: 1, scale: 1.00 }, { bulk: 1.00, core: 1.00, scale: 1 }],  /* at treatment */
    [{ bulk: 0.40, core: 1, scale: 1.00 }, { bulk: 0.34, core: 0.18, scale: 1 }],  /* short term: same shrink, one core gone */
    [{ bulk: 1.00, core: 1, scale: 1.10 }, { bulk: 0.06, core: 0.00, scale: 1 }]   /* long term    */
  ];

  function inst(m) { return { mesh: m, x: 0, y: 0, cam: 8, bulk: 1, core: 1, open: 0, winx: 0, winy: 0, winr: 0.6, vis: 0, scale: 1, spin: 0 }; }
  var cur = [inst(TUMOR), inst(TUMOR)], tgt = [inst(), inst()];
  cur[1].spin = 2.1;
  var EASED = ['bulk', 'core', 'open', 'winx', 'winy', 'winr', 'vis', 'scale'];
  var P1 = {}, P2 = {};

  var W = 0, H = 0, cw = 1, ch = 1, aspect = 1;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = canvas.clientWidth; ch = canvas.clientHeight;
    var w = Math.round(cw * dpr), h = Math.round(ch * dpr);
    if (!w || !h) return;
    if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; gl.viewport(0, 0, W, H); }
    aspect = W / H;
    gl.uniform1f(U.uAspect, aspect); gl.uniform1f(U.uH, H);
  }
  /* Put an object inside a DOM box: `fill` = how much of the box's half-size one model unit takes. */
  function pose(o, r, fill) {
    var c = canvas.getBoundingClientRect();
    o.x = ((r.left - c.left + r.width / 2) / cw) * 2 - 1;
    o.y = 1 - ((r.top - c.top + r.height / 2) / ch) * 2;
    o.cam = FOCAL * ch / Math.max(2, Math.min(r.width, r.height) * fill);
  }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return t * t * (3 - 2 * t); }
  function near(r) { var vh = window.innerHeight; return r.width > 0 && r.bottom > -vh * 0.15 && r.top < vh * 1.15; }

  var step = -1, lastQ = -1;
  function setStep(n) {
    if (n === step) return;
    step = n;
    mech.setAttribute('data-step', n);
    for (var i = 0; i < steps.length; i++) steps[i].classList.toggle('is-on', i === n);
  }

  /* pointer — mouse only; it moves the hero's window */
  var ptr = { x: 0, y: 0, on: 0, tx: 0, ty: 0, ton: 0 }, heroLive = false;
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      var c = canvas.getBoundingClientRect(), inside = e.clientX >= c.left && e.clientX <= c.right && e.clientY >= c.top && e.clientY <= c.bottom;
      ptr.tx = ((e.clientX - c.left) / cw) * 2 - 1; ptr.ty = 1 - ((e.clientY - c.top) / ch) * 2; ptr.ton = inside ? 1 : 0;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { ptr.ton = 0; }, { passive: true });
  }

  function targets(t) {
    var A = tgt[0], B = tgt[1], r, vh = window.innerHeight;
    A.vis = B.vis = 0; heroLive = false;
    cur[0].mesh = cur[1].mesh = TUMOR;

    if (story && document.documentElement.classList.contains('story-on') && slots['story-tumor']) {
      var sr = story.getBoundingClientRect();
      if (sr.top < vh * 0.45 && sr.bottom > vh * 0.55) {
        var sn = Number(story.getAttribute('data-story-step')) || 0;
        pose(A, slots['story-tumor'].getBoundingClientRect(), 0.82);
        A.vis = ease(clamp((vh * 0.45 - sr.top) / (vh * 0.3)));
        A.open = 0; A.bulk = sn === 0 ? 0.18 : 1; A.core = 1; A.scale = 1;
        A.winx = 0.15; A.winy = 0.1; A.winr = 0.55;
        if (sn > 1) {
          cur[1].mesh = REGENERATIVE;
          pose(B, slots['story-aging'].getBoundingClientRect(), 0.82);
          B.vis = A.vis; B.open = 0; B.bulk = 0.64; B.core = 0; B.scale = 1;
          B.winx = B.winy = 0; B.winr = 0;
        }
        return;
      }
    }


    if (mech && slots.a && slots.b && near(r = slots.a.getBoundingClientRect())) {
      var mr = mech.getBoundingClientRect(), span = mr.height - vh;
      var q = span > 0 ? clamp(-mr.top / span) : 0, n = q < 0.34 ? 0 : (q < 0.67 ? 1 : 2);
      setStep(n);
      if (Math.abs(q - lastQ) > 0.002) { lastQ = q; mech.style.setProperty('--q', q.toFixed(3)); }
      pose(A, r, 0.84); pose(B, slots.b.getBoundingClientRect(), 0.84);
      var S = MECH[n];
      A.bulk = S[0].bulk; A.core = S[0].core; A.scale = S[0].scale;
      B.bulk = S[1].bulk; B.core = S[1].core; B.scale = S[1].scale;
      A.open = B.open = 0; A.vis = B.vis = 1;
      A.winx = B.winx = 0.05; A.winy = B.winy = 0.08;
      A.winr = n === 0 ? 0 : 0.5;                      /* at treatment: traditional therapy shows only tumor cells (it isn't looking at the core), */
      B.winr = n === 0 ? 0.74 : 0.5;                   /* while Rebecsinib's side opens wide on it */
      return;
    }
    if (slots.figure && near(r = slots.figure.getBoundingClientRect())) {           /* a page's own tumor, at rest */
      pose(A, r, 0.84);
      A.open = 0; A.bulk = 1; A.core = 1; A.scale = 1; A.vis = 1;
      A.winx = 0.2 + 0.1 * Math.sin(t * 0.21); A.winy = 0.12 + 0.08 * Math.cos(t * 0.17); A.winr = 0.6;
      heroLive = true;                                                               /* the pointer carries its window */
      return;
    }
    if (!hero || !slots.hero) return;
    r = slots.core ? slots.core.getBoundingClientRect() : null;
    if (r ? r.bottom > -ch * 0.1 : hero.getBoundingClientRect().bottom > 0) {
      var hr = hero.getBoundingClientRect(), hs = hr.height - vh;
      var hp = hs > 0 ? clamp(-hr.top / hs) : (hr.top < 0 ? 1 : 0), e = ease(hp);
      pose(P1, slots.hero.getBoundingClientRect(), 0.82);
      A.x = P1.x * (1 - e); A.y = P1.y * (1 - e); A.cam = P1.cam * (1 - 0.42 * e);   /* drifts to centre, pushes in */
      if (r && r.width) {                                                            /* then settles into its slot */
        pose(P2, r, 1.5);
        var k = ease(clamp((ch * 1.05 - (r.top + r.height / 2)) / (ch * 0.55)));
        A.x += (P2.x - A.x) * k; A.y += (P2.y - A.y) * k; A.cam += (P2.cam - A.cam) * k;
      } else {                                                                         /* no slot: scrolls off with the hero */
        A.y += clamp((vh - hr.bottom) / vh) * 2;
      }
      A.open = e; A.bulk = 1; A.core = 1; A.scale = 1; A.vis = 1;
      A.winx = 0.2 + 0.1 * Math.sin(t * 0.21); A.winy = 0.12 + 0.08 * Math.cos(t * 0.17); A.winr = 0.6;
      heroLive = hp < 0.3;
    }
  }

  var rot = new Float32Array(9);
  function drawOne(o, t, glow) {
    var ay = t * 0.085 + o.spin + o.open * 1.5 + (o === cur[0] ? ptr.x * 0.12 * ptr.on : 0);
    var ax = 0.24 - (o === cur[0] ? ptr.y * 0.08 * ptr.on : 0);
    var cy = Math.cos(ay), sn = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax);
    rot[0] = cy; rot[1] = sb * sn; rot[2] = -cb * sn; rot[3] = 0; rot[4] = cb; rot[5] = sb; rot[6] = sn; rot[7] = -sb * cy; rot[8] = cb * cy;
    gl.bindVertexArray(o.mesh.vao);
    gl.uniformMatrix3fv(U.uRot, false, rot);
    var wx = o.winx, wy = o.winy;
    if (o === cur[0] && ptr.on > 0.001) {              /* the pointer carries the window */
      var k = (o.cam - 0.7) / FOCAL;
      var px = Math.max(-1.5, Math.min(1.5, (ptr.x - o.x) * k * aspect)), py = Math.max(-1.5, Math.min(1.5, (ptr.y - o.y) * k));
      wx += (px - wx) * ptr.on; wy += (py - wy) * ptr.on;
    }
    gl.uniform3f(U.uWin, wx, wy, o.winr);
    gl.uniform2f(U.uShift, o.x, o.y);
    gl.uniform1f(U.uOpen, o.open); gl.uniform1f(U.uBulk, o.bulk); gl.uniform1f(U.uCore, o.core);
    gl.uniform1f(U.uVis, o.vis); gl.uniform1f(U.uScale, o.scale); gl.uniform1f(U.uCamZ, o.cam);
    gl.uniform1f(U.uGlow, glow);
    gl.drawArrays(gl.POINTS, 0, o.mesh.count);
  }

  var blank = false;
  function frame(now) {
    requestAnimationFrame(frame);
    var t = now / 1000, i, k, o, g, any = false;
    targets(t);
    ptr.ton = heroLive ? ptr.ton : 0;
    ptr.x += (ptr.tx - ptr.x) * 0.09; ptr.y += (ptr.ty - ptr.y) * 0.09; ptr.on += ((heroLive ? ptr.ton : 0) - ptr.on) * 0.06;
    for (i = 0; i < 2; i++) {
      o = cur[i]; g = tgt[i];
      /* Position follows the page exactly (anything eased would lag the scroll). While an object is
         hidden its state is set, not eased, so it never flies in from where it last was. */
      if (g.vis > 0) { o.x = g.x; o.y = g.y; o.cam = g.cam; }
      if (o.vis < 0.02 && g.vis > 0) for (k = 0; k < EASED.length; k++) if (EASED[k] !== 'vis') o[EASED[k]] = g[EASED[k]];
      for (k = 0; k < EASED.length; k++) o[EASED[k]] += (g[EASED[k]] - o[EASED[k]]) * (EASED[k] === 'vis' ? 0.14 : 0.07);
      if (o.vis > 0.004) any = true;
    }
    for (i = 0; i < 2; i++) if (halos[i]) {            /* soft teal bloom behind each tumor */
      o = cur[i];
      var rpx = FOCAL / o.cam * ch / 2 * 2.3 * (1 - 0.4 * o.open);
      halos[i].style.opacity = (o.vis * 0.95).toFixed(3);
      halos[i].style.transform = 'translate3d(' + ((o.x + 1) / 2 * cw).toFixed(1) + 'px,' + ((1 - o.y) / 2 * ch).toFixed(1) + 'px,0) scale(' + (rpx / 100).toFixed(3) + ')';
    }
    if (!any) { if (!blank) { gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); blank = true; } return; }
    blank = false;
    gl.uniform1f(U.uTime, t);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    for (i = 0; i < 2; i++) if (cur[i].vis > 0.004) drawOne(cur[i], t, 0);
    /* core glow, added over everything: reads as light coming through the tissue */
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE); gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (i = 0; i < 2; i++) if (cur[i].vis > 0.004) drawOne(cur[i], t, 1);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  /* The first measure can land before layout has settled (seen on iPad: a cold load drew the
     tumor into a part-width surface until a scroll resized the page). Re-measure whenever the
     canvas box itself changes, and once more when the page has finished loading or is restored. */
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('load', resize);
  window.addEventListener('pageshow', resize);
  document.documentElement.classList.add('world-on');   /* swaps the stills for the live world */
  if (mech) setStep(0);
  requestAnimationFrame(frame);
})();

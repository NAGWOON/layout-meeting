/* ================================================================
   sphere-canvas.js — Geometric Wireframe Tower
   Ref: stacked wireframe cubes + parametric grids + sphere nodes
   Palette: black / white / silver / blue
   ================================================================ */

(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────────── */
  const ROT_SPEED  = 0.0018;          // Y-axis rotation per frame
  const TILT_X_DEG = 22;              // static X-tilt (isometric feel)
  const TILT_X     = TILT_X_DEG * Math.PI / 180;

  /* ── Colours ─────────────────────────────────────────────────── */
  const C = {
    edge:   [120, 152, 215],   // mid silvery blue — cube edges
    edgeHi: [195, 215, 248],   // bright silver-white — front edges
    edgeDim:[70,  100, 175],   // receding edges
    grid:   [80,  108, 172],   // grid mesh lines
    dot:    [230, 238, 255],   // vertex sphere dots — near white
    dotDim: [120, 148, 210],   // back-facing dots
    conn:   [100, 136, 200],   // dotted connector lines
  };

  function rgba([r, g, b], a) { return `rgba(${r},${g},${b},${a.toFixed(3)})`; }

  /* ── 3-D math ────────────────────────────────────────────────── */
  function rotY([x, y, z], a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [x * c + z * s, y, -x * s + z * c];
  }
  function rotX([x, y, z], a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [x, y * c - z * s, y * s + z * c];
  }
  const VERT_OFFSET = 0.02;  // shift scene slightly downward (fraction of H)
  function project([x, y, z], W, H, D) {
    const sc = D / (D + z + 200);
    return [W / 2 + x * sc, H * (0.5 + VERT_OFFSET) + y * sc, sc];
  }

  /* ── Geometry builders ──────────────────────────────────────── */
  // Returns 8 vertices of an axis-aligned cube centred at (cx,cy,cz)
  function cubeVerts(cx, cy, cz, s) {
    const h = s / 2;
    return [
      [cx-h, cy-h, cz-h], [cx+h, cy-h, cz-h],   // 0,1 — top-front
      [cx+h, cy+h, cz-h], [cx-h, cy+h, cz-h],   // 2,3 — bottom-front
      [cx-h, cy-h, cz+h], [cx+h, cy-h, cz+h],   // 4,5 — top-back
      [cx+h, cy+h, cz+h], [cx-h, cy+h, cz+h],   // 6,7 — bottom-back
    ];
  }
  const CUBE_EDGES = [
    [0,1],[1,2],[2,3],[3,0],   // front face
    [4,5],[5,6],[6,7],[7,4],   // back face
    [0,4],[1,5],[2,6],[3,7],   // connecting
  ];

  // Flat grid in XZ plane at a given Y, optionally rippled
  function gridLines(cx, cz, w, d, nx, nz, y, ripple = 0) {
    const lines = [];
    const dx = w / nx, dz = d / nz;
    const x0 = cx - w / 2, z0 = cz - d / 2;

    // X-direction lines
    for (let j = 0; j <= nz; j++) {
      const z = z0 + j * dz;
      const pts = [];
      for (let i = 0; i <= nx; i++) {
        const x = x0 + i * dx;
        const ry = y + Math.sin(x * 0.028 + z * 0.022) * ripple;
        pts.push([x, ry, z]);
      }
      for (let i = 0; i < pts.length - 1; i++) lines.push([pts[i], pts[i+1]]);
    }
    // Z-direction lines
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i * dx;
      const pts = [];
      for (let j = 0; j <= nz; j++) {
        const z = z0 + j * dz;
        const ry = y + Math.sin(x * 0.028 + z * 0.022) * ripple;
        pts.push([x, ry, z]);
      }
      for (let j = 0; j < pts.length - 1; j++) lines.push([pts[j], pts[j+1]]);
    }
    return lines;
  }

  /* ── Scene definition ──────────────────────────────────────── */
  // All units are in "world space" pixels (scaled to canvas at runtime)
  // Y is DOWN in canvas coords, so higher on screen = more negative Y

  const CUBES = [
    // Main tower: large top cube + inner nested cube
    { cx:   0, cy: -290, cz:   0, s: 200 },   // outer top
    { cx:   0, cy: -290, cz:   0, s: 118 },   // inner top (nested)

    // Staircase — offset cubes descending left→right
    { cx: -90, cy: -140, cz: -40, s: 142 },   // upper-left
    { cx:  60, cy: -148, cz:  30, s: 100 },   // upper-right (smaller)

    // Middle
    { cx: -25, cy:  -10, cz:   0, s: 134 },   // mid-centre

    // Lower stair
    { cx: -70, cy:  130, cz: -20, s: 100 },   // lower-left
    { cx:  55, cy:  135, cz:  25, s:  80 },   // lower-right

    // Base
    { cx:   5, cy:  255, cz:  10, s: 156 },   // bottom cube
  ];

  // Dotted-line connectors between specific cube vertex pairs
  // (indices reference CUBES array — we'll pick top-bottom vertex pairs)
  const CONNECTORS = [
    { from: [0, 2], to: [2, 0] },   // top-cube bottom → mid-left top
    { from: [2, 6], to: [4, 1] },   // upper-left bottom → mid top
    { from: [4, 6], to: [5, 0] },   // mid bottom → lower-left top
    { from: [6, 6], to: [7, 1] },   // lower-right bottom → base top
  ];

  // Grid planes
  const GRIDS = [
    // Upper parametric mesh (rippled)
    { cx: 0, cz: 0, w: 380, d: 380, nx: 14, nz: 14, y: -60,  ripple: 28 },
    // Lower flat grid
    { cx: 0, cz: 0, w: 420, d: 420, nx: 16, nz: 16, y: 175,  ripple: 0  },
  ];

  /* ── Renderer ───────────────────────────────────────────────── */
  function init() {
    const canvas = document.getElementById('sphereCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let rotAngle = 0;
    let alive    = true;
    let rafId;

    function resize() {
      const p = canvas.parentElement;
      canvas.width  = p.offsetWidth;
      canvas.height = p.offsetHeight;
    }

    // Transform a world point → projected [sx, sy, depth(0–1)]
    function tx(pt) {
      const [W, H] = [canvas.width, canvas.height];
      const SC = H / 820;   // scale so full tower fits within panel height
      const scaled = [pt[0] * SC, pt[1] * SC, pt[2] * SC];
      let p = rotY(scaled, rotAngle);
      p = rotX(p, TILT_X);
      const proj = project(p, W, H, 1100 * SC);
      return [proj[0], proj[1], Math.min(Math.max(proj[2] - 0.35, 0) / 0.8, 1)];
    }

    // Draw a straight line segment
    function line(a, b, col, alpha, lw, dashed) {
      const pa = tx(a), pb = tx(b);
      const depth = (pa[2] + pb[2]) / 2;
      ctx.beginPath();
      if (dashed) ctx.setLineDash([3, 5]);
      else ctx.setLineDash([]);
      ctx.moveTo(pa[0], pa[1]);
      ctx.lineTo(pb[0], pb[1]);
      ctx.strokeStyle = rgba(col, alpha * (0.35 + depth * 0.65));
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    // Draw small sphere dot at a world point
    function dot(pt, r, col, alpha) {
      const p = tx(pt);
      const depth = p[2];
      // gradient glow
      const grad = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 2.4);
      grad.addColorStop(0,   rgba(col, alpha * (0.7 + depth * 0.3)));
      grad.addColorStop(0.5, rgba(col, alpha * (0.3 + depth * 0.2)));
      grad.addColorStop(1,   rgba(col, 0));
      ctx.beginPath();
      ctx.arc(p[0], p[1], r * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      // hard core
      ctx.beginPath();
      ctx.arc(p[0], p[1], r * (0.7 + depth * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = rgba(col, alpha * (0.75 + depth * 0.25));
      ctx.fill();
    }

    function draw() {
      if (!alive) return;

      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.setLineDash([]);

      /* ── 1. Grid planes ──────────────────────────────────────── */
      for (const g of GRIDS) {
        const lns = gridLines(g.cx, g.cz, g.w, g.d, g.nx, g.nz, g.y, g.ripple);
        for (const [a, b] of lns) {
          line(a, b, C.grid, 0.18, 0.45, false);
        }
      }

      /* ── 2. Cube edges ───────────────────────────────────────── */
      const allVerts = [];   // collect all cube vertex world-positions
      for (const cd of CUBES) {
        const verts = cubeVerts(cd.cx, cd.cy, cd.cz, cd.s);
        allVerts.push(verts);

        const projV = verts.map(v => tx(v));
        for (const [i, j] of CUBE_EDGES) {
          const depth = (projV[i][2] + projV[j][2]) / 2;
          let col, alpha, lw;
          if (depth > 0.6) {
            col = C.edgeHi; alpha = 0.55 + depth * 0.4; lw = 1.1;
          } else if (depth > 0.35) {
            col = C.edge;   alpha = 0.35 + depth * 0.4; lw = 0.75;
          } else {
            col = C.edgeDim; alpha = 0.18 + depth * 0.3; lw = 0.5;
          }
          line(verts[i], verts[j], col, alpha, lw, false);
        }
      }

      /* ── 3. Dotted connectors ────────────────────────────────── */
      for (const cn of CONNECTORS) {
        const [ci, vi] = cn.from;
        const [cj, vj] = cn.to;
        if (allVerts[ci] && allVerts[cj]) {
          line(allVerts[ci][vi], allVerts[cj][vj], C.conn, 0.32, 0.5, true);
        }
      }
      ctx.setLineDash([]);

      /* ── 4. Vertex sphere dots ───────────────────────────────── */
      const SC = H / 820;
      for (const verts of allVerts) {
        for (const v of verts) {
          const p = tx(v);
          const r = SC * (2.2 + p[2] * 2.4);
          dot(v, r, p[2] > 0.5 ? C.dot : C.dotDim, 0.7 + p[2] * 0.3);
        }
      }

      /* ── 5. Extra accent dots at grid intersections (sparse) ─── */
      const accentPts = [
        [0, -370, 0], [0, -210, 0], [-120, -60, -120], [120, -60, 120],
        [-160, 175, -160], [160, 175, 160], [0, 340, 0],
      ];
      for (const p of accentPts) {
        const r = SC * 2.2;
        dot(p, r, C.dot, 0.5);
      }

      rotAngle += ROT_SPEED;
      rafId = requestAnimationFrame(draw);
    }

    resize();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const gate = document.getElementById('pinGate');
    if (gate) {
      const mo = new MutationObserver(() => {
        if (gate.style.display === 'none') {
          alive = false;
          cancelAnimationFrame(rafId);
          ro.disconnect();
          mo.disconnect();
        }
      });
      mo.observe(gate, { attributes: true, attributeFilter: ['style'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

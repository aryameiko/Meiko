/*
 * MEIKO — Vessel avatar ("My Vessel").
 *
 * The user picks a vessel type, colours and a name (plus optional call sign / home port). Stored on
 * the device only (storage key 'vessel'). The avatar is shown on the dashboard and used as the
 * own-ship marker on the map, rotated to the course over ground when the GPS reports one.
 *
 * Drawings are original, flat SVG in the MEIKO style:
 *   side(type, colours)  — profile view, viewBox 0 0 200 120, bow to the right
 *   top(type, colours)   — plan view for the map marker, viewBox 0 0 40 80, bow up
 * Colour slots: h = hull, s = superstructure / sails, a = accent (stripe, funnel, containers).
 */
(function () {
  'use strict';
  var ui = MEIKO.ui, icon = ui.icon, esc = ui.esc;
  var KEY = 'vessel';
  var NAVY = '#0B1F3A', WIN = '#1A3863', GLASS = '#9EC5E8';

  var TYPES = [
    { id: 'sailboat', label: 'Sailboat', id_label: 'Kapal layar', def: { h: '#F4F6F9', s: '#FFFFFF', a: '#C9A227' } },
    { id: 'pinisi', label: 'Pinisi', id_label: 'Pinisi', def: { h: '#7A4A2A', s: '#F3E9D2', a: '#C9A227' } },
    { id: 'speedboat', label: 'Speedboat / yacht', id_label: 'Speedboat', def: { h: '#FFFFFF', s: '#0B1F3A', a: '#D64541' } },
    { id: 'passenger', label: 'Passenger ship', id_label: 'Kapal penumpang', def: { h: '#0B1F3A', s: '#FFFFFF', a: '#D64541' } },
    { id: 'cargo', label: 'Container ship', id_label: 'Kapal kargo', def: { h: '#274C80', s: '#FFFFFF', a: '#E67E22' } },
    { id: 'tanker', label: 'Tanker', id_label: 'Tanker', def: { h: '#B03A2E', s: '#FFFFFF', a: '#0B1F3A' } },
    { id: 'fishing', label: 'Fishing boat', id_label: 'Kapal nelayan', def: { h: '#1E7A4F', s: '#FFFFFF', a: '#E9D18A' } },
    { id: 'tug', label: 'Tugboat', id_label: 'Kapal tunda', def: { h: '#D64541', s: '#FFFFFF', a: '#0B1F3A' } }
  ];
  var PALETTE = ['#0B1F3A', '#274C80', '#2F80C8', '#1E7A4F', '#7A4A2A', '#B03A2E', '#D64541', '#E67E22', '#C9A227', '#E9D18A', '#F3E9D2', '#FFFFFF', '#9AA7B5', '#2B2B2B'];

  function type(id) { return TYPES.filter(function (t) { return t.id === id; })[0] || TYPES[0]; }
  function get() {
    var v = MEIKO.storage.get(KEY, null);
    if (!v || !v.type) return null;
    var t = type(v.type);
    return { name: v.name || '', type: t.id, h: v.h || t.def.h, s: v.s || t.def.s, a: v.a || t.def.a, callsign: v.callsign || '', port: v.port || '', showOnMap: v.showOnMap !== false };
  }
  function set(v) { MEIKO.storage.set(KEY, v); }
  function okColor(c) { return /^#[0-9a-f]{6}$/i.test(c) ? c : '#888888'; }
  // Darken a hex colour for shading.
  function shade(hex, f) {
    var n = parseInt(okColor(hex).slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(x) { return Math.max(0, Math.min(255, Math.round(x * f))); }
    return '#' + ((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1);
  }
  function light(hex) { var n = parseInt(okColor(hex).slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 170; }

  /* ---------- Side profile (bow right) ---------- */
  function side(id, c, opts) {
    opts = opts || {};
    var H = okColor(c.h), S = okColor(c.s), A = okColor(c.a), Hd = shade(H, 0.78), Sd = shade(S, 0.85);
    var edge = light(H) ? ' stroke="#9AA7B5" stroke-width="1"' : '';
    var sEdge = light(S) ? ' stroke="#B8C2CE" stroke-width="1"' : '';
    var g = '';
    function win(x, y, n, w, gap) { var o = ''; for (var i = 0; i < n; i++) o += '<rect x="' + (x + i * (w + gap)) + '" y="' + y + '" width="' + w + '" height="4" rx="1" fill="' + WIN + '"/>'; return o; }
    switch (id) {
      case 'sailboat':
        g = '<line x1="96" y1="14" x2="96" y2="86" stroke="' + NAVY + '" stroke-width="2.5" stroke-linecap="round"/>' +
          '<path d="M93 18 L93 82 L42 82 Z" fill="' + S + '"' + sEdge + '/>' +
          '<path d="M99 22 L158 82 L99 82 Z" fill="' + Sd + '"' + sEdge + '/>' +
          '<line x1="42" y1="82" x2="96" y2="82" stroke="' + NAVY + '" stroke-width="2"/>' +
          '<path d="M28 86 L174 86 L160 101 Q100 105 44 101 Z" fill="' + H + '"' + edge + '/>' +
          '<path d="M30 90 L172 90 L169 93.5 L33 93.5 Z" fill="' + A + '"/>';
        break;
      case 'pinisi':
        g = '<line x1="80" y1="16" x2="80" y2="80" stroke="' + NAVY + '" stroke-width="2.5"/><line x1="122" y1="22" x2="122" y2="80" stroke="' + NAVY + '" stroke-width="2.5"/>' +
          '<path d="M78 20 L78 74 L44 74 L50 30 Z" fill="' + S + '"' + sEdge + '/>' +
          '<path d="M120 26 L120 74 L88 74 L93 34 Z" fill="' + S + '"' + sEdge + '/>' +
          '<path d="M124 26 L186 70 L126 70 Z" fill="' + Sd + '"' + sEdge + '/>' +
          '<path d="M130 30 L192 72" stroke="' + NAVY + '" stroke-width="1.2"/>' +
          '<line x1="168" y1="80" x2="196" y2="70" stroke="' + NAVY + '" stroke-width="2.2" stroke-linecap="round"/>' +
          '<rect x="34" y="70" width="26" height="10" rx="1.5" fill="' + Sd + '"' + sEdge + '/>' + win(38, 73, 3, 5, 3) +
          '<path d="M18 72 Q22 80 30 80 L170 80 Q178 76 184 70 Q182 92 160 102 L48 102 Q24 98 18 72 Z" fill="' + H + '"' + edge + '/>' +
          '<path d="M26 85 L176 85" stroke="' + A + '" stroke-width="2.5"/><path d="M30 91 L172 91" stroke="' + Hd + '" stroke-width="1.5"/>';
        break;
      case 'speedboat':
        g = '<path d="M72 86 L96 68 L132 68 L146 86 Z" fill="' + S + '"' + sEdge + '/>' +
          '<path d="M100 72 L128 72 L137 84 L90 84 Z" fill="' + GLASS + '" opacity=".9"/>' +
          '<line x1="120" y1="68" x2="118" y2="56" stroke="' + NAVY + '" stroke-width="1.8"/>' +
          '<path d="M18 86 L176 86 Q192 87 184 92 L170 101 L38 101 Q22 97 18 86 Z" fill="' + H + '"' + edge + '/>' +
          '<path d="M30 92 L178 89 L172 94 L36 96 Z" fill="' + A + '"/>';
        break;
      case 'passenger':
        g = '<rect x="72" y="26" width="14" height="16" rx="2" fill="' + A + '"/><rect x="72" y="26" width="14" height="4" fill="' + NAVY + '"/>' +
          '<path d="M40 64 L162 64 L168 82 L34 82 Z" fill="' + S + '"' + sEdge + '/>' +
          '<path d="M52 46 L150 46 L156 64 L48 64 Z" fill="' + S + '"' + sEdge + '/>' +
          '<path d="M128 36 L150 36 L154 46 L126 46 Z" fill="' + Sd + '"' + sEdge + '/>' + win(130, 39, 4, 4, 2.5) +
          win(54, 54, 14, 4, 3) + win(42, 71, 18, 4, 2.6) +
          '<path d="M12 82 L188 82 L176 102 L26 102 Q16 96 12 82 Z" fill="' + H + '"' + edge + '/>' +
          '<path d="M16 88 L184 88" stroke="' + A + '" stroke-width="3"/>';
        break;
      case 'cargo':
        var cols = [A, shade(A, 0.75), '#2F80C8', A, '#1E7A4F', shade(A, 0.75), '#C9A227', A, '#2F80C8', shade(A, 0.75), A, '#1E7A4F'];
        var boxes = '';
        for (var i = 0; i < 6; i++) { boxes += '<rect x="' + (60 + i * 19) + '" y="70" width="18" height="10" fill="' + cols[i] + '"/><rect x="' + (60 + i * 19) + '" y="60" width="18" height="10" fill="' + cols[i + 6] + '"/>'; }
        g = '<rect x="20" y="40" width="28" height="40" rx="2" fill="' + S + '"' + sEdge + '/>' + '<rect x="16" y="40" width="36" height="7" rx="1.5" fill="' + Sd + '"' + sEdge + '/>' +
          win(22, 50, 4, 4, 2.5) + win(22, 58, 4, 4, 2.5) + win(22, 66, 4, 4, 2.5) +
          '<rect x="28" y="30" width="10" height="10" fill="' + A + '"/>' + boxes +
          '<path d="M8 80 L178 80 L192 74 L182 102 L22 102 Q12 96 8 80 Z" fill="' + H + '"' + edge + '/>' +
          '<path d="M10 90 L186 90" stroke="' + Hd + '" stroke-width="2"/>';
        break;
      case 'tanker':
        g = '<rect x="18" y="48" width="32" height="34" rx="2" fill="' + S + '"' + sEdge + '/>' + '<rect x="14" y="48" width="40" height="7" rx="1.5" fill="' + Sd + '"' + sEdge + '/>' +
          win(21, 58, 5, 4, 2.2) + win(21, 66, 5, 4, 2.2) +
          '<rect x="26" y="36" width="12" height="12" fill="' + A + '"/>' +
          '<path d="M56 79 L176 79" stroke="' + shade(S, 0.7) + '" stroke-width="2"/>' +
          '<rect x="95" y="72" width="3" height="7" fill="' + NAVY + '"/><rect x="120" y="72" width="3" height="7" fill="' + NAVY + '"/><path d="M92 72 L126 72" stroke="' + NAVY + '" stroke-width="2"/>' +
          '<path d="M164 72 L176 72 L176 80" stroke="' + NAVY + '" stroke-width="2" fill="none"/>' +
          '<path d="M8 80 L182 80 L192 74 L182 102 L22 102 Q12 96 8 80 Z" fill="' + H + '"' + edge + '/>' +
          '<path d="M8 84 L186 84" stroke="' + shade(H, 0.55) + '" stroke-width="3"/>';
        break;
      case 'fishing':
        g = '<line x1="128" y1="30" x2="128" y2="80" stroke="' + NAVY + '" stroke-width="2.2"/>' +
          '<line x1="128" y1="34" x2="168" y2="62" stroke="' + NAVY + '" stroke-width="1.4"/><line x1="128" y1="34" x2="86" y2="60" stroke="' + NAVY + '" stroke-width="1.4"/>' +
          '<path d="M60 80 L60 56 L94 56 L100 80 Z" fill="' + S + '"' + sEdge + '/>' + '<rect x="64" y="61" width="9" height="7" rx="1" fill="' + GLASS + '"/><rect x="78" y="61" width="9" height="7" rx="1" fill="' + GLASS + '"/>' +
          '<rect x="66" y="50" width="20" height="6" fill="' + A + '"/>' +
          '<path d="M150 80 Q156 72 164 74 L168 80 Z" fill="' + A + '"/>' +
          '<path d="M24 82 L170 82 L186 70 L176 102 L44 102 Q28 98 24 82 Z" fill="' + H + '"' + edge + '/>' +
          '<path d="M30 89 L178 86" stroke="' + A + '" stroke-width="2.5"/>';
        break;
      case 'tug':
        g = '<line x1="112" y1="18" x2="112" y2="40" stroke="' + NAVY + '" stroke-width="2.2"/><line x1="104" y1="26" x2="120" y2="26" stroke="' + NAVY + '" stroke-width="1.6"/>' +
          '<rect x="84" y="28" width="12" height="16" rx="1.5" fill="' + A + '"/>' +
          '<path d="M98 40 L132 40 L136 52 L96 52 Z" fill="' + Sd + '"' + sEdge + '/>' + '<rect x="100" y="44" width="7" height="5" fill="' + GLASS + '"/><rect x="110" y="44" width="7" height="5" fill="' + GLASS + '"/><rect x="120" y="44" width="7" height="5" fill="' + GLASS + '"/>' +
          '<rect x="80" y="52" width="60" height="28" rx="2" fill="' + S + '"' + sEdge + '/>' + win(86, 60, 6, 5, 4) +
          '<path d="M30 80 L166 80 Q178 82 174 92 L162 102 L50 102 Q34 98 30 80 Z" fill="' + H + '"' + edge + '/>' +
          '<path d="M30 83 L172 83" stroke="#2B2B2B" stroke-width="5" stroke-linecap="round"/>' +
          '<circle cx="60" cy="90" r="3" fill="#2B2B2B"/><circle cx="90" cy="90" r="3" fill="#2B2B2B"/><circle cx="120" cy="90" r="3" fill="#2B2B2B"/><circle cx="150" cy="90" r="3" fill="#2B2B2B"/>';
        break;
    }
    var water = opts.noWater ? '' : '<path d="M0 104 Q12 100 25 104 T50 104 T75 104 T100 104 T125 104 T150 104 T175 104 T200 104 L200 120 L0 120 Z" fill="#2F80C8" opacity=".22"/>' +
      '<path d="M0 108 Q12 104 25 108 T50 108 T75 108 T100 108 T125 108 T150 108 T175 108 T200 108" fill="none" stroke="#2F80C8" stroke-opacity=".45" stroke-width="1.5"/>';
    return '<svg class="vsl-svg" viewBox="0 0 200 120" role="img" aria-label="' + esc(type(id).label) + '">' + g + water + '</svg>';
  }

  /* ---------- Plan view (bow up) for the map marker ---------- */
  function top(id, c) {
    var H = okColor(c.h), S = okColor(c.s), A = okColor(c.a);
    var st = ' stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"';
    var hull, deck = '';
    switch (id) {
      case 'sailboat':
        hull = 'M20 3 C30 16 32 34 31 52 L28 74 L12 74 L9 52 C8 34 10 16 20 3 Z';
        deck = '<line x1="20" y1="22" x2="20" y2="60" stroke="' + NAVY + '" stroke-width="2"/><path d="M20 30 L30 56 L20 56 Z" fill="' + S + '" stroke="' + NAVY + '" stroke-width=".8"/>'; break;
      case 'pinisi':
        hull = 'M20 2 C29 14 31 32 30 50 L28 72 Q20 77 12 72 L10 50 C9 32 11 14 20 2 Z';
        deck = '<rect x="15" y="56" width="10" height="10" rx="1.5" fill="' + S + '"/><line x1="20" y1="18" x2="20" y2="48" stroke="' + NAVY + '" stroke-width="2"/><line x1="12" y1="28" x2="28" y2="28" stroke="' + NAVY + '" stroke-width="1.5"/><line x1="12" y1="42" x2="28" y2="42" stroke="' + NAVY + '" stroke-width="1.5"/>'; break;
      case 'speedboat':
        hull = 'M20 4 C29 14 31 30 31 48 L30 74 L10 74 L9 48 C9 30 11 14 20 4 Z';
        deck = '<path d="M12 36 Q20 28 28 36 L28 50 L12 50 Z" fill="' + S + '"/><path d="M13 37 Q20 31 27 37 L27 40 L13 40 Z" fill="' + GLASS + '"/>'; break;
      case 'cargo':
        hull = 'M20 2 C30 10 33 22 33 32 L33 76 L7 76 L7 32 C7 22 10 10 20 2 Z';
        deck = '<rect x="11" y="16" width="18" height="9" fill="' + A + '"/><rect x="11" y="27" width="18" height="9" fill="#2F80C8"/><rect x="11" y="38" width="18" height="9" fill="' + A + '"/><rect x="11" y="49" width="18" height="9" fill="#1E7A4F"/><rect x="9" y="61" width="22" height="10" rx="1" fill="' + S + '"/>'; break;
      case 'tanker':
        hull = 'M20 2 C30 10 33 22 33 32 L33 76 L7 76 L7 32 C7 22 10 10 20 2 Z';
        deck = '<line x1="20" y1="12" x2="20" y2="58" stroke="' + shade(H, 0.6) + '" stroke-width="2"/><circle cx="20" cy="24" r="2.5" fill="' + S + '"/><circle cx="20" cy="38" r="2.5" fill="' + S + '"/><rect x="9" y="61" width="22" height="10" rx="1" fill="' + S + '"/>'; break;
      case 'passenger':
        hull = 'M20 2 C30 10 33 22 33 34 L32 74 Q20 78 8 74 L7 34 C7 22 10 10 20 2 Z';
        deck = '<rect x="10" y="16" width="20" height="52" rx="5" fill="' + S + '"/><rect x="16" y="42" width="8" height="8" rx="1.5" fill="' + A + '"/>'; break;
      case 'fishing':
        hull = 'M20 3 C30 14 32 30 32 46 L30 74 L10 74 L8 46 C8 30 10 14 20 3 Z';
        deck = '<rect x="13" y="22" width="14" height="14" rx="1.5" fill="' + S + '"/><line x1="20" y1="40" x2="20" y2="66" stroke="' + NAVY + '" stroke-width="1.6"/><line x1="10" y1="52" x2="30" y2="52" stroke="' + NAVY + '" stroke-width="1.6"/>'; break;
      case 'tug':
        hull = 'M20 8 C31 14 34 26 34 40 L32 70 Q20 76 8 70 L6 40 C6 26 9 14 20 8 Z';
        deck = '<rect x="12" y="24" width="16" height="22" rx="2" fill="' + S + '"/><rect x="16" y="48" width="8" height="6" fill="' + A + '"/>'; break;
    }
    return '<svg class="vsl-top" viewBox="0 0 40 80"><path d="' + hull + '" fill="' + H + '"' + st + '/>' + deck + '</svg>';
  }

  /** Map marker HTML for the own ship. heading: degrees true or null. */
  function markerHTML(v, heading) {
    if (heading != null && isFinite(heading)) return '<div class="vsl-mk-rot" style="transform:rotate(' + Math.round(heading) + 'deg)">' + top(v.type, v) + '</div>';
    return '<div class="vsl-mk-side">' + side(v.type, v, { noWater: true }) + '</div>';
  }

  /** Dashboard block. */
  function heroHTML() {
    var v = get();
    if (!v) return '<a class="hero-vessel empty" href="#/t/vessel"><span class="hv-art">' + side('sailboat', { h: '#E9D18A', s: '#FFFFFF', a: '#C9A227' }) + '</span><span><b>Create your vessel</b><small>Pick a ship type, colours and a name</small></span>' + icon('i-chev', 'chev') + '</a>';
    return '<a class="hero-vessel" href="#/t/vessel"><span class="hv-art">' + side(v.type, v) + '</span><span><b>' + esc(v.name || 'Unnamed vessel') + '</b><small>' + esc(type(v.type).label) + (v.callsign ? ' · ' + esc(v.callsign) : '') + (v.port ? ' · ' + esc(v.port) : '') + '</small></span>' + icon('i-chev', 'chev') + '</a>';
  }

  /* ---------- Editor page ---------- */
  MEIKO.features.register({
    id: 'vessel', cat: 'settings', icon: 'i-anchor', title: 'My Vessel',
    desc: 'Your vessel avatar: ship type, colours and name',
    keywords: 'avatar kapal vessel boat ship nama kapal my ship profile perahu sailboat pinisi ferry cargo tanker tug',
    lead: 'Choose a vessel type, colours and a name. It appears on the dashboard and as your own-ship marker on the map. Saved on this device only.',
    render: function (view) {
      var cur = get() || { name: '', type: 'sailboat', h: TYPES[0].def.h, s: TYPES[0].def.s, a: TYPES[0].def.a, callsign: '', port: '', showOnMap: true };
      var isNew = !get();
      function swatches(slot, label) {
        return '<div class="field"><span>' + label + '</span><div class="swatches" data-slot="' + slot + '">' + PALETTE.map(function (c) {
          return '<button type="button" class="sw' + (c.toLowerCase() === String(cur[slot]).toLowerCase() ? ' on' : '') + '" data-c="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>';
        }).join('') + '<label class="sw sw-custom" aria-label="Custom colour">' + icon('i-plus') + '<input type="color" data-custom="' + slot + '" value="' + okColor(cur[slot]) + '"></label></div></div>';
      }
      view.innerHTML = ui.pageHead({ cat: 'settings', title: 'My Vessel', lead: this.lead }) +
        '<div class="tool-grid"><div class="stack">' +
        '<div class="card card-pad form-gap"><div class="card-title">' + icon('i-anchor') + 'Vessel type</div><div class="vsl-types" data-types></div></div>' +
        '<div class="card card-pad form-gap"><div class="card-title">' + icon('i-sun') + 'Colours<span class="spacer"></span><button class="btn btn-ghost btn-sm" data-reset-col>' + icon('i-reset') + 'Default</button></div>' +
        '<div data-swatches></div></div>' +
        '</div><div class="results-col stack">' +
        '<div class="card card-pad vsl-preview-card"><div class="vsl-preview" data-preview></div>' +
        '<div class="vsl-plate"><b data-pv-name></b><small data-pv-sub></small></div></div>' +
        '<div class="card card-pad form-gap">' +
        '<label class="field"><span>Vessel name</span><input data-f="name" maxlength="40" placeholder="e.g. KM Bahari Jaya" value="' + esc(cur.name) + '"></label>' +
        '<div class="row"><label class="field"><span>Call sign (optional)</span><input data-f="callsign" maxlength="12" autocapitalize="characters" placeholder="e.g. YB1234" value="' + esc(cur.callsign) + '"></label>' +
        '<label class="field"><span>Home port (optional)</span><input data-f="port" maxlength="40" placeholder="e.g. Tanjung Priok" value="' + esc(cur.port) + '"></label></div>' +
        '<label class="chk"><input type="checkbox" data-f="showOnMap"' + (cur.showOnMap ? ' checked' : '') + '> Show my vessel as the GPS marker on the map</label>' +
        '<div class="flex"><button class="btn btn-primary" data-save>' + icon('i-check') + (isNew ? 'Create vessel' : 'Save') + '</button>' +
        '<a class="btn btn-ghost" href="#/t/map">' + icon('i-map') + 'View on map</a>' +
        (isNew ? '' : '<button class="btn btn-ghost btn-sm" data-del>' + icon('i-trash') + 'Remove</button>') + '</div>' +
        '<p class="small muted">The map marker turns to your course over ground when the GPS reports one (while moving). Stored only on this device.</p></div>' +
        '</div></div>';

      var typesEl = ui.$('[data-types]', view), swEl = ui.$('[data-swatches]', view);
      function paintTypes() {
        typesEl.innerHTML = TYPES.map(function (t) {
          var col = t.id === cur.type ? cur : t.def;
          return '<button type="button" class="vsl-type' + (t.id === cur.type ? ' on' : '') + '" data-t="' + t.id + '" aria-pressed="' + (t.id === cur.type) + '">' + side(t.id, col, { noWater: true }) + '<b>' + esc(t.label) + '</b><small>' + esc(t.id_label) + '</small></button>';
        }).join('');
      }
      function paintSwatches() {
        swEl.innerHTML = swatches('h', 'Hull') + swatches('s', cur.type === 'sailboat' || cur.type === 'pinisi' ? 'Sails & deckhouse' : 'Superstructure') + swatches('a', 'Accent (stripe, funnel, cargo)');
      }
      function preview() {
        ui.$('[data-preview]', view).innerHTML = side(cur.type, cur) + '<div class="vsl-top-pv" title="Map marker">' + top(cur.type, cur) + '<small>Map</small></div>';
        ui.$('[data-pv-name]', view).textContent = cur.name || 'Unnamed vessel';
        ui.$('[data-pv-sub]', view).textContent = type(cur.type).label + (cur.callsign ? ' · ' + cur.callsign : '') + (cur.port ? ' · ' + cur.port : '');
      }
      function persist() { if (!isNew) set(cur); }
      paintTypes(); paintSwatches(); preview();

      typesEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-t]'); if (!b) return;
        var t = type(b.dataset.t);
        // Switching type: keep custom colours only if the user changed them from the previous type's default.
        var prev = type(cur.type), keep = cur.h !== prev.def.h || cur.s !== prev.def.s || cur.a !== prev.def.a;
        cur.type = t.id;
        if (!keep) { cur.h = t.def.h; cur.s = t.def.s; cur.a = t.def.a; }
        paintTypes(); paintSwatches(); preview(); persist();
      });
      swEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-c]'); if (!b) return;
        var slot = b.parentNode.dataset.slot; cur[slot] = b.dataset.c;
        ui.$$('.sw', b.parentNode).forEach(function (x) { x.classList.toggle('on', x === b); });
        preview(); paintTypes(); persist();
      });
      swEl.addEventListener('input', function (e) {
        var inp = e.target.closest('[data-custom]'); if (!inp) return;
        cur[inp.dataset.custom] = inp.value; preview(); persist();
      });
      swEl.addEventListener('change', function (e) { if (e.target.closest('[data-custom]')) { paintSwatches(); paintTypes(); } });
      ui.$('[data-reset-col]', view).addEventListener('click', function () { var t = type(cur.type); cur.h = t.def.h; cur.s = t.def.s; cur.a = t.def.a; paintSwatches(); paintTypes(); preview(); persist(); });
      ui.$$('[data-f]', view).forEach(function (inp) {
        inp.addEventListener(inp.type === 'checkbox' ? 'change' : 'input', function () {
          cur[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : inp.value.trim();
          preview(); persist();
        });
      });
      ui.$('[data-save]', view).addEventListener('click', function () {
        if (!cur.name) { ui.toast('Give your vessel a name'); ui.$('[data-f="name"]', view).focus(); return; }
        set(cur); ui.toast(isNew ? 'Vessel created' : 'Vessel saved');
        if (isNew) MEIKO.app.rerender();
      });
      var del = ui.$('[data-del]', view);
      if (del) del.addEventListener('click', function () {
        ui.sheet({ title: 'Remove vessel?', html: '<p>This removes your vessel avatar and name from this device.</p><div class="actions"><button class="btn btn-danger" data-yes>' + icon('i-trash') + 'Remove</button><button class="btn btn-ghost" data-close>Cancel</button></div>', onMount: function (body, close) {
          ui.$('[data-yes]', body).addEventListener('click', function () { MEIKO.storage.remove(KEY); close(); ui.toast('Vessel removed'); MEIKO.app.rerender(); });
        } });
      });
    }
  });

  MEIKO.vessel = { get: get, set: set, types: TYPES, palette: PALETTE, side: side, top: top, markerHTML: markerHTML, heroHTML: heroHTML };
})();

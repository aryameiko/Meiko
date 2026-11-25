/*
 * MEIKO — countries for registration (ISO 3166-1 alpha-2). Names come from the browser (Intl.DisplayNames)
 * in the chosen app language, so no country-name list has to be shipped. 'ZZ' = prefer not to say.
 */
(function () {
  'use strict';
  var CODES = ('AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW').split(' ');
  var TZ = { // time zone → country, for the first guess
    'Asia/Jakarta': 'ID', 'Asia/Pontianak': 'ID', 'Asia/Makassar': 'ID', 'Asia/Jayapura': 'ID', 'Asia/Ujung_Pandang': 'ID',
    'Asia/Kuala_Lumpur': 'MY', 'Asia/Kuching': 'MY', 'Asia/Singapore': 'SG', 'Asia/Manila': 'PH', 'Asia/Bangkok': 'TH',
    'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Brunei': 'BN', 'Asia/Dili': 'TL', 'Asia/Yangon': 'MM', 'Asia/Rangoon': 'MM',
    'Asia/Phnom_Penh': 'KH', 'Asia/Vientiane': 'LA', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW',
    'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD',
    'Asia/Colombo': 'LK', 'Asia/Riyadh': 'SA', 'Asia/Dubai': 'AE', 'Pacific/Port_Moresby': 'PG', 'Pacific/Auckland': 'NZ',
    'Europe/London': 'GB', 'Europe/Amsterdam': 'NL', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR'
  };
  var names = {};
  function flag(c) { return c === 'ZZ' || !/^[A-Z]{2}$/.test(c) ? '🏳️' : String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65, 0x1F1E6 + c.charCodeAt(1) - 65); }
  function name(code) {
    if (!code) return '';
    if (code === 'ZZ') return 'Prefer not to say';
    var loc = (MEIKO.i18n && MEIKO.i18n.locale()) || 'en';
    try {
      if (!names[loc]) names[loc] = window.Intl && Intl.DisplayNames ? new Intl.DisplayNames([loc, 'en'], { type: 'region' }) : null;
      var n = names[loc] && names[loc].of(code); if (n) return n;
    } catch (e) {}
    return code;
  }
  function guess() {
    try { var z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (TZ[z]) return TZ[z]; if (/^Australia\//.test(z)) return 'AU'; } catch (e) {}
    var list = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < list.length; i++) { var m = /-([A-Za-z]{2})$/.exec(list[i] || ''); if (m && CODES.indexOf(m[1].toUpperCase()) !== -1) return m[1].toUpperCase(); }
    return '';
  }
  /** <option>s sorted by name in the current language; country names are marked translate="no". */
  function options(selected) {
    var loc = (MEIKO.i18n && MEIKO.i18n.locale()) || 'en';
    var list = CODES.map(function (c) { return { c: c, n: name(c) }; }).sort(function (a, b) { return a.n.localeCompare(b.n, loc); });
    var top = ['ID', 'MY', 'SG', 'PH', 'TH', 'VN', 'TL', 'BN', 'CN']; // the region MEIKO is made for comes first
    var esc = MEIKO.ui.esc, opt = function (x) { return '<option translate="no" value="' + x.c + '"' + (x.c === selected ? ' selected' : '') + '>' + flag(x.c) + ' ' + esc(x.n) + '</option>'; };
    return '<option value="">Choose your country…</option>' +
      '<optgroup label="Southeast Asia">' + top.map(function (c) { return opt({ c: c, n: name(c) }); }).join('') + '</optgroup>' +
      '<optgroup label="All countries">' + list.map(opt).join('') + '</optgroup>' +
      '<option value="ZZ"' + (selected === 'ZZ' ? ' selected' : '') + '>Prefer not to say</option>';
  }
  /** <option>s for the app language, in each language's own name. */
  function langOptions(selected) {
    return MEIKO.i18n.LANGS.map(function (l) { return '<option translate="no" value="' + l.code + '"' + (l.code === selected ? ' selected' : '') + '>' + l.name + '</option>'; }).join('');
  }
  MEIKO.region = { CODES: CODES, name: name, flag: flag, guess: guess, options: options, langOptions: langOptions, valid: function (c) { return c === 'ZZ' || CODES.indexOf(c) !== -1; } };
})();

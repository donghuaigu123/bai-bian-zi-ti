/* ==========================================================================
 * 百变字体 · 渲染引擎
 *
 * 设计原则
 *  1. 整篇只用一种字体，字号/字距/行距由同一套度量推导，保证统一协调。
 *  2. 逐字绘制，因此可以逐字判断字库是否缺字，缺字自动回退楷书，绝不出方框。
 *  3. 先排版后分页，多页共用同一画布尺寸，导出即为等尺寸套图。
 *  4. 所有坐标都用 1080 宽的画布坐标，与设备像素无关。
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ 常量 */
  var W = 1080;                 // 画布宽
  var MAX_H = 2340;             // 单页最大高度
  var MIN_H = 1240;             // 单页最小高度（短句也像一幅作品）
  var PAD_UNIT = 82;            // 标准页边距

  /* ------------------------------------------------------------------ 纸张 */
  var PAPERS = {
    xuan:    { name: '宣纸', bg: '#f5eddc', ink: '#23201c', sub: '#6f6558', line: 'rgba(150,118,76,.26)', seal: '#a3302a', grain: 'fiber' },
    white:   { name: '素白', bg: '#fdfcf8', ink: '#1b1b1b', sub: '#707070', line: 'rgba(110,110,110,.18)', seal: '#a3302a', grain: 'soft' },
    antique: { name: '仿古', bg: '#e9dab9', ink: '#3a2c1c', sub: '#7d6747', line: 'rgba(120,80,38,.28)', seal: '#8f2a24', grain: 'aged' },
    ink:     { name: '墨拓', bg: '#2a2a2a', ink: '#f4ecd9', sub: '#b8ad96', line: 'rgba(242,232,212,.18)', seal: '#c4453a', grain: 'stone', dark: true },
    gold:    { name: '洒金', bg: '#f2e6c9', ink: '#2b2118', sub: '#7d6748', line: 'rgba(162,122,58,.26)', seal: '#9e2b25', grain: 'gold' },
    night:   { name: '靛青', bg: '#1f2f3d', ink: '#eef3f7', sub: '#a9bccb', line: 'rgba(232,242,250,.16)', seal: '#d15a4a', grain: 'soft', dark: true }
  };

  /* ------------------------------------------------------------------ 字体
     cat: kai 楷 / li 隶 / zhuan 篆 / xing 行草 / wei 魏碑 / song 宋黑 / fun 创意
     file: null 表示系统字体
     master: 名家风格标注（风格近似，非真迹集字）
  */
  var FONTS = [
    { id: 'wenkai',  name: '霞鹜文楷', sub: '温润如帖', cat: 'kai',  fam: 'BB-WenKai',  file: 'LXGWWenKai-Regular.ttf',        master: '' },
    { id: 'mashan',  name: '马善政楷', sub: '颜筋柳骨', cat: 'kai',  fam: 'BB-Kai',      file: 'MaShanZheng.ttf',               master: '颜真卿风' },
    { id: 'longcang',name: '龙藏行楷', sub: '秀劲清挺', cat: 'kai',  fam: 'BB-XingKai',  file: 'LongCang.ttf',                  master: '' },
    { id: 'lishu',   name: '青柳古隶', sub: '波磔舒展', cat: 'li',   fam: 'BB-Lishu',    file: 'lishu.ttf',                     master: '曹全碑风' },
    { id: 'zhuan',   name: '说文小篆', sub: '圆转匀停', cat: 'zhuan',fam: 'BB-Zhuan',    file: 'zhuanshu.ttf',                  master: '李斯小篆风' },
    { id: 'zhimang', name: '志莽行书', sub: '流畅飘逸', cat: 'xing', fam: 'BB-Xing',     file: 'ZhiMangXing.ttf',               master: '兰亭序风' },
    { id: 'liujian', name: '刘建毛草', sub: '纵逸奔放', cat: 'xing', fam: 'BB-Cao',      file: 'LiuJianMaoCao.ttf',             master: '怀素自叙风' },
    { id: 'xiaowei', name: '站酷小薇', sub: '古拙清峭', cat: 'wei',  fam: 'BB-WeiBei',   file: 'ZCOOLXiaoWei.ttf',              master: '张猛龙碑风' },
    { id: 'song',    name: '思源宋体', sub: '长篇首选', cat: 'song', fam: 'BB-Song',     file: 'NotoSerifSC-GB.ttf',            master: '' },
    { id: 'huangyou',name: '庆科黄油', sub: '圆润亲和', cat: 'song', fam: 'BB-HuangYou', file: 'heiti.ttf',                     master: '' },
    { id: 'kuaile',  name: '站酷快乐', sub: '轻松手账', cat: 'fun',  fam: 'BB-KuaiLe',   file: 'ZCOOLKuaiLe.ttf',               master: '' },
    { id: 'marker',  name: '霞鹜漫黑', sub: '马克笔感', cat: 'fun',  fam: 'BB-Marker',   file: 'LXGWMarkerGothic-Regular.ttf',  master: '' },
    { id: 'hei',     name: '系统黑体', sub: '现代简洁', cat: 'song', fam: 'sans-serif',  file: null,                            master: '' },
    { id: 'liStyle', name: '汉隶风',   sub: '扁方横展', cat: 'li',   fam: 'BB-LiStyle',  file: 'ZCOOLXiaoWei.ttf',              master: '', stylize: 'li' },
    { id: 'zhuanStyle', name: '金石风', sub: '修长圆转', cat: 'zhuan', fam: 'BB-ZhuanStyle', file: 'MaShanZheng.ttf',            master: '', stylize: 'zhuan' }
  ];

  var CATS = [
    { id: 'all', name: '全部' },
    { id: 'kai', name: '楷书' },
    { id: 'li', name: '隶书' },
    { id: 'zhuan', name: '篆书' },
    { id: 'xing', name: '行草' },
    { id: 'wei', name: '魏碑' },
    { id: 'song', name: '宋黑' },
    { id: 'fun', name: '创意' }
  ];

  /* ------------------------------------------------------------------ 排版选项 */
  var TRACKS = [{ id: 'tight', name: '紧凑', v: 0.02 }, { id: 'normal', name: '标准', v: 0.09 }, { id: 'loose', name: '宽松', v: 0.18 }];
  var LEADINGS = [{ id: 'tight', name: '紧凑', v: 1.42 }, { id: 'normal', name: '标准', v: 1.72 }, { id: 'loose', name: '疏朗', v: 2.02 }];
  var ALIGNS = [{ id: 'left', name: '左对齐' }, { id: 'center', name: '居中' }, { id: 'right', name: '右对齐' }];
  var GRIDS = [{ id: 'none', name: '无' }, { id: 'square', name: '方格' }, { id: 'column', name: '竖栏' }, { id: 'tian', name: '田字格' }, { id: 'mi', name: '米字格' }];
  var MARGINS = [{ id: 'narrow', name: '窄', v: 0.72 }, { id: 'normal', name: '标准', v: 1 }, { id: 'wide', name: '宽', v: 1.34 }];
  var SEALS = [{ id: 'none', name: '不要印章' }, { id: 'zhu', name: '朱文印' }, { id: 'bai', name: '白文印' }];
  var SIZE_NAMES = ['自动', '小', '中', '大', '特大'];

  /* ------------------------------------------------------------------ 状态 */
  var state = {
    font: FONTS[0],
    cat: 'all',
    paper: 'xuan',
    vertical: false,
    size: 0,
    track: 'normal',
    leading: 'normal',
    align: 'center',
    grid: 'column',
    margin: 'normal',
    seal: 'zhu',
    title: '',
    sign: '',
    pages: []
  };

  /* ------------------------------------------------------------------ 小工具 */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1900);
  }
  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
  function pick(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  /* ------------------------------------------------------------------ 可用性
     只有真正打进 APK 的字体才展示，避免用户选中一个加载失败的字体。 */
  var AVAIL = window.FONT_FILES || {};
  function fontAvailable(f) {
    return !f.file || !!AVAIL[f.file];
  }

  /* ------------------------------------------------------------------ 字体加载 */
  var loadedFam = {};      // fam -> true
  var pending = {};        // fam -> Promise

  function ensureFont(font) {
    var fam = font.fam;
    if (!font.file) return Promise.resolve(fam);
    if (loadedFam[fam]) return Promise.resolve(fam);
    if (pending[fam]) return pending[fam];
    pending[fam] = new Promise(function (resolve) {
      try {
        var ff = new FontFace(fam, 'url(fonts/' + encodeURIComponent(font.file) + ')');
        ff.load().then(function (f) {
          document.fonts.add(f);
          loadedFam[fam] = true;
          resolve(fam);
        }).catch(function () {
          // 字体加载失败时退回系统衬线，至少还能出图
          resolve('serif');
        });
      } catch (e) {
        resolve('serif');
      }
    });
    return pending[fam];
  }

  /* ------------------------------------------------------------------ 缺字检测 */
  var COV_RAW = window.FONT_COVERAGE || {};
  var covCache = {};

  function coverBits(fam) {
    if (covCache[fam] !== undefined) return covCache[fam];
    var b64 = COV_RAW[fam];
    if (!b64) { covCache[fam] = null; return null; }
    try {
      var bin = atob(b64), n = bin.length, arr = new Uint8Array(n);
      for (var i = 0; i < n; i++) arr[i] = bin.charCodeAt(i);
      covCache[fam] = arr;
      return arr;
    } catch (e) { covCache[fam] = null; return null; }
  }

  /** 位图按 BMP 每 8 个码点 1 字节标记（见 scripts/gen_coverage.py）。 */
  function hasGlyph(fam, ch) {
    var bits = coverBits(fam);
    if (!bits) return true;                    // 无覆盖数据时不做判断，交给浏览器回退
    var cp = ch.codePointAt(0);
    if (cp > 0xFFFF) return false;
    var idx = cp >> 3;
    if (idx >= bits.length) return false;
    return (bits[idx] & (1 << (cp & 7))) !== 0;
  }

  /** 该字体是否完全没有覆盖数据（系统字体）。 */
  function isSystemFam(fam) {
    return !coverBits(fam);
  }

  /* ------------------------------------------------------------------ 纸纹 */
  function paintPaper(ctx, w, h, p) {
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, w, h);

    if (p.grain === 'fiber') {
      // 宣纸纤维：细短弧线 + 少量深浅斑
      for (var i = 0; i < 260; i++) {
        var x = Math.random() * w, y = Math.random() * h;
        var len = 6 + Math.random() * 34;
        var a = (Math.random() - 0.5) * 0.9;
        ctx.strokeStyle = 'rgba(' + (Math.random() < .5 ? '150,120,80' : '255,250,238') + ',' + (0.05 + Math.random() * 0.07) + ')';
        ctx.lineWidth = 0.7 + Math.random() * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len * 0.5, y + Math.sin(a) * 5, x + Math.cos(a) * len, y + Math.sin(a) * len * 0.35);
        ctx.stroke();
      }
    } else if (p.grain === 'aged') {
      for (var j = 0; j < 150; j++) {
        var rx = Math.random() * w, ry = Math.random() * h, rr = 6 + Math.random() * 46;
        var g = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
        g.addColorStop(0, 'rgba(120,80,40,' + (0.03 + Math.random() * 0.05) + ')');
        g.addColorStop(1, 'rgba(120,80,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill();
      }
    } else if (p.grain === 'gold') {
      for (var k = 0; k < 190; k++) {
        var gx = Math.random() * w, gy = Math.random() * h, gs = 1.2 + Math.random() * 5.5;
        ctx.fillStyle = 'rgba(' + [198, 160, 84][0] + ',' + [176, 138, 62][1] + ',' + [70, 52, 20][2] + ',' + (0.10 + Math.random() * 0.16) + ')';
        ctx.beginPath(); ctx.ellipse(gx, gy, gs, gs * (0.5 + Math.random() * 0.5), Math.random() * 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (p.grain === 'stone') {
      for (var m = 0; m < 220; m++) {
        var sx = Math.random() * w, sy = Math.random() * h;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.012 + Math.random() * 0.03) + ')';
        ctx.fillRect(sx, sy, 1 + Math.random() * 3, 1 + Math.random() * 3);
      }
    } else {
      for (var q = 0; q < 120; q++) {
        var qx = Math.random() * w, qy = Math.random() * h;
        ctx.fillStyle = 'rgba(0,0,0,' + (0.006 + Math.random() * 0.012) + ')';
        ctx.fillRect(qx, qy, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
    }

    // 四周轻微压暗，让纸更像纸
    var vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, p.dark ? 'rgba(0,0,0,.20)' : 'rgba(120,90,50,.055)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  /* ------------------------------------------------------------------ 界格 */
  function paintGrid(ctx, p, x, y, w, h, cellW, cellH, kind) {
    if (kind === 'none') return;
    ctx.save();
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1.4;
    if (kind === 'column') {
      for (var cx = x; cx <= x + w + 0.5; cx += cellW) {
        ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + h); ctx.stroke();
      }
    } else {
      var cols = Math.max(1, Math.round(w / cellW));
      var rows = Math.max(1, Math.round(h / cellH));
      for (var i = 0; i <= cols; i++) {
        ctx.beginPath(); ctx.moveTo(x + i * cellW, y); ctx.lineTo(x + i * cellW, y + h); ctx.stroke();
      }
      for (var j = 0; j <= rows; j++) {
        ctx.beginPath(); ctx.moveTo(x, y + j * cellH); ctx.lineTo(x + w, y + j * cellH); ctx.stroke();
      }
      if (kind === 'tian' || kind === 'mi') {
        ctx.strokeStyle = p.dark ? 'rgba(240,232,214,.10)' : 'rgba(150,118,76,.14)';
        ctx.lineWidth = 1;
        for (var r2 = 0; r2 < rows; r2++) {
          for (var c2 = 0; c2 < cols; c2++) {
            var bx = x + c2 * cellW, by = y + r2 * cellH;
            ctx.beginPath();
            ctx.moveTo(bx + cellW / 2, by); ctx.lineTo(bx + cellW / 2, by + cellH);
            ctx.moveTo(bx, by + cellH / 2); ctx.lineTo(bx + cellW, by + cellH / 2);
            ctx.stroke();
            if (kind === 'mi') {
              ctx.beginPath();
              ctx.moveTo(bx, by); ctx.lineTo(bx + cellW, by + cellH);
              ctx.moveTo(bx + cellW, by); ctx.lineTo(bx, by + cellH);
              ctx.stroke();
            }
          }
        }
      }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ 单字 */
  function drawGlyph(ctx, ch, cx, cy, o, famUsed) {
    var st = o.stylize;
    if (!st) { ctx.fillText(ch, cx, cy); return; }
    ctx.save();
    ctx.translate(cx, cy);
    if (st === 'li') ctx.scale(1.14, 0.80);
    else if (st === 'zhuan') ctx.scale(0.88, 1.18);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ 避头尾 */
  var NO_START = '，。、；：？！）】》」』〕｝’”·…—%,.;:?!)]}>';
  var NO_END = '（【《「『〔｛‘“([{<';

  function fixLineStart(lines) {
    // 行首不能是句读：把上一行末尾的字移下来
    for (var i = 1; i < lines.length; i++) {
      var guard = 0;
      while (lines[i].length && NO_START.indexOf(lines[i][0]) >= 0 && guard++ < 6) {
        if (lines[i - 1].length <= 1) break;
        lines[i].unshift(lines[i - 1].pop());
      }
      guard = 0;
      while (lines[i].length && NO_END.indexOf(lines[i][lines[i].length - 1]) >= 0 && guard++ < 6) {
        if (lines[i].length <= 1) break;
        lines[i - 1].push(lines[i].pop());
      }
    }
    return lines;
  }

  /* ------------------------------------------------------------------ 横排断行 */
  function wrapH(ctx, text, maxW, fs, track) {
    var paras = text.split(/\n/);
    var lines = [];
    for (var pi = 0; pi < paras.length; pi++) {
      var para = paras[pi];
      if (!para.length) { lines.push([]); continue; }
      var cur = [], curW = 0;
      for (var i = 0; i < para.length; i++) {
        var ch = para[i];
        var w = ctx.measureText(ch).width + fs * track;
        if (curW + w > maxW && cur.length) { lines.push(cur); cur = []; curW = 0; }
        cur.push(ch);
        curW += w;
      }
      if (cur.length) lines.push(cur);
    }
    return fixLineStart(lines);
  }

  /* ------------------------------------------------------------------ 竖排断列 */
  function wrapV(text, perCol) {
    var paras = text.split(/\n/);
    var cols = [];
    for (var pi = 0; pi < paras.length; pi++) {
      var para = paras[pi];
      if (!para.length) { cols.push([]); continue; }
      for (var i = 0; i < para.length; i += perCol) cols.push(para.slice(i, i + perCol).split(''));
    }
    // 竖排的「行首」在列顶，做同样的避头尾修正
    for (var c = 1; c < cols.length; c++) {
      var guard = 0;
      while (cols[c].length && NO_START.indexOf(cols[c][0]) >= 0 && guard++ < 6) {
        if (cols[c - 1].length <= 1) break;
        cols[c].unshift(cols[c - 1].pop());
      }
    }
    return cols;
  }

  /* ------------------------------------------------------------------ 字号 */
  function autoSize(text, vertical) {
    var n = text.replace(/\s/g, '').length;
    var fs;
    if (n <= 14) fs = 140;
    else if (n <= 28) fs = 112;
    else if (n <= 60) fs = 88;
    else if (n <= 120) fs = 72;
    else if (n <= 300) fs = 58;
    else if (n <= 800) fs = 48;
    else fs = 42;
    return fs;
  }
  var SIZE_FACTOR = [1, 0.62, 0.78, 0.94, 1.14];

  /* ------------------------------------------------------------------ 主渲染 */
  function renderPages(text, o) {
    var p = PAPERS[o.paper] || PAPERS.xuan;
    var padX = Math.round(PAD_UNIT * o.marginV);
    var padTop = Math.round(padX * 0.92);
    var padBottom = Math.round(padX * 0.92);

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    // 先量字：字体已就位
    var fam = o.familyCss;
    var fs = o.fontSize;
    var track = o.trackV;

    ctx.font = fs + 'px ' + fam;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var contentW = W - padX * 2;
    var titleH = o.title ? fs * 1.55 : 0;
    // 底部预留：有印章时要留出印章高度，否则落款会压到正文最后一行
    var footerH = fs * (o.seal !== 'none' ? 1.42 : 0.92);
    var bodyTop = padTop + titleH;
    var bodyH = MAX_H - bodyTop - padBottom - footerH;

    var lines, colW = 0, lineH = 0, perPage, groups;

    if (o.vertical) {
      lineH = fs * 1.14;                       // 竖向字间
      colW = fs * (1.30 + track * 1.4);        // 列宽
      var perCol = Math.max(3, Math.floor((bodyH) / lineH));
      var cols = wrapV(text, perCol);
      var colsPerPage = Math.max(1, Math.floor(contentW / colW));
      groups = chunk(cols, colsPerPage);
      o._perCol = perCol;
      o._colW = colW;
      o._lineH = lineH;
      o._bodyH = Math.min(bodyH, perCol * lineH);
    } else {
      lineH = fs * o.leadingV;
      var maxLines = Math.max(3, Math.floor(bodyH / lineH));
      lines = wrapH(ctx, text, contentW - fs * 0.2, fs, track);
      groups = chunk(lines, maxLines);
      o._lineH = lineH;
      o._maxLines = maxLines;
    }

    var n = groups.length;
    var pageH;

    if (n === 1) {
      // 单页：高度贴合内容，短句也成画
      if (o.vertical) {
        var usedCols = groups[0].length;
        var hUse = Math.max(1, Math.min(o._perCol, Math.max.apply(null, groups[0].map(function (c) { return c.length; }).concat([1]))));
        pageH = Math.round(bodyTop + hUse * lineH + padBottom + footerH * 0.62);
        pageH = Math.max(MIN_H, Math.min(MAX_H, pageH));
        // 让列高占满页面高度，视觉更舒展
        o._bodyH = pageH - bodyTop - padBottom - footerH * 0.62;
      } else {
        var rows = Math.max(1, groups[0].length);
        var rawH = Math.round(bodyTop + rows * lineH + padBottom + footerH * 0.62);
        pageH = Math.max(MIN_H, Math.min(MAX_H, rawH));
        // 内容少、被最小高度撑开时，正文改为整幅居中，避免上半截有字下半截空
        o._fitTall = (rawH < MIN_H);
        o._bodyH = pageH - bodyTop - padBottom - footerH * 0.62;
      }
    } else {
      // 多页：统一尺寸
      pageH = o.vertical
        ? Math.round(bodyTop + o._perCol * lineH + padBottom + footerH)
        : Math.round(bodyTop + o._maxLines * lineH + padBottom + footerH);
      pageH = Math.min(MAX_H, pageH);
      o._bodyH = pageH - bodyTop - padBottom - footerH;
    }

    canvas.width = W;
    canvas.height = pageH;

    var pages = [];
    for (var gi = 0; gi < n; gi++) {
      var cv = document.createElement('canvas');
      cv.width = W;
      cv.height = pageH;
      drawPage(cv.getContext('2d'), groups[gi], gi, n, o, p, padX, padTop, pageH, bodyTop, contentW);
      pages.push(cv);
    }
    return pages;
  }

  function chunk(arr, size) {
    var out = [];
    for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  /* ------------------------------------------------------------------ 画一页 */
  function drawPage(ctx, group, pageIndex, pageCount, o, p, padX, padTop, pageH, bodyTop, contentW) {
    var fs = o.fontSize;
    var fam = o.familyCss;
    var fallback = o.fallbackCss;
    var track = o.trackV;
    var padBottom = Math.round(padX * 0.92);   // 与 renderPages 的页边距保持一致
    var footerH = fs * (o.seal !== 'none' ? 1.42 : 0.92);

    paintPaper(ctx, W, pageH, p);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = p.ink;

    /* ---------- 标题 ---------- */
    if (o.title) {
      var tfs = fs * 1.06;
      ctx.font = tfs + 'px ' + fam;
      ctx.fillStyle = p.ink;
      var ty = padTop + tfs * 0.62;
      var chars = Array.from(o.title);
      var tw = 0;
      for (var i = 0; i < chars.length; i++) tw += ctx.measureText(chars[i]).width + tfs * 0.24;
      tw -= tfs * 0.24;
      var tx = (W - tw) / 2;
      for (var j = 0; j < chars.length; j++) {
        var cw = ctx.measureText(chars[j]).width;
        var useFam = hasGlyph(fam, chars[j]) ? fam : fallback;
        if (useFam !== fam) ctx.font = tfs + 'px ' + useFam;
        ctx.fillText(chars[j], tx + cw / 2, ty);
        if (useFam !== fam) ctx.font = tfs + 'px ' + fam;
        tx += cw + tfs * 0.24;
      }
      // 标题下的细横线
      ctx.strokeStyle = p.dark ? 'rgba(240,232,214,.22)' : 'rgba(150,118,76,.34)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(W / 2 - Math.max(150, tw * 0.5), padTop + tfs * 1.24);
      ctx.lineTo(W / 2 + Math.max(150, tw * 0.5), padTop + tfs * 1.24);
      ctx.stroke();
    }

    // 印章比文字高，底部定位必须为印章留出高度，否则窄边距时会超出纸面
    var sealBox = (o.seal !== 'none') ? fs * 1.5 : 0;
    var footerY = pageH - Math.max(padBottom * 0.72, sealBox * 0.58);

    if (!o.vertical) {
      /* ================= 横排 ================= */
      var lineH = o._lineH;
      var maxLines = o._maxLines;
      var totalRows = Math.min(group.length, maxLines);
      var bodyTop2 = bodyTop;

      // 单页且内容不满时轻微下移，视觉更稳；限幅 1.2 行，避免把正文推出页面
      if (pageCount === 1 && group.length < maxLines) {
        var availH2 = pageH - bodyTop - padBottom - footerH * 0.72;
        var contentH2 = group.length * lineH;
        var off2 = Math.max(0, (availH2 - contentH2) / 2);
        bodyTop2 = bodyTop + (o._fitTall ? off2 : Math.min(off2, lineH * 1.2));
      }

      var cellH = lineH;
      paintGrid(ctx, p, padX, bodyTop2 - lineH * 0.12, contentW, totalRows * lineH, fs * (1 + track * 1.2), cellH, o.grid);

      ctx.font = fs + 'px ' + fam;
      ctx.fillStyle = p.ink;

      for (var r = 0; r < totalRows; r++) {
        var line = group[r];
        if (!line || !line.length) continue;
        // 计算整行宽
        var widths = [], sum = 0;
        for (var k = 0; k < line.length; k++) {
          var wv = ctx.measureText(line[k]).width;
          widths.push(wv);
          sum += wv + fs * track;
        }
        sum -= fs * track;
        var startX;
        if (o.align === 'left') startX = padX + fs * 0.1;
        else if (o.align === 'right') startX = W - padX - sum - fs * 0.1;
        else startX = (W - sum) / 2;

        var y = bodyTop2 + r * lineH + lineH / 2;
        var x = startX;
        for (var m = 0; m < line.length; m++) {
          var c = line[m];
          var cw2 = widths[m];
          var ok = hasGlyph(fam, c);
          if (!ok) ctx.font = fs + 'px ' + fallback;
          drawGlyph(ctx, c, x + cw2 / 2, y, o, null);
          if (!ok) ctx.font = fs + 'px ' + fam;
          x += cw2 + fs * track;
        }
      }

    } else {
      /* ================= 竖排 ================= */
      var colW = o._colW;
      var lineHV = o._lineH;
      var cols = group;
      var totalCols = Math.min(cols.length, Math.max(1, Math.floor(contentW / colW)));

      // 本页实际用到的最高列，界格与居中都以它为准，避免格子画出纸外
      var maxLen = 1;
      for (var q = 0; q < totalCols; q++) {
        if (cols[q] && cols[q].length > maxLen) maxLen = cols[q].length;
      }
      var availH = pageH - bodyTop - padBottom - footerH * 0.7;
      var usedH = Math.min(maxLen * lineHV, availH);

      // 右起；列数少时整体居中，避免左侧大片空白把重心拉偏
      var gridLeft = (totalCols <= 3)
        ? Math.round(padX + (contentW - totalCols * colW) / 2)
        : (W - padX - totalCols * colW);
      paintGrid(ctx, p, gridLeft, bodyTop, totalCols * colW, usedH, colW, lineHV, o.grid);
      o._usedLeft = gridLeft;
      o._usedRight = gridLeft + totalCols * colW;
      o._usedH = usedH;

      ctx.font = fs + 'px ' + fam;
      ctx.fillStyle = p.ink;

      for (var ci = 0; ci < totalCols; ci++) {
        var col = cols[ci];
        if (!col || !col.length) continue;
        var cx2 = gridLeft + (totalCols - 1 - ci) * colW + colW / 2;
        var topY = bodyTop + Math.max(0, (availH - col.length * lineHV) / 2) + lineHV / 2;

        for (var li = 0; li < col.length; li++) {
          var ch = col[li];
          var cy = topY + li * lineHV;
          var isLatin = /[A-Za-z0-9]/.test(ch);
          var ok2 = hasGlyph(fam, ch);
          if (!ok2) ctx.font = fs + 'px ' + fallback;
          if (isLatin) {
            ctx.save();
            ctx.translate(cx2, cy);
            ctx.rotate(Math.PI / 2);
            ctx.fillText(ch, 0, 0);
            ctx.restore();
          } else {
            drawGlyph(ctx, ch, cx2, cy, o, null);
          }
          if (!ok2) ctx.font = fs + 'px ' + fam;
        }
      }
    }

    /* ---------- 落款 + 印章 ---------- */
    var sealSize = fs * 1.5;
    var signFs = fs * 0.44;
    var hasSign = !!(o.sign && o.sign.trim());
    var hasSeal = o.seal !== 'none';

    if (hasSign || hasSeal) {
      ctx.font = signFs + 'px ' + fam;
      ctx.textAlign = 'center';

      if (!o.vertical) {
        var sTxt = o.sign.trim();
        var sw = 0, scs = Array.from(sTxt);
        for (var si = 0; si < scs.length; si++) sw += ctx.measureText(scs[si]).width + signFs * 0.16;
        var sy = footerY;
        var rightEdge = W - padX - (hasSeal ? sealSize + fs * 0.34 : 0);
        var sx = rightEdge - sw;
        ctx.fillStyle = p.sub;
        for (var sj = 0; sj < scs.length; sj++) {
          var cw3 = ctx.measureText(scs[sj]).width;
          ctx.fillText(scs[sj], sx + cw3 / 2, sy);
          sx += cw3 + signFs * 0.16;
        }
        if (hasSeal) drawSeal(ctx, rightEdge + fs * 0.16, sy - sealSize / 2, sealSize, fallback, p, o.seal);
      } else {
        // 竖排落款：最左一列左侧，与正文底部对齐（传统题款位置）
        var leftEdge = (o._usedLeft != null) ? o._usedLeft : (W - padX - o._colW);
        var rightEdgeV = (o._usedRight != null) ? o._usedRight : (W - padX);
        var sx2;
        if (leftEdge - fs * 1.55 > padX + sealSize * 0.62) {
          sx2 = leftEdge - fs * 1.55;                  // 左侧有余量，落款放左
        } else if (rightEdgeV + fs * 1.55 < W - padX * 0.7) {
          sx2 = rightEdgeV + fs * 1.55;                // 左侧太挤，改放右侧
        } else {
          sx2 = leftEdge - fs * 1.55;
        }
        var sTxt2 = o.sign.trim();
        var scs2 = Array.from(sTxt2);
        var bodyBottomV = bodyTop + ((o._usedH != null) ? o._usedH : 0);
        var blockH = scs2.length * signFs * 1.3 + (hasSeal ? sealSize + fs * 0.30 : 0);
        var syTop = bodyBottomV - blockH + signFs;
        ctx.fillStyle = p.sub;
        ctx.textAlign = 'center';
        for (var sk = 0; sk < scs2.length; sk++) {
          ctx.fillText(scs2[sk], sx2, syTop + sk * signFs * 1.3);
        }
        if (hasSeal) {
          drawSeal(ctx, sx2 - sealSize / 2, syTop + scs2.length * signFs * 1.3 + fs * 0.16, sealSize, fallback, p, o.seal);
        }
      }
    }

    /* ---------- 页码 ---------- */
    if (pageCount > 1) {
      ctx.font = (fs * 0.34) + 'px ' + fam;
      ctx.fillStyle = p.dark ? 'rgba(240,232,214,.42)' : 'rgba(110,95,75,.46)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((pageIndex + 1) + ' / ' + pageCount, W / 2, pageH - padX * 0.30);
    }
  }

  /* ------------------------------------------------------------------ 印章 */
  function drawSeal(ctx, x, y, size, fam, p, kind) {
    ctx.save();
    // 印泥质感：底色略不均
    if (kind === 'zhu') {
      ctx.fillStyle = p.seal;
      roundRect(ctx, x, y, size, size, size * 0.09);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,246,228,.62)';
      ctx.lineWidth = Math.max(2, size * 0.022);
      roundRect(ctx, x + size * 0.06, y + size * 0.06, size * 0.88, size * 0.88, size * 0.06);
      ctx.stroke();

      ctx.fillStyle = '#fff6e6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = (size * 0.33) + 'px ' + fam;
      var chars = ['百', '变', '字', '体'];
      var cell = size * 0.42;
      for (var i = 0; i < 4; i++) {
        var cx = x + size * 0.30 + (i % 2) * cell;
        var cy = y + size * 0.30 + Math.floor(i / 2) * cell;
        ctx.fillText(chars[i], cx, cy);
      }
    } else {
      // 白文：外框白，字透底色
      ctx.fillStyle = p.seal;
      roundRect(ctx, x, y, size, size, size * 0.09);
      ctx.fill();
      ctx.fillStyle = p.bg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = (size * 0.30) + 'px ' + fam;
      var ch2 = ['百', '变', '字', '体'];
      var cell2 = size * 0.40;
      for (var j = 0; j < 4; j++) {
        var cx2 = x + size * 0.31 + (j % 2) * cell2;
        var cy2 = y + size * 0.31 + Math.floor(j / 2) * cell2;
        ctx.fillText(ch2[j], cx2, cy2);
      }
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ 生成 */
  var generating = false;

  async function generate() {
    if (generating) return;
    var text = $('textInput').value.replace(/\r/g, '');
    if (!text.trim()) { toast('先写下一点文字吧'); $('textInput').focus(); return; }

    generating = true;
    var btn = $('btnGenerate');
    var oldLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = '正在挥毫…';

    try {
      var f = state.font;
      var fam = await ensureFont(f);
      var fallbackFam = await ensureFont(FONTS[1]);

      var sizeId = state.size;
      var fs = sizeId === 0
        ? autoSize(text, state.vertical)
        : Math.round(autoSize(text, state.vertical) * SIZE_FACTOR[sizeId]);

      var o = {
        familyCss: fam,
        fallbackCss: fallbackFam,
        fontSize: fs,
        paper: state.paper,
        vertical: state.vertical,
        stylize: f.stylize || null,
        trackV: pick(TRACKS, state.track).v,
        leadingV: pick(LEADINGS, state.leading).v,
        align: state.align,
        grid: state.grid,
        marginV: pick(MARGINS, state.margin).v,
        title: (state.title || '').trim(),
        titleText: (state.title || '').trim(),
        sign: (state.sign || '').trim(),
        seal: state.seal
      };

      var pages = renderPages(text, o);
      if (!pages.length) throw new Error('没有生成任何页面');

      // 缺字统计
      var miss = 0, probeText = text + (o.title || '') + (o.sign || '');
      if (!isSystemFam(fam)) {
        for (var i = 0; i < probeText.length; i++) {
          var ch = probeText[i];
          if (/[\s]/.test(ch)) continue;
          if (!/[\u3400-\u9FFFA-Za-z0-9]/.test(ch)) continue;
          if (!hasGlyph(fam, ch)) miss++;
        }
      }

      state.pages = pages;
      state.miss = miss;
      showPages(pages, miss, f);
    } catch (e) {
      toast('生成失败：' + (e.message || e));
    } finally {
      generating = false;
      btn.disabled = false;
      btn.textContent = oldLabel;
    }
  }

  function showPages(pages, miss, f) {
    var wrap = $('resultScroll');
    wrap.innerHTML = '';
    pages.forEach(function (cv, i) {
      var img = new Image();
      img.src = cv.toDataURL('image/png');
      img.alt = '第 ' + (i + 1) + ' 页';
      img.dataset.page = i;
      wrap.appendChild(img);
    });

    var info = '共 ' + pages.length + ' 张 · ' + pages[0].width + '×' + pages[0].height + ' px';
    if (miss > 0) info += ' · ' + miss + ' 字以楷书补齐';
    $('resultInfo').textContent = info;
    $('saveHint').textContent = pages.length > 1
      ? '一次点下去，' + pages.length + ' 张图会全部存进相册「百变字体」文件夹。'
      : '图片会存进相册「百变字体」文件夹，随时可以分享。';
    $('btnSaveAll').disabled = false;
    $('resultLayer').classList.remove('hidden');
    $('resultScroll').scrollTop = 0;
  }

  /* ------------------------------------------------------------------ 保存 */
  var saving = false;

  function bridge() {
    return (window.FontApp && typeof window.FontApp.beginImage === 'function') ? window.FontApp : null;
  }

  function saveAll() {
    if (saving || !state.pages.length) return;
    var b = bridge();
    var baseName = (state.title || '').trim() ||
      ($('textInput').value.replace(/[\s\n\r]/g, '').slice(0, 6)) || '百变字体';

    if (!b) {
      // 浏览器环境：逐张触发下载
      state.pages.forEach(function (cv, i) {
        var a = document.createElement('a');
        a.href = cv.toDataURL('image/png');
        a.download = baseName + '-' + (i + 1) + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
      toast('已开始下载 ' + state.pages.length + ' 张图片');
      return;
    }

    saving = true;
    $('btnSaveAll').disabled = true;
    var okCount = 0, lastMsg = '';

    state.pages.forEach(function (cv, i) {
      var data = cv.toDataURL('image/png').split(',')[1];
      var name = baseName + (state.pages.length > 1 ? '-' + (i + 1) : '');
      b.beginImage(name);
      var CHUNK = 96 * 1024;
      for (var off = 0; off < data.length; off += CHUNK) {
        b.appendImage(data.substr(off, CHUNK));
      }
      var res = b.finishImage();
      if (res && res.indexOf('ERR') === 0) lastMsg = res;
      else okCount++;
    });

    saving = false;
    $('btnSaveAll').disabled = false;
    if (okCount === state.pages.length) {
      toast(state.pages.length > 1 ? '已保存 ' + okCount + ' 张到相册' : '已保存到相册');
    } else if (okCount > 0) {
      toast('已保存 ' + okCount + ' 张，其余失败：' + lastMsg);
    } else {
      toast('保存失败：' + lastMsg);
    }
  }

  /* ------------------------------------------------------------------ 字体卡 */
  function renderCats() {
    var row = $('catRow');
    row.innerHTML = '';
    CATS.forEach(function (c) {
      var b = el('button', 'cat' + (state.cat === c.id ? ' on' : ''), c.name);
      b.type = 'button';
      b.onclick = function () {
        state.cat = c.id;
        renderCats();
        renderFonts();
      };
      row.appendChild(b);
    });
  }

  function catMatch(f, cat) {
    if (cat === 'all') return true;
    return f.cat === cat;
  }

  function renderFonts() {
    var grid = $('fontGrid');
    grid.innerHTML = '';
    var list = FONTS.filter(fontAvailable);
    var shown = list.filter(function (f) { return catMatch(f, state.cat); });

    shown.forEach(function (f) {
      var card = el('div', 'font-card' + (state.font.id === f.id ? ' on' : ''));
      var badge = '';
      if (f.master) badge = '<span class="font-badge master">名家</span>';
      else if (f.stylize) badge = '<span class="font-badge">风格</span>';

      var thumb = '<img class="thumb" src="' + (f.preview || ('fonts/preview/' + f.id + '.png')) +
        '" alt="' + f.name + '">';

      card.innerHTML = badge + thumb +
        '<span class="nm">' + f.name + '</span>' +
        '<span class="sub">' + (f.sub || '') + '</span>';
      card.onclick = function () {
        state.font = f;
        renderFonts();
      };
      grid.appendChild(card);
    });

    $('fontCount').textContent = shown.length + ' 款';
    var f = state.font;
    var tips = [];
    if (f.master) tips.push('「' + f.master + '」为本字库的风格取向，并非名家真迹集字。');
    if (f.stylize) tips.push('这是基于开源字库的风格化变形，不是独立的篆/隶字库。');
    if (f.id === 'song') tips.push('思源宋体收录 GB2312 全部 6763 字，适合长篇正文。');
    if (f.id === 'zhuan') tips.push('小篆字库收字有限，简体长文会有较多字回退楷书；写吉祥语、短句效果最佳。');
    if (f.id === 'lishu') tips.push('青柳古隶为日文字集，简体长文约三成字会回退楷书。');
    if (!tips.length) tips.push('整篇只用这一种字体，遇到字库没有的字会自动用楷书补上。');
    $('fontNotice').textContent = tips.join(' ');
  }

  /* ------------------------------------------------------------------ chips */
  function buildChips(hostId, list, current, onPick) {
    var host = $(hostId);
    host.innerHTML = '';
    list.forEach(function (it) {
      var b = el('button', 'chip' + (current === it.id ? ' on' : ''), it.name);
      b.type = 'button';
      b.onclick = function () {
        onPick(it.id);
        buildChips(hostId, list, it.id, onPick);
      };
      host.appendChild(b);
    });
  }

  /* ------------------------------------------------------------------ 初始化 */
  function init() {
    // 字体列表：生成预览路径
    FONTS.forEach(function (f) { f.preview = 'fonts/preview/' + f.id + '.png'; });
    state.font = FONTS.filter(fontAvailable)[0] || FONTS[0];

    $('textInput').addEventListener('input', function () {
      $('charCount').textContent = this.value.replace(/\s/g, '').length + ' 字';
    });
    $('btnClear').onclick = function () {
      $('textInput').value = '';
      $('charCount').textContent = '0 字';
    };
    $('btnSample').onclick = function () {
      var samples = [
        '春江潮水连海平，海上明月共潮生。\n滟滟随波千万里，何处春江无月明！',
        '人生得意须尽欢，莫使金樽空对月。\n天生我材必有用，千金散尽还复来。',
        '山不在高，有仙则名。水不在深，有龙则灵。\n斯是陋室，惟吾德馨。',
        '愿你三冬暖，愿你春不寒；\n愿你天黑有灯，下雨有伞。'
      ];
      $('textInput').value = samples[Math.floor(Math.random() * samples.length)];
      $('charCount').textContent = $('textInput').value.replace(/\s/g, '').length + ' 字';
    };

    buildChips('paperChips', Object.keys(PAPERS).map(function (k) { return { id: k, name: PAPERS[k].name }; }),
      state.paper, function (id) { state.paper = id; });

    buildChips('layoutChips', [{ id: 'h', name: '横排' }, { id: 'v', name: '竖排 · 右起' }],
      state.vertical ? 'v' : 'h', function (id) {
        state.vertical = id === 'v';
        $('alignChips').parentNode.style.opacity = state.vertical ? 0.42 : 1;
      });

    buildChips('trackChips', TRACKS, state.track, function (id) { state.track = id; });
    buildChips('leadingChips', LEADINGS, state.leading, function (id) { state.leading = id; });
    buildChips('alignChips', ALIGNS, state.align, function (id) { state.align = id; });
    buildChips('gridChips', GRIDS, state.grid, function (id) { state.grid = id; });
    buildChips('marginChips', MARGINS, state.margin, function (id) { state.margin = id; });
    buildChips('sealChips', SEALS, state.seal, function (id) { state.seal = id; });

    $('sizeRange').oninput = function () {
      state.size = parseInt(this.value, 10) || 0;
      $('sizeHint').textContent = SIZE_NAMES[state.size];
    };

    $('titleInput').oninput = function () { state.title = this.value; };
    $('signInput').oninput = function () { state.sign = this.value; };

    $('btnToggleAdv').onclick = function () {
      var p = $('advPanel');
      p.classList.toggle('hidden');
      this.classList.toggle('open');
    };

    $('btnShuffle').onclick = function () {
      var pool = FONTS.filter(function (f) { return !f.stylize && fontAvailable(f); });
      state.font = pool[Math.floor(Math.random() * pool.length)];
      var paperKeys = Object.keys(PAPERS);
      state.paper = paperKeys[Math.floor(Math.random() * paperKeys.length)];
      state.grid = GRIDS[Math.floor(Math.random() * GRIDS.length)].id;
      state.margin = MARGINS[Math.floor(Math.random() * MARGINS.length)].id;
      state.vertical = Math.random() < 0.42;
      if (state.vertical) state.seal = 'zhu';

      buildChips('paperChips', paperKeys.map(function (k) { return { id: k, name: PAPERS[k].name }; }),
        state.paper, function (id) { state.paper = id; });
      buildChips('layoutChips', [{ id: 'h', name: '横排' }, { id: 'v', name: '竖排 · 右起' }],
        state.vertical ? 'v' : 'h', function (id) { state.vertical = id === 'v'; });
      buildChips('gridChips', GRIDS, state.grid, function (id) { state.grid = id; });
      buildChips('marginChips', MARGINS, state.margin, function (id) { state.margin = id; });
      renderFonts();
      toast('换了个搭配：' + state.font.name + ' · ' + PAPERS[state.paper].name);
    };

    $('btnGenerate').onclick = generate;
    $('btnSaveAll').onclick = saveAll;
    $('btnBack').onclick = function () { $('resultLayer').classList.add('hidden'); };
    $('btnRegen').onclick = function () {
      $('resultLayer').classList.add('hidden');
      setTimeout(generate, 120);
    };

    window.onAndroidBack = function () {
      if (!$('resultLayer').classList.contains('hidden')) {
        $('resultLayer').classList.add('hidden');
        return true;
      }
      return false;
    };

    $('credits').innerHTML = '内置 ' + FONTS.length + ' 种字体，均为可自由再分发的开源字库（SIL OFL 等），' +
      '各字体的版权与授权原文随 APK 一并打包，详见仓库 FONTS.md。' +
      '「名家」标注指该字库的风格取向，不是名家真迹集字。';

    renderCats();
    renderFonts();
    $('charCount').textContent = '0 字';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // 便于自动化测试
  window.BB = { state: state, FONTS: FONTS, PAPERS: PAPERS, generate: generate, saveAll: saveAll };
})();

/*
 * merge.js — PDF結合のロジック本体（ブラウザでも Node でも動く）
 * pdf-lib を引数で受け取るので、画面側とテスト側で同じコードを使える。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PdfMerge = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // A4（pt）。1pt = 1/72インチ
  var A4 = { w: 595.28, h: 841.89 };

  // 全角数字・全角ハイフン・読点を半角に寄せる
  function normalize(text) {
    return String(text || '')
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); })
      .replace(/[－ー–—〜~]/g, '-')
      .replace(/[、，]/g, ',')
      .trim();
  }

  /**
   * "1-3,5,8-" のようなページ範囲を、0始まりのページ番号の配列にする。
   * 空文字なら全ページ。不正な指定は Error を投げる。
   */
  function parseRange(text, total) {
    var s = normalize(text);
    var i, result = [];
    if (s === '') {
      for (i = 0; i < total; i++) result.push(i);
      return result;
    }
    var tokens = s.split(/[,\s]+/).filter(Boolean);
    tokens.forEach(function (tok) {
      var m = /^(\d*)-(\d*)$/.exec(tok);
      var from, to;
      if (m && (m[1] !== '' || m[2] !== '')) {
        from = m[1] === '' ? 1 : parseInt(m[1], 10);
        to = m[2] === '' ? total : parseInt(m[2], 10);
      } else if (/^\d+$/.test(tok)) {
        from = to = parseInt(tok, 10);
      } else {
        throw new Error('ページ範囲「' + tok + '」を読み取れません（例: 1-3,5,8-）');
      }
      if (from < 1 || to > total) {
        throw new Error('ページ範囲「' + tok + '」が全' + total + 'ページの範囲を超えています');
      }
      if (from > to) {
        throw new Error('ページ範囲「' + tok + '」は小さい番号から大きい番号の順に書いてください');
      }
      for (i = from; i <= to; i++) result.push(i - 1);
    });
    return result;
  }

  // 結合後の総ページ数（両面用の白紙を含む）を、PDFを開かずに見積もる
  function countOutputPages(selectedCounts, duplexPad) {
    var total = 0;
    selectedCounts.forEach(function (c, idx) {
      total += c;
      if (duplexPad && idx < selectedCounts.length - 1 && c % 2 === 1) total += 1;
    });
    return total;
  }

  /**
   * items: [{ name, bytes, range }]
   * options: { unifyA4: boolean, duplexPad: boolean }
   * 戻り値: Uint8Array（結合後のPDF）
   */
  async function mergePdfs(PDFLib, items, options, onProgress) {
    options = options || {};
    var PDFDocument = PDFLib.PDFDocument;
    var degrees = PDFLib.degrees;
    var out = await PDFDocument.create();
    out.setProducer('PDF結合ツール');
    out.setCreator('PDF結合ツール');

    for (var n = 0; n < items.length; n++) {
      var it = items[n];
      if (onProgress) onProgress(n, items.length, it.name);

      var src;
      try {
        src = await PDFDocument.load(it.bytes);
      } catch (e) {
        throw new Error('「' + it.name + '」を読み込めません。パスワード付き、または壊れているPDFの可能性があります。');
      }

      var indices;
      try {
        indices = parseRange(it.range, src.getPageCount());
      } catch (e) {
        throw new Error('「' + it.name + '」: ' + e.message);
      }

      var lastSize = { width: A4.w, height: A4.h };

      if (!options.unifyA4) {
        // 元のサイズ・向きをそのまま保つ
        var copied = await out.copyPages(src, indices);
        copied.forEach(function (p) {
          out.addPage(p);
          lastSize = p.getSize();
        });
      } else {
        // 各ページをA4（縦横は元の形に合わせる）に収める
        var srcPages = indices.map(function (k) { return src.getPage(k); });
        var embedded = await out.embedPages(srcPages);
        embedded.forEach(function (ep, k) {
          var angle = ((srcPages[k].getRotation().angle % 360) + 360) % 360;
          var w = ep.width, h = ep.height;
          var swap = angle === 90 || angle === 270;
          var dispW = swap ? h : w;   // 見た目の幅
          var dispH = swap ? w : h;   // 見た目の高さ
          var landscape = dispW > dispH;
          var pw = landscape ? A4.h : A4.w;
          var ph = landscape ? A4.w : A4.h;
          var s = Math.min(pw / dispW, ph / dispH);
          var ox = (pw - dispW * s) / 2;
          var oy = (ph - dispH * s) / 2;
          var x, y, rot;
          if (angle === 90)       { rot = -90;  x = ox;               y = oy + w * s; }
          else if (angle === 180) { rot = -180; x = ox + w * s;       y = oy + h * s; }
          else if (angle === 270) { rot = 90;   x = ox + h * s;       y = oy; }
          else                    { rot = 0;    x = ox;               y = oy; }
          var page = out.addPage([pw, ph]);
          page.drawPage(ep, { x: x, y: y, xScale: s, yScale: s, rotate: degrees(rot) });
          lastSize = { width: pw, height: ph };
        });
      }

      // 両面印刷: ページ数が奇数のファイルの後ろに白紙を入れ、次のファイルを表面から始める
      if (options.duplexPad && n < items.length - 1 && indices.length % 2 === 1) {
        out.addPage([lastSize.width, lastSize.height]);
      }
    }

    if (onProgress) onProgress(items.length, items.length, '');
    return await out.save();
  }

  return { A4: A4, parseRange: parseRange, countOutputPages: countOutputPages, mergePdfs: mergePdfs };
});

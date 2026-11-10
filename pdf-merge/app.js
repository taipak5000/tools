(function () {
  'use strict';

  var items = [];            // { id, name, bytes, pageCount, size, range }
  var nextId = 1;
  var dragId = null;
  var resultUrl = null;

  var $ = function (id) { return document.getElementById(id); };
  var dropzone = $('dropzone');
  var fileInput = $('file-input');
  var listSection = $('list-section');
  var optionsSection = $('options-section');
  var fileList = $('file-list');
  var summary = $('summary');
  var statusEl = $('status');
  var resultSection = $('result');

  // ---------- 表示ヘルパー ----------

  function setStatus(msg, isError) {
    statusEl.textContent = msg || '';
    statusEl.className = 'status' + (isError ? ' error' : '');
  }

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function selectedCount(item) {
    try { return PdfMerge.parseRange(item.range, item.pageCount).length; }
    catch (e) { return null; }
  }

  function rangeError(item) {
    try { PdfMerge.parseRange(item.range, item.pageCount); return ''; }
    catch (e) { return e.message; }
  }

  function updateSummary() {
    if (items.length === 0) { summary.textContent = ''; return; }
    var counts = items.map(selectedCount);
    if (counts.indexOf(null) !== -1) {
      summary.textContent = 'ページ範囲に誤りがあります。赤く表示された欄を直してください。';
      return;
    }
    var duplex = $('opt-duplex').checked;
    var total = PdfMerge.countOutputPages(counts, duplex);
    var text = items.length + '個のファイル、結合後は' + total + 'ページ';
    if (total > 0) text += '（両面印刷なら用紙' + Math.ceil(total / 2) + '枚、片面なら' + total + '枚）';
    summary.textContent = text;
  }

  function hideResult() {
    resultSection.hidden = true;
  }

  // ---------- 一覧の描画 ----------

  function render() {
    var has = items.length > 0;
    listSection.hidden = !has;
    optionsSection.hidden = !has;
    if (!has) hideResult();

    fileList.textContent = '';
    items.forEach(function (item, i) {
      var li = document.createElement('li');
      li.className = 'file-item';
      li.draggable = true;
      li.dataset.id = item.id;

      var grip = document.createElement('span');
      grip.className = 'grip';
      grip.textContent = '⋮⋮';
      grip.setAttribute('aria-hidden', 'true');

      var main = document.createElement('div');
      main.className = 'file-main';
      var name = document.createElement('p');
      name.className = 'file-name';
      name.textContent = (i + 1) + '. ' + item.name;
      var meta = document.createElement('p');
      meta.className = 'file-meta';
      meta.textContent = item.pageCount + 'ページ・' + formatSize(item.size);
      main.appendChild(name);
      main.appendChild(meta);

      var controls = document.createElement('div');
      controls.className = 'file-controls';
      controls.appendChild(iconButton('↑', '「' + item.name + '」を上へ', 'up', i === 0));
      controls.appendChild(iconButton('↓', '「' + item.name + '」を下へ', 'down', i === items.length - 1));
      controls.appendChild(iconButton('✕', '「' + item.name + '」を外す', 'remove', false));

      var rangeRow = document.createElement('div');
      rangeRow.className = 'range-row';
      var label = document.createElement('label');
      label.textContent = 'ページ範囲';
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'range-input';
      input.placeholder = '全ページ';
      input.value = item.range;
      input.autocomplete = 'off';
      input.setAttribute('aria-label', '「' + item.name + '」のページ範囲');
      var err = document.createElement('span');
      err.className = 'range-error';
      rangeRow.appendChild(label);
      rangeRow.appendChild(input);
      rangeRow.appendChild(err);

      li.appendChild(grip);
      li.appendChild(main);
      li.appendChild(controls);
      li.appendChild(rangeRow);
      fileList.appendChild(li);

      showRangeState(input, err, item);
    });
    updateSummary();
  }

  function iconButton(text, label, action, disabled) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn' + (action === 'remove' ? ' remove' : '');
    b.textContent = text;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.dataset.action = action;
    b.disabled = disabled;
    return b;
  }

  function showRangeState(input, err, item) {
    var msg = rangeError(item);
    input.classList.toggle('invalid', msg !== '');
    err.textContent = msg;
  }

  // ---------- ファイル追加 ----------

  function isPdf(file) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  }

  async function addFiles(fileListLike) {
    var files = Array.prototype.slice.call(fileListLike);
    var pdfs = files.filter(isPdf);
    var skipped = files.length - pdfs.length;
    var failed = [];
    var added = 0;
    if (pdfs.length === 0) {
      setStatus('PDFファイルが見つかりませんでした。', true);
      return;
    }
    setStatus('読み込み中…');
    for (var i = 0; i < pdfs.length; i++) {
      var f = pdfs[i];
      try {
        var buf = new Uint8Array(await f.arrayBuffer());
        var doc = await PDFLib.PDFDocument.load(buf, { updateMetadata: false });
        items.push({
          id: nextId++, name: f.name, bytes: buf,
          pageCount: doc.getPageCount(), size: f.size, range: ''
        });
        added++;
      } catch (e) {
        failed.push(f.name);
      }
    }
    hideResult();
    render();
    var msgs = [];
    if (added) msgs.push(added + '個のファイルを追加しました。');
    if (skipped) msgs.push('PDF以外の' + skipped + '個は無視しました。');
    if (failed.length) msgs.push('読み込めなかったファイル（パスワード付き・破損など）: ' + failed.join('、'));
    setStatus(msgs.join(' '), failed.length > 0 && added === 0);
  }

  fileInput.addEventListener('change', function () {
    if (fileInput.files.length) addFiles(fileInput.files);
    fileInput.value = '';
  });

  // ファイルのドロップ（ページのどこに落としてもよい）
  function hasFiles(e) {
    return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') !== -1;
  }
  document.addEventListener('dragover', function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dropzone.classList.add('is-over');
  });
  document.addEventListener('dragleave', function (e) {
    if (e.relatedTarget === null) dropzone.classList.remove('is-over');
  });
  document.addEventListener('drop', function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dropzone.classList.remove('is-over');
    addFiles(e.dataTransfer.files);
  });

  // ---------- 並べ替え・削除 ----------

  function indexOfId(id) {
    for (var i = 0; i < items.length; i++) if (String(items[i].id) === String(id)) return i;
    return -1;
  }

  function move(from, to) {
    if (from === to || from < 0 || to < 0 || to >= items.length) return;
    var it = items.splice(from, 1)[0];
    items.splice(to, 0, it);
    hideResult();
    render();
  }

  fileList.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var li = btn.closest('.file-item');
    var i = indexOfId(li.dataset.id);
    var action = btn.dataset.action;
    if (action === 'up') move(i, i - 1);
    else if (action === 'down') move(i, i + 1);
    else if (action === 'remove') {
      items.splice(i, 1);
      hideResult();
      render();
      setStatus('');
    }
  });

  fileList.addEventListener('input', function (e) {
    if (!e.target.classList.contains('range-input')) return;
    var li = e.target.closest('.file-item');
    var item = items[indexOfId(li.dataset.id)];
    item.range = e.target.value;
    showRangeState(e.target, li.querySelector('.range-error'), item);
    hideResult();
    updateSummary();
  });

  // ドラッグで並べ替え
  function clearDropMarks() {
    Array.prototype.forEach.call(fileList.children, function (li) {
      li.classList.remove('drop-before', 'drop-after');
    });
  }
  fileList.addEventListener('dragstart', function (e) {
    var li = e.target.closest && e.target.closest('.file-item');
    if (!li) return;
    dragId = li.dataset.id;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  fileList.addEventListener('dragend', function () {
    dragId = null;
    clearDropMarks();
    Array.prototype.forEach.call(fileList.children, function (li) { li.classList.remove('dragging'); });
  });
  fileList.addEventListener('dragover', function (e) {
    if (dragId === null) return;
    var li = e.target.closest('.file-item');
    if (!li) return;
    e.preventDefault();
    clearDropMarks();
    var rect = li.getBoundingClientRect();
    li.classList.add(e.clientY < rect.top + rect.height / 2 ? 'drop-before' : 'drop-after');
  });
  fileList.addEventListener('drop', function (e) {
    if (dragId === null) return;
    var li = e.target.closest('.file-item');
    if (!li) return;
    e.preventDefault();
    e.stopPropagation();
    var rect = li.getBoundingClientRect();
    var after = e.clientY >= rect.top + rect.height / 2;
    var from = indexOfId(dragId);
    var to = indexOfId(li.dataset.id);
    if (from < to) to -= 1;       // 取り除いた分だけ位置がずれる
    if (after) to += 1;
    dragId = null;
    clearDropMarks();
    move(from, Math.max(0, Math.min(items.length - 1, to)));
  });

  $('sort-btn').addEventListener('click', function () {
    items.sort(function (a, b) {
      return a.name.localeCompare(b.name, 'ja', { numeric: true, sensitivity: 'base' });
    });
    hideResult();
    render();
    setStatus('ファイル名の順（数字は大きさ順）に並べました。');
  });

  $('clear-btn').addEventListener('click', function () {
    items = [];
    hideResult();
    render();
    setStatus('');
  });

  $('opt-duplex').addEventListener('change', function () { hideResult(); updateSummary(); });
  $('opt-a4').addEventListener('change', hideResult);

  // ---------- 結合 ----------

  function safeFileName(raw) {
    var name = String(raw || '').replace(/[\\/:*?"<>|]/g, '_').trim();
    if (!name) name = '結合PDF';
    return name.replace(/\.pdf$/i, '') + '.pdf';
  }

  $('merge-btn').addEventListener('click', async function () {
    var btn = $('merge-btn');
    if (items.length === 0) return;
    if (items.some(function (it) { return rangeError(it) !== ''; })) {
      setStatus('ページ範囲に誤りがあります。赤く表示された欄を直してください。', true);
      return;
    }
    btn.disabled = true;
    hideResult();
    setStatus('結合しています…');
    // 画面の更新を先に済ませてから重い処理に入る
    await new Promise(function (r) { setTimeout(r, 30); });
    try {
      var bytes = await PdfMerge.mergePdfs(
        PDFLib,
        items.map(function (it) { return { name: it.name, bytes: it.bytes, range: it.range }; }),
        { unifyA4: $('opt-a4').checked, duplexPad: $('opt-duplex').checked },
        function (n, total, name) {
          if (name) setStatus('結合しています… (' + (n + 1) + '/' + total + ') ' + name);
        }
      );
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      var fileName = safeFileName($('out-name').value);
      var dl = $('download-link');
      dl.href = resultUrl;
      dl.download = fileName;
      $('open-link').href = resultUrl;
      var doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
      $('result-info').textContent = fileName + '（' + doc.getPageCount() + 'ページ・' + formatSize(bytes.length) + '）';
      resultSection.hidden = false;
      setStatus('');
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      setStatus(e && e.message ? e.message : '結合に失敗しました。', true);
    } finally {
      btn.disabled = false;
    }
  });

  render();
})();

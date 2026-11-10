// ツール一覧（ハブ）の中で開かれたときだけ動く連携スクリプト。
// ツール自身の下部タブバーに「ツール」ボタンを足し、ハブ側の下部バーを隠してもらう。
// これでメニューが2段に重ならない。単体で開いたときは何もしない。
(function () {
  if (window.parent === window) return;
  var parentWin = window.parent;
  var mobile = true;

  function send(msg) { try { parentWin.postMessage(msg, location.origin); } catch (e) {} }

  var ICON = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">' +
    '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

  function inject() {
    var bars = document.querySelectorAll('.tabbar');
    Array.prototype.forEach.call(bars, function (bar) {
      var btn = bar.querySelector('.hub-menu-tab');
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tab hub-menu-tab';
        btn.innerHTML = ICON + '<span>ツール</span>';
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          send({ type: 'hub:open-menu' });
        });
        bar.appendChild(btn);
      }
      btn.hidden = !mobile;
      btn.style.display = mobile ? '' : 'none';
    });
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'hub:mode') { mobile = !!e.data.mobile; inject(); }
  });

  function start() {
    inject();
    new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
    send({ type: 'hub:own-bar' });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

(() => {
  const file = new URL('Références techniques nationales - Premiers Secours Citoyen.pdf', document.currentScript.src);
  const reader = new URL('rtn-pdf-reader.html?v=1', document.currentScript.src);
  const dialog = document.createElement('dialog');
  dialog.className = 'rtn-pdf-dialog';
  dialog.setAttribute('aria-label', 'Référentiel RTN');
  dialog.innerHTML = '<div class="rtn-pdf-bar"><strong>Référentiel RTN</strong><a target="_blank" rel="noopener noreferrer">PDF original</a><button type="button" aria-label="Fermer le PDF" autofocus>×</button></div><p role="status" class="rtn-pdf-status">Chargement du PDF…</p><iframe title="Pages du référentiel RTN" sandbox="allow-scripts"></iframe>';
  const style = document.createElement('style');
  style.textContent = `
    .rtn-pdf-dialog{box-sizing:border-box;position:fixed;inset:0;margin:0;border:0;padding:0;width:100%;height:100%;max-width:none;max-height:none;background:#102136;color:#fff;color-scheme:dark}
    .rtn-pdf-dialog[open]{display:flex;flex-direction:column}
    .rtn-pdf-bar{flex:none;display:flex;align-items:center;gap:12px;padding:6px max(12px,env(safe-area-inset-right)) 6px max(12px,env(safe-area-inset-left));padding-top:max(6px,env(safe-area-inset-top));background:#142940}
    .rtn-pdf-bar strong{flex:1;font-size:15px}
    .rtn-pdf-bar a{font-size:12px;color:#d8eaff}
    .rtn-pdf-bar button{width:44px;height:44px;border:1px solid #74869b;border-radius:10px;background:#243d58;color:white;font:28px system-ui;cursor:pointer}
    .rtn-pdf-dialog iframe{min-height:0;flex:1;width:100%;border:0}
    .rtn-pdf-status{margin:0;padding:10px 12px;font:14px system-ui}
  `;
  document.head.append(style);
  document.body.append(dialog);
  const frame = dialog.querySelector('iframe');
  const status = dialog.querySelector('[role="status"]');
  const original = dialog.querySelector('a');
  let request = null;
  let opener = null;

  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    request?.abort();
    request = null;
    frame.removeAttribute('src');
    opener?.focus({preventScroll:true});
    opener = null;
  });

  window.addEventListener('message', event => {
    if (!dialog.open || event.source !== frame.contentWindow || event.origin !== 'null') return;
    switch (event.data?.type) {
      case 'rtn-pdf-ready':
        status.hidden = true;
        break;
      case 'rtn-pdf-error':
        status.hidden = false;
        status.textContent = 'Impossible d’afficher le document ici. Utilise « PDF original ».';
        break;
      case 'rtn-pdf-close':
        dialog.close();
        break;
    }
  });

  document.addEventListener('click', async event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link === original || typeof dialog.showModal !== 'function') return;
    const url = new URL(link.href);
    if (url.origin !== file.origin || url.pathname !== file.pathname) return;
    event.preventDefault();
    if (dialog.open) return;
    opener = link;
    original.href = url.href;
    status.hidden = false;
    status.textContent = 'Chargement du PDF…';
    const controller = new AbortController();
    request = controller;
    dialog.showModal();
    const page = Number(new URLSearchParams(url.hash.slice(1)).get('page')) || 1;
    try {
      const loaded = new Promise(resolve => frame.addEventListener('load', resolve, {once:true,signal:controller.signal}));
      frame.src = reader.href;
      const response = await fetch(file.href, {signal:controller.signal});
      if (!response.ok) throw Error('PDF inaccessible');
      const bytes = await response.arrayBuffer();
      await loaded;
      if (!controller.signal.aborted && dialog.open) {
        frame.contentWindow.postMessage({type:'rtn-pdf-data',bytes,page}, '*', [bytes]);
      }
    } catch {
      if (controller.signal.aborted) return;
      status.textContent = 'Impossible de charger le PDF. Utilise « PDF original ».';
    }
  });
})();

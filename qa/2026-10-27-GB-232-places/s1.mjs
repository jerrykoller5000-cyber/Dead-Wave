
    (() => {
      const card = document.getElementById('errorCard');
      const text = document.getElementById('errorCardText');
      const show = (msg) => {
        text.textContent = String(msg || 'Unknown error').slice(0, 600);
        card.hidden = false;
      };
      window.addEventListener('error', (e) => show(e.message || (e.error && e.error.message)));
      window.addEventListener('unhandledrejection', (e) => {
        const r = e.reason;
        show(r && (r.message || r));
      });
      document.getElementById('errorCardDismiss').onclick = () => { card.hidden = true; };
    })();
  
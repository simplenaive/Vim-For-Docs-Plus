(function(){
  class VimUIV2Internal {
    constructor() {
      this.theme = 'vim';
      this.modeText = '';
      this.bufferText = '';
      this.tempNormal = false;
      this.ind = null;
      this.ensureIndicator();
      this.applyTheme();
    }
    ensureIndicator() {
      if (this.ind) return;
      this.ind = document.createElement('div');
      this.ind.id = 'vim-for-docs-indicator';
      document.body.appendChild(this.ind);
    }
    setTheme(t) { this.theme = t || 'vim'; this.applyTheme(); this.render(); }
    setMode(m) { this.modeText = m || ''; this.render(); }
    setTempNormal(v) { this.tempNormal = !!v; this.render(); }
    setBufferText(s) { this.bufferText = s || ''; this.render(); }
    applyTheme() {
      if (!this.ind) return;
      this.ind.innerHTML = '';
      if (this.theme === 'vim') {
        Object.assign(this.ind.style, { position: 'fixed', bottom: '0', left: '0', right: '0', backgroundColor: '#2e2e2e', color: 'white', padding: '4px 10px', fontFamily: 'monospace', fontSize: '14px', justifyContent: 'space-between', alignItems: 'center', zIndex: '9999', display: 'flex' });
        const left = document.createElement('div'); left.className = 'mode-text'; this.ind.appendChild(left);
        const right = document.createElement('div'); right.className = 'command-text'; this.ind.appendChild(right);
      } else {
        this.ind.style.left = '';
        this.ind.style.right = '';
        Object.assign(this.ind.style, { position: 'fixed', bottom: '20px', right: '20px', padding: '8px 16px', borderRadius: '4px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: '14px', fontWeight: '500', zIndex: '9999', display: 'block' });
      }
    }
    render() {
      if (!this.ind) return;
      if (this.theme === 'vim') {
        const mt = this.ind.querySelector('.mode-text');
        const ct = this.ind.querySelector('.command-text');
        const disp = (this.modeText === 'visualLine') ? 'VISUAL LINE' : (this.modeText || '').toUpperCase();
        if (mt) mt.textContent = (this.modeText === 'normal' && this.tempNormal) ? '-- (Insert) --' : `-- ${disp} --`;
        if (ct) ct.textContent = this.bufferText || '';
      } else {
        this.ind.innerHTML = '';
        const text = document.createElement('div');
        const disp = (this.modeText === 'visualLine') ? 'VISUAL LINE' : (this.modeText || '').toUpperCase();
        text.textContent = disp;
        this.ind.appendChild(text);
        if (this.theme === 'dark') { this.ind.style.backgroundColor = '#222'; this.ind.style.color = '#ddd'; }
        else if (this.theme === 'light') { this.ind.style.backgroundColor = '#f8f9fa'; this.ind.style.color = '#000'; }
        else if (this.modeText === 'normal') { this.ind.style.backgroundColor = '#1a73e8'; this.ind.style.color = '#fff'; }
        else if (this.modeText === 'insert') { this.ind.style.backgroundColor = '#34a853'; this.ind.style.color = '#fff'; }
        else { this.ind.style.backgroundColor = '#fbbc04'; this.ind.style.color = '#000'; }
      }
    }
    updateCursorStyle() {
      const caret = document.querySelector('.kix-cursor-caret');
      if (!caret) return;
      if (this.modeText === 'insert') {
        caret.style.borderWidth = '2px';
      } else {
        try {
          if (caret.style && caret.style.height) {
            const h = parseFloat(caret.style.height.slice(0, -2));
            if (!isNaN(h)) { const w = 0.416 * h; caret.style.borderWidth = w + 'px'; }
          }
        } catch (_) {}
      }
    }
  }
  window.VimUIV2 = VimUIV2Internal;
})();

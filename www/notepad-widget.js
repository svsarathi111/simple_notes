/* ============================================================
   Notepad Widget — vanilla JS, zero dependencies
   Mobile-enhanced with optional Capacitor haptics
   ============================================================ */

(function (global) {
  "use strict";

  const FONT_FAMILIES = [
    { label: "Sans", value: "Arial, Helvetica, sans-serif" },
    { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
    { label: "Mono", value: "'Courier New', monospace" },
    { label: "Handwriting", value: "'Comic Sans MS', 'Marker Felt', cursive" },
  ];

  const FONT_SIZES = [
    { label: "S", value: "2" },
    { label: "M", value: "3" },
    { label: "L", value: "5" },
    { label: "XL", value: "7" },
  ];

  const BG_PALETTE = ["#fdf6e3", "#fff3b0", "#ffd6e0", "#c7f0db", "#cfe3ff", "#e6d6ff", "#ffffff"];

  const HISTORY_LIMIT = 100;
  const AUTOSAVE_DEBOUNCE_MS = 500;
  const SAVE_INDICATOR_MS = 1400;

  let instanceCounter = 0;
  let haptics = null;

  // Try to load Capacitor haptics if available
  if (typeof window !== "undefined" && window.Capacitor) {
    try {
      haptics = window.Capacitor.Plugins.Haptics;
    } catch (e) {
      // Capacitor not available, run as web app
    }
  }

  function tryHaptic(type = "light") {
    if (!haptics || !haptics.impact) return Promise.resolve();
    try {
      return haptics.impact({ style: type });
    } catch (e) {
      return Promise.resolve();
    }
  }

  class NotepadWidget {
    constructor(container, options = {}) {
      if (!container) throw new Error("NotepadWidget: container element is required");

      instanceCounter += 1;
      this.uid = "npw-" + instanceCounter + "-" + Date.now();

      this.container = container;
      this.options = Object.assign(
        {
          storageKey: "npw-note-" + instanceCounter,
          placeholder: "Type a note…",
          title: "Note",
          defaultBg: BG_PALETTE[0],
          defaultFont: FONT_FAMILIES[0].value,
          useHaptics: true,
        },
        options
      );

      this.history = [];
      this.historyIndex = -1;
      this.suppressHistory = false;
      this.saveTimer = null;
      this.saveIndicatorTimer = null;

      this._buildDom();
      this._bindEvents();
      this._loadFromStorage();
      this._pushHistory(true);
    }

    /* -------- DOM construction -------- */

    _buildDom() {
      const root = document.createElement("div");
      root.className = "npw-root";
      root.innerHTML = `
        <div class="npw-tape"></div>
        <div class="npw-header">
          <span class="npw-title"></span>
          <span class="npw-save-indicator">Saved</span>
        </div>
        <div class="npw-toolbar" role="toolbar" aria-label="Note formatting">
          <button type="button" data-cmd="undo" title="Undo">↺</button>
          <button type="button" data-cmd="redo" title="Redo">↻</button>
          <span class="npw-sep"></span>
          <select id="npw-fontfamily" title="Font"></select>
          <select id="npw-fontsize" title="Size"></select>
          <span class="npw-sep"></span>
          <button type="button" data-cmd="bold" title="Bold"><b>B</b></button>
          <button type="button" data-cmd="italic" title="Italic"><i>I</i></button>
          <button type="button" data-cmd="underline" title="Underline"><u>U</u></button>
          <span class="npw-sep"></span>
          <button type="button" data-cmd="insertUnorderedList" title="List">•≡</button>
          <button type="button" data-cmd="insertOrderedList" title="Numbered">1≡</button>
          <button type="button" data-cmd="insertParagraph" title="Paragraph">¶</button>
          <span class="npw-sep"></span>
          <label title="Text color" style="display:flex;align-items:center;">
            <input type="color" class="npw-color-input" id="npw-textcolor" value="#2e2a24">
          </label>
        </div>
        <div class="npw-bg-row">
          <span class="npw-bg-label">Note color</span>
        </div>
        <div class="npw-body" contenteditable="true" spellcheck="true"></div>
        <div class="npw-footer">
          <span class="npw-updated"></span>
          <button type="button" class="npw-clear-btn">Clear</button>
        </div>
      `;
      this.container.appendChild(root);
      this.root = root;

      this.el = {
        title: root.querySelector(".npw-title"),
        saveIndicator: root.querySelector(".npw-save-indicator"),
        undoBtn: root.querySelector('[data-cmd="undo"]'),
        redoBtn: root.querySelector('[data-cmd="redo"]'),
        fontFamily: root.querySelector("#npw-fontfamily"),
        fontSize: root.querySelector("#npw-fontsize"),
        textColor: root.querySelector("#npw-textcolor"),
        bgRow: root.querySelector(".npw-bg-row"),
        body: root.querySelector(".npw-body"),
        updated: root.querySelector(".npw-updated"),
        clearBtn: root.querySelector(".npw-clear-btn"),
        toolbar: root.querySelector(".npw-toolbar"),
      };

      this.el.title.textContent = this.options.title;
      this.el.body.setAttribute("data-placeholder", this.options.placeholder);

      // Populate dropdowns
      FONT_FAMILIES.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f.value;
        opt.textContent = f.label;
        this.el.fontFamily.appendChild(opt);
      });
      FONT_SIZES.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.value;
        opt.textContent = s.label;
        this.el.fontSize.appendChild(opt);
      });
      this.el.fontFamily.value = this.options.defaultFont;
      this.el.body.style.fontFamily = this.options.defaultFont;
      this.el.fontSize.value = "3";

      // Background swatches
      BG_PALETTE.forEach((color) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "npw-color-swatch";
        btn.style.background = color;
        btn.dataset.bg = color;
        btn.title = color;
        this.el.bgRow.appendChild(btn);
      });
      const customBg = document.createElement("input");
      customBg.type = "color";
      customBg.className = "npw-color-input";
      customBg.title = "Custom";
      customBg.value = "#ffffff";
      this.el.bgRow.appendChild(customBg);
      this.el.customBg = customBg;

      this._setBackground(this.options.defaultBg);
    }

    /* -------- Event binding -------- */

    _bindEvents() {
      const { el } = this;

      // Toolbar commands
      this.el.toolbar.querySelectorAll("button[data-cmd]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const cmd = btn.dataset.cmd;
          if (cmd === "undo") return this.undo();
          if (cmd === "redo") return this.redo();
          this.el.body.focus();
          document.execCommand(cmd, false, null);
          this._updateToolbarState();
          this._afterChange();
          if (this.options.useHaptics) tryHaptic("light");
        });
      });

      el.fontFamily.addEventListener("change", () => {
        const value = el.fontFamily.value;
        this.el.body.focus();
        if (this._hasSelection()) {
          document.execCommand("fontName", false, value);
        } else {
          this.el.body.style.fontFamily = value;
        }
        this._afterChange();
      });

      el.fontSize.addEventListener("change", () => {
        const value = el.fontSize.value;
        this.el.body.focus();
        document.execCommand("fontSize", false, value);
        this._afterChange();
      });

      el.textColor.addEventListener("input", () => {
        this.el.body.focus();
        document.execCommand("foreColor", false, el.textColor.value);
        this._afterChange();
      });

      this.el.bgRow.querySelectorAll(".npw-color-swatch").forEach((btn) => {
        btn.addEventListener("click", () => {
          this._setBackground(btn.dataset.bg);
          this._afterChange();
          if (this.options.useHaptics) tryHaptic("light");
        });
      });

      this.el.customBg.addEventListener("input", () => {
        this._setBackground(this.el.customBg.value);
        this._afterChange();
      });

      el.body.addEventListener("input", () => {
        this._scheduleHistoryPush();
        this._scheduleAutosave();
      });

      el.body.addEventListener("keyup", () => this._updateToolbarState());
      el.body.addEventListener("mouseup", () => this._updateToolbarState());
      el.body.addEventListener("touchend", () => this._updateToolbarState());

      // Keyboard shortcuts
      el.body.addEventListener("keydown", (e) => {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        } else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
          e.preventDefault();
          this.redo();
        }
      });

      el.clearBtn.addEventListener("click", () => {
        if (confirm("Clear this note?")) {
          this.el.body.innerHTML = "";
          this._afterChange(true);
          if (this.options.useHaptics) tryHaptic("medium");
        }
      });
    }

    /* -------- History -------- */

    _scheduleHistoryPush() {
      clearTimeout(this._historyTimer);
      this._historyTimer = setTimeout(() => this._pushHistory(), 400);
    }

    _pushHistory(isInitial) {
      if (this.suppressHistory) return;
      const snapshot = {
        html: this.el.body.innerHTML,
        bg: this.root.style.getPropertyValue("--npw-paper") || this.options.defaultBg,
        font: this.el.body.style.fontFamily,
      };
      const last = this.history[this.historyIndex];
      if (last && last.html === snapshot.html && last.bg === snapshot.bg && last.font === snapshot.font) {
        return;
      }
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(snapshot);
      if (this.history.length > HISTORY_LIMIT) this.history.shift();
      this.historyIndex = this.history.length - 1;
      this._updateToolbarState();
    }

    undo() {
      if (this.historyIndex <= 0) return;
      this.historyIndex -= 1;
      this._applyHistoryState(this.history[this.historyIndex]);
      this._scheduleAutosave();
      if (this.options.useHaptics) tryHaptic("light");
    }

    redo() {
      if (this.historyIndex >= this.history.length - 1) return;
      this.historyIndex += 1;
      this._applyHistoryState(this.history[this.historyIndex]);
      this._scheduleAutosave();
      if (this.options.useHaptics) tryHaptic("light");
    }

    _applyHistoryState(state) {
      this.suppressHistory = true;
      this.el.body.innerHTML = state.html;
      this._setBackground(state.bg, true);
      if (state.font) {
        this.el.body.style.fontFamily = state.font;
        this.el.fontFamily.value = state.font;
      }
      this.suppressHistory = false;
      this._updateToolbarState();
    }

    /* -------- Helpers -------- */

    _hasSelection() {
      const sel = window.getSelection();
      return sel && sel.rangeCount > 0 && !sel.isCollapsed;
    }

    _setBackground(color, skipCustomSync) {
      this.root.style.setProperty("--npw-paper", color);
      this.root.querySelectorAll(".npw-color-swatch").forEach((s) => {
        s.classList.toggle("npw-selected", s.dataset.bg === color);
      });
      if (!skipCustomSync) this.el.customBg.value = this._toHex(color);
    }

    _toHex(color) {
      return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : "#ffffff";
    }

    _updateToolbarState() {
      this.el.undoBtn.disabled = this.historyIndex <= 0;
      this.el.redoBtn.disabled = this.historyIndex >= this.history.length - 1;
      ["bold", "italic", "underline"].forEach((cmd) => {
        const btn = this.el.toolbar.querySelector(`[data-cmd="${cmd}"]`);
        if (!btn) return;
        try {
          btn.classList.toggle("npw-active", document.queryCommandState(cmd));
        } catch (e) {
          // ignore
        }
      });
    }

    _afterChange(immediate) {
      if (immediate) {
        this._pushHistory();
      } else {
        this._scheduleHistoryPush();
      }
      this._scheduleAutosave();
    }

    /* -------- Autosave -------- */

    _scheduleAutosave() {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this._saveToStorage(), AUTOSAVE_DEBOUNCE_MS);
    }

    _saveToStorage() {
      const data = {
        html: this.el.body.innerHTML,
        bg: this.root.style.getPropertyValue("--npw-paper"),
        font: this.el.body.style.fontFamily,
        updatedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(this.options.storageKey, JSON.stringify(data));
        this._showSavedIndicator(data.updatedAt);
      } catch (e) {
        console.warn("NotepadWidget: autosave failed", e);
      }
    }

    _loadFromStorage() {
      try {
        const raw = localStorage.getItem(this.options.storageKey);
        if (!raw) return;
        const data = JSON.parse(raw);
        this.suppressHistory = true;
        if (data.html) this.el.body.innerHTML = data.html;
        if (data.bg) this._setBackground(data.bg);
        if (data.font) {
          this.el.body.style.fontFamily = data.font;
          this.el.fontFamily.value = data.font;
        }
        this.suppressHistory = false;
        if (data.updatedAt) this._setUpdatedLabel(data.updatedAt);
      } catch (e) {
        console.warn("NotepadWidget: load failed", e);
      }
    }

    _showSavedIndicator(isoTime) {
      this.el.saveIndicator.textContent = "Saved";
      this.el.saveIndicator.classList.add("npw-visible");
      clearTimeout(this.saveIndicatorTimer);
      this.saveIndicatorTimer = setTimeout(() => {
        this.el.saveIndicator.classList.remove("npw-visible");
      }, SAVE_INDICATOR_MS);
      this._setUpdatedLabel(isoTime);
    }

    _setUpdatedLabel(isoTime) {
      const d = new Date(isoTime);
      const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      this.el.updated.textContent = "Updated " + time;
    }

    /* -------- Public API -------- */

    getText() {
      return this.el.body.innerText;
    }

    getHTML() {
      return this.el.body.innerHTML;
    }

    setHTML(html) {
      this.el.body.innerHTML = html;
      this._afterChange(true);
    }

    clear() {
      this.el.body.innerHTML = "";
      this._afterChange(true);
    }

    destroy() {
      this.root.remove();
    }
  }

  global.NotepadWidget = NotepadWidget;
})(window);

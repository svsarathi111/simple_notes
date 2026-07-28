/* ============================================================
   Sticky Notes App — initialization & lifecycle
   ============================================================ */

(function () {
  "use strict";

  // Initialize notes
  const notes = [
    {
      id: "note1",
      storageKey: "sticky-note-1",
      title: "Thoughts",
      defaultBg: "#fdf6e3"
    },
    {
      id: "note2",
      storageKey: "sticky-note-2",
      title: "To Do",
      defaultBg: "#fff3b0"
    },
    {
      id: "note3",
      storageKey: "sticky-note-3",
      title: "Ideas",
      defaultBg: "#c7f0db"
    }
  ];

  const widgets = {};

  notes.forEach((cfg) => {
    const container = document.getElementById(cfg.id);
    if (!container) return;

    widgets[cfg.id] = new NotepadWidget(container, {
      storageKey: cfg.storageKey,
      title: cfg.title,
      placeholder: "Type here…",
      defaultBg: cfg.defaultBg,
      useHaptics: true
    });
  });

  // Capacitor lifecycle hooks (optional, for iOS/Android integration)
  if (typeof window.Capacitor !== "undefined" && window.Capacitor.Plugins) {
    const App = window.Capacitor.Plugins.App;

    if (App && App.addListener) {
      // Handle app coming to foreground
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          // App resumed
          console.log("App resumed");
        } else {
          // App paused — make sure any pending saves are flushed
          console.log("App paused");
        }
      });

      // Handle back button (Android)
      App.addListener("backButton", () => {
        // You can handle back navigation here if needed
        // For now, let the app handle it normally
      });
    }
  }

  // Expose widgets globally for debugging/programmatic access
  window.StickyNotesApp = {
    widgets,
    getNote(id) {
      return widgets[id];
    },
    exportAll() {
      const exported = {};
      Object.keys(widgets).forEach(key => {
        exported[key] = widgets[key].getHTML();
      });
      return exported;
    }
  };

  console.log("Sticky Notes app initialized ✓");
})();

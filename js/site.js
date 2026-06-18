/* ==========================================================================
   CNX Cigars Lounge - site.js (shared across all pages)
   Vanilla, deferred. Nav toggle, age gate, scroll reveals, footer year,
   hero cascade trigger. No external dependencies.
   ========================================================================== */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  /* ----------------------------------------------------------------------
     1. Footer year
     ---------------------------------------------------------------------- */
  function setYear() {
    var nodes = document.querySelectorAll("[data-year]");
    var year = String(new Date().getFullYear());
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = year;
    }
  }

  /* ----------------------------------------------------------------------
     2. Mobile nav toggle (Jules's contract)
     [data-nav-toggle] drives aria-expanded; [data-nav] opens via data-open.
     ---------------------------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var nav = document.querySelector("[data-nav]");
    if (!toggle || !nav) return;

    function close() {
      nav.setAttribute("data-open", "false");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }

    function open() {
      nav.setAttribute("data-open", "true");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
    }

    toggle.addEventListener("click", function () {
      var isOpen = nav.getAttribute("data-open") === "true";
      if (isOpen) {
        close();
      } else {
        open();
      }
    });

    /* Close the panel when a nav link is followed (mobile). */
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) close();
    });

    /* Esc closes the panel. */
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.getAttribute("data-open") === "true") {
        close();
        toggle.focus();
      }
    });
  }

  /* ----------------------------------------------------------------------
     3. Hero cascade
     Adds .is-loaded to [data-hero] so the FadeInUp cascade plays once.
     Fires after the age gate is dismissed (or immediately when no gate).
     ---------------------------------------------------------------------- */
  function playHero() {
    var hero = document.querySelector("[data-hero]");
    if (!hero) return;
    hero.classList.add("is-loaded");
  }

  /* ----------------------------------------------------------------------
     4. Age gate (localStorage, focus trap, no-JS safe)
     Markup ships [hidden]. We reveal it on first load when no confirmation
     is stored. Hero cascade waits until the gate is dismissed.
     ---------------------------------------------------------------------- */
  var STORAGE_KEY = "cnx-age-confirmed";

  function storedConfirmation() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  function storeConfirmation() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch (e) {
      /* localStorage unavailable: gate will simply reappear next load. */
    }
  }

  function initAgeGate() {
    var gate = document.getElementById("age-gate");

    if (!gate) {
      playHero();
      return;
    }

    if (storedConfirmation()) {
      gate.hidden = true;
      playHero();
      return;
    }

    var lastFocused = document.activeElement;
    var confirmBtn = gate.querySelector("[data-age-confirm]");

    gate.hidden = false;

    /* Lock body scroll while the gate is open. */
    document.body.style.overflow = "hidden";

    function focusables() {
      return Array.prototype.slice.call(
        gate.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    }

    function trap(event) {
      if (event.key === "Escape") {
        /* Esc does not bypass the gate: it is a compliance step, not a modal. */
        event.preventDefault();
        return;
      }
      if (event.key !== "Tab") return;

      var items = focusables();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function dismiss() {
      storeConfirmation();
      gate.hidden = true;
      document.body.style.overflow = "";
      gate.removeEventListener("keydown", trap);
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
      playHero();
    }

    gate.addEventListener("keydown", trap);
    if (confirmBtn) {
      confirmBtn.addEventListener("click", dismiss);
      confirmBtn.focus();
    }
  }

  /* ----------------------------------------------------------------------
     5. Scroll reveals (opt-in, fire-once)
     .scroll-reveal + IntersectionObserver adds .is-visible.
     Reduced motion forces everything visible immediately.
     ---------------------------------------------------------------------- */
  function initScrollReveals() {
    var items = document.querySelectorAll(".scroll-reveal");
    if (!items.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      for (var i = 0; i < items.length; i++) {
        items[i].classList.add("is-visible");
      }
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    for (var j = 0; j < items.length; j++) {
      observer.observe(items[j]);
    }
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */
  function init() {
    setYear();
    initNav();
    initScrollReveals();
    initAgeGate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

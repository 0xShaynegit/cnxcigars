/* ==========================================================================
   CNX Cigars Lounge - catalogue.js (cigars.html only, deferred)
   Filters, search, sort, active-filter chips, result count, reset,
   URL param sync, and a detail modal sourced from #cigar-data.
   Progressive enhancement: operates on STATIC DOM cards already rendered by
   the server-side HTML. Without JS, the full grid still shows; this only
   filters existing nodes. No JSON is fetched to render the grid.
   ========================================================================== */
(function () {
  "use strict";

  /* Category keys map to the data-* attributes on each .cigar-card. */
  var CATEGORIES = ["brand", "strength", "origin", "wrapper"];

  /* Strength ordering for the "Mild to Full" sort. */
  var STRENGTH_ORDER = { Mild: 1, Medium: 2, Full: 3 };

  var grid = document.querySelector("[data-cigar-grid]");
  var cards = grid
    ? Array.prototype.slice.call(grid.querySelectorAll("[data-name]"))
    : [];
  if (!grid || !cards.length) return;

  var searchInput = document.querySelector("[data-search]");
  var sortSelect = document.querySelector("[data-sort]");
  var chipsWrap = document.querySelector("[data-active-filters]");
  var resetBtn = document.querySelector("[data-reset-filters]");
  var countNode = document.querySelector("[data-result-count]");
  var noResults = document.querySelector("[data-no-results]");
  var totalCards = cards.length;

  /* Capture each card's original DOM order so "Featured" can restore it. */
  cards.forEach(function (card, index) {
    card.dataset.originalIndex = String(index);
  });

  /* ----------------------------------------------------------------------
     State
     ---------------------------------------------------------------------- */
  var state = {
    filters: { brand: [], strength: [], origin: [], wrapper: [] },
    search: "",
    sort: "featured"
  };

  /* ----------------------------------------------------------------------
     URL <-> state
     ?brand=Cohiba,Padron&strength=Medium&q=cedar&sort=brand-az
     ---------------------------------------------------------------------- */
  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    CATEGORIES.forEach(function (cat) {
      var raw = params.get(cat);
      state.filters[cat] = raw ? raw.split(",").filter(Boolean) : [];
    });
    state.search = params.get("q") || "";
    state.sort = params.get("sort") || "featured";
  }

  function writeUrl() {
    var params = new URLSearchParams();
    CATEGORIES.forEach(function (cat) {
      if (state.filters[cat].length) {
        params.set(cat, state.filters[cat].join(","));
      }
    });
    if (state.search) params.set("q", state.search);
    if (state.sort && state.sort !== "featured") params.set("sort", state.sort);

    var query = params.toString();
    var url = window.location.pathname + (query ? "?" + query : "");
    window.history.replaceState(null, "", url);
  }

  /* ----------------------------------------------------------------------
     Sync the form controls to match state (on load and reset)
     ---------------------------------------------------------------------- */
  function syncControls() {
    CATEGORIES.forEach(function (cat) {
      var boxes = document.querySelectorAll(
        'input[type="checkbox"][data-filter="' + cat + '"]'
      );
      Array.prototype.forEach.call(boxes, function (box) {
        box.checked = state.filters[cat].indexOf(box.value) !== -1;
      });
    });
    if (searchInput) searchInput.value = state.search;
    if (sortSelect) sortSelect.value = state.sort;
  }

  /* ----------------------------------------------------------------------
     Matching: AND across categories, OR within a category, plus search
     ---------------------------------------------------------------------- */
  function cardMatches(card) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      var cat = CATEGORIES[i];
      var selected = state.filters[cat];
      if (selected.length) {
        var value = card.getAttribute("data-" + cat) || "";
        if (cat === "wrapper") {
          /* Wrapper data is granular (e.g. "Habano Natural") but filters are
             families (e.g. "Habano"). Match a card if its wrapper contains any
             selected family. OR within the category. */
          var hit = false;
          for (var w = 0; w < selected.length; w++) {
            if (value.toLowerCase().indexOf(selected[w].toLowerCase()) !== -1) {
              hit = true;
              break;
            }
          }
          if (!hit) return false;
        } else if (selected.indexOf(value) === -1) {
          return false;
        }
      }
    }

    if (state.search) {
      var q = state.search.toLowerCase();
      var haystack = [
        card.getAttribute("data-brand") || "",
        card.getAttribute("data-name") || "",
        card.getAttribute("data-flavors") || ""
      ]
        .join(" ")
        .toLowerCase();
      if (haystack.indexOf(q) === -1) return false;
    }

    return true;
  }

  /* ----------------------------------------------------------------------
     Sorting (operates on the visible card nodes, reorders the DOM)
     ---------------------------------------------------------------------- */
  function sortCards(list) {
    var sorted = list.slice();
    switch (state.sort) {
      case "brand-az":
        sorted.sort(function (a, b) {
          return (a.getAttribute("data-name") || "").localeCompare(
            b.getAttribute("data-name") || ""
          );
        });
        break;
      case "strength":
        sorted.sort(function (a, b) {
          var sa = STRENGTH_ORDER[a.getAttribute("data-strength")] || 0;
          var sb = STRENGTH_ORDER[b.getAttribute("data-strength")] || 0;
          return sa - sb;
        });
        break;
      case "newest":
        /* Newest = reverse of original catalogue order (latest additions last). */
        sorted.sort(function (a, b) {
          return (
            Number(b.dataset.originalIndex) - Number(a.dataset.originalIndex)
          );
        });
        break;
      default:
        /* featured: featured cards first, then original order. */
        sorted.sort(function (a, b) {
          var fa = a.getAttribute("data-featured") === "true" ? 0 : 1;
          var fb = b.getAttribute("data-featured") === "true" ? 0 : 1;
          if (fa !== fb) return fa - fb;
          return Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex);
        });
    }
    return sorted;
  }

  /* ----------------------------------------------------------------------
     Active-filter chips (each removable)
     ---------------------------------------------------------------------- */
  function renderChips() {
    if (!chipsWrap) return;
    chipsWrap.innerHTML = "";

    var any = false;
    CATEGORIES.forEach(function (cat) {
      state.filters[cat].forEach(function (value) {
        any = true;
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "filter-chip";
        chip.setAttribute("data-chip-cat", cat);
        chip.setAttribute("data-chip-value", value);
        chip.setAttribute("aria-label", "Remove filter " + value);
        chip.innerHTML =
          '<span>' + value + '</span><span class="filter-chip__x" aria-hidden="true">&times;</span>';
        chipsWrap.appendChild(chip);
      });
    });

    chipsWrap.hidden = !any;
  }

  /* ----------------------------------------------------------------------
     Apply: filter, sort, reflow DOM, update count, chips, no-results, URL
     ---------------------------------------------------------------------- */
  function apply() {
    var visible = [];
    cards.forEach(function (card) {
      if (cardMatches(card)) {
        visible.push(card);
      } else {
        card.hidden = true;
      }
    });

    var ordered = sortCards(visible);
    ordered.forEach(function (card) {
      card.hidden = false;
      grid.appendChild(card); /* reorder by re-appending in sorted order */
    });

    if (countNode) {
      countNode.textContent =
        "Showing " + ordered.length + " of " + totalCards + " cigars";
    }
    if (noResults) noResults.hidden = ordered.length !== 0;

    renderChips();
    writeUrl();
  }

  /* ----------------------------------------------------------------------
     Event wiring
     ---------------------------------------------------------------------- */
  function onCheckboxChange(event) {
    var box = event.target;
    if (box.type !== "checkbox" || !box.getAttribute("data-filter")) return;
    var cat = box.getAttribute("data-filter");
    var list = state.filters[cat];
    var idx = list.indexOf(box.value);
    if (box.checked && idx === -1) {
      list.push(box.value);
    } else if (!box.checked && idx !== -1) {
      list.splice(idx, 1);
    }
    apply();
  }

  function onChipClick(event) {
    var chip = event.target.closest(".filter-chip");
    if (!chip) return;
    var cat = chip.getAttribute("data-chip-cat");
    var value = chip.getAttribute("data-chip-value");
    var list = state.filters[cat];
    var idx = list.indexOf(value);
    if (idx !== -1) list.splice(idx, 1);
    syncControls();
    apply();
  }

  function reset() {
    CATEGORIES.forEach(function (cat) {
      state.filters[cat] = [];
    });
    state.search = "";
    state.sort = "featured";
    syncControls();
    apply();
  }

  var searchTimer = null;
  function onSearchInput() {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () {
      state.search = searchInput.value.trim();
      apply();
    }, 120);
  }

  /* ----------------------------------------------------------------------
     Filter accordion (mobile): [data-filter-toggle] expands [data-filter-panel]
     ---------------------------------------------------------------------- */
  function initFilterAccordion() {
    var toggle = document.querySelector("[data-filter-toggle]");
    var panel = document.querySelector("[data-filter-panel]");
    if (!toggle || !panel) return;
    toggle.addEventListener("click", function () {
      var open = panel.getAttribute("data-open") === "true";
      panel.setAttribute("data-open", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
    });
  }

  /* ----------------------------------------------------------------------
     Detail modal (sourced from inline #cigar-data, no fetch)
     ---------------------------------------------------------------------- */
  var modalData = {};
  function loadModalData() {
    var script = document.getElementById("cigar-data");
    if (!script) return;
    try {
      var arr = JSON.parse(script.textContent);
      arr.forEach(function (item) {
        modalData[item.id] = item;
      });
    } catch (e) {
      /* If parse fails, cards still work; only the modal is unavailable. */
    }
  }

  var modal = document.querySelector("[data-modal]");
  var modalBody = modal ? modal.querySelector("[data-modal-body]") : null;
  var modalCloseEls = modal
    ? modal.querySelectorAll("[data-modal-close]")
    : [];
  var lastModalFocus = null;

  function strengthClass(strength) {
    if (strength === "Mild") return "badge--mild";
    if (strength === "Full") return "badge--full";
    return "badge--medium";
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildModal(item) {
    var flavours = (item.flavorProfile || [])
      .map(function (f) {
        return '<li class="flavour-tag">' + esc(f) + "</li>";
      })
      .join("");

    var waText = encodeURIComponent(
      "Hello CNX Cigars, I would like to ask about the " +
        item.brand +
        " " +
        item.vitola +
        "."
    );

    return [
      '<div class="modal__media placeholder" aria-hidden="true">',
      '  <svg class="placeholder__icon" viewBox="0 0 48 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2" y="8" width="40" height="8" rx="2"/><line x1="42" y1="12" x2="46" y2="12"/></svg>',
      '  <span class="placeholder__caption">Cigar photography to follow</span>',
      "</div>",
      '<div class="modal__detail">',
      '  <p class="eyebrow">' + esc(item.brand) + "</p>",
      '  <h2 id="modal-title" class="modal__title">' + esc(item.vitola) + "</h2>",
      '  <div class="cigar-card__badges">',
      '    <span class="badge ' + strengthClass(item.strength) + '">' + esc(item.strength) + "</span>",
      '    <span class="badge badge--origin">' + esc(item.origin) + "</span>",
      "  </div>",
      '  <p class="modal__meta small">' + esc(item.length) + " &middot; Ring " + esc(item.ringGauge) + " &middot; " + esc(item.wrapper) + " wrapper</p>",
      '  <p class="modal__tasting">' + esc(item.tasting) + "</p>",
      '  <h3 class="modal__subhead">History</h3>',
      '  <p>' + esc(item.history) + "</p>",
      '  <h3 class="modal__subhead">Why we love it</h3>',
      '  <p>' + esc(item.whyWeLoveIt) + "</p>",
      '  <ul class="flavour-tags" aria-label="Flavour notes">' + flavours + "</ul>",
      '  <p class="modal__availability small">Availability: ' + esc(item.availability) + "</p>",
      '  <div class="modal__actions">',
      '    <a class="btn btn-primary" href="contact.html">Schedule a Tasting</a>',
      '    <a class="btn btn-secondary" href="https://wa.me/PHONE_PLACEHOLDER?text=' + waText + '" rel="noopener" target="_blank">Message about this cigar</a>',
      "  </div>",
      "</div>"
    ].join("");
  }

  function focusablesIn(el) {
    return Array.prototype.slice.call(
      el.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  }

  function modalTrap(event) {
    if (event.key === "Escape") {
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    var items = focusablesIn(modal);
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

  function openModal(id) {
    if (!modal || !modalBody || !modalData[id]) return;
    lastModalFocus = document.activeElement;
    modalBody.innerHTML = buildModal(modalData[id]);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", modalTrap);
    var firstClose = modal.querySelector("[data-modal-close]");
    if (firstClose) firstClose.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", modalTrap);
    if (lastModalFocus && typeof lastModalFocus.focus === "function") {
      lastModalFocus.focus();
    }
  }

  function initModal() {
    if (!modal) return;
    loadModalData();

    grid.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-cigar-id]");
      if (!trigger) return;
      event.preventDefault();
      openModal(trigger.getAttribute("data-cigar-id"));
    });

    Array.prototype.forEach.call(modalCloseEls, function (el) {
      el.addEventListener("click", closeModal);
    });
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */
  function init() {
    readUrl();
    syncControls();

    document.addEventListener("change", onCheckboxChange);
    if (chipsWrap) chipsWrap.addEventListener("click", onChipClick);
    if (resetBtn) resetBtn.addEventListener("click", reset);
    if (searchInput) searchInput.addEventListener("input", onSearchInput);
    if (sortSelect)
      sortSelect.addEventListener("change", function () {
        state.sort = sortSelect.value;
        apply();
      });

    initFilterAccordion();
    initModal();
    apply();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

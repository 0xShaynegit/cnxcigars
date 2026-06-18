/* ==========================================================================
   CNX Cigars Lounge - forms.js (shared)
   Client-side validation for the newsletter (and later the contact form).
   Calm inline messaging per the brief. POST to FORM_ENDPOINT_PLACEHOLDER.
   Graceful: no real endpoint yet, so a failed/placeholder POST still gives
   the visitor a calm confirmation rather than an error.
   ========================================================================== */
(function () {
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PLACEHOLDER_ENDPOINT = "FORM_ENDPOINT_PLACEHOLDER";

  function isValidEmail(value) {
    return EMAIL_RE.test(String(value).trim());
  }

  /* Find or build a calm status line for a form. */
  function statusNode(form) {
    var node = form.querySelector("[data-form-status]");
    if (!node) {
      node = document.createElement("p");
      node.className = "field__hint";
      node.setAttribute("data-form-status", "");
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      form.appendChild(node);
    }
    return node;
  }

  function setStatus(form, message, isError) {
    var node = statusNode(form);
    node.textContent = message;
    node.classList.toggle("field__error", !!isError);
    node.classList.toggle("field__hint", !isError);
  }

  function handleNewsletter(form) {
    var input = form.querySelector('input[type="email"]');
    if (!input) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var email = input.value;
      var field = input.closest(".field");

      if (!isValidEmail(email)) {
        if (field) field.classList.add("field--error");
        setStatus(form, "Please enter a valid email address.", true);
        input.focus();
        return;
      }

      if (field) field.classList.remove("field--error");
      setStatus(form, "One moment.", false);

      var endpoint = form.getAttribute("action") || PLACEHOLDER_ENDPOINT;
      var done = function () {
        form.reset();
        setStatus(form, "Thank you. You are on the list for tastings and new arrivals.", false);
      };

      /* No real endpoint yet: confirm gracefully without surfacing an error. */
      if (endpoint === PLACEHOLDER_ENDPOINT || !window.fetch) {
        done();
        return;
      }

      window
        .fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: String(email).trim() })
        })
        .then(done)
        .catch(function () {
          /* Calm fallback: never show a harsh failure to the visitor. */
          done();
        });
    });
  }

  function init() {
    var forms = document.querySelectorAll(".newsletter");
    for (var i = 0; i < forms.length; i++) {
      handleNewsletter(forms[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* Milton Pace Music Academy - site behaviour
   No dependencies, no build step. Loaded with `defer`.

   CONFIG: set FORM_ENDPOINT once a form backend exists (Formspree, Netlify
   Forms, or an internal handler). While it is empty the booking form
   validates, then opens a pre-filled email to FORM_FALLBACK_EMAIL so the
   page is usable from day one.                                            */
(function () {
  'use strict';

  var FORM_ENDPOINT = '';                       // e.g. 'https://formspree.io/f/xxxxxxx'
  var FORM_FALLBACK_EMAIL = 'hello@miltonpacemusic.com';

  /* ---------- media slots ------------------------------------------------ */
  /* <div class="media" data-src="assets/img/hero.jpg" data-alt="..."
          data-label="HERO 1600x1100"></div>
     Renders the image when the file exists, otherwise paints the labelled
     placeholder so the layout never collapses before media arrives.        */
  function hydrateMedia() {
    document.querySelectorAll('.media[data-src]').forEach(function (slot) {
      var src = slot.getAttribute('data-src');
      if (!src) { slot.classList.add('is-empty'); return; }

      var probe = new Image();
      probe.onload = function () {
        var img = document.createElement('img');
        img.src = src;
        img.alt = slot.getAttribute('data-alt') || '';
        img.loading = slot.hasAttribute('data-eager') ? 'eager' : 'lazy';
        img.decoding = 'async';
        slot.classList.remove('is-empty');
        slot.appendChild(img);
      };
      probe.onerror = function () { slot.classList.add('is-empty'); };
      probe.src = src;
    });
  }

  /* ---------- mobile navigation ------------------------------------------ */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');
    if (!toggle || !nav) { return; }

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { setOpen(false); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) { setOpen(false); }
    });
  }

  /* ---------- sticky header shadow --------------------------------------- */
  function initHeader() {
    var header = document.querySelector('.site-header');
    if (!header) { return; }
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- scroll reveal ---------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) { return; }

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- booking form ------------------------------------------------ */
  function initForm() {
    var form = document.getElementById('book-form');
    if (!form) { return; }

    var status = form.querySelector('.form-status');

    function fieldError(input, message) {
      var holder = input.closest('.field');
      var slot = holder && holder.querySelector('.error');
      if (slot) { slot.textContent = message || ''; }
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }

    function validate() {
      var firstBad = null;
      form.querySelectorAll('[required]').forEach(function (input) {
        var value = (input.value || '').trim();
        var message = '';

        if (!value) {
          message = 'Please fill this in.';
        } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
          message = 'Please check this email address.';
        } else if (input.type === 'tel' && value.replace(/\D/g, '').length < 7) {
          message = 'Please check this phone number.';
        }

        fieldError(input, message);
        if (message && !firstBad) { firstBad = input; }
      });
      return firstBad;
    }

    form.querySelectorAll('[required]').forEach(function (input) {
      input.addEventListener('blur', function () {
        if (input.getAttribute('aria-invalid') === 'true') { validate(); }
      });
      input.addEventListener('input', function () {
        if (input.getAttribute('aria-invalid') === 'true') { fieldError(input, ''); }
      });
    });

    function say(message, state) {
      status.textContent = message;
      status.setAttribute('data-state', state);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (form.querySelector('.hp input').value) { return; }  // honeypot

      var bad = validate();
      if (bad) {
        say('A couple of fields still need you. We highlighted them above.', 'err');
        bad.focus();
        return;
      }

      var data = new FormData(form);

      if (!FORM_ENDPOINT) {
        var lines = [];
        data.forEach(function (value, key) {
          if (key !== 'company' && value) { lines.push(key + ': ' + value); }
        });
        window.location.href = 'mailto:' + FORM_FALLBACK_EMAIL +
          '?subject=' + encodeURIComponent('Free intro lesson request') +
          '&body=' + encodeURIComponent(lines.join('\n'));
        say('Opening your email app so you can send this to us. We reply within one business day.', 'ok');
        return;
      }

      say('Sending...', '');
      fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) { throw new Error('Request failed'); }
        form.reset();
        say('Got it. We will call or email you within one business day to set up your visit.', 'ok');
      }).catch(function () {
        say('That did not go through. Please call us or email ' + FORM_FALLBACK_EMAIL + '.', 'err');
      });
    });
  }

  /* ---------- misc -------------------------------------------------------- */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function init() {
    hydrateMedia();
    initNav();
    initHeader();
    initReveal();
    initForm();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

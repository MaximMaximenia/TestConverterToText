(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};

  /* ---------- цены ---------- */
  var priceOldEl = document.getElementById("priceOld");
  var priceNewEl = document.getElementById("priceNew");
  var priceNoteEl = document.getElementById("priceNote");
  var signupSubtitleEl = document.getElementById("signupSubtitle");

  if (cfg.priceOld && priceOldEl) priceOldEl.textContent = cfg.priceOld;
  if (cfg.priceNew && priceNewEl) priceNewEl.textContent = cfg.priceNew;
  if (cfg.freeUntilText && priceNoteEl) priceNoteEl.textContent = cfg.freeUntilText;
  if (signupSubtitleEl && cfg.priceOld) {
    signupSubtitleEl.textContent = "Обычная цена — " + cfg.priceOld + ". " + (cfg.freeUntilText || "");
  }

  /* ---------- имя эксперта в title/шапке при желании ---------- */
  if (cfg.expertName) {
    document.querySelectorAll("[data-expert-name]").forEach(function (el) {
      el.textContent = cfg.expertName;
    });
  }

  /* ---------- таймер ---------- */
  var target = cfg.webinarDate ? new Date(cfg.webinarDate) : null;

  function pad(n) { return String(n).padStart(2, "0"); }

  function renderCountdown(prefix, days, hours, mins, secs) {
    var d = document.getElementById(prefix + "-days");
    var h = document.getElementById(prefix + "-hours");
    var m = document.getElementById(prefix + "-mins");
    var s = document.getElementById(prefix + "-secs");
    if (d) d.textContent = pad(days);
    if (h) h.textContent = pad(hours);
    if (m) m.textContent = pad(mins);
    if (s) s.textContent = pad(secs);
  }

  function tick() {
    if (!target || isNaN(target.getTime())) return;

    var now = new Date();
    var diff = target.getTime() - now.getTime();

    if (diff <= 0) {
      renderCountdown("cd", 0, 0, 0, 0);
      renderCountdown("cd2", 0, 0, 0, 0);
      return;
    }

    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    var mins = Math.floor((diff / (1000 * 60)) % 60);
    var secs = Math.floor((diff / 1000) % 60);

    renderCountdown("cd", days, hours, mins, secs);
    renderCountdown("cd2", days, hours, mins, secs);
  }

  tick();
  setInterval(tick, 1000);

  /* ---------- видео ---------- */
  var frame = document.getElementById("videoFrame");
  var playBtn = document.getElementById("videoPlayBtn");
  var video = document.getElementById("webinarVideo");
  var videoSrcTag = document.getElementById("webinarVideoSrc");

  if (cfg.videoSrc && videoSrcTag) videoSrcTag.src = cfg.videoSrc;
  if (cfg.videoPoster && video) video.setAttribute("poster", cfg.videoPoster);
  if (video) video.load();

  if (playBtn && video && frame) {
    playBtn.addEventListener("click", function () {
      frame.classList.add("is-playing");
      video.play().catch(function () {
        /* автоплей может быть заблокирован — пользователь нажмёт play на самом видео */
      });
    });
  }

  /* ---------- форма записи ---------- */
  var form = document.getElementById("signupForm");
  var successEl = document.getElementById("formSuccess");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var data = {
        name: form.elements["name"].value.trim(),
        phone: form.elements["phone"].value.trim(),
        webinarDate: cfg.webinarDate || ""
      };

      if (cfg.formEndpoint) {
        fetch(cfg.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        }).catch(function () {
          /* даже если отправка на сервер не удалась, показываем пользователю подтверждение,
             чтобы не терять заявку на глазах у человека — свяжитесь с ним вручную при необходимости */
        });
      }

      form.reset();
      form.hidden = true;
      if (successEl) successEl.hidden = false;
    });
  }

  /* ---------- год в футере ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

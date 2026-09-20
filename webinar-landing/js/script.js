(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};

  /* ---------- Google Analytics 4 ---------- */
  function gaEvent(name, params) {
    if (typeof window.gtag === "function") window.gtag("event", name, params || {});
  }

  if (cfg.gaMeasurementId) {
    var gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src = "https://www.googletagmanager.com/gtag/js?id=" + cfg.gaMeasurementId;
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", cfg.gaMeasurementId);
  }

  /* ---------- Яндекс.Метрика ---------- */
  function ymGoal(name) {
    if (cfg.yandexMetrikaId && typeof window.ym === "function") {
      window.ym(cfg.yandexMetrikaId, "reachGoal", name);
    }
  }

  if (cfg.yandexMetrikaId) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    window.ym(cfg.yandexMetrikaId, "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true
    });
  }

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
      gaEvent("video_play", { video_title: "webinar_preview" });
      ymGoal("video_play");
      video.play().catch(function () {
        /* автоплей может быть заблокирован — пользователь нажмёт play на самом видео */
      });
    });
  }

  /* ---------- прогресс просмотра видео (для целей в GA4) ---------- */
  if (video) {
    var reachedMarks = {};
    var marks = [25, 50, 75, 95];
    video.addEventListener("timeupdate", function () {
      if (!video.duration) return;
      var percent = (video.currentTime / video.duration) * 100;
      marks.forEach(function (mark) {
        if (percent >= mark && !reachedMarks[mark]) {
          reachedMarks[mark] = true;
          gaEvent("video_progress", { video_title: "webinar_preview", percent_watched: mark });
          ymGoal("video_" + mark);
        }
      });
    });
  }

  /* ---------- форма записи ---------- */
  var form = document.getElementById("signupForm");
  var successEl = document.getElementById("formSuccess");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      /* поле-ловушка: настоящий человек его не видит и не заполняет.
         если оно заполнено — это бот, тихо игнорируем отправку */
      if (form.elements["company"] && form.elements["company"].value.trim() !== "") {
        return;
      }

      var data = {
        name: form.elements["name"].value.trim(),
        phone: form.elements["phone"].value.trim(),
        webinarDate: cfg.webinarDate || ""
      };

      gaEvent("generate_lead", { webinar_date: cfg.webinarDate || "" });
      ymGoal("lead_submit");

      if (cfg.telegramBotToken && cfg.telegramChatId) {
        var tgText = "🎯 Новая заявка на вебинар!\n" +
          "Имя: " + data.name + "\n" +
          "Телефон/Telegram: " + data.phone + "\n" +
          "Дата вебинара: " + (cfg.webinarDate || "не указана");
        var tgUrl = "https://api.telegram.org/bot" + cfg.telegramBotToken +
          "/sendMessage?chat_id=" + cfg.telegramChatId + "&text=" + encodeURIComponent(tgText);
        fetch(tgUrl).catch(function () {
          /* если Telegram недоступен, заявку всё равно не теряем — форма ниже покажет подтверждение */
        });
      }

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

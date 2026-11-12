(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};

  /* ---------- UTM-метки ----------
     Если человек пришёл по ссылке с ?utm_source=...&utm_campaign=... —
     запоминаем эти метки на весь визит (на случай, если он кликнет не
     сразу по форме, а погуляет по странице) и подставляем их в заявку,
     которая летит в Telegram. Заодно utm_term используем, чтобы
     подставить заголовок под конкретную рекламную группу — см. ниже. */
  function captureUtm() {
    var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    var params = new URLSearchParams(window.location.search);
    var hasAny = false;
    var utm = {};
    keys.forEach(function (key) {
      var value = params.get(key);
      if (value) hasAny = true;
      utm[key] = value || "";
    });
    try {
      if (hasAny) {
        sessionStorage.setItem("leadUtm", JSON.stringify(utm));
      } else {
        var stored = sessionStorage.getItem("leadUtm");
        if (stored) utm = JSON.parse(stored);
      }
    } catch (e) { /* приватный режим и т.п. — просто не запомнится между переходами по странице */ }
    return utm;
  }
  var utmData = captureUtm();

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

  /* ---------- Яндекс.Метрика ----------
     Счётчик уже подключен и инициализирован напрямую в <head> страницы
     (index.html и thanks/index.html) — здесь только отправляем в него
     цели по ходу визита. */
  function ymGoal(name) {
    if (cfg.yandexMetrikaId && typeof window.ym === "function") {
      window.ym(cfg.yandexMetrikaId, "reachGoal", name);
    }
  }

  /* ---------- имя эксперта в title/шапке при желании ---------- */
  if (cfg.expertName) {
    document.querySelectorAll("[data-expert-name]").forEach(function (el) {
      el.textContent = cfg.expertName;
    });
  }

  /* ---------- заголовок первого экрана под рекламную группу ----------
     utm_term у объявления говорит, с каким запросом пришёл человек —
     подставляем заголовок, который отвечает именно на его ситуацию.
     Что прописывать в utm_term у объявлений — см. список ключей ниже. */
  var headlineByTerm = [
    { match: ["vozrazheniya", "dorogo", "podumaet", "podumayu"], text: "Клиент сказал «я подумаю» и пропал. Разберём, что сказать вместо этого" },
    { match: ["skripty", "etapy"], text: "Разберём ваш созвон по шагам и найдём, где он разваливается" },
    { match: ["poisk_klientov", "zayavki"], text: "Заявки есть, оплат нет. За 30 минут найдём, где они теряются" },
    { match: ["obuchenie", "kursy"], text: "Вместо курса — разбор ваших продаж. 30 минут, бесплатно" },
    { match: ["nastavnichestvo", "kouching", "konsultacii"], text: "Покажу, почему вашу консультацию не покупают после первого созвона" }
  ];
  (function applyHeadline() {
    var heroTitleEl = document.getElementById("heroTitle");
    if (!heroTitleEl || !utmData.utm_term) return;
    var term = utmData.utm_term.toLowerCase();
    for (var i = 0; i < headlineByTerm.length; i++) {
      var group = headlineByTerm[i];
      for (var j = 0; j < group.match.length; j++) {
        if (term.indexOf(group.match[j]) !== -1) {
          heroTitleEl.textContent = group.text;
          return;
        }
      }
    }
  })();

  /* ---------- видео-отзывы ---------- */
  document.querySelectorAll(".review-video[data-video-src]").forEach(function (frameEl) {
    var reviewVideo = frameEl.querySelector(".review-video__el");
    var reviewPlayBtn = frameEl.querySelector(".video-play");
    if (!reviewVideo || !reviewPlayBtn) return;

    var src = frameEl.getAttribute("data-video-src");
    var poster = frameEl.getAttribute("data-video-poster");
    if (src) reviewVideo.innerHTML = '<source src="' + src + '" type="video/mp4">';
    if (poster) reviewVideo.setAttribute("poster", poster);
    reviewVideo.load();

    reviewPlayBtn.addEventListener("click", function () {
      frameEl.classList.add("is-playing");
      reviewVideo.play().catch(function () {
        /* автоплей может быть заблокирован — пользователь нажмёт play на самом видео */
      });
    });

    /* клик по самому видео переключает play/pause — не трогаем нижнюю
       полосу ~36px, там нативный бар перемотки/звука браузера */
    reviewVideo.addEventListener("click", function (e) {
      var barHeight = 36;
      if (e.offsetY > reviewVideo.clientHeight - barHeight) return;
      if (reviewVideo.paused || reviewVideo.ended) {
        reviewVideo.play().catch(function () {});
      } else {
        reviewVideo.pause();
      }
    });

    var reviewReached50 = false;
    reviewVideo.addEventListener("timeupdate", function () {
      if (!reviewVideo.duration || reviewReached50) return;
      var percent = (reviewVideo.currentTime / reviewVideo.duration) * 100;
      if (percent >= 50) {
        reviewReached50 = true;
        ymGoal("review_video_50");
      }
    });
  });

  /* ---------- формы записи (их на странице две — в первом экране и в конце) ----------
     Поле контакта принимает и телеграм (@username), и телефон —
     проверка нарочно нестрогая, чтобы не отсеивать живых людей. */
  var contactPattern = /^@?[A-Za-z0-9_]{5,32}$|^\+?[\d\s().-]{10,18}$/;

  document.querySelectorAll("form.lead-form-el").forEach(function (form) {
    var errorEl = form.parentElement.querySelector(".lead-form__error");
    var defaultErrorText = errorEl ? errorEl.textContent : "";

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (errorEl) { errorEl.hidden = true; errorEl.textContent = defaultErrorText; }

      var name = form.elements["name"].value.trim();
      var contact = form.elements["contact"].value.trim();
      var honeypot = form.elements["company"] ? form.elements["company"].value.trim() : "";

      if (name === "") {
        if (errorEl) { errorEl.textContent = "Напишите, как к вам обращаться"; errorEl.hidden = false; }
        return;
      }
      if (!contactPattern.test(contact)) {
        if (errorEl) { errorEl.textContent = "Укажите телеграм (начинается с @) или номер телефона"; errorEl.hidden = false; }
        return;
      }

      var submitBtn = form.querySelector("button[type=submit]");
      if (submitBtn) submitBtn.disabled = true;

      fetch(cfg.leadEndpoint || "/api/lead.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          contact: contact,
          utm: utmData,
          company: honeypot
        })
      })
        .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
        .then(function (res) {
          if (!res || !res.ok) {
            throw new Error(res && res.error ? res.error : "request_failed");
          }
          gaEvent("generate_lead", {});
          ymGoal("lead_submit");
          if (window.clarity) window.clarity("set", "lead", "confirmed");
          try { sessionStorage.setItem("leadToken", res.token || "1"); } catch (e) { /* без sessionStorage просто не будет защиты от прямого захода на /thanks/ */ }
          window.location.href = "/thanks/";
        })
        .catch(function () {
          if (submitBtn) submitBtn.disabled = false;
          if (errorEl) {
            errorEl.textContent = "Не получилось отправить заявку. Попробуйте ещё раз через минуту.";
            errorEl.hidden = false;
          }
        });
    });
  });

  /* ---------- год в футере ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

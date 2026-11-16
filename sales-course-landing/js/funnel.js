(function () {
  "use strict";

  var METRIKA_ID = "113657567";

  function ymGoal(name) {
    if (typeof window.ym === "function") window.ym(METRIKA_ID, "reachGoal", name);
  }
  window.funnelYmGoal = ymGoal;

  /* ---------- UTM-метки на весь визит по воронке (все 3 шага) ---------- */
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
        sessionStorage.setItem("funnelUtm", JSON.stringify(utm));
      } else {
        var stored = sessionStorage.getItem("funnelUtm");
        if (stored) utm = JSON.parse(stored);
      }
    } catch (e) { /* без sessionStorage просто не сохранится между шагами */ }
    return utm;
  }
  var utmData = captureUtm();
  window.funnelUtm = utmData;

  /* ---------- подстановка заголовка 1-го шага под рекламную группу ----------
     utm_term у объявления = с каким запросом пришёл человек. Что прописывать
     в utm_term у объявлений — см. ключи ниже. */
  var headlineByTerm = [
    { match: ["zarabotok", "internet", "dengi_online"], text: 'Хочешь зарабатывать в интернете? <span class="accent">Научись продавать</span>' },
    { match: ["kak_prodavat", "navyki_prodazh", "prodazhi"], text: 'ИИ заменит многих. <span class="accent">Продажи — никогда</span>' },
    { match: ["professiya", "novaya_professiya", "smena_professii"], text: 'Новая профессия, которая всегда нужна — <span class="accent">продажи</span>' }
  ];
  (function applyHeadline() {
    var el = document.getElementById("step1Headline");
    if (!el || !utmData.utm_term) return;
    var term = utmData.utm_term.toLowerCase();
    for (var i = 0; i < headlineByTerm.length; i++) {
      var group = headlineByTerm[i];
      for (var j = 0; j < group.match.length; j++) {
        if (term.indexOf(group.match[j]) !== -1) {
          el.innerHTML = group.text;
          return;
        }
      }
    }
  })();

  /* ---------- капча больше не используется в этой воронке — только honeypot ---------- */
  var contactPattern = /^@?[A-Za-z0-9_]{5,32}$|^\+?[\d\s().-]{10,18}$/;

  document.querySelectorAll("form.lead-form-el").forEach(function (form) {
    var errorEl = form.parentElement.querySelector(".lead-form__error");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (errorEl) errorEl.hidden = true;

      var name = form.elements["name"].value.trim();
      var contact = form.elements["contact"].value.trim();
      var honeypot = form.elements["company"] ? form.elements["company"].value.trim() : "";

      if (name === "") {
        if (errorEl) { errorEl.textContent = "Напиши, как к тебе обращаться"; errorEl.hidden = false; }
        return;
      }
      if (!contactPattern.test(contact)) {
        if (errorEl) { errorEl.textContent = "Укажи телеграм (начинается с @) или номер телефона"; errorEl.hidden = false; }
        return;
      }

      var submitBtn = form.querySelector("button[type=submit]");
      if (submitBtn) submitBtn.disabled = true;

      var apiUrl = form.getAttribute("data-api") || "api/lead.php";
      var thanksUrl = form.getAttribute("data-thanks") || "thanks/";

      fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, contact: contact, utm: utmData, company: honeypot })
      })
        .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
        .then(function (res) {
          if (!res || !res.ok) throw new Error(res && res.error ? res.error : "request_failed");
          ymGoal("funnel_lead_submit");
          if (window.clarity) window.clarity("set", "lead", "confirmed");
          try { sessionStorage.setItem("leadToken", res.token || "1"); } catch (e) {}
          window.location.href = thanksUrl;
        })
        .catch(function () {
          if (submitBtn) submitBtn.disabled = false;
          if (errorEl) {
            errorEl.textContent = "Не получилось отправить — попробуй ещё раз через минуту.";
            errorEl.hidden = false;
          }
        });
    });
  });
})();

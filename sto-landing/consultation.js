document.addEventListener("DOMContentLoaded", function () {
    const TELEGRAM_BOT_TOKEN = "7724314363:AAG5OuDDLOTpz7DT0UjXPvWGkqdKENkGMiw";
    const TELEGRAM_CHAT_ID = "636168342";

    const form = document.getElementById("consultForm");
    const submitBtn = document.getElementById("submitBtn");
    const status = document.getElementById("formStatus");
    const nameInput = document.getElementById("userName");
    const tgInput = document.getElementById("userTg");

    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const name = nameInput.value.trim();
        let tg = tgInput.value.trim();

        if (!name) {
            showStatus("Укажите, пожалуйста, имя.", "err");
            nameInput.focus();
            return;
        }
        if (!tg) {
            showStatus("Укажите, пожалуйста, телеграм.", "err");
            tgInput.focus();
            return;
        }
        if (!tg.startsWith("@")) tg = "@" + tg;

        submitBtn.disabled = true;
        submitBtn.textContent = "Отправляем...";

        const message =
            "🔧 Новая заявка со страницы СТО!\n" +
            "👤 Имя: " + name + "\n" +
            "✈️ Telegram: " + tg + "\n" +
            "⏰ Время: " + new Date().toLocaleString("ru-RU");

        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
        })
            .then(response => response.json())
            .then(data => {
                if (data.ok) {
                    form.reset();
                    form.style.display = "none";
                    showStatus("Спасибо! Заявка отправлена, я свяжусь с вами в Telegram в ближайшее время.", "ok");
                } else {
                    throw new Error("Telegram API error");
                }
            })
            .catch(error => {
                console.error("Ошибка отправки заявки:", error);
                showStatus("Не удалось отправить заявку. Попробуйте ещё раз или напишите нам напрямую в Telegram.", "err");
                submitBtn.disabled = false;
                submitBtn.textContent = "Записаться на консультацию";
            });
    });

    function showStatus(text, type) {
        status.textContent = text;
        status.className = "form-status " + type;
    }
});

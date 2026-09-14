(() => {
  const rules = [
    [/todoist/i, "todoist", "#e44332"],
    [/mercado pago/i, "mercado-pago", "#00b1ea"],
    [/cloudflare/i, "cloudflare", "#f6821f"],
    [/comandeiro/i, "comandeiro", "#ff6b35"],
    [/\b(lojas|loja)\b/i, "lojas", "#a855f7"],
    [/\bgoogle\b/i, "google", "#4285f4"],
    [/\bpostgres\b/i, "postgres", "#4f92ce"],
    [/\b(smtp|mail)\b/i, "mail", "#14b8a6"],
    [/\b(sms|twilio)\b/i, "sms", "#ef4444"],
    [/\bn8n\b/i, "n8n", "#ea4b71"],
    [/(auth|avila|ávila)/i, "avila", "#f97316"],
  ];

  const normalized = (value) => (value || "").replace(/\s+/g, " ").trim();

  function findRow(label) {
    const resource = label.closest('[data-test-id="resources-list-item"]');
    if (resource) return resource;
    let element = label;
    while (element && element !== document.body) {
      const rect = element.getBoundingClientRect();
      const text = normalized(element.textContent);
      if (rect.height >= 26 && rect.height <= 72 && rect.width >= 260 && text.length <= 180) return element;
      element = element.parentElement;
    }
    return null;
  }

  function decorate() {
    if (!location.pathname.includes("/home/credentials") && !document.querySelector('input[placeholder*="credential name" i]')) return;

    const leaves = [...document.querySelectorAll('[data-test-id="resources-list-item"] h2')].filter((element) => {
      const text = normalized(element.textContent);
      return text && rules.some(([pattern]) => pattern.test(text));
    });

    for (const label of leaves) {
      const name = normalized(label.textContent);
      const rule = rules.find(([pattern]) => pattern.test(name));
      if (!rule) continue;
      const row = findRow(label);
      const [, icon, color] = rule;
      if (!row || row.dataset.avilaCredential === icon) continue;

      let image = row.querySelector(".avila-credential-icon");
      if (!image) {
        const original = row.querySelector('[data-test-id="card-prepend"] svg, [data-test-id="card-prepend"] img');
        if (!original) continue;
        image = document.createElement("img");
        image.className = "avila-credential-icon";
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        original.replaceWith(image);
      }
      image.src = `/avila-credential-icons/${icon}.svg`;
      row.dataset.avilaCredential = icon;
      row.style.setProperty("--avila-credential-color", color);
    }
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; decorate(); });
  };

  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", schedule);
  schedule();
})();

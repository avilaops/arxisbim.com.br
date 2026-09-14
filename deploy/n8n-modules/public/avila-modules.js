(() => {
  const modules = {
    insights: { title: "Insights" }, config: { title: "Variables" }, spaces: { title: "Projects" },
    roles: { title: "Roles" }, vault: { title: "External secrets" }, environments: { title: "Environments" },
    sso: { title: "SSO" }, directory: { title: "LDAP" }, events: { title: "Log streaming" },
    copilot: { title: "AI Assistant" },
  };
  const nativeSelectors = new Map([
    ["#settings-roles", "roles"], ["#settings-external-secrets", "vault"],
    ["#settings-source-control", "environments"], ["#settings-sso", "sso"],
    ["#settings-ldap", "directory"], ["#settings-log-streaming", "events"],
    ["#settings-instance-ai", "copilot"],
  ]);
  const text = (element) => (element?.textContent || "").replace(/\s+/g, " ").trim();

  function smallestMenuItem(element) {
    const setting = element.closest("[id^='settings-'],#sign-out");
    if (setting) return setting;
    const semantic = element.closest("a,button,li,[role='menuitem']");
    if (semantic) return semantic;
    let current = element;
    for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
      const rect = current.getBoundingClientRect();
      if (rect.height >= 24 && rect.height <= 60 && rect.width <= 460) return current;
    }
    return null;
  }

  function replaceExactText(element, expected, replacement) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if ((node.nodeValue || "").trim() === expected) {
        node.nodeValue = node.nodeValue.replace(expected, replacement);
        return true;
      }
      node = walker.nextNode();
    }
    return false;
  }

  function addOwnedBadge(item) {
    if (item.querySelector(":scope .avila-owned-badge")) return;
    const badge = document.createElement("span");
    badge.className = "avila-owned-badge";
    badge.textContent = "Ávila";
    badge.setAttribute("aria-hidden", "true");
    item.appendChild(badge);
  }

  function markItem(item, module) {
    if (!item || item.dataset.avilaModule) return;
    item.dataset.avilaModule = module;
    item.dataset.avilaOwned = "true";
    item.setAttribute("aria-label", `${modules[module].title} - módulo Ávila`);
    for (const badge of item.querySelectorAll("span,small,div")) {
      const label = text(badge).toLowerCase();
      if (label === "new" || label === "preview") badge.style.display = "none";
    }
    addOwnedBadge(item);
  }

  function decorateNativeEntries() {
    for (const [selector, module] of nativeSelectors) markItem(document.querySelector(selector), module);
    for (const element of document.querySelectorAll("[id='insights'],a[href*='/insights']")) {
      if (text(element).toLowerCase() === "insights") markItem(smallestMenuItem(element) || element, "insights");
    }
    for (const link of document.querySelectorAll("a[href*='/home/variables']")) markItem(link, "config");
  }

  function insertProjectsEntry() {
    if (document.querySelector("[data-avila-module='spaces']")) return;
    for (const element of document.querySelectorAll("a,button,span,div")) {
      if (text(element) !== "Personal") continue;
      const item = smallestMenuItem(element);
      if (!item || !item.parentElement) continue;
      let menu = item.parentElement;
      let belongsToSettingsMenu = false;
      for (let depth = 0; menu && depth < 7; depth += 1, menu = menu.parentElement) {
        const rect = menu.getBoundingClientRect();
        const labels = text(menu).toLowerCase();
        if (rect.width <= 500 && labels.includes("usage and plan") && labels.includes("users") && labels.includes("sign out")) {
          belongsToSettingsMenu = true;
          break;
        }
      }
      if (!belongsToSettingsMenu) continue;
      const clone = item.cloneNode(true);
      clone.removeAttribute?.("id");
      clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      replaceExactText(clone, "Personal", "Projects");
      clone.querySelectorAll("[href]").forEach((node) => node.removeAttribute("href"));
      clone.removeAttribute("href");
      clone.dataset.avilaModule = "spaces";
      clone.dataset.avilaOwned = "true";
      clone.setAttribute("aria-label", "Projects - módulo Ávila");
      item.after(clone);
      return;
    }
  }

  function sidebarRight() {
    const known = document.querySelector("[data-test-id='main-sidebar'],#side-menu,.main-sidebar");
    if (known) return Math.max(64, Math.round(known.getBoundingClientRect().right));
    const toggle = document.querySelector("#toggle-sidebar-button,[data-test-id='main-sidebar-toggle']");
    let current = toggle;
    while (current && current !== document.body) {
      const rect = current.getBoundingClientRect();
      if (rect.left <= 4 && rect.height > innerHeight * 0.7 && rect.width >= 55 && rect.width <= 280) return Math.round(rect.right);
      current = current.parentElement;
    }
    return 166;
  }

  function closeInlineModule() {
    document.getElementById("avila-inline-module")?.remove();
    document.documentElement.classList.remove("avila-module-open");
  }

  function openInlineModule(module) {
    const definition = modules[module];
    if (!definition) return;
    closeInlineModule();
    const host = document.createElement("section");
    host.id = "avila-inline-module";
    host.dataset.module = module;
    host.style.left = `${sidebarRight()}px`;
    host.setAttribute("aria-label", `${definition.title} - módulo Ávila`);
    const frame = document.createElement("iframe");
    frame.title = `${definition.title} - módulo Ávila`;
    const browserId = localStorage.getItem("n8n-browserId") || "";
    frame.src = `/avila/?embed=1&module=${encodeURIComponent(module)}${browserId ? `#browserId=${encodeURIComponent(browserId)}` : ""}`;
    host.appendChild(frame);
    document.body.appendChild(host);
    document.documentElement.classList.add("avila-module-open");
    setTimeout(() => {
      const settingsToggle = document.querySelector("#settings");
      if (!settingsToggle || !document.querySelector("[id^='reka-popover-content']")) return;
      suppressNativeClose = true;
      settingsToggle.click();
      suppressNativeClose = false;
    }, 0);
  }

  function isNativeNavigation(target) {
    const item = target.closest("a,button,[role='menuitem']");
    if (!item || item.dataset.avilaModule) return false;
    const rect = item.getBoundingClientRect();
    return rect.left < Math.max(280, sidebarRight() + 20);
  }

  let suppressNativeClose = false;
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const owned = target.closest("[data-avila-module]");
    if (owned) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      openInlineModule(owned.dataset.avilaModule);
      return;
    }
    if (!suppressNativeClose && document.getElementById("avila-inline-module") && isNativeNavigation(target)) closeInlineModule();
  }, true);

  window.addEventListener("resize", () => {
    const host = document.getElementById("avila-inline-module");
    if (host) host.style.left = `${sidebarRight()}px`;
  });

  const style = document.createElement("style");
  style.textContent = `
    [data-avila-owned='true'] { cursor:pointer !important; }
    .avila-owned-badge { margin-left:auto; padding:2px 6px; border-radius:999px; background:#3a2117; color:#ff8a4c; font:700 9px/1.4 Inter,system-ui,sans-serif; letter-spacing:.04em; text-transform:uppercase; }
    #avila-inline-module { position:fixed; inset:0 0 0 166px; z-index:80; background:#0d0d0f; overflow:hidden; border-left:1px solid #29292e; }
    #avila-inline-module iframe { display:block; width:100%; height:100%; border:0; background:#0d0d0f; }
  `;
  document.head.appendChild(style);

  let queued = false;
  const decorate = () => { queued = false; decorateNativeEntries(); insertProjectsEntry(); };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(decorate);
  };
  new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("popstate", () => { closeInlineModule(); schedule(); });
  decorate();
})();

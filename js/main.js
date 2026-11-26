function bindPlaybackControl(control, pauseLabel, playLabel, onChange) {
  if (!control) return;
  control.addEventListener("click", () => {
    const paused = control.toggleAttribute("data-paused");
    control.setAttribute("aria-label", paused ? playLabel : pauseLabel);
    onChange(paused);
  });
}

const siteHeader = document.querySelector(".site-header");
if (siteHeader) {
  const syncHeader = () => siteHeader.toggleAttribute("data-condensed", scrollY > 24);
  addEventListener("scroll", syncHeader, { passive: true });
  addEventListener("pageshow", syncHeader);
  syncHeader();
}

const navigation = document.getElementById("site-navigation");
const navigationToggle = navigation?.querySelector(".site-header__toggle");
const menuDemo = document.querySelector("[data-mobile-menu-demo]");

if ((navigationToggle || menuDemo) && "HTMLDialogElement" in window && "showModal" in HTMLDialogElement.prototype) {
  const desktopLayout = matchMedia("(min-width: 64rem)");
  const menu = document.createElement("dialog");
  menu.id = "mobile-menu";
  menu.className = "mobile-menu";
  menu.setAttribute("aria-label", "Menú de navegación");
  menu.innerHTML = `
    <div class="mobile-menu__layout">
      <div class="mobile-menu__top">
        <a class="mobile-menu__home" href="index.html">
          <img src="assets/icons/hamburguesa/volver.svg" width="6" height="10" alt="">Inicio
        </a>
        <button class="mobile-menu__close" type="button" aria-label="Cerrar menú" autofocus>
          <img src="assets/icons/hamburguesa/cerrar.svg" width="18" height="18" alt="">
        </button>
      </div>
      <nav class="mobile-menu__links" aria-label="Navegación móvil">
        <a href="menu-cafe.html">MENÚ</a>
        <a href="sucursales.html">SUCURSALES</a>
        <a href="nosotros.html">NOSOTROS</a>
      </nav>
      <ul class="mobile-menu__social" aria-label="Redes sociales" role="list">
        <li><span role="link" aria-disabled="true" aria-label="Instagram"><img src="assets/icons/hamburguesa/instagram.svg" width="24" height="24" alt=""></span></li>
        <li><span role="link" aria-disabled="true" aria-label="Facebook"><img src="assets/icons/hamburguesa/facebook.svg" width="26" height="26" alt=""></span></li>
        <li><span role="link" aria-disabled="true" aria-label="TikTok"><img src="assets/icons/hamburguesa/tiktok.svg" width="20" height="24" alt=""></span></li>
      </ul>
    </div>`;

  const closeControl = menu.querySelector(".mobile-menu__close");
  const current = navigation?.querySelector("[aria-current]");
  if (current) {
    const active = menu.querySelector(`a[href="${current.getAttribute("href")}"]`);
    active?.setAttribute("aria-current", active.pathname === location.pathname ||
      (active.pathname.endsWith("/index.html") && location.pathname.endsWith("/")) ? "page" : "true");
  }

  document.body.append(menu);
  let opener;
  let scrollPosition;
  let closeTimer;

  function closeMenu(restore = true) {
    if (!menu.open) return;
    clearTimeout(closeTimer);
    menu.close();
    menu.removeAttribute("data-closing");
    opener?.setAttribute("aria-expanded", "false");
    if (restore) {
      opener?.focus({ preventScroll: true });
      if (scrollPosition) scrollTo({ ...scrollPosition, behavior: "instant" });
    }
    scrollPosition = null;
    opener = null;
  }

  function requestClose() {
    if (menu.hasAttribute("data-closing")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      closeMenu();
      return;
    }
    menu.setAttribute("data-closing", "");
    closeTimer = setTimeout(closeMenu, 350);
  }

  function syncLayout() {
    if (!navigationToggle) return;
    const mobile = !desktopLayout.matches;
    const focused = document.activeElement;
    const wasOpen = menu.open && opener === navigationToggle;
    navigationToggle.hidden = !mobile;

    if (mobile && focused?.matches(".site-header__secondary")) {
      navigationToggle.focus({ preventScroll: true });
    } else if (!mobile && (wasOpen || focused === navigationToggle)) {
      closeMenu(false);
      navigation.querySelector(".site-header__secondary").focus({ preventScroll: true });
    }
  }

  for (const button of [navigationToggle, menuDemo].filter(Boolean)) {
    button.addEventListener("click", () => {
      if (menu.open) return;
      opener = button;
      scrollPosition = { top: scrollY, left: scrollX };
      menu.scrollTop = 0;
      menu.showModal();
      button.setAttribute("aria-expanded", "true");
    });
  }
  closeControl.addEventListener("click", requestClose);
  menu.addEventListener("cancel", event => {
    event.preventDefault();
    requestClose();
  });
  menu.addEventListener("animationend", event => {
    if (event.target === menu && event.animationName === "mobile-menu-exit") closeMenu();
  });
  menu.addEventListener("click", event => {
    if (event.target.closest("a[href]") && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      closeMenu(false);
    }
  });
  menu.addEventListener("keydown", event => {
    if (event.key !== "Tab") return;
    const controls = menu.querySelectorAll("a[href], button");
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  if (navigation && navigationToggle) navigation.dataset.menu = "ready";
  if (menuDemo) menuDemo.hidden = false;
  desktopLayout.addEventListener("change", syncLayout);
  addEventListener("pagehide", () => closeMenu(false));
  syncLayout();
}

(() => {
  const control = document.querySelector("[data-featured-control]");
  if (!control) return;

  const section = control.closest(".featured-product");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false;
  let paused = false;

  function syncMotion() {
    control.hidden = reducedMotion.matches;
    section.toggleAttribute("data-motion-playing", visible && !paused && !reducedMotion.matches && !document.hidden);
  }

  bindPlaybackControl(control, "Pausar animación del Refresher", "Reproducir animación del Refresher", isPaused => {
    paused = isPaused;
    syncMotion();
  });

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncMotion();
  });

  reducedMotion.addEventListener("change", syncMotion);
  document.addEventListener("visibilitychange", syncMotion);
  intersection.observe(section);
  syncMotion();
})();

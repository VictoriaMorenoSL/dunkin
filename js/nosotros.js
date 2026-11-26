const narrative = document.querySelector(".about-narrative");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const wideNarrative = matchMedia("(min-width: 64rem)");
let frame = 0;

function updateDonut() {
  frame = 0;
  const bounds = narrative.getBoundingClientRect();
  const travel = Math.max(1, bounds.height - innerHeight * .5);
  const progress = Math.min(1, Math.max(0, -bounds.top / travel));
  const distance = wideNarrative.matches ? 36 : 20;
  const sideways = wideNarrative.matches ? 19 + Math.sin(progress * Math.PI) * 76 : 0;
  narrative.style.setProperty("--donut-inline", `${sideways}px`);
  narrative.style.setProperty("--donut-offset", `${progress * distance}px`);
}

function queueDonut() {
  if (!frame) frame = requestAnimationFrame(updateDonut);
}

function syncMotion() {
  if (motion.matches) {
    removeEventListener("scroll", queueDonut);
    removeEventListener("resize", queueDonut);
    cancelAnimationFrame(frame);
    frame = 0;
    narrative.style.removeProperty("--donut-offset");
    narrative.style.removeProperty("--donut-inline");
    return;
  }

  addEventListener("scroll", queueDonut, { passive: true });
  addEventListener("resize", queueDonut);
  queueDonut();
}

function setupReveal(story) {
  if (motion.matches || !("IntersectionObserver" in window)) return;

  const targets = [...story.querySelectorAll("[data-about-reveal]")];
  const headerHeight = document.querySelector(".site-header").offsetHeight;
  const observer = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      target.classList.replace("about-reveal-pending", "about-reveal-entering");
    }
  }, { rootMargin: `-${headerHeight}px 0px 0px` });

  for (const target of targets) {
    // Los elementos de la primera vista también permanecen visibles al recargar o seguir un ancla.
    if (target.getBoundingClientRect().top < document.documentElement.clientHeight) continue;
    target.classList.add("about-reveal-pending");
    observer.observe(target);
  }

  story.addEventListener("animationend", event => {
    if (event.animationName === "about-reveal-in") {
      event.target.classList.remove("about-reveal-entering");
    }
  });

  motion.addEventListener("change", event => {
    if (!event.matches) return;
    observer.disconnect();
    for (const target of targets) {
      target.classList.remove("about-reveal-pending", "about-reveal-entering");
    }
  });
}

if (narrative) {
  motion.addEventListener("change", syncMotion);
  syncMotion();
  setupReveal(narrative.closest("main"));
}

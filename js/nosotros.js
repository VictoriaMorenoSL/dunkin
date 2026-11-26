const narrative = document.querySelector(".about-narrative");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const finale = narrative?.querySelector(".about-year--recent");
const introduction = narrative?.querySelector(".about-intro");
let frame = 0;
let introTimer = 0;
let introReady = false;

function clampProgress(value) {
  return Math.min(1, Math.max(0, value));
}

function updateNarrative() {
  frame = 0;
  const headerHeight = document.querySelector(".site-header").offsetHeight;
  const start = narrative.getBoundingClientRect().top;
  const end = finale.getBoundingClientRect();
  const traveled = Math.max(0, headerHeight - start);
  const travel = clampProgress(traveled / Math.max(1, finale.offsetTop));
  const settle = clampProgress((end.bottom - innerHeight * .8) / 220);
  const enteredStory = introduction.getBoundingClientRect().bottom < innerHeight * .7;

  narrative.toggleAttribute("data-donut-visible", introReady || enteredStory);
  narrative.style.setProperty("--about-donut-offset", `${18 * travel * settle}px`);
  narrative.style.setProperty("--about-donut-spin", `${120 * travel}deg`);
}

function queueNarrative() {
  if (!frame) frame = requestAnimationFrame(updateNarrative);
}

function syncMotion() {
  narrative.toggleAttribute("data-narrative-motion", !motion.matches);
  if (motion.matches) {
    removeEventListener("scroll", queueNarrative);
    removeEventListener("resize", queueNarrative);
    cancelAnimationFrame(frame);
    clearTimeout(introTimer);
    frame = 0;
    return;
  }
  if (!introReady) {
    introTimer = setTimeout(() => {
      introReady = true;
      queueNarrative();
    }, 2200);
  }
  addEventListener("scroll", queueNarrative, { passive: true });
  addEventListener("resize", queueNarrative);
  queueNarrative();
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

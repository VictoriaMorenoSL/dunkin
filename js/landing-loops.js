(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const toggle = document.querySelector("[data-loop-control]");
  let paused = false;
  let frame = 0;
  let previousTime = null;

  const loops = [...document.querySelectorAll("[data-loop]")].map(viewport => {
    const track = viewport.firstElementChild;
    return {
      viewport, track, sequence: track.firstElementChild,
      vertical: viewport.dataset.axis === "y",
      direction: Number(viewport.dataset.direction) || 1,
      offset: 0, period: 0, visible: false, ready: false, loading: false,
      pointer: null, focused: false, holdUntil: 0
    };
  });

  function paint(loop) {
    if (!loop.period) return;
    loop.offset = ((loop.offset % loop.period) + loop.period) % loop.period;
    const shift = -loop.offset;
    loop.track.style.transform = loop.vertical
      ? `translate3d(0, ${shift}px, 0)`
      : `translate3d(${shift}px, 0, 0)`;
  }

  function refresh(loop) {
    const { viewport, track, sequence, vertical } = loop;
    const bounds = sequence.getBoundingClientRect();
    const period = vertical ? bounds.height : bounds.width;
    if (!period || !viewport.clientWidth) return;
    if (reducedMotion.matches && viewport.closest(".brand-marquee")) return;

    if (!loop.period) {
      const start = new DOMMatrixReadOnly(getComputedStyle(track).transform);
      loop.offset = -(vertical ? start.m42 : start.m41);
    } else if (loop.period !== period) {
      loop.offset *= period / loop.period;
    }

    loop.period = period;
    loop.speed = Number(getComputedStyle(viewport).getPropertyValue("--loop-speed"));
    const visibleLength = vertical ? viewport.clientHeight : viewport.clientWidth;
    const copies = Math.ceil(visibleLength / period) + 1;
    while (track.children.length > copies + 1) track.lastElementChild.remove();
    while (track.children.length < copies + 1) {
      const copy = sequence.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      copy.inert = true;
      track.append(copy);
    }
    paint(loop);
    wake();
  }

  function isPlaying(loop) {
    return loop.ready && loop.visible && loop.period && !loop.pointer && !loop.focused;
  }

  function wake() {
    if (!frame && !paused && !reducedMotion.matches && !document.hidden && loops.some(isPlaying)) {
      frame = requestAnimationFrame(tick);
    }
  }

  function tick(time) {
    frame = 0;
    if (paused || reducedMotion.matches || document.hidden || !loops.some(isPlaying)) {
      previousTime = null;
      return;
    }
    const elapsed = previousTime === null ? 0 : Math.min(time - previousTime, 50) / 1000;
    previousTime = time;
    for (const loop of loops) {
      if (!isPlaying(loop) || time < loop.holdUntil) continue;
      loop.offset += elapsed * loop.speed * loop.direction;
      paint(loop);
    }
    wake();
  }

  function manual(loop, delta = 0) {
    loop.holdUntil = performance.now() + 1500;
    loop.offset += delta;
    paint(loop);
    wake();
  }

  const intersection = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const loop = loops.find(item => item.viewport === entry.target);
      loop.visible = entry.isIntersecting;
    }
    wake();
  });

  const imageLoading = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const loop = loops.find(item => item.viewport === entry.target);
      if (!entry.isIntersecting || loop.loading) continue;
      loop.loading = true;
      imageLoading.unobserve(entry.target);
      const images = [...loop.sequence.querySelectorAll("img")];
      // Load the selected sequence before playback reaches its cloned images.
      Promise.allSettled(images.map(img => {
        img.loading = "eager";
        return img.decode();
      })).then(() => {
        loop.ready = true;
        wake();
      });
    }
  }, { rootMargin: "220px 0px" });

  const resize = new ResizeObserver(entries => {
    const changed = new Set(entries.map(entry => entry.target));
    for (const loop of loops) {
      if (changed.has(loop.viewport) || changed.has(loop.sequence)) refresh(loop);
    }
  });

  for (const loop of loops) {
    const { viewport, sequence } = loop;
    resize.observe(viewport);
    resize.observe(sequence);
    intersection.observe(viewport);
    if (sequence.querySelector("img")) imageLoading.observe(viewport);
    else loop.ready = true;
    if (!viewport.hasAttribute("data-manual")) continue;

    function startDragging(event) {
      loop.pointer.dragging = true;
      viewport.setPointerCapture(event.pointerId);
      viewport.dataset.dragging = "";
    }

    viewport.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0 || loop.pointer) return;
      loop.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
      if (event.pointerType === "mouse") {
        event.preventDefault();
        startDragging(event);
      }
    });
    viewport.addEventListener("pointermove", event => {
      const pointer = loop.pointer;
      if (event.pointerId !== pointer?.id) return;
      const deltaX = pointer.x - event.clientX;
      if (!pointer.dragging) {
        const deltaY = Math.abs(pointer.y - event.clientY);
        if (Math.max(Math.abs(deltaX), deltaY) < 8) return;
        if (deltaY >= Math.abs(deltaX)) {
          loop.pointer = null;
          wake();
          return;
        }
        startDragging(event);
      }
      manual(loop, deltaX);
      pointer.x = event.clientX;
    });
    function release(event) {
      if (event.pointerId !== loop.pointer?.id) return;
      loop.pointer = null;
      delete viewport.dataset.dragging;
      manual(loop);
    }
    viewport.addEventListener("pointerup", release);
    viewport.addEventListener("pointercancel", release);
    viewport.addEventListener("lostpointercapture", release);
    viewport.addEventListener("wheel", event => {
      if (event.ctrlKey) return;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!horizontal && !event.shiftKey) return;
      const delta = horizontal ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      manual(loop, delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1));
    }, { passive: false });
    viewport.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      manual(loop, (event.key === "ArrowRight" ? 1 : -1) * viewport.clientWidth * 0.22);
    });
    viewport.addEventListener("focus", () => { loop.focused = true; });
    viewport.addEventListener("blur", () => { loop.focused = false; manual(loop); });
  }

  function syncMotion() {
    if (toggle) toggle.hidden = reducedMotion.matches;
    previousTime = null;
    wake();
  }

  bindPlaybackControl(toggle, "Pausar movimiento", "Reproducir movimiento", isPaused => {
    paused = isPaused;
    previousTime = null;
    wake();
  });
  reducedMotion.addEventListener("change", () => {
    for (const loop of loops) refresh(loop);
    syncMotion();
  });
  document.addEventListener("visibilitychange", syncMotion);
  syncMotion();
})();

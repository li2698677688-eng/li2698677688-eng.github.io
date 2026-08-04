export function createTopGalleryController({
  root,
  slides,
  intervalMs = 4800,
  reducedMotion = false,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
}) {
  let currentIndex = 0;
  let timer = null;
  let started = false;
  let paused = false;

  async function loadSlide(index) {
    const slide = slides[index];
    const image = slide?.querySelector("img");
    if (!image) return;

    if (!image.src && image.dataset.src) {
      image.src = image.dataset.src;
      delete image.dataset.src;
    }

    if (typeof image.decode === "function") {
      await image.decode().catch(() => {});
    }
  }

  async function showSlide(index) {
    const nextIndex = (index + slides.length) % slides.length;
    await loadSlide(nextIndex);

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === nextIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    currentIndex = nextIndex;
    root.dataset.activeSlide = String(nextIndex + 1);
    void loadSlide((nextIndex + 1) % slides.length);
  }

  function schedule() {
    if (!started || paused || reducedMotion || slides.length < 2 || timer !== null) return;
    timer = setTimer(async () => {
      timer = null;
      await showSlide(currentIndex + 1);
      schedule();
    }, intervalMs);
  }

  async function start() {
    if (started || slides.length === 0) return;
    started = true;
    root.dataset.activeSlide = "1";
    if (reducedMotion || slides.length < 2) return;
    schedule();
  }

  function preloadNext() {
    if (reducedMotion || slides.length < 2) return Promise.resolve();
    return loadSlide((currentIndex + 1) % slides.length);
  }

  function pause() {
    paused = true;
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function resume() {
    if (!started || !paused) return;
    paused = false;
    schedule();
  }

  return {
    start,
    preloadNext,
    pause,
    resume,
    getIndex: () => currentIndex,
  };
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-top-gallery]");
  const slides = root ? [...root.querySelectorAll("[data-top-gallery-slide]")] : [];

  if (root && slides.length > 0) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controller = createTopGalleryController({ root, slides, reducedMotion });
    void controller.start();

    const preloadNext = () => window.setTimeout(() => {
      void controller.preloadNext();
    }, 1200);
    if (document.readyState === "complete") preloadNext();
    else window.addEventListener("load", preloadNext, { once: true });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) controller.pause();
      else controller.resume();
    });
    window.addEventListener("pagehide", controller.pause);
    window.addEventListener("pageshow", controller.resume);
  }
}

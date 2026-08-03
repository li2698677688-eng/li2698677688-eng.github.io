const stage = document.querySelector("[data-hero-model-stage]");

if (stage) {
  let started = false;

  const load = () => {
    if (started) return;
    started = true;

    const importHeroModels = () => {
      import("/_astro/hero-models.js?v=1").catch(() => {
        stage.dataset.heroModelState = "failed";
      });
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(importHeroModels, { timeout: 1_500 });
    } else {
      window.setTimeout(importHeroModels, 160);
    }
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: "120px 0px" });
    observer.observe(stage);
  } else {
    load();
  }
}

const stage = document.querySelector("[data-spline-stage]");

if (stage) {
  const scenes = Array.from(stage.querySelectorAll("[data-spline-scene]"));
  const desktop = window.matchMedia("(min-width: 1101px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let observer;
  let idleHandle;
  let scheduledTimers = [];

  function unloadScenes() {
    scheduledTimers.forEach(window.clearTimeout);
    scheduledTimers = [];
    for (const scene of scenes) {
      scene.querySelector("iframe")?.remove();
      scene.classList.remove("is-live");
      scene.dataset.splineState = "idle";
    }
    stage.dataset.splineStageState = "idle";
  }

  function loadScene(scene) {
    if (!desktop.matches || reducedMotion.matches || scene.querySelector("iframe")) return;

    const iframe = document.createElement("iframe");
    iframe.loading = "lazy";
    iframe.title = scene.dataset.splineTitle ?? "Interactive 3D game console";
    iframe.tabIndex = -1;
    iframe.allow = "fullscreen";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    scene.dataset.splineState = "loading";
    iframe.addEventListener(
      "load",
      () => {
        const revealDelay = Number(scene.dataset.splineRevealDelay ?? 2500);
        scheduledTimers.push(
          window.setTimeout(() => {
            if (!scene.contains(iframe)) return;
            scene.dataset.splineState = "ready";
            scene.classList.add("is-live");
            if (scenes.every((item) => item.dataset.splineState === "ready")) {
              stage.dataset.splineStageState = "ready";
            }
          }, revealDelay),
        );
      },
      { once: true },
    );
    iframe.addEventListener(
      "error",
      () => {
        scene.dataset.splineState = "failed";
        scene.classList.remove("is-live");
        iframe.remove();
      },
      { once: true },
    );

    iframe.src = scene.dataset.splineSrc;
    scene.append(iframe);
  }

  function loadScenes() {
    if (!desktop.matches || reducedMotion.matches) return;
    stage.dataset.splineStageState = "loading";
    for (const scene of scenes) {
      const delay = Number(scene.dataset.splineDelay ?? 0);
      scheduledTimers.push(window.setTimeout(() => loadScene(scene), delay));
    }
  }

  function scheduleLoad() {
    if (stage.dataset.splineStageState !== "idle") return;
    stage.dataset.splineStageState = "scheduled";
    const start = () => {
      idleHandle = undefined;
      loadScenes();
    };

    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(start, { timeout: 2500 });
    } else {
      scheduledTimers.push(window.setTimeout(start, 700));
    }
  }

  function observeStage() {
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        scheduleLoad();
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(stage);
  }

  function handlePreferenceChange() {
    if (!desktop.matches || reducedMotion.matches) {
      if (idleHandle && "cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
      idleHandle = undefined;
      observer?.disconnect();
      unloadScenes();
      return;
    }
    observeStage();
  }

  desktop.addEventListener("change", handlePreferenceChange);
  reducedMotion.addEventListener("change", handlePreferenceChange);
  window.addEventListener("pagehide", unloadScenes, { once: true });
  handlePreferenceChange();
}

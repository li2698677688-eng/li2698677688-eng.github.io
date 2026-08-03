const stage = document.querySelector("[data-spline-stage]");
const hero = stage?.closest(".v3-hero");
const MAX_PARALLAX_DEGREES = 10;

if (stage && hero) {
  const scenes = Array.from(stage.querySelectorAll("[data-spline-scene]"));
  const desktop = window.matchMedia("(min-width: 1101px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const activeApplications = new Map();
  let observer;
  let idleHandle;
  let scheduledTimers = [];

  function resetParallax() {
    for (const scene of scenes) {
      activeApplications.get(scene)?.setCameraParallax(0, 0);
    }
  }

  function handlePointerMove(event) {
    if (event.pointerType !== "mouse" || !desktop.matches || reducedMotion.matches) return;

    const bounds = hero.getBoundingClientRect();
    const normalizedX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
    const normalizedY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));
    const pitchDegrees = normalizedY * MAX_PARALLAX_DEGREES;
    const yawDegrees = normalizedX * MAX_PARALLAX_DEGREES;

    for (const scene of scenes) {
      const application = activeApplications.get(scene);
      application?.setCameraParallax(yawDegrees, pitchDegrees);
    }
  }

  function unloadScenes() {
    scheduledTimers.forEach(window.clearTimeout);
    scheduledTimers = [];
    for (const scene of scenes) {
      const application = activeApplications.get(scene);
      application?.dispose();
      activeApplications.delete(scene);
      scene.querySelector("canvas")?.remove();
      scene.classList.remove("is-live");
      scene.dataset.splineState = "idle";
    }
    stage.dataset.splineStageState = "idle";
    resetParallax();
  }

  async function loadScene(scene) {
    if (!desktop.matches || reducedMotion.matches || scene.querySelector("canvas")) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    scene.dataset.splineState = "loading";
    scene.append(canvas);

    try {
      const sceneModule = await import(scene.dataset.splineSrc);
      const application = await sceneModule.mountSpline(canvas);
      if (!scene.contains(canvas) || !desktop.matches || reducedMotion.matches) {
        application.dispose();
        return;
      }
      activeApplications.set(scene, application);

      const revealDelay = Number(scene.dataset.splineRevealDelay ?? 2500);
      scheduledTimers.push(
        window.setTimeout(() => {
          if (!scene.contains(canvas)) return;
          scene.dataset.splineState = "ready";
          scene.classList.add("is-live");
          if (scenes.every((item) => item.dataset.splineState === "ready")) {
            stage.dataset.splineStageState = "ready";
          }
        }, revealDelay),
      );
    } catch (error) {
      console.error("Unable to load the hero Spline scene", error);
      scene.dataset.splineState = "failed";
      scene.classList.remove("is-live");
      canvas.remove();
    }
  }

  function loadScenes() {
    if (!desktop.matches || reducedMotion.matches) return;
    stage.dataset.splineStageState = "loading";
    for (const scene of scenes) {
      const delay = Number(scene.dataset.splineDelay ?? 0);
      scheduledTimers.push(window.setTimeout(() => void loadScene(scene), delay));
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
  hero.addEventListener("pointermove", handlePointerMove, { passive: true });
  hero.addEventListener("pointerleave", resetParallax);
  window.addEventListener("pagehide", unloadScenes, { once: true });
  handlePreferenceChange();
}

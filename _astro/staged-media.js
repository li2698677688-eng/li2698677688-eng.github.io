let manifestPromise;

function getManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch("/home-v2/media-manifest.json?v=5", { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error(`Media manifest failed: ${response.status}`);
        return response.json();
      });
    void manifestPromise.catch(() => {});
  }
  return manifestPromise;
}

const desktopQuery = matchMedia("(min-width: 900px)");
const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
const connection = navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection;
const constrainedNetwork = Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? ""));
let loadQueue = Promise.resolve();

const firstScroll = new Promise((resolve) => {
  if (window.scrollY > 0) {
    resolve();
    return;
  }
  const finish = () => {
    window.removeEventListener("scroll", finish);
    window.removeEventListener("wheel", finish);
    window.removeEventListener("touchmove", finish);
    resolve();
  };
  window.addEventListener("scroll", finish, { passive: true });
  window.addEventListener("wheel", finish, { passive: true });
  window.addEventListener("touchmove", finish, { passive: true });
});

function enqueue(task) {
  const run = loadQueue.then(task, task);
  loadQueue = run.catch(() => {});
  return run;
}

function loadVideo(video, source, preload = "auto") {
  if (!source) return Promise.reject(new Error("Missing video source"));
  if (video.dataset.source === source && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve(video);
  }
  return enqueue(() => new Promise((resolve, reject) => {
    let timeout;
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("error", fail);
    };
    const finish = () => {
      cleanup();
      resolve(video);
    };
    const fail = () => {
      cleanup();
      reject(new Error("Video failed to load"));
    };
    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Video load timed out"));
    }, 15000);
    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("error", fail, { once: true });
    video.preload = preload;
    video.src = source;
    video.dataset.source = source;
    video.load();
  }));
}

function loadSequenceVideo(video, source) {
  if (!source) return Promise.reject(new Error("Missing sequence video source"));
  if (video.dataset.source === source && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve(video);
  }

  return new Promise((resolve, reject) => {
    let timeout;
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", finish);
      video.removeEventListener("error", fail);
    };
    const finish = () => {
      cleanup();
      resolve(video);
    };
    const fail = () => {
      cleanup();
      reject(new Error("Sequence video failed to load"));
    };
    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Sequence video load timed out"));
    }, 15000);
    video.addEventListener("loadedmetadata", finish, { once: true });
    video.addEventListener("error", fail, { once: true });
    video.preload = "auto";
    video.src = source;
    video.dataset.source = source;
    video.load();
  });
}

function hidePicture(container) {
  container.querySelector(".staged-media-picture")?.classList.add("is-hidden");
}

function revealPoster(container) {
  const picture = container.querySelector(".staged-media-picture");
  const source = picture?.querySelector("source[data-srcset]");
  const image = picture?.querySelector("img[data-src]") ?? container.querySelector("img[data-src]");
  if (source && !source.srcset) source.srcset = source.dataset.srcset;
  if (image && !image.src) image.src = image.dataset.src;
}

async function initializeStudio(container) {
  if (container.dataset.initialized) return;
  container.dataset.initialized = "true";
  revealPoster(container);
  if (reducedMotionQuery.matches) return;
  if (constrainedNetwork) return;
  const manifest = await getManifest();
  const video = container.querySelector("[data-studio-video]");
  if (!video) return;
  try {
    await loadVideo(video, manifest.studio.video);
    const started = await video.play().then(() => true, () => false);
    if (!started) return;
    video.classList.add("is-playing");
    hidePicture(container);
    if (container.dataset.inView !== "true") video.pause();
  } catch {
    // The matching poster remains visible when video playback is unavailable.
  }
}

const studio = document.querySelector("[data-staged-studio]");
if (studio) {
  const preloadObserver = new IntersectionObserver((entries, observer) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    void firstScroll.then(() => {
      const bounds = studio.getBoundingClientRect();
      const margin = window.innerHeight * 0.25;
      const stillNear = bounds.bottom >= -margin && bounds.top <= window.innerHeight + margin;
      if (!stillNear) return;
      observer.disconnect();
      return initializeStudio(studio);
    }).catch(() => {});
  }, { rootMargin: "25% 0px" });
  preloadObserver.observe(studio);

  const playbackObserver = new IntersectionObserver((entries) => {
    const visible = entries.some((entry) => entry.isIntersecting);
    studio.dataset.inView = String(visible);
    const active = studio.querySelector("[data-studio-video].is-playing");
    if (!active) return;
    if (visible) void active.play().catch(() => {});
    else active.pause();
  }, { threshold: 0.1 });
  playbackObserver.observe(studio);
}

function createSequence(stage, frameCount) {
  if (!stage) return null;
  const video = stage.querySelector("[data-staged-sequence]");
  const poster = stage.querySelector("[data-how-sequence-fallback]");
  if (!video || !poster) return null;

  const step = stage.dataset.mediaId?.match(/^how-([1-4])$/)?.[1];
  if (!step) return null;

  poster.dataset.src = `/home-v2/staged/how-${step}-poster.jpg`;
  let ready = false;
  let desiredFrame = 0;
  let renderedFrame = -1;
  let playedOnMobile = false;
  let showingFallback = false;
  let preloadPromise;

  function videoTimeForFrame(index) {
    return Math.min(
      Math.max(0, video.duration - 0.001),
      (index + 0.5) / 8,
    );
  }

  function revealVideoFrame() {
    if (!ready || showingFallback || video.readyState < 2) return;
    const frameAtReveal = desiredFrame;
    const expectedTime = videoTimeForFrame(frameAtReveal);
    if (Math.abs(video.currentTime - expectedTime) > 1 / 120) {
      seekVideoFrame();
      return;
    }

    requestAnimationFrame(() => {
      if (
        showingFallback
        || desiredFrame !== frameAtReveal
        || Math.abs(video.currentTime - expectedTime) > 1 / 120
      ) {
        seekVideoFrame();
        return;
      }
      renderedFrame = frameAtReveal;
      stage.dataset.howSequenceFrameIndex = String(frameAtReveal);
      video.classList.add("is-ready");
      poster.classList.add("is-canvas-ready");
    });
  }

  function seekVideoFrame() {
    if (
      !ready
      || showingFallback
      || video.readyState < 1
      || !Number.isFinite(video.duration)
    ) return;

    const targetTime = videoTimeForFrame(desiredFrame);
    if (Math.abs(video.currentTime - targetTime) <= 1 / 1000 && video.readyState >= 2) {
      revealVideoFrame();
      return;
    }
    video.currentTime = targetTime;
  }

  video.addEventListener("seeked", revealVideoFrame);

  async function preload() {
    revealPoster(stage);
    if (reducedMotionQuery.matches || constrainedNetwork) return;
    if (preloadPromise) return preloadPromise;

    preloadPromise = (async () => {
      const manifest = await getManifest();
      const config = manifest.sequences.find((item) => item.id === stage.dataset.mediaId);
      if (!config) throw new Error(`Missing sequence ${stage.dataset.mediaId}`);

      await loadSequenceVideo(video, config.video);
      ready = true;
      seekVideoFrame();
    })();
    return preloadPromise;
  }

  function render(frame) {
    showingFallback = false;
    desiredFrame = Math.min(frameCount - 1, Math.max(0, Math.round(frame)));
    if (desiredFrame === renderedFrame) return;
    if (!ready) return;
    seekVideoFrame();
  }

  function showFallback() {
    showingFallback = true;
    desiredFrame = frameCount - 1;
    renderedFrame = frameCount - 1;
    stage.dataset.howSequenceFrameIndex = String(frameCount - 1);
    video.pause();
    video.classList.remove("is-ready");
    poster.classList.remove("is-canvas-ready");
  }

  async function playOnce() {
    if (playedOnMobile || desktopQuery.matches || reducedMotionQuery.matches || constrainedNetwork) return;
    playedOnMobile = true;
    try {
      await preload();
      if (!ready) return;
      showingFallback = false;
      video.currentTime = 0;
      video.loop = false;
      video.classList.add("is-ready");
      poster.classList.add("is-canvas-ready");
      await video.play();
    } catch {
      showFallback();
    }
  }

  const nearObserver = new IntersectionObserver((entries, observer) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    void preload().catch(() => showFallback());
  }, { rootMargin: "25% 0px" });
  nearObserver.observe(stage);

  const mobilePlaybackObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.intersectionRatio >= 0.25)) void playOnce();
  }, { threshold: [0.25] });
  mobilePlaybackObserver.observe(stage);

  return { frameCount, playOnce, poster, preload, render, showFallback, stage, video };
}

window.WanakaStagedMedia = { createSequence };

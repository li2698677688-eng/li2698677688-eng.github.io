let manifestPromise;

function getManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch("/home-v2/media-manifest.json", { credentials: "same-origin" })
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

function viewport() {
  return desktopQuery.matches ? "desktop" : "mobile";
}

function preferredFormat(video) {
  return video.canPlayType('video/webm; codecs="vp9"') ? "webm" : "mp4";
}

function formatOrder(video) {
  const preferred = preferredFormat(video);
  return preferred === "webm" ? ["webm", "mp4"] : ["mp4", "webm"];
}

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

async function loadRendition(video, rendition, preload = "auto") {
  let finalError;
  for (const format of formatOrder(video)) {
    try {
      return await loadVideo(video, rendition[format], preload);
    } catch (error) {
      finalError = error;
      video.removeAttribute("src");
      delete video.dataset.source;
      video.load();
    }
  }
  throw finalError ?? new Error("No supported video rendition");
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
  const manifest = await getManifest();
  const config = manifest.studio[viewport()];
  const preview = container.querySelector("[data-studio-preview]");
  const full = container.querySelector("[data-studio-full]");
  if (!preview || !full) return;
  await loadRendition(preview, config.preview);
  const previewStarted = await preview.play().then(() => true, () => false);
  if (!previewStarted) return;
  preview.classList.add("is-playing");
  hidePicture(container);

  if (constrainedNetwork) return;
  try {
    await loadRendition(full, config.full);
    full.currentTime = Math.min(preview.currentTime, Math.max(0, full.duration - 0.05));
    full.classList.add("is-playing");
    if (container.dataset.inView === "true") await full.play();
    else full.pause();
    window.setTimeout(() => {
      preview.pause();
      preview.classList.remove("is-playing");
    }, 220);
  } catch {
    // The short preview remains a complete visual fallback.
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
    const active = studio.querySelector("[data-studio-full].is-playing, [data-studio-preview].is-playing");
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
  let ready = false;
  let desiredFrame = 0;
  let renderFrame = 0;
  let playedOnMobile = false;

  async function preload() {
    revealPoster(stage);
    if (reducedMotionQuery.matches || constrainedNetwork) return;
    const manifest = await getManifest();
    const config = manifest.sequences.find((item) => item.id === stage.dataset.mediaId);
    if (!config) throw new Error(`Missing sequence ${stage.dataset.mediaId}`);
    await loadRendition(video, config[viewport()]);
    ready = true;
  }

  function commitFrame() {
    renderFrame = 0;
    if (!ready || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const progress = Math.min(1, Math.max(0, desiredFrame / Math.max(frameCount - 1, 1)));
    video.currentTime = progress * Math.max(0, video.duration - 0.01);
    video.classList.add("is-ready");
    poster.classList.add("is-canvas-ready");
  }

  function render(frame) {
    desiredFrame = frame;
    if (!ready) return;
    if (!renderFrame) renderFrame = requestAnimationFrame(commitFrame);
  }

  function showFallback() {
    video.pause();
    video.classList.remove("is-ready");
    poster.classList.remove("is-canvas-ready");
  }

  async function playOnce() {
    if (playedOnMobile || desktopQuery.matches || reducedMotionQuery.matches || constrainedNetwork) return;
    playedOnMobile = true;
    try {
      await preload();
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
    void preload().then(commitFrame).catch(() => {});
  }, { rootMargin: "25% 0px" });
  nearObserver.observe(stage);

  const mobilePlaybackObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.intersectionRatio >= 0.25)) void playOnce();
  }, { threshold: [0.25] });
  mobilePlaybackObserver.observe(stage);

  return { frameCount, playOnce, poster, preload, render, showFallback, stage, video };
}

window.WanakaStagedMedia = { createSequence };

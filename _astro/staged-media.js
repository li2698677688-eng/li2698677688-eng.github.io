let manifestPromise;

function getManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch("/home-v2/media-manifest.json?v=7", { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error(`Media manifest failed: ${response.status}`);
        return response.json();
      });
    void manifestPromise.catch(() => {});
  }
  return manifestPromise;
}

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

function loadVideo(video, source) {
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
    video.preload = "auto";
    video.src = source;
    video.dataset.source = source;
    video.load();
  }));
}

function revealPoster(container) {
  const picture = container.querySelector(".staged-media-picture");
  const image = picture?.querySelector("img[data-src]") ?? container.querySelector("img[data-src]");
  if (image && !image.src) image.src = image.dataset.src;
}

async function initializeStudio(container) {
  if (container.dataset.initialized) return;
  container.dataset.initialized = "true";
  revealPoster(container);
  if (reducedMotionQuery.matches || constrainedNetwork) return;
  const manifest = await getManifest();
  const video = container.querySelector("[data-studio-video]");
  if (!video) return;
  try {
    await loadVideo(video, manifest.studio.video);
    const started = await video.play().then(() => true, () => false);
    if (!started) return;
    video.classList.add("is-playing");
    container.querySelector(".staged-media-picture")?.classList.add("is-hidden");
    if (container.dataset.inView !== "true") video.pause();
  } catch {
    // Keep the sharp poster visible when video playback is unavailable.
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

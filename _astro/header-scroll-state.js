const header = document.querySelector(".v3-site-header");

if (header) {
  let previousState;

  function updateHeader() {
    const isScrolled = window.scrollY > 0;
    if (isScrolled === previousState) return;
    previousState = isScrolled;
    header.classList.toggle("is-scrolled", isScrolled);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

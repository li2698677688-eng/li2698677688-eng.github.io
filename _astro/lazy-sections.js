function importWhenNear(selector, modulePath) {
  const section = document.querySelector(selector);
  if (!section) return;

  if (!("IntersectionObserver" in window)) {
    void import(modulePath).catch(() => {});
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    void import(modulePath).catch(() => {});
  }, { rootMargin: "50% 0px" });
  observer.observe(section);
}

importWhenNear("#faq", "./Faq.astro_astro_type_script_index_0_lang.7dHmyes1.js");

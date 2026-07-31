const TITLES = [
  "Build a playable 3D game with AI.",
  "Turn one sentence into a playable world.",
  "Create, direct, and share your own game.",
];

const form = document.querySelector(".v3-prompt");
const textarea = document.querySelector("#v3-home-prompt");
const fileInput = form?.querySelector(".v3-prompt__file-input");
const addButton = form?.querySelector(".v3-prompt__add");
const counter = form?.querySelector("[data-prompt-count]");
const typed = document.querySelector("[data-testid='hero-title-visible']");
const measure = document.querySelector("[data-testid='hero-title-measure']");
const objectUrls = new Set();
let composing = false;

function updateCount() {
  if (counter && textarea) counter.textContent = `${textarea.value.length}/280 characters`;
}

function addAttachments(files) {
  if (!form || !fileInput) return;
  const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
  if (!images.length) return;

  let list = form.querySelector(".v3-prompt__attachments");
  if (!list) {
    list = document.createElement("div");
    list.className = "v3-prompt__attachments";
    list.setAttribute("aria-label", "Reference images");
    form.insertBefore(list, textarea);
  }

  for (const file of images) {
    const url = URL.createObjectURL(file);
    objectUrls.add(url);
    const item = document.createElement("div");
    item.className = "v3-prompt__attachment";
    const preview = document.createElement("img");
    preview.src = url;
    preview.alt = file.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove reference image ${file.name}`);
    remove.innerHTML = '<img src="/home-v2/prompt-attachment-remove.svg" alt="" aria-hidden="true">';
    remove.addEventListener("click", () => {
      URL.revokeObjectURL(url);
      objectUrls.delete(url);
      item.remove();
      if (!list.children.length) {
        list.remove();
        form.classList.remove("has-attachments");
      }
    });
    item.append(preview, remove);
    list.append(item);
  }
  form.classList.add("has-attachments");
  fileInput.value = "";
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function animateTitle() {
  if (!typed || !measure || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let index = 0;
  while (document.documentElement.contains(typed)) {
    await wait(2400);
    const current = TITLES[index];
    for (let length = current.length - 1; length >= 0; length -= 1) {
      typed.firstChild.textContent = current.slice(0, length);
      await wait(20);
    }
    index = (index + 1) % TITLES.length;
    const next = TITLES[index];
    measure.firstChild.textContent = next;
    await wait(180);
    for (let length = 1; length <= next.length; length += 1) {
      typed.firstChild.textContent = next.slice(0, length);
      await wait(24);
    }
  }
}

addButton?.addEventListener("click", () => fileInput?.click());
fileInput?.addEventListener("change", (event) => addAttachments(event.currentTarget.files));
textarea?.addEventListener("input", updateCount);
textarea?.addEventListener("compositionstart", () => { composing = true; });
textarea?.addEventListener("compositionend", () => { composing = false; });
textarea?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !composing) {
    event.preventDefault();
    textarea.form?.requestSubmit();
  }
});
document.querySelectorAll("[data-prompt-suggestion]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!textarea) return;
    textarea.value = button.dataset.promptSuggestion ?? "";
    updateCount();
    textarea.focus();
  });
});
window.addEventListener("pagehide", () => {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
}, { once: true });

const startTitleAnimation = () => { void animateTitle(); };
if ("requestIdleCallback" in window) requestIdleCallback(startTitleAnimation, { timeout: 3000 });
else window.setTimeout(startTitleAnimation, 1000);

/** Center an utterance in the viewport (under the pinned timeline) and flash it. */
export function scrollToUtterance(utteranceId: number | string) {
  const el = document.getElementById(`u-${utteranceId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("u-flash");
  // restart the animation if the same utterance is clicked twice
  void el.offsetWidth;
  el.classList.add("u-flash");
  window.setTimeout(() => el.classList.remove("u-flash"), 1800);
}

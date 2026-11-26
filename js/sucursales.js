for (const card of document.querySelectorAll(".store-card[aria-pressed][data-store-id]")) {
  card.addEventListener("click", () => {
    card.setAttribute("aria-pressed", String(card.getAttribute("aria-pressed") !== "true"));
  });
}

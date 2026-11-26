for (const form of document.querySelectorAll("[data-catalog-search]")) {
  const input = form.elements.producto;
  const products = document.getElementById(form.dataset.catalogSearch);
  const container = products.parentElement;
  const empty = container.querySelector("[data-search-empty]");
  const status = container.querySelector("[data-search-status]");
  const cards = [...products.children].map((card) => ({
    card,
    name: normalizeCatalogText((card.querySelector(".product-card__name") ?? card).innerText)
  }));
  let lastQuery = "";

  function showResults() {
    const query = normalizeCatalogText(input.value);
    let count = 0;

    for (const { card, name } of cards) {
      card.hidden = !name.includes(query);
      if (!card.hidden) count++;
    }

    for (const control of form.querySelectorAll("[data-search-clear]")) {
      control.hidden = !input.value;
    }
    empty.hidden = count > 0;
    products.hidden = count === 0;

    if (lastQuery !== query) {
      const countMessage = count === 1 ? "1 producto encontrado" : `${count} productos encontrados`;
      status.textContent = query ? `${countMessage} para «${input.value.trim()}».` : `${countMessage}.`;
      lastQuery = query;
    }
  }

  function clearSearch() {
    input.value = "";
    input.focus();
    showResults();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    showResults();
  });
  input.addEventListener("input", showResults);
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !input.value) return;
    event.preventDefault();
    clearSearch();
  });
  form.querySelector("[data-search-clear]").addEventListener("click", clearSearch);
  empty.querySelector("[data-search-clear]").addEventListener("click", clearSearch);
  window.addEventListener("pageshow", showResults);
  showResults();
}

for (const group of document.querySelectorAll("[data-catalog-city]")) {
  if (group.dataset.catalogCity !== "demo") bindCityPreference(group);
}

for (const rail of document.querySelectorAll("[data-category-rail]")) {
  function placeCategories() {
    if (!rail.clientWidth) return;
    rail.scrollLeft = Number(rail.dataset.categoryRail);
    observer.disconnect();
  }

  const observer = new ResizeObserver(placeCategories);
  observer.observe(rail);
  rail.addEventListener("keydown", (event) => {
    if (event.target !== rail || event.altKey || event.ctrlKey || event.metaKey) return;
    const positions = {
      Home: 0,
      End: rail.scrollWidth,
      ArrowLeft: rail.scrollLeft - rail.clientWidth / 2,
      ArrowRight: rail.scrollLeft + rail.clientWidth / 2
    };
    if (!Object.hasOwn(positions, event.key)) return;
    event.preventDefault();
    rail.scrollLeft = positions[event.key];
  });
}

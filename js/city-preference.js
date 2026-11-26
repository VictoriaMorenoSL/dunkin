const catalogCityKey = "dunkin.catalog-city";

function normalizeCatalogText(value) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-MX").trim().replace(/\s+/g, " ");
}

function bindCityPreference(group, onChange = () => {}) {
  const radios = Array.from(group.querySelectorAll('input[type="radio"]'));

  function sync() {
    try {
      const saved = localStorage.getItem(catalogCityKey);
      (radios.find(radio => radio.value === saved) ?? radios[0]).checked = true;
    } catch {
      // La selección sigue disponible durante la visita.
    }
    onChange(radios.find(radio => radio.checked).value);
  }

  group.addEventListener("change", event => {
    if (!radios.includes(event.target)) return;
    try {
      localStorage.setItem(catalogCityKey, event.target.value);
    } catch {
      // El navegador puede bloquear el almacenamiento.
    }
    onChange(event.target.value);
  });
  window.addEventListener("storage", event => {
    if (event.key === catalogCityKey || event.key === null) sync();
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) sync();
  });
  sync();
}

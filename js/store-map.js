const results = document.querySelector("[data-store-results]");
const resultsSection = results.closest("section");
const desktopResults = matchMedia("(min-width: 64rem)");
const list = results.querySelector("[data-store-list]");
const directoryMessage = results.querySelector("[data-store-message]");
const canvas = document.querySelector("[data-store-map]");
const mapNotice = document.querySelector("[data-map-notice]");
const preferredMotion = matchMedia("(prefers-reduced-motion: reduce)");
const pageScrollPriority = matchMedia("(pointer: coarse), (width < 48rem)");
const markers = new Map();
let selectedId = null;
let offerFallbackDirections = false;
let map;
let directory = [];
let visibleStores = [];
let city = "cdmx";
const cityControl = document.querySelector("[data-store-city]");
const search = document.querySelector("[data-store-search]");
const nearby = document.querySelector("[data-store-nearby]");
const nearbyMessage = document.querySelector("[data-nearby-message]");
const countMessage = document.querySelector("[data-store-count]");

function makeCard(store) {
  const entry = document.createElement("li");
  entry.className = "store-locator__entry";

  const card = document.createElement("button");
  card.className = "store-card";
  card.type = "button";
  card.dataset.storeId = store.id;
  card.setAttribute("aria-pressed", "false");

  const title = document.createElement("span");
  title.id = store.id + "-title";
  title.className = "store-card__title";
  title.textContent = store.nombre;
  card.setAttribute("aria-labelledby", title.id);

  const address = document.createElement("span");
  address.id = store.id + "-address";
  address.className = "store-card__address";
  address.textContent = store.direccion;
  const hours = document.createElement("span");
  hours.id = store.id + "-hours";
  hours.className = "store-card__hours";
  const clock = document.createElement("span");
  clock.className = "store-card__clock";
  clock.setAttribute("aria-hidden", "true");
  hours.append(clock, store.horarioPublicado);
  card.setAttribute("aria-describedby", address.id + " " + hours.id);
  card.append(title, address, hours);
  card.addEventListener("click", () => selectStore(store, "card"));

  entry.append(card);
  return entry;
}

function directionsLink(store) {
  const link = document.createElement("a");
  link.className = "store-directions";
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", store.latitud + "," + store.longitud);
  link.href = url.href;
  link.textContent = "Cómo llegar";
  link.setAttribute("aria-label", "Cómo llegar a " + store.nombre);
  return link;
}

function syncFallbackDirections() {
  const previous = list.querySelector(".store-directions--fallback");
  const store = offerFallbackDirections && visibleStores.find(item => item.id === selectedId);
  const card = store && list.querySelector(`[data-store-id="${store.id}"]`);
  if (previous && previous.previousElementSibling === card) return;
  previous?.remove();
  if (!card) return;
  const link = directionsLink(store);
  link.classList.add("store-directions--fallback");
  card.after(link);
}

function makeStorePopup(store) {
  const content = document.createElement("div");
  content.className = "store-map__popup";
  const title = document.createElement("strong");
  title.textContent = store.nombre;
  const address = document.createElement("p");
  address.textContent = store.direccion;
  content.append(title, address, directionsLink(store));
  return content;
}

function updateListScrolling() {
  const hasMore = desktopResults.matches && results.scrollHeight > results.clientHeight && list.childElementCount > 0;
  if (hasMore) results.tabIndex = 0;
  else results.removeAttribute("tabindex");
}

function revealCard(card) {
  const item = card.parentElement;
  const behavior = preferredMotion.matches ? "instant" : "smooth";
  if (!desktopResults.matches) {
    item.scrollIntoView({ block: "nearest", behavior });
    return;
  }
  const entry = item.getBoundingClientRect();
  const viewport = results.getBoundingClientRect();
  const offset = entry.top < viewport.top ? entry.top - viewport.top
    : Math.max(0, entry.bottom - viewport.bottom);
  if (offset) results.scrollBy({ top: offset, behavior });
}

function selectStore(store, origin) {
  const previous = selectedId;
  selectedId = store.id;
  for (const id of new Set([previous, selectedId])) {
    if (!id) continue;
    const pressed = id === selectedId;
    list.querySelector(`[data-store-id="${id}"]`).setAttribute("aria-pressed", String(pressed));
    const marker = markers.get(id);
    marker?.getElement().setAttribute("aria-pressed", String(pressed));
    marker?.setZIndexOffset(pressed ? 1000 : 0);
  }
  syncFallbackDirections();
  if (origin === "card") {
    if (previous !== selectedId) map?.closePopup();
    if (offerFallbackDirections) revealCard(list.querySelector(`[data-store-id="${store.id}"]`));
    map?.panTo([store.latitud, store.longitud], { animate: !preferredMotion.matches });
  } else {
    revealCard(list.querySelector(`[data-store-id="${store.id}"]`));
  }
}

function addMarker(store) {
  const graphic = document.createElement("span");
  graphic.className = "store-marker__face";
  graphic.setAttribute("aria-hidden", "true");
  const pin = document.createElement("span");
  pin.className = "button__location-icon";
  graphic.append(pin);
  const icon = L.divIcon({ className: "store-marker", html: graphic, iconSize: [44, 44] });
  const marker = L.marker([store.latitud, store.longitud], {
    icon, title: store.nombre, autoPanOnFocus: false,
    zIndexOffset: store.id === selectedId ? 1000 : 0
  }).addTo(map);
  const element = marker.getElement();
  element.setAttribute("aria-label", "Mostrar " + store.nombre);
  element.setAttribute("aria-pressed", String(store.id === selectedId));
  element.dataset.storeId = store.id;
  marker.bindPopup(() => makeStorePopup(store), { maxWidth: 248 });
  marker.on("click", () => selectStore(store, "marker"));
  element.addEventListener("keydown", (event) => {
    if (event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    selectStore(store, "marker");
    marker.openPopup();
  });
  markers.set(store.id, marker);
}

function showMapNotice(text, directionsUnavailableOnMap = false) {
  mapNotice.textContent = text;
  mapNotice.hidden = !text;
  offerFallbackDirections = directionsUnavailableOnMap;
  syncFallbackDirections();
}

function createBaseLayer(maxZoom) {
  const pending = new WeakMap();
  let failed = false;
  let loaded = false;
  let blocked = false;

  const CheckedTiles = L.TileLayer.extend({
    createTile(coords, done) {
      const tile = document.createElement("img");
      tile.alt = "";
      tile.setAttribute("role", "presentation");

      const request = new AbortController();
      pending.set(tile, request);
      loadTile(this.getTileUrl(coords), tile, request, done);
      return tile;
    }
  });

  async function loadTile(url, tile, request, done) {
    let imageUrl;
    try {
      const response = await fetch(url, {
        signal: request.signal,
        credentials: "omit",
        referrerPolicy: "strict-origin-when-cross-origin"
      });
      if (!response.ok) {
        const error = new Error("El proveedor rechazó la tesela.");
        error.status = response.status;
        throw error;
      }
      imageUrl = URL.createObjectURL(await response.blob());
      if (request.signal.aborted) return;
      tile.src = imageUrl;
      await tile.decode();
      if (!request.signal.aborted) done(null, tile);
    } catch (error) {
      if (!request.signal.aborted) done(error, tile);
    } finally {
      pending.delete(tile);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    }
  }

  const tiles = new CheckedTiles(canvas.dataset.tileUrl, { maxZoom, updateWhenIdle: true });
  tiles.on("tileabort tileunload", ({ tile }) => pending.get(tile)?.abort());
  tiles.on("loading", () => {
    failed = false;
    loaded = false;
  });
  tiles.on("tileload", () => { loaded = true; });
  tiles.on("tileerror", ({ error }) => {
    failed = true;
    if ([401, 403, 429].includes(error.status)) {
      if (blocked) return;
      blocked = true;
      showMapNotice("El proveedor cartográfico no está disponible. Selecciona una sucursal para consultar indicaciones.", true);
      // Deja que Leaflet termine de registrar el error antes de retirar la capa.
      queueMicrotask(() => tiles.remove());
    } else if (mapNotice.hidden) {
      showMapNotice("El mapa no se pudo cargar por completo. La lista y las indicaciones siguen disponibles.");
    }
  });
  tiles.on("load", () => {
    if (blocked) return;
    if (!failed) showMapNotice("");
    else if (!loaded) showMapNotice("El mapa no pudo cargar. Selecciona una sucursal para consultar indicaciones.", true);
    else showMapNotice("El mapa no se pudo cargar por completo. La lista y las indicaciones siguen disponibles.");
  });
  return tiles;
}

function initializeMap(stores) {
  const maxZoom = Number(canvas.dataset.tileMaxZoom);
  map = L.map(canvas, {
    zoomControl: false, scrollWheelZoom: false, touchZoom: false,
    doubleClickZoom: false, tapHold: false, trackResize: false, maxZoom
  });
  const setDragging = () => pageScrollPriority.matches ? map.dragging.disable() : map.dragging.enable();
  setDragging();
  pageScrollPriority.addEventListener("change", setDragging);
  map.once("unload", () => pageScrollPriority.removeEventListener("change", setDragging));
  L.control.zoom({ position: "bottomright", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(map);

  map.attributionControl.addAttribution(document.getElementById("store-map-credit").innerHTML.trim());
  const tiles = createBaseLayer(maxZoom);
  const selected = stores.find(store => store.id === selectedId);
  fitStores(selected ? [selected] : stores.length ? stores : directory.filter(store => store.zona === city));
  tiles.addTo(map);
  for (const store of stores) addMarker(store);

  const mapResize = new ResizeObserver(() => {
    if (canvas.clientWidth && canvas.clientHeight) {
      map.invalidateSize({ pan: true, animate: false, debounceMoveend: true });
    }
  });
  mapResize.observe(canvas);
  map.once("unload", () => mapResize.disconnect());
}

function fitStores(stores) {
  if (stores.length === 1) {
    map.setView([stores[0].latitud, stores[0].longitud], 15, { animate: false });
  } else if (stores.length) {
    map.fitBounds(stores.map(store => [store.latitud, store.longitud]), {
      padding: [26, 26], maxZoom: 15, animate: false
    });
  }
}

function filterStores() {
  const words = normalizeCatalogText(search.elements.consulta.value).split(" ").filter(Boolean);
  visibleStores = directory.filter(store => {
    if (store.zona !== city) return false;
    const searchable = normalizeCatalogText([store.nombre, store.direccion, store.ciudad, store.zona].join(" "));
    return words.every(word => searchable.includes(word));
  });
  const label = city === "cdmx" ? "CDMX y zona metropolitana" : "Monterrey y zona metropolitana";
  resultsSection.setAttribute("aria-label", "Sucursales de " + label);
  nearbyMessage.hidden = true;
  selectedId = null;
  results.scrollTop = 0;
  list.replaceChildren(...visibleStores.map(makeCard));
  directoryMessage.hidden = visibleStores.length > 0;
  directoryMessage.textContent = "No encontramos sucursales. Prueba otro nombre, dirección o zona.";
  countMessage.textContent = visibleStores.length === 1 ? "1 sucursal encontrada."
    : `${visibleStores.length} sucursales encontradas.`;
  if (map) {
    for (const marker of markers.values()) marker.remove();
    markers.clear();
    for (const store of visibleStores) addMarker(store);
    fitStores(visibleStores);
  }
  updateListScrolling();
}

function showNearbyMessage(text) {
  nearbyMessage.textContent = text;
  nearbyMessage.hidden = false;
  nearbyMessage.scrollIntoView({ block: "nearest", behavior: preferredMotion.matches ? "instant" : "smooth" });
}

function distanceFrom(latitude, longitude, store) {
  const toRadians = Math.PI / 180;
  const dLat = (store.latitud - latitude) * toRadians;
  const dLon = (store.longitud - longitude) * toRadians;
  return Math.sin(dLat / 2) ** 2 + Math.cos(latitude * toRadians)
    * Math.cos(store.latitud * toRadians) * Math.sin(dLon / 2) ** 2;
}

nearby.addEventListener("click", () => {
  if (!navigator.geolocation || !window.isSecureContext) {
    showNearbyMessage("La ubicación no está disponible. Puedes elegir una ciudad o usar la búsqueda.");
    return;
  }
  if (!visibleStores.length) {
    showNearbyMessage("Cambia la búsqueda para consultar las sucursales cercanas.");
    return;
  }
  nearby.disabled = true;
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    nearby.disabled = false;
    if (!visibleStores.length) {
      showNearbyMessage("Cambia la búsqueda para consultar las sucursales cercanas.");
      return;
    }
    const closest = visibleStores.reduce((best, store) =>
      distanceFrom(coords.latitude, coords.longitude, store) < distanceFrom(coords.latitude, coords.longitude, best)
        ? store : best
    );
    selectStore(closest, "card");
    countMessage.textContent = "La sucursal más cercana entre los resultados es " + closest.nombre + ".";
    revealCard(list.querySelector(`[data-store-id="${closest.id}"]`));
  }, () => {
    nearby.disabled = false;
    showNearbyMessage("No pudimos obtener tu ubicación. Puedes elegir una ciudad o usar la búsqueda.");
  }, { timeout: 8000, maximumAge: 0 });
});

function readDirectory(stores) {
  if (!Array.isArray(stores) || !stores.length) throw new Error("Directorio sin sucursales");
  return stores;
}

async function loadDirectory() {
  if (location.protocol !== "file:") {
    try {
      const response = await fetch("data/sucursales.json?v=toreo", { signal: AbortSignal.timeout(3500) });
      if (!response.ok) throw new Error("Directorio no disponible");
      return readDirectory((await response.json()).sucursales);
    } catch {
      // El respaldo conserva la búsqueda y las indicaciones si falla la petición.
    }
  }
  return readDirectory(JSON.parse(document.getElementById("store-directory-fallback").textContent));
}

function startMap() {
  const script = document.createElement("script");
  script.src = "vendor/leaflet/leaflet.js";
  const unavailable = () => {
    showMapNotice("El mapa no está disponible. Selecciona una sucursal para consultar indicaciones.", true);
  };
  script.addEventListener("error", unavailable, { once: true });
  script.addEventListener("load", () => {
    try {
      initializeMap(visibleStores);
    } catch {
      const failedMap = map;
      map = undefined;
      markers.clear();
      failedMap?.remove();
      unavailable();
    }
  }, { once: true });
  document.head.append(script);
}

async function startLocator() {
  try {
    directory = await loadDirectory();
  } catch {
    const official = document.createElement("a");
    official.href = "https://www.dunkin.mx/nearby_stores.aspx";
    official.textContent = "Consultar el directorio oficial";
    directoryMessage.replaceChildren("No pudimos cargar la lista. ", official);
    showMapNotice("El mapa no está disponible.");
    return;
  }

  bindCityPreference(cityControl, value => {
    city = value;
    filterStores();
  });
  search.addEventListener("submit", event => {
    event.preventDefault();
    filterStores();
  });
  search.elements.consulta.addEventListener("input", filterStores);
  const listResize = new ResizeObserver(updateListScrolling);
  listResize.observe(resultsSection);
  listResize.observe(list);
  desktopResults.addEventListener("change", updateListScrolling);

  startMap();
}

startLocator();

const API_BASE = "http://localhost:8000";
const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

const statusText = document.getElementById("status-text");
const countText = document.getElementById("count-text");
const resultsList = document.getElementById("results-list");
const form = document.getElementById("search-form");

const map = new maplibregl.Map({
  container: "map",
  style: MAP_STYLE,
  center: [-43.2094, -22.911],
  zoom: 11,
});

map.addControl(new maplibregl.NavigationControl(), "top-right");
const hoverPopup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false,
});

const sourceId = "nearby-entities";
const nearbyLayerId = "nearby-circles";
const baseLayerId = "base-entity";
const allSourceId = "all-entities";
const allLayerId = "all-entities-layer";
const circleSourceId = "range-circle";
const circleFillLayerId = "range-circle-fill";
const circleLineLayerId = "range-circle-line";
const interactiveLayers = new Set();
let userMarker = null;

function setStatus(message) {
  statusText.textContent = message;
}

function setCount(count) {
  countText.textContent = `${count} encontrados`;
}

function clearResults() {
  resultsList.innerHTML = "";
}

function renderResults(features) {
  clearResults();
  const nearby = features.filter((feature) => !feature.properties?.is_base);
  if (!nearby.length) {
    const item = document.createElement("li");
    item.textContent = "Nenhuma entidade encontrada.";
    resultsList.appendChild(item);
    return;
  }
  nearby.forEach((feature) => {
    const item = document.createElement("li");
    const { name, lat, lon } = feature.properties || {};
    item.textContent = `${name || "Sem nome"} • ${lat?.toFixed(5)}, ${lon?.toFixed(5)}`;
    resultsList.appendChild(item);
  });
}

function computeBounds(features) {
  const bounds = new maplibregl.LngLatBounds();
  let hasPoint = false;
  features.forEach((feature) => {
    if (!feature.geometry || feature.geometry.type !== "Point") {
      return;
    }
    const [lng, lat] = feature.geometry.coordinates;
    if (typeof lng !== "number" || typeof lat !== "number") {
      return;
    }
    bounds.extend([lng, lat]);
    hasPoint = true;
  });
  return hasPoint ? bounds : null;
}

function createCircleFeature(center, radiusMeters, steps = 64) {
  const earthRadius = 6371000;
  const [lngDeg, latDeg] = center;
  const lat = (latDeg * Math.PI) / 180;
  const lng = (lngDeg * Math.PI) / 180;
  const angularDistance = radiusMeters / earthRadius;
  const coordinates = [];

  for (let i = 0; i <= steps; i += 1) {
    const bearing = (2 * Math.PI * i) / steps;
    const sinLat = Math.sin(lat);
    const cosLat = Math.cos(lat);
    const sinAd = Math.sin(angularDistance);
    const cosAd = Math.cos(angularDistance);

    const lat2 = Math.asin(sinLat * cosAd + cosLat * sinAd * Math.cos(bearing));
    const lng2 =
      lng +
      Math.atan2(
        Math.sin(bearing) * sinAd * cosLat,
        cosAd - sinLat * Math.sin(lat2)
      );

    coordinates.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
    properties: {},
  };
}

function updateMap(data, rangeMeters) {
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data,
    });
    map.addLayer({
      id: nearbyLayerId,
      type: "circle",
      source: sourceId,
      filter: ["!=", ["get", "is_base"], true],
      paint: {
        "circle-radius": 7,
        "circle-color": "#b86b3d",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff7e6",
        "circle-opacity": 0.9,
      },
    });
    map.addLayer({
      id: baseLayerId,
      type: "circle",
      source: sourceId,
      filter: ["==", ["get", "is_base"], true],
      paint: {
        "circle-radius": 9,
        "circle-color": "#2f6f5e",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#f7f3e9",
        "circle-opacity": 1,
      },
    });
    map.addSource(circleSourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });
    map.addLayer({
      id: circleFillLayerId,
      type: "fill",
      source: circleSourceId,
      paint: {
        "fill-color": "#2f6f5e",
        "fill-opacity": 0.12,
      },
    });
    map.addLayer({
      id: circleLineLayerId,
      type: "line",
      source: circleSourceId,
      paint: {
        "line-color": "#2f6f5e",
        "line-width": 2,
        "line-dasharray": [2, 2],
      },
    });
    registerLayerInteractions(nearbyLayerId);
    registerLayerInteractions(baseLayerId);
  } else {
    map.getSource(sourceId).setData(data);
  }

  const baseFeature = (data.features || []).find(
    (feature) => feature.properties?.is_base
  );
  if (baseFeature && Number.isFinite(rangeMeters) && rangeMeters > 0) {
    const center = baseFeature.geometry?.coordinates;
    if (Array.isArray(center) && center.length === 2) {
      const circle = createCircleFeature(center, rangeMeters);
      map.getSource(circleSourceId).setData(circle);
    }
  } else if (map.getSource(circleSourceId)) {
    map.getSource(circleSourceId).setData({
      type: "FeatureCollection",
      features: [],
    });
  }

  const bounds = computeBounds(data.features || []);
  if (bounds) {
    map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 });
  }
}

function updateAllEntities(data) {
  if (!map.getSource(allSourceId)) {
    map.addSource(allSourceId, {
      type: "geojson",
      data,
    });
    map.addLayer({
      id: allLayerId,
      type: "circle",
      source: allSourceId,
      paint: {
        "circle-radius": 5,
        "circle-color": "#4c4339",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#f7f3e9",
        "circle-opacity": 0.55,
      },
    });
    registerLayerInteractions(allLayerId);
  } else {
    map.getSource(allSourceId).setData(data);
  }
}

async function fetchNearby(entity, range) {
  const params = new URLSearchParams({
    entity,
    range: String(range),
    geojson: "true",
  });
  const response = await fetch(`${API_BASE}/entities/nearby?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Erro na API (${response.status})`);
  }
  return response.json();
}

async function fetchAllEntities() {
  const response = await fetch(`${API_BASE}/entities?geojson=true`);
  if (!response.ok) {
    throw new Error(`Erro na API (${response.status})`);
  }
  return response.json();
}

async function handleSubmit(event) {
  event.preventDefault();
  const entity = document.getElementById("entity-input").value.trim();
  const range = Number(document.getElementById("range-input").value);
  if (!entity || Number.isNaN(range)) {
    setStatus("Preencha os campos corretamente.");
    return;
  }

  setStatus("Buscando entidades...");
  setCount(0);
  clearResults();

  try {
    const data = await fetchNearby(entity, range);
    updateMap(data, range);
    renderResults(data.features || []);
    setStatus("Busca concluida.");
    const count = (data.features || []).filter(
      (feature) => !feature.properties?.is_base
    ).length;
    setCount(count);
  } catch (error) {
    setStatus(error.message || "Falha ao consultar a API.");
    setCount(0);
  }
}

map.on("load", () => {
  form.addEventListener("submit", handleSubmit);
  const mapLoadCenter = map.getCenter();
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const center = [longitude, latitude];
        map.flyTo({ center, zoom: 13, speed: 0.9 });
        if (!userMarker) {
          userMarker = new maplibregl.Marker({ color: "#2f6f5e" });
        }
        userMarker.setLngLat(center).addTo(map);
        setStatus("Localizacao detectada.");
      },
      () => {
        setStatus("Nao foi possivel obter a localizacao.");
        map.setCenter(mapLoadCenter);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  } else {
    setStatus("Geolocalizacao nao suportada no navegador.");
  }
  fetchAllEntities()
    .then((data) => {
      updateAllEntities(data);
      setStatus("Entidades carregadas.");
      setCount((data.features || []).length);
      renderResults(data.features || []);
    })
    .catch((error) => {
      setStatus(error.message || "Falha ao carregar entidades.");
    });
});

function registerLayerInteractions(layer) {
  if (interactiveLayers.has(layer)) {
    return;
  }
  interactiveLayers.add(layer);
  map.on("mousemove", layer, (event) => {
    const feature = event.features && event.features[0];
    if (!feature) {
      return;
    }
    const name = feature.properties?.name || "Sem nome";
    map.getCanvas().style.cursor = "pointer";
    hoverPopup.setLngLat(event.lngLat).setText(name).addTo(map);
  });
  map.on("mouseleave", layer, () => {
    map.getCanvas().style.cursor = "";
    hoverPopup.remove();
  });
  map.on("click", layer, (event) => {
    const feature = event.features && event.features[0];
    if (!feature) {
      return;
    }
    const name = feature.properties?.name;
    if (!name) {
      return;
    }
    document.getElementById("entity-input").value = name;
    setStatus(`Centralizando em ${name}...`);
    form.requestSubmit();
  });
}

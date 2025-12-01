const API_BASE_URL = "https://data.xotelo.com/api";
const CORS_PROXY_URL = "https://cors.isomorphic-git.org/";
const ALT_PROXY_ENDPOINTS = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
];
const RESULT_LIMIT = 5;
const DEFAULT_LOCATION = { key: "g294260", label: "Boracay, Philippines" };

const FEATURED_LOCATIONS = [
  {
    key: "g294260",
    label: "Boracay, Philippines",
    aliases: ["boracay", "boracay island", "boracay philippines"],
  },
  {
    key: "g294255",
    label: "Palawan, Philippines",
    aliases: [
      "palawan",
      "palawan island",
      "puerto princesa",
      "el nido",
      "palawan philippines",
    ],
  },
  {
    key: "g298573",
    label: "Manila, Philippines",
    aliases: ["manila", "metro manila", "manila philippines"],
  },
  {
    key: "g298460",
    label: "Cebu City, Philippines",
    aliases: ["cebu", "cebu city", "cebu philippines"],
  },
  {
    key: "g294259",
    label: "Bohol, Philippines",
    aliases: ["bohol", "bohol island", "panglao", "chocolate hills"],
  },
  {
    key: "g298459",
    label: "Davao City, Philippines",
    aliases: ["davao", "davao city", "davao philippines"],
  },
];

const aliasToKeyMap = FEATURED_LOCATIONS.reduce((acc, location) => {
  const registerAlias = (alias) => {
    const normalized = normalizeAlias(alias);
    if (normalized) acc[normalized] = location.key;
  };

  registerAlias(location.label);
  location.aliases.forEach(registerAlias);
  return acc;
}, {});

const keyToLabelMap = FEATURED_LOCATIONS.reduce(
  (acc, location) => {
    acc[location.key] = location.label;
    return acc;
  },
  { [DEFAULT_LOCATION.key]: DEFAULT_LOCATION.label }
);

let currentController = null;

document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("hotelSearchForm");
  const searchInput = document.getElementById("hotelSearchInput");
  const resultsGrid = document.getElementById("hotelResultsGrid");
  const statusEl = document.getElementById("hotelResultsStatus");

  if (!searchForm || !searchInput || !resultsGrid || !statusEl) {
    return;
  }

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const resolution = resolveLocation(searchInput.value);

    if (!resolution.key) {
      renderStatus(
        statusEl,
        "We could not recognize that location. Paste a TripAdvisor Hotels URL or its g-code (ex. g294260).",
        true
      );
      return;
    }

    loadHotels(resolution, resultsGrid, statusEl);
  });

  loadHotels(DEFAULT_LOCATION, resultsGrid, statusEl);
});

function loadHotels(location, resultsGrid, statusEl) {
  if (currentController) {
    currentController.abort();
  }

  currentController = new AbortController();
  const { signal } = currentController;
  const label =
    location.label || keyToLabelMap[location.key] || "Selected location";

  renderStatus(statusEl, `Searching for hotels near ${label}...`);
  resultsGrid.innerHTML = "";

  fetchHotels(location.key, signal)
    .then((hotels) => {
      if (signal.aborted) return;

      if (!hotels.length) {
        renderStatus(
          statusEl,
          `We could not find hotels for ${label}. Try another TripAdvisor location key.`,
          true
        );
        return;
      }

      const topHotels = hotels.slice(0, RESULT_LIMIT);
      resultsGrid.innerHTML = topHotels.map(buildHotelCard).join("");
      renderStatus(statusEl, `Showing ${topHotels.length} stays for ${label}.`);
    })
    .catch((error) => {
      if (signal.aborted) return;
      console.error(error);
      const message =
        error?.message || "Something went wrong while reaching the Xotelo API.";
      renderStatus(statusEl, message, true);
    });
}

async function fetchHotels(locationKey, signal) {
  const endpoint = new URL(`${API_BASE_URL}/list`);
  endpoint.searchParams.set("location_key", locationKey);
  endpoint.searchParams.set("limit", RESULT_LIMIT.toString());
  endpoint.searchParams.set("offset", "0");
  endpoint.searchParams.set("sort", "best_value");

  const requestUrl = endpoint.toString();
  const pipeline = buildProxyPipeline(requestUrl);
  let lastError;

  for (const hop of pipeline) {
    if (signal?.aborted) break;

    try {
      if (hop.notice) {
        console.info(hop.notice);
      }
      return await requestXotelo(hop.url, signal);
    } catch (error) {
      lastError = error;
      const isCorsIssue =
        error instanceof TypeError ||
        /Failed to fetch/i.test(error.message || "");
      if (!isCorsIssue) {
        break;
      }
      console.warn(
        `Xotelo request failed via ${hop.label}. Trying next fallback...`,
        error
      );
    }
  }

  throw (
    lastError || new Error("Unable to reach Xotelo after trying all fallbacks.")
  );
}

function buildProxyPipeline(url) {
  const customProxy =
    typeof window !== "undefined" ? window.XOTELO_PROXY_URL : null;
  const hops = [{ url, label: "direct" }];

  const proxies = [customProxy || CORS_PROXY_URL, ...ALT_PROXY_ENDPOINTS];

  proxies.forEach((entry, index) => {
    if (!entry) return;
    const proxyUrl =
      typeof entry === "function" ? entry(url) : `${entry}${url}`;
    hops.push({
      url: proxyUrl,
      label: index === 0 ? "custom proxy" : `fallback proxy ${index}`,
      notice:
        index === 0 ? "Using custom/CORS proxy fallback for Xotelo." : null,
    });
  });

  return hops;
}

async function requestXotelo(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (payload.error) {
    const errorMessage =
      typeof payload.error === "string"
        ? payload.error
        : payload.error?.message || "Xotelo returned an error.";
    throw new Error(errorMessage);
  }

  return payload?.result?.list ?? [];
}

function buildHotelCard(hotel) {
  const imageSrc = hotel.image || "./images/palawan.avif";
  const rating = hotel.review_summary?.rating;
  const reviewCount = hotel.review_summary?.count;
  const mentions = Array.isArray(hotel.mentions)
    ? hotel.mentions.slice(0, 2).join(" · ")
    : null;
  const priceRange = formatPriceRange(hotel.price_ranges);

  return `
		<article class="hotel-card">
			<img src="${imageSrc}" alt="${escapeHtml(
    hotel.name || "Hotel photo"
  )}" loading="lazy" />
			<div class="hotel-card-body">
				<span class="text-uppercase text-muted" style="font-size: 0.85rem; letter-spacing: 0.2em;">
					${escapeHtml(hotel.accommodation_type || "Hotel")}
				</span>
				<h4 class="fw-semibold mb-0">${escapeHtml(hotel.name || "Untitled hotel")}</h4>
				<div class="hotel-meta">
					${typeof rating === "number" ? `<span>⭐ ${rating.toFixed(1)} / 5</span>` : ""}
					${
            typeof reviewCount === "number"
              ? `<span>${Number(reviewCount).toLocaleString()} reviews</span>`
              : ""
          }
					${mentions ? `<span>${escapeHtml(mentions)}</span>` : ""}
				</div>
				<p class="hotel-price mb-0">${priceRange}</p>
				<a
					class="btn btn-outline-dark rounded-pill mt-auto"
					href="${hotel.url}"
					target="_blank"
					rel="noopener noreferrer"
				>
					View on TripAdvisor
				</a>
			</div>
		</article>
	`;
}

function formatPriceRange(range) {
  if (
    !range ||
    (typeof range.minimum !== "number" && typeof range.maximum !== "number")
  ) {
    return "Rate info unavailable";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const minRate =
    typeof range.minimum === "number" ? formatter.format(range.minimum) : null;
  const maxRate =
    typeof range.maximum === "number" ? formatter.format(range.maximum) : null;

  if (minRate && maxRate) {
    return `${minRate} - ${maxRate} per night`;
  }

  return `${minRate || maxRate} per night`;
}

function renderStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("text-danger", Boolean(isError));
  element.classList.toggle("text-muted", !isError);
}

function resolveLocation(rawInput) {
  const trimmed = (rawInput || "").trim();
  if (!trimmed) {
    return DEFAULT_LOCATION;
  }

  const normalizedAlias = normalizeAlias(trimmed);
  const aliasMatch = aliasToKeyMap[normalizedAlias];
  if (aliasMatch) {
    return { key: aliasMatch, label: keyToLabelMap[aliasMatch] };
  }

  const directKey = extractLocationKey(trimmed);
  if (directKey) {
    return {
      key: directKey,
      label:
        keyToLabelMap[directKey] || `TripAdvisor ${directKey.toUpperCase()}`,
    };
  }

  return { key: null, label: trimmed };
}

function extractLocationKey(value) {
  const keyMatch = value.match(/g\d{5,10}/i);
  if (keyMatch) {
    return keyMatch[0].toLowerCase();
  }

  const urlMatch = value.match(/-g\d+/i);
  if (urlMatch) {
    return urlMatch[0].slice(1).toLowerCase();
  }

  return null;
}

function normalizeAlias(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

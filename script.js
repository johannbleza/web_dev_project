const API_BASE_URL = "https://data.xotelo.com/api";
const RESULT_LIMIT = 6;

const LOCATION_ALIAS_MAP = {
  boracay: { key: "g294260", label: "Boracay, Philippines" },
  palawan: { key: "g294255", label: "Palawan, Philippines" },
  manila: { key: "g298573", label: "Manila, Philippines" },
  cebu: { key: "g298460", label: "Cebu City, Philippines" },
  bohol: { key: "g294259", label: "Bohol, Philippines" },
  davao: { key: "g298459", label: "Davao City, Philippines" },
  siargao: { key: "g674645", label: "Siargao Island, Philippines" },
};

const EXCHANGE_RATE_USD_TO_PHP = 56;
const DEFAULT_LOCATION = LOCATION_ALIAS_MAP.boracay;

document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("hotelSearchForm");
  const searchInput = document.getElementById("hotelSearchInput");
  const resultsGrid = document.getElementById("hotelResultsGrid");
  const statusEl = document.getElementById("hotelResultsStatus");

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const location = resolveLocationKey(searchInput.value);
    loadHotels(location, resultsGrid, statusEl);
  });

  loadHotels(DEFAULT_LOCATION, resultsGrid, statusEl);
  initializeClerkAuth();
});

async function loadHotels(location, resultsGrid, statusEl) {
  statusEl.textContent = `Searching for hotels near ${location.label}...`;
  resultsGrid.innerHTML = "";

  try {
    const hotels = await fetchHotels(location.key);
    if (!hotels.length) {
      statusEl.textContent = `No hotels found for ${location.label}.`;
      return;
    }
    const topHotels = hotels.slice(0, RESULT_LIMIT);
    resultsGrid.innerHTML = topHotels.map(buildHotelCard).join("");
    statusEl.textContent = `Showing ${topHotels.length} stays for ${location.label}.`;
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Error fetching hotel data.";
  }
}

async function fetchHotels(locationKey) {
  const url = `${API_BASE_URL}/list?location_key=${locationKey}&limit=${RESULT_LIMIT}&offset=0&sort=best_value`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
    url
  )}`;

  try {
    const response = await fetch(proxyUrl, {
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (data.error)
      throw new Error(data.error.message || "Error fetching data.");
    return data.result.list || [];
  } catch (error) {
    console.warn("Error fetching hotel data:", error);
  }
}

function buildHotelCard(hotel) {
  const { name, accommodation_type, review_summary, price_ranges, url, image } =
    hotel;
  const rating = review_summary?.rating || "N/A";
  const reviews = review_summary?.count || "No reviews";
  const priceRange = formatPriceRange(price_ranges);
  const imageSrc = image || "./images/palawan.avif";

  return `
    <div class="position-relative d-flex justify-content-center tour-card">
        <div
        class="glass position-absolute z-3 p-2 rounded-5 text-white px-4 d-flex gap-2 rating-badge"
        style="right: 16px; top: 16px"
        >
        <svg class="rating-star" viewBox="0 0 24 24" aria-hidden="true">
            <path
            d="M12 3.5 14.25 8l5.04.73-3.64 3.54.86 5.01L12 14.9 7.49 17.28l.86-5.01-3.64-3.54 5.04-.73Z"
            ></path>
        </svg>
        ${rating}
        
        </div>
        <div
        class="glass position-absolute z-3 p-2 rounded-5 text-white px-4"
        style="left: 16px; top: 16px"
        >
        ${reviews} Reviews
        </div>
        <div
        class="position-absolute z-3 glass text-white p-3 rounded-4 m-2"
        style="bottom: 24px"
        >
        <h6 class="fw-light opacity-50">Hotel</h6>
        <div class="d-flex justify-content-between gap-5">
            <p class="fw-light">${name}</p>
            <p class="fw-light text-end">${priceRange}</p>
        </div>
        </div>
        <img
        src="${imageSrc}"
        alt=""
        class="object-fit-cover rounded-5 z-0 shadow-lg tour-img"
        />
    </div>

  `;
}

function formatPriceRange(range) {
  if (
    !range ||
    typeof range.minimum !== "number" ||
    typeof range.maximum !== "number"
  ) {
    return "Rate info unavailable";
  }

  // Convert USD to PHP
  const maxPricePHP = range.maximum * EXCHANGE_RATE_USD_TO_PHP;

  const formatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  });

  const maxRate = formatter.format(maxPricePHP);

  return `${maxRate} per night`;
}

function resolveLocationKey(query) {
  const normalizedQuery = query.trim().toLowerCase();
  return LOCATION_ALIAS_MAP[normalizedQuery] || DEFAULT_LOCATION;
}

async function initializeClerkAuth() {
  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const userButton = document.getElementById("userButton");
  const userAvatar = document.getElementById("userAvatar");

  try {
    const clerk = await waitForClerk();
    await clerk.load();

    loginButton.addEventListener("click", () => {
      clerk.openSignIn({
        afterSignInUrl: window.location.href,
        afterSignUpUrl: window.location.href,
      });
    });

    logoutButton.addEventListener("click", () => clerk.signOut());
    userButton.addEventListener("click", () => clerk.openUserProfile());

    const renderAuthState = () => {
      const isSignedIn = Boolean(clerk.user);

      loginButton.classList.toggle("d-none", isSignedIn);
      logoutButton.classList.toggle("d-none", !isSignedIn);
      userButton.classList.toggle("d-none", !isSignedIn);

      if (isSignedIn) {
        const avatarUrl =
          clerk.user.imageUrl || clerk.user.profileImageUrl || userAvatar.src;
        userAvatar.src = avatarUrl;
        userAvatar.alt = `${
          clerk.user.fullName || clerk.user.firstName || "Signed-in user"
        } profile photo`;
      }
    };

    renderAuthState();

    if (typeof clerk.addListener === "function") {
      clerk.addListener(renderAuthState);
    } else {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          renderAuthState();
        }
      });
    }
  } catch (error) {
    console.error("Failed to initialize Clerk:", error);
  }
}

function waitForClerk() {
  return new Promise((resolve, reject) => {
    const MAX_WAIT_TIME = 10000;
    const intervalMs = 50;
    let elapsed = 0;

    if (window.Clerk) {
      resolve(window.Clerk);
      return;
    }

    const intervalId = setInterval(() => {
      elapsed += intervalMs;
      if (window.Clerk) {
        clearInterval(intervalId);
        resolve(window.Clerk);
      } else if (elapsed >= MAX_WAIT_TIME) {
        clearInterval(intervalId);
        reject(new Error("Clerk failed to load"));
      }
    }, intervalMs);
  });
}

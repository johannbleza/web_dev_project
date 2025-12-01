// Configuration
const API_URL = "http://localhost:3000/api";

// State
let clerk = null;
let bookingModal = null;
let authModal = null;

const booking = {
  hotel: "",
  price: 0,
  image: "",
  meta: "",
};

// DOM Elements
const elements = {
  // Search
  searchForm: () => document.getElementById("hotelSearchForm"),
  searchInput: () => document.getElementById("hotelSearchInput"),
  resultsGrid: () => document.getElementById("hotelResultsGrid"),
  statusText: () => document.getElementById("hotelResultsStatus"),

  // Booking Form
  bookingForm: () => document.getElementById("bookingForm"),
  hotelInput: () => document.getElementById("bookingHotel"),
  startDate: () => document.getElementById("bookingStartDate"),
  endDate: () => document.getElementById("bookingEndDate"),
  guests: () => document.getElementById("bookingGuests"),
  priceDisplay: () => document.getElementById("bookingPriceValue"),
  metaDisplay: () => document.getElementById("bookingMeta"),
  hotelImage: () => document.getElementById("bookingHotelImage"),
  submitBtn: () => document.querySelector('#bookingForm button[type="submit"]'),

  // Auth
  loginBtn: () => document.getElementById("loginButton"),
  logoutBtn: () => document.getElementById("logoutButton"),
  userBtn: () => document.getElementById("userButton"),
  userAvatar: () => document.getElementById("userAvatar"),
  modalLoginBtn: () => document.getElementById("modalLoginButton"),
};

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  initModals();
  initSearch();
  initBookingForm();
  initAuth();
  loadHotels("boracay");
});

function initModals() {
  const bookingEl = document.getElementById("bookingModal");
  const authEl = document.getElementById("authRequiredModal");

  if (bookingEl) bookingModal = new bootstrap.Modal(bookingEl);
  if (authEl) authModal = new bootstrap.Modal(authEl);
}

function initSearch() {
  elements.searchForm()?.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = elements.searchInput()?.value || "boracay";
    loadHotels(query);
  });
}

function initBookingForm() {
  elements.bookingForm()?.addEventListener("submit", handleBooking);
}

async function loadHotels(location) {
  const grid = elements.resultsGrid();
  const status = elements.statusText();

  status.textContent = "Searching for hotels...";
  grid.innerHTML = "";

  try {
    const res = await fetch(
      `${API_URL}/hotels?location=${encodeURIComponent(location)}`
    );
    const data = await res.json();

    if (!data.hotels?.length) {
      status.textContent = `No hotels found for ${data.location}.`;
      return;
    }

    grid.innerHTML = data.hotels.map(createHotelCard).join("");
    attachCardListeners(grid);
    status.textContent = `Showing ${data.count} stays for ${data.location}.`;
  } catch (error) {
    console.error(error);
    status.textContent = "Error fetching hotels.";
  }
}

function createHotelCard(hotel) {
  const data = {
    name: encodeURIComponent(hotel.name),
    price: hotel.priceAmount || "",
    rating: hotel.rating,
    reviews: encodeURIComponent(hotel.reviewLabel),
    accommodation: encodeURIComponent(hotel.accommodation),
    image: encodeURIComponent(hotel.image),
  };

  return `
    <div class="position-relative d-flex justify-content-center tour-card hotel-card"
         data-name="${data.name}"
         data-price="${data.price}"
         data-rating="${data.rating}"
         data-reviews="${data.reviews}"
         data-accommodation="${data.accommodation}"
         data-image="${data.image}">
      <div class="glass position-absolute z-3 p-2 rounded-5 text-white px-4 d-flex gap-2 rating-badge"
           style="right: 16px; top: 16px">
        <svg class="rating-star" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.5 14.25 8l5.04.73-3.64 3.54.86 5.01L12 14.9 7.49 17.28l.86-5.01-3.64-3.54 5.04-.73Z"></path>
        </svg>
        ${hotel.rating}
      </div>
      <div class="glass position-absolute z-3 p-2 rounded-5 text-white px-4"
           style="left: 16px; top: 16px">
        ${hotel.reviewLabel}
      </div>
      <div class="position-absolute z-3 glass text-white p-3 rounded-4 m-2"
           style="bottom: 24px">
        <h6 class="fw-light opacity-50">Hotel</h6>
        <div class="d-flex justify-content-between gap-5">
          <p class="fw-light">${hotel.name}</p>
          <p class="fw-light text-end">${hotel.price}</p>
        </div>
      </div>
      <img src="${hotel.image}" alt="${hotel.name}"
           class="object-fit-cover rounded-5 z-0 shadow-lg tour-img" />
    </div>
  `;
}

function attachCardListeners(container) {
  container.querySelectorAll(".hotel-card").forEach((card) => {
    card.addEventListener("click", () => openBookingModal(card));
  });
}

function openBookingModal(card) {
  if (!isLoggedIn()) {
    authModal?.show();
    return;
  }

  const decode = (val) => {
    try {
      return decodeURIComponent(val || "");
    } catch {
      return val || "";
    }
  };

  const name = decode(card.dataset.name);
  const price = Number(card.dataset.price) || 0;
  const image = decode(card.dataset.image);
  const accommodation = decode(card.dataset.accommodation);
  const rating = card.dataset.rating;
  const reviews = decode(card.dataset.reviews);

  // Update state
  booking.hotel = name;
  booking.price = price;
  booking.image = image;
  booking.meta = `${accommodation} • Rating ${rating} • ${reviews}`;

  // Update form
  elements.hotelInput().value = name;
  elements.priceDisplay().textContent = price || "N/A";
  elements.metaDisplay().textContent = booking.meta;
  elements.hotelImage().src = image;
  elements.hotelImage().alt = `${name} preview`;

  bookingModal?.show();
}

async function handleBooking(e) {
  e.preventDefault();

  if (!isLoggedIn()) {
    authModal?.show();
    return;
  }

  const startDate = elements.startDate().value;
  const endDate = elements.endDate().value;
  const nights = calculateNights(startDate, endDate);

  if (nights < 1) {
    alert("Please select valid dates (end date must be after start date)");
    return;
  }

  const bookingData = {
    hotel: booking.hotel,
    startDate,
    endDate,
    guests: Number(elements.guests().value),
    pricePerNight: booking.price,
    nights,
    image: booking.image,
  };

  await checkout(bookingData);
}

function calculateNights(start, end) {
  if (!start || !end) return 0;
  const diff = new Date(end) - new Date(start);
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

async function checkout(data) {
  const btn = elements.submitBtn();

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Redirecting...";
    }

    const res = await fetch(`${API_URL}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (result.url) {
      window.location.href = result.url;
    } else {
      throw new Error(result.error || "Checkout failed");
    }
  } catch (error) {
    console.error("Checkout error:", error);
    alert("Failed to redirect to checkout. Please try again.");

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Submit";
    }
  }
}

// Authentication (Clerk)
async function initAuth() {
  try {
    clerk = await waitForClerk();
    await clerk.load();

    elements.loginBtn()?.addEventListener("click", login);
    elements.logoutBtn()?.addEventListener("click", () => clerk.signOut());
    elements
      .userBtn()
      ?.addEventListener("click", () => clerk.openUserProfile());
    elements.modalLoginBtn()?.addEventListener("click", () => {
      login();
      authModal?.hide();
    });

    updateAuthUI();
    clerk.addListener?.(updateAuthUI);
  } catch (error) {
    console.error("Auth init failed:", error);
  }
}

function waitForClerk() {
  return new Promise((resolve, reject) => {
    if (window.Clerk) return resolve(window.Clerk);

    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 50;
      if (window.Clerk) {
        clearInterval(interval);
        resolve(window.Clerk);
      } else if (elapsed >= 10000) {
        clearInterval(interval);
        reject(new Error("Clerk timeout"));
      }
    }, 50);
  });
}

function updateAuthUI() {
  const loggedIn = isLoggedIn();

  elements.loginBtn()?.classList.toggle("d-none", loggedIn);
  elements.logoutBtn()?.classList.toggle("d-none", !loggedIn);
  elements.userBtn()?.classList.toggle("d-none", !loggedIn);

  if (loggedIn && clerk.user) {
    const avatar = elements.userAvatar();
    if (avatar) {
      avatar.src =
        clerk.user.imageUrl || clerk.user.profileImageUrl || avatar.src;
      avatar.alt = `${clerk.user.fullName || "User"} profile`;
    }
  }
}

function isLoggedIn() {
  return Boolean(clerk?.user);
}

function login() {
  clerk?.openSignIn({
    afterSignInUrl: window.location.href,
    afterSignUpUrl: window.location.href,
  });
}

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
// Search
const searchForm = document.getElementById("hotelSearchForm");
const searchInput = document.getElementById("hotelSearchInput");
const resultsGrid = document.getElementById("hotelResultsGrid");
const statusText = document.getElementById("hotelResultsStatus");

// Booking Form
const bookingForm = document.getElementById("bookingForm");
const hotelInput = document.getElementById("bookingHotel");
const startDateInput = document.getElementById("bookingStartDate");
const endDateInput = document.getElementById("bookingEndDate");
const guestsInput = document.getElementById("bookingGuests");
const priceDisplay = document.getElementById("bookingPriceValue");
const metaDisplay = document.getElementById("bookingMeta");
const hotelImage = document.getElementById("bookingHotelImage");
const submitBtn = document.querySelector('#bookingForm button[type="submit"]');

// Auth
const loginBtn = document.getElementById("loginButton");
const logoutBtn = document.getElementById("logoutButton");
const userBtn = document.getElementById("userButton");
const userAvatar = document.getElementById("userAvatar");
const modalLoginBtn = document.getElementById("modalLoginButton");

// Modals
const bookingEl = document.getElementById("bookingModal");
const authEl = document.getElementById("authRequiredModal");
if (bookingEl) bookingModal = new bootstrap.Modal(bookingEl);
if (authEl) authModal = new bootstrap.Modal(authEl);

// Search
searchForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = searchInput?.value || "boracay";
  loadHotels(query);
});

// Booking Form
bookingForm?.addEventListener("submit", handleBooking);

// Auth
initAuth();

// Load initial hotels
loadHotels("boracay");

async function loadHotels(location) {
  statusText.textContent = "Searching for hotels...";
  resultsGrid.innerHTML = "";

  try {
    const res = await fetch(
      `${API_URL}/hotels?location=${encodeURIComponent(location)}`
    );
    const data = await res.json();

    if (!data.hotels?.length) {
      statusText.textContent = `No hotels found for ${data.location}.`;
      return;
    }

    resultsGrid.innerHTML = data.hotels.map(createHotelCard).join("");
    attachCardListeners(resultsGrid);
    statusText.textContent = `Showing ${data.count} stays for ${data.location}.`;
  } catch (error) {
    console.error(error);
    statusText.textContent = "Error fetching hotels.";
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
      <a class="glass position-absolute z-3 p-2 rounded-5 text-white px-4"
           style="left: 16px; top: 16px; text-decoration: none;"
           href="${hotel.url}" onclick="event.stopPropagation()" target="_blank">
           View
      </a>
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
  hotelInput.value = name;
  priceDisplay.textContent = price || "N/A";
  metaDisplay.textContent = booking.meta;
  hotelImage.src = image;
  hotelImage.alt = `${name} preview`;

  bookingModal?.show();
}

async function handleBooking(e) {
  e.preventDefault();

  if (!isLoggedIn()) {
    authModal?.show();
    return;
  }

  const start = startDateInput.value;
  const end = endDateInput.value;
  const nights = calculateNights(start, end);

  if (nights < 1) {
    alert("Please select valid dates (end date must be after start date)");
    return;
  }

  const bookingData = {
    hotel: booking.hotel,
    startDate: start,
    endDate: end,
    guests: Number(guestsInput.value),
    pricePerNight: booking.price,
    nights,
    image: booking.image,
    userId: clerk?.user?.id || "",
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
  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Redirecting...";
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

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  }
}

async function initAuth() {
  try {
    clerk = await waitForClerk();
    await clerk.load();

    loginBtn?.addEventListener("click", login);
    logoutBtn?.addEventListener("click", () =>
      clerk.signOut({ redirectUrl: window.location.href })
    );
    userBtn?.addEventListener("click", () => clerk.openUserProfile());
    modalLoginBtn?.addEventListener("click", () => {
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

  loginBtn?.classList.toggle("d-none", loggedIn);
  logoutBtn?.classList.toggle("d-none", !loggedIn);
  userBtn?.classList.toggle("d-none", !loggedIn);

  if (loggedIn && clerk.user) {
    if (userAvatar) {
      userAvatar.src =
        clerk.user.imageUrl || clerk.user.profileImageUrl || userAvatar.src;
      userAvatar.alt = `${clerk.user.fullName || "User"} profile`;
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

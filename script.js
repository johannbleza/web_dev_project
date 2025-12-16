const API_URL = "http://localhost:3000/api";
const PHP_API_URL = "http://localhost/web_dev_project";

let clerk = null;
let bookingModal = null;
let authModal = null;
let editBookingModal = null;

const booking = { hotel: "", price: 0, image: "", meta: "" };

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

// Bookings Sidebar
const bookingsToggleBtn = document.getElementById("bookingsToggle");
const bookingsSidebar = document.getElementById("bookingsSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const closeSidebarBtn = document.getElementById("closeSidebar");
const bookingsContent = document.getElementById("bookingsContent");

// Modals
const bookingEl = document.getElementById("bookingModal");
const authEl = document.getElementById("authRequiredModal");
const editBookingEl = document.getElementById("editBookingModal");
if (bookingEl) bookingModal = new bootstrap.Modal(bookingEl);
if (authEl) authModal = new bootstrap.Modal(authEl);
if (editBookingEl) editBookingModal = new bootstrap.Modal(editBookingEl);

// Edit Booking Form Elements
const editBookingForm = document.getElementById("editBookingForm");
const editBookingIdInput = document.getElementById("editBookingId");
const editBookingHotelInput = document.getElementById("editBookingHotel");
const editStartDateInput = document.getElementById("editStartDate");
const editEndDateInput = document.getElementById("editEndDate");
const editGuestsInput = document.getElementById("editGuests");

// Search
searchForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = searchInput?.value || "boracay";
  loadHotels(query);
});

// Booking Form
bookingForm?.addEventListener("submit", handleBooking);

// Bookings Sidebar
bookingsToggleBtn?.addEventListener("click", openBookingsSidebar);
closeSidebarBtn?.addEventListener("click", closeBookingsSidebar);
sidebarOverlay?.addEventListener("click", closeBookingsSidebar);

// Edit Booking Form
editBookingForm?.addEventListener("submit", handleEditBooking);

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
    logoutBtn?.addEventListener("click", () => {
      clerk.signOut({ redirectUrl: "http://localhost/web_dev_project" });
    });
    userBtn?.addEventListener("click", () => clerk.openUserProfile());
    modalLoginBtn?.addEventListener("click", () => {
      login();
      authModal?.hide();
    });

    updateAuthUI();
    clerk.addListener?.(updateAuthUI);
  } catch (error) {}
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
  bookingsToggleBtn?.classList.toggle("d-none", !loggedIn);

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

// Bookings Sidebar Functions
function openBookingsSidebar() {
  bookingsSidebar?.classList.add("active");
  sidebarOverlay?.classList.add("active");
  document.body.style.overflow = "hidden";
  loadUserBookings();
}

function closeBookingsSidebar() {
  bookingsSidebar?.classList.remove("active");
  sidebarOverlay?.classList.remove("active");
  document.body.style.overflow = "auto";
}

async function loadUserBookings() {
  if (!isLoggedIn()) {
    bookingsContent.innerHTML = `
      <div class="empty-bookings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <h4>Please log in</h4>
        <p>Sign in to view your bookings</p>
      </div>
    `;
    return;
  }

  bookingsContent.innerHTML = `
    <div class="text-center text-muted py-5">
      <div class="spinner-border spinner-border-sm" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3">Loading your bookings...</p>
    </div>
  `;

  try {
    const userId = clerk?.user?.id;
    const res = await fetch(`${PHP_API_URL}/bookings.php?userId=${userId}`);
    const data = await res.json();

    if (data.error) {
      bookingsContent.innerHTML = `
        <div class="empty-bookings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h4>Error loading bookings</h4>
          <p>${data.error}</p>
        </div>
      `;
      return;
    }

    if (!data.bookings || data.bookings.length === 0) {
      bookingsContent.innerHTML = `
        <div class="empty-bookings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <h4>No bookings yet</h4>
          <p>Start exploring and book your first stay</p>
        </div>
      `;
      return;
    }

    bookingsContent.innerHTML = data.bookings.map(createBookingItem).join("");
    attachBookingActionListeners();
  } catch (error) {
    bookingsContent.innerHTML = `
      <div class="empty-bookings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h4>Error loading bookings</h4>
        <p>Please try again later</p>
      </div>
    `;
  }
}

function createBookingItem(booking) {
  const statusClass = `booking-status-${booking.status || "pending"}`;
  const statusText = booking.status || "pending";
  const totalPrice = (booking.pricePerNight || 0) * (booking.nights || 1);

  return `
    <div class="booking-item" data-booking-id="${booking.booking_id}">
      <img
        src="${booking.image || "./images/palawan.avif"}"
        alt="${booking.hotel}"
        class="booking-item-image"
      />
      <h4 class="booking-item-title">${booking.hotel}</h4>
      <div class="booking-item-details">
        <div class="booking-item-detail">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>${formatDate(booking.startDate)} - ${formatDate(
    booking.endDate
  )}</span>
        </div>
        <div class="booking-item-detail">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>${booking.guests} ${
    booking.guests === 1 ? "guest" : "guests"
  }</span>
        </div>
        <div class="booking-item-detail">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          <span>${booking.nights} ${
    booking.nights === 1 ? "night" : "nights"
  }</span>
        </div>
      </div>
      <div class="booking-item-price">PHP ${totalPrice.toLocaleString()}</div>
      <span class="booking-item-status ${statusClass}">
        ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}
      </span>
      <div class="booking-item-actions">
        <button class="btn btn-edit" data-action="edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 4px;">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit
        </button>
        <button class="btn btn-delete" data-action="delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 4px;">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Delete
        </button>
      </div>
    </div>
  `;
}

function attachBookingActionListeners() {
  const editButtons = bookingsContent.querySelectorAll('[data-action="edit"]');
  const deleteButtons = bookingsContent.querySelectorAll(
    '[data-action="delete"]'
  );

  editButtons.forEach((btn) => {
    btn.addEventListener("click", handleEditButtonClick);
  });

  deleteButtons.forEach((btn) => {
    btn.addEventListener("click", handleDeleteButtonClick);
  });
}

function handleEditButtonClick(e) {
  const bookingItem = e.target.closest(".booking-item");
  const bookingId = bookingItem.dataset.bookingId;

  // Get booking data from the DOM
  const hotel = bookingItem.querySelector(".booking-item-title").textContent;
  const dates = bookingItem
    .querySelector(".booking-item-detail span")
    .textContent.split(" - ");
  const guestsText = bookingItem.querySelectorAll(
    ".booking-item-detail span"
  )[1].textContent;
  const guests = parseInt(guestsText.split(" ")[0]);

  // Parse dates back to YYYY-MM-DD format
  const startDate = parseDateString(dates[0]);
  const endDate = parseDateString(dates[1]);

  // Populate edit form
  editBookingIdInput.value = bookingId;
  editBookingHotelInput.value = hotel;
  editStartDateInput.value = startDate;
  editEndDateInput.value = endDate;
  editGuestsInput.value = guests;

  editBookingModal?.show();
}

async function handleDeleteButtonClick(e) {
  const bookingItem = e.target.closest(".booking-item");
  const bookingId = bookingItem.dataset.bookingId;
  const hotel = bookingItem.querySelector(".booking-item-title").textContent;

  if (!confirm(`Are you sure you want to delete the booking for "${hotel}"?`)) {
    return;
  }

  try {
    const res = await fetch(`${PHP_API_URL}/bookings.php`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });

    const data = await res.json();

    if (data.success) {
      // Reload bookings
      loadUserBookings();
    } else {
      alert("Failed to delete booking: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    alert("Failed to delete booking. Please try again.");
  }
}

async function handleEditBooking(e) {
  e.preventDefault();

  const bookingId = editBookingIdInput.value;
  const startDate = editStartDateInput.value;
  const endDate = editEndDateInput.value;
  const guests = parseInt(editGuestsInput.value);

  // Validate dates
  if (new Date(endDate) <= new Date(startDate)) {
    alert("Check-out date must be after check-in date");
    return;
  }

  try {
    const res = await fetch(`${PHP_API_URL}/bookings.php`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, startDate, endDate, guests }),
    });

    const data = await res.json();

    if (data.success) {
      editBookingModal?.hide();
      loadUserBookings();
    } else {
      alert("Failed to update booking: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    alert("Failed to update booking. Please try again.");
  }
}

function parseDateString(dateStr) {
  // Convert "Jan 15, 2024" to "2024-01-15"
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
const PORT = 3000;
const EXCHANGE_RATE_USD_TO_PHP = 56;
const HOTEL_API_URL = "https://data.xotelo.com/api";
const RESULT_LIMIT = 6;

const stripe = Stripe(
  "sk_test_51SZO97QwUPjmcb7Fr65nX4KdlccQ433u4zL3u0pAWRbEaiLEw6k3lee7WvttDRs5csnureZdjI2au0D0gwxSpTil00yY1OlNwO"
);

// Supported locations from tripadvisor
const LOCATIONS = {
  boracay: { key: "g294260", label: "Boracay, Philippines" },
  palawan: { key: "g294255", label: "Palawan, Philippines" },
  manila: { key: "g298573", label: "Manila, Philippines" },
  cebu: { key: "g298460", label: "Cebu City, Philippines" },
  bohol: { key: "g294259", label: "Bohol, Philippines" },
  davao: { key: "g298459", label: "Davao City, Philippines" },
  siargao: { key: "g674645", label: "Siargao Island, Philippines" },
};

// Middleware
app.use(cors());
app.use(express.json());

function resolveLocation(query) {
  const normalized = (query || "").trim().toLowerCase();
  return LOCATIONS[normalized] || LOCATIONS.boracay;
}

function formatPrice(priceRanges) {
  if (!priceRanges?.minimum || !priceRanges?.maximum) {
    return { formatted: "Rate info unavailable", amount: null };
  }

  const maxPricePHP = Math.round(
    priceRanges.maximum * EXCHANGE_RATE_USD_TO_PHP
  );
  const formatted = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(maxPricePHP);

  return { formatted: `${formatted} per night`, amount: maxPricePHP };
}

function formatHotel(hotel) {
  const { name, accommodation_type, review_summary, price_ranges, image } =
    hotel;
  const priceInfo = formatPrice(price_ranges);

  return {
    name: name || "Unknown Hotel",
    accommodation: accommodation_type || "Hotel",
    rating: review_summary?.rating?.toFixed(1) || "N/A",
    reviewCount: review_summary?.count || 0,
    reviewLabel: review_summary?.count
      ? `${review_summary.count} reviews`
      : "No reviews",
    price: priceInfo.formatted,
    priceAmount: priceInfo.amount,
    image: image || "",
  };
}

app.get("/api/locations", (req, res) => {
  res.json(LOCATIONS);
});

// Search hotels by location
app.get("/api/hotels", async (req, res) => {
  const query = req.query.location || "boracay";
  const location = resolveLocation(query);

  try {
    const url = `${HOTEL_API_URL}/list?location_key=${location.key}&limit=${RESULT_LIMIT}&offset=0&sort=best_value`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const hotels = (data.result?.list || []).map(formatHotel);

    res.json({
      location: location.label,
      count: hotels.length,
      hotels,
    });
  } catch (error) {
    console.error("Hotel API error:", error);
    res.status(500).json({ error: "Failed to fetch hotels" });
  }
});

app.post("/api/checkout", async (req, res) => {
  try {
    const { hotel, pricePerNight, nights, guests, startDate, endDate, image } =
      req.body;

    if (!hotel || !pricePerNight || !nights) {
      return res
        .status(400)
        .json({ error: "Missing required booking details" });
    }

    const totalAmount = pricePerNight * nights * 100;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "php",
            product_data: {
              name: hotel,
              description: `${nights} night(s) • ${guests} guest(s) • ${startDate} to ${endDate}`,
              images: image ? [image] : [],
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:5500/index.html?payment=success",
      cancel_url: "http://localhost:5500/index.html?payment=cancelled",
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

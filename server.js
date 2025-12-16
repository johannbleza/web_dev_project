const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || "http://localhost/web_dev_project";
const EXCHANGE_RATE_USD_TO_PHP = 56;
const HOTEL_API_URL = "https://data.xotelo.com/api";
const RESULT_LIMIT = 6;

// Don't hardcode secrets in source. If STRIPE_SECRET is missing, /api/checkout will
// return a clear error instead of failing unexpectedly.
let stripe = null;
if (process.env.STRIPE_SECRET) {
  stripe = Stripe(process.env.STRIPE_SECRET);
} else {
  console.warn("STRIPE_SECRET not set — checkout endpoint will be disabled");
}

const LOCATIONS = {
  boracay: { key: "g294260", label: "Boracay, Philippines" },
  palawan: { key: "g294255", label: "Palawan, Philippines" },
  manila: { key: "g298573", label: "Manila, Philippines" },
  cebu: { key: "g298460", label: "Cebu City, Philippines" },
  bohol: { key: "g294259", label: "Bohol, Philippines" },
  davao: { key: "g298459", label: "Davao City, Philippines" },
  siargao: { key: "g674645", label: "Siargao Island, Philippines" },
};

app.use(cors());
app.use(express.json());

function resolveLocation(query) {
  const key = (query || "").trim().toLowerCase();
  return LOCATIONS[key] || LOCATIONS.boracay;
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

function serializeHotel(hotel) {
  const {
    name,
    accommodation_type: accommodationType,
    review_summary: reviewSummary,
    price_ranges: priceRanges,
    image,
    url,
  } = hotel;

  const priceInfo = formatPrice(priceRanges);
  const rating =
    typeof reviewSummary?.rating === "number"
      ? reviewSummary.rating.toFixed(1)
      : "N/A";

  return {
    name: name || "Unknown Hotel",
    accommodation: accommodationType || "Hotel",
    rating,
    reviewCount: reviewSummary?.count || 0,
    reviewLabel: reviewSummary?.count
      ? `${reviewSummary.count} reviews`
      : "No reviews",
    price: priceInfo.formatted,
    priceAmount: priceInfo.amount,
    image: image || "",
    url: url || "",
  };
}

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(
      `Upstream error: ${resp.status} ${resp.statusText} ${body}`
    );
  }
  return resp.json();
}

app.get("/api/locations", (req, res) => {
  res.json(LOCATIONS);
});

app.get("/api/hotels", async (req, res) => {
  const query = req.query.location || "boracay";
  const location = resolveLocation(query);

  try {
    const url = `${HOTEL_API_URL}/list?location_key=${location.key}&limit=${RESULT_LIMIT}&offset=0&sort=best_value`;
    const data = await fetchJSON(url);

    if (data.error) throw new Error(data.error.message || "Unknown API error");

    const hotels = (data.result?.list || []).map(serializeHotel);

    res.json({ location: location.label, count: hotels.length, hotels });
  } catch (err) {
    console.error("Error fetching hotels:", err.message || err);
    res.status(502).json({ error: err.message || "Failed to fetch hotels" });
  }
});

app.post("/api/checkout", async (req, res) => {
  if (!stripe)
    return res.status(503).json({ error: "Payment gateway not configured" });

  try {
    const {
      hotel,
      pricePerNight,
      nights,
      guests,
      startDate,
      endDate,
      image,
      userId,
    } = req.body;

    if (!hotel || !pricePerNight || !nights) {
      return res
        .status(400)
        .json({ error: "Missing required booking details" });
    }

    const pricePerNightNum = Math.round(Number(pricePerNight));
    const nightsNum = Math.max(1, parseInt(nights, 10) || 1);
    const totalInPHP = pricePerNightNum * nightsNum;
    const totalAmount = Math.round(totalInPHP * 100); // smallest currency unit

    const successParams = new URLSearchParams({
      user_id: userId || "",
      hotel,
      start_date: startDate || "",
      end_date: endDate || "",
      guests: guests || "",
      nights: String(nightsNum),
      total: String(totalInPHP),
      image: image || "",
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "php",
            product_data: {
              name: hotel,
              description: `${nightsNum} night(s) • ${guests || 1} guest(s) • ${
                startDate || ""
              } to ${endDate || ""}`,
              images: image ? [image] : [],
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${BASE_URL}/thankyou.php?${successParams.toString()}`,
      cancel_url: `${BASE_URL}/index.html?payment=cancelled`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err.message || err);
    res.status(500).json({ error: "Payment processing failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

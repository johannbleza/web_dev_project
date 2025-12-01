const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
const stripe = Stripe(
  "sk_test_51SZO97QwUPjmcb7Fr65nX4KdlccQ433u4zL3u0pAWRbEaiLEw6k3lee7WvttDRs5csnureZdjI2au0D0gwxSpTil00yY1OlNwO"
);

const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { hotel, pricePerNight, nights, guests, startDate, endDate, image } =
      req.body;

    const totalAmount = pricePerNight * nights * 100; // Stripe expects amount in cents

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

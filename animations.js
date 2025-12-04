// GSAP Animations for Tara-Trip! Website
// Simple scroll reveal animations with preloader

gsap.registerPlugin(ScrollTrigger);

// Greetings in different languages (ending with Mabuhay!)
const greetings = [
  "Hello",
  "Bonjour",
  "Hola",
  "Ciao",
  "Hallo",
  "Olá",
  "Konnichiwa",
  "Annyeong",
  "Namaste",
  "Sawadee",
  "Shalom",
  "Salaam",
  "Nǐ hǎo",
  "Kamusta",
  "Mabuhay!",
];

// Preloader Animation
function initPreloader() {
  const preloader = document.getElementById("preloader");
  const preloaderText = document.querySelector(".preloader-text");

  if (!preloader || !preloaderText) {
    initScrollAnimations();
    return;
  }

  document.body.style.overflow = "hidden";

  let currentIndex = 0;
  const intervalDuration = 150; // ~2.7 seconds for 15 greetings, leaving time for exit

  const greetingInterval = setInterval(() => {
    currentIndex++;
    if (currentIndex < greetings.length) {
      preloaderText.textContent = greetings[currentIndex];
    } else {
      clearInterval(greetingInterval);
    }
  }, intervalDuration);

  // Exit preloader after 3 seconds
  gsap.to(preloader, {
    yPercent: -100,
    duration: 0.6,
    ease: "power3.inOut",
    delay: 3,
    onComplete: () => {
      preloader.style.display = "none";
      document.body.style.overflow = "auto";
      initScrollAnimations();
    },
  });
}

// Simple scroll reveal function
function reveal(selector) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el) => {
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        toggleActions: "play none none none",
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
    });
  });
}

// Initialize all scroll animations
function initScrollAnimations() {
  // Hero animations (play on load, not scroll)
  gsap.from(".navbar", {
    y: -30,
    opacity: 0,
    duration: 0.8,
    ease: "power2.out",
  });

  // Scroll reveal animations
  reveal(".section-title");
  reveal(".section-title-md");
  reveal(".favorite-card");
  reveal(".tour-card");
  reveal(".how-it-works-img");
  reveal(".how-it-works .card");
  reveal(".how-it-works .p-4");
  reveal(".testimonial-entry");
  reveal(".cta-overlay");
  reveal(".site-footer");

  // Hotel cards observer for dynamic content
  observeHotelCards();
}

// Animate dynamically loaded hotel cards
function observeHotelCards() {
  const grid = document.getElementById("hotelResultsGrid");
  if (!grid) return;

  const observer = new MutationObserver(() => {
    const cards = grid.querySelectorAll(".hotel-card");
    gsap.from(cards, {
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: "power2.out",
    });
  });

  observer.observe(grid, { childList: true });
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initPreloader);

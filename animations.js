gsap.registerPlugin(ScrollTrigger);

const greetings = [
  "Kamusta",
  "Kumusta",
  "Maayong adlaw",
  "Naimbag a aldaw",
  "Magandang araw",
  "Maupay nga adlaw",
  "Mayap a aldo",
  "Salamat",
  "Tara na!",
  "Mabuhay!",
];

// Preloader Animation
function initPreloader() {
  const preloader = document.getElementById("preloader");
  const preloaderText = document.querySelector(".preloader-text");
  const preloaderLoader = document.querySelector(".preloader-loader");

  if (!preloader || !preloaderText) {
    initScrollAnimations();
    return;
  }

  document.body.style.overflow = "hidden";

  // Initial reveal animation
  gsap.set([preloaderText, preloaderLoader], { opacity: 0, y: 20 });

  gsap.to(preloaderText, {
    opacity: 1,
    y: 0,
    delay: 0.3,
    duration: 0.8,
    ease: "power3.out",
    onComplete: startGreetingCycle,
  });

  gsap.to(preloaderLoader, {
    opacity: 1,
    y: 0,
    delay: 0.5,
    duration: 0.8,
    ease: "power3.out",
  });

  function startGreetingCycle() {
    let currentIndex = 0;
    const intervalDuration = 180;

    const greetingInterval = setInterval(() => {
      currentIndex++;
      if (currentIndex < greetings.length) {
        preloaderText.textContent = greetings[currentIndex];
      } else {
        clearInterval(greetingInterval);
      }
    }, intervalDuration);
  }

  // Exit preloader with smooth animation
  const tl = gsap.timeline({ delay: 4 });

  tl.to(preloaderLoader, {
    opacity: 0,
    y: -20,
    duration: 0.4,
    ease: "power2.in",
  })
    .to(
      preloaderText,
      {
        opacity: 0,
        scale: 0.9,
        duration: 0.4,
        ease: "power2.in",
      },
      "-=0.3"
    )
    .to(
      preloader,
      {
        clipPath: "inset(0 0 100% 0)",
        duration: 0.8,
        ease: "power4.inOut",
        onComplete: () => {
          preloader.style.display = "none";
          document.body.style.overflow = "auto";
          initScrollAnimations();
        },
      },
      "-=0.1"
    );
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
  // Scroll reveal animations
  reveal(".section-title");
  reveal(".section-title-md");
  reveal(".favorite-card");
  reveal(".tour-card");
  reveal(".how-it-works-img");
  reveal(".how-it-works .p-4");
  reveal(".testimonial-entry");

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

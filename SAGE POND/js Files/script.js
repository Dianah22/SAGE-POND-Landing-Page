document.addEventListener("DOMContentLoaded", function () {

    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("navLinks");

    if (!hamburger || !navLinks) {
        return;
    }

    hamburger.addEventListener("click", function () {

        const isOpen = navLinks.classList.toggle("active");

        hamburger.setAttribute(
            "aria-expanded",
            isOpen ? "true" : "false"
        );

        hamburger.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );

    });

    const navItems = navLinks.querySelectorAll("a");

    navItems.forEach(function (link) {

        link.addEventListener("click", function () {

            navLinks.classList.remove("active");

            hamburger.setAttribute(
                "aria-expanded",
                "false"
            );

            hamburger.setAttribute(
                "aria-label",
                "Open navigation menu"
            );

        });

    });

});
// ===========================
// GSAP PAGE ANIMATIONS
// ===========================

document.addEventListener("DOMContentLoaded", function () {

    if (typeof gsap === "undefined") {
        return;
    }

    const heroTitle = document.querySelector(".hero-text h1");
    const heroParagraph = document.querySelector(".hero-text p");
    const heroButton = document.querySelector(".hero-text button");
    const heroImage = document.querySelector(".hero-image");

    if (heroTitle) {
        gsap.from(heroTitle, {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: "power2.out"
        });
    }

    if (heroParagraph) {
        gsap.from(heroParagraph, {
            opacity: 0,
            y: 25,
            duration: 0.8,
            delay: 0.2,
            ease: "power2.out"
        });
    }

    if (heroButton) {
        gsap.from(heroButton, {
            opacity: 0,
            y: 20,
            duration: 0.8,
            delay: 0.4,
            ease: "power2.out"
        });
    }

    if (heroImage) {
        gsap.from(heroImage, {
            opacity: 0,
            x: 30,
            duration: 0.9,
            delay: 0.2,
            ease: "power2.out"
        });
    }

});
// ===========================
// GSAP CARD SCROLL ANIMATIONS
// ===========================

document.addEventListener("DOMContentLoaded", function () {

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const cardGroups = [
        ".step-card",
        ".feature-card",
        ".why-card",
        ".research-card",
        ".update-card"
    ];

    cardGroups.forEach(function (selector) {

        const cards = document.querySelectorAll(selector);

        if (cards.length === 0) {
            return;
        }

        gsap.from(cards, {
            opacity: 0,
            y: 40,
            duration: 0.7,
            stagger: 0.12,
            ease: "power2.out",

            scrollTrigger: {
                trigger: cards[0],
                start: "top 85%",
                toggleActions: "play none none none"
            }
        });

    });

});
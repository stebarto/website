(function () {
    "use strict";

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- Scroll-reveal ----------
    var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

    if (reduceMotion) {
        revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    } else if ("IntersectionObserver" in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        revealEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }

    // ---------- Parallax on the float-dots ----------
    if (!reduceMotion) {
        var dots = Array.prototype.slice.call(document.querySelectorAll(".float-dot"));
        var ticking = false;

        function applyParallax() {
            var scrollY = window.scrollY;
            dots.forEach(function (dot, i) {
                var speed = 0.08 + (i % 3) * 0.04;
                dot.style.setProperty("--py", (scrollY * speed * -1) + "px");
            });
            ticking = false;
        }

        window.addEventListener("scroll", function () {
            if (!ticking) {
                requestAnimationFrame(applyParallax);
                ticking = true;
            }
        });
        applyParallax();
    }
})();

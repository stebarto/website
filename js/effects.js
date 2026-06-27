(function () {
    "use strict";

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- Scroll-reveal ----------
    var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

    function isInViewport(el) {
        var rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.85 && rect.bottom > 0;
    }

    function reveal(el) { el.classList.add("is-visible"); }

    if (reduceMotion) {
        revealEls.forEach(reveal);
    } else {
        // Elements already on screen at load time (e.g. the first section)
        // must not wait on a scroll-triggered IntersectionObserver callback
        // that may never fire before the user starts reading.
        var pending = revealEls.filter(function (el) {
            if (isInViewport(el)) { reveal(el); return false; }
            return true;
        });

        if (pending.length && "IntersectionObserver" in window) {
            var revealObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        reveal(entry.target);
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });
            pending.forEach(function (el) { revealObserver.observe(el); });
        } else {
            pending.forEach(reveal);
        }

        // Safety net: never leave content permanently invisible if the
        // observer doesn't fire for some reason (e.g. an unusual browser
        // environment) — reveal everything still hidden after a short wait.
        setTimeout(function () {
            revealEls.forEach(function (el) {
                if (!el.classList.contains("is-visible")) reveal(el);
            });
        }, 2500);
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

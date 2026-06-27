(function () {
    "use strict";

    var reduceMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* -------------------------------------------------------
       SCROLL-REVEAL con cascade
       Elementi nello stesso contenitore padre vengono rivelati
       uno dopo l'altro con 120 ms di ritardo fra loro.
    ------------------------------------------------------- */
    var revealEls = Array.prototype.slice.call(
        document.querySelectorAll("[data-reveal]")
    );

    // Assegna i delay prima che il browser dipinga, così non c'è flash.
    var parentSeen = [];
    revealEls.forEach(function (el) {
        var parent = el.parentElement;
        var idx = parentSeen.indexOf(parent);
        if (idx === -1) {
            parentSeen.push(parent);
            idx = parentSeen.length - 1;
        }
        // Conta quanti fratelli [data-reveal] vengono prima di questo.
        var siblings = Array.prototype.slice.call(
            parent.querySelectorAll("[data-reveal]")
        );
        var order = siblings.indexOf(el);
        el.style.transitionDelay = (order * 130) + "ms";
    });

    function isInViewport(el) {
        var rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.88 && rect.bottom > 0;
    }

    function reveal(el) { el.classList.add("is-visible"); }

    if (reduceMotion) {
        revealEls.forEach(reveal);
    } else {
        var pending = revealEls.filter(function (el) {
            if (isInViewport(el)) { reveal(el); return false; }
            return true;
        });

        if (pending.length && "IntersectionObserver" in window) {
            var obs = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting) {
                        reveal(e.target);
                        obs.unobserve(e.target);
                    }
                });
            }, { threshold: 0.12 });
            pending.forEach(function (el) { obs.observe(el); });
        } else {
            pending.forEach(reveal);
        }

        // Fallback di sicurezza
        setTimeout(function () {
            revealEls.forEach(function (el) {
                if (!el.classList.contains("is-visible")) reveal(el);
            });
        }, 2500);
    }

    /* -------------------------------------------------------
       PARALLASSE
       - .dot   (piccoli, veloci — "vicini")
       - .orb   (grandi, lenti  — "lontani")
    ------------------------------------------------------- */
    if (!reduceMotion) {
        var dots = Array.prototype.slice.call(document.querySelectorAll(".dot"));
        var orbs = Array.prototype.slice.call(document.querySelectorAll(".orb"));
        var ticking = false;

        function tick() {
            var sy = window.scrollY;

            dots.forEach(function (d, i) {
                // velocità variata per dot: 0.12 – 0.24
                var speed = 0.12 + (i % 5) * 0.03;
                d.style.setProperty("--dy", (sy * speed * -1) + "px");
            });

            orbs.forEach(function (o, i) {
                // orb si muovono più lentamente: 0.04 – 0.09
                // direzioni alternate per più movimento
                var speed  = 0.04 + (i % 4) * 0.016;
                var dirX   = (i % 2 === 0) ? 1 : -1;
                var offsetX = sy * speed * 0.4 * dirX;
                var offsetY = sy * speed * -1;
                o.style.transform = "translate(" + offsetX + "px, " + offsetY + "px)";
            });

            ticking = false;
        }

        window.addEventListener("scroll", function () {
            if (!ticking) { requestAnimationFrame(tick); ticking = true; }
        }, { passive: true });

        tick(); // inizializza al load
    }

})();

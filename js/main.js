/* STEBARTO // PIT STOP — page chrome */
(function () {
    "use strict";

    // animated build progress
    var PCT = 58;
    var fill = document.getElementById("build-fill");
    var label = document.getElementById("build-pct");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
        fill.style.width = PCT + "%";
        label.textContent = PCT + "%";
        return;
    }

    setTimeout(function () { fill.style.width = PCT + "%"; }, 300);
    var start = performance.now();
    (function count(t) {
        var k = Math.min(1, (t - start) / 1700);
        label.textContent = Math.round(PCT * (1 - Math.pow(1 - k, 3))) + "%";
        if (k < 1) requestAnimationFrame(count);
    })(start);
})();

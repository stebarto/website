(function () {
    "use strict";

    var dots = Array.prototype.slice.call(document.querySelectorAll(".side-nav-dot"));
    var sections = dots.map(function (dot) {
        return document.getElementById(dot.getAttribute("data-target"));
    });

    function setActive(id) {
        dots.forEach(function (dot) {
            dot.classList.toggle("active", dot.getAttribute("data-target") === id);
        });
    }

    dots.forEach(function (dot) {
        dot.addEventListener("click", function (e) {
            e.preventDefault();
            var target = document.getElementById(dot.getAttribute("data-target"));
            if (target) target.scrollIntoView({ behavior: "smooth" });
        });
    });

    if ("IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) setActive(entry.target.id);
            });
        }, { threshold: 0.5 });
        sections.forEach(function (section) {
            if (section) observer.observe(section);
        });
    } else {
        setActive("about");
    }
})();

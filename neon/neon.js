/* STEBARTO // NEON — clocks, parallax, particles, reveals */
(function () {
    "use strict";

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var finePointer = window.matchMedia("(hover: hover) and (min-width: 769px)").matches;

    var LAUNCH_DATE = new Date("2026-07-31T18:00:00");

    /* ---------- Custom cursor ---------- */
    function initCursor() {
        if (!finePointer || reducedMotion) return;
        var dot = document.getElementById("cursor-dot");
        var ring = document.getElementById("cursor-ring");
        var mx = -100, my = -100, rx = -100, ry = -100;
        document.body.classList.add("cursor-on");
        document.addEventListener("mousemove", function (e) {
            mx = e.clientX;
            my = e.clientY;
        });
        (function loop() {
            rx += (mx - rx) * 0.16;
            ry += (my - ry) * 0.16;
            dot.style.transform = "translate(" + (mx - 3.5) + "px," + (my - 3.5) + "px)";
            ring.style.transform = "translate(" + (rx - 17) + "px," + (ry - 17) + "px)";
            requestAnimationFrame(loop);
        })();
    }

    /* ---------- Nav shrink + scroll progress ---------- */
    function initNavAndProgress() {
        var nav = document.getElementById("nav");
        var bar = document.getElementById("progress-bar");
        var ticking = false;
        function update() {
            ticking = false;
            var y = window.scrollY;
            nav.classList.toggle("scrolled", y > 50);
            var max = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
        }
        window.addEventListener("scroll", function () {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }, { passive: true });
        update();
    }

    /* ---------- Scroll + mouse parallax ---------- */
    function initParallax() {
        if (!finePointer || reducedMotion) return;
        var layers = [].slice.call(document.querySelectorAll("[data-parallax]")).map(function (el) {
            return { el: el, speed: parseFloat(el.getAttribute("data-parallax")) || 0, mouse: parseFloat(el.getAttribute("data-mouse")) || 0 };
        });
        if (!layers.length) return;
        var mx = 0, my = 0, smx = 0, smy = 0;
        document.addEventListener("mousemove", function (e) {
            mx = e.clientX / window.innerWidth - 0.5;
            my = e.clientY / window.innerHeight - 0.5;
        });
        (function loop() {
            var y = window.scrollY;
            smx += (mx - smx) * 0.06;
            smy += (my - smy) * 0.06;
            for (var i = 0; i < layers.length; i++) {
                var l = layers[i];
                var ox = l.mouse ? smx * l.mouse : 0;
                var oy = y * l.speed + (l.mouse ? smy * l.mouse * 0.6 : 0);
                l.el.style.transform = "translate3d(" + ox + "px," + oy + "px,0)";
            }
            requestAnimationFrame(loop);
        })();
    }

    /* ---------- Particle canvas ---------- */
    function initParticles() {
        var canvas = document.getElementById("particles");
        var ctx = canvas.getContext("2d");
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var particles = [];
        var running = false;

        // Pre-rendered glow sprite — far cheaper than shadowBlur per particle
        var sprite = document.createElement("canvas");
        sprite.width = sprite.height = 32;
        var sctx = sprite.getContext("2d");
        var grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, "rgba(216, 180, 254, 1)");
        grad.addColorStop(0.35, "rgba(168, 85, 247, 0.55)");
        grad.addColorStop(1, "rgba(124, 58, 237, 0)");
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, 32, 32);

        function resize() {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            var n = Math.min(120, Math.floor(window.innerWidth * window.innerHeight / 14000));
            particles = [];
            for (var i = 0; i < n; i++) {
                particles.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    vx: (Math.random() - 0.5) * 0.22,
                    vy: -0.12 - Math.random() * 0.3,
                    r: 0.6 + Math.random() * 1.6,
                    a: 0.25 + Math.random() * 0.6
                });
            }
        }

        function frame() {
            if (!running) return;
            var w = window.innerWidth, h = window.innerHeight;
            ctx.clearRect(0, 0, w, h);
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;
                ctx.globalAlpha = p.a;
                var s = p.r * 6;
                ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
            }
            ctx.globalAlpha = 1;
            ctx.lineWidth = 0.6;
            for (i = 0; i < particles.length; i++) {
                for (var j = i + 1; j < particles.length; j++) {
                    var dx = particles[i].x - particles[j].x;
                    if (dx > 110 || dx < -110) continue;
                    var dy = particles[i].y - particles[j].y;
                    var d2 = dx * dx + dy * dy;
                    if (d2 > 12100) continue;
                    ctx.strokeStyle = "rgba(168, 85, 247," + (0.16 * (1 - d2 / 12100)) + ")";
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
            requestAnimationFrame(frame);
        }

        var resizeTimer;
        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 200);
        });
        resize();

        if (reducedMotion) {
            running = true;
            frame();
            running = false; // single static frame
            return;
        }
        running = true;
        frame();
        document.addEventListener("visibilitychange", function () {
            var wasRunning = running;
            running = !document.hidden;
            if (running && !wasRunning) frame();
        });
    }

    /* ---------- Clock + countdown engine ---------- */
    function initClocks() {
        var slots = {};
        [].slice.call(document.querySelectorAll("#big-clock .digit")).forEach(function (el) {
            slots[el.getAttribute("data-slot")] = el;
        });
        var bigClock = document.getElementById("big-clock");
        var footerClock = document.getElementById("footer-clock");
        var dateEl = document.getElementById("clock-date");
        var utcEl = document.getElementById("clock-utc");
        var hand = document.getElementById("ring-hand");

        var cd = {
            days: document.getElementById("cd-days"),
            hours: document.getElementById("cd-hours"),
            mins: document.getElementById("cd-mins"),
            secs: document.getElementById("cd-secs")
        };
        var secCard = document.getElementById("cd-sec-card");
        var launchLabel = document.getElementById("launch-date-label");

        var DAYS_IT = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"];

        function pad(n) { return n < 10 ? "0" + n : "" + n; }

        launchLabel.textContent = LAUNCH_DATE.getFullYear() + "." +
            pad(LAUNCH_DATE.getMonth() + 1) + "." + pad(LAUNCH_DATE.getDate()) +
            " — " + pad(LAUNCH_DATE.getHours()) + ":" + pad(LAUNCH_DATE.getMinutes());

        function setSlot(key, val) {
            if (slots[key].textContent !== val) slots[key].textContent = val;
        }

        function setText(el, val) {
            if (el.textContent !== val) el.textContent = val;
        }

        var lastMinute = -1;

        function tick() {
            var now = new Date();
            var h = pad(now.getHours()), m = pad(now.getMinutes()), s = pad(now.getSeconds());

            setSlot("h1", h[0]); setSlot("h2", h[1]);
            setSlot("m1", m[0]); setSlot("m2", m[1]);
            setSlot("s1", s[0]); setSlot("s2", s[1]);
            bigClock.setAttribute("datetime", now.toISOString());
            footerClock.textContent = h + ":" + m + ":" + s;

            setText(dateEl, DAYS_IT[now.getDay()] + " // " + now.getFullYear() + "." +
                pad(now.getMonth() + 1) + "." + pad(now.getDate()));
            var off = -now.getTimezoneOffset() / 60;
            setText(utcEl, "UTC" + (off >= 0 ? "+" : "") + off);

            // Analog seconds hand: skip the transition at the 59 -> 0 wraparound
            if (!reducedMotion) {
                var deg = now.getSeconds() * 6;
                hand.classList.toggle("no-snap", now.getSeconds() === 0);
                hand.style.transform = "rotate(" + deg + "deg)";
            }

            // Glitch burst on minute rollover
            if (!reducedMotion && lastMinute !== -1 && now.getMinutes() !== lastMinute) {
                bigClock.classList.remove("glitching");
                void bigClock.offsetWidth;
                bigClock.classList.add("glitching");
            }
            lastMinute = now.getMinutes();

            // Countdown
            var diff = Math.max(0, LAUNCH_DATE - now);
            var totalSec = Math.floor(diff / 1000);
            setText(cd.days, pad(Math.floor(totalSec / 86400)));
            setText(cd.hours, pad(Math.floor(totalSec / 3600) % 24));
            setText(cd.mins, pad(Math.floor(totalSec / 60) % 60));
            setText(cd.secs, pad(totalSec % 60));
            if (!reducedMotion) {
                secCard.classList.remove("tick");
                void secCard.offsetWidth;
                secCard.classList.add("tick");
            }

            setTimeout(tick, 1000 - new Date().getMilliseconds());
        }

        // 60 tick marks on the analog ring
        var ticksGroup = document.getElementById("ring-ticks");
        var svgNS = "http://www.w3.org/2000/svg";
        for (var i = 0; i < 60; i++) {
            var line = document.createElementNS(svgNS, "line");
            var major = i % 5 === 0;
            line.setAttribute("x1", "100");
            line.setAttribute("y1", major ? "8" : "10");
            line.setAttribute("x2", "100");
            line.setAttribute("y2", "13");
            line.setAttribute("stroke", "currentColor");
            line.setAttribute("stroke-width", major ? "1" : "0.4");
            line.setAttribute("transform", "rotate(" + i * 6 + " 100 100)");
            ticksGroup.appendChild(line);
        }

        tick();
    }

    /* ---------- Typewriter ---------- */
    function initTypewriter() {
        var el = document.getElementById("typewriter");
        var full = el.getAttribute("data-full");
        if (reducedMotion) {
            el.textContent = full;
            return;
        }
        var i = 0;
        (function type() {
            if (i <= full.length) {
                el.textContent = full.slice(0, i++);
                setTimeout(type, 26 + Math.random() * 50);
            }
        })();
    }

    /* ---------- Reveal on scroll ---------- */
    function initReveals() {
        var els = document.querySelectorAll("[data-reveal]");
        if (reducedMotion || !("IntersectionObserver" in window)) {
            [].forEach.call(els, function (el) { el.classList.add("visible"); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.18 });
        [].forEach.call(els, function (el) { io.observe(el); });
    }

    /* ---------- Count-up stats ---------- */
    function initCounters() {
        var els = document.querySelectorAll("[data-count]");
        function finish(el) { el.textContent = el.getAttribute("data-count"); }
        if (reducedMotion || !("IntersectionObserver" in window)) {
            [].forEach.call(els, finish);
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                io.unobserve(entry.target);
                var el = entry.target;
                var target = parseInt(el.getAttribute("data-count"), 10);
                var start = performance.now();
                var dur = 1600;
                (function step(t) {
                    var k = Math.min(1, (t - start) / dur);
                    var ease = 1 - Math.pow(1 - k, 3);
                    el.textContent = Math.round(target * ease);
                    if (k < 1) requestAnimationFrame(step);
                })(start);
            });
        }, { threshold: 0.4 });
        [].forEach.call(els, function (el) { io.observe(el); });
    }

    /* ---------- Periodic glitch on hero title ---------- */
    function initGlitch() {
        if (reducedMotion) return;
        var els = document.querySelectorAll(".glitch");
        setInterval(function () {
            [].forEach.call(els, function (el) {
                el.classList.add("glitching");
                setTimeout(function () { el.classList.remove("glitching"); }, 420);
            });
        }, 6000);
    }

    /* ---------- 3D card tilt ---------- */
    function initTilt() {
        if (!finePointer || reducedMotion) return;
        [].forEach.call(document.querySelectorAll("[data-tilt]"), function (card) {
            card.addEventListener("mousemove", function (e) {
                var r = card.getBoundingClientRect();
                var px = (e.clientX - r.left) / r.width - 0.5;
                var py = (e.clientY - r.top) / r.height - 0.5;
                card.classList.add("tilting");
                card.style.transform = "perspective(700px) rotateX(" + (-py * 8) + "deg) rotateY(" + (px * 8) + "deg) translateY(-4px)";
            });
            card.addEventListener("mouseleave", function () {
                card.style.transform = "";
                card.classList.remove("tilting");
            });
        });
    }

    initCursor();
    initNavAndProgress();
    initParallax();
    initParticles();
    initClocks();
    initTypewriter();
    initReveals();
    initCounters();
    initGlitch();
    initTilt();
})();

/* STEBARTO GP — top-down F1 mini race vs CPU */
(function () {
    "use strict";

    var canvas = document.getElementById("race-canvas");
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;

    var overlay = document.getElementById("game-overlay");
    var overlayKicker = document.getElementById("overlay-kicker");
    var overlayTitle = document.getElementById("overlay-title");
    var overlayMsg = document.getElementById("overlay-msg");
    var startBtn = document.getElementById("start-btn");
    var hud = document.getElementById("hud");
    var hudLap = document.getElementById("hud-lap");
    var hudPos = document.getElementById("hud-pos");
    var hudTime = document.getElementById("hud-time");
    var statLast = document.getElementById("stat-last");
    var statBest = document.getElementById("stat-best");
    var statRecord = document.getElementById("stat-record");

    var LAPS = 3;
    var TRACK_HALF = 34;
    var STORE_KEY = "stebarto-gp-best-lap";
    var DEMO = /[?&]demo=1/.test(location.search); // attract mode: the red car drives itself

    /* ---------- Track: Catmull-Rom through control points ---------- */
    var CONTROL = [
        [120, 110], [320, 65], [500, 100], [575, 210], [540, 320],
        [430, 380], [330, 350], [240, 400], [130, 415], [65, 320], [85, 200]
    ];

    var WP = [];          // sampled centerline waypoints
    (function sample() {
        var n = CONTROL.length, perSeg = 22;
        for (var i = 0; i < n; i++) {
            var p0 = CONTROL[(i - 1 + n) % n], p1 = CONTROL[i];
            var p2 = CONTROL[(i + 1) % n], p3 = CONTROL[(i + 2) % n];
            for (var j = 0; j < perSeg; j++) {
                var t = j / perSeg, t2 = t * t, t3 = t2 * t;
                WP.push([
                    0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                    0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
                ]);
            }
        }
    })();
    // rotate so WP[0] (start/finish, grid, lap counting) sits mid main straight
    WP = WP.slice(24).concat(WP.slice(0, 24));
    var N = WP.length;

    function wpHeading(i) {
        var a = WP[i % N], b = WP[(i + 1) % N];
        return Math.atan2(b[1] - a[1], b[0] - a[0]);
    }

    // curvature per waypoint (heading change over a small window), for CPU corner speed
    var CURV = [];
    (function () {
        for (var i = 0; i < N; i++) {
            var h1 = wpHeading((i + N - 4) % N), h2 = wpHeading((i + 4) % N);
            var d = Math.abs(Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1)));
            CURV.push(d);
        }
    })();

    /* ---------- Pre-rendered track layer ---------- */
    var trackLayer = document.createElement("canvas");
    trackLayer.width = W; trackLayer.height = H;
    (function paintTrack() {
        var t = trackLayer.getContext("2d");

        // night grass
        t.fillStyle = "#0e160f";
        t.fillRect(0, 0, W, H);
        for (var i = 0; i < 900; i++) {
            t.fillStyle = Math.random() < 0.5 ? "rgba(20,34,21,0.8)" : "rgba(8,12,9,0.8)";
            t.fillRect(Math.random() * W, Math.random() * H, 2, 2);
        }

        function tracePath() {
            t.beginPath();
            t.moveTo(WP[0][0], WP[0][1]);
            for (var i = 1; i < N; i++) t.lineTo(WP[i][0], WP[i][1]);
            t.closePath();
        }
        t.lineJoin = "round";

        // curbs: white base + red dashes
        tracePath();
        t.strokeStyle = "#cfcfcf";
        t.lineWidth = TRACK_HALF * 2 + 12;
        t.stroke();
        tracePath();
        t.strokeStyle = "#c21f17";
        t.setLineDash([12, 12]);
        t.lineWidth = TRACK_HALF * 2 + 12;
        t.stroke();
        t.setLineDash([]);

        // asphalt
        tracePath();
        t.strokeStyle = "#26262b";
        t.lineWidth = TRACK_HALF * 2;
        t.stroke();
        // worn racing line
        tracePath();
        t.strokeStyle = "rgba(0,0,0,0.25)";
        t.lineWidth = 16;
        t.stroke();

        // center dashes
        tracePath();
        t.strokeStyle = "rgba(220,220,220,0.35)";
        t.setLineDash([10, 16]);
        t.lineWidth = 2;
        t.stroke();
        t.setLineDash([]);

        /* ----- scenery: stands, sponsors, pits ----- */
        function place(idx, off) { // off > 0 = outside of the loop
            var h = wpHeading(idx % N);
            return {
                x: WP[idx % N][0] + Math.cos(h - Math.PI / 2) * off,
                y: WP[idx % N][1] + Math.sin(h - Math.PI / 2) * off,
                ang: h
            };
        }

        var CROWD = ["#e8e8e8", "#e10600", "#ffd200", "#00c2ff", "#7dd87d", "#ff8c42", "#c879ff"];

        function grandstand(idx, len, off, depth) {
            var p = place(idx, off);
            t.save();
            t.translate(p.x, p.y);
            t.rotate(p.ang);
            // tiers extend away from the track (local -y)
            t.fillStyle = "#1a1a20";
            t.fillRect(-len / 2, -depth, len, depth);
            t.fillStyle = "#2c2c34";
            t.fillRect(-len / 2, -depth - 2.5, len, 2.5);
            for (var row = 0; row < 3; row++) {
                var ry = -depth + 2.5 + row * 3.9;
                for (var rx = -len / 2 + 3; rx < len / 2 - 2; rx += 3) {
                    if (Math.random() < 0.18) continue;
                    t.fillStyle = CROWD[(Math.random() * CROWD.length) | 0];
                    t.fillRect(rx + (Math.random() - 0.5), ry + (Math.random() - 0.5), 1.8, 1.8);
                }
            }
            t.fillStyle = "#cfcfcf"; // front fence
            t.fillRect(-len / 2, 0, len, 1.6);
            t.restore();
        }

        function hoarding(from, to, off) {
            for (var i = from; i <= to; i += 3) {
                var p = place(i, off);
                t.save();
                t.translate(p.x, p.y);
                t.rotate(p.ang);
                t.fillStyle = ((i / 3) | 0) % 2 ? "#c21f17" : "#d8d8d8";
                t.fillRect(-4, -1.5, 8, 3);
                t.restore();
            }
        }

        function grassText(x, y, ang, text, size, alpha) {
            t.save();
            t.translate(x, y);
            t.rotate(ang);
            t.font = "italic 700 " + size + "px 'Chakra Petch', 'Titillium Web', monospace";
            t.textAlign = "center";
            t.textBaseline = "middle";
            t.fillStyle = "rgba(215,215,222," + alpha + ")";
            t.fillText(text, 0, 0);
            t.restore();
        }

        // stands overlooking the finish line and the bottom corner
        grandstand(0, 120, TRACK_HALF + 10, 15);
        grandstand(132, 84, TRACK_HALF + 6, 13);
        // red/white hoardings on the fast corners
        hoarding(32, 62, TRACK_HALF + 12);
        hoarding(96, 120, TRACK_HALF + 12);
        hoarding(172, 194, TRACK_HALF + 12);
        // sponsors painted on the infield grass
        grassText(320, 232, -0.05, "STEBARTO", 24, 0.28);
        grassText(320, 256, -0.05, "GP 2026", 11, 0.22);
        grassText(432, 300, 0.5, "CAFFÈ 312", 9, 0.2);
        grassText(195, 255, -0.6, "ROBOTTINO RACING", 8, 0.2);

        // pit complex on the infield, aligned with the main straight
        (function pits() {
            var p = place(N - 6, -(TRACK_HALF + 18));
            t.save();
            t.translate(p.x, p.y);
            t.rotate(p.ang);
            // apron with bay markings
            t.fillStyle = "#33333a";
            t.fillRect(-28, -12, 56, 12);
            t.strokeStyle = "rgba(220,220,225,0.4)";
            t.lineWidth = 1;
            for (var b = -28; b <= 28; b += 14) {
                t.beginPath(); t.moveTo(b, -12); t.lineTo(b, 0); t.stroke();
            }
            // garage with red roof trim
            t.fillStyle = "#1d1d24";
            t.fillRect(-28, 0, 56, 16);
            t.fillStyle = "#c21f17";
            t.fillRect(-28, 0, 56, 2.5);
            // parked cars in two bays
            t.fillStyle = "#55555f";
            t.fillRect(-24, -9, 10, 5);
            t.fillStyle = "#7a2a26";
            t.fillRect(4, -9, 10, 5);
            // label
            t.font = "700 7px 'Chakra Petch', monospace";
            t.textAlign = "center";
            t.fillStyle = "rgba(230,230,235,0.75)";
            t.fillText("PIT", 0, 11.5);
            t.restore();
        })();

        // start / finish checkers across the track at WP[0]
        var h = wpHeading(0), px = Math.cos(h + Math.PI / 2), py = Math.sin(h + Math.PI / 2);
        var sq = 6;
        for (var r = 0; r < 3; r++) {
            for (var k = -TRACK_HALF; k < TRACK_HALF; k += sq) {
                if ((Math.floor(k / sq) + r) % 2 === 0) continue;
                var cx = WP[0][0] + px * (k + sq / 2) + Math.cos(h) * (r * sq - sq);
                var cy = WP[0][1] + py * (k + sq / 2) + Math.sin(h) * (r * sq - sq);
                t.save();
                t.translate(cx, cy);
                t.rotate(h);
                t.fillStyle = "#e8e8e8";
                t.fillRect(-sq / 2, -sq / 2, sq - 1, sq - 1);
                t.restore();
            }
        }
    })();

    /* ---------- Cars ---------- */
    function shade(hex, f) {
        var n = parseInt(hex.slice(1), 16);
        var r = Math.min(255, Math.round(((n >> 16) & 255) * f));
        var g = Math.min(255, Math.round(((n >> 8) & 255) * f));
        var b = Math.min(255, Math.round((n & 255) * f));
        return "rgb(" + r + "," + g + "," + b + ")";
    }

    function makeCar(color, helmet, isPlayer, skill, laneOffset) {
        return {
            color: color, dark: shade(color, 0.55), lite: shade(color, 1.6),
            helmet: helmet,
            isPlayer: isPlayer, skill: skill, laneOffset: laneOffset,
            x: 0, y: 0, heading: 0, speed: 0, slip: 0,
            wpIdx: 0, lap: 0, prevIdx: 0,
            lapStart: 0, lastLap: null, bestLap: null, finished: false, finishTime: 0
        };
    }

    var cars = [];
    var player;

    function nearestWp(car) {
        var best = car.wpIdx, bestD = Infinity;
        for (var o = -12; o <= 12; o++) {
            var i = (car.wpIdx + o + N) % N;
            var dx = car.x - WP[i][0], dy = car.y - WP[i][1];
            var d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = i; }
        }
        return { idx: best, dist: Math.sqrt(bestD) };
    }

    /* ---------- Input ---------- */
    var keys = {};
    var touchSteer = 0, touchActive = false;

    document.addEventListener("keydown", function (e) {
        var k = e.key.toLowerCase();
        if (state === "race" && ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].indexOf(k) !== -1) e.preventDefault();
        keys[k] = true;
        if (k === "p" && (state === "race" || state === "paused")) togglePause();
        if (k === "r" && state !== "idle") startRace();
    });
    document.addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });

    canvas.addEventListener("pointerdown", function (e) {
        if (state !== "race") return;
        touchActive = true;
        var r = canvas.getBoundingClientRect();
        touchSteer = (e.clientX - r.left) < r.width / 2 ? -1 : 1;
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", function (e) {
        if (!touchActive) return;
        var r = canvas.getBoundingClientRect();
        touchSteer = (e.clientX - r.left) < r.width / 2 ? -1 : 1;
    });
    function endTouch() { touchActive = false; touchSteer = 0; }
    canvas.addEventListener("pointerup", endTouch);
    canvas.addEventListener("pointercancel", endTouch);

    /* ---------- Hazards: oil slicks & mud patches ---------- */
    var hazards = [], marks = [];
    var hazardTimer = 0;

    function spawnHazard() {
        if (hazards.length >= 4) return;
        for (var tries = 0; tries < 12; tries++) {
            var idx = 20 + Math.floor(Math.random() * (N - 40)); // never on the start line
            var h = wpHeading(idx);
            var lat = (Math.random() * 2 - 1) * (TRACK_HALF - 13);
            var x = WP[idx][0] + Math.cos(h + Math.PI / 2) * lat;
            var y = WP[idx][1] + Math.sin(h + Math.PI / 2) * lat;
            var ok = true, i, dx, dy;
            for (i = 0; i < hazards.length && ok; i++) {
                dx = x - hazards[i].x; dy = y - hazards[i].y;
                if (dx * dx + dy * dy < 70 * 70) ok = false;
            }
            for (i = 0; i < cars.length && ok; i++) {
                dx = x - cars[i].x; dy = y - cars[i].y;
                if (dx * dx + dy * dy < 60 * 60) ok = false;
            }
            if (!ok) continue;
            hazards.push({
                x: x, y: y, r: 11 + Math.random() * 4,
                type: Math.random() < 0.5 ? "oil" : "mud",
                age: 0, ttl: 16 + Math.random() * 6, seed: Math.random() * 7
            });
            return;
        }
    }

    function updateHazards(dt) {
        hazardTimer -= dt;
        if (hazardTimer <= 0) {
            spawnHazard();
            hazardTimer = 6 + Math.random() * 6;
        }
        for (var i = hazards.length - 1; i >= 0; i--) {
            hazards[i].age += dt;
            if (hazards[i].age >= hazards[i].ttl) hazards.splice(i, 1);
        }
        for (var j = marks.length - 1; j >= 0; j--) {
            marks[j].ttl -= dt;
            if (marks[j].ttl <= 0) marks.splice(j, 1);
        }
    }

    function dropMark(c, type) {
        if (marks.length > 400) marks.shift();
        var bx = c.x - Math.cos(c.heading) * 9.5;
        var by = c.y - Math.sin(c.heading) * 9.5;
        var px = Math.cos(c.heading + Math.PI / 2) * 6.8;
        var py = Math.sin(c.heading + Math.PI / 2) * 6.8;
        marks.push({ x: bx + px, y: by + py, type: type, ttl: 6 });
        marks.push({ x: bx - px, y: by - py, type: type, ttl: 6 });
    }

    /* ---------- Race state ---------- */
    var state = "idle";      // idle | countdown | race | paused | finished
    var countdownT = 0;
    var raceTime = 0;
    var lastFrame = 0;
    var sessionBest = null;

    function fmt(ms) {
        if (ms == null) return "—";
        var t = Math.max(0, ms);
        var m = Math.floor(t / 60000);
        var s = Math.floor(t / 1000) % 60;
        var d = Math.floor((t % 1000) / 100);
        return m + ":" + (s < 10 ? "0" : "") + s + "." + d;
    }

    var record = null;
    try { record = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { /* private mode */ }
    statRecord.textContent = fmt(record);

    function startRace() {
        cars = [
            makeCar("#f2f2f2", "#e10600", false, 0.88, -14),
            makeCar("#ffd200", "#101014", false, 0.93, 14),
            makeCar("#00c2ff", "#f2f2f2", false, 0.97, -14),
            (player = makeCar("#e10600", "#f5f5f5", true, 1, 14))
        ];
        // 2x2 grid behind the start line
        for (var i = 0; i < cars.length; i++) {
            var c = cars[i];
            var back = (Math.floor(i / 2) + 1) * 7 + 4;
            var idx = (N - back + N) % N;
            var h = wpHeading(idx);
            var side = (i % 2 === 0 ? -1 : 1) * 15;
            c.x = WP[idx][0] + Math.cos(h + Math.PI / 2) * side;
            c.y = WP[idx][1] + Math.sin(h + Math.PI / 2) * side;
            c.heading = h;
            c.wpIdx = idx;
            c.prevIdx = idx;
            c.lap = -1; // becomes 0 when crossing the line at lights-out
        }
        raceTime = 0;
        hazards = [];
        marks = [];
        hazardTimer = 5;
        countdownT = 3.6;
        state = "countdown";
        overlay.classList.add("hidden");
        hud.classList.add("on");
        statLast.textContent = "—";
        keys = {};
    }

    function togglePause() {
        if (state === "race") { state = "paused"; }
        else if (state === "paused") { state = "race"; lastFrame = performance.now(); }
    }

    function showOverlay(kicker, title, msg, btn) {
        overlayKicker.textContent = kicker;
        overlayTitle.textContent = title;
        overlayMsg.innerHTML = msg;
        startBtn.textContent = btn;
        overlay.classList.remove("hidden");
    }

    startBtn.addEventListener("click", startRace);

    /* ---------- Physics ---------- */
    var MAX_SPEED = 250, ACCEL = 210, BRAKE = 430, DRAG = ACCEL / MAX_SPEED;
    var GRASS_SPEED = 95;

    function stepCar(c, dt) {
        var throttle, steer;
        if (c.isPlayer && !DEMO && !c.finished) {
            throttle = (keys["arrowup"] || keys["w"] || touchActive) ? 1 : 0;
            var brake = (keys["arrowdown"] || keys["s"]) ? 1 : 0;
            steer = (keys["arrowleft"] || keys["a"] ? -1 : 0) + (keys["arrowright"] || keys["d"] ? 1 : 0) + touchSteer;
            steer = Math.max(-1, Math.min(1, steer));
            c.speed += (throttle * ACCEL - brake * BRAKE - DRAG * c.speed) * dt;
        } else {
            // CPU: aim at a waypoint ahead, slow down for curvature ahead
            var look = 8 + Math.floor(c.speed / 28);
            var ti = (c.wpIdx + look) % N;
            var h = wpHeading(ti);
            var tx = WP[ti][0] + Math.cos(h + Math.PI / 2) * c.laneOffset;
            var ty = WP[ti][1] + Math.sin(h + Math.PI / 2) * c.laneOffset;
            var want = Math.atan2(ty - c.y, tx - c.x);
            var diff = Math.atan2(Math.sin(want - c.heading), Math.cos(want - c.heading));
            steer = Math.max(-1, Math.min(1, diff * 3.2));

            var curvAhead = 0;
            for (var o = 4; o <= 26; o += 4) curvAhead = Math.max(curvAhead, CURV[(c.wpIdx + o) % N]);
            var target = MAX_SPEED * c.skill * (1 - Math.min(0.62, curvAhead * 1.05));
            if (c.finished) target = Math.min(target, 120);
            c.speed += ((c.speed < target ? ACCEL : -BRAKE * 0.55) - DRAG * c.speed * 0.2) * dt;
        }

        if (c.speed < 0) c.speed = 0;

        var near = nearestWp(c);
        var onGrass = near.dist > TRACK_HALF + 2;
        if (onGrass && c.speed > GRASS_SPEED) {
            c.speed += (GRASS_SPEED - c.speed) * Math.min(1, dt * 4);
        }

        // hazards: oil makes you slide, mud bogs you down
        c.slip = Math.max(0, c.slip - dt);
        var inMud = false;
        for (var hz = 0; hz < hazards.length; hz++) {
            var hzd = hazards[hz];
            var hdx = c.x - hzd.x, hdy = c.y - hzd.y;
            var rr = hzd.r + 5;
            if (hdx * hdx + hdy * hdy > rr * rr) continue;
            if (hzd.type === "oil") c.slip = Math.max(c.slip, 0.55);
            else inMud = true;
        }
        if (inMud) {
            if (c.speed > 85) c.speed += (85 - c.speed) * Math.min(1, dt * 5);
            if (c.speed > 40) dropMark(c, "mud");
        }
        if (c.slip > 0 && c.speed > 50) dropMark(c, "skid");

        var grip = Math.min(1, c.speed / 60);
        var control = c.slip > 0 ? 0.12 : 1;
        c.heading += steer * 3.0 * grip * control * dt;
        if (c.slip > 0) c.heading += (Math.random() - 0.5) * 3.2 * dt;
        c.x += Math.cos(c.heading) * c.speed * dt;
        c.y += Math.sin(c.heading) * c.speed * dt;
        c.x = Math.max(8, Math.min(W - 8, c.x));
        c.y = Math.max(8, Math.min(H - 8, c.y));

        // lap counting
        c.prevIdx = c.wpIdx;
        c.wpIdx = near.idx;
        if (c.prevIdx > N * 0.8 && c.wpIdx < N * 0.2) {
            c.lap++;
            if (c.isPlayer && c.lap > 0) {
                var lapMs = raceTime - c.lapStart;
                c.lastLap = lapMs;
                if (c.bestLap == null || lapMs < c.bestLap) c.bestLap = lapMs;
                statLast.textContent = fmt(lapMs);
                if (sessionBest == null || lapMs < sessionBest) {
                    sessionBest = lapMs;
                    statBest.textContent = fmt(sessionBest);
                }
                if (record == null || lapMs < record) {
                    record = lapMs;
                    statRecord.textContent = fmt(record);
                    try { localStorage.setItem(STORE_KEY, JSON.stringify(record)); } catch (e) { /* ignore */ }
                }
            }
            if (c.isPlayer) c.lapStart = raceTime;
            if (c.lap >= LAPS && !c.finished) {
                c.finished = true;
                c.finishTime = raceTime;
            }
        } else if (c.prevIdx < N * 0.2 && c.wpIdx > N * 0.8) {
            c.lap--; // went backwards over the line
        }
    }

    function collide() {
        for (var i = 0; i < cars.length; i++) {
            for (var j = i + 1; j < cars.length; j++) {
                var a = cars[i], b = cars[j];
                var dx = b.x - a.x, dy = b.y - a.y;
                var d2 = dx * dx + dy * dy, min = 19;
                if (d2 > min * min || d2 === 0) continue;
                var d = Math.sqrt(d2), push = (min - d) / 2;
                dx /= d; dy /= d;
                a.x -= dx * push; a.y -= dy * push;
                b.x += dx * push; b.y += dy * push;
                a.speed *= 0.86; b.speed *= 0.86;
            }
        }
    }

    function progressOf(c) { return c.lap * N + c.wpIdx; }

    function playerPosition() {
        var p = 1;
        for (var i = 0; i < cars.length; i++) {
            if (cars[i] === player) continue;
            var other = cars[i].finished ? cars[i].lap * N + N : progressOf(cars[i]);
            var mine = player.finished ? player.lap * N + N : progressOf(player);
            if (other > mine) p++;
        }
        return p;
    }

    /* ---------- Drawing ---------- */
    function poly(points) {
        ctx.beginPath();
        ctx.moveTo(points[0], points[1]);
        for (var i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
        ctx.closePath();
        ctx.fill();
    }

    function drawCar(c) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.heading);

        // soft shadow
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(-0.5, 0.8, 15, 7.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // tyres
        ctx.fillStyle = "#0b0b0d";
        ctx.fillRect(6.2, -8.3, 4.6, 3.2);    // front L
        ctx.fillRect(6.2, 5.1, 4.6, 3.2);     // front R
        ctx.fillRect(-12.4, -8.7, 5.4, 3.6);  // rear L
        ctx.fillRect(-12.4, 5.1, 5.4, 3.6);   // rear R
        ctx.fillStyle = "#41414b";            // hubs
        ctx.fillRect(7.7, -7.4, 1.6, 1.4);
        ctx.fillRect(7.7, 6.0, 1.6, 1.4);
        ctx.fillRect(-10.6, -7.6, 1.8, 1.4);
        ctx.fillRect(-10.6, 6.2, 1.8, 1.4);

        // front wing with colored endplates
        ctx.fillStyle = c.dark;
        ctx.fillRect(12.4, -7.2, 2.6, 14.4);
        ctx.fillStyle = c.color;
        ctx.fillRect(12.4, -7.2, 2.6, 1.7);
        ctx.fillRect(12.4, 5.5, 2.6, 1.7);

        // rear wing, colored leading edge
        ctx.fillStyle = "#101014";
        ctx.fillRect(-15, -6.4, 3.4, 12.8);
        ctx.fillStyle = c.color;
        ctx.fillRect(-15, -6.4, 1.2, 12.8);

        // floor / lower body (darker tone)
        ctx.fillStyle = c.dark;
        poly([15, 0, 9, -2.4, 5, -2.8, 2.5, -5.6, -5, -6, -9.5, -4.2, -13, -3.4,
              -13, 3.4, -9.5, 4.2, -5, 6, 2.5, 5.6, 5, 2.8, 9, 2.4]);

        // upper body (main livery)
        ctx.fillStyle = c.color;
        poly([15, 0, 9, -1.6, 4, -2, 1.5, -4.2, -5, -4.6, -10, -2.7, -12.6, -2.2,
              -12.6, 2.2, -10, 2.7, -5, 4.6, 1.5, 4.2, 4, 2, 9, 1.6]);

        // nose highlight stripe
        ctx.fillStyle = c.lite;
        poly([15, 0, 8.5, -0.9, 8.5, 0.9]);

        // sidepod intakes
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(1.0, -5.0, 1.7, 2.2);
        ctx.fillRect(1.0, 2.8, 1.7, 2.2);

        // engine cover fin
        ctx.fillStyle = c.dark;
        ctx.fillRect(-9.5, -0.55, 5.5, 1.1);

        // cockpit + halo + helmet
        ctx.fillStyle = "#0d0d11";
        ctx.beginPath();
        ctx.ellipse(1.6, 0, 3.3, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c.helmet;
        ctx.beginPath();
        ctx.arc(0.9, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#34343e";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0.9, 0, 2.6, -1.1, 1.1);
        ctx.stroke();

        ctx.restore();
    }

    function drawCountdown() {
        var n = Math.ceil(countdownT - 0.6);
        var label = n >= 1 ? String(n) : "GO!";
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "italic 900 72px 'Titillium Web', sans-serif";
        ctx.fillStyle = n >= 1 ? "#f2f2f2" : "#ff2d23";
        ctx.shadowColor = "rgba(225,6,0,0.8)";
        ctx.shadowBlur = 24;
        ctx.fillText(label, W / 2, H / 2);
        ctx.restore();
    }

    function drawHazard(h) {
        var a = Math.min(1, h.age * 2, (h.ttl - h.age) / 2.5);
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.seed);
        if (h.type === "oil") {
            ctx.globalAlpha = a * 0.85;
            ctx.fillStyle = "#07070b";
            ctx.beginPath();
            ctx.ellipse(0, 0, h.r, h.r * 0.7, 0, 0, Math.PI * 2);
            ctx.ellipse(h.r * 0.5, h.r * 0.3, h.r * 0.55, h.r * 0.4, 0.6, 0, Math.PI * 2);
            ctx.ellipse(-h.r * 0.45, -h.r * 0.25, h.r * 0.5, h.r * 0.35, -0.4, 0, Math.PI * 2);
            ctx.fill();
            // iridescent sheen
            ctx.globalAlpha = a * 0.3;
            ctx.strokeStyle = "#7d8fc9";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(-1, -1, h.r * 0.55, h.r * 0.35, 0.5, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.globalAlpha = a * 0.9;
            ctx.fillStyle = "#4a3520";
            ctx.beginPath();
            ctx.ellipse(0, 0, h.r, h.r * 0.75, 0, 0, Math.PI * 2);
            ctx.ellipse(h.r * 0.45, -h.r * 0.2, h.r * 0.5, h.r * 0.4, 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#362615";
            ctx.beginPath();
            ctx.ellipse(-h.r * 0.2, h.r * 0.15, h.r * 0.45, h.r * 0.3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // splatter dots
            ctx.fillStyle = "#4a3520";
            for (var s = 0; s < 5; s++) {
                var sa = h.seed * 3 + s * 1.26;
                ctx.fillRect(Math.cos(sa) * (h.r + 4), Math.sin(sa) * (h.r * 0.8 + 3), 2, 2);
            }
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function draw() {
        ctx.drawImage(trackLayer, 0, 0);
        var i;
        for (i = 0; i < marks.length; i++) {
            var mk = marks[i];
            ctx.fillStyle = mk.type === "mud" ? "rgba(74,53,32,0.55)" : "rgba(12,12,16,0.5)";
            ctx.globalAlpha = Math.min(1, mk.ttl / 3);
            ctx.fillRect(mk.x - 1, mk.y - 1, 2.4, 2.4);
        }
        ctx.globalAlpha = 1;
        for (i = 0; i < hazards.length; i++) drawHazard(hazards[i]);
        for (i = 0; i < cars.length; i++) drawCar(cars[i]);
        if (state === "countdown") drawCountdown();
        if (state === "paused") {
            ctx.fillStyle = "rgba(5,5,7,0.55)";
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = "center";
            ctx.font = "italic 900 40px 'Titillium Web', sans-serif";
            ctx.fillStyle = "#f2f2f2";
            ctx.fillText("PAUSA", W / 2, H / 2);
        }
    }

    /* ---------- Main loop ---------- */
    function update(dt) {
        if (state === "countdown") {
            countdownT -= dt;
            if (countdownT <= 0.6) {
                // lights out: let everyone go (countdown shows GO! briefly)
                for (var i = 0; i < cars.length; i++) stepCar(cars[i], dt);
                collide();
                raceTime += dt * 1000;
            }
            if (countdownT <= 0) state = "race";
        } else if (state === "race") {
            raceTime += dt * 1000;
            updateHazards(dt);
            for (var j = 0; j < cars.length; j++) stepCar(cars[j], dt);
            collide();
        }
    }

    function frame(now) {
        // substep so physics stays stable and race time tracks the wall
        // clock even when rendering can't hold 60fps
        var elapsed = Math.min(0.25, (now - lastFrame) / 1000 || 0);
        lastFrame = now;
        while (elapsed > 0 && (state === "countdown" || state === "race")) {
            var dt = Math.min(0.02, elapsed);
            elapsed -= dt;
            update(dt);
        }

        if (state === "race" || state === "finished") {
            hudLap.textContent = "LAP " + Math.min(LAPS, Math.max(1, player.lap + 1)) + "/" + LAPS;
            hudPos.textContent = "POS " + playerPosition() + "/" + cars.length;
            hudTime.textContent = fmt(raceTime);
        }

        if (state === "race") {
            if (player.finished) {
                state = "finished";
                var pos = playerPosition();
                var podium = ["🏆 VITTORIA!", "P2 — quasi!", "P3 — podio!", "P4 — ai box!"][pos - 1];
                showOverlay(
                    "BANDIERA A SCACCHI",
                    podium,
                    "Gara: <strong>" + fmt(player.finishTime) + "</strong><br />Giro veloce: <strong>" + fmt(player.bestLap) + "</strong>",
                    "↻ RIPROVA"
                );
                hud.classList.remove("on");
            }
        }

        draw();
        requestAnimationFrame(frame);
    }

    draw();
    requestAnimationFrame(frame);
})();

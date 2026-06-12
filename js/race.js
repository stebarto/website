/* STEBARTO GP — DrawRace-style, up to 4 local players:
   each player draws their line, then races managing only their turbo */
(function () {
    "use strict";

    var canvas = document.getElementById("race-canvas");
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    var stage = document.querySelector(".game-stage");

    var overlay = document.getElementById("game-overlay");
    var overlayKicker = document.getElementById("overlay-kicker");
    var overlayTitle = document.getElementById("overlay-title");
    var overlayMsg = document.getElementById("overlay-msg");
    var startBtn = document.getElementById("start-btn");
    var playerSelect = document.getElementById("player-select");
    var hud = document.getElementById("hud");
    var hudLap = document.getElementById("hud-lap");
    var hudPos = document.getElementById("hud-pos");
    var hudTime = document.getElementById("hud-time");
    var statLast = document.getElementById("stat-last");
    var statBest = document.getElementById("stat-best");
    var statRecord = document.getElementById("stat-record");
    var maxiExit = document.getElementById("maxi-exit");

    var LAPS = 3;
    var TRACK_HALF = 32;
    var STORE_KEY = "stebarto-gp-best-lap-v2";
    var DEMO = /[?&]demo=1/.test(location.search); // attract mode: auto line + auto turbo

    /* ---------- Track: Catmull-Rom through control points ---------- */
    var CONTROL = [
        [100, 95], [320, 58], [530, 95],      // top straight
        [598, 185], [550, 270], [596, 360],   // right esses
        [490, 432], [385, 360], [292, 428],   // bottom chicane
        [175, 438], [85, 380],                // bottom-left corner
        [150, 295], [260, 262],               // inner hook
        [215, 175], [80, 168]                 // hairpin back to the left edge
    ];

    var WP, N, CURV;
    var trackLayer = document.createElement("canvas");

    function wpHeading(i) {
        var a = WP[i % N], b = WP[(i + 1) % N];
        return Math.atan2(b[1] - a[1], b[0] - a[0]);
    }

    // rebuild the whole world geometry for a given canvas width: the
    // control points stretch horizontally so the track fills the screen
    function rebuildWorld(width) {
        W = Math.round(width);
        H = 480;
        canvas.width = W;
        canvas.height = H;
        var sx = W / 640;

        WP = [];
        var n = CONTROL.length, perSeg = 22;
        for (var i = 0; i < n; i++) {
            var p0 = CONTROL[(i - 1 + n) % n], p1 = CONTROL[i];
            var p2 = CONTROL[(i + 1) % n], p3 = CONTROL[(i + 2) % n];
            for (var j = 0; j < perSeg; j++) {
                var t = j / perSeg, t2 = t * t, t3 = t2 * t;
                WP.push([
                    sx * 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                    0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
                ]);
            }
        }
        // rotate so WP[0] (start/finish, grid, lap counting) sits mid main straight
        WP = WP.slice(28).concat(WP.slice(0, 28));
        N = WP.length;

        // curvature per waypoint (heading change over a small window), for CPU corner speed
        CURV = [];
        for (i = 0; i < N; i++) {
            var h1 = wpHeading((i + N - 4) % N), h2 = wpHeading((i + 4) % N);
            CURV.push(Math.abs(Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1))));
        }

        trackLayer.width = W;
        trackLayer.height = H;
        paintTrack(sx);
    }

    /* ---------- Pre-rendered track layer ---------- */
    function paintTrack(sx) {
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

        function grandstand(idx, len, off, depth, flip) {
            var p = place(idx, off);
            t.save();
            t.translate(p.x, p.y);
            t.rotate(p.ang + (flip ? Math.PI : 0));
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

        // stands: finish line + infield facing the right esses
        grandstand(0, 120, TRACK_HALF + 10, 15, false);
        grandstand(60, 84, -(TRACK_HALF + 8), 13, true);
        // red/white hoardings on the fast corners
        hoarding(38, 56, TRACK_HALF + 12);
        hoarding(104, 146, TRACK_HALF + 12);
        hoarding(214, 236, TRACK_HALF + 12);
        // sponsors painted on the infield grass
        grassText(420 * sx, 218, -0.05, "STEBARTO", 20, 0.28);
        grassText(420 * sx, 242, -0.05, "GP 2026", 11, 0.22);
        grassText(420 * sx, 264, -0.05, "ROBOTTINO RACING", 8, 0.2);
        grassText(336 * sx, 318, 0.25, "CAFFÈ 312", 9, 0.2);

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
    }

    rebuildWorld(640);

    /* ---------- Cars ---------- */
    function shade(hex, f) {
        var n = parseInt(hex.slice(1), 16);
        var r = Math.min(255, Math.round(((n >> 16) & 255) * f));
        var g = Math.min(255, Math.round(((n >> 8) & 255) * f));
        var b = Math.min(255, Math.round((n & 255) * f));
        return "rgb(" + r + "," + g + "," + b + ")";
    }

    var LIVERY = [
        { color: "#e10600", helmet: "#f5f5f5", name: "GIOCATORE 1" },
        { color: "#00c2ff", helmet: "#101014", name: "GIOCATORE 2" },
        { color: "#ffd200", helmet: "#e10600", name: "GIOCATORE 3" },
        { color: "#7dd87d", helmet: "#f5f5f5", name: "GIOCATORE 4" }
    ];
    var CPU_LIVERY = [
        { color: "#f2f2f2", helmet: "#e10600", name: "CPU" },
        { color: "#c879ff", helmet: "#101014", name: "CPU" },
        { color: "#ff8c42", helmet: "#f5f5f5", name: "CPU" }
    ];

    function makeCar(liv, isPlayer, skill, laneOffset) {
        return {
            color: liv.color, dark: shade(liv.color, 0.55), lite: shade(liv.color, 1.6),
            helmet: liv.helmet, name: liv.name,
            isPlayer: isPlayer, skill: skill, laneOffset: laneOffset,
            x: 0, y: 0, heading: 0, speed: 0, slip: 0,
            wpIdx: 0, lap: 0, prevIdx: 0,
            lapStart: 0, lastLap: null, bestLap: null,
            finished: false, finishTime: 0, finalPos: 0,
            path: null, dist: 0, lineOff: 0, off: 0, turbo: 0, boost: 0
        };
    }

    var cars = [], humans = [];
    var humansN = 1;

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

    // shared hazard reaction: returns true while in mud
    function applyHazards(c, dt) {
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
        return inMud;
    }

    /* ---------- Player lines (DrawRace) ---------- */
    var VMAX = 250, ACCEL = 200, BRAKE = 360, LATG = 330;
    var GRASS_SPEED = 92;
    var PATH_STEP = 4;

    var drawing = false;
    var rawLine = [];
    var currentDrawer = 0;
    var flashMsg = "", flashT = 0;

    function flash(msg) { flashMsg = msg; flashT = 1.6; }

    function buildPath(raw) {
        if (raw.length < 8) return null;
        var pts = raw.map(function (p) { return [p[0], p[1]]; });
        // close the loop back to the first point
        pts.push([pts[0][0], pts[0][1]]);
        // light smoothing, two passes (finger jitter)
        for (var pass = 0; pass < 2; pass++) {
            var sm = [pts[0]];
            for (var i = 1; i < pts.length - 1; i++) {
                sm.push([
                    (pts[i - 1][0] + pts[i][0] + pts[i + 1][0]) / 3,
                    (pts[i - 1][1] + pts[i][1] + pts[i + 1][1]) / 3
                ]);
            }
            sm.push(pts[pts.length - 1]);
            pts = sm;
        }
        // resample into a perfectly uniform closed loop (an uneven seam at
        // the closure point caused a visible glitch every finish-line pass)
        var cum = [0];
        for (i = 1; i < pts.length; i++) {
            cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        }
        var total = cum[cum.length - 1];
        if (total < 200) return null;
        var M = Math.max(40, Math.round(total / PATH_STEP));
        var step = total / M;
        var X = [], Y = [], j = 1;
        for (var si = 0; si < M; si++) {
            var s = si * step;
            while (cum[j] < s) j++;
            var seg = cum[j] - cum[j - 1] || 1;
            var t = (s - cum[j - 1]) / seg;
            X.push(pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * t);
            Y.push(pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * t);
        }
        var TX = [], TY = [], K = [];
        for (i = 0; i < M; i++) {
            var ax = X[(i + 1) % M] - X[(i - 1 + M) % M];
            var ay = Y[(i + 1) % M] - Y[(i - 1 + M) % M];
            var l = Math.hypot(ax, ay) || 1;
            TX.push(ax / l); TY.push(ay / l);
        }
        for (i = 0; i < M; i++) {
            var bx = TX[(i + 1) % M], by = TY[(i + 1) % M];
            var cross = TX[i] * by - TY[i] * bx;
            var dot = TX[i] * bx + TY[i] * by;
            K.push(Math.atan2(cross, Math.max(-1, Math.min(1, dot))) / step); // signed rad/px
        }
        // smoothed signed curvature: the raw sign flips noisily on straights,
        // which made the understeer offset jump side to side (car glitches)
        var SK = [];
        for (i = 0; i < M; i++) {
            var acc = 0;
            for (var w = -4; w <= 4; w++) acc += K[(i + w + M) % M];
            SK.push(acc / 9);
        }
        // corner-safe speed, then anticipatory braking (two wrap passes)
        var SAFE = [];
        for (i = 0; i < M; i++) {
            var k = Math.abs(SK[i]);
            SAFE.push(Math.min(VMAX, Math.sqrt(LATG / Math.max(k, 0.0008))));
        }
        for (var p2 = 0; p2 < 2; p2++) {
            for (i = M - 1; i >= 0; i--) {
                var nx = SAFE[(i + 1) % M];
                SAFE[i] = Math.min(SAFE[i], Math.sqrt(nx * nx + 2 * BRAKE * step));
            }
        }
        return { x: X, y: Y, tx: TX, ty: TY, scurv: SK, safe: SAFE, M: M, step: step, len: total };
    }

    // validate that the line goes around the circuit in race direction
    function validatePath(p) {
        var idx = 0, forward = 0;
        var bestD = Infinity;
        for (var i = 0; i < N; i++) {
            var dx = p.x[0] - WP[i][0], dy = p.y[0] - WP[i][1];
            var d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; idx = i; }
        }
        for (var s = 1; s < p.M; s++) {
            var best = idx, bd = Infinity;
            for (var o = -14; o <= 14; o++) {
                var w = (idx + o + N) % N;
                var ddx = p.x[s] - WP[w][0], ddy = p.y[s] - WP[w][1];
                var dd = ddx * ddx + ddy * ddy;
                if (dd < bd) { bd = dd; best = w; }
            }
            var delta = best - idx;
            if (delta > N / 2) delta -= N;
            if (delta < -N / 2) delta += N;
            forward += delta;
            idx = best;
        }
        if (forward < 0.8 * N && forward > -0.8 * N) return "incomplete";
        if (forward < 0) return "wrong-way";
        return "ok";
    }

    function autoPath() {
        var raw = WP.map(function (p) { return [p[0], p[1]]; });
        return buildPath(raw);
    }

    /* ---------- Fullscreen / rotate ---------- */
    function enterMaxi() {
        stage.classList.add("maxi");
        document.documentElement.classList.add("gp-lock");
        if (stage.requestFullscreen) {
            stage.requestFullscreen({ navigationUI: "hide" }).catch(function () { /* fake fullscreen via CSS */ });
        }
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("landscape").catch(function () { /* hint shown instead */ });
        }
    }

    function exitMaxi() {
        stage.classList.remove("maxi");
        document.documentElement.classList.remove("gp-lock");
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(function () { /* ignore */ });
        }
    }

    if (maxiExit) maxiExit.addEventListener("click", exitMaxi);
    document.addEventListener("fullscreenchange", function () {
        if (!document.fullscreenElement) stage.classList.remove("maxi");
    });

    /* ---------- Turbo ---------- */
    function fireTurbo(i) {
        var c = humans[i];
        if (!c || state !== "race" || c.turbo < 1 || c.finished) return;
        c.boost = 1.9;
        c.turbo = 0;
    }

    // corner turbo buttons: P1 bottom-left, P2 bottom-right, P3 top-left, P4 top-right
    var cornerBtns = [];
    (function initCorners() {
        for (var i = 0; i < 4; i++) {
            var el = document.getElementById("turbo-p" + (i + 1));
            if (!el) continue;
            var rec = {
                el: el,
                fill: el.querySelector(".ct-fill"),
                info: el.querySelector(".ct-info"),
                pct: -1, ready: false, txt: ""
            };
            el.style.setProperty("--pc", LIVERY[i].color);
            el.style.borderColor = LIVERY[i].color;
            el.querySelector(".ct-name").style.color = LIVERY[i].color;
            (function (idx) {
                el.addEventListener("pointerdown", function (e) {
                    e.preventDefault();
                    fireTurbo(idx);
                });
            })(i);
            cornerBtns.push(rec);
        }
    })();

    function updateCorners() {
        for (var i = 0; i < cornerBtns.length; i++) {
            var b = cornerBtns[i];
            var c = humans[i];
            var show = !!c && (state === "race" || state === "countdown" || state === "paused");
            b.el.classList.toggle("show", show);
            if (!show) continue;
            var pct = Math.round((c.boost > 0 ? 1 : c.turbo) * 100);
            if (pct !== b.pct) {
                b.pct = pct;
                b.fill.style.height = pct + "%"; // fills bottom-up inside the round button
            }
            var ready = c.turbo >= 1 && c.boost <= 0 && state === "race" && !c.finished;
            if (ready !== b.ready) {
                b.ready = ready;
                b.el.classList.toggle("ready", ready);
            }
            var txt = c.finished
                ? (c.finalPos + "°  🏁")
                : (ready
                    ? "⚡ PRONTO!"
                    : ("L" + Math.min(LAPS, Math.max(1, c.lap + 1)) + "/" + LAPS + " · " + racePos(c) + "°"));
            if (txt !== b.txt) {
                b.txt = txt;
                b.info.textContent = txt;
            }
        }
    }

    /* ---------- Input ---------- */
    document.addEventListener("keydown", function (e) {
        var k = e.key.toLowerCase();
        if ((state === "race" || state === "draw") && (k === " " || k === "enter")) e.preventDefault();
        if (k === " " || k === "t") fireTurbo(0);
        if (k === "enter" && state === "race") fireTurbo(1);
        if (k === "a" && state === "draw") useAutoLine();
        if (k === "p" && (state === "race" || state === "paused")) togglePause();
        if (k === "r" && state !== "idle") restartDrawing();
    });

    function canvasPos(e) {
        var r = canvas.getBoundingClientRect();
        return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
    }

    canvas.addEventListener("pointerdown", function (e) {
        if (state === "race" && humansN === 1) { fireTurbo(0); return; }
        if (state !== "draw") return;
        e.preventDefault();
        var p = canvasPos(e);
        var dx = p[0] - WP[0][0], dy = p[1] - WP[0][1];
        if (Math.hypot(dx, dy) > 60) {
            flash("PARTI DAL TRAGUARDO!");
            return;
        }
        drawing = true;
        rawLine = [p];
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    canvas.addEventListener("pointermove", function (e) {
        if (!drawing) return;
        var p = canvasPos(e);
        var last = rawLine[rawLine.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 3) rawLine.push(p);
    });
    function endDraw() {
        if (!drawing) return;
        drawing = false;
        var built = buildPath(rawLine);
        if (!built) { flash("LINEA TROPPO CORTA — RIDISEGNA"); rawLine = []; return; }
        var last = rawLine[rawLine.length - 1];
        if (Math.hypot(last[0] - rawLine[0][0], last[1] - rawLine[0][1]) > 90) {
            flash("CHIUDI IL GIRO FINO AL TRAGUARDO");
            rawLine = [];
            return;
        }
        var verdict = validatePath(built);
        if (verdict === "incomplete") { flash("GIRO INCOMPLETO — RIDISEGNA"); rawLine = []; return; }
        if (verdict === "wrong-way") { flash("VERSO SBAGLIATO — RIDISEGNA"); rawLine = []; return; }
        lineDone(built);
    }
    canvas.addEventListener("pointerup", endDraw);
    canvas.addEventListener("pointercancel", endDraw);

    // long-press on the stage must not open the context menu / select the canvas
    stage.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    /* ---------- Race state ---------- */
    var state = "idle";      // idle | announce | draw | countdown | race | paused | finished
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

    function buildCars(n) {
        humansN = n;
        cars = [];
        humans = [];
        var i;
        for (i = 0; i < n; i++) {
            var hcar = makeCar(LIVERY[i], true, 1, 0);
            humans.push(hcar);
            cars.push(hcar);
        }
        for (i = 0; i < 4 - n; i++) {
            cars.push(makeCar(CPU_LIVERY[i], false, [0.88, 0.93, 0.97][i], (i % 2 === 0 ? -1 : 1) * 13));
        }
        placeGrid();
    }

    function placeGrid() {
        for (var i = 0; i < cars.length; i++) {
            var c = cars[i];
            var back = (Math.floor(i / 2) + 1) * 7 + 4;
            var idx = (N - back + N) % N;
            var h = wpHeading(idx);
            var side = (i % 2 === 0 ? -1 : 1) * 14;
            c.x = WP[idx][0] + Math.cos(h + Math.PI / 2) * side;
            c.y = WP[idx][1] + Math.sin(h + Math.PI / 2) * side;
            c.heading = h;
            c.wpIdx = idx;
            c.prevIdx = idx;
            c.lap = -1; // becomes 0 when crossing the line at lights-out
            c.speed = 0;
            c.dist = 0;
            c.lineOff = 0;
            c.off = 0;
            c.turbo = 0.6;
            c.boost = 0;
            c.finished = false;
            c.lastLap = null;
            c.bestLap = null;
        }
    }

    function setOverlayMode(mode) { // "select" | "action" | "results"
        playerSelect.style.display = mode === "action" ? "none" : "flex";
        startBtn.style.display = mode === "select" ? "none" : "inline-flex";
    }

    function startGame(n) {
        // stretch the circuit to the device's landscape aspect ratio
        var landW = Math.max(window.innerWidth, window.innerHeight);
        var landH = Math.min(window.innerWidth, window.innerHeight) || 1;
        var aspect = Math.min(2.1, Math.max(4 / 3, landW / landH));
        rebuildWorld(480 * aspect);
        buildCars(n);
        hazards = [];
        marks = [];
        raceTime = 0;
        statLast.textContent = "—";
        enterMaxi();
        if (DEMO) {
            humans[0].path = autoPath();
            startCountdown();
            return;
        }
        announce(0);
    }

    function announce(i) {
        currentDrawer = i;
        state = "announce";
        overlayTitle.style.color = LIVERY[i].color;
        showOverlay(
            "FASE DI DISEGNO " + (i + 1) + "/" + humansN,
            humans[i].name,
            "Disegna la tua traiettoria col dito:<br />parti dal cerchio sul traguardo e chiudi il giro.",
            "✏ DISEGNA"
        );
        setOverlayMode("action");
    }

    function beginDraw() {
        state = "draw";
        rawLine = [];
        drawing = false;
        overlay.classList.add("hidden");
    }

    function lineDone(built) {
        humans[currentDrawer].path = built;
        rawLine = [];
        if (currentDrawer < humansN - 1) {
            announce(currentDrawer + 1);
        } else {
            startCountdown();
        }
    }

    function useAutoLine() {
        lineDone(autoPath());
    }

    function restartDrawing() {
        placeGrid();
        hazards = [];
        marks = [];
        raceTime = 0;
        for (var i = 0; i < humans.length; i++) humans[i].path = null;
        hud.classList.remove("on");
        announce(0);
    }

    function startCountdown() {
        overlay.classList.add("hidden");
        // snap every player onto the start of their line
        for (var i = 0; i < humans.length; i++) {
            var c = humans[i];
            c.x = c.path.x[0];
            c.y = c.path.y[0];
            c.heading = Math.atan2(c.path.ty[0], c.path.tx[0]);
            c.dist = 0;
            var near = nearestWp(c);
            c.wpIdx = near.idx;
            c.prevIdx = near.idx;
        }
        hazardTimer = 5;
        countdownT = 3.6;
        raceTime = 0;
        state = "countdown";
        hud.classList.add("on");
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

    startBtn.addEventListener("click", function () {
        if (state === "announce") beginDraw();
        else if (state === "finished") restartDrawing();
    });

    if (playerSelect) {
        playerSelect.addEventListener("click", function (e) {
            var btn = e.target.closest("[data-players]");
            if (!btn) return;
            startGame(parseInt(btn.getAttribute("data-players"), 10));
        });
    }

    /* ---------- Lap counting (shared) ---------- */
    function updateProgress(c) {
        var near = nearestWp(c);
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
                if (humansN === 1 && (record == null || lapMs < record)) {
                    record = lapMs;
                    statRecord.textContent = fmt(record);
                    try { localStorage.setItem(STORE_KEY, JSON.stringify(record)); } catch (e) { /* ignore */ }
                }
            }
            if (c.isPlayer) c.lapStart = raceTime;
            if (c.lap >= LAPS && !c.finished) {
                c.finished = true;
                c.finishTime = raceTime;
                c.finalPos = racePos(c);
            }
        } else if (c.prevIdx < N * 0.2 && c.wpIdx > N * 0.8) {
            c.lap--; // went backwards over the line
        }
        return near;
    }

    function progressOf(c) { return c.lap * N + c.wpIdx; }

    function racePos(c) {
        var p = 1;
        var mine = c.finished ? c.lap * N + N + (1e7 - c.finishTime) : progressOf(c);
        for (var i = 0; i < cars.length; i++) {
            if (cars[i] === c) continue;
            var o = cars[i];
            var other = o.finished ? o.lap * N + N + (1e7 - o.finishTime) : progressOf(o);
            if (other > mine) p++;
        }
        return p;
    }

    /* ---------- Physics ---------- */
    function stepCpu(c, dt) {
        var look = 8 + Math.floor(c.speed / 28);
        var ti = (c.wpIdx + look) % N;
        var h = wpHeading(ti);
        var tx = WP[ti][0] + Math.cos(h + Math.PI / 2) * c.laneOffset;
        var ty = WP[ti][1] + Math.sin(h + Math.PI / 2) * c.laneOffset;
        var want = Math.atan2(ty - c.y, tx - c.x);
        var diff = Math.atan2(Math.sin(want - c.heading), Math.cos(want - c.heading));
        var steer = Math.max(-1, Math.min(1, diff * 3.2));

        var curvAhead = 0;
        for (var o = 4; o <= 26; o += 4) curvAhead = Math.max(curvAhead, CURV[(c.wpIdx + o) % N]);
        var target = VMAX * c.skill * (1 - Math.min(0.62, curvAhead * 1.05));
        if (c.finished) target = Math.min(target, 120);
        c.speed += ((c.speed < target ? ACCEL : -BRAKE * 0.55) - (ACCEL / VMAX) * c.speed * 0.2) * dt;
        if (c.speed < 0) c.speed = 0;

        var near = nearestWp(c);
        if (near.dist > TRACK_HALF + 2 && c.speed > GRASS_SPEED) {
            c.speed += (GRASS_SPEED - c.speed) * Math.min(1, dt * 4);
        }
        applyHazards(c, dt);

        var grip = Math.min(1, c.speed / 60);
        var control = c.slip > 0 ? 0.12 : 1;
        c.heading += steer * 3.0 * grip * control * dt;
        if (c.slip > 0) c.heading += (Math.random() - 0.5) * 3.2 * dt;
        c.x += Math.cos(c.heading) * c.speed * dt;
        c.y += Math.sin(c.heading) * c.speed * dt;
        c.x = Math.max(8, Math.min(W - 8, c.x));
        c.y = Math.max(8, Math.min(H - 8, c.y));

        updateProgress(c);
    }

    function stepHuman(c, dt) {
        var path = c.path;
        var M = path.M;
        var idx = Math.floor(c.dist / path.step) % M;

        // turbo charge / boost
        if (c.boost > 0) c.boost -= dt;
        else if (!c.finished) c.turbo = Math.min(1, c.turbo + dt / 6);
        if (DEMO && c === humans[0] && c.turbo >= 1) fireTurbo(0);

        var safe = path.safe[idx];
        var target = c.boost > 0 ? Math.min(VMAX * 1.45, safe * 1.4) : safe;
        if (c.finished) target = Math.min(target, 120);

        var inMud = applyHazards(c, dt);
        if (inMud) target = Math.min(target, 85);
        if (c.slip > 0) target = Math.min(target, safe * 0.85);

        var near = nearestWp(c);
        if (near.dist > TRACK_HALF + 2) target = Math.min(target, GRASS_SPEED);

        var acc = c.boost > 0 ? ACCEL * 1.6 : ACCEL;
        if (c.speed < target) c.speed = Math.min(target, c.speed + acc * dt);
        else c.speed = Math.max(target, c.speed - BRAKE * dt);

        c.dist += c.speed * dt;
        if (c.dist >= path.len) c.dist -= path.len;

        // base position on the drawn line
        idx = Math.floor(c.dist / path.step) % M;
        var frac = (c.dist - idx * path.step) / path.step;
        var nx = (idx + 1) % M;
        var bx = path.x[idx] + (path.x[nx] - path.x[idx]) * frac;
        var by = path.y[idx] + (path.y[nx] - path.y[idx]) * frac;
        var tx = path.tx[idx], ty = path.ty[idx];

        // understeer: too fast for the line (turbo!) pushes the car wide
        var excess = c.speed - safe * 1.05;
        if (excess > 0) c.lineOff = Math.min(26, c.lineOff + excess * 1.5 * dt);
        else c.lineOff = Math.max(0, c.lineOff - (c.lineOff * 3 + 6) * dt);
        if (c.slip > 0) c.lineOff = Math.min(26, c.lineOff + 40 * dt);

        // ease the lateral offset toward the outside of the (smoothed)
        // curve instead of snapping side to side
        var sk = path.scurv[idx];
        var side = Math.abs(sk) < 0.0015 ? 0 : (sk > 0 ? -1 : 1);
        c.off += (side * c.lineOff - c.off) * Math.min(1, dt * 6);

        c.x = bx + (-ty) * c.off;
        c.y = by + tx * c.off;
        c.heading = Math.atan2(ty, tx) + c.off * 0.012;

        updateProgress(c);
    }

    function collide() { // CPU cars jostle each other; players ghost through
        for (var i = 0; i < cars.length; i++) {
            for (var j = i + 1; j < cars.length; j++) {
                var a = cars[i], b = cars[j];
                if (a.isPlayer || b.isPlayer) continue;
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

        // turbo flame
        if (c.isPlayer && c.boost > 0) {
            var fl = 8 + Math.random() * 9;
            ctx.fillStyle = "rgba(255,160,40,0.85)";
            poly([-15, -2.5, -15 - fl, 0, -15, 2.5]);
            ctx.fillStyle = "rgba(255,235,140,0.9)";
            poly([-15, -1.2, -15 - fl * 0.55, 0, -15, 1.2]);
        }

        // soft shadow
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(-0.5, 0.8, 15, 7.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // tyres
        ctx.fillStyle = "#0b0b0d";
        ctx.fillRect(6.2, -8.3, 4.6, 3.2);
        ctx.fillRect(6.2, 5.1, 4.6, 3.2);
        ctx.fillRect(-12.4, -8.7, 5.4, 3.6);
        ctx.fillRect(-12.4, 5.1, 5.4, 3.6);
        ctx.fillStyle = "#41414b";
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
            ctx.fillStyle = "#4a3520";
            for (var s = 0; s < 5; s++) {
                var sa = h.seed * 3 + s * 1.26;
                ctx.fillRect(Math.cos(sa) * (h.r + 4), Math.sin(sa) * (h.r * 0.8 + 3), 2, 2);
            }
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    function drawRawLine(points, color) {
        if (points.length < 2) return;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (var i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.stroke();
        ctx.restore();
    }

    function drawPaths(alpha) {
        for (var i = 0; i < humans.length; i++) {
            var path = humans[i].path;
            if (!path) continue;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = humans[i].color;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(path.x[0], path.y[0]);
            for (var s = 1; s < path.M; s++) ctx.lineTo(path.x[s], path.y[s]);
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    function centerText(text, size, y, color) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "italic 900 " + size + "px 'Titillium Web', sans-serif";
        ctx.fillStyle = color || "#f2f2f2";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 8;
        ctx.fillText(text, W / 2, y);
        ctx.restore();
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

        if (state === "draw") {
            var col = LIVERY[currentDrawer].color;
            var pulse = 8 + Math.sin(performance.now() / 280) * 3;
            ctx.save();
            ctx.strokeStyle = col;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(WP[0][0], WP[0][1], pulse + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            drawRawLine(rawLine, col);
            centerText(humans[currentDrawer].name + " — DISEGNA", 22, H / 2 - 86, col);
            ctx.font = "700 11px 'Chakra Petch', monospace";
            ctx.textAlign = "center";
            ctx.fillStyle = "#c9c9d2";
            ctx.fillText("parti dal cerchio sul traguardo e chiudi il giro — A = linea automatica", W / 2, H / 2 - 62);
        } else {
            drawPaths(state === "race" || state === "paused" ? 0.16 : 0.32);
        }

        for (i = 0; i < cars.length; i++) drawCar(cars[i]);

        if (state === "countdown") {
            var n = Math.ceil(countdownT - 0.6);
            centerText(n >= 1 ? String(n) : "GO!", 72, H / 2, n >= 1 ? "#f2f2f2" : "#ff2d23");
        }
        if (state === "paused") {
            ctx.fillStyle = "rgba(5,5,7,0.55)";
            ctx.fillRect(0, 0, W, H);
            centerText("PAUSA", 40, H / 2);
        }
        if (flashT > 0) {
            ctx.globalAlpha = Math.min(1, flashT);
            centerText(flashMsg, 20, H / 2 + 70, "#ff2d23");
            ctx.globalAlpha = 1;
        }

        updateCorners();
    }

    /* ---------- Results ---------- */
    function allHumansFinished() {
        for (var i = 0; i < humans.length; i++) {
            if (!humans[i].finished) return false;
        }
        return true;
    }

    function showResults() {
        state = "finished";
        hud.classList.remove("on");
        var sorted = humans.slice().sort(function (a, b) { return a.finalPos - b.finalPos; });
        var medals = ["🥇", "🥈", "🥉", "🏁"];
        var lines = [];
        for (var i = 0; i < sorted.length; i++) {
            var c = sorted[i];
            lines.push(
                medals[Math.min(i, 3)] + " <strong style=\"color:" + c.color + "\">" + c.name + "</strong> — " +
                c.finalPos + "° · " + fmt(c.finishTime) + " · giro " + fmt(c.bestLap)
            );
        }
        overlayTitle.style.color = "";
        showOverlay("BANDIERA A SCACCHI", humansN === 1 ? (humans[0].finalPos === 1 ? "🏆 VITTORIA!" : humans[0].finalPos + "° POSTO") : "CLASSIFICA", lines.join("<br />"), "✏ NUOVA GARA");
        setOverlayMode("results");
    }

    /* ---------- Main loop ---------- */
    function update(dt) {
        flashT = Math.max(0, flashT - dt);
        if (state === "countdown") {
            countdownT -= dt;
            if (countdownT <= 0.6) {
                raceTime += dt * 1000;
                for (var i = 0; i < cars.length; i++) {
                    if (cars[i].isPlayer) stepHuman(cars[i], dt);
                    else stepCpu(cars[i], dt);
                }
                collide();
            }
            if (countdownT <= 0) state = "race";
        } else if (state === "race") {
            raceTime += dt * 1000;
            updateHazards(dt);
            for (var j = 0; j < cars.length; j++) {
                if (cars[j].isPlayer) stepHuman(cars[j], dt);
                else stepCpu(cars[j], dt);
            }
            collide();
        }
    }

    function frame(now) {
        // substep so physics stays stable and race time tracks the wall
        // clock even when rendering can't hold 60fps
        var elapsed = Math.min(0.25, (now - lastFrame) / 1000 || 0);
        lastFrame = now;
        if (state === "countdown" || state === "race") {
            while (elapsed > 0) {
                var dt = Math.min(0.02, elapsed);
                elapsed -= dt;
                update(dt);
            }
        } else {
            flashT = Math.max(0, flashT - elapsed);
        }

        if (state === "race" || state === "finished") {
            var lead = humans[0];
            for (var i = 1; i < humans.length; i++) {
                if (progressOf(humans[i]) > progressOf(lead)) lead = humans[i];
            }
            hudLap.textContent = "LAP " + Math.min(LAPS, Math.max(1, lead.lap + 1)) + "/" + LAPS;
            hudPos.textContent = humansN === 1 ? ("POS " + racePos(lead) + "/" + cars.length) : (humansN + " GIOCATORI");
            hudTime.textContent = fmt(raceTime);
        }

        if (state === "race" && allHumansFinished()) showResults();

        draw();
        requestAnimationFrame(frame);
    }

    buildCars(1);
    setOverlayMode("select");
    draw();
    requestAnimationFrame(frame);

    if (DEMO) startGame(1);
})();

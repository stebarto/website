/* STEBARTO // PIT STOP — WebGL hero: night track + light streaks */
(function () {
    "use strict";

    var canvas = document.getElementById("gl-hero");
    var gl = canvas.getContext("webgl", { antialias: false, alpha: false }) ||
             canvas.getContext("experimental-webgl");
    if (!gl) {
        canvas.style.background =
            "radial-gradient(ellipse at 50% 60%, #2a0503 0%, #0a0a0c 60%)";
        return;
    }

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var VERT = [
        "attribute vec2 aPos;",
        "void main() { gl_Position = vec4(aPos, 0.0, 1.0); }"
    ].join("\n");

    var FRAG = [
        "precision highp float;",
        "uniform vec2 uRes;",
        "uniform float uTime;",
        "uniform vec2 uMouse;",
        "",
        "float hash(float n) { return fract(sin(n) * 43758.5453123); }",
        "",
        "void main() {",
        "    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;",
        "    vec2 m = (uMouse - 0.5) * vec2(0.30, 0.12);",
        "    float horizon = -0.04 + m.y;",
        "    vec2 vp = vec2(m.x, horizon);",
        "",
        "    vec3 col = vec3(0.012, 0.012, 0.016);",
        "",
        "    /* ember glow hugging the horizon */",
        "    float skyD = abs(p.y - horizon);",
        "    col += vec3(0.55, 0.035, 0.015) * exp(-skyD * 10.0) * 0.85;",
        "    col += vec3(0.20, 0.012, 0.006) * exp(-skyD * 2.6) * 0.5;",
        "",
        "    /* road plane below the horizon */",
        "    if (p.y < horizon) {",
        "        float z = horizon - p.y + 1e-4;",
        "        float depth = 1.0 / z;",
        "        float wx = (p.x - vp.x) * depth;",
        "        float wz = depth * 0.55 + uTime * 5.0;",
        "        float fog = exp(-depth * 0.045);",
        "",
        "        vec3 ground = vec3(0.024, 0.024, 0.030);",
        "",
        "        /* longitudinal grid */",
        "        float gx = abs(fract(wx * 0.5) - 0.5);",
        "        ground += vec3(0.30, 0.02, 0.012) * smoothstep(0.06, 0.0, gx) * 0.6;",
        "        /* cross lines sweeping toward the viewer */",
        "        float gz = abs(fract(wz * 0.5) - 0.5);",
        "        ground += vec3(0.45, 0.03, 0.015) * smoothstep(0.05, 0.0, gz) * 0.55;",
        "",
        "        /* track edges: hot red rails */",
        "        float edge = smoothstep(0.16, 0.0, abs(abs(wx) - 2.6));",
        "        ground += vec3(1.0, 0.10, 0.04) * edge * 1.4;",
        "        /* center dashes */",
        "        float dash = step(0.55, fract(wz * 0.35)) * smoothstep(0.10, 0.0, abs(wx));",
        "        ground += vec3(0.85, 0.85, 0.9) * dash * 0.45;",
        "",
        "        col = mix(vec3(0.10, 0.012, 0.008), ground, fog);",
        "        col += vec3(0.55, 0.035, 0.015) * exp(-skyD * 10.0) * 0.55;",
        "    }",
        "",
        "    /* light streaks converging on the vanishing point */",
        "    vec2 d = p - vp;",
        "    float r = length(d);",
        "    float ang = atan(d.y, d.x);",
        "    for (int i = 0; i < 22; i++) {",
        "        float fi = float(i);",
        "        float sa = hash(fi * 13.7) * 6.28318;",
        "        float da = ang - sa;",
        "        da = abs(mod(da + 3.14159, 6.28318) - 3.14159);",
        "        float beam = smoothstep(0.020 + hash(fi * 3.3) * 0.012, 0.0, da);",
        "        if (beam <= 0.0) continue;",
        "        float speed = 0.22 + hash(fi * 7.1) * 0.55;",
        "        float head = fract(uTime * speed + hash(fi * 5.9)) * 1.35;",
        "        float trail = smoothstep(head, head - 0.45, r) * smoothstep(head - 0.5, head, r);",
        "        float tint = hash(fi * 2.2);",
        "        vec3 sc = mix(vec3(1.0, 0.16, 0.07), vec3(0.95, 0.92, 0.9), step(0.78, tint));",
        "        col += sc * beam * trail * (0.5 + 0.5 * smoothstep(0.0, 0.5, r)) * 0.9;",
        "    }",
        "",
        "    /* core glow at the vanishing point */",
        "    col += vec3(1.0, 0.25, 0.1) * exp(-r * 7.0) * 0.7;",
        "",
        "    /* vignette + subtle flicker */",
        "    vec2 q = gl_FragCoord.xy / uRes;",
        "    col *= 1.0 - 0.55 * dot(q - 0.5, q - 0.5) * 2.2;",
        "    col *= 0.97 + 0.03 * hash(floor(uTime * 24.0));",
        "",
        "    gl_FragColor = vec4(col, 1.0);",
        "}"
    ].join("\n");

    function compile(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(s));
        }
        return s;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, "uRes");
    var uTime = gl.getUniformLocation(prog, "uTime");
    var uMouse = gl.getUniformLocation(prog, "uMouse");

    var dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    var scale = 1; // lowered adaptively if the GPU can't keep up
    function resize() {
        var w = canvas.clientWidth, h = canvas.clientHeight;
        canvas.width = Math.max(1, Math.round(w * dpr * scale));
        canvas.height = Math.max(1, Math.round(h * dpr * scale));
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener("resize", resize);
    resize();

    var mx = 0.5, my = 0.5, smx = 0.5, smy = 0.5;
    document.addEventListener("mousemove", function (e) {
        mx = e.clientX / window.innerWidth;
        my = 1.0 - e.clientY / window.innerHeight;
    });

    var visible = true;
    var running = true;
    var start = performance.now();
    var lastT = 0, slowFrames = 0;

    function draw(t) {
        smx += (mx - smx) * 0.04;
        smy += (my - smy) * 0.04;
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, (t - start) / 1000);
        gl.uniform2f(uMouse, smx, smy);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(t) {
        if (!running || !visible) return;
        // degrade resolution rather than frame rate on weak GPUs
        if (lastT && scale > 0.45) {
            if (t - lastT > 40) {
                if (++slowFrames > 12) { scale *= 0.75; resize(); slowFrames = 0; }
            } else if (slowFrames > 0) {
                slowFrames--;
            }
        }
        lastT = t;
        draw(t);
        if (!reducedMotion) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function setActive(on) {
        if (reducedMotion) return;
        var was = running && visible;
        if (on === was) return;
        if (on) { lastT = 0; requestAnimationFrame(frame); }
    }

    // don't burn GPU while the hero is scrolled out of view
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            setActive(running && visible);
        }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () {
        running = !document.hidden;
        setActive(running && visible);
    });
})();

(function deckReturnMotionFactory(global) {
    const activeAnimations = new WeakMap();

    const DEFAULTS = Object.freeze({
        duration: 560,
        minDuration: 420,
        maxDuration: 900,
        distanceFactor: 0.62,
        easing: 'cubic-bezier(.18,.82,.22,1)',
        velocityX: 0,
        velocityY: 0,
        accelerationX: 0,
        accelerationY: 0,
        directionDeg: 0,
        depth: 18,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        angularVelocity: 0,
        scale: 1,
        overshoot: 0.055,
        overshootMaxX: 12,
        overshootMaxY: 9,
        lift: 16,
        damping: 0.76,
        approachOffset: 0.72,
        overshootOffset: 0.9,
        settleOffset: 1,
        clearTransform: true,
    });

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, Number(value) || 0));
    }

    function number(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function resolveOptions(options = {}) {
        return {
            ...DEFAULTS,
            ...options,
            duration: number(options.duration, DEFAULTS.duration),
            minDuration: number(options.minDuration, DEFAULTS.minDuration),
            maxDuration: number(options.maxDuration, DEFAULTS.maxDuration),
            distanceFactor: number(options.distanceFactor, DEFAULTS.distanceFactor),
            velocityX: number(options.velocityX, DEFAULTS.velocityX),
            velocityY: number(options.velocityY, DEFAULTS.velocityY),
            accelerationX: number(options.accelerationX, DEFAULTS.accelerationX),
            accelerationY: number(options.accelerationY, DEFAULTS.accelerationY),
            directionDeg: number(options.directionDeg, DEFAULTS.directionDeg),
            depth: number(options.depth, DEFAULTS.depth),
            rotateX: number(options.rotateX, DEFAULTS.rotateX),
            rotateY: number(options.rotateY, DEFAULTS.rotateY),
            rotateZ: number(options.rotateZ, DEFAULTS.rotateZ),
            angularVelocity: number(options.angularVelocity, DEFAULTS.angularVelocity),
            scale: number(options.scale, DEFAULTS.scale),
            overshoot: number(options.overshoot, DEFAULTS.overshoot),
            overshootMaxX: number(options.overshootMaxX, DEFAULTS.overshootMaxX),
            overshootMaxY: number(options.overshootMaxY, DEFAULTS.overshootMaxY),
            lift: number(options.lift, DEFAULTS.lift),
            damping: clamp(number(options.damping, DEFAULTS.damping), 0, 1),
            approachOffset: clamp(number(options.approachOffset, DEFAULTS.approachOffset), .3, .88),
            overshootOffset: clamp(number(options.overshootOffset, DEFAULTS.overshootOffset), .72, .98),
            settleOffset: 1,
        };
    }

    function durationForDistance(distance, reducedMotion, options = {}) {
        const config = resolveOptions(options);
        if (reducedMotion) return Math.max(120, Math.min(240, config.minDuration));
        const calculated = config.duration + distance * config.distanceFactor;
        return Math.round(clamp(calculated, config.minDuration, config.maxDuration));
    }

    function buildReturnKeyframes(input = {}) {
        const config = resolveOptions(input);
        const x = number(input.x, 0);
        const y = number(input.y, 0);
        const fromTransform = String(input.fromTransform || 'none');
        const toTransform = String(input.toTransform || 'translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)');
        const angle = config.directionDeg * Math.PI / 180;
        const directionX = Math.cos(angle);
        const directionY = Math.sin(angle);
        const velocityInfluenceX = config.velocityX * .018;
        const velocityInfluenceY = config.velocityY * .018;
        const accelerationInfluenceX = config.accelerationX * .0008;
        const accelerationInfluenceY = config.accelerationY * .0008;
        const approachX = x * .22 + velocityInfluenceX + accelerationInfluenceX + directionX * 2;
        const approachY = y * .22 + velocityInfluenceY + accelerationInfluenceY + directionY * 2;
        const overshootX = clamp(-x * config.overshoot - velocityInfluenceX * .22, -config.overshootMaxX, config.overshootMaxX);
        const overshootY = clamp(-y * config.overshoot - velocityInfluenceY * .22, -config.overshootMaxY, config.overshootMaxY);
        const approachRotateX = config.rotateX * .28 + clamp(-y / 220, -3.2, 3.2);
        const approachRotateY = config.rotateY * .28 + clamp(x / 220, -3.6, 3.6);
        const approachRotateZ = config.rotateZ * .28 + config.angularVelocity * .05 + clamp(x / 260, -2.2, 2.2);
        const settleRotateZ = clamp(-(config.rotateZ + config.angularVelocity * .06) * (1 - config.damping), -2.2, 2.2);
        const approachScale = 1 + (config.scale - 1) * .25 + Math.min(.018, Math.hypot(x, y) / 12000);
        const overshootScale = 1 + Math.min(.01, Math.hypot(x, y) / 18000);

        return [
            {transform: fromTransform, offset: 0},
            {
                transform: `translate3d(${approachX}px, ${approachY}px, ${config.depth + config.lift}px) rotateX(${approachRotateX}deg) rotateY(${approachRotateY}deg) rotateZ(${approachRotateZ}deg) scale(${approachScale})`,
                offset: config.approachOffset,
            },
            {
                transform: `translate3d(${overshootX}px, ${overshootY}px, ${config.depth * .28}px) rotateX(${approachRotateX * .18}deg) rotateY(${approachRotateY * .18}deg) rotateZ(${settleRotateZ}deg) scale(${overshootScale})`,
                offset: config.overshootOffset,
            },
            {transform: toTransform, offset: 1},
        ];
    }

    async function animateReturn(element, options = {}) {
        if (!(element instanceof Element)) return {cancelled: true, reason: 'invalid-element'};

        const previous = activeAnimations.get(element);
        previous?.cancel();

        const config = resolveOptions(options);
        const x = number(options.x, 0);
        const y = number(options.y, 0);
        const fromTransform = String(options.fromTransform || getComputedStyle(element).transform || 'none');
        const toTransform = String(options.toTransform || 'translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)');
        const reducedMotion = options.reducedMotion ?? global.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        const distance = Math.hypot(x, y);
        const duration = options.duration != null
            ? clamp(number(options.duration, config.duration), 1, 10000)
            : durationForDistance(distance, reducedMotion, config);
        const keyframes = buildReturnKeyframes({...config, ...options, x, y, fromTransform, toTransform});

        element.classList.add('is-returning');
        element.style.transition = 'none';
        element.style.transform = fromTransform;
        element.getBoundingClientRect();

        const animation = element.animate(keyframes, {
            duration,
            easing: String(config.easing || DEFAULTS.easing),
            fill: 'forwards',
        });
        activeAnimations.set(element, animation);

        try {
            await animation.finished;
        } catch {
            if (activeAnimations.get(element) !== animation) return {cancelled: true, reason: 'replaced'};
        }

        if (activeAnimations.get(element) !== animation) return {cancelled: true, reason: 'replaced'};

        element.style.transform = toTransform;
        animation.cancel();
        activeAnimations.delete(element);
        element.style.removeProperty('transition');
        if (config.clearTransform !== false) element.style.removeProperty('transform');
        element.classList.remove('is-returning');
        options.onComplete?.(element);

        return {cancelled: false, duration, keyframes, config};
    }

    function cancelReturn(element) {
        const animation = activeAnimations.get(element);
        if (!animation) return false;
        animation.cancel();
        activeAnimations.delete(element);
        element.classList.remove('is-returning');
        element.style.removeProperty('transition');
        return true;
    }

    global.DeckReturnMotion = Object.freeze({
        defaults: DEFAULTS,
        animateReturn,
        cancelReturn,
        buildReturnKeyframes,
        durationForDistance,
        resolveOptions,
    });
}(window));

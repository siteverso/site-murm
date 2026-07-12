(function registerMurmurPulse(global) {
  const toCount = value => Math.max(0, Number(value) || 0);

  function getMurmurPulseValue(post = {}) {
    return toCount(post.positive) - toCount(post.negative);
  }

  function getMurmurPulseLevel(value) {
    const strength = Math.abs(Number(value) || 0);
    if (strength >= 15) return 'high';
    if (strength >= 5) return 'medium';
    if (strength > 0) return 'low';
    return 'silent';
  }

  function getMurmurPulseDirection(value) {
    const pulse = Number(value) || 0;
    if (pulse > 0) return 'positive';
    if (pulse < 0) return 'negative';
    return 'neutral';
  }

  function renderMurmurPulse(post = {}) {
    const value = getMurmurPulseValue(post);
    const level = getMurmurPulseLevel(value);
    const direction = getMurmurPulseDirection(value);
    const description = `saldo de ${value}: ecos menos silenciamentos`;

    return `<span class="murmur-pulse murmur-pulse--${level} murmur-pulse--${direction}" data-murmur-pulse data-pulse-value="${value}" title="Pulso do murmúrio: ${description}" aria-label="Pulso do murmúrio: ${description}">
      <span class="murmur-pulse__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false"><path d="M3 12h3l2.1-5.1L12 17l2.2-6H21"/></svg>
      </span>
      <span class="murmur-pulse__label">Pulso</span>
      <strong class="murmur-pulse__value">${value}</strong>
    </span>`;
  }

  global.MurmurPulse = Object.freeze({
    getValue: getMurmurPulseValue,
    getLevel: getMurmurPulseLevel,
    getDirection: getMurmurPulseDirection,
    render: renderMurmurPulse,
  });
})(window);

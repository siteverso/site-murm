(function registerMurmurPulse(global) {
  const toCount = value => Math.max(0, Number(value) || 0);

  function getMurmurPulseValue(post = {}) {
    return toCount(post.positive) + toCount(post.negative);
  }

  function getMurmurPulseLevel(value) {
    const pulse = toCount(value);
    if (pulse >= 15) return 'high';
    if (pulse >= 5) return 'medium';
    if (pulse > 0) return 'low';
    return 'silent';
  }

  function renderMurmurPulse(post = {}) {
    const value = getMurmurPulseValue(post);
    const level = getMurmurPulseLevel(value);
    const label = value === 1 ? '1 reação' : `${value} reações`;

    return `<span class="murmur-pulse murmur-pulse--${level}" data-murmur-pulse data-pulse-value="${value}" title="Pulso do murmúrio: ${label} entre ecos e silenciamentos" aria-label="Pulso do murmúrio: ${label} entre ecos e silenciamentos">
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
    render: renderMurmurPulse,
  });
})(window);

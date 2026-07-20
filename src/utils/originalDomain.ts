

const BASE_DOMAIN = (function getOriginalDomain(): string {
    const domain = window.location.origin;
    Object.freeze({ origin: domain });

    const originalDomainName = domain
        .replace(/^https?:\/\//, '')
        .split(':')[0];

    const originalDomain = import.meta.env.DEV ? 'dev.vardek.online' : originalDomainName

    return originalDomain;
})();

export { BASE_DOMAIN }
export const getLogoUrl = (name, id) => {
    if (!id && !name) return null;
    
    // We use two different proxies to ensure 100% uptime
    // Proxy 1: WSrv.nl (extremely fast, caches and cleans headers)
    // Proxy 2: Statically.io (great for CDN assets)

    if (id) {
        const biwengerUrl = `https://cf.biwenger.com/resources/logos/${id}.png`;
        // We wrap the blocked Biwenger URL in a proxy
        return `https://images.weserv.nl/?url=${encodeURIComponent(biwengerUrl)}&w=100&h=100&fit=contain`;
    }
    
    if (name) {
        const slug = name.toLowerCase().replace(/\s/g, '-');
        const ffUrl = `https://static.futbolfantasy.com/images/equipos/logos/60x60/${slug}.png`;
        return `https://cdn.statically.io/img/${ffUrl.replace('https://', '')}`;
    }
    
    return null;
};

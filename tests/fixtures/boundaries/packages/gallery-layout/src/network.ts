// Reaches the network through a global object instead of a bare global.
export const load = () => globalThis.fetch("/layout.json");

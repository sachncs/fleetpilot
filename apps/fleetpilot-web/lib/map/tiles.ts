/**
 * Map tile layer configurations.
 * Stadia Maps "Alidade Smooth" styles — free tier, no API key required.
 */
export interface TileConfig {
  url: string;
  attribution: string;
}

export const ALIDADE_SMOOTH: TileConfig = {
  url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
};

export const ALIDADE_SMOOTH_DARK: TileConfig = {
  url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
};

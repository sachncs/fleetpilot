/**
 * Map tile layer configurations.
 * CARTO basemaps — free, no API key required.
 * Acceptable use: https://github.com/CartoDB/basemap-styles
 */
export interface TileConfig {
  url: string;
  attribution: string;
}

export const ALIDADE_SMOOTH: TileConfig = {
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

export const ALIDADE_SMOOTH_DARK: TileConfig = {
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

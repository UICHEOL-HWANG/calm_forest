import { TEA } from './items/tea.js';
import { FLOWER } from './items/flower.js';
import { SEASIDE } from './items/seaside.js';
import { BOOKS_ITEMS } from './items/books.js';
import { BAKERY } from './items/bakery.js';
import { BUSKER } from './items/busker.js';

const BUILDERS = Object.freeze(Object.assign({}, TEA, FLOWER, SEASIDE, BOOKS_ITEMS, BAKERY, BUSKER));

export const ART_IDS = Object.freeze(Object.keys(BUILDERS));

export const hasItemArt = (id) => Object.hasOwn(BUILDERS, id);

export const weeklyDecorMesh = (THREE, id) => (hasItemArt(id) ? BUILDERS[id](THREE) : null);

import { buildDrum } from './drum.js';
import { buildGuitar } from './guitar.js';
import { buildBass } from './bass.js';
import { buildBells } from './bells.js';
import { buildMaracas } from './maracas.js';

const BUILDERS = { drum: buildDrum, guitar: buildGuitar, bass: buildBass, bells: buildBells, maracas: buildMaracas };

export const buildInstrument = (T, id, rig) => (BUILDERS[id] || buildDrum)(rig);

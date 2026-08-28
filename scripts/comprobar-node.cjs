/**
 * Se niega a arrancar con un Node demasiado viejo, diciendo por qué.
 *
 * Sin esto el proyecto sí arranca y falla más adelante disfrazado. Con Node 16,
 * Vite muere así:
 *
 *     SyntaxError: The requested module 'node:fs/promises'
 *     does not provide an export named 'constants'
 *
 * Ese mensaje no menciona la versión de Node por ningún lado, y `engine-strict`
 * del .npmrc no lo ataja porque solo rige en `npm install`, no en `npm run`.
 *
 * Va en CommonJS y sin sintaxis moderna a propósito: tiene que poder ejecutarse
 * precisamente en las versiones viejas que viene a rechazar. Si usara algo que
 * Node 16 no entiende, reventaría con un error de sintaxis en vez de explicarse.
 */
var paquete = require('../package.json');

var MINIMO = 20;
var actual = parseInt(process.versions.node.split('.')[0], 10);

if (actual >= MINIMO) process.exit(0);

var rojo = '[31m';
var negrita = '[1m';
var normal = '[0m';
var tenue = '[2m';

var lineas = [
  '',
  rojo + negrita + '  Este proyecto necesita Node ' + MINIMO + ' o mayor.' + normal,
  '',
  '  Estás usando Node ' + process.versions.node + ' (' + process.execPath + ').',
  '  El package.json pide "' + (paquete.engines && paquete.engines.node) + '".',
  '',
  negrita + '  Para esta terminal:' + normal,
  '    nvm use ' + MINIMO,
  '',
  negrita + '  Para dejarlo fijo en fish:' + normal,
  '    fish_add_path --prepend ~/.nvm/versions/node/v20.20.2/bin',
  '',
  tenue + '  (nvm es de bash; en fish no se carga solo, por eso conviene el PATH.)' + normal,
  '',
];

console.error(lineas.join('\n'));
process.exit(1);

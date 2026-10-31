// Keep the callable v3 API used by ESLint plugins; all matching uses patched v11.
const engine = require('@portfolio/minimatch-engine');
function minimatch(...args) { return engine.minimatch(...args); }
module.exports = Object.assign(minimatch, engine);
module.exports.minimatch = minimatch;
module.exports.Minimatch = engine.Minimatch;
module.exports.AST = engine.AST;
module.exports.GLOBSTAR = engine.GLOBSTAR;
module.exports.makeRe = engine.makeRe;
module.exports.match = engine.match;
module.exports.filter = engine.filter;
module.exports.defaults = engine.defaults;
module.exports.braceExpand = engine.braceExpand;
module.exports.escape = engine.escape;
module.exports.unescape = engine.unescape;
module.exports.sep = engine.sep;

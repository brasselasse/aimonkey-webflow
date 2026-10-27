/* Bygger startsida.css från CSS-listorna i startsida.js och startflode.js.
   Kör: node verktyg/bygg-startsida-css.js
   Filen laddas i startsidans <head> så att stilarna finns redan vid första
   ritningen (inga layoutskift). Skripten hoppar över sin egen injicering
   när filen redan är laddad. */
var fs = require('fs'), path = require('path');
function hamtaCss(fil) {
  var src = fs.readFileSync(path.join(__dirname, '..', fil), 'utf8');
  var m = src.match(/var CSS = (\[[\s\S]*?\])\.join\(''\);/);
  if (!m) throw new Error('Hittade ingen CSS-lista i ' + fil);
  return Function('return ' + m[1])().join('\n');
}
var RESERV = [
  '/* Reserverad plats innan skripten har kört (mot layoutskift) */',
  '.w-mod-js [data-st="sok"]{min-height:64px}',
  '.w-mod-js [data-st="sok"] .st-sok-fallback{visibility:hidden}',
  '.w-mod-js [data-st="flikar"]{min-height:46px}',
  '@media (min-width:768px){.w-mod-js [data-st="flikar"]{min-height:44px}}',
  '.w-mod-js .st-prompter:not(.st-flikar-klara) .st-kort[data-st-grupp]:not([data-st-grupp~="Populära"]){display:none}'
].join('\n');
var ut = '/* AIMonkey startsida.css – GENERERAD av verktyg/bygg-startsida-css.js, ändra i JS-filerna */\n' +
  '/* startsida.js */\n' + hamtaCss('startsida.js') + '\n/* startflode.js */\n' + hamtaCss('startflode.js') + '\n' + RESERV + '\n';
fs.writeFileSync(path.join(__dirname, '..', 'startsida.css'), ut);
console.log('startsida.css', ut.length, 'tecken');

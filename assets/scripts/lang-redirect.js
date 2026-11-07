/* Nyelvi átirányítás a gyökérről (/ -> /hu/ vagy /en/) */
(function () {
  var lang = navigator.language || navigator.userLanguage;
  if (lang === 'hu-HU') {
    window.location.href = '/hu/';
  } else {
    window.location.href = '/en/';
  }
})();

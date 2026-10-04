export const environment = {
  production: true,
  apiUrl: '/api',
  apiAdresseUrl: 'https://api-adresse.data.gouv.fr/search',
  // Element Web (messagerie Matrix, voir doc de conception "Matrix / Element") -- servi
  // publiquement via son propre sous-domaine (voir proxy/nginx.conf, server_name
  // chat.assista-crise.fr), plus d'IP LAN en dur depuis le retrait de .113 (2026-09-28).
  elementWebUrl: 'https://chat.assista-crise.fr',
};

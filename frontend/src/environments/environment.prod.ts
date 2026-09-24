export const environment = {
  production: true,
  apiUrl: '/api',
  apiAdresseUrl: 'https://api-adresse.data.gouv.fr/search',
  // Element Web (messagerie Matrix, voir doc de conception "Matrix / Element") -- port dédié,
  // hors proxy/WAF (usage LAN interne). À reparamétrer si un jour déployé sur un autre hôte
  // que .113 (pas encore le cas, voir doc de conception).
  elementWebUrl: 'http://172.16.1.113:8082',
};

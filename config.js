// Configuração do aplicativo.
// Cole aqui o "ID do cliente OAuth" criado no Google Cloud (veja o LEIA-ME.md).
// Enquanto estiver como COLE_AQUI, o app funciona normalmente, só sem Drive e Agenda.
window.APP_CONFIG = {
  GOOGLE_CLIENT_ID: '631476153010-sm6d1udia8cn34mn3t7p4gnaaghcr9qh.apps.googleusercontent.com',
  ROOT_FOLDER: 'Saúde a Dois',   // pasta principal no Drive
  CALENDAR_NAME: 'Saúde',        // usada só se CALENDAR_ID estiver vazio
  CALENDAR_ID: 'primary',  // agenda principal da conta Google conectada (rodrigomespsi@gmail.com). Troque pelo código de outra agenda se quiser.
  TIMEZONE: 'America/Sao_Paulo'
};

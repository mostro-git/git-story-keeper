/**
 * Validación mínima de variables de entorno al iniciar.
 * Solo lo estrictamente necesario para correr en modo self-hosted.
 */
function assertEnv() {
  const errors = [];

  if (!process.env.ADMIN_PANEL_PASSWORD) {
    errors.push('ADMIN_PANEL_PASSWORD no configurada');
  } else if (process.env.ADMIN_PANEL_PASSWORD.length < 6) {
    errors.push('ADMIN_PANEL_PASSWORD demasiado corta (mínimo 6 caracteres)');
  }

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET no configurada (generá una con: openssl rand -hex 32)');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET muy corta (mínimo 32 caracteres)');
  }

  if (!process.env.FRONTEND_URL) {
    errors.push('FRONTEND_URL no configurada (ej: http://localhost:8080)');
  }

  if (errors.length) {
    console.error('\n❌ Configuración inválida:\n  - ' + errors.join('\n  - ') + '\n');
    console.error('   Revisá backend/.env (basate en .env.example)\n');
    process.exit(1);
  }
}

module.exports = { assertEnv };

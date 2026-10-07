// Куки с флагом Secure работают только по HTTPS. Для проверки по голому http://IP
// (не рекомендуется для реальной работы) можно задать COOKIE_SECURE=false.
export function cookieSecure() {
  return process.env.COOKIE_SECURE !== 'false';
}

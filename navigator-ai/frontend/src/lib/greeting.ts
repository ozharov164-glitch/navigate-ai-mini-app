export function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

export function displayName(): string {
  const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (u?.first_name) return u.first_name;
  return "друг";
}

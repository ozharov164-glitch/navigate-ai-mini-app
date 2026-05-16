interface Props {
  minutes: number;
  rub: number;
  premium: boolean;
  left: number;
}

export function ValueBanner({ minutes, rub, premium, left }: Props) {
  return (
    <div className="mx-4 mt-3 glass-card animate-slide-up p-4">
      <p className="text-xs text-accent">Метрика ценности</p>
      <p className="mt-1 text-sm text-secondary">
        Сегодня AI сэкономил <span className="font-semibold text-primary">{minutes} мин</span> и{" "}
        <span className="font-semibold text-emerald-500">{rub} ₽</span>
      </p>
      {!premium && (
        <p className="mt-2 text-xs text-muted">Осталось действий сегодня: {left} / 20</p>
      )}
    </div>
  );
}

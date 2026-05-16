interface Props {
  minutes: number;
  rub: number;
  premium: boolean;
  left: number;
}

export function ValueBanner({ minutes, rub, premium, left }: Props) {
  return (
    <div className="mx-4 mt-3 glass-card animate-slide-up p-4">
      <p className="text-xs text-indigo-300">Метрика ценности</p>
      <p className="mt-1 text-sm">
        Сегодня AI сэкономил <span className="font-semibold text-white">{minutes} мин</span> и{" "}
        <span className="font-semibold text-emerald-400">{rub} ₽</span>
      </p>
      {!premium && (
        <p className="mt-2 text-xs text-slate-400">Осталось действий сегодня: {left} / 20</p>
      )}
    </div>
  );
}

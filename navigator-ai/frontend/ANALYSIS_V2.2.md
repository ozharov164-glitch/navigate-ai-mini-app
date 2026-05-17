# Анализ UI v2.2 (перед правками)

## Найденные проблемы

| # | Проблема | Причина | Решение |
|---|----------|---------|---------|
| 1 | Чёрный экран при повторном открытии вкладки | `PageShell` remount + CSS `stagger-children { opacity: 0 }` без `forwards`; `AnimatePresence` отсутствует | Framer Motion `AnimatePresence`, убрать opacity-0 stagger на вкладках |
| 2 | Светлая тема сломана | Hardcoded `border-white/*`, `bg-white/[0.02]` в HomePage, TaskRow, Stat pills | `html.light` overrides + theme-aware классы |
| 3 | Лаги анимаций | Двойные анимации (tab-panel + stagger), `layout` на каждой задаче | Один переход вкладок; лёгкий layout только на checkbox |
| 4 | Плоское поле ввода | InputBar без рамки/focus glow; микрофон отдельно в VoiceFab | Единый `input-bar` с фото + текст + микрофон + «Разобрать» |
| 5 | Дублирование ValueBanner | Минуты/₽ в заголовке и в двух Stat-карточках | Одна карточка: заголовок + прогресс лимита |
| 6 | VoiceFab по центру | Конфликт с nav dock, не по ТЗ | Голос в InputBar |

## План правок

1. `PageShell.tsx` — AnimatePresence fade/slide
2. `InputBar.tsx` — премиум bar + встроенный voice
3. `index.css` — input-bar, light fixes, stagger-safe
4. `ValueBanner`, `TaskRow`, `EmptyState`, pages polish
5. `App.tsx` — убрать VoiceFab, ValueBanner только на Home (опционально)

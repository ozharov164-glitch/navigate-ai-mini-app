import { useRef } from "react";

/** Debounce для защиты от двойных AI-запросов */
export function useDebouncedCallback<T extends (...args: never[]) => void>(fn: T, ms = 2000) {
  const fnRef = useRef(fn);
  const lastRef = useRef(0);
  fnRef.current = fn;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRef.current < ms) return;
    lastRef.current = now;
    fnRef.current(...args);
  };
}

export function useDebouncedLock(ms = 2000) {
  const busyRef = useRef(false);
  return {
    tryLock: () => {
      if (busyRef.current) return false;
      busyRef.current = true;
      window.setTimeout(() => {
        busyRef.current = false;
      }, ms);
      return true;
    },
  };
}

import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

/** Renders `format(value)`, gliding between values when it changes (see useAnimatedNumber). */
export function AnimatedNumber({ value, format = String }: { value: number; format?: (n: number) => string }) {
  return <>{format(useAnimatedNumber(value))}</>;
}

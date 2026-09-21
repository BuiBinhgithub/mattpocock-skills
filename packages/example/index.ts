import { internalCompute } from "./lib/impl";

export function add(a: number, b: number): number {
  return internalCompute(a, b);
}

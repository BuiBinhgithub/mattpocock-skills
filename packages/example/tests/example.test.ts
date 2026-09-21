import { add } from "../index";

export function testAdd() {
  const result = add(2, 3);
  if (result !== 5) {
    throw new Error(`Expected 5, got ${result}`);
  }
}

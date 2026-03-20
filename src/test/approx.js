export function approxEqual(actual, expected, epsilon = 1e-6) {
  return Math.abs(actual - expected) <= epsilon;
}

export function approxPoint(actual, expected, epsilon = 1e-6) {
  return approxEqual(actual.x, expected.x, epsilon) && approxEqual(actual.y, expected.y, epsilon);
}

export function approxStone(actual, expected, epsilon = 1e-6) {
  return (
    approxEqual(actual.x, expected.x, epsilon) &&
    approxEqual(actual.y, expected.y, epsilon) &&
    approxEqual(actual.vx, expected.vx, epsilon) &&
    approxEqual(actual.vy, expected.vy, epsilon) &&
    approxEqual(actual.omega, expected.omega, epsilon)
  );
}

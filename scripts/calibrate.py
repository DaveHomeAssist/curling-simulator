"""
Curling physics parameter calibration against published benchmarks.

Target: Jensen & Shegelski trajectory (via Penner 2001)
  v0 = 2.09 m/s, ω0 = -1.01 rad/s
  Travel: 25.6 m in 22.8 s
  Curl: 0.78 m
  Tolerance: ±5cm lateral, ±0.5s time (Penner's own model-experiment comparison)

Also validates:
  - Marmo sweep benchmark: 5.84m unswept vs 6.40m swept at v0=1.0
  - Sweeping reduces curl (hold-line effect)
  - Late-curl accumulation profile
"""
import math
import json
from dataclasses import dataclass

# ── Published targets ──
PENNER_V0 = 2.09
PENNER_OMEGA0 = 1.01  # magnitude, sign determines curl direction
PENNER_DISTANCE = 25.6
PENNER_TIME = 22.8
PENNER_CURL = 0.78

MARMO_V0 = 1.0
MARMO_UNSWEPT = 5.84
MARMO_SWEPT = 6.40

STONE_MASS = 19.96
STONE_RADIUS = 0.145
RUNNING_BAND_RADIUS = 0.065
G = 9.81


@dataclass
class Params:
    linear_friction: float
    curl_accel: float
    sweep_friction_mult: float
    stop_speed: float = 0.015
    stop_spin: float = 0.02


def simulate(v0, omega0, params, dt=1/120, max_time=40, sweeping=False):
    x, y = 0.0, 0.0
    vx, vy = 0.0, v0
    omega = omega0
    t = 0.0
    samples = []

    while t < max_time:
        speed = math.hypot(vx, vy)
        if speed <= params.stop_speed and abs(omega) <= params.stop_spin:
            break

        friction = params.linear_friction * (params.sweep_friction_mult if sweeping else 1.0)
        decel = friction * dt

        if speed > 0:
            nx, ny = vx / speed, vy / speed
            next_speed = max(0, speed - decel)
            vx = nx * next_speed
            vy = ny * next_speed

            curl_sign = 0 if omega == 0 else (1 if omega > 0 else -1)
            curl = params.curl_accel * speed * dt * curl_sign
            vx += curl

        x += vx * dt
        y += vy * dt

        next_speed = math.hypot(vx, vy)
        if next_speed <= params.stop_speed and abs(omega) <= params.stop_spin:
            break

        spin_drag = max(0, 1 - friction * 0.04 * dt)
        omega *= spin_drag

        t += dt

        # Sample every 0.1s
        if int(t * 10) != int((t - dt) * 10):
            samples.append((t, x, y, vx, vy, omega))

    return {
        'distance': y,
        'curl': abs(x),
        'time': t,
        'final_x': x,
        'samples': samples,
    }


def score_params(params):
    """Score how well params match published benchmarks. Lower = better."""
    # Penner benchmark
    r = simulate(PENNER_V0, PENNER_OMEGA0, params)
    dist_err = abs(r['distance'] - PENNER_DISTANCE) / PENNER_DISTANCE
    time_err = abs(r['time'] - PENNER_TIME) / PENNER_TIME
    curl_err = abs(r['curl'] - PENNER_CURL) / PENNER_CURL

    # Marmo sweep benchmark
    r_unswept = simulate(MARMO_V0, 0, params, sweeping=False)
    r_swept = simulate(MARMO_V0, 0, params, sweeping=True)
    marmo_unswept_err = abs(r_unswept['distance'] - MARMO_UNSWEPT) / MARMO_UNSWEPT
    marmo_swept_err = abs(r_swept['distance'] - MARMO_SWEPT) / MARMO_SWEPT
    sweep_increases_dist = r_swept['distance'] > r_unswept['distance']

    # Sweep reduces curl
    r_curl_unswept = simulate(PENNER_V0, PENNER_OMEGA0, params, sweeping=False)
    r_curl_swept = simulate(PENNER_V0, PENNER_OMEGA0, params, sweeping=True)
    sweep_reduces_curl = r_curl_swept['curl'] < r_curl_unswept['curl']

    # Late curl check
    samples = r['samples']
    late_curl_ok = False
    if len(samples) > 10:
        half_dist = r['distance'] * 0.5
        half_idx = next((i for i, s in enumerate(samples) if s[2] >= half_dist), len(samples) - 1)
        curl_at_half = abs(samples[half_idx][1])
        curl_at_end = r['curl']
        if curl_at_end > 0.05:
            late_curl_ok = (curl_at_end - curl_at_half) > curl_at_half

    # Weighted score
    total = (
        dist_err * 3.0 +
        time_err * 2.0 +
        curl_err * 3.0 +
        marmo_unswept_err * 1.0 +
        marmo_swept_err * 1.0 +
        (0 if sweep_increases_dist else 0.5) +
        (0 if sweep_reduces_curl else 0.5) +
        (0 if late_curl_ok else 0.3)
    )

    return {
        'score': total,
        'penner_dist': r['distance'],
        'penner_time': r['time'],
        'penner_curl': r['curl'],
        'marmo_unswept': r_unswept['distance'],
        'marmo_swept': r_swept['distance'],
        'sweep_increases_dist': sweep_increases_dist,
        'sweep_reduces_curl': sweep_reduces_curl,
        'late_curl': late_curl_ok,
    }


def grid_search():
    """Brute-force parameter sweep."""
    best_score = float('inf')
    best_params = None
    best_result = None

    # Search ranges based on physics:
    # linear_friction: maps to μ*g effective deceleration
    #   μ=0.01-0.02 → decel ~0.1-0.2 m/s² → need friction param ~0.05-0.15
    # curl_accel: lateral acceleration factor, should produce ~1m curl over 25m
    # sweep_friction_mult: Nyberg reports ~25% friction reduction → 0.72-0.78

    friction_range = [round(0.04 + i * 0.005, 4) for i in range(25)]
    curl_range = [round(0.005 + i * 0.002, 4) for i in range(25)]
    sweep_range = [round(0.60 + i * 0.02, 2) for i in range(12)]

    total = len(friction_range) * len(curl_range) * len(sweep_range)
    tested = 0

    for lf in friction_range:
        for ca in curl_range:
            for sm in sweep_range:
                tested += 1
                p = Params(linear_friction=lf, curl_accel=ca, sweep_friction_mult=sm)
                result = score_params(p)

                if result['score'] < best_score:
                    best_score = result['score']
                    best_params = p
                    best_result = result

                    if tested % 500 == 0 or best_score < 0.5:
                        print(f"[{tested}/{total}] score={best_score:.4f} "
                              f"friction={lf} curl={ca} sweep={sm}")

    return best_params, best_result


def main():
    print("=" * 60)
    print("CURLING PHYSICS CALIBRATION")
    print("Target: Penner 2001 (Jensen & Shegelski trajectory)")
    print(f"  v0={PENNER_V0} m/s, ω0={PENNER_OMEGA0} rad/s")
    print(f"  Distance={PENNER_DISTANCE}m, Time={PENNER_TIME}s, Curl={PENNER_CURL}m")
    print("=" * 60)

    # First, test current engine values
    print("\n── Current engine values ──")
    current = Params(linear_friction=0.18, curl_accel=0.08, sweep_friction_mult=0.72)
    cr = score_params(current)
    print(f"  Score: {cr['score']:.4f}")
    print(f"  Penner: dist={cr['penner_dist']:.2f}m time={cr['penner_time']:.2f}s curl={cr['penner_curl']:.2f}m")
    print(f"  Marmo: unswept={cr['marmo_unswept']:.2f}m swept={cr['marmo_swept']:.2f}m")
    print(f"  Sweep ↑dist={cr['sweep_increases_dist']} ↓curl={cr['sweep_reduces_curl']} late_curl={cr['late_curl']}")

    # Grid search
    print("\n── Grid search (7,500 combinations) ──")
    best_params, best_result = grid_search()

    print("\n" + "=" * 60)
    print("BEST PARAMETERS FOUND")
    print("=" * 60)
    print(f"  LINEAR_FRICTION:        {best_params.linear_friction}")
    print(f"  CURL_ACCEL:             {best_params.curl_accel}")
    print(f"  SWEEP_FRICTION_MULTIPLIER: {best_params.sweep_friction_mult}")
    print()
    print(f"  Score: {best_result['score']:.4f}")
    print(f"  Penner distance: {best_result['penner_dist']:.2f}m (target {PENNER_DISTANCE}m)")
    print(f"  Penner time:     {best_result['penner_time']:.2f}s (target {PENNER_TIME}s)")
    print(f"  Penner curl:     {best_result['penner_curl']:.2f}m (target {PENNER_CURL}m)")
    print(f"  Marmo unswept:   {best_result['marmo_unswept']:.2f}m (target {MARMO_UNSWEPT}m)")
    print(f"  Marmo swept:     {best_result['marmo_swept']:.2f}m (target {MARMO_SWEPT}m)")
    print(f"  Sweep ↑distance: {best_result['sweep_increases_dist']}")
    print(f"  Sweep ↓curl:     {best_result['sweep_reduces_curl']}")
    print(f"  Late curl:       {best_result['late_curl']}")

    # Output as JS constants
    print("\n── Copy to src/physics/constants.js ──")
    print(f"  LINEAR_FRICTION: {best_params.linear_friction},")
    print(f"  SWEEP_FRICTION_MULTIPLIER: {best_params.sweep_friction_mult},")
    print(f"  CURL_ACCEL: {best_params.curl_accel},")


if __name__ == '__main__':
    main()

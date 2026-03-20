"""
Curling physics calibration v2 — velocity-dependent friction model.

The v1 model used constant deceleration. The literature (Nyberg, Denny,
Shegelski) strongly supports μ(v) = μ_base * v^(-α) behavior, where
friction increases as speed decreases. This produces:
  - realistic travel distances and times
  - late curl (because lower v → higher friction → more pivoting)
  - sweep reduces curl (because lower friction → less asymmetry)

This script searches for the best {mu_base, alpha, curl_k, sweep_mu_mult}
that match Penner and Marmo benchmarks.
"""
import math
import sys

# ── Published targets ──
PENNER_V0 = 2.09
PENNER_OMEGA0 = 1.01
PENNER_DISTANCE = 25.6
PENNER_TIME = 22.8
PENNER_CURL = 0.78

MARMO_V0 = 1.0
MARMO_UNSWEPT = 5.84
MARMO_SWEPT = 6.40

STONE_MASS = 19.96
G = 9.81


def simulate(v0, omega0, mu_base, alpha, curl_k, sweep_mu_mult,
             dt=1/120, max_time=35, sweeping=False):
    x, y = 0.0, 0.0
    vx, vy = 0.0, v0
    omega = omega0
    t = 0.0
    samples = []

    while t < max_time:
        speed = math.hypot(vx, vy)
        if speed < 0.008:
            break

        # Velocity-dependent friction: μ(v) = mu_base * v^(-alpha)
        # Clamped to prevent singularity at v→0
        mu = mu_base * max(speed, 0.05) ** (-alpha)
        mu = min(mu, 0.06)  # physical cap

        if sweeping:
            mu *= sweep_mu_mult

        # Deceleration from friction: a = μ * g
        decel = mu * G
        friction_dt = decel * dt

        if speed > 0:
            nx, ny = vx / speed, vy / speed
            new_speed = max(0, speed - friction_dt)
            vx = nx * new_speed
            vy = ny * new_speed

        # Curl: lateral force proportional to ω/v (pivot-slide model)
        # Direction: positive omega → curl in +x (convention)
        if speed > 0.05 and abs(omega) > 0.01:
            curl_force = curl_k * omega / max(speed, 0.1)
            # Sweep reduces curl by reducing the friction asymmetry
            if sweeping:
                curl_force *= sweep_mu_mult
            vx += curl_force * dt

        x += vx * dt
        y += vy * dt

        # Angular deceleration (torque from friction on running band)
        omega_decel = mu * G * 0.065 / 0.0836  # torque / moment of inertia
        if abs(omega) > 0:
            omega -= math.copysign(omega_decel * dt, omega)
            if abs(omega) < 0.01:
                omega = 0

        t += dt

        if int(t * 10) != int((t - dt) * 10):
            samples.append((t, x, y, speed, omega))

    return {
        'distance': y,
        'curl': abs(x),
        'time': t,
        'samples': samples,
    }


def score(mu_base, alpha, curl_k, sweep_mu_mult):
    # Penner benchmark
    r = simulate(PENNER_V0, PENNER_OMEGA0, mu_base, alpha, curl_k, sweep_mu_mult)
    dist_err = abs(r['distance'] - PENNER_DISTANCE) / PENNER_DISTANCE
    time_err = abs(r['time'] - PENNER_TIME) / PENNER_TIME
    curl_err = abs(r['curl'] - PENNER_CURL) / max(PENNER_CURL, 0.1)

    # Marmo sweep benchmark
    ru = simulate(MARMO_V0, 0, mu_base, alpha, curl_k, sweep_mu_mult, sweeping=False)
    rs = simulate(MARMO_V0, 0, mu_base, alpha, curl_k, sweep_mu_mult, sweeping=True)
    marmo_u_err = abs(ru['distance'] - MARMO_UNSWEPT) / MARMO_UNSWEPT
    marmo_s_err = abs(rs['distance'] - MARMO_SWEPT) / MARMO_SWEPT
    sweep_dist_ok = rs['distance'] > ru['distance']

    # Sweep reduces curl
    rc_u = simulate(PENNER_V0, PENNER_OMEGA0, mu_base, alpha, curl_k, sweep_mu_mult, sweeping=False)
    rc_s = simulate(PENNER_V0, PENNER_OMEGA0, mu_base, alpha, curl_k, sweep_mu_mult, sweeping=True)
    sweep_curl_ok = rc_s['curl'] < rc_u['curl']

    # Late curl
    samples = r['samples']
    late_curl_ok = False
    if len(samples) > 10:
        half_y = r['distance'] * 0.5
        half_idx = next((i for i, s in enumerate(samples) if s[2] >= half_y), len(samples) - 1)
        curl_half = abs(samples[half_idx][1])
        curl_end = r['curl']
        if curl_end > 0.05:
            late_curl_ok = (curl_end - curl_half) > curl_half

    total = (
        dist_err * 4.0 +
        time_err * 3.0 +
        curl_err * 4.0 +
        marmo_u_err * 2.0 +
        marmo_s_err * 2.0 +
        (0 if sweep_dist_ok else 1.0) +
        (0 if sweep_curl_ok else 1.0) +
        (0 if late_curl_ok else 0.5)
    )

    return total, {
        'dist': r['distance'], 'time': r['time'], 'curl': r['curl'],
        'marmo_u': ru['distance'], 'marmo_s': rs['distance'],
        'sweep_dist': sweep_dist_ok, 'sweep_curl': sweep_curl_ok,
        'late_curl': late_curl_ok,
    }


def main():
    print("=" * 60)
    print("CURLING CALIBRATION v2 — velocity-dependent friction")
    print("=" * 60)

    best_score = float('inf')
    best = None
    tested = 0

    # μ_base: ~0.008-0.025 (Nyberg, Li et al.)
    # alpha: 0.0-0.6 (velocity exponent; 0.5 = Marmo's μ∝v^-0.5)
    # curl_k: lateral force scaling
    # sweep_mu_mult: 0.70-0.85 (Nyberg: ~25% reduction)

    mu_range = [round(0.006 + i * 0.001, 4) for i in range(20)]
    alpha_range = [round(i * 0.05, 3) for i in range(13)]
    curl_range = [round(0.002 + i * 0.001, 4) for i in range(15)]
    sweep_range = [round(0.68 + i * 0.02, 2) for i in range(8)]

    total = len(mu_range) * len(alpha_range) * len(curl_range) * len(sweep_range)
    print(f"Searching {total:,} combinations...\n")

    for mu in mu_range:
        for al in alpha_range:
            for ck in curl_range:
                for sm in sweep_range:
                    tested += 1
                    s, info = score(mu, al, ck, sm)

                    if s < best_score:
                        best_score = s
                        best = (mu, al, ck, sm, info)

                        if best_score < 1.5 or tested % 5000 == 0:
                            print(f"[{tested:>7,}/{total:,}] score={s:.3f} "
                                  f"μ={mu} α={al} curl_k={ck} sweep={sm} "
                                  f"dist={info['dist']:.1f} time={info['time']:.1f} "
                                  f"curl={info['curl']:.2f}")

    mu, al, ck, sm, info = best
    print("\n" + "=" * 60)
    print("BEST PARAMETERS")
    print("=" * 60)
    print(f"  MU_BASE:     {mu}     (base friction coefficient)")
    print(f"  ALPHA:       {al}     (velocity exponent: μ = μ_base * v^-α)")
    print(f"  CURL_K:      {ck}     (lateral curl force scaling)")
    print(f"  SWEEP_MULT:  {sm}     (friction multiplier when sweeping)")
    print()
    print(f"  Score:       {best_score:.4f}")
    print(f"  Distance:    {info['dist']:.2f}m  (target {PENNER_DISTANCE}m)")
    print(f"  Time:        {info['time']:.2f}s  (target {PENNER_TIME}s)")
    print(f"  Curl:        {info['curl']:.2f}m  (target {PENNER_CURL}m)")
    print(f"  Marmo unsw:  {info['marmo_u']:.2f}m  (target {MARMO_UNSWEPT}m)")
    print(f"  Marmo swept: {info['marmo_s']:.2f}m  (target {MARMO_SWEPT}m)")
    print(f"  Sweep ↑dist: {info['sweep_dist']}")
    print(f"  Sweep ↓curl: {info['sweep_curl']}")
    print(f"  Late curl:   {info['late_curl']}")

    print("\n── For constants.js (requires model update to use μ(v)) ──")
    print(f"  MU_BASE: {mu},")
    print(f"  MU_VELOCITY_EXPONENT: {al},")
    print(f"  CURL_K: {ck},")
    print(f"  SWEEP_FRICTION_MULTIPLIER: {sm},")


if __name__ == '__main__':
    main()

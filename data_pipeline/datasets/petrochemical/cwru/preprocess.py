"""CWRU bearing dataset preprocessing — converts .mat files to structured JSON.

Produces labeled time-series windows for the monitor_agent to use.
If .mat files are not available, generates synthetic bearing vibration data
that mimics real CWRU patterns for development and demonstration.
"""

from __future__ import annotations

import json
import logging
import math
import random
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).parent / "processed"
SAMPLE_RATE = 12000  # 12kHz
WINDOW_SIZE = 4096


def generate_synthetic_bearing_data() -> dict[str, list[dict]]:
    """Generate synthetic vibration data mimicking CWRU fault patterns.

    Each fault type has characteristic frequency signatures:
    - Normal: low amplitude, no dominant fault frequency
    - Inner race: impulses at BPFI (ball pass frequency inner)
    - Outer race: impulses at BPFO (ball pass frequency outer)
    - Ball fault: impulses at BSF (ball spin frequency)
    """
    random.seed(42)
    np.random.seed(42)

    shaft_freq = 29.95  # Hz (1797 RPM)
    bpfi = 5.415 * shaft_freq
    bpfo = 3.585 * shaft_freq
    bsf = 2.357 * shaft_freq

    samples_per_class = 50

    def _generate_signal(fault_freq: Optional[float], amplitude: float, noise_level: float) -> list[float]:
        t = np.arange(WINDOW_SIZE) / SAMPLE_RATE
        signal = noise_level * np.random.randn(WINDOW_SIZE)
        signal += 0.1 * np.sin(2 * math.pi * shaft_freq * t)
        if fault_freq:
            impulse_interval = int(SAMPLE_RATE / fault_freq)
            for i in range(0, WINDOW_SIZE, impulse_interval):
                decay = np.exp(-np.arange(min(200, WINDOW_SIZE - i)) * 0.03)
                end = min(i + len(decay), WINDOW_SIZE)
                signal[i:end] += amplitude * decay[: end - i] * np.sin(
                    2 * math.pi * 3000 * np.arange(end - i) / SAMPLE_RATE
                )
        return signal.tolist()

    fault_configs = {
        "normal": (None, 0.0, 0.05),
        "inner_race_fault": (bpfi, 0.8, 0.1),
        "outer_race_fault": (bpfo, 0.6, 0.08),
        "ball_fault": (bsf, 0.5, 0.12),
    }

    dataset = {}
    for label, (freq, amp, noise) in fault_configs.items():
        windows = []
        for i in range(samples_per_class):
            amp_var = amp * (1 + 0.2 * random.random())
            noise_var = noise * (1 + 0.3 * random.random())
            signal = _generate_signal(freq, amp_var, noise_var)
            rms = float(np.sqrt(np.mean(np.array(signal) ** 2)))
            peak = float(np.max(np.abs(signal)))
            kurtosis = float(np.mean((np.array(signal) - np.mean(signal)) ** 4) / (np.std(signal) ** 4))
            windows.append({
                "window_id": f"{label}_{i:03d}",
                "label": label,
                "signal": signal[:100],  # store first 100 points as preview
                "features": {
                    "rms": round(rms, 6),
                    "peak": round(peak, 6),
                    "kurtosis": round(kurtosis, 4),
                    "crest_factor": round(peak / rms if rms > 0 else 0, 4),
                },
                "full_length": WINDOW_SIZE,
                "sample_rate": SAMPLE_RATE,
            })
        dataset[label] = windows

    return dataset


def generate_device_lifecycle_series() -> list[dict]:
    """Generate a device lifecycle time-series: normal → degradation → fault.

    Simulates 30 days of pump vibration data with gradual degradation.
    """
    np.random.seed(123)
    hours = 30 * 24  # 30 days
    timeline = []

    for h in range(hours):
        progress = h / hours

        if progress < 0.6:
            health_score = 0.95 - 0.05 * random.random()
            rms = 0.05 + 0.01 * random.random()
            status = "normal"
        elif progress < 0.85:
            degradation = (progress - 0.6) / 0.25
            health_score = 0.95 - 0.3 * degradation + 0.02 * random.random()
            rms = 0.05 + 0.4 * degradation + 0.03 * random.random()
            status = "degrading"
        else:
            fault_progress = (progress - 0.85) / 0.15
            health_score = max(0.2, 0.65 - 0.45 * fault_progress + 0.05 * random.random())
            rms = 0.45 + 0.5 * fault_progress + 0.08 * random.random()
            status = "fault"

        timeline.append({
            "hour": h,
            "health_score": round(health_score, 4),
            "vibration_rms": round(rms, 6),
            "temperature": round(85 + 15 * (1 - health_score) + 2 * random.random(), 1),
            "status": status,
        })

    return timeline


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    logger.info("Generating synthetic CWRU-style bearing fault data...")
    dataset = generate_synthetic_bearing_data()
    for label, windows in dataset.items():
        output_path = OUTPUT_DIR / f"{label}.json"
        with open(output_path, "w") as f:
            json.dump(windows, f, indent=2)
        logger.info(f"  {label}: {len(windows)} windows → {output_path}")

    logger.info("Generating device lifecycle time-series...")
    lifecycle = generate_device_lifecycle_series()
    lifecycle_path = OUTPUT_DIR / "device_lifecycle.json"
    with open(lifecycle_path, "w") as f:
        json.dump(lifecycle, f, indent=2)
    logger.info(f"  lifecycle: {len(lifecycle)} hours → {lifecycle_path}")

    summary = {
        "fault_classes": list(dataset.keys()),
        "samples_per_class": len(dataset["normal"]),
        "window_size": WINDOW_SIZE,
        "sample_rate": SAMPLE_RATE,
        "lifecycle_hours": len(lifecycle),
        "features": ["rms", "peak", "kurtosis", "crest_factor"],
    }
    with open(OUTPUT_DIR / "summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    logger.info("Data preprocessing complete")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()

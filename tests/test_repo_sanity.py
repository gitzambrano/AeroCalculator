import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class TestRepositorySanity(unittest.TestCase):
    """Protects QR-5 and QR-8."""

    def test_check_repo(self):
        proc = subprocess.run(
            [sys.executable, str(ROOT / "tools/check_repo.py")],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)

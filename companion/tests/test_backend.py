import json
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch

from context_companion.model import Config, Rule, Override, Foreground, BrowserContext
from context_companion.engine import ContextEngine
from context_companion.device import HidDevice, SimulatedDevice
from context_companion.keycodes import parse_keycode


class EngineTests(unittest.TestCase):
    def setUp(self):
        self.now = 10.
        self.device = SimulatedDevice()
        self.config = Config([Override(0, 'plain', 4)], [Rule('Onshape', overrides=[Override(0, 'stored')])])
        self.engine = ContextEngine(self.config, self.device, clock=lambda: self.now)
        self.engine.pause(False)
        self.fg = Foreground('chrome.exe', '', 50)
        self.browser = BrowserContext('https://cad.onshape.com', '', True, 10, 'chrome.exe', 50)

    def test_onshape_restores_stored_without_rewriting_it(self):
        self.engine.tick(self.fg, self.browser)
        self.assertEqual(self.engine.status['context'], 'Onshape')
        self.assertEqual(self.device.active, [])
        self.engine.tick(Foreground('notepad.exe', '', 60), self.browser)
        self.assertEqual(self.device.active[0].mode, 'plain')

    def test_origin_requires_fresh_foreground_window_and_exe(self):
        for changed in [dict(received_at=0), dict(received_at=11), dict(focused=False),
                        dict(window_handle=51), dict(browser='msedge.exe'),
                        dict(origin='https://cad.onshape.com.evil.example')]:
            with self.subTest(changed=changed):
                browser = BrowserContext(**{**self.browser.__dict__, **changed})
                self.engine.tick(self.fg, browser)
                self.assertEqual(self.engine.status['context'], 'Default')

    def test_bridge_dict_and_order(self):
        self.config.rules.append(Rule('Second', overrides=[Override(1)]))
        self.engine.tick(self.fg, dict(origin=self.browser.origin, browser_exe='chrome.exe',
                                    focused=True, observed_at=10, window_handle=50))
        self.assertEqual(self.engine.status['context'], 'Onshape')

    def test_renew_and_pause(self):
        self.engine.tick(Foreground('notepad.exe'))
        self.now += 1.1
        self.engine.tick(Foreground('notepad.exe'))
        self.assertEqual(self.device.events[-1][0], 'renew')
        self.engine.pause(True)
        self.assertEqual(self.device.active, [])

    def test_pin_and_defaults_override(self):
        self.engine.pin('Onshape')
        self.engine.tick(Foreground('notepad.exe', '', 60))
        self.assertEqual(self.engine.status['context'], 'Onshape')
        self.engine.typing(True)
        self.engine.tick(Foreground('notepad.exe', '', 60))
        self.assertEqual(self.engine.status['context'], 'Default')
        self.engine.tick(Foreground('another.exe', '', 61))
        self.assertEqual(self.engine.status['context'], 'Onshape')

    def test_failure_does_not_claim_success_and_requires_enable(self):
        with patch.object(self.device, 'replace', side_effect=OSError('Unplugged')):
            self.engine.tick(self.fg)
        self.assertEqual(self.engine.status['state'], 'Error')
        self.assertTrue(self.engine.paused)
        self.engine.pause(False)
        self.engine.tick(self.fg)
        self.assertEqual(self.engine.status['state'], 'Following')


class TransportTests(unittest.TestCase):
    def device(self):
        d = HidDevice.__new__(HidDevice)
        d.capacity, d.count, d.transaction, d._next_transaction = 32, 256, 0, 1
        return d

    def test_atomic_stage_then_commit(self):
        d = self.device()
        calls = []
        def command(cmd, payload=b''):
            calls.append((cmd, payload))
            return bytes([0xdf, cmd, 0])
        d._command = command
        d.replace([Override(0, 'plain', 4), Override(1, 'dance', dance=(4, 5, 6, 7, 200))])
        self.assertEqual([x[0] for x in calls], [0x23, 0x23, 0x24])
        self.assertEqual(struct.unpack('<HHB5H', calls[0][1]), (2, 0, 1, 4, 0, 0, 0, 0))
        self.assertEqual(struct.unpack('<HHB5H', calls[1][1]), (2, 1, 0, 4, 5, 6, 7, 200 | 0x8000))
        self.assertEqual(d.transaction, 2)

    def test_failed_stage_never_commits_or_updates_acknowledged_transaction(self):
        d = self.device()
        calls = []
        def command(cmd, payload=b''):
            calls.append(cmd)
            return bytes([0xdf, cmd, 1])
        d._command = command
        with self.assertRaises(RuntimeError):
            d.replace([Override(0)])
        self.assertEqual(calls, [0x23])
        self.assertEqual(d.transaction, 0)

    def test_invalid_batch_is_rejected_before_first_stage(self):
        d = self.device()
        with patch.object(d, '_command') as command:
            with self.assertRaises(ValueError):
                d.replace([Override(0), Override(256)])
            command.assert_not_called()

    def test_onboard_read_normalizes_enable_bit_for_millisecond_editor(self):
        d = self.device()
        d.count = 1
        d._command = lambda *args: bytes([0xdf, 1, 0, 0]) + struct.pack('<5H', 4, 5, 6, 7, 0x8000 | 200)
        self.assertEqual(d.stored_dances(), [(4, 5, 6, 7, 200)])

    def test_expired_or_replaced_lease_is_not_reported_renewed(self):
        d = self.device()
        d.transaction = 7
        d._command = lambda cmd, payload=b'': bytes([0xdf, cmd, 0, 1, 32, 0, 0, 0, 0, 0, 0, 1])
        with self.assertRaisesRegex(RuntimeError, 'expired'):
            d.renew()


class ConfigTests(unittest.TestCase):
    def test_roundtrip_and_invalid_save_preserves_file(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'config.json'
            config = Config([Override(0)], [Rule('Onshape')])
            config.save(path)
            self.assertEqual(Config.load(path).rules[0].name, 'Onshape')
            original = path.read_bytes()
            config.defaults.append(Override(0))
            with self.assertRaises(ValueError):
                config.save(path)
            self.assertEqual(path.read_bytes(), original)

    def test_numeric_codes_are_not_digit_keys(self):
        self.assertEqual(parse_keycode('4'), 4)
        self.assertEqual(parse_keycode('KC_4'), 33)
        self.assertEqual(parse_keycode('A'), 4)
        self.assertEqual(parse_keycode('0x0004'), 4)


if __name__ == '__main__':
    unittest.main()

"""Sval RawHID client. Never writes persistent keymap or tap-dance storage."""
import secrets
import struct
import time


class SimulatedDevice:
    def __init__(self):
        self.active = []
        self.capacity = 32
        self.count = 256
        self.transaction = 0
        self.events = []

    def stored_dances(self):
        return [(4+i % 26, 0, 5+i % 26, 0, 200) for i in range(self.count)]

    def replace(self, overrides):
        if len(overrides) > self.capacity:
            raise ValueError('Too many overrides (maximum 32)')
        for item in overrides:
            item.validate()
            if item.index >= self.count:
                raise ValueError('Tap dance index exceeds device capacity')
        self.active = list(overrides)
        self.transaction += 1
        self.events.append(('replace', len(overrides)))

    def renew(self):
        self.events.append(('renew', self.transaction))

    def clear(self):
        self.active = []
        self.events.append(('clear',))

    def close(self):
        self.clear()


class HidDevice:
    @staticmethod
    def discover():
        import hid
        return [d for d in hid.enumerate() if
                (d.get('usage_page'), d.get('usage')) in ((0xff61, 0x62), (0xff60, 0x61), (0xff60, 0x62))
                and str(d.get('serial_number', '')).lower().startswith(('sval:', 'viable:'))]

    def __init__(self, info):
        import hid
        self.handle = hid.device()
        self.client_id = 0
        self.client_expiry = 0
        self.transaction = 0
        self._next_transaction = secrets.randbelow(65534) + 1
        try:
            self.handle.open_path(info['path'])
            self._bootstrap()
            info_response = self._command(0)
            if not info_response[14] & 0x10:
                raise RuntimeError('This firmware lacks context overrides. Flash the context-enabled firmware first.')
            status = self._command(0x22)
            self._ok(status)
            if status[3] != 1:
                raise RuntimeError('Unsupported context protocol version')
            self.capacity, self.count = status[4], int.from_bytes(status[10:12], 'little')
            if not 0 < self.capacity <= 32 or not 0 < self.count <= 65535:
                raise RuntimeError('Invalid context capability response')
            self.clear()
        except Exception:
            self.handle.close()
            raise

    def _write(self, report):
        if len(report) > 32:
            raise ValueError('HID report too large')
        result = self.handle.write(bytes([0]) + report.ljust(32, b'\0'))
        if result < 0:
            raise OSError('Keyboard write failed')

    def _read_until(self, accept):
        deadline = time.monotonic() + 0.75
        while time.monotonic() < deadline:
            data = bytes(self.handle.read(32, 100))
            if len(data) == 32 and accept(data):
                return data
        raise TimeoutError('Keyboard did not acknowledge the command; reconnect and enable again')

    def _bootstrap(self):
        nonce = secrets.token_bytes(20)
        self._write(b'\xdd' + bytes(4) + nonce)
        answer = self._read_until(lambda d: d[:5] == b'\xdd' + bytes(4) and d[5:25] == nonce)
        self.client_id = int.from_bytes(answer[25:29], 'little')
        if not self.client_id:
            raise RuntimeError('Keyboard refused a client connection')
        self.client_expiry = time.monotonic() + 50

    def _command(self, command, payload=b''):
        if time.monotonic() >= self.client_expiry:
            self._bootstrap()
        prefix = b'\xdd' + self.client_id.to_bytes(4, 'little')
        self._write(prefix + bytes([0xdf, command]) + payload)
        response = self._read_until(lambda d: d[:5] == prefix and
                                    (d[5] == 0xff or (d[5] == 0xdf and d[6] == command)))
        if response[5] == 0xff:
            self.client_expiry = 0
            raise RuntimeError(f'Keyboard rejected client request (code {response[6]}); reconnect')
        return response[5:]

    @staticmethod
    def _ok(response):
        if response[2]:
            raise RuntimeError(f'Keyboard rejected context command (status {response[2]})')

    def stored_dances(self):
        entries = [struct.unpack('<5H', self._command(1, struct.pack('<H', i))[4:14]) for i in range(self.count)]
        return [(*entry[:4], entry[4] & 0x7fff) for entry in entries]

    def replace(self, overrides):
        if len(overrides) > self.capacity:
            raise ValueError(f'Too many overrides (maximum {self.capacity})')
        for item in overrides:
            item.validate()
            if item.index >= self.count:
                raise ValueError(f'Tap dance {item.index} does not exist on this keyboard')
        if not overrides:
            self.clear()
            return
        self._next_transaction = self._next_transaction % 65535 + 1
        transaction = self._next_transaction
        for item in overrides:
            if item.mode == 'stored':
                raise ValueError('Stored entries must be omitted from the override transaction')
            dance = (item.keycode, 0, 0, 0, 0) if item.mode == 'plain' else (*item.dance[:4], item.dance[4] | 0x8000)
            payload = struct.pack('<HHB5H', transaction, item.index, item.mode == 'plain', *dance)
            self._ok(self._command(0x23, payload))
        self._ok(self._command(0x24, struct.pack('<H', transaction)))
        self.transaction = transaction

    def renew(self):
        if self.transaction:
            self._ok(self._command(0x24, struct.pack('<H', self.transaction)))
            status = self._command(0x22)
            self._ok(status)
            if int.from_bytes(status[6:8], 'little') != self.transaction:
                raise RuntimeError('Keyboard context expired or another companion replaced it')

    def clear(self):
        self._ok(self._command(0x25))
        self.transaction = 0

    def close(self):
        try:
            self.clear()
        finally:
            self.handle.close()

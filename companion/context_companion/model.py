"""Portable configuration and foreground context types."""
from dataclasses import dataclass, field, asdict
import json
import os
from pathlib import Path
import tempfile
from urllib.parse import urlsplit


def origin_of(value: str) -> str:
    p = urlsplit(value)
    if p.scheme not in ('http', 'https') or not p.hostname or p.username or p.password:
        raise ValueError('Origin must be an http(s) origin')
    port = p.port
    return f'{p.scheme}://{p.hostname.lower()}' + (f':{port}' if port and port != (443 if p.scheme == 'https' else 80) else '')


@dataclass
class Override:
    index: int
    mode: str = 'plain'
    keycode: int = 4
    dance: tuple[int, ...] = (0, 0, 0, 0, 200)

    def validate(self):
        if type(self.index) is not int or not 0 <= self.index <= 65535:
            raise ValueError('Tap dance index must be 0..65535')
        if self.mode not in ('stored', 'plain', 'dance'):
            raise ValueError('Unknown override mode')
        if type(self.keycode) is not int or not 0 <= self.keycode <= 65535:
            raise ValueError('Keycode must be 0..65535')
        if self.mode == 'plain' and self.keycode > 0x1fff:
            raise ValueError('Immediate keys support basic or modified QMK keycodes up to 0x1FFF')
        if len(self.dance) != 5 or any(type(x) is not int or not 0 <= x <= 65535 for x in self.dance):
            raise ValueError('Dance requires four keycodes and a 16-bit tapping term')
        if self.mode == 'dance' and not 1 <= self.dance[4] <= 32767:
            raise ValueError('Tapping term must be 1..32767 milliseconds')


@dataclass
class Rule:
    name: str
    exe: str = 'chrome.exe'
    origin: str = 'https://cad.onshape.com'
    overrides: list[Override] = field(default_factory=list)
    enabled: bool = True


@dataclass
class Config:
    defaults: list[Override] = field(default_factory=list)
    rules: list[Rule] = field(default_factory=list)
    schema_version: int = 1

    def validate(self):
        if self.schema_version != 1:
            raise ValueError('Unsupported configuration version')
        names = set()
        for rule in self.rules:
            if not rule.name.strip() or rule.name in names:
                raise ValueError('Context names must be nonempty and unique')
            names.add(rule.name)
            if not rule.exe or '/' in rule.exe or '\\' in rule.exe:
                raise ValueError('Application must be an executable basename')
            if rule.origin:
                origin_of(rule.origin)
        for group in [self.defaults] + [r.overrides for r in self.rules]:
            seen = set()
            for item in group:
                item.validate()
                if item.index in seen:
                    raise ValueError('Duplicate tap dance index in one context')
                seen.add(item.index)

    @classmethod
    def load(cls, path):
        path = Path(path)
        if not path.exists():
            return cls()
        data = json.loads(path.read_text(encoding='utf-8'))
        result = cls(defaults=[Override(**x) for x in data.get('defaults', [])],
                     rules=[Rule(**{**r, 'overrides': [Override(**x) for x in r.get('overrides', [])]}) for r in data.get('rules', [])],
                     schema_version=data.get('schema_version', 1))
        result.validate()
        return result

    def save(self, path):
        self.validate()
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as handle:
                temporary = handle.name
                json.dump(asdict(self), handle, indent=2)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, path)
        finally:
            if temporary and os.path.exists(temporary):
                os.unlink(temporary)


@dataclass
class Foreground:
    exe: str = ''
    title: str = ''
    hwnd: int = 0


@dataclass
class BrowserContext:
    origin: str = ''
    title: str = ''
    focused: bool = False
    received_at: float = 0.0
    browser: str = 'chrome.exe'
    window_handle: int = 0

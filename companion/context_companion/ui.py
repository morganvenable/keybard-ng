"""Native draft editor. All device changes require an explicit Enable action."""
from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import time
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, ttk

from . import device, engine, keycodes, model, windows


class App:
    def __init__(self, root, browser_provider=None, demo=False, browser_bridge=None):
        self.worker = ThreadPoolExecutor(max_workers=1, thread_name_prefix="keyboard-io")
        self.pending = []
        self.closing = False
        self.root = root
        self.browser_provider = browser_provider or (lambda: None)
        self.browser_bridge = browser_bridge
        self.config = model.Config(defaults=[], rules=[])
        self.device = None
        self.engine = None
        self.dances = []
        self.path = None
        self.settings_dir = Path(os.environ.get("LOCALAPPDATA", Path.home() / ".config")) / "KeybardContext"
        self.enabled = False
        self.demo = demo
        self.demo_seeded = demo
        self.devices = []
        self.selected_rule = None
        self.root.title("Keybard Context — Windows draft")
        self.root.geometry("1100x780")
        self.root.minsize(920, 650)
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self._build()
        self.refresh_devices()
        if not demo:
            self.restore_config()
        if demo:
            self.config = model.Config(defaults=[model.Override(index=0, mode="plain", keycode=4)], rules=[model.Rule(name="Onshape", overrides=[model.Override(index=0, mode="stored")])])
            self.refresh_rules()
            self.connect()
        self.root.after(250, self.tick)

    def _build(self):
        outer = ttk.Frame(self.root, padding=16)
        outer.pack(fill="both", expand=True)
        ttk.Label(outer, text="Context-specific tap dances", font=("Segoe UI", 20, "bold")).pack(anchor="w")
        ttk.Label(outer, text="Keep your layout. Override selected tap-dance behaviors for an app or website.").pack(anchor="w", pady=(4, 14))
        connection = ttk.Frame(outer)
        connection.pack(fill="x")
        self.device_choice = ttk.Combobox(connection, state="readonly", width=55)
        self.device_choice.pack(side="left")
        ttk.Button(connection, text="Refresh", command=self.refresh_devices).pack(side="left", padx=4)
        ttk.Button(connection, text="Connect / read", command=self.connect).pack(side="left")
        self.enable_button = ttk.Button(connection, text="Enable automation", command=self.toggle_enabled, state="disabled")
        self.enable_button.pack(side="left", padx=4)
        self.status = tk.StringVar(value="Disconnected. Connect to read your existing tap dances.")
        ttk.Label(outer, textvariable=self.status, wraplength=1040).pack(anchor="w", pady=(10, 4))
        self.context_status = tk.StringVar(value="Browser context requires the companion extension; app matching works without it.")
        ttk.Label(outer, textvariable=self.context_status, wraplength=1040).pack(anchor="w", pady=(0, 10))
        simulator = ttk.Frame(outer)
        simulator.pack(fill="x", pady=(0, 8))
        ttk.Label(simulator, text="Demo context (demo keyboard only):").pack(side="left")
        self.demo_context = ttk.Combobox(simulator, values=("Desktop", "Onshape in Chrome", "Another Chrome tab"), state="readonly", width=26)
        self.demo_context.current(0)
        self.demo_context.pack(side="left", padx=8)

        bar = ttk.Frame(outer)
        bar.pack(fill="x", pady=(0, 10))
        ttk.Button(bar, text="Open config…", command=self.load).pack(side="left")
        ttk.Button(bar, text="Save config…", command=self.save).pack(side="left", padx=4)
        ttk.Button(bar, text="Export onboard snapshot…", command=self.export_snapshot).pack(side="left")
        ttk.Button(bar, text="Use defaults", command=self.typing).pack(side="right")
        ttk.Button(bar, text="Follow apps", command=lambda: self.pin(None)).pack(side="right", padx=4)
        ttk.Button(bar, text="Pin selected context", command=self.pin_selected).pack(side="right")

        if self.browser_bridge:
            bridge_row = ttk.Frame(outer)
            bridge_row.pack(fill="x", pady=(0, 10))
            ttk.Label(bridge_row, text="Browser extension: load browser-extension, then paste this pairing token in its options.").pack(side="left")
            ttk.Button(bridge_row, text="Copy pairing token", command=self.copy_token).pack(side="right")

        pane = ttk.Panedwindow(outer, orient="horizontal")
        pane.pack(fill="both", expand=True)
        left = ttk.Frame(pane, padding=(0, 0, 12, 0))
        right = ttk.Frame(pane)
        pane.add(left, weight=1)
        pane.add(right, weight=3)
        ttk.Label(left, text="Contexts", font=("Segoe UI", 12, "bold")).pack(anchor="w")
        self.rules = tk.Listbox(left, exportselection=False, height=9)
        self.rules.pack(fill="both", expand=True, pady=6)
        self.rules.bind("<<ListboxSelect>>", self.select_rule)
        buttons = ttk.Frame(left)
        buttons.pack(fill="x")
        ttk.Button(buttons, text="Add", command=self.add_rule).pack(side="left")
        ttk.Button(buttons, text="Remove", command=self.remove_rule).pack(side="left", padx=4)
        ttk.Label(left, text="Rules match top to bottom.\nDefault overrides apply otherwise.\nUnlisted dances keep onboard behavior.\n\nOnshape setup:\n1. Default: set a TD to plain.\n2. Add Onshape: same TD → stored.\n3. Enable and focus Onshape.\n\nEdits take effect while enabled. Save to keep them after closing.", wraplength=230).pack(anchor="w", pady=10)

        match = ttk.LabelFrame(right, text="Context matching", padding=10)
        match.pack(fill="x")
        self.rule_name = tk.StringVar()
        self.exe = tk.StringVar()
        self.origin = tk.StringVar()
        self.rule_enabled = tk.BooleanVar(value=True)
        for row, (label, variable) in enumerate((("Name", self.rule_name), ("Executable", self.exe), ("Onshape origin (optional)", self.origin))):
            ttk.Label(match, text=label).grid(row=row, column=0, sticky="w", padx=(0, 12), pady=3)
            ttk.Entry(match, textvariable=variable).grid(row=row, column=1, sticky="ew", pady=3)
        match.columnconfigure(1, weight=1)
        ttk.Checkbutton(match, text="Rule enabled", variable=self.rule_enabled).grid(row=3, column=0, sticky="w")
        ttk.Button(match, text="Apply rule", command=self.apply_rule).grid(row=3, column=1, sticky="e")

        self.override_list = ttk.Treeview(right, columns=("index", "mode", "details"), show="headings", height=5)
        for col, title, width in (("index", "TD index", 75), ("mode", "Behavior", 110), ("details", "Definition", 370)):
            self.override_list.heading(col, text=title)
            self.override_list.column(col, width=width)
        self.override_list.pack(fill="both", expand=True, pady=10)
        self.override_list.bind("<<TreeviewSelect>>", self.select_override)

        edit = ttk.LabelFrame(right, text="Behavior override", padding=10)
        edit.pack(fill="x")
        self.index = tk.StringVar(value="0")
        self.mode = tk.StringVar(value="plain")
        self.code = tk.StringVar(value="KC_A")
        self.actions = [tk.StringVar(value=x) for x in ("KC_A", "KC_NO", "KC_NO", "KC_NO", "200")]
        ttk.Label(edit, text="Onboard tap-dance index").grid(row=0, column=0, sticky="w")
        self.index_choice = ttk.Combobox(edit, textvariable=self.index, width=10)
        self.index_choice.grid(row=0, column=1, sticky="w")
        ttk.Button(edit, text="Copy onboard definition", command=self.copy_onboard).grid(row=0, column=2, columnspan=2, sticky="e")
        ttk.Label(edit, text="Behavior").grid(row=1, column=0, sticky="w", pady=5)
        ttk.Combobox(edit, textvariable=self.mode, values=("plain", "dance", "stored"), state="readonly", width=15).grid(row=1, column=1, sticky="w")
        ttk.Label(edit, text="Ordinary key code").grid(row=1, column=2, padx=(10, 4))
        ttk.Entry(edit, textvariable=self.code, width=12).grid(row=1, column=3)
        labels = ("Tap", "Hold", "Double tap", "Tap then hold", "Term (ms)")
        fields = ttk.Frame(edit)
        fields.grid(row=2, column=0, columnspan=4, sticky="ew", pady=5)
        for col, (label, variable) in enumerate(zip(labels, self.actions)):
            ttk.Label(fields, text=label).grid(row=0, column=col, sticky="w", padx=(0, 8))
            ttk.Entry(fields, textvariable=variable, width=12).grid(row=1, column=col, sticky="ew", padx=(0, 8))
        ttk.Label(edit, text="Codes: KC_A, KC_ENTER, decimal or 0x hex. 0 = no action. Stored uses the onboard dance.", wraplength=640).grid(row=3, column=0, columnspan=4, sticky="w", pady=5)
        ttk.Button(edit, text="Set override", command=self.set_override).grid(row=4, column=0, sticky="w")
        ttk.Button(edit, text="Remove override / inherit", command=self.remove_override).grid(row=4, column=1, columnspan=3, sticky="e")
        self.refresh_rules()

    def copy_token(self):
        self.root.clipboard_clear()
        self.root.clipboard_append(self.browser_bridge.token)
        self.status.set("Pairing token copied. Paste it in the browser extension options.")

    def refresh_devices(self):
        try:
            self.devices = device.HidDevice.discover()
            labels = ["Demo keyboard (no hardware changes)"] + [str(d.get("product_string") or d.get("product") or "Svalboard") + " — " + str(d.get("serial_number", n)) for n, d in enumerate(self.devices)]
            self.device_choice["values"] = labels
            self.device_choice.current(0)
        except Exception as exc:
            self.devices = []
            self.device_choice["values"] = ["Demo keyboard (no hardware changes)"]
            self.device_choice.current(0)
            self.status.set(f"Device discovery unavailable: {exc}. Demo is available.")

    def submit(self, action, callback=None):
        self.pending.append((self.worker.submit(action), callback))

    def poll_results(self):
        while self.pending and self.pending[0][0].done():
            future, callback = self.pending.pop(0)
            try:
                result = future.result()
                if callback:
                    callback(result)
            except Exception as exc:
                self.enabled = False
                self.enable_button.configure(text="Enable automation")
                if not self.closing:
                    self.error(exc)

    def connect(self):
        self.poll_results()
        if self.pending or self.closing:
            self.status.set("Please wait for the current keyboard operation to finish.")
            return
        self.status.set("Connecting and reading onboard tap dances…")
        self.enable_button.configure(state="disabled")
        selection = self.device_choice.current()
        self.demo = selection == 0
        if not self.demo and self.demo_seeded:
            self.config = model.Config()
            self.path = None
            self.demo_seeded = False
            self.refresh_rules()
        config = deepcopy(self.config)
        previous_engine, previous_device = self.engine, self.device
        self.engine, self.device, self.enabled = None, None, False
        info = self.devices[selection - 1] if not self.demo else None

        def work():
            if previous_engine:
                previous_engine.pause(True)
            if previous_device:
                previous_device.close()
            board = device.SimulatedDevice() if info is None else device.HidDevice(info)
            try:
                dances = board.stored_dances()
                resolver = engine.ContextEngine(config, board)
                return board, dances, resolver
            except Exception:
                board.close()
                raise

        def connected(result):
            self.device, self.dances, self.engine = result
            self.index_choice["values"] = tuple(str(n) for n in range(len(self.dances)))
            self.enable_button.configure(state="normal", text="Enable automation")
            self.status.set(f"{'DEMO — ' if self.demo else ''}Connected; {len(self.dances)} onboard tap dances read. Automation paused.")

        self.submit(work, connected)

    def toggle_enabled(self):
        if self.engine and not self.closing:
            enabling = not self.enabled
            self.enabled = enabling
            self.enable_button.configure(text="Pause automation" if enabling else "Enable automation")
            resolver = self.engine
            self.submit(lambda: resolver.pause(not enabling))

    def restore_config(self):
        try:
            pointer = self.settings_dir / "last-config-path.txt"
            if pointer.exists():
                path = pointer.read_text(encoding="utf-8").strip()
                if Path(path).is_file():
                    self.config = model.Config.load(path)
                    self.path = path
                    self.refresh_rules()
                    self.status.set(f"Loaded {Path(path).name}. Connect and explicitly enable automation.")
        except Exception as exc:
            self.status.set(f"Could not restore your last configuration: {exc}. Open a config to recover.")

    def remember_path(self):
        if not self.demo and self.path:
            self.settings_dir.mkdir(parents=True, exist_ok=True)
            (self.settings_dir / "last-config-path.txt").write_text(str(Path(self.path).resolve()), encoding="utf-8")

    def refresh_rules(self, selection=0):
        self.rules.delete(0, "end")
        self.rules.insert("end", "Default behaviors")
        for rule in self.config.rules:
            self.rules.insert("end", rule.name + (" (disabled)" if not rule.enabled else ""))
        selection = min(selection, len(self.config.rules))
        self.rules.selection_set(selection)
        self.select_rule()

    def select_rule(self, _event=None):
        selection = self.rules.curselection()
        if not selection:
            return
        self.selected_rule = self.config.rules[selection[0] - 1] if selection[0] else None
        rule = self.selected_rule
        self.rule_name.set(rule.name if rule else "Default behaviors")
        self.exe.set(rule.exe if rule else "")
        self.origin.set(rule.origin or "" if rule else "")
        self.rule_enabled.set(rule.enabled if rule else True)
        self.refresh_overrides()

    def overrides(self):
        return self.selected_rule.overrides if self.selected_rule else self.config.defaults

    def refresh_overrides(self):
        self.override_list.delete(*self.override_list.get_children())
        for override in self.overrides():
            detail = keycodes.format_keycode(override.keycode) if override.mode == "plain" else ("Stored onboard behavior" if override.mode == "stored" else ", ".join(keycodes.format_keycode(v) for v in override.dance[:4]) + f" · {override.dance[4]} ms")
            self.override_list.insert("", "end", iid=str(override.index), values=(override.index, override.mode, detail))

    def add_rule(self):
        name = simpledialog.askstring("New context", "Context name", initialvalue="Onshape", parent=self.root)
        name = name.strip() if name else ""
        if name:
            if any(r.name == name for r in self.config.rules):
                return self.error(ValueError("Choose a unique context name."))
            self.config.rules.append(model.Rule(name=name, exe="chrome.exe", origin="https://cad.onshape.com", overrides=[], enabled=True))
            self.refresh_rules(len(self.config.rules))

    def remove_rule(self):
        if self.selected_rule:
            self.config.rules.remove(self.selected_rule)
            self.refresh_rules()

    def apply_rule(self):
        if not self.selected_rule:
            return self.error(ValueError("Default behaviors have no app matching rule. Add or select a context first."))
        try:
            name = self.rule_name.get().strip()
            exe = self.exe.get().strip()
            origin = self.origin.get().strip()
            if not name or not exe:
                raise ValueError("Name and executable are required.")
            if '/' in exe or '\\' in exe:
                raise ValueError("Use an executable basename, such as chrome.exe, without a path.")
            if any(r is not self.selected_rule and r.name == name for r in self.config.rules):
                raise ValueError("Context names must be unique.")
            if origin:
                from urllib.parse import urlsplit
                url = urlsplit(origin)
                if url.scheme not in ("http", "https") or not url.netloc or url.path not in ("", "/") or url.query or url.fragment:
                    raise ValueError("Use a website origin such as https://cad.onshape.com, without a path.")
                origin = model.origin_of(origin.rstrip("/"))
                host = urlsplit(origin).hostname
                if urlsplit(origin).scheme != 'https' or not (host == 'onshape.com' or host.endswith('.onshape.com')):
                    raise ValueError("This draft's browser extension supports HTTPS Onshape sites only. Leave origin empty to match a whole app.")
            self.selected_rule.name = name
            self.selected_rule.exe = exe
            self.selected_rule.origin = origin
            self.selected_rule.enabled = self.rule_enabled.get()
            self.refresh_rules(self.rules.curselection()[0])
        except Exception as exc:
            self.error(exc)

    def select_override(self, _event=None):
        selected = self.override_list.selection()
        if not selected:
            return
        item = next(o for o in self.overrides() if o.index == int(selected[0]))
        self.index.set(str(item.index))
        self.mode.set(item.mode)
        self.code.set(keycodes.format_keycode(item.keycode))
        for n, (variable, value) in enumerate(zip(self.actions, item.dance)):
            variable.set(keycodes.format_keycode(value) if n < 4 else str(value))

    @staticmethod
    def number(value):
        value = value.strip()
        return int(value, 16 if value.lower().startswith("0x") else 10)

    def set_override(self):
        try:
            index = self.number(self.index.get())
            if index < 0 or (self.dances and index >= len(self.dances)):
                raise ValueError("Choose an existing onboard tap-dance index.")
            code = keycodes.parse_keycode(self.code.get())
            dance = tuple(keycodes.parse_keycode(v.get()) for v in self.actions[:4]) + (self.number(self.actions[4].get()),)
            override = model.Override(index=index, mode=self.mode.get(), keycode=code, dance=dance)
            override.validate()
            items = self.overrides()
            items[:] = [o for o in items if o.index != index] + [override]
            items.sort(key=lambda o: o.index)
            self.refresh_overrides()
        except Exception as exc:
            self.error(exc)

    def remove_override(self):
        try:
            index = self.number(self.index.get())
            self.overrides()[:] = [o for o in self.overrides() if o.index != index]
            self.refresh_overrides()
        except Exception as exc:
            self.error(exc)

    def copy_onboard(self):
        try:
            index = self.number(self.index.get())
            if index < 0:
                raise ValueError("Index must be nonnegative.")
            for n, (variable, value) in enumerate(zip(self.actions, self.dances[index])):
                variable.set(keycodes.format_keycode(value) if n < 4 else str(value))
            self.mode.set("dance")
        except Exception as exc:
            self.error(ValueError(f"Connect and select an existing tap dance first: {exc}"))

    def load(self):
        path = filedialog.askopenfilename(filetypes=[("Context configuration", "*.json")])
        if not path:
            return
        try:
            config = model.Config.load(path)
            if self.engine:
                resolver = self.engine
                self.submit(lambda: resolver.pause(True))
            self.config = config
            self.demo_seeded = False
            self.enabled = False
            self.enable_button.configure(text="Enable automation")
            self.path = path
            self.remember_path()
            self.refresh_rules()
        except Exception as exc:
            self.error(exc)

    def save(self):
        path = filedialog.asksaveasfilename(initialfile=Path(self.path).name if self.path else "contexts.json", defaultextension=".json", filetypes=[("Context configuration", "*.json")])
        if path:
            try:
                self.config.save(path)
                self.path = path
                self.remember_path()
            except Exception as exc:
                self.error(exc)

    def export_snapshot(self):
        if not self.device:
            return self.error(ValueError("Connect / read a keyboard first."))
        path = filedialog.asksaveasfilename(initialfile="onboard-tap-dances.json", defaultextension=".json")
        if path:
            try:
                Path(path).write_text(json.dumps({"description": "Onboard actions and timing in milliseconds (enabled flag normalized); reference only, not a bit-exact backup or context configuration.", "dances": self.dances}, indent=2), encoding="utf-8")
            except Exception as exc:
                self.error(exc)

    def pin_selected(self):
        if self.selected_rule:
            self.pin(self.selected_rule.name)

    def pin(self, name):
        if self.engine:
            try:
                resolver = self.engine
                config = deepcopy(self.config)
                def work():
                    resolver.config = config
                    resolver.pin(name)
                self.submit(work)
            except Exception as exc:
                self.error(exc)

    def typing(self):
        if self.engine:
            resolver = self.engine
            self.submit(lambda: resolver.typing(True))

    def tick(self):
        self.poll_results()
        if self.closing:
            if not self.pending:
                self.finish_close()
                return
            self.root.after(50, self.tick)
            return
        try:
            foreground = windows.foreground()
            browser = self.browser_provider()
            if self.demo and self.device:
                choice = self.demo_context.get()
                title = "Demo document - Onshape" if choice == "Onshape in Chrome" else "Another tab"
                foreground = model.Foreground(exe="notepad.exe" if choice == "Desktop" else "chrome.exe", title=title, hwnd=1)
                browser = None if choice == "Desktop" else model.BrowserContext(origin="https://cad.onshape.com" if choice == "Onshape in Chrome" else "https://example.com", title=title, focused=True, received_at=time.monotonic(), browser="chrome.exe", window_handle=1)
            browser_origin = browser.get('origin', '') if isinstance(browser, dict) else browser.origin if browser else 'no extension context'
            if not browser_origin or (isinstance(browser, model.BrowserContext) and (not browser.focused or time.monotonic() - browser.received_at > 2.5)):
                browser_origin = 'no current Onshape signal'
            self.context_status.set(f"Active app: {foreground.exe or '(unavailable)'} · Browser: {browser_origin}")
            if self.engine and not self.pending:
                resolver = self.engine
                config = deepcopy(self.config)
                def work():
                    resolver.config = config
                    return dict(resolver.tick(foreground, browser))
                self.submit(work, self.show_state)
        except Exception as exc:
            self.status.set(f"Error: {exc}")
        self.root.after(250, self.tick)

    def error(self, exc):
        self.status.set(f"Error: {exc}")
        messagebox.showerror("Keybard Context", str(exc), parent=self.root)

    def show_state(self, state):
        if state.get('state') == 'Error':
            self.enabled = False
            self.enable_button.configure(text="Enable automation")
        self.status.set(("DEMO — " if self.demo else "") + f"{state.get('state', '')} · Context: {state.get('context', 'Default')} · Applied overrides: {state.get('applied_count', 0)}" + (f" · {state['error']}" if state.get('error') else ""))

    def close(self):
        if not self.closing:
            self.closing = True
            self.status.set("Restoring onboard behavior and closing…")

    def finish_close(self):
        resolver, board = self.engine, self.device
        self.engine, self.device = None, None
        def work():
            try:
                if resolver:
                    resolver.pause(True)
            finally:
                if board:
                    board.close()
        def done(_):
            self.worker.shutdown(wait=False)
            self.root.destroy()
        # Process errors too: firmware lease expiry is the recovery if unplugged.
        def safe_work():
            try:
                work()
            except Exception:
                pass
        self.submit(safe_work, done)
        self.root.after(50, self.close_poll)

    def close_poll(self):
        self.poll_results()
        if self.pending:
            self.root.after(50, self.close_poll)


def run(browser_provider=None, demo=False, browser_bridge=None, smoke_test=False):
    root = tk.Tk()
    app = App(root, browser_provider=browser_provider, demo=demo, browser_bridge=browser_bridge)
    if smoke_test:
        root.after(750, app.close)
    root.mainloop()

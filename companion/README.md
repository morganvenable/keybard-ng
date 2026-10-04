# Keybard Context — Windows draft

A native companion for **context-specific tap-dance variants**, without changing numbered layers or rewriting the keyboard's saved definitions. Your existing tap-dance key can send an ordinary key outside Onshape and use its stored dance (or an alternate dance) inside Onshape.

This is an experimental first Windows draft. It has no cloud dependency, input hook, or automatic firmware flashing. It starts **paused**, including after restarting with a saved configuration.

## Download and run

In this repository's **Actions → Windows Context Companion Draft**, open a successful run and download its `KeybardContext-Windows-…` artifact. Extract both the artifact and the included `KeybardContext-Windows.zip`. Keep the entire `KeybardContext` folder together, then run `KeybardContext.exe`. This first draft is not code-signed.

Try the interface with `KeybardContext.exe --demo` before connecting hardware. The demo uses a simulated keyboard and offers Desktop / Onshape / Other browser tab scenarios. It never opens a HID device.

For a source checkout on Windows with Python 3.12:

```powershell
cd companion
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m context_companion --demo
# Real hardware:
.venv\Scripts\python -m context_companion
```

## Matching firmware is required

Ordinary Sval firmware does not implement the RAM context protocol. The companion probes the feature bit and refuses to enable on unsupported firmware. The draft firmware source is in [morganvenable/sval-qmk, feat/context-tap-dance](https://github.com/morganvenable/sval-qmk/tree/feat/context-tap-dance). Its `modules/svalboard/core/docs/CONTEXT_OVERRIDES.md` documents the protocol.

Export your current layout through Keybard before installing experimental firmware. Choose the UF2 for your exact board side and pointing sensor, using the existing Svalboard flashing procedure. Generic left/right builds do not replace PMW3360/PMW3389/trackpoint builds. The companion never flashes a board for you.

Close Keybard/Vial device connections before connecting this draft. It serializes its own HID traffic, but is not a general multi-client broker. Run one companion instance per keyboard. A second instance's clear/commit commands can replace the first instance's temporary state.

## Try an existing Onshape tap dance

1. Start the companion, select your keyboard, and **Connect / read**. It reads the stored tap-dance definitions. Export the onboard snapshot if desired; this is a tap-dance reference, not a full layout backup.
2. In **Default**, add an override for the tap-dance index you want to simplify. Choose **plain** and an ordinary key, such as `KC_A`. Indices are zero-based; verify the corresponding dance in Keybard first.
3. Add an **Onshape** context. Set the executable to `chrome.exe` or `msedge.exe`, and the origin to `https://cad.onshape.com` (or your actual Onshape origin).
4. In that context, add the same tap-dance index with **stored**. This restores the keyboard's saved dance while Onshape is active. Alternatively choose **dance**, enter tap/hold/double/tap-hold actions and timing, and use an entirely different temporary definition.
5. Pair the browser extension below. Then explicitly **Enable** the companion.
6. Switch between an Onshape canvas and another browser tab/application. The status should change between Onshape and Default. Test an ordinary key first in a disposable document.
7. **Pause** or quit to restore all stored keyboard behavior. **Use defaults** temporarily applies your Default overrides; **Pin** holds the selected context across focus changes.

`examples/onshape.json` is an illustration using **TD index 0 and KC_A**, not a recommendation for your actual layout. Change it before enabling on hardware. It is never loaded automatically for a real connection.

## Pair Chrome or Edge

1. Open `chrome://extensions` or `edge://extensions` and turn on Developer mode.
2. Choose **Load unpacked** and select the included `browser-extension` folder.
3. In the companion, copy the browser pairing token. Open the extension's options (click its toolbar action), paste the token, and choose **Save and test connection**.
4. Reload already-open Onshape tabs. Keep Onshape's tab and browser window focused.

The extension sends only the HTTPS Onshape **origin**, focus state, browser identity, and sequence/timing metadata to `127.0.0.1:19732`. It does not send document names, full URLs, model contents, or keystrokes. It has access to Onshape and the loopback endpoint, not all browsing URLs. A stored random token authenticates requests. Incognito is excluded. Only Chrome and Edge are supported by this draft's browser provider.

Onshape context expires after 2.5 seconds without a fresh observation. The receiver binds observations to the locally foreground browser window and the engine checks that identity again. Browser notifications and OS focus cannot be atomic; rapid same-browser/profile/window switches retain a short race. No sketch-mode, text-field, or game-state detection is claimed. “Onshape active” includes its editable fields; use Defaults/Pause or suitable mappings when typing there.

## Behavior and recovery

- Default overrides apply while enabled; the first enabled matching rule overlays them. Unspecified dance indices inherit.
- **stored** removes the host override for an index, revealing the saved onboard definition.
- **plain** sends a basic HID key or modified basic key immediately, without the tap-dance wait. It does not support layer keys, macros, or other synthetic actions.
- **dance** uses four QMK keycodes plus a 1–32767 ms tapping term. Common `KC_` names and numeric codes are accepted; advanced codes must match your firmware's definitions.
- A started gesture retains its original definition and timing through release, even if the context changes.
- Up to 32 overrides can be active at once. Definitions are staged in RAM and committed together; the app renews a five-second firmware lease.
- If the app crashes or USB control traffic stops, new gestures return to **stored onboard behavior** after lease expiry. That may be your original Onshape dance, not an ordinary key. A disconnected host cannot keep its Default overrides installed. Active held gestures still finish with their original definition.
- Pause and normal exit explicitly clear temporary overrides. Exceptions pause automation; a failed clear still relies on the lease expiry.
- The draft never sends persistent tap-dance/keymap/save commands. Existing layers, assignments, and calibration remain unchanged.
- Config is tied to numeric tap-dance indices in this first draft. Recheck it after changing your layout; stable layout-revision binding is future work. Configuration and pairing token are local, under your Windows user profile.

The application window remains available while enabled; minimize it as needed. Closing exits and clears overrides. Tray startup, automatic reconnect, general website matching, and a Keybard web editor bridge are not part of this draft.

## Build and validate

On Windows, run `./build-windows.ps1` from PowerShell with `python` pointing at your Python 3.12 environment. It runs tests, launches/closes the native demo UI, builds with PyInstaller, smoke-tests the packaged executable, and creates `dist/KeybardContext-Windows.zip`.

```sh
# Portable logic, protocol and receiver tests (no keyboard):
cd companion
python -m unittest discover -s tests -v
node --test browser-extension/tests/*.test.cjs
```

The GitHub workflow runs Windows packaging and a separate Linux logic-test job. Tests with fake HID establish protocol behavior, not end-to-end physical keyboard correctness. Real hardware and interactive Windows/browser checks remain necessary.

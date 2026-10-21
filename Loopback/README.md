# Loopback

Loopback is a Scripting script for pairing an iOS device and keeping a shared native RSD tunnel ready for other scripts.

The script stores pairing credentials **only in its own Keychain**. It never returns a pairing record, private key, PSK, or pairing file to another script.

## User flow

Run Loopback directly from Scripting to open its pairing UI. If a pairing already exists, the same page shows the current record and connection controls. The UI supports PIN pairing and importing/exporting pairing files.

After a pairing record exists:

- `ensureTunnel` opens a tunnel directly when needed.
- It does not show the UI for an already paired device.
- The entry page is shown whenever Loopback starts, including a ScriptSession cold start.
- Closing the page only dismisses the UI; the script remains alive and keeps serving ScriptSession commands.
- When the script resumes, it checks whether the page is already open. If it was closed, the page is presented again; an already visible page is not duplicated.
- After pairing, close the page if desired. Other scripts can call `ensureTunnel` and then attach their own RSD tunnel handle.
- `status` and `releaseTunnel` do not present an additional page.

The UI chooses Simplified Chinese when `Device.systemLocale` starts with `zh`; all other locales fall back to English.

## Public ScriptSession service

Loopback registers one serial public service with `ScriptSession.serve`. Commands are JSON-only:

| Command | Result | UI |
| --- | --- | --- |
| `status` | `paired`, `tunnel_open`, or `not_paired` | Never opens UI |
| `ensureTunnel` | Ensures Loopback's own tunnel handle is ready | Opens pairing UI only when no pairing exists |
| `releaseTunnel` | Releases Loopback's own handle | Never opens UI |

Example client:

```ts
// Script B: no import is needed for ScriptSession, VPN, or DeviceServices.
async function main() {
  const state = await ScriptSession.call<{
    status: "paired" | "tunnel_open" | "not_paired" | "error";
    ready?: boolean;
    message?: string;
  }>({
    name: "Loopback",
    message: { command: "ensureTunnel" },
    timeout: 180000,
  });

  if (state.status !== "tunnel_open" || state.ready !== true) {
    throw new Error(state.message ?? `Loopback is not ready: ${state.status}`);
  }

  // The reply is only an acknowledgement. B owns a separate native handle.
  const tunnel = await VPN.localDevVPN.attachRSDTunnel();
  if (!tunnel) throw new Error("The tunnel is no longer ready");

  try {
    const services = await tunnel.listServices({ refresh: true });
    const name = "com.apple.mobile.diagnostics_relay.shim.remote";
    if (!services.some(service => service.name === name)) {
      throw new Error(`Service not found: ${name}`);
    }

    const session = await DeviceServices.openRSDSession(tunnel);
    try {
      const service = await session.openService({ serviceName: name });
      try {
        await service.connection.writePlist({
          Request: "IORegistry",
          EntryClass: "IOPMPowerSource",
        });
        const response = await service.connection.readPlist({ timeout: 30000 });
        if (response === null) throw new Error("The device closed the service");
        console.log(response);
      } finally {
        await service.close();
      }
    } finally {
      await session.close();
    }
  } finally {
    // B releases only B's handle. Do not call releaseTunnel here.
    await tunnel.close();
  }
}

void main().catch(console.error);
```

A reusable client wrapper is available at `client/loopback.ts`:

```ts
import {
  attachLoopbackTunnel,
  loopbackStatus,
  openLoopback,
} from "./kit/loopback";

let state = await loopbackStatus();
if (state.status !== "tunnel_open") state = await openLoopback();
if (state.status !== "tunnel_open") throw new Error(state.message ?? state.status);

const tunnel = await attachLoopbackTunnel();
if (!tunnel) throw new Error("Loopback tunnel unavailable");
```

## Ownership and cleanup

Loopback owns the handle it creates or attaches. A client script owns the handle returned by `attachRSDTunnel()`.

- B closes its service with `service.close()`.
- B closes its `RSDSession` with `session.close()`.
- B closes its own tunnel handle with `tunnel.close()`.
- B must not call Loopback's `releaseTunnel` during normal cleanup.
- Call `releaseTunnel` only when you explicitly want Loopback to release its own handle.
- Closing one handle does not close other scripts' handles.
- The last native handle is reclaimed after its connections are closed.

`ScriptSession.call` timeouts do not roll back work already accepted by Loopback. `ScriptSession.serve` is serial, so concurrent `ensureTunnel` requests are queued and reuse the same ready handle.

## Security boundary

Pairing records contain private credentials. They remain in Loopback's Keychain and are used only by Loopback's pairing/tunnel implementation. Client scripts receive status only and use native attach; they never need pairing data.

The shared Storage domain may contain non-secret connection settings and an informational tunnel-holder marker, but it must not contain pairing credentials.

## Files

- `index.tsx`: UI entry and ScriptSession service.
- `core/i18n.ts`: locale selection and bilingual helper.
- `client/loopback.ts`: client-side ScriptSession and attach wrapper.
- `core/pairing.ts`: Keychain-only pairing storage and import/export.
- `kit/session.ts`: pairing, tunnel creation, and native RSD service discovery.
- `kit/hub.ts`: the single Loopback-owned session.
- `pages/`: pairing, compatibility, settings, and shared UI.

See [README-zh.md](README-zh.md) for the Chinese version.

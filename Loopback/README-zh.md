# 回环（Loopback）

回环是一个 Scripting 脚本，用于配对 iOS 设备，并为其他脚本准备可共享的原生 RSD 隧道。

配对凭据**只保存在回环脚本自己的 Keychain**。回环不会向其他脚本返回配对记录、私钥、PSK 或配对文件。

## 用户使用方式

直接从 Scripting 运行“回环”，即可打开配对页面。已有配对记录时，页面会显示当前记录和连接控制。页面支持 PIN 配对，以及配对文件的导入和导出。

已有配对记录后：

- `ensureTunnel` 需要时直接开启隧道。
- 已配对的设备不会因为开启隧道而打开页面。
- Loopback 每次启动都会打开入口页面，包括 ScriptSession 冷启动。
- 关闭页面只关闭 UI，不退出脚本；脚本会继续提供 ScriptSession 服务。
- 脚本恢复运行时会先判断页面是否仍在显示。页面已关闭时重新打开；页面仍在显示时不会重复打开。
- 配对完成后可以关闭页面，其他脚本直接调用 `ensureTunnel`，再 attach 自己的 RSD 隧道句柄。
- `status` 和 `releaseTunnel` 不会额外展示页面。

UI 根据 `Device.systemLocale` 选择语言：以 `zh` 开头时使用简体中文，其他语言回退英文。

## ScriptSession 服务

回环通过 `ScriptSession.serve` 注册一个串行公共服务。命令和返回值均为 JSON：

| 命令 | 结果 | 是否打开 UI |
| --- | --- | --- |
| `status` | `paired`、`tunnel_open` 或 `not_paired` | 从不打开 |
| `ensureTunnel` | 确保回环自己的隧道句柄可用 | 只有没有配对记录时打开配对页 |
| `releaseTunnel` | 释放回环自己的句柄 | 从不打开 |

其他脚本示例：

```ts
// 脚本 B：ScriptSession、VPN、DeviceServices 都是全局 API，不需要导入。
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
    throw new Error(state.message ?? `回环未就绪：${state.status}`);
  }

  // 返回值只是确认；B 要取得自己的原生句柄。
  const tunnel = await VPN.localDevVPN.attachRSDTunnel();
  if (!tunnel) throw new Error("隧道在 B attach 前已不可用");

  try {
    const services = await tunnel.listServices({ refresh: true });
    const name = "com.apple.mobile.diagnostics_relay.shim.remote";
    if (!services.some(service => service.name === name)) {
      throw new Error(`找不到服务：${name}`);
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
        if (response === null) throw new Error("设备在返回响应前关闭了服务");
        console.log(response);
      } finally {
        await service.close();
      }
    } finally {
      await session.close();
    }
  } finally {
    // B 只释放 B 自己的句柄，正常清理不要调用 releaseTunnel。
    await tunnel.close();
  }
}

void main().catch(console.error);
```

项目中的 `client/loopback.ts` 可复制到其他脚本：

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
if (!tunnel) throw new Error("回环隧道不可用");
```

## 所有权与清理

回环拥有它创建或 attach 的句柄。其他脚本拥有自己通过 `attachRSDTunnel()` 获取的句柄。

- B 用 `service.close()` 关闭服务连接。
- B 用 `session.close()` 关闭自己的 RSD session。
- B 用 `tunnel.close()` 释放自己的隧道句柄。
- B 的正常清理不要调用回环的 `releaseTunnel`。
- 只有明确要求回环释放自己的句柄时，才调用 `releaseTunnel`。
- 关闭一个句柄不会关闭其他脚本的句柄。
- 所有连接关闭后，最后一个原生句柄释放时底层隧道会自动回收。

`ScriptSession.call` 超时不会撤销回环已经接受的工作。`ScriptSession.serve` 的回调是串行的，多个并发 `ensureTunnel` 会排队并复用同一个 ready 句柄。

## 安全边界

配对记录包含私密凭据，只保存在回环脚本的 Keychain，由回环自己的配对和隧道模块使用。其他脚本只收到状态，并通过原生 attach，不需要配对数据。

shared Storage 可以保存非敏感的连接设置和隧道占用提示，但不得保存配对凭据。

## 文件结构

- `index.tsx`：UI 入口和 ScriptSession 服务。
- `core/i18n.ts`：语言选择和双语辅助函数。
- `client/loopback.ts`：其他脚本使用的 ScriptSession/attach 封装。
- `core/pairing.ts`：仅 Keychain 的配对存储及导入导出。
- `kit/session.ts`：配对、隧道创建和原生 RSD 服务发现。
- `kit/hub.ts`：回环唯一持有的设备会话。
- `pages/`：配对、自检、设置和通用 UI。

英文文档见 [README.md](README.md)。

// 连接设置：隧道从哪来、对端地址是什么。
//
// **存在共享域**（`core/shared.ts`）：同一台设备上几个脚本连的是同一台设备、
// 走的是同一条回环，各存一份只会出现「这边改了那边没改」。
//
// 老版本存在本脚本私有域里，第一次读到会搬过去，搬完把私有那份删掉——
// 留着的话，哪天共享域被清了又会被它顶回旧值。

import { SHARED_KEYS, readShared, writeShared } from "../core/shared";

export type TunnelSource = "builtIn" | "proxyApp";

export interface ConnectionSettings {
  /** builtIn：用 Scripting 自己的 VPN 提供回环；proxyApp：回环由代理工具提供。 */
  source: TunnelSource;
  /** 隧道对端，回环约定地址。 */
  host: string;
}

/** 老的私有域键名，只用来做一次性搬迁。 */
const LEGACY_KEY = "devicekit_connection_v1";
export const DEFAULT_HOST = "10.7.0.1";

/** 去掉首尾空白，不是合法 IPv4 就退回默认值——清空或多打一个空格不该让整条链路失败。 */
export function normalizeHost(text: string): string {
  const host = text.trim();
  const parts = host.split(".");
  const valid = parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
  return valid ? host : DEFAULT_HOST;
}

/** 不管从哪儿读出来的，都洗成一份合法设置。 */
export function normalizeSettings(stored: Partial<ConnectionSettings> | null | undefined): ConnectionSettings {
  return {
    source: stored?.source === "proxyApp" ? "proxyApp" : "builtIn",
    host: normalizeHost(stored?.host ?? DEFAULT_HOST),
  };
}

export function loadConnectionSettings(): ConnectionSettings {
  const shared = readShared<Partial<ConnectionSettings>>(SHARED_KEYS.connection);
  if (shared) return normalizeSettings(shared);

  // 共享域还没有，看看私有域里有没有旧的；有就搬过去，搬完删掉旧的
  const legacy = typeof Storage === "undefined" ? null : Storage.get<Partial<ConnectionSettings>>(LEGACY_KEY);
  const settings = normalizeSettings(legacy);
  if (legacy) {
    saveConnectionSettings(settings);
    Storage.remove(LEGACY_KEY);
  }
  return settings;
}

export function saveConnectionSettings(settings: ConnectionSettings): void {
  writeShared(SHARED_KEYS.connection, { source: settings.source, host: normalizeHost(settings.host) });
}

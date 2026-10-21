// 跨脚本共享的那一份设备配置。
//
// Scripting 的 `Storage` 默认按脚本隔离，`{shared: true}` 是官方给的跨脚本域
// （dts 原话：「you can set `shared` option to true to store data in shared domain,
// so the other scripts can access it」）。同一台设备上装的脚本都读得到、也都写得进。
//
// **这里放的东西别的脚本都能读**，配对记录也在内。用户知情并选择了这样，
// 换来的是：同一台设备只配一次，几个脚本都能用。
//
// 键名统一带 `devtunnel.` 前缀：共享域是全局的，不加前缀迟早和别人撞车。
// 别的脚本想接进来，照这几个键名读写即可，不需要知道本脚本的存在。
//
// 注意 `Storage.clear()` 和 `Storage.keys()` **没有** shared 选项，只动私有域——
// 所以「清除缓存」不会误伤这里。

// Storage 是全局的，Script 不是（它在 scripting 模块里），所以这一个要显式导入。
import { Script } from "scripting";

/** 共享域里本套配置的键名。改动等于换一套，接进来的脚本要一起改。 */
export const SHARED_KEYS = {
  /** 连接设置：隧道来源、对端地址。 */
  connection: "devtunnel.connection",
  /** 配对记录（和钥匙串里那份同样的 JSON 形状）。 */
  pairing: "devtunnel.pairing",
  /** 谁正拿着隧道。 */
  holder: "devtunnel.holder",
} as const;

const SHARED = { shared: true } as const;

/** 离线自测跑在 Node 里，没有 Storage。读当作空，写当作没发生。 */
function available(): boolean {
  return typeof Storage !== "undefined";
}

/**
 * 本脚本叫什么，登记占用时写它。
 *
 * 不在模块级取：自测环境里没有 `Script`，模块一被导入就会炸
 * （`kit/appStore.ts` 当初栽的也是模块级副作用）。
 */
export function selfName(): string {
  try {
    return Script.name || "设备工具箱";
  } catch {
    return "设备工具箱";
  }
}

export function readShared<T>(key: string): T | null {
  if (!available()) return null;
  try {
    return Storage.get<T>(key, SHARED);
  } catch {
    return null;
  }
}

export function writeShared<T>(key: string, value: T): void {
  if (!available()) return;
  try {
    Storage.set(key, value, SHARED);
  } catch {
    // 共享域写不进不该让主流程垮掉：本脚本自己那份照样能用
  }
}

export function removeShared(key: string): void {
  if (!available()) return;
  try {
    Storage.remove(key, SHARED);
  } catch {
    // 同上
  }
}

// ── 隧道占用标记 ──────────────────────────────────────────────────────────
//
// 整个 Scripting 同时只能有一条设备隧道。谁先开谁用着，后来的会失败——
// 但失败信息是协议层的，看不出是被谁占着。
//
// 这里放一个**自愿登记**的标记：拿到隧道的脚本写上自己的名字并定时续租，
// 别人连不上时就能说清「XX 正占着」。
//
// **它不是锁**：没登记的脚本照样能开隧道，登记了也拦不住谁。只是为了把
// 「连不上」说明白，所以读到的内容一律当提示用，不能拿它当判断能不能连的依据。

export interface TunnelHolder {
  /** 哪个脚本拿着。`Script.name`。 */
  script: string;
  /** 最近一次续租的时间戳。 */
  at: number;
}

/**
 * 超过这么久没续租就当它已经不在了。
 *
 * 脚本被划掉、被系统回收时不会留遗言，标记会留在共享域里变成「幽灵占用」。
 * 续租间隔的三倍：偶尔一次续租赶上锁屏没跑成，不至于就被判死。
 */
export const HOLDER_STALE_MS = 90_000;
/** 续租间隔。 */
export const HOLDER_RENEW_MS = 30_000;

function isHolder(value: unknown): value is TunnelHolder {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.script === "string" && typeof record.at === "number" && Number.isFinite(record.at);
}

/** 当前登记的占用者。过期的、形状不对的一律当没有。 */
export function readHolder(now = Date.now()): TunnelHolder | null {
  const raw = readShared<unknown>(SHARED_KEYS.holder);
  if (!isHolder(raw)) return null;
  // 时间往回跳（改系统时间、跨时区）时 now - at 会是负数，也当过期处理
  return now - raw.at >= 0 && now - raw.at < HOLDER_STALE_MS ? raw : null;
}

/** 登记成自己，或者续租。 */
export function claimHolder(script: string, now = Date.now()): void {
  writeShared<TunnelHolder>(SHARED_KEYS.holder, { script, at: now });
}

/**
 * 松手。**只清自己那份**：别的脚本正拿着的时候，本脚本断开不该把人家的标记抹掉。
 */
export function releaseHolder(script: string): void {
  const raw = readShared<unknown>(SHARED_KEYS.holder);
  if (isHolder(raw) && raw.script !== script) return;
  removeShared(SHARED_KEYS.holder);
}

/** 「WLOC 正占着设备隧道」这类话。是自己占着时返回空串——那不算冲突。 */
export function holderText(holder: TunnelHolder | null, self: string): string {
  if (!holder || holder.script === self) return "";
  return `「${holder.script}」正占着设备隧道。整个 Scripting 同时只能有一条，先去那边断开再回来。`;
}

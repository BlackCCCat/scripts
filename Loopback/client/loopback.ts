// Loopback 客户端：通过 ScriptSession 请求 A 准备/释放隧道，
// 然后由当前脚本独立 attach 自己的 VPNRSDTunnel 句柄。
// 不读取、不返回、不保存配对记录或任何密钥。

export const LOOPBACK_SCRIPT = "Loopback";

export type LoopbackStatus = {
  status: "paired" | "tunnel_open" | "not_paired" | "tunnel_closed" | "error";
  ready?: boolean;
  released?: boolean;
  message?: string;
};

type LoopbackCommand = "status" | "ensureTunnel" | "releaseTunnel";

async function call(command: LoopbackCommand, timeout = 180_000): Promise<LoopbackStatus> {
  return ScriptSession.call<LoopbackStatus>({
    name: LOOPBACK_SCRIPT,
    message: { command },
    timeout,
  });
}

/** 查询 A 当前是否已有配对/隧道。 */
export function loopbackStatus(): Promise<LoopbackStatus> {
  return call("status");
}

/** 请求 A 串行确保隧道就绪；成功后本脚本仍须 attach 自己的句柄。 */
export function openLoopback(timeout = 180_000): Promise<LoopbackStatus> {
  return call("ensureTunnel", timeout);
}

/** 请求 A 释放 A 自己的隧道句柄，不影响已经 attach 的其他脚本。 */
export function closeLoopback(): Promise<LoopbackStatus> {
  return call("releaseTunnel");
}

/** 取得当前 ready tunnel 的独立句柄，不需要配对密钥。 */
export function attachLoopbackTunnel(): Promise<VPNRSDTunnel | null> {
  return VPN.localDevVPN.attachRSDTunnel();
}

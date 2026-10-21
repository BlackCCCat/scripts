# Spec: Loopback 配对与隧道控制器

## Goal
- 要解决什么问题：Loopback 当前通过 `Script.run` 暴露配对记录，导致其他脚本接触私钥；同时旧实现自行完成 Bonjour、RSD 服务表和隧道细节，未利用 Scripting 新增的原生发现/共享隧道 API。
- 验收结果：Loopback 通过 `ScriptSession.serve` 作为 A 持有自己的隧道句柄；其他脚本通过 `ScriptSession.call` 请求 `ensureTunnel`/`releaseTunnel`，收到状态后用 `attachRSDTunnel()` 取得独立句柄并自行使用原生服务发现。

## Done Contract
- 完成定义：Loopback 注册一个串行 `ScriptSession.serve` 服务，只接受 `ensureTunnel`、`releaseTunnel`、`status`，返回 JSON 状态，不返回私钥、配对文件或连接凭据；已有 ready tunnel 优先 attach，否则用本地配对代码开启。
- 证明来源：ScriptSession API 签名核对；TypeScript 诊断通过；静态搜索确认没有旧的 pairing 导出路径；服务端/客户端示例和生命周期文档同步。
- 仍未完成：没有真机/系统权限时，不宣称真实设备配对和隧道已通过；其他脚本的具体设备服务业务不在本任务范围。

## Scope
- In:
  - `index.tsx`：注册 `ScriptSession.serve`，实现 `ensureTunnel` / `releaseTunnel` / `status`，正常入口不调用 `Script.exit()` 终止服务。
  - `client/loopback.ts`：改为 `ScriptSession.call` 客户端和 `VPN.localDevVPN.attachRSDTunnel()` 封装，不读取 shared pairing。
  - `kit/session.ts`：保留 Loopback 自己的配对与开隧道能力，优先改用 `VPNRSDTunnel.listServices()` 原生服务发现。
  - `README.md`：更新安全边界、调用示例和生命周期说明。
  - `specs/`：记录决策、验证证据和交接状态。
- Out:
  - 不删除现有用户配对数据或旧 Keychain 迁移逻辑。
  - 不修改配对页面、导入导出能力（导出仍只由用户在 UI 中主动操作）。
  - 不替其他脚本实现 `DeviceServices` 的具体业务协议。
  - 不保证多个脚本同时执行同一设备业务的并发安全。

## Facts / Constraints
- 已确认事实：
  - 新 API 为全局 API，不从 `scripting` 导入：`VPN.localDevVPN.attachRSDTunnel()`、`VPNRSDTunnel.listServices()`、`DeviceServices.openRSDSession()`。
  - `attachRSDTunnel()` 返回独立句柄且不需要配对密钥；关闭一个句柄不会关闭其他脚本句柄。
  - 原生隧道跨脚本共享，但仍有全局连接数限制；每个脚本必须关闭自己的 session/connection/tunnel handle。
  - 当前项目已有 `deviceHub`，可作为 A 的控制句柄；共享隧道不应通过 `ScriptSession.call` 返回原生句柄。`serve` 回调串行执行。
- 技术/业务约束：
  - 状态返回必须 JSON 可序列化，禁止包含 `PairingRecord`、PSK、privateKey 或导出的 pairing 文件。
  - 未配对时 `open` 返回 `not_paired`，不得自动泄露凭据或静默生成共享副本。
  - 用户取消配对页面返回 `cancelled`；脚本不存在/调用异常按调用方可识别的 `error` 或 `null` 兼容处理。
- 已知风险：
  - Loopback 调用结束时若关闭控制句柄，原生共享隧道是否仍保持 ready 需用真实运行验证；必要时需要把“开启隧道”和“控制句柄生命周期”明确为常驻机制。
  - 旧业务模块仍可能依赖 `DeviceSession.services` 的端口映射；原生服务发现返回的字段需以诊断和运行结果确认。

## Open Questions
- [x] `open` 动作完成后不通过 Script.run 返回句柄；调用方用 `attachRSDTunnel()` 获取独立句柄。是否需要常驻控制实例仍需真机验证。
- [x] 不再保留 `get_pairing_record`；未知动作不进入状态协议。
- [x] 标准接入方式统一为 `openLoopback()` 后 `attachLoopbackTunnel()`，README 已提供 DeviceServices 示例。

## Restated Understanding
- 我理解当前任务是：把 Loopback 从“配对记录共享器”重构为“配对与共享隧道控制器”。
- 当前核心目标是：其他脚本永远不通过 Loopback 或 shared Storage 获得配对密钥，只获得状态并自行 attach 原生隧道。
- 当前边界是：Loopback 仍保留配对 UI、Keychain 存储、用户主动导入/导出和自身开隧道能力。
- 暂不处理：其他脚本具体服务调用、设备业务协议和跨脚本业务并发协调。

## Goal Alignment Check
- 当前动作是否仍服务于核心目标：本轮根据开发者提供的新 API 约定，将一次性 Script.run 状态调用改为 ScriptSession 常驻服务，直接解决 A/B 隧道所有权和生命周期问题。
- 若否，偏差在哪里：上一轮实现使用了 Script.run 风格的动作协议并在 open 后结束，不符合新 API；本轮将其视为必须修正的架构偏差。
- 是否需要调整本轮目标或范围：本轮先暂停执行，等待用户批准 spec；批准后再继续最小化修正并验证。

## Checkpoint Summary
- 当前任务理解：Loopback 只配对、开/关隧道、回状态；业务脚本自己 attach 和发现服务。
- 当前核心目标：不向其他脚本暴露配对密钥，同时利用新原生共享隧道 API。
- 当前进度：spec 已落盘；代码已有部分草稿修改，尚未完成、尚未验证。
- 下一步 1：获批后完成 `kit/session.ts` 的原生服务发现替换并核对类型字段。
- 下一步 2：更新 README 与兼容协议，然后运行 TypeScript 诊断和静态敏感信息搜索。
- 涉及文件 / 模块：`index.tsx`、`client/loopback.ts`、`kit/session.ts`、`README.md`、`specs/`。
- 风险：脚本退出时隧道控制句柄生命周期、原生服务目录字段、旧调用方兼容性。
- 验证方式：诊断、静态搜索、脚本调用分支检查；具备条件时真机验证 attach/listServices/close。
- Execution Approval: `Approved`

## Change Log
- 2026-10-21 11:01：根据 SDD 要求建立本 spec；记录目标、安全边界、API 事实、生命周期风险和待确认问题。
- 2026-10-21 11:01：用户批准执行，进入实现阶段。
- 2026-10-21 11:01：此前代码编辑仅视为未完成草稿，等待批准后统一校正和验证。
- 2026-10-21 13:30：根据新 API 约定改为 ScriptSession.serve/call；A 持有 owned tunnel，B/C 通过 attach 获取独立句柄；不再自动启停 VPN。
- 2026-10-21 13:34：实测发现服务冷启动仍展示页面；移除普通入口 Navigation.present，仅保留 home_screen UI。临时 B 已验证后删除。
- 2026-10-21 13:34：调整 `ensureTunnel`：已配对直接开/复用隧道；仅未配对时展示配对页面，完成后继续开隧道。
- 2026-10-21 13:35：回归测试通过：已配对 `ensureTunnel` 返回 ready，B 独立 attach 并发现 85 个服务；测试未打开页面，临时脚本已删除。
- 2026-10-21 13:41：完整服务访问测试通过：发现 85 个服务，连接 `com.apple.mobile.diagnostics_relay.shim.remote`，读取 `IOPMPowerSource` 成功；电量 93%、未充电。首次输出因 BigInt 序列化失败，转换为字符串后重试成功。

## Validation
- Self-check：服务协议不包含配对记录字段；客户端使用 ScriptSession.call，不读取 shared pairing；A/B 分别持有和释放隧道句柄；Loopback 不自动启停 VPN；已配对 ensureTunnel 不展示页面。
- Static checks：整个 Loopback TypeScript 诊断通过；入口、session、hub、client、pairing 均无诊断。
- Runtime / Test：ScriptSession status/ensureTunnel、B 独立 attach、服务发现和电量服务请求均成功。`com.apple.mobile.diagnostics_relay.shim.remote` 返回 `Status: Success`，`CurrentCapacity: 93`、`IsCharging: false`。B 已关闭 service/session/tunnel；临时脚本已删除。未验证真实用户配对流程。
- Human confirmation：用户已批准执行；真机结果待后续反馈。
- 结果汇总：代码和 README 已完成目标范围内的重构，静态证据通过。
- 核心目标是否已由证据证明完成：静态层面是；真实隧道生命周期仍未由真机证实。
- 若未完成，当前剩余差距：验证 `open` 后原生共享隧道是否在调用结束后保持 ready，以及真实服务发现字段/连接。
- 剩余风险：缺少真机与 LocalDevVPN 权限运行证据。

## Resume / Handoff
- 当前状态：ScriptSession 通信和独立 attach 已实际跑通；普通入口自动展示页面问题已修复；临时测试脚本已删除。
- 当前卡点：仍需真实用户配对/外部 VPN 场景验证，以及确认 A 的 releaseTunnel 在跨脚本持续使用时的生命周期。
- 下一步唯一动作：在真实目标环境执行 `ensureTunnel` → B `attachRSDTunnel` → 服务访问 → B close → A `releaseTunnel`。
- 下一轮核心目标：补齐真实配对和 A/B 资源释放证据。

# Spec: Loopback 双语产品化与模块化

## Goal
- 要解决什么问题：当前 Loopback 的普通入口仍偏服务端实现，README 也未完整说明“直接运行用于配对、其他脚本用 ScriptSession 通信”的产品模型；UI 文案主要是中文，入口、本地化和服务协议集中在少数文件中。
- 验收结果：Loopback 注册服务后始终打开入口页面；关闭页面不退出脚本，服务继续提供 ScriptSession；配对完成后可关闭页面，其他脚本通过命令开启隧道并自行连接；UI 根据 `Device.systemLocale` 在中文和英文间选择，不支持中文时回退英文；README 中英双语完整覆盖 A/B 示例、生命周期和安全边界。

## Done Contract
- 完成定义：普通运行入口只展示配对/设置 UI；`ScriptSession` 服务入口只注册服务并按命令工作；所有用户可见 UI 文案经过统一本地化模块；README 同时提供中英文开发者接入示例。
- 证明来源：`Device.systemLocale` API 文档核对；TypeScript 全项目诊断；运行普通入口与 ScriptSession 冷启动行为；静态搜索旧中文硬编码和旧 Script.run 协议。
- 仍未完成：没有真实 UI 自动化截图能力时，不宣称视觉排版已经人工验收；设备业务服务不属于本轮新增功能。

## Scope
- In:
  - `index.tsx`：统一注册 ScriptSession 服务并打开入口 UI；不区分直接点击和 ScriptSession 冷启动。
  - 新增 i18n 模块：统一语言判断和双语文案类型。
  - 页面组件：将用户可见文案迁移到本地化资源。
  - `README.md`：中英双语重写，包含 A/B 完整代码示例。
  - `script.json`：补充双语描述（如有必要）。
- Out:
  - 不改变已验证的配对协议、RSD 服务发现和设备服务业务。
  - 不向其他脚本暴露配对记录、私钥或 PSK。
  - 不把 UI 翻译扩展成完整多语言框架；本轮支持中文，其他语言统一英文回退。

## Facts / Constraints
- 已确认事实：
  - `ScriptSession.serve` 回调串行，`ScriptSession.call` 可冷启动 Loopback 并等待服务注册。
  - 已实际验证 B 可 ensure、attach、发现 85 个服务并读取 `IOPMPowerSource` 电量。
  - `Device.systemLocale` 需要以 Scripting Reference 为准，不猜 API。
- 技术/业务约束：
  - 服务返回值只能是 JSON-compatible 状态，不能包含原生句柄或密钥。
  - 直接点击必须进入配对页面；只有没有配对记录的 `ensureTunnel` 才可在服务调用中展示配对页面。
  - 本地化不依赖系统未提供的翻译 API：中文 locale 使用中文，否则使用英文。
  - README 需明确 A 持有自己的 tunnel，B/C 独立 attach 和释放；B 不调用 A 的 release 命令作为常规清理。
- 已知风险：
  - 需要区分普通脚本运行与 `ScriptSession.call` 冷启动，不能仅靠是否为 home_screen 判断。
  - 组件文件较多，遗漏硬编码文案会造成中英混杂。

## Open Questions
- [x] 保持单一 Loopback 脚本：注册 ScriptSession 服务后始终打开入口 UI；关闭页面不调用 `Script.exit`，服务继续存活。`ensureTunnel` 只准备已配对设备的隧道，未配对时返回 `not_paired`，由用户先在 Loopback 页面完成配对。

## Restated Understanding
- 我理解当前任务是：把 Loopback 做成可直接使用的双语配对工具，同时作为无 UI 的 ScriptSession 隧道服务。
- 当前核心目标是：用户点击脚本就能配对，开发者脚本则通过明确的 ScriptSession 协议接入，不泄露凭据。
- 当前边界是：中文/英文 UI、模块拆分和 README 代码示例；不重写配对和设备服务协议。
- 暂不处理：第三语言、设备业务模块和视觉截图验收。

## Goal Alignment Check
- 当前动作是否仍服务于核心目标：spec 记录入口分离、双语范围和服务安全边界，直接约束后续实现。
- 若否，偏差在哪里：暂无。
- 是否需要调整本轮目标或范围：暂无。

## Checkpoint Summary
- 当前任务理解：直接运行进入配对 UI，ScriptSession 调用进入无 UI 服务路径；UI 和 README 中英双语；代码模块化。
- 当前核心目标：让 Loopback 的产品入口和开发者接入方式清晰、可用、无密钥泄露。
- 当前进度：spec 已落盘，待盘点 API 和文案。
- 下一步 1：核对 locale API，搜索所有 UI 文案和入口逻辑。
- 下一步 2：拆分 i18n/服务协议/入口并更新 README。
- 涉及文件 / 模块：`index.tsx`、`pages/`、新 `core/i18n.ts`、`client/loopback.ts`、`README.md`、`script.json`。
- 风险：入口触发来源识别、漏翻译、服务调用与直接运行行为冲突。
- 验证方式：诊断、静态搜索、实际 ScriptSession 调用、直接运行入口行为检查。
- Execution Approval: `Approved`

## Change Log
- 2026-10-21 13:45：建立本轮双语产品化与模块化 spec，沿用已验证的 ScriptSession/RSD 设计。
- 2026-10-21 13:50：按用户澄清回退双脚本拆分，保留单一 Loopback；配对仅存 Keychain；README/README-zh 和 UI 本地化基础模块完成。
- 2026-10-21 13:51：临时 B 回归调用单一 Loopback 的 ScriptSession status 成功，返回 `tunnel_open`/`ready`；测试脚本已删除。

## Validation
- Self-check：单一 Loopback、Keychain-only 配对、ScriptSession 状态服务和中英 README 已完成。
- Static checks：Loopback 全项目 TypeScript 诊断通过；未发现配对记录写入 shared Storage 的路径。
- Runtime / Test：临时 B 调用单一 Loopback 的 `status` 成功，返回 `tunnel_open`/`ready`；测试脚本已删除。
- Human confirmation：用户已批准并澄清保持单脚本。
- 结果汇总：核心结构和文档目标已完成。
- 核心目标是否已由证据证明完成：静态和 ScriptSession 通信层面是；直接点击 UI 的自动化行为仍需人工点按确认。
- 若未完成，当前剩余差距：补充全页面文案逐项双语覆盖和人工 UI 验收。
- 剩余风险：单脚本入口使用短暂服务请求窗口区分直接点击与冷启动，属于 API 限制下的折中。

## Resume / Handoff
- 当前状态：已回退为单一 Loopback；Keychain-only 配对存储、双语基础模块和中英 README 已完成；诊断通过。
- 当前卡点：ScriptSession 冷启动也会显示入口页面，这是本产品模型的明确行为；调用方应在 Loopback 页面完成配对后再关闭页面。
- 下一步唯一动作：实际回归 ScriptSession 冷启动和直接运行入口，并检查 UI 文案覆盖。
- 下一轮核心目标：用运行证据确认单脚本入口行为。

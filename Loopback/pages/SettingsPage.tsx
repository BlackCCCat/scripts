// 连接设置：隧道来源、对端地址。写共享域，改一处所有脚本都跟着改。
// 页尾是调试日志：开关、复制、清空。

import { Button, List, Picker, Section, Text, TextField, Toggle, useState } from "scripting";
import { clearDebugLog, debugEcho, debugLogCount, debugLogText, setDebugEcho } from "../core/debug";
import { copyWithFeedback } from "./common";
import { tx } from "../core/i18n";
import { deviceHub } from "../kit/hub";
import {
  DEFAULT_HOST,
  loadConnectionSettings,
  saveConnectionSettings,
  type ConnectionSettings,
} from "../kit/settings";

export function SettingsPage() {
  const [settings, setSettings] = useState<ConnectionSettings>(() => loadConnectionSettings());
  const [note, setNote] = useState("");
  const [echo, setEcho] = useState(() => debugEcho());
  /** 条数是环形缓冲里的，不会自己变——进页面时读一次，清空后手动归零。 */
  const [count, setCount] = useState(() => debugLogCount());

  function update(patch: Partial<ConnectionSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveConnectionSettings(next);
    void deviceHub.disconnect();
  }

  return (
    <List navigationTitle={tx("连接设置", "Connection Settings")} navigationBarTitleDisplayMode="inline" listStyle="insetGroup">
      <Section
        header={<Text>{tx("隧道来源", "Tunnel Source")}</Text>}
        footer={
          <Text foregroundStyle="tertiaryLabel">
            Scripting 自身：由 Scripting 的 VPN 提供回环，首次会弹系统授权。
            代理工具提供：回环由 Surge / Loon 这类工具提供，本脚本不会去启动 Scripting 的 VPN（那样会把代理顶掉）。
            iOS 同时只允许一条 VPN。
          </Text>
        }
      >
        <Picker
          title={tx("隧道来源", "Tunnel Source")}
          pickerStyle="segmented"
          value={settings.source}
          onChanged={(value: string) => update({ source: value === "proxyApp" ? "proxyApp" : "builtIn" })}
        >
          <Text tag="builtIn">Scripting 自身</Text>
          <Text tag="proxyApp">代理工具提供</Text>
        </Picker>
      </Section>

      <Section
        header={<Text>{tx("对端地址", "Remote Address")}</Text>}
        footer={
          <Text foregroundStyle="tertiaryLabel">
            {`设备配对服务所在的回环地址，默认 ${DEFAULT_HOST}。填错或留空会自动退回默认值。\n\n` +
              "这一节的两项写在共享域里，认这套配置的脚本都跟着走。"}
          </Text>
        }
      >
        <TextField
          title=""
          value={settings.host}
          prompt={DEFAULT_HOST}
          keyboardType="numbersAndPunctuation"
          onChanged={(value: string) => update({ host: value })}
        />
      </Section>

      <Section
        header={<Text>{tx("调试日志", "Debug Log")}</Text>}
        footer={
          <Text foregroundStyle="tertiaryLabel">
            {note ||
              "日志一直在后台记着，开关只管要不要同时往终端刷——不开也能复制。" +
                "复制出来的已经打码，不含密钥和地址。反馈卡顿、连不上时附上这个。"}
          </Text>
        }
      >
        {/* 开关立刻生效，不用重跑脚本：以前要改一行代码再重来一遍，现场早没了 */}
        <Toggle
          title={tx("输出到终端", "Echo to Terminal")}
          value={echo}
          onChanged={(on: boolean) => {
            setDebugEcho(on);
            setEcho(on);
            setNote(on ? "✓ 新日志会同时打到 scripting-cli 的终端" : "✓ 已停止往终端刷");
          }}
        />
        <Button
          title={`复制日志（${count} 条）`}
          systemImage="doc.on.doc"
          disabled={count === 0}
          action={() => {
            copyWithFeedback(debugLogText());
            setNote("✓ 已复制");
          }}
        />
        <Button
          title={tx("清空日志", "Clear Log")}
          systemImage="trash"
          role="destructive"
          disabled={count === 0}
          action={() => {
            clearDebugLog();
            setCount(0);
            setNote("✓ 已清空");
          }}
        />
      </Section>
    </List>
  );
}

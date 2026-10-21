// 配对时把 PIN 推成一条通知。
//
// 为什么非要通知不可：配对这一步**必须离开 Scripting**——要去「设置 → 隐私与安全性
// → 开发者 → 配对」，而 PIN 是本脚本现算出来的，只显示在脚本界面上。人一走，
// PIN 就看不见了，只能来回切，切回来还可能把配对流程打断。
//
// 通知在锁屏和「设置」上方都看得见，照着抄就行。
//
// 顺序也要写清楚：iOS 会**先要设备密码，再问 PIN**。不说的话，很多人在密码那一栏
// 直接输了 PIN，试几次才反应过来。

import { Notification, Script } from "scripting";
import { debugLog, describeError } from "../core/debug";

/** 同一组通知归到一条线程里，通知中心不会铺成一长串。 */
const THREAD = "loopback-pin";

/**
 * 推一条带 PIN 的通知。
 *
 * - `interruptionLevel: "timeSensitive"`：专注模式下也要透出来。配对窗口只有几分钟，
 *   压在免打扰里等于没有。
 * - PIN 放 `title`：锁屏上标题最显眼，通知一来扫一眼就能抄。
 * - 不加 `trigger`，立刻送达。
 *
 * 推不出去不算错（没给通知权限就会这样），界面上的 PIN 照样在，所以只记日志。
 */
export async function showPinNotice(pin: string): Promise<boolean> {
  try {
    return await Notification.schedule({
      title: `配对 PIN：${pin}`,
      subtitle: "先输设备密码，再输这个 PIN",
      body:
        "打开「设置 → 隐私与安全性 → 开发者 → 配对」，选中本机。" +
        "系统会先要你的设备密码（解锁用的那个），通过之后才会让你输入上面这 6 位 PIN。",
      interruptionLevel: "timeSensitive",
      threadIdentifier: THREAD,
      // 点通知回到本脚本，省得自己去脚本列表里找
      tapAction: { type: "runScript", scriptName: Script.name },
    });
  } catch (error) {
    debugLog("pin", "PIN 通知推不出去", describeError(error));
    return false;
  }
}

/**
 * 收掉 PIN 通知。
 *
 * 配对结束（成了、失败了、超时了）都要收：PIN 是一次性的，留在通知中心里
 * 既没用，又是一条明晃晃的凭据。
 *
 * 用「清掉本脚本的全部已送达通知」——`schedule` 不返回标识符，没法精确删某一条；
 * 本脚本除了 PIN 也不推别的，清干净没有副作用。
 */
export async function clearPinNotice(): Promise<void> {
  try {
    await Notification.removeAllDeliveredsOfCurrentScript();
    await Notification.removeAllPendingsOfCurrentScript();
  } catch (error) {
    debugLog("pin", "PIN 通知清不掉", describeError(error));
  }
}

/** 界面上也写同一句，和通知对齐——别让人在两处看到两种说法。 */
export const PIN_ORDER_HINT = "系统会先要设备密码（解锁用的那个），通过之后才会让你输入 PIN。";

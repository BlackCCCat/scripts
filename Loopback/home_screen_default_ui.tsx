// 首页 Tab 入口。
//
// 文件名和位置是约定死的：必须叫 `home_screen_default_ui.tsx`、与 index.tsx 同级、
// 默认导出一个函数组件。少任何一条，脚本就不会出现在「选择脚本」列表里。
//
// 这里只把 index.tsx 的 App 挂上去。Tab 上不要 present、不要 exit，
// 差异都收在 index.tsx 的 `IS_HOME_TAB` 分支里。

import { App } from "./index";

export default function HomeScreenView() {
  return <App />;
}

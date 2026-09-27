# 万步奇遇 · 逐光启程

Three.js HD2D 跑酷与解谜游戏，当前版本 v3.14.0。

在线试玩：https://zxl9456-hub.github.io/wanbu-adventure/

柯基小步从上海安踏中心大楼门前出发，追着金币跑跳，点亮入口，进入九章连续冒险。

## 操作

A / D 或方向键移动；空格跳跃，长按跳得更远；F 互动。二段跳、Shift 冲刺、E 回声与 J 爪击随冒险解锁。手机可用屏幕按钮。

开场收集至少 8 枚金币，到最右侧发光大门按 F 进入大堂。足迹旗记录检查点，掉落保留已收集金币。进度保存在当前浏览器中。

## 本地运行

在仓库根目录运行 `python3 -m http.server 8000`，打开 `http://localhost:8000/`。所有运行资源随仓库提供，无需构建。

## 发布

GitHub Pages 从 `main` 分支根目录发布；`.nojekyll` 保留原始静态文件。`index.html` 引导到正式入口 `campus.html`。后续更新推送到 `main` 后自动发布。

本仓库包含浏览器运行代码和游戏资源；完整制作工程另行交付。Three.js 许可见 `THREE-LICENSE.txt`，水面组件相关说明见 `WATER-PRO-LICENSE.md`。

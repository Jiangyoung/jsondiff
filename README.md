# JSON Diff Modern UI ✨

一个基于 `Vite + React + TypeScript` 的 JSON 对比工具，专门用于左右两侧 JSON 的树形结构差异分析。它强调完整树视图、结构层级、折叠交互和清晰的差异高亮，适合快速定位对象、数组和类型变化。 🌲

## Preview 👀

- 左右双栏输入 JSON
- 下方输出完整的左右 JSON 树对照
- 支持对象、数组、类型变化分支的折叠与展开
- 一致节点白底展示，差异节点按新增 / 删除 / 修改区分颜色
- 支持宽屏更宽显示，也兼顾中小屏适配

在线体验：

- https://jiangyoung.github.io/jsondiff/

## Features 🚀

- 完整左右 JSON 树对照，而不是只看扁平 diff
- 支持对象、数组、基础类型递归比较
- 支持同 key 下 `object ↔ array` 等类型变化继续展开查看
- 支持左右树分支折叠/展开，以及一键全部展开/折叠
- 支持显示完整树或只看差异节点
- 提供总差异、新增、删除、修改、一致字段等统计信息
- 支持 JSON 格式化、示例载入、左右互换、清空
- 支持 PWA，可安装、可离线访问已缓存资源
- 已配置 GitHub Actions 自动部署到 GitHub Pages

## Tech Stack 🛠️

- `Vite`
- `React 19`
- `TypeScript`
- `vite-plugin-pwa`
- `node:test`

## Getting Started 🧪

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

运行测试：

```bash
npm test
```

构建生产版本：

```bash
npm run build
```

默认开发地址通常为：

```text
http://localhost:5173
```

## PWA Support 📱

- 已启用 Service Worker 自动更新
- 首次访问后会缓存关键静态资源
- 检测到新版本时，页面会提示刷新更新
- 可安装为桌面应用或移动端主屏应用

## GitHub Pages Deployment 🌍

项目已包含工作流：

- `.github/workflows/deploy.yml`

当前部署流程会：

1. 使用 `actions/checkout@v6`
2. 使用 `actions/setup-node@v6`
3. 预检查仓库是否已启用 GitHub Pages
4. 使用 `actions/configure-pages@v6`
5. 通过 `npm install` 安装依赖
6. 运行测试
7. 构建 `dist/`
8. 发布到 GitHub Pages

另外已经补上：

- `packageManager` 字段
- Node 24 兼容工作流环境变量
- `configure-pages@v6`
- `package-manager-cache: false`，避免 `setup-node@v6` 因缺少锁文件自动开启 npm 缓存后直接失败

首次启用 GitHub Pages 时有两种方式：

1. 推荐：到仓库 `Settings > Pages > Build and deployment > Source` 手动选择 `GitHub Actions`
2. 可选：新增仓库 Secret `PAGES_ENABLEMENT_TOKEN`，让工作流自动启用 Pages

如果你选择第 2 种方式，这个 token 不能是 `GITHUB_TOKEN`，需要额外的权限：

- Personal Access Token: `repo` scope 或 Pages 写权限
- GitHub App: `administration:write` 和 `pages:write`

如果既没有启用 Pages，也没有配置 `PAGES_ENABLEMENT_TOKEN`，工作流会直接失败，并输出明确的操作提示，而不是只看到 `configure-pages` 的 404 报错。 🧭

这样可以避免之前 GitHub Actions 因为锁文件缺失或锁文件内容异常而直接失败。 ✅

## Project Structure 📂

```text
.
├─ .github/workflows/deploy.yml
├─ public/
├─ src/
│  ├─ App.tsx
│  ├─ diff.ts
│  ├─ main.tsx
│  └─ styles.css
├─ tests/
│  └─ diff.test.ts
├─ LICENSE
├─ README.md
├─ index.html
├─ package.json
└─ vite.config.mjs
```

## License 📄

本项目使用 [MIT](./LICENSE) 开源协议。

## Contributors 🤝

- Jiangyoung
- Codex

## Notes 📝

- 当前仓库已经修复 GitHub Pages 部署失败的锁文件问题
- 当前依赖组合将 `vite` 固定在 7.x，以匹配 `vite-plugin-pwa@1.2.0` 的官方 peer 依赖范围
- 如果后续你希望启用更稳定的 CI 依赖缓存，建议在干净环境里重新生成并提交正确的 `package-lock.json`
- 若仓库名不是用户主页仓库，Vite 会在 GitHub Actions 中自动使用正确的 Pages `base` 路径

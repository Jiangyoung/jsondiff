# JSON Diff Modern UI

一个基于 `Vite + React + TypeScript` 的 JSON 对比工具，专门用于左右两侧 JSON 的树形结构差异分析。

## 功能特性

- 左右双栏输入 JSON，点击后生成差异结果
- 递归比对对象、数组、基础类型
- 使用左右 JSON 树对照视图展示完整层级差异
- 支持左右树分支折叠/展开，以及一键全部展开/折叠
- 展示总差异、新增、删除、修改、一致字段等统计信息
- 支持 JSON 格式化、示例载入、左右互换、清空
- 支持 PWA，可安装、可缓存静态资源、支持离线访问已缓存内容
- 已配置 GitHub Actions 自动部署到 GitHub Pages

## 技术栈

- `Vite`
- `React 19`
- `TypeScript`
- `vite-plugin-pwa`
- Node 内建测试运行器 `node:test`

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址通常为：

```text
http://localhost:5173
```

## 构建与测试

```bash
npm test
npm run build
```

## PWA 说明

- 已启用 Service Worker 自动更新
- 打开站点后，关键静态资源会被缓存
- 当检测到新版本时，页面会提示刷新更新
- 支持安装为桌面应用或移动端主屏应用

## GitHub Pages 自动部署

项目已包含工作流文件：

- `.github/workflows/deploy.yml`

工作流行为：

- 当代码 push 到 `main` 分支时自动执行
- 自动安装依赖、运行测试、构建项目
- 将 `dist/` 发布到 GitHub Pages

如果仓库不是用户主页仓库而是普通仓库，Vite 会在 GitHub Actions 中自动根据仓库名设置 `base` 路径，无需手动改配置。

## 目录结构

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
├─ index.html
├─ package.json
└─ vite.config.mjs
```

## 后续发布

当前已经完成：

- 功能修复
- PWA 配置
- GitHub Pages 自动部署工作流
- README 编写

当前还没有执行 `git push`。等你确认功能没有问题后，再进行推送即可。

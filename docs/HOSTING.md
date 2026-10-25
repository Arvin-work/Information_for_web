# 后续托管与切换

目前只完成本地项目，不创建 Cloudflare 项目、不部署、不修改正式域名。Git 操作由仓库所有者负责。

## 新前端项目

在 Cloudflare 的 Workers & Pages 中为前端仓库创建独立的 Workers Static Assets 项目。生产分支由你选择，不在这里假定分支名。

- 安装依赖：`npm ci`
- 构建：`npm run build`
- 部署命令：`npx wrangler deploy`（仅在你准备发布时执行）
- 静态资源目录：`dist/`
- Node.js：24 LTS
- npm：由 `package.json` 的 `packageManager: "npm@11.11.0"` 固定，Cloudflare 在安装依赖前选用该版本。

本地维护依赖也使用 npm 11.11.0。不要仅设置 `engines.npm`，Cloudflare 不通过该字段选择 npm 版本。当前锁文件包含 Miniflare 的 undici 安全版本覆盖；npm 10.9.2 会把这份锁文件误判为版本不匹配，固定 npm 版本后继续使用 `npm ci`，无需降低 undici 版本或删除锁文件。

参考：[Cloudflare 构建环境版本配置](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/#package-manager-versions)。

配置不含 `main`，不绑定 D1，不配置 SSR，不添加转发所有网页请求的 Worker。`html_handling: none` 保留已有 `.html` 地址；`404-page` 让不存在的地址返回 404，而不是首页。构建时还会自动生成 `_redirects`，把 `/`、`/login/` 等目录地址内部映射到相应的 `index.html`；这个映射由 Cloudflare 静态资源层完成，不执行 Worker 脚本。

构建输出目录里只放公开资源。`wrangler.jsonc`、Markdown 草稿、依赖和内部文档不在 `dist/` 中。

新项目的测试地址可验证静态页面；该测试域名没有正式站点的 `/api/*` 路由，不能仅凭它验证账号联调。账号功能先通过本地代理验证，正式切换后再做同域验证。

## 同一个正式域名

前提：你能管理 Cloudflare 中的 `altfork.com` 域名区域及相应 DNS、Worker 路由。

| 项目         | Cloudflare 设置 | 范围                    |
| ------------ | --------------- | ----------------------- |
| 新前端       | Custom Domain   | `www.altfork.com`       |
| 原 Rust 后端 | Route           | `www.altfork.com/api/*` |

匹配的 API Route 优先，其他路径由前端静态资源项目负责。不要让两个项目同时绑定完整的 `www.altfork.com` Custom Domain，也不要给后端配置覆盖整个网站的 `www.altfork.com/*`。

正式切换顺序：

1. 保留原服务；完成新前端本地检查与静态测试地址验证。
2. 记录现有域名和路由设置，准备恢复方法。
3. 为原后端设置 `/api/*` 路由，将完整域名从原项目转给新前端。
4. 检查首页、两个旧文章地址、选课、真实注册/登录/退出。
5. 确认正式站点正常后，再单独移除原后端的静态文件构建、ASSETS 回退与静态资源绑定。

第 5 步需要同时修改原后端代码和构建配置，应作为后续独立变更完成。本次不修改原仓库。

同样的 HTTPS 域名可以延用原 Cookie 和本地存储。账号接口仍使用 `/api/v1/auth/…` 相对地址，不需要另设 API 子域名或增加跨域配置。

## 流量和构建

文章、HTML、CSS、JS、图片及课程 JSON 作为静态资源分发。选课交互在浏览器中运行，不新增后端调用；账号页面仍会查询会话，提交注册、登录、退出仍会调用 Rust Worker。

内容更新仍需生成和上传前端静态文件，但不会编译 Rust 或重新发布原后端。前后端发布各自由对应仓库触发。

本地验证不能代替正式 Workers Free 的 CPU 限额验证，尤其是密码哈希。正式域名切换前还需在真实环境检查账号接口表现。

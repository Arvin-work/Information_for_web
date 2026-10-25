# altfork 静态前端

这个仓库管理网页、文章和浏览器工具。Astro 在发布前生成 HTML，Cloudflare 负责分发静态文件；账号接口仍由独立的 Rust Worker 提供。

## 本地启动

使用 Node.js 24 LTS（本次使用 24.14.1）和 npm。

首次安装：

```sh
npm ci
```

先在原后端目录启动现有服务：

```sh
cd /Users/arvin/Project/web_pages_arvin
npm run dev:worker
```

再打开另一个终端启动前端：

```sh
cd /Users/arvin/Project/Information_for_web
npm run dev
```

访问 `http://localhost:4321`。统一使用 `localhost`，不要与 `127.0.0.1` 混用，否则 Cookie、本地存储和请求来源不同。

前端把 `/api/` 请求代理到 `http://localhost:8787`；后端未启动时会连接失败，不会伪造登录成功。原后端的本地 D1 表需要已经按原流程准备好，这个仓库不执行数据库迁移。

## 常用命令

```sh
npm run build          # 只构建前端，输出 dist/
npm run preview        # 在 localhost:4321 预览构建产物，账号联调仍需后端
npm run check          # Astro 类型检查、构建和行为回归检查
npm run check:content  # 临时添加文章，检查发布/草稿/索引，然后移除样例并重新构建
npm run format:check   # 检查源码排版
```

开发和预览不要同时占用 4321 端口。`dist/` 是生成物，修改页面请编辑源码。

## 从哪里开始修改

| 目录                       | 用途                                     |
| -------------------------- | ---------------------------------------- |
| `src/pages/`               | 首页、文章列表、账号页、选课页和页面路由 |
| `src/layouts/`             | 公共页面骨架、文章和列表布局             |
| `src/components/`          | 导航、页脚和首页内容节点                 |
| `src/content/posts/`       | Markdown 文章，草稿也保存在这里          |
| `src/data/`                | 分类和工具清单                           |
| `src/lib/content.ts`       | 已发布内容查询、路径检查和终端索引生成   |
| `public/assets/`           | 浏览器直接使用的样式、脚本及图标         |
| `public/selection/`        | 选课工具脚本、样式                       |
| `public/data/courses.json` | 浏览器读取的课程数据                     |

公共导航、页脚只需修改一次，所有页面在下次构建时一起更新。网站仍保留迁移前的 `altfork.dev` 品牌文案；正式站点地址配置为 `https://www.altfork.com`，没有顺带改版。

选课方案继续保存在浏览器的 `altfork.plan.v1` 中，不上传 D1。迁移到相同正式地址后可以继续读取；不同端口的本地测试地址使用各自独立的本地存储。

文章维护见 [内容维护说明](docs/CONTENT.md)，后续发布和域名切换见 [托管说明](docs/HOSTING.md)。原网站暂时保留，本项目不自动迁移、部署或删除原服务。

## 许可证与来源

保留仓库现有 `LICENSE`。页面、浏览器工具及已有文章从站点所有者提供的 `web_pages_arvin` 本地目录迁入，文章正文没有进行内容性改写。

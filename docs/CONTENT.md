# 内容维护

## 新增文章

在 `src/content/posts/` 创建一个 Markdown 文件，例如 `learning-rust.md`：

```md
---
title: Rust 学习记录
date: 2026-10-25
category: computer
summary: 记录实现注册接口时学到的 Rust 知识。
tags:
  - Rust
draft: false
path: /posts/computer/learning-rust.html
terminalId: learning-rust
---

## 从这里开始

这里写文章正文。
```

保存后，开发服务器会更新页面；正式发布需要由你提交并推送仓库，然后前端项目重新构建。

`draft: false` 才公开。没有填写 `draft` 时默认是草稿；草稿不生成详情页，也不进入首页、分类、文章列表或终端索引。

已发布文章必须有标题、日期、分类、路径和唯一的 `terminalId`。路径位于 `/posts/` 下，以 `.html` 结尾；`terminalId` 使用小写英文字母、数字、连字符或下划线。日期按 UTC 日期格式显示，不受访问者时区影响。

首页、列表和终端从同一份已发布内容读取，按日期从新到旧排列，不需要再手动填写 HTML 链接。终端内可以用 `cd notes`、`ls`、`open learning-rust` 找到文章。

图片放入 `public/posts/img/`，正文使用 `/posts/img/文件名.png`。只有 `public/` 文件及 Astro 生成的公开页面会上传；不要把私密资料放进 `public/`。

## 保留旧链接

文章可以声明兼容路径：

```yaml
aliases:
  - /posts/acticle/old-name.html
```

兼容路径与主路径从同一份 Markdown 生成完整页面，canonical 指向主路径。现有 WSL2 文章的两个 `.html` 地址均保留。不要在 `public/` 再放一份同地址的文章 HTML。

## 分类与工具

分类在 `src/data/categories.ts` 管理。新增分类后，列表页和分类导航自动生成；文章的 `category` 填分类的 `slug`。

工具在 `src/data/tools.json` 管理，每个工具有 `id`、`title`、`path`、`summary`、`kicker`。新增清单项后，首页和终端会一起出现入口；工具页面和脚本本身仍需实现。现有选课工具地址为 `/selection/`。

为保持当前首页布局，文章进入“手记”，工具进入“工具箱”，两个预留板块继续留空。未来调整展示方式可以只修改布局和组件，不需要重新组织文章正文。

## 验证

`npm run check` 检查链接、选课逻辑、主题、终端和发布产物。

`npm run check:content` 会临时添加一篇公开文章和一篇草稿，检查详情、首页、分类和终端是否同步。无论检查成功还是失败都会清理这两个临时文件，并重新构建恢复正常产物。不要与其他构建命令同时运行。

## 板块树与目录切换

首页的大领域向左右展开，预览内容和板块内部的分类沿纵向继续。首次点击板块标题展开预览；再次点击进入该板块的完整分支树。预览中也有“进入板块”和“收起”入口。

板块定义在 `src/data/branches.ts`。目前有 `/branches/block-1/`、`/branches/block-2/`、`/branches/notes/`、`/branches/tools/`；手记下还自动生成各分类目录，例如 `/branches/notes/computer/`。空板块明确显示暂无已发布内容，草稿不会进入目录。

首页、分支目录及文章使用 Astro ClientRouter 读取静态 HTML 并进行过渡；支持直接打开链接和浏览器前进、后退。减少动态效果的系统设置会关闭过渡动画。账号页、选课工具继续保留原有独立页面脚本生命周期。

## 中文字体试用与恢复

参考 `moon_bilingual_revised.pdf` 的宋体排版，当前中文试用本机“宋体-简”（优先 STSongti-SC-Regular/Bold，回退 SimSun）。英文仍使用原有系统无衬线字体，终端、代码和编号保留等宽字体。

切换开关位于 `src/config/appearance.ts`：`'songti-trial'` 为试用；改成 `'system'` 即恢复原中文字体。无需删除样式文件。

字体规则仅覆盖 CJK 字符，不重新打包 PDF 中的字体，也不上传本机字体文件。未安装这些字体的设备回退到原来的中文字体，因此本次试用不承诺各设备显示完全一致。

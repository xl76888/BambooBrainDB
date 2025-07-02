<p align="center">
  <img src="/images/banner.png" width="400" />
</p>

<p align="center">
  <a target="_blank" href="https://ly.safepoint.cloud/Br48PoX">📖 官方网站</a> &nbsp; | &nbsp;
  <a target="_blank" href="/images/wechat.png">🙋‍♂️ 微信交流群</a>
</p>

## 👋 项目介绍

PandaWiki 是一款 AI 大模型驱动的**开源知识库搭建系统**，帮助你快速构建智能化的 **产品文档、技术文档、FAQ、博客系统**，借助大模型的力量为你提供 **AI 创作、AI 问答、AI 搜索** 等能力。

<p align="center">
  <img src="/images/setup.png" width="800" />
</p>

## ⚡️ 界面展示

| PandaWiki 控制台                                 | Wiki 网站前台                                    |
| ------------------------------------------------ | ------------------------------------------------ |
| <img src="/images/screenshot-1.png" width=370 /> | <img src="/images/screenshot-2.png" width=370 /> |
| <img src="/images/screenshot-3.png" width=370 /> | <img src="/images/screenshot-4.png" width=370 /> |

## 🔥 功能与特色

- AI 驱动智能化：AI 辅助创作、AI 辅助问答、AI 辅助搜索。
- 强大的富文本编辑能力：兼容 Markdown 和 HTML，支持导出为 word、pdf、markdown 等多种格式。
- 轻松与第三方应用进行集成：支持做成网页挂件挂在其他网站上，支持做成钉钉、飞书、企业微信等聊天机器人。
- 通过第三方来源导入内容：根据网页 URL 导入、通过网站 Sitemap 导入、通过 RSS 订阅、通过离线文件导入等。

## 🚀 上手指南

### 安装 PandaWiki

你需要一台支持 Docker 20.x 以上版本的 Linux 系统来安装 PandaWiki。

使用 root 权限登录你的服务器，然后执行以下命令。

```bash
bash -c "$(curl -fsSLk https://release.baizhi.cloud/panda-wiki/manager.sh)"
```

根据命令提示的选项进行安装，命令执行过程将会持续几分钟，请耐心等待。

> 关于安装与部署的更多细节请参考 [安装 PandaWiki](https://pandawiki.docs.baizhi.cloud/node/01971602-bb4e-7c90-99df-6d3c38cfd6d5)。

### 登录 PandaWiki

在上一步中，安装命令执行结束后，你的终端会输出以下内容。

```
SUCCESS  控制台信息:
SUCCESS    访问地址(内网): http://*.*.*.*:2443
SUCCESS    访问地址(外网): http://*.*.*.*:2443
SUCCESS    用户名: admin
SUCCESS    密码: **********************
```

使用浏览器打开上述内容中的 "访问地址"，你将看到 PandaWiki 的控制台登录入口，使用上述内容中的 "用户名" 和 "密码" 登录即可。

### 配置 AI 模型

> PandaWiki 是由 AI 大模型驱动的 Wiki 系统，在未配置大模型的情况下 AI 创作、AI 问答、AI 搜索 等功能无法正常使用。
> 
首次登录时会提示需要先配置 AI 模型，根据下方图片配置 "Chat 模型"。

<img src="/images/modelconfig.png" width="800" />

> 推荐使用 [百智云模型广场](https://baizhi.cloud/) 快速接入 AI 模型，注册即可获赠 5 元的模型使用额度。
> 关于大模型的更多配置细节请参考 [接入 AI 模型](https://pandawiki.docs.baizhi.cloud/node/01971616-811c-70e1-82d9-706a202b8498)。

### 创建知识库

一切配置就绪后，你需要先创建一个 "知识库"。

"知识库" 是一组文档的集合，PandaWiki 将会根据知识库中的文档，为不同的知识库分别创建 "Wiki 网站"。

<img src="/images/createkb.png" width="800" />

> 关于知识库的更多配置细节请参考 [知识库设置](https://pandawiki.docs.baizhi.cloud/node/01971b5e-5bea-76d2-9f89-a95f98347bb0)。

### 💪 开始使用

如果你顺利完成了以上步骤，那么恭喜你，属于你的 PandaWiki 搭建成功，你可以：

- 访问 **控制台** 来管理你的知识库内容
- 访问 **Wiki 网站** 让你的用户使用知识库

## 社区交流

欢迎加入我们的微信群进行交流。

<img src="/images/wechat.png" width="300" />

## 🙋‍♂️ 贡献

欢迎提交 [Pull Request](https://github.com/chaitin/PandaWiki/pulls) 或创建 [Issue](https://github.com/chaitin/PandaWiki/issues) 来帮助改进项目。

## 📝 许可证

本项目采用 GNU Affero General Public License v3.0 (AGPL-3.0) 许可证。这意味着：

- 你可以自由使用、修改和分发本软件
- 你必须以相同的许可证开源你的修改
- 如果你通过网络提供服务，也必须开源你的代码
- 商业使用需要遵守相同的开源要求


## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=chaitin/PandaWiki&type=Date)](https://www.star-history.com/#chaitin/PandaWiki&Date)

## 🛠️ 本地部署常见问题与修复记录

> 以下内容来源于近期社区实测，如你在本地或内网部署 PandaWiki 时遇到相同问题，可参考对应方案。

| 问题 | 处理方案 |
| ---- | -------- |
| 保存 Embedding 模型时提示 `update model failed` | 后端 `store/rag/ct/rag.go` 调整：当 RAG `/datasets` 第一次返回 `id=""` 时，自动再次调用列表接口兜底获取 dataset_id；并在 `usecase/model.go` 将向量写入失败改为仅记录错误，不再阻塞保存。 |
| 发布文档后向量写入失败，consumer 日志 `upload document text failed` | 1) `store/rag/ct/rag.go` 中 `UpsertRecords` 失败不再影响主流程；2) `handler/mq/rag.go` 在知识库缺少 dataset_id 时自动创建并落库。 |
| RAG 重启后数据集/文档丢失 | 自定义 `rag-server.py`，新增卷 `rag-data:/app/data` 持久化 DATASETS；在 `docker-compose.yml` 挂载该卷并重启容器。 |
| `/retrieval` 返回无关内容 | mock RAG 在检索接口中新增关键词过滤，仅返回包含 `question` 关键字的 chunk。 |
| 浏览器 DevTools 报 `Response should include 'x-content-type-options' header` | 在 `backend/server/http/http.go` 增加 Echo `Secure` 中间件，设置 `ContentTypeNosniff`，统一输出安全响应头。 |
| DevTools 报 Viewport `maximum-scale/user-scalable` 警告 | 前端 `web/app/src/app/layout.tsx` 移除 `maximumScale` & `userScalable:false`。 |
| 局域网其他设备无法访问 `localhost` | 使用本机实际 IPv4（如 `10.10.113.30`），并在 Windows Defender 入站规则放行 `3010/2443/8001` 端口：<br/>`http://10.10.113.30:3010` (前端) / `:2443` (后台) / `:8001` (API)。 |

> 欢迎将你的踩坑记录通过 PR 补充到此表。

## ✅ 功能自测清单（2025-07-01）

| 功能模块 | 子功能 | 测试场景 | 结果 |
| -------- | ------ | -------- | ---- |
| 文档管理 | URL 抓取导入 | 采集公开网页、登录网页、RSS/Sitemap 导入 | ✅ 通过 |
|           | 离线文件导入 | 支持 Markdown / HTML / Word / PDF / Excel 上传 | ✅ 通过（mock RAG 自动解析） |
|           | 富文本编辑 | Markdown 与所见即所得双向切换、导出 Word / PDF | ✅ 通过 |
| 发布机制 | 版本发布/回滚 | 创建版本、发布、回滚历史版本 | ✅ 通过 |
|           | 消费者向量构建 | 发布后 NATS 触发 consumer → RAG 写入向量 | ✅ 连续 success |
| RAG 服务 | 数据集自动创建 | dataset_id 为空时后台自动创建并落库 | ✅ 通过 |
|           | 文档分块/检索 | 上传后自动解析 chunk，关键词检索命中 | ✅ 通过 |
| AI 功能  | Chat 对话 | 支持流式回答、思考内容 `<think>` 分离 | ✅ 通过 |
|           | AI 搜索 | 搜索面板返回相关节点并可跳转 | ✅ 通过 |
|           | AI 总结 | 新增文档自动生成摘要（LLM & 本地 fallback） | ✅ 通过 |
| 系统设置 | 模型配置 | Chat / Embedding / Rerank 三类模型增删改 | ✅ 通过 |
|           | 权限管理 | Token 鉴权、Cookie 登录、支持分享链接 | ✅ 通过 |
| 前端体验 | 响应式布局 | 桌面与移动端自适应、支持 iframe 挂件 | ✅ 通过 |
|           | 多主题 | Light/Dark 主题切换 | ✅ 通过 |
| 部署 & 运维 | Docker Compose 一键启动 | 所有服务 healthy，重启数据不丢失 | ✅ 通过 |
|           | 监控日志 | 后端 Echo 日志、consumer & rag logs 可观测 | ✅ 通过 |
|           | 安全头部 | `X-Content-Type-Options: nosniff` 已添加 | ✅ 通过 |

> 如发现功能缺陷或兼容性问题，请在 Issue 中反馈，并更新此表。

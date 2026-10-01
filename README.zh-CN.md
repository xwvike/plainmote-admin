# PlainMote Admin

[English](README.md) | 简体中文

[PlainMote](https://github.com/xwvike/plainmote) 管理端。纯前端实现，经由签名管理接口（`/_admin/v1/`）查询部署状态，并对用户、资源、链接与套餐执行管理操作。

在线地址：<https://xwvike.github.io/plainmote-admin/>

## 设计

- **无服务端组件。** 请求于浏览器内签名，直接发往 PlainMote 服务。
- **私钥不离开浏览器。** 私钥以不可导出的 Ed25519 `CryptoKey` 导入，存于 IndexedDB；服务端仅持有公钥。
- **仅涉及元数据。** 管理接口不返回资源正文、历史版本、分享地址及访问者信息，界面亦不提供内容查看功能。
- **变更须附原因。** 一切有副作用的操作均须填写原因，由服务端写入只追加的审计记录。

接口约定见 [`docs/admin-api.md`](https://github.com/xwvike/plainmote/blob/main/docs/admin-api.md)。

## 运行要求

- WebCrypto 支持 Ed25519 的浏览器：Chrome 137、Firefox 129、Safari 17 及以上。
- 已启用管理接口的 PlainMote 部署。

## 服务端配置

| 变量 | 说明 |
| --- | --- |
| `PLAINMOTE_ADMIN_KEYS` | 允许签名管理请求的公钥，以逗号分隔。 |
| `PLAINMOTE_ADMIN_ORIGINS` | 允许以浏览器跨域调用管理接口的来源，如 `https://xwvike.github.io`。 |

密钥对由 PlainMote 仓库中的 `go run ./cmd/plainmote-admin keygen` 生成。公钥写入 `PLAINMOTE_ADMIN_KEYS`；私钥（JWK）导入本管理端，不置于服务器。

## 环境

环境即 PlainMote 服务地址与对应私钥的组合。支持保存多个环境，各标签页独立选择当前环境。生产环境在界面中单独标识，其删除操作须输入对象名称确认。

## 开发

```bash
npm install
npm run dev      # http://localhost:5173
npm test
```

设置 `PLAINMOTE_ADMIN_TEST_URL` 与 `PLAINMOTE_ADMIN_TEST_KEY` 后，签名测试将同时针对运行中的服务执行；后者为 JWK 文件，其公钥须已列入该服务的 `PLAINMOTE_ADMIN_KEYS`。

## 部署

`npm run build` 生成静态站点至 `dist/`。`BASE_PATH` 指定部署路径，如 `BASE_PATH=/plainmote-admin/`。应用采用浏览器路由，服务器须对未知路径返回 `index.html`。

工作流 `.github/workflows/pages.yml` 于每次推送至 `main` 时执行测试与构建，并发布至 GitHub Pages（`https://<owner>.github.io/<repository>/`），以 `index.html` 的副本作为 `404.html`。

私钥存储以来源（origin）为隔离边界，不区分路径，同源页面均可调用已存储的私钥。应部署于仅承载可信页面的来源。

## 许可证

[MIT](LICENSE)

# PlainMote Admin

[PlainMote](https://github.com/xwvike/plainmote) 的管理端：一个纯客户端运行的单页应用，只调用 PlainMote 的签名管理接口（`/_admin/v1/`），用于查看部署概况和执行管理操作。

- **没有后端**。页面可以部署为任意静态站点，也可以只在本机运行。
- **私钥只在浏览器中**。私钥以不可导出的 `CryptoKey` 形式导入，保存在浏览器的 IndexedDB 中，页面脚本无法读出其原始内容；服务端只持有公钥。
- **不接触内容**。管理接口不返回资源正文、历史版本、分享地址或访问者信息，本界面也不提供任何查看内容的入口。
- **每项变更都有原因**。所有有副作用的操作都必须填写原因，原因写入服务端只追加的审计记录。
- 支持简体中文与英文，支持浅色与深色外观。

接口约定见 PlainMote 仓库中的 [`docs/admin-api.md`](https://github.com/xwvike/plainmote/blob/main/docs/admin-api.md)。

## 浏览器要求

需要 WebCrypto 的 Ed25519 支持：Chrome 137、Firefox 129、Safari 17 或更高版本。

## 准备服务端

1. 在 PlainMote 仓库中生成密钥对：

   ```bash
   go run ./cmd/plainmote-admin keygen
   ```

   输出中的 `public` 填入服务端的 `PLAINMOTE_ADMIN_KEYS`；`private` 是 JWK 格式的私钥，由管理员自行保管，不要放到服务器上。

2. 将管理端页面的来源加入服务端的 `PLAINMOTE_ADMIN_ORIGINS`，例如本地开发时为 `http://localhost:5173`。来源未列入时，浏览器会拦截响应，界面提示“无法连接”。

## 本地运行

```bash
npm install
npm run dev
```

开发服务器固定在 `http://localhost:5173`。打开后在“环境”页面添加一个环境：填写 PlainMote 的地址，选择或粘贴私钥 JWK。可以添加多个环境（例如本地与生产），在“环境”页面切换；标记为生产的环境在界面上有醒目标记，删除操作须再次输入对象名称。

## 部署

```bash
npm run build
```

将 `dist/` 作为静态站点发布即可。应用使用浏览器路由，静态服务器须把未知路径回退到 `index.html`。部署在子路径下时，构建时以 `BASE_PATH` 指定该路径，例如 `BASE_PATH=/plainmote-admin/ npm run build`。发布后记得把该站点的来源加入 `PLAINMOTE_ADMIN_ORIGINS`。

仓库自带 GitHub Pages 工作流（`.github/workflows/pages.yml`）：推送到 `main` 后自动测试、构建并发布到 `https://<用户名>.github.io/<仓库名>/`。

私钥保存在浏览器中按来源（协议、域名与端口）划分的存储里，与路径无关。同一来源下的其他页面（例如同一个 `github.io` 域名下的其他 Pages 站点）可以访问这份存储，因此应部署在只承载可信页面的来源上，必要时使用独立的子域名。

## 测试

```bash
npm test
```

签名相关的单元测试不需要服务端。若要同时对一个运行中的 PlainMote 验证签名，设置以下环境变量（私钥对应的公钥须已列入该服务的 `PLAINMOTE_ADMIN_KEYS`）：

```bash
PLAINMOTE_ADMIN_TEST_URL=http://localhost:8964 PLAINMOTE_ADMIN_TEST_KEY=path/to/dev.jwk npm test
```

## 许可证

[MIT](LICENSE)

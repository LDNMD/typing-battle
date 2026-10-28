# 打字战斗 · 四六级单词

根据中文释义默写英文单词的实时对战游戏。单人背单词 + 双人 PvP 对战。

## 本地运行

```bash
npm install
npm start
```

然后打开 `http://localhost:3000`。同一局域网内的设备可通过终端打印的 `LAN:` 地址访问，实现两台设备实时对战。

## 部署到公网（免费）

游戏使用 WebSocket 做实时对战，需要跑在 Node.js 服务器上，推荐用 **Render** 免费托管。

### 方式一：Blueprint 一键部署（推荐）

1. 把本目录（含 `index.html`、`server.js`、`package.json`、`render.yaml`）推送到你自己的 GitHub 仓库。
2. 打开 [render.com](https://render.com)，用 GitHub 登录。
3. 点击 **New +** → **Blueprint**，选择刚才的仓库。
4. Render 会自动读取 `render.yaml`，点击 **Apply** / **Deploy**。
5. 部署完成后，会得到一个公开网址：`https://typing-battle-xxxx.onrender.com`。
6. 把这个网址发给任何人，用浏览器打开即可开始游戏（两人同时打开，一个创建房间、另一个输入房间号加入）。

### 方式二：手动创建 Web Service

1. 把代码推到 GitHub 仓库。
2. Render 里点 **New +** → **Web Service**，连接该仓库。
3. 填写：
   - **Runtime**：Node
   - **Build Command**：`npm install`
   - **Start Command**：`npm start`
   - **Instance Type**：Free
4. 点 **Create Web Service**，等待部署完成，获得公开网址。

### 注意事项

- Render 免费实例闲置约 15 分钟后会休眠，首次访问需等待几十秒唤醒，属正常现象。
- 房间号由服务器生成（6 位大写字母/数字），密码由创建者自定义，一个房间最多 2 人，第二位玩家加入后自动开局。
- 数据（最高分）保存在浏览器 localStorage 中，换设备不会同步。

## 操作说明

| 按键 | 功能 |
| --- | --- |
| 直接打字 | 拼写英文单词攻击敌人 |
| 空格 | 重听单词发音 |
| Tab | 提示下一个字母（-10 分） |
| Esc | 暂停 / 继续 |
| M | 静音 / 取消静音 |

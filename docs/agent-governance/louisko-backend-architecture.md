# Louisko.com 後端關係與擴充架構

## 文件定位

本文件描述目前 `louisko.com` 的 GitHub、Zeabur、Cloudflare、Gmail 與網站之間的實際關係，並列出未來可安全擴充的功能方向。

核心原則：這些服務不是同一層。GitHub 管原始碼與版本，Zeabur 跑應用程式，Cloudflare 管 DNS／網站邊界／寄信，Gmail 收信；使用者可透過網站或已授權的 LINE Bot 操作同一批 Bazi owner 資料。

## 一、目前總體架構

```mermaid
flowchart LR
    U[使用者瀏覽器]
    GH[GitHub\nkolouis-tw/louisko-website\n原始碼與版本紀錄]
    OPS[Codex／本機部署流程\n檢查、部署、驗證]

    subgraph CF[Cloudflare：louisko.com 的現行邊界層]
        DNS[權威 DNS Zone\nNS henrik / rose]
        EDGE[DNS Proxy／HTTPS 邊界\nA louisko.com → 43.153.172.212]
        MAIL[Email Sending\n寄件 no-reply@louisko.com]
        R2[(R2 儲存\n照片／後端 metadata)]
    end

    subgraph Z[Zeabur：應用程式執行層]
        SVC[louisko-node-photo\nNode service]
        APP[server.js\n網站頁面 + Bazi API + Photo API]
        AUTH[帳號與命主紀錄 API\nHttpOnly session cookie]
        LINE[LINE webhook adapter\nallowlist + owner scope + Prompt artifact]
    end

    G[Gmail／其他收件匣\n驗證信與重設密碼信]
    L[LINE Platform\n已授權操作者]

    GH -->|版本來源／變更歷史| OPS
    OPS -->|Zeabur deploy／環境同步| SVC
    DNS -->|解析 louisko.com| EDGE
    EDGE -->|HTTPS 導向 origin| SVC
    SVC --> APP
    APP --> AUTH
    APP --> LINE
    APP -->|讀寫照片與 metadata| R2
    APP -->|Cloudflare Email Sending REST API| MAIL
    MAIL -->|SMTP／郵件投遞| G
    G -->|使用者開啟驗證或重設連結| U
    U -->|HTTPS| EDGE
    L -->|x-line-signature| EDGE
    EDGE -->|POST /api/line/webhook| SVC

    GH -.->|可未來接 GitHub Actions／Webhook| SVC
```

### 元件責任

| 元件 | 目前責任 | 不應誤解成 |
|---|---|---|
| GitHub | 保存 `louisko-website` 原始碼、commit、分支與版本歷史 | 不直接寄驗證信，也不是正式網站主機 |
| Zeabur | 執行 `louisko-node-photo` Node service、接收部署與環境變數 | 目前不是權威 DNS；網域雖由 Zeabur 購買／續期入口管理，DNS 已交由 Cloudflare |
| Cloudflare DNS | `louisko.com` 的權威 nameserver、A record、HTTPS／proxy 邊界 | 不是 GitHub 原始碼倉庫，也不是使用者帳號資料庫 |
| Cloudflare Email Sending | 讓 `server.js` 透過 REST API 發送驗證與重設密碼郵件 | Gmail 的收件箱或帳號資料庫 |
| Gmail | 實際接收測試及使用者的驗證／重設信件 | 不是網站登入服務的儲存層 |
| LINE Platform | 傳送 webhook 與接收摘要、Prompt 分段、Markdown 短效連結 | 不是網站帳號資料庫；操作者必須通過 User ID allowlist |
| LINE webhook adapter | 驗證簽章、解析指令、解析 owner、呼叫同一 Bazi Core／Prompt Builder | 不是第二套八字演算法，也不使用網站密碼 |
| louisko.com 網站 | 提供 Bazi／Photo UI，並由同一 Node service 提供 API | 不是獨立於後端的另一套主機 |

## 二、正式網站請求流程

```mermaid
sequenceDiagram
    autonumber
    participant B as 使用者瀏覽器
    participant C as Cloudflare DNS／Proxy
    participant Z as Zeabur Node service
    participant A as server.js API
    participant R as Cloudflare R2

    B->>C: GET https://louisko.com/apps/bazi/
    C->>Z: 轉送 HTTPS 到 origin
    Z->>A: 讀取網站與 API 路由
    A-->>Z: HTML／JavaScript／JSON
    Z-->>C: HTTP response
    C-->>B: 網頁內容
    B->>C: 登入、排盤、命主紀錄、照片 API
    C->>Z: HTTPS API request
    Z->>A: 驗證 HttpOnly session cookie
    A->>R: 讀寫受保護的 profile／photo metadata
    R-->>A: 結構化資料
    A-->>B: JSON response
```

目前正式目標：

- 網站入口：[https://louisko.com/apps/bazi/](https://louisko.com/apps/bazi/)
- Node service：`louisko-node-photo`
- Bazi 帳號 API：`/api/bazi/auth/*`
- 命主紀錄 API：`/api/bazi/profiles`
- Photo API：`/api/photo-cloud/*`
- LINE webhook：`/api/line/webhook`
- 正式狀態：`GET /api/bazi/auth/status` 應回報 `emailConfigured: true`

## 三、Email 驗證與忘記密碼流程

```mermaid
sequenceDiagram
    autonumber
    participant B as 使用者瀏覽器
    participant W as louisko.com／server.js
    participant CF as Cloudflare Email Sending
    participant G as Gmail／收件匣

    B->>W: POST /api/bazi/auth/register
    W->>W: 建立未驗證帳號與一次性 verify token
    W->>CF: REST API：寄出 verification email
    CF-->>G: 投遞「請驗證你的 Louisko 八字排盤帳號」
    G-->>B: 使用者開啟驗證連結
    B->>W: GET /api/bazi/auth/verify-email?token=...
    W->>W: 消費 token，寫入 emailVerifiedAt
    W-->>B: 導回網站並顯示驗證結果

    B->>W: POST /api/bazi/auth/forgot-password
    W->>W: 建立一次性 reset token
    W->>CF: REST API：寄出 reset email
    CF-->>G: 投遞「重設你的 Louisko 八字排盤密碼」
    G-->>B: 使用者開啟 reset 連結
    B->>W: POST /api/bazi/auth/reset-password
    W->>W: 消費 token，更新密碼 hash
    W-->>B: 可用新密碼登入
```

安全邊界：

1. 驗證 token 與 reset token 只存在於後端流程，不能寫入前端 localStorage、GitHub、文件或 log。
2. 登入依賴 Email 已驗證與密碼 hash；session 使用 HttpOnly cookie。
3. Gmail 只負責收件與讓使用者點擊連結，不能取代後端的帳號狀態。
4. Cloudflare API token 只放在 Zeabur runtime secret；目前使用 `LOUISKO_CLOUDFLARE_EMAIL_TOKEN`，實際值不記錄。

## 四、部署與變更流

```mermaid
flowchart TD
    C1[修改網站／server.js]
    C2[本機檢查\nnode --check／git diff --check／smoke test]
    C3[Git commit／push\nGitHub main 或指定分支]
    D1[Zeabur deploy\n指定 project／service／environment]
    D2[載入 runtime secrets\nEmail、R2、公開網址]
    D3[正式服務啟動]
    V1[公開健康檢查\n網站 200／auth status]
    V2[實際郵件測試\n註冊／驗證／重設／刪除]
    DOC[更新 governance 文件與變更紀錄]

    C1 --> C2 --> C3
    C2 -->|需要立即驗證時| D1
    C3 -.->|若已設定 GitHub Actions／Zeabur integration| D1
    D1 --> D2 --> D3 --> V1 --> V2 --> DOC
```

目前要特別區分兩種關係：

- GitHub 是版本來源與歷史紀錄；不可假設每個 GitHub push 都自動部署，除非已確認 webhook／Actions／Zeabur integration。
- Zeabur CLI 或控制台部署是目前可直接控制正式 service 的部署路徑；部署完成後仍需用 `louisko.com` 實際驗證，而不是只看 Zeabur 的成功訊息。

## 五、LINE 私有 Bazi 流程

```mermaid
sequenceDiagram
    autonumber
    participant L as LINE Platform
    participant C as Cloudflare DNS／Proxy
    participant Z as Zeabur Node service
    participant A as LINE adapter
    participant K as Existing Bazi Core／Prompt Builder
    participant R as Existing R2／local storage

    L->>C: POST /api/line/webhook + x-line-signature
    C->>Z: 轉送原始 body
    Z->>A: 驗證 HMAC、event idempotency、User ID allowlist
    A->>A: resolve BAZI_LINE_OWNER_EMAIL → accountId
    L->>A: 排盤命令或選擇命主
    A-->>L: 正規化資料與確認按鈕
    L->>A: 確認排盤
    A->>K: 直接呼叫網站既有 Core 與終身 Prompt Builder
    K-->>A: canonical result + advisorPrompt.content
    A->>R: owner-scoped generation／artifact／session records
    A-->>L: 摘要、Prompt 分段或短效 Markdown URL
```

LINE 與網站的分界是操作者身分，不是另一份命主資料：`BAZI_LINE_ALLOWED_USER_IDS` 決定誰能操作，`BAZI_LINE_OWNER_EMAIL` 決定操作哪個網站帳號，Bazi Core 決定如何排盤。`查看 Prompt` 只讀最新 artifact；`重新產生` 才更新 generation／artifact。

## 六、目前已具備的功能

| 領域 | 已具備功能 |
|---|---|
| 網站 | Bazi 排盤、命主紀錄、Photo 頁面與同一 Node service API |
| 帳號 | Email 註冊、登入、登出、跨裝置命主紀錄同步 |
| Email 安全 | Email 驗證、重新寄送驗證信、忘記密碼、一次性重設密碼、刪除帳號 |
| 儲存 | Cloudflare R2 照片與後端 metadata／profile 儲存路徑 |
| 部署 | GitHub 版本管理、Zeabur Node service、Cloudflare DNS／proxy |
| 網域 | `louisko.com` 使用 Cloudflare `henrik`／`rose` nameservers；Zeabur 保留購買／續期入口 |
| 郵件 | Cloudflare Email Sending 已啟用，正式驗證信與重設信已完成端到端測試 |
| LINE Bot | Phase 1 私有排盤確認、命主列表、Prompt 查看、Markdown 短效下載、簽章驗證、allowlist、TTL session、rate limit 與 webhook idempotency |

## 七、未來可擴充功能

```mermaid
mindmap
  root((Louisko.com))
    可靠部署
      GitHub Actions CI
      Preview environment
      自動 smoke test
      部署回滾
    Cloudflare 邊界
      WAF
      Rate limiting
      Bot protection
      DNS health check
      Email SPF DKIM DMARC 監測
    帳號系統
      Email 變更驗證
      多因素驗證
      登入裝置管理
      Session 撤銷
      帳號匯出與完整刪除
    Bazi 產品
      命主紀錄版本
      分析歷史
      Prompt 匯出歷史
      分享連結
      權限與訂閱方案
    LINE Bot
      Rich Menu
      LINE 互動問命
      Push 通知
      多操作者權限
    資料與營運
      R2 備份策略
      D1 或 Postgres 帳號資料庫
      Audit log
      錯誤監控
      郵件退信監控
    使用者體驗
      多語言郵件模板
      手機登入優化
      密碼管理器相容
      帳號恢復流程
```

### 建議優先順序

| 優先級 | 功能 | 主要新增關係 | 直接價值 |
|---|---|---|---|
| P0 | GitHub Actions CI + smoke test | GitHub → Actions → Zeabur | 每次變更先驗證，降低正式部署風險 |
| P0 | 登入／註冊 rate limit | Cloudflare → Node API | 降低暴力嘗試與郵件濫發 |
| P0 | 郵件退信與寄送監測 | Cloudflare Email → monitoring | 及早發現驗證信未抵達 |
| P1 | Email 變更驗證與裝置管理 | Node auth → R2／資料庫 | 增加帳號控制與安全性 |
| P1 | 正式資料庫層 | Node → D1 或 Postgres | 讓帳號、session、profile 查詢更可治理與備份 |
| P1 | Preview environment | GitHub branch → Zeabur preview | 在不影響 `louisko.com` 下驗證新功能 |
| P2 | WAF、Bot protection、Analytics | Cloudflare → website／API | 降低惡意流量並了解使用狀況 |
| P2 | Bazi 分析歷史、Prompt 歷史與分享 | Website → auth/profile storage | 將排盤結果轉為可回訪的長期產品 |

## 八、未來邊界設計建議

- 不要讓 Gmail 成為登入資料庫；帳號狀態、密碼 hash、session 與命主紀錄仍由後端控制。
- 不要讓 Cloudflare DNS 與 Zeabur service 設定分散成沒有紀錄的手動操作；每次變更同步寫入治理文件。
- 不要把 GitHub Actions secret、Zeabur token、Cloudflare token 或 R2 access key 放在 repository。
- 未來若導入 D1／Postgres，先定義資料遷移、帳號刪除、備份與復原策略，再切換 storage provider。
- 所有新增的認證功能都必須通過：跨裝置登入、驗證信、重設密碼、錯誤密碼、session 撤銷、帳號刪除與重複請求測試。

## 相關文件

- [部署與網域治理](./deployment-reference.md)
- [Cloudflare／R2 操作](./cloudflare-r2-operations.md)
- [Bazi 應用索引](../../apps/bazi/INDEX.md)
- [正式變更紀錄](../../scripts/site-workflow/WEB_CHANGE_LOG.md)

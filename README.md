# PawBook - 宠物店预约排程系统

宠物店预约管理系统，支持流水线作业模式的自动排程。

## 技术栈

- **后端**: Node.js + Express + TypeScript + PostgreSQL
- **前端**: Next.js + React + Tailwind CSS + TypeScript

## 快速开始

### 1. 数据库

确保本地运行 PostgreSQL，创建数据库：

```bash
createdb pet_booking
```

### 2. 后端与数据库初始化

**数据库初始化** = 跑迁移（建表） + 可选种子（品种数据 + 默认管理员）。只需在**第一次**或**表结构变更后**执行。

```bash
cd backend
cp .env.example .env       # 按需修改 DATABASE_URL
npm install
npm run migrate            # 执行迁移，创建/更新表结构
npm run seed               # 可选：导入狗品种 + 创建默认管理员
# 或一条命令完成迁移+种子：
npm run db:setup
npm run dev                # 启动 http://localhost:3001
```

默认管理员账号: `admin@petshop.com` / `admin123`

#### 数据库初始化命令说明

| 命令 | 作用 |
|------|------|
| `npm run migrate` | 执行所有迁移，创建/更新表（必须至少跑一次） |
| `npm run seed` | 导入狗品种 CSV + 创建默认管理员（可选） |
| `npm run db:setup` | 先 migrate 再 seed，适合首次初始化 |
| `npm run seed:clear-breeds` | 清空品种表后重新 seed（慎用） |

**部署环境（如云服务器、RDS）**：在能访问数据库的机器上，设置好 `DATABASE_URL` 后执行一次 `npm run migrate`（若需初始数据再执行 `npm run seed`）。例如：

```bash
cd backend
export DATABASE_URL="postgresql://用户:密码@主机:5432/pet_booking"
npm run migrate
npm run seed   # 可选
```

### 3. 前端

```bash
cd frontend
npm install
npm run dev                # 启动 http://localhost:3000
```

## 本地 Docker 一键跑（Demo）

不装本地 PostgreSQL 也能跑，compose 里自带数据库：

```bash
cd /path/to/pet
docker compose up -d --build
```

- 前端：http://localhost:3000  
- 后端：http://localhost:3001  
- 数据库：Postgres 16，端口 5432（用户/密码/库：`app`/`app`/`pet_booking`）

无需改 `.env`，会用 compose 里的默认值。启动时后端会对 Postgres 自动执行迁移。需要品种数据与默认管理员时，在本机执行：

```bash
cd backend && DATABASE_URL=postgresql://app:app@localhost:5432/pet_booking npm run seed
```

## EC2 部署（Docker + RDS）

同一份 `docker-compose.yml`，在 EC2 上把 `.env` 里填上 RDS 和公网地址即可（不填则默认用本地 postgres，EC2 上要填）。

1. **EC2 安装 Docker**（如未装）：[Install Docker Engine](https://docs.docker.com/engine/install/)。

2. **配置 .env**（在项目根目录）：
   ```bash
   cp .env.example .env
   # 填 DATABASE_URL（RDS 连接串，需 SSL 时加 ?sslmode=require）、NEXT_PUBLIC_API_URL、CORS_ORIGIN（EC2 公网 IP 或域名）
   ```

3. **一键启动**：
   ```bash
   docker compose up -d --build
   ```

4. **RDS 安全组**：入站放行 EC2 访问 **5432**。

5. **品种与默认管理员**：在本机用同一 `DATABASE_URL` 执行 `cd backend && npm run seed`（依赖根目录 `dog.csv`）。

## 核心功能

| 功能 | 说明 |
|------|------|
| 品种管理 | 从 CSV 导入狗品种及基础分，预留猫品种扩展 |
| 分数计算 | 品种基准分 + 体重偏差修正 + 年龄修正 → 1-5 分 |
| 时段占用 | 按宠物预估时长占用连续半小时槽、总分/狗数双上限 |
| 状态流转 | 等待 → 进行中 → 可接走 → 已取走 |
| 容量控制 | 95% 分数上限预警、每槽仅 1 只狗 |

## 项目结构

```
pet/
├── backend/
│   └── src/
│       ├── db/           # 迁移、种子数据
│       ├── middleware/    # JWT 认证
│       ├── modules/      # auth, breeds, pets, appointments, capacity, schedule
│       └── utils/        # 分数计算器
├── frontend/
│   └── src/
│       ├── app/          # 页面路由
│       │   ├── (user)/   # 用户端: 首页、宠物、预约
│       │   ├── store/    # 店长端: 看板
│       │   ├── login/
│       │   └── register/
│       ├── components/   # 共享组件
│       └── lib/          # API 客户端、类型、认证
└── dog.csv               # 狗品种数据
```

## API 端点

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 登录
- `GET /api/breeds?species=dog` - 品种列表
- `GET/POST/PUT/DELETE /api/pets` - 宠物 CRUD
- `GET /api/appointments/available-slots` - 可用时间槽
- `POST /api/appointments` - 创建预约
- `GET /api/appointments/my` - 我的预约
- `GET /api/appointments/day` - 当日看板（店长）
- `GET /api/appointments/stats` - 当日统计（店长）
- `PATCH /api/appointments/:id/status` - 状态变更（店长）
- `GET/PUT /api/capacity` - 容量配置

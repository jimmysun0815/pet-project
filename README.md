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

## EC2 部署（Docker，数据库用已有 RDS）

仅部署前后端，数据库使用你已有的 RDS。首次启动时后端会自动对 RDS 执行迁移。

1. **EC2 上安装 Docker**（如未装）：  
   [Install Docker Engine](https://docs.docker.com/engine/install/)（选你的发行版）。

2. **克隆项目，配置环境变量**：
   ```bash
   cd /path/to/pet
   cp .env.example .env
   # 编辑 .env：填 DATABASE_URL（RDS）、JWT_SECRET、NEXT_PUBLIC_API_URL、CORS_ORIGIN（见 .env.example 注释）
   ```

3. **一键构建并启动**：
   ```bash
   docker compose up -d --build
   ```
   - 前端：`http://EC2公网IP:3000`
   - 后端 API：`http://EC2公网IP:3001`

4. **RDS 安全组**：放行 EC2 所在安全组或 EC2 公网 IP 的 **5432** 端口，否则后端连不上数据库。

5. **可选：导入品种与默认管理员**  
   若 RDS 是空库，迁移会建表。需要品种数据与默认管理员时，在**本机**（有 `dog.csv` 和 backend 代码）执行一次即可，使用与 RDS 相同的 `DATABASE_URL`：
   ```bash
   cd backend
   export DATABASE_URL="postgresql://用户:密码@RDS端点:5432/数据库名"
   npm run seed
   ```

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

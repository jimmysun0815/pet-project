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

### 2. 后端

```bash
cd backend
cp .env.example .env       # 按需修改数据库连接
npm install
npm run migrate            # 创建表结构
npm run seed               # 导入狗品种 + 创建默认管理员
npm run dev                # 启动 http://localhost:3001
```

默认管理员账号: `admin@petshop.com` / `admin123`

### 3. 前端

```bash
cd frontend
npm install
npm run dev                # 启动 http://localhost:3000
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

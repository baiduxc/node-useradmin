# 会员功能说明

## 功能概述

系统支持两种应用模式：
1. **免费模式（free）**：用户无需开通会员即可使用
2. **收费模式（paid）**：用户必须开通有效会员才能使用

## 数据库变更

### 1. 应用表（apps）
- 新增字段：`charge_mode` (VARCHAR(20))
  - 可选值：`free`（免费模式）、`paid`（收费模式）
  - 默认值：`free`

### 2. 用户表（users）
- 新增字段：`member_expires_at` (DATETIME)
  - 会员到期时间
  - 如果为NULL，表示未开通会员

### 3. 充值卡表（recharge_cards）
- 修改字段：`amount` → `expires_days` (INTEGER)
  - 从充值金额改为会员天数
  - 表示该充值卡可以延长多少天的会员时间

### 4. 充值记录表（recharge_records）
- 修改字段：`amount` → `expires_days` (INTEGER)
  - 从充值金额改为会员天数

## API变更

### 1. 应用管理API

#### 创建应用
**POST /api/v1/admin/apps**

新增参数：
```json
{
  "app_id": "my-app",
  "app_name": "我的应用",
  "login_mode": "password",
  "charge_mode": "paid"  // 新增：free 或 paid
}
```

#### 更新应用
**PUT /api/v1/admin/apps/:id**

新增参数：
```json
{
  "charge_mode": "paid"  // 可选：free 或 paid
}
```

#### 应用列表/详情
返回数据中新增 `charge_mode` 字段：
```json
{
  "id": 1,
  "app_id": "my-app",
  "app_name": "我的应用",
  "login_mode": "password",
  "charge_mode": "paid",  // 新增
  "status": "active"
}
```

### 2. 用户API

所有返回用户信息的接口都会包含 `member_expires_at` 字段：
```json
{
  "id": 1,
  "username": "testuser",
  "member_expires_at": "2024-12-31 23:59:59",  // 新增：会员到期时间
  "points": 100,
  "balance": "50.00"
}
```

### 3. 充值卡管理API

#### 创建充值卡
**POST /api/v1/admin/cards**

参数变更：
```json
{
  "expires_days": 30,  // 改为：会员天数（必填，整数，大于0）
  "points": 10,        // 可选：赠送积分
  "count": 10,         // 可选：创建数量
  "expired_at": "2024-12-31 23:59:59"  // 可选：充值卡过期时间
}
```

返回数据：
```json
{
  "success": true,
  "message": "成功创建10张充值卡",
  "data": {
    "cards": [
      {
        "card_no": "C1704067200000ABC123",
        "card_password": "ABCD1234EFGH",
        "expires_days": 30,  // 改为：会员天数
        "points": 10
      }
    ]
  }
}
```

### 4. 充值API

#### 充值卡充值
**POST /api/v1/recharge/card**

返回数据变更：
```json
{
  "success": true,
  "message": "充值成功",
  "data": {
    "expires_days": 30,              // 改为：会员天数
    "points": 10,                    // 赠送积分
    "member_expires_at": "2024-02-01 10:00:00",  // 新的会员到期时间
    "total_points": 110
  }
}
```

**说明**：
- 如果用户已有未过期的会员，会在现有到期时间基础上延长
- 如果用户会员已过期或未开通，从当前时间开始计算

#### 在线充值
**POST /api/v1/recharge/online**

参数变更：
```json
{
  "expires_days": 30,        // 改为：会员天数（必填，整数，大于0）
  "payment_method": "alipay" // 可选：支付方式
}
```

返回数据：
```json
{
  "success": true,
  "message": "订单创建成功",
  "data": {
    "order_id": 1,
    "order_no": "R1704067200000ABC123",
    "expires_days": 30,      // 改为：会员天数
    "payment_method": "alipay",
    "status": "pending"
  }
}
```

### 5. 会员验证中间件

新增中间件 `verifyMember`，用于验证用户是否有有效会员。

**使用方式**：
```javascript
const { verifyToken, verifyMember } = require('../middleware/auth');

// 在需要会员验证的路由上使用
router.get('/protected-route', verifyToken, verifyMember, async (req, res) => {
  // 只有有效会员才能访问
});
```

**验证逻辑**：
1. 如果应用的 `charge_mode` 为 `free`，直接通过验证
2. 如果应用的 `charge_mode` 为 `paid`：
   - 检查用户是否有 `member_expires_at`
   - 如果为NULL，返回错误："您还不是会员，请先开通会员"
   - 如果已过期，返回错误："您的会员已过期，请续费后使用"
   - 如果未过期，通过验证

**错误响应**：
```json
{
  "success": false,
  "message": "您还不是会员，请先开通会员"
}
```

或

```json
{
  "success": false,
  "message": "您的会员已过期，请续费后使用",
  "data": {
    "member_expires_at": "2024-01-01 00:00:00"
  }
}
```

## 使用示例

### 1. 设置应用为收费模式

```bash
curl -X PUT http://localhost:3000/api/v1/admin/apps/1 \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "charge_mode": "paid"
  }'
```

### 2. 创建会员充值卡

```bash
curl -X POST http://localhost:3000/api/v1/admin/cards \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "expires_days": 30,
    "points": 10,
    "count": 5
  }'
```

### 3. 用户使用充值卡开通会员

```bash
curl -X POST http://localhost:3000/api/v1/recharge/card \
  -H "Authorization: Bearer {user_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "card_no": "C1704067200000ABC123",
    "card_password": "ABCD1234EFGH"
  }'
```

### 4. 在需要会员验证的路由上使用

```javascript
// 示例：某个需要会员才能使用的功能
router.post('/api/v1/feature/premium', verifyToken, verifyMember, async (req, res) => {
  // 只有有效会员才能执行此操作
  res.json({ success: true, message: '功能使用成功' });
});
```

## 注意事项

1. **数据库迁移**：运行 `npm run migrate` 会自动添加新字段，但不会删除旧字段。如果需要完全迁移，需要手动处理旧数据。

2. **会员时间计算**：
   - 如果用户已有未过期会员，新充值会在现有到期时间基础上延长
   - 如果用户会员已过期或未开通，从当前时间开始计算

3. **免费模式**：即使应用设置为免费模式，用户仍然可以通过充值卡开通会员（获得积分等权益），但不会强制要求会员才能使用。

4. **会员验证**：只有在应用设置为收费模式时，才会验证会员状态。免费模式下，所有用户都可以正常使用。

5. **余额字段**：`balance` 字段仍然保留，可以用于其他用途（如购买商品等），但不再用于会员充值。


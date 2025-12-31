# API 文档

## 基础信息

- 基础URL: `http://localhost:3000/api/v1`
- 所有接口返回JSON格式数据
- 需要认证的接口需要在Header中携带: `Authorization: Bearer {token}`

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

### 错误响应

```json
{
  "success": false,
  "message": "错误信息",
  "errors": [
    {
      "msg": "字段验证错误",
      "param": "username",
      "location": "body"
    }
  ]
}
```

## 后台管理API

### 13. 管理员登录

**接口**: `POST /admin/login`

**Headers**: 

- `Content-Type: application/json`

**请求参数**:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**成功响应** (200):

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "admin": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "status": "active",
      "last_login_at": "2024-01-02 10:00:00",
      "created_at": "2024-01-01 12:00:00"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**错误响应** (401):

```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

---

### 14. 会员列表

**接口**: `GET /admin/members?page=1&limit=20&app_id=xxx&keyword=xxx`

**Headers**: 

- `Authorization: Bearer {admin_token}`

**查询参数**:

- `page`: 页码（可选，默认1）
- `limit`: 每页数量（可选，默认20）
- `app_id`: 应用ID（可选，筛选特定应用）
- `keyword`: 关键词（可选，搜索用户名、邮箱、手机号）

**成功响应** (200):

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": 1,
        "app_id": "default-app",
        "username": "testuser",
        "email": "test@example.com",
        "phone": "13800138000",
        "avatar_url": "https://example.com/avatar.jpg",
        "points": 100,
        "balance": "50.00",
        "level_id": 1,
        "status": "active",
        "created_at": "2024-01-01 12:00:00",
        "last_login_at": "2024-01-02 10:00:00"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

---

### 15. 会员详情

**接口**: `GET /admin/members/:id`

**Headers**: 

- `Authorization: Bearer {admin_token}`

**路径参数**:

- `id`: 会员ID

**成功响应** (200):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "app_id": "default-app",
    "username": "testuser",
    "email": "test@example.com",
    "phone": "13800138000",
    "avatar_url": "https://example.com/avatar.jpg",
    "points": 100,
    "balance": "50.00",
    "level_id": 1,
    "status": "active",
    "created_at": "2024-01-01 12:00:00",
    "last_login_at": "2024-01-02 10:00:00"
  }
}
```

**错误响应** (404):

```json
{
  "success": false,
  "message": "会员不存在"
}
```

---

### 16. 更新会员信息

**接口**: `PUT /admin/members/:id`

**Headers**: 

- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**路径参数**:

- `id`: 会员ID

**请求参数**:

```json
{
  "points": 1000,
  "balance": 500.00,
  "level_id": 2,
  "member_expires_at": "2024-12-31 23:59:59",
  "status": "active"
}
```

**说明**: 所有字段都是可选的，只需要传递要更新的字段

**成功响应** (200):

```json
{
  "success": true,
  "message": "更新成功",
  "data": {
    "id": 1,
    "app_id": "default-app",
    "username": "testuser",
    "email": "test@example.com",
    "phone": "13800138000",
    "avatar_url": "https://example.com/avatar.jpg",
    "points": 1000,
    "balance": "500.00",
    "level_id": 2,
    "member_expires_at": "2024-12-31 23:59:59",
    "status": "active",
    "created_at": "2024-01-01 12:00:00"
  }
}
```

---

### 17. 应用列表

**接口**: `GET /admin/apps`

**Headers**: 

- `Authorization: Bearer {admin_token}`

**成功响应** (200):

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "app_id": "default-app",
      "app_name": "默认应用",
      "login_mode": "password",
      "charge_mode": "free",
      "status": "active",
      "created_at": "2024-01-01 12:00:00",
      "updated_at": "2024-01-01 12:00:00"
    },
    {
      "id": 2,
      "app_id": "my-app",
      "app_name": "我的应用",
      "login_mode": "machine",
      "charge_mode": "paid",
      "status": "active",
      "created_at": "2024-01-02 10:00:00",
      "updated_at": "2024-01-02 10:00:00"
    }
  ]
}
```

**字段说明**:

- `login_mode`: 登录模式（password: 用户名密码, machine: 免登录模式）
- `charge_mode`: 收费模式（free: 免费模式, paid: 收费模式）
- `status`: 状态（active: 启用, inactive: 禁用）

---

### 18. 创建应用

**接口**: `POST /admin/apps`

**Headers**: 

- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**请求参数**:

```json
{
  "app_id": "my-app",
  "app_name": "我的应用",
  "login_mode": "password",
  "charge_mode": "paid"
}
```

**参数说明**:

- `app_id`: 应用ID（必填，唯一）
- `app_name`: 应用名称（必填）
- `login_mode`: 登录模式（必填，password 或 machine）

**成功响应** (200):

```json
{
  "success": true,
  "message": "应用创建成功",
  "data": {
    "id": 2,
    "app_id": "my-app",
    "app_name": "我的应用",
    "app_secret": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "login_mode": "password",
    "status": "active",
    "created_at": "2024-01-02 10:00:00"
  }
}
```

**重要**: 返回的 `app_secret` 需要保存，用于API调用时的应用认证

**错误响应** (400):

```json
{
  "success": false,
  "message": "应用ID已存在"
}
```

---

### 19. 更新应用

**接口**: `PUT /admin/apps/:id`

**Headers**: 

- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**路径参数**:

- `id`: 应用ID

**请求参数**:

```json
{
  "app_name": "新应用名",
  "login_mode": "machine",
  "charge_mode": "paid",
  "status": "active"
}
```

**说明**: 所有字段都是可选的

**成功响应** (200):

```json
{
  "success": true,
  "message": "更新成功",
  "data": {
      "id": 2,
      "app_id": "my-app",
      "app_name": "新应用名",
      "login_mode": "machine",
      "charge_mode": "paid",
      "status": "active",
      "created_at": "2024-01-02 10:00:00"
  }
}
```

---

### 20. 充值卡列表

**接口**: `GET /admin/cards?page=1&limit=20&status=unused`

**Headers**: 

- `Authorization: Bearer {admin_token}`

**查询参数**:

- `page`: 页码（可选，默认1）
- `limit`: 每页数量（可选，默认20）
- `status`: 状态筛选（可选，unused: 未使用, used: 已使用, expired: 已过期）

**成功响应** (200):

```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "id": 1,
        "card_no": "C1704067200000ABC123",
        "card_password": "HASHED_PASSWORD",
        "expires_days": 30,
        "points": 10,
        "status": "unused",
        "used_by": null,
        "used_at": null,
        "expired_at": null,
        "created_at": "2024-01-01 12:00:00",
        "updated_at": "2024-01-01 12:00:00"
      },
      {
        "id": 2,
        "card_no": "C1704067200000DEF456",
        "card_password": "HASHED_PASSWORD",
        "expires_days": 15,
        "points": 5,
        "status": "used",
        "used_by": 1,
        "used_at": "2024-01-02 10:00:00",
        "expired_at": null,
        "created_at": "2024-01-01 12:00:00",
        "updated_at": "2024-01-02 10:00:00"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

**字段说明**:

- `card_password`: 返回的是加密后的密码，不是原始密码
- `status`: 状态（unused: 未使用, used: 已使用, expired: 已过期）
- `used_by`: 使用该卡的会员ID（如果已使用）

---

### 21. 创建充值卡

**接口**: `POST /admin/cards`

**Headers**: 

- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**请求参数**:

```json
{
  "expires_days": 30,
  "points": 10,
  "count": 10,
  "expired_at": "2024-12-31 23:59:59"
}
```

**参数说明**:

- `amount`: 面额（必填，大于0）
- `points`: 赠送积分（可选，默认0）
- `count`: 创建数量（可选，默认1，最大1000）
- `expired_at`: 过期时间（可选，格式: YYYY-MM-DD HH:mm:ss）

**成功响应** (200):

```json
{
  "success": true,
  "message": "成功创建10张充值卡",
  "data": {
    "cards": [
      {
        "card_no": "C1704067200000ABC123",
        "card_password": "ABCD1234EFGH",
        "expires_days": 30,
        "points": 10
      },
      {
        "card_no": "C1704067200000DEF456",
        "card_password": "IJKL5678MNOP",
        "expires_days": 30,
        "points": 10
      }
      // ... 更多卡片
    ]
  }
}
```

**重要**: 返回的 `card_no` 和 `card_password` 需要保存，这是充值卡的唯一凭证

---

### 22. 会员等级列表

**接口**: `GET /admin/levels`

**Headers**: 

- `Authorization: Bearer {admin_token}`

**成功响应** (200):

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "level_name": "普通会员",
      "level_value": 1,
      "min_points": 0,
      "discount": "1.00",
      "benefits": "{}",
      "status": "active",
      "created_at": "2024-01-01 12:00:00",
      "updated_at": "2024-01-01 12:00:00"
    },
    {
      "id": 2,
      "level_name": "黄金会员",
      "level_value": 2,
      "min_points": 1000,
      "discount": "0.90",
      "benefits": "{\"free_shipping\": true}",
      "status": "active",
      "created_at": "2024-01-02 10:00:00",
      "updated_at": "2024-01-02 10:00:00"
    }
  ]
}
```

**字段说明**:

- `level_value`: 等级数值，越大等级越高
- `min_points`: 所需最低积分
- `discount`: 折扣率（0-1之间，1表示无折扣）
- `benefits`: 权益说明（JSON字符串）

---

### 23. 创建会员等级

**接口**: `POST /admin/levels`

**Headers**: 

- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**请求参数**:

```json
{
  "level_name": "黄金会员",
  "level_value": 2,
  "min_points": 1000,
  "discount": 0.9,
  "benefits": {
    "free_shipping": true,
    "priority_support": true
  }
}
```

**参数说明**:

- `level_name`: 等级名称（必填）
- `level_value`: 等级数值（必填，正整数）
- `min_points`: 所需最低积分（可选，默认0）
- `discount`: 折扣率（可选，默认1.00，0-1之间）
- `benefits`: 权益说明（可选，JSON对象）

**成功响应** (200):

```json
{
  "success": true,
  "message": "会员等级创建成功",
  "data": {
    "id": 2,
    "level_name": "黄金会员",
    "level_value": 2,
    "min_points": 1000,
    "discount": "0.90",
    "benefits": "{\"free_shipping\": true, \"priority_support\": true}",
    "status": "active",
    "created_at": "2024-01-02 10:00:00",
    "updated_at": "2024-01-02 10:00:00"
  }
}
```

---

### 24. 更新会员等级

**接口**: `PUT /admin/levels/:id`

**Headers**: 

- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**路径参数**:

- `id`: 等级ID

**请求参数**:

```json
{
  "level_name": "新等级名",
  "min_points": 2000,
  "discount": 0.8,
  "status": "active"
}
```

**说明**: 所有字段都是可选的

**成功响应** (200):

```json
{
  "success": true,
  "message": "更新成功",
  "data": {
    "id": 2,
    "level_name": "新等级名",
    "level_value": 2,
    "min_points": 2000,
    "discount": "0.80",
    "benefits": "{\"free_shipping\": true}",
    "status": "active",
    "created_at": "2024-01-02 10:00:00",
    "updated_at": "2024-01-02 11:00:00"
  }
}
```

---

### 25. 系统配置列表

**接口**: `GET /admin/configs`

**Headers**: 

- `Authorization: Bearer {admin_token}`

**成功响应** (200):

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "config_key": "sms_enabled",
      "config_value": "false",
      "config_type": "boolean",
      "description": "短信服务是否启用",
      "created_at": "2024-01-01 12:00:00",
      "updated_at": "2024-01-01 12:00:00"
    },
    {
      "id": 2,
      "config_key": "email_enabled",
      "config_value": "false",
      "config_type": "boolean",
      "description": "邮件服务是否启用",
      "created_at": "2024-01-01 12:00:00",
      "updated_at": "2024-01-01 12:00:00"
    },
    {
      "id": 3,
      "config_key": "storage_type",
      "config_value": "r2",
      "config_type": "string",
      "description": "存储类型",
      "created_at": "2024-01-01 12:00:00",
      "updated_at": "2024-01-01 12:00:00"
    }
  ]
}
```

**字段说明**:

- `config_key`: 配置键（唯一）
- `config_value`: 配置值（字符串格式）
- `config_type`: 配置类型（string, number, boolean, json）

---

### 26. 更新系统配置

**接口**: `PUT /admin/configs/:key`

**Headers**: 

- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**路径参数**:

- `key`: 配置键

**请求参数**:

```json
{
  "config_value": "true"
}
```

**参数说明**:

- `config_value`: 配置值（必填，字符串格式）

**成功响应** (200):

```json
{
  "success": true,
  "message": "配置更新成功",
  "data": {
    "id": 1,
    "config_key": "sms_enabled",
    "config_value": "true",
    "config_type": "boolean",
    "description": "短信服务是否启用",
    "created_at": "2024-01-01 12:00:00",
    "updated_at": "2024-01-02 10:00:00"
  }
}
```

**说明**: 如果配置不存在，会自动创建

---

### 27. 获取存储配置

**接口**: `GET /admin/storage`

**Headers**: 

- `Authorization: Bearer {admin_token}`

**成功响应** (200):

```json
{
  "success": true,
  "data": {
    "storage_type": "r2",
    "r2": {
      "accountId": "your-r2-account-id",
      "accessKeyId": "your-r2-access-key-id",
      "secretAccessKey": "your-r2-secret-access-key",
      "bucketName": "your-bucket-name",
      "publicUrl": "https://your-bucket.r2.dev"
    },
    "tencent": {
      "secretId": "your-tencent-secret-id",
      "secretKey": "your-tencent-secret-key",
      "region": "ap-guangzhou",
      "bucket": "your-bucket-name",
      "publicUrl": "https://your-bucket.cos.ap-guangzhou.myqcloud.com"
    }
  }
}
```

---

### 28. 更新存储配置

**接口**: `PUT /admin/storage`

**Headers**: 

- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**请求参数**:

```json
{
  "storage_type": "r2",
  "r2": {
    "account_id": "your-r2-account-id",
    "access_key_id": "your-r2-access-key-id",
    "secret_access_key": "your-r2-secret-access-key",
    "bucket_name": "your-bucket-name",
    "public_url": "https://your-bucket.r2.dev"
  },
  "tencent": {
    "secret_id": "your-tencent-secret-id",
    "secret_key": "your-tencent-secret-key",
    "region": "ap-guangzhou",
    "bucket": "your-bucket-name",
    "public_url": "https://your-bucket.cos.ap-guangzhou.myqcloud.com"
  }
}
```

**参数说明**:

- `storage_type`: 存储类型（必填，r2 或 tencent）
- `r2`: R2配置对象（可选）
- `tencent`: 腾讯云COS配置对象（可选）

**成功响应** (200):

```json
{
  "success": true,
  "message": "存储配置更新成功"
}
```

---

### 29. 获取短信配置

**接口**: `GET /admin/sms`

**Headers**: 

- `Authorization: Bearer {admin_token}`

**成功响应** (200):

```json
{
  "success": true,
  "data": {
    "enabled": false,
    "username": "your-sms-username",
    "password": "your-sms-password",
    "sign": "your-sms-sign"
  }
}
```

**字段说明**:

- `enabled`: 是否启用短信服务
- `username`: 短信宝用户名
- `password`: 短信宝密码
- `sign`: 短信签名

---

### 30. 更新短信配置

**接口**: `PUT /admin/sms`

**Headers**: 

- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**请求参数**:

```json
{
  "enabled": true,
  "username": "your-sms-username",
  "password": "your-sms-password",
  "sign": "your-sms-sign"
}
```

**参数说明**: 所有字段都是可选的，只需要传递要更新的字段

**成功响应** (200):

```json
{
  "success": true,
  "message": "短信配置更新成功"
}
```

---

### 31. 获取邮件配置

**接口**: `GET /admin/email`

**Headers**: 

- `Authorization: Bearer {admin_token}`

**成功响应** (200):

```json
{
  "success": true,
  "data": {
    "enabled": false,
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "user": "your-email@example.com",
    "password": "your-email-password",
    "from": "noreply@example.com"
  }
}
```

**字段说明**:

- `enabled`: 是否启用邮件服务
- `host`: SMTP服务器地址
- `port`: SMTP端口
- `secure`: 是否使用SSL/TLS
- `user`: SMTP用户名
- `password`: SMTP密码
- `from`: 发件人邮箱

---

### 32. 更新邮件配置

**接口**: `PUT /admin/email`

**Headers**: 

- `Authorization: Bearer {admin_token}`
- `Content-Type: application/json`

**请求参数**:

```json
{
  "enabled": true,
  "host": "smtp.example.com",
  "port": 587,
  "secure": false,
  "user": "your-email@example.com",
  "password": "your-email-password",
  "from": "noreply@example.com"
}
```

**参数说明**: 所有字段都是可选的，只需要传递要更新的字段

**成功响应** (200):

```json
{
  "success": true,
  "message": "邮件配置更新成功"
}
```

---

## 状态码说明

- `200`: 成功
- `400`: 请求参数错误
- `401`: 未授权（token无效或过期）
- `404`: 资源不存在
- `500`: 服务器内部错误

## 注意事项

1. **Token有效期**: 用户token默认7天，管理员token默认24小时
2. **时间格式**: 所有时间字段格式为 `YYYY-MM-DD HH:mm:ss`
3. **金额格式**: 所有金额字段为字符串格式，保留2位小数（如 "100.00"）
4. **分页**: 所有列表接口都支持分页，默认每页20条
5. **认证**: 用户API需要应用认证（x-app-id和x-app-secret），后台管理API需要管理员token
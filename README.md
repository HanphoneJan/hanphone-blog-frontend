# 寒枫的博客前端

**Next.js 框架项目，react18+tailwindcss4，路由方式是 App Router**

文档更新于2025年10月

[博客后端仓库](https://github.com/HanphoneJan/hanphone-blog-backend)

[][HanphoneJan/admin-file: 文件管理服务器][文件管理后端](https://github.com/HanphoneJan/admin-file)

### 项目结构

#### 项目根目录

```plaintext
.next目录。这是Nextjs的缓存目录，在执行dev或者build等命令的时候，会在本地项目的根目录下生成此目录。
node_modules目录
public目录 默认没有二级目录，默认路径是在根目录，以类似/favicon.ico的形式使用
src目录
.eslintrc.json 主要是eslint的规则。
.gitignore git 排除文件。
next-env.d.ts nextjs的一些ts相关内容，目前只有默认引用。
next.config.js Nextjs的配置文件，这里默认只有appDir参数。
package-lock.json 项目依赖lock文件。
package.json 项目npm相关文件。
tsconfig.json。typescript相关配置文件。
```

#### src 目录

```plaintext
├── src/
│   ├── app/                  	  // App router
│   │   ├── (main)               // 主路由
│   │   ├── admin            	 // admin路由
│   │   └── next-api          	// 服务器组件
│   ├── components/               // 公共组件，包括Header与Footer等
│   ├── assets/              	  // 静态资源
│   ├── types/                  
│   │   └── response.ts           // 定义接口结构
│   ├── context/                  // 状态管理
│   │   ├── UserContext.tsx       // 用户状态管理
│   │   └── ThemeProvider.tsx     // 主题状态管理
│   ├── lib/                   	  // 工具组件
│   │   ├── api.ts               // 路由定义
│   │   ├── Alert.tsx            // 提示窗口组件
│   │   ├── location.ts          // 腾讯地图定位
│   │   └── utils.ts             // 请求拦截器
```

### 开发命令

```bash
# 安装依赖
npm install
# 开发调试
npm run dev
```

### Node.js 部署运行

#### 编译

```bash
npm run build
```

由于使用了服务器组件和动态路由，不能使用静态编译部署
编译生成的文件在.next/server 文件夹中

#### 运行

```bash
npm run start
```

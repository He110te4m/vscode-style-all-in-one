<!-- omit in toc -->
## style 扩展

<!-- omit in toc -->
### 目录

- [主要功能](#主要功能)
- [feature](#feature)
- [支持的语言](#支持的语言)
- [使用示例](#使用示例)
- [配置项](#配置项)

### 主要功能

- 变量提示（vue 文件内也可提示）
- 反向索引（根据颜色值索引对应的变量名）
- 跳转到变量定义处
- 悬浮提示值对应的变量的值

### feature

- mixin（less/scss）提示、补全、定义、hover
- 函数（scss）提示、补全、定义、hover
- 类名提示
- 非 scoped 标签同类名警告

### 支持的语言

- vue
- css/pcss
- less
- scss/sass
- stylish（暂不支持，后续看使用情况，有需要再支持）

### 使用示例

- 变量索引

![变量索引](resource/正反向索引变量.gif)

- 支持删除字符触发提示

![支持删除字符触发提示](resource/删除字符后触发提示.gif)

- 为 CSS 变量替换提供更加简便的方式

![为 CSS 变量替换提供更加简便的方式](resource/删除字符后触发提示-css.gif)

- 转到定义

![转到定义](resource/全局变量、文件引入变量跳转定义处.gif)

### 配置项

```js
{
    // 配置全局变量表
    // 支持相对路径、绝对路径、npm 包、路径别名等
    // 支持文件、目录
    // 匹配顺序为：路径别名 > npm 包 > 相对路径（相对 workspace 根目录）
    "style-all-in-one.global-style": [
        "@/style/",
        "./global.less",
        "@sxf/sf-theme/dist/brand.less"     // npm 包无需写 node_modules
    ],

    // 配置项目使用的路径别名
    "style-all-in-one.path-aliases": {
        "@": "src",     // 路径末尾会自动添加 `/`，可省略不写
        "@atest/style-all-in-one": "src/style-all-in-one/alias-path/"   // 目录需要相对于 workspace 跟目录，或者使用绝对路径
    }
}
```

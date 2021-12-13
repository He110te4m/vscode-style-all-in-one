<!-- omit in toc -->
# Style all in one

English | [中文文档](https://github.com/He110te4m/vscode-style-all-in-one/blob/main/README_zh-CN.md)

<!-- omit in toc -->
## Table of contents
- [Features](#features)
- [Supported languages](#supported-languages)
- [Usage example](#usage-example)
- [Configuration](#configuration)

## Features

- [x] Variable prompt (It will also work in the vue file)
- [x] Index variable names by value
- [x] Jump to the variable definition
- [x] Click CodeLens to switch variable name and variable value

## Supported languages

- [x] vue
- [x] css/pcss/postcss
- [x] less
- [x] scss/sass
- [ ] stylish (Not supported for the time being, we will see the usage in the future, and we will support it if necessary)

## Usage example

- Variable index

![](https://github.com/He110te4m/vscode-style-all-in-one/raw/main/resources/demo/variable_index.gif)

- Provide an easier way for CSS variable substitution

![](https://github.com/He110te4m/vscode-style-all-in-one/raw/main/resources/demo/variable_replace.gif)

- Go to CSS variable's definition

![](https://github.com/He110te4m/vscode-style-all-in-one/raw/main/resources/demo/go_definition.gif)

## Configuration

```js
{
    // Configure the global variable
    // Support relative path, absolute path, npm package, path alias, etc.
    // Support files and directories
    // The matching order is: path alias> npm package> relative path (relative to workspace root directory)
    "style-all-in-one.global-style": [
        "@/style/",
        "./global.less",
        "@sxf/sf-theme/dist/brand.less"     // No need to write node_modules for npm packages
    ],

    // Configure the path alias used by the project
    "style-all-in-one.path-aliases": {
        "@": "src",     // `/` will be automatically added at the end of the path, you can omit it
        "@atest/style-all-in-one": "src/style-all-in-one/alias-path/"   // The directory needs to be relative to the workspace and the directory, or use an absolute path
    }
}
```

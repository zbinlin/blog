# Rollup: Error parsing /tmp/example.js: The keyword 'await' is reserved (1:18) in /tmp/example.js

## 解决方法

在 rollup 的配置（如 `rollup.config.js`）里加入：
```javascript
export default {
    //...,
    acorn: {
        allowReserved: true,
    },
    //...,
}
```

## 错误分析

一般出现这种错误是由于 js 里使用了保留字（Reserved Word）作为函数名或者变量名导致的，
因为 rollup 使用 acorn 将 js 解析成 AST，而在 acorn 中，只有 ecmascript 3 才被允许使用保
留字作为函数名或变量名，更高版本的 ecmascript 默认会报错，除非使用
`allowReserved: true` 选项来明确允许使用。

我们写代码时，也会避免使用保留字作为函数名或变量名，但有时会使用它们作为对象的 key
来使用，例如：

```javascript
var foo = {
    await: function () {
    },
};
```

这样使用一般没什么问题的，但如果代码通过 babel 转换后由 acorn 解析（通常我们不会
这样用的，因为 babel 本身已经内置了一个类似 acorn 的解析器，可以直接解析成 AST。
但如果在 rollup 中使用 babel，rollup 会将源代码经过 babel 转换后再由 rollup 默认的
解析器 acorn 处理）就会出现上面的那个报错了，为什么经过 babel 处理后会报错呢？

我们来看下经过 babel 处理后的[代码](http://babeljs.io/repl/#?evaluate=false&lineWrap=false&presets=es2015&code=var%20foo%20%3D%20%7B%0A%20%20await%3A%20function%20()%20%7B%0A%20%20%7D%0A%7D%3B)就清楚了：

```javascript
"use strict";

var foo = {
    await: function await() {}
};
```

可以看到，它将属性 await 的值（一个匿名函数）的函数名改成 await 这个保留字了。这时如果再将
这些代码传到 acorn 里解析，就会报错。



参考：

* rollup: https://github.com/rollup/rollup
* acorn: https://github.com/ternjs/acorn

# 在 remix v2 中使用 CJS 作为服务端模块格式

在 remix v2 版本中默认的服务端模块格式是 ESM，这在 nodejs 环境中，有些包由于没 
有提供 ESM exports 从而导致无法使用这些包，这时可以将模块格式改成 CJS 。

首先在 remix 配置文件 `remix.config.js`, 服务端启动文件 `server.js` 的后缀由 
`.js` 改成 `mjs`，然后在 `remix.config.mjs` 中，将 `serverModuleFormat` 的值改 
成 `cjs`。

然后在 `package.json` 中，去掉 `type: "module"`，并将 `scripts` 里的 `server.js` 全部改成 `server.mjs`。

这样改了之后，使用 `npm run dev` 可以正常启动开发环境了，但会发现修改文件时没有 
HMR 没有生效，在改成 CJS 前是正常的。

通过一番查找后，发现是 CJS 加载缓存导致的。

在 `server.mjs` 中使用 `import()` 来加载 CJS 格式的模块 `build/index.js` 时， 
缓存了该模块。原来使用 ESM 格式，可以通过改变加载文件的 query string 的方式刷新 
缓存（即在 ESM 加载中由于 URL 不一样而认为是一个新的模块了），但在 CJS 中这种方 
式失效了，在 CJS 加载中，该模块最后会缓存在 `require.cache` 里，这里 cache 是以 
文件绝对路径为 key 来缓存了，所以改变文件的 URL 但没有改变文件路经是无法刷新缓存的。
如果要刷新该模块，必须要删除这里的缓存。

在是启动 `npm run dev` 时，`server.mjs` 是以 ESM 格式加载了，而 `require` 变量在 
ESM 模块中不存在。虽然可以将 `server.mjs` 同样转换回 CJS 模块，但改动有点多。 
还好在 `node:module` 内置模块中，提供了一个创建 `require` 的函数变量：`createRequrie`， 
通过新建一个 `require` 来加载 CJS 模块，这样改动就小得多了。

首先在 `server.mjs` 的开头引入 `createRequire` 函数来创建 `require` 变量：

```mjs
import {createRequire} from "node:module";
const require = createRequire(import.meta.url);
```

然后将 `reimportRemixServer` 函数替换成以下内容：

```mjs
async function reimportServer() {
  for (const key of Object.keys(require.cache)) {
    if (key.endsWith(BUILD_PATH)) {
      delete require.cache[key];
    }
  }
  return require(BUILD_PATH);
}
```

这样就可以 remix v2 的默认服务器端模块格式改成 CJS 了。

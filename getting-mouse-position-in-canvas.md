# 获取鼠标在 canvas 中的位置


## 一般情况

一般情况下，如果需要在 canvas 中获取鼠标指针坐标，可以通过监听鼠标的 `mousemove`（如果只需单击时的坐标，可以用 `click`）事件。
当事件被触发时，我们可以获取鼠标相对于 viewport 的坐标（`event.clientX`, `event.clientY`）。
同时，我们可以通过 canvas.getBoundingClientRect() 来获取 canvas 相对于 viewport 的坐标，这样我们就可以计算出鼠标在 canvas 中的坐标。

```javascript
canvas.addEventListener("click", function __handler__(evt) {
    var x = evt.clientX;
    var y = evt.clientY;
    var rect = canvas.getBoundingClientRect();
    x -= rect.left;
    y -= rect.top;
    console.log(x, y); // (x, y) 就是鼠标在 canvas 单击时的坐标
});
```

** [DEMO-1](https://live-demo.github.io/getting-mouse-position-in-canvas/t1.html) **


## 设置了 border/padding

一般情况下，我们根据上面的方法获取出来的坐标是准确的，但当我们在 canvas 上添加了 border 或 padding 后，坐标就出现了偏移。

** [DEMO-2-0](res/getting-mouse-position-in-canvas/t2-0.html) **

这是因为在 canvas 中，坐标区域是 canvas 元素的 content 区域，不包括 border 和 padding，而通过上面得到的坐标原点在 canvas 的 border 开始的。因此，这里还需要减去 border 和 padding。

```javascript
var style = window.getComputedStyle(canvas, null);
var borderLeft = parseFloat(style["border-left-width"]);
var borderTop = parseFloat(style["border-top-width"]);
var paddingLeft = parseFloat(style["padding-left"]);
var paddingTop = parseFloat(style["padding-top"]);
canvas.addEventListener("click", function __handler__(evt) {
    var x = evt.clientX;
    var y = evt.clientY;
    var rect = canvas.getBoundingClientRect();
    x -= rect.left - borderLeft - paddingLeft; // 去除 borderLeft paddingLeft 后的坐标
    y -= rect.top - borderTop - paddingTop; // 去除 borderLeft paddingLeft 后的坐标
    console.log(x, y); // (x, y) 就是鼠标在 canvas 单击时的坐标
});
```

** [DEMO-2-1](https://live-demo.github.io/getting-mouse-position-in-canvas/t2-1.html) **


## 设置了 css width/height

当在 canvas 上设置了 css 的 width、height，并且与 canvas 的 width、height 属性不同时（可以非常简单对 canvas 进行放大或缩小，在移动页面上常常会使用）。从上面计算出来的坐标在 canvas 里使用又会出现偏移。

** [DEMO-3-0](https://live-demo.github.io/getting-mouse-position-in-canvas/t3-0.html) **

这里就需要对坐标进行修正：

```javascript
var style = window.getComputedStyle(canvas, null);
var cssWidth = parseFloat(style["width"]);
var cssHeight = parseFloat(style["height"]);
var scaleX = canvas.width / cssWidth; // 水平方向的缩放因子
var scaleY = canvas.height / cssHeight; // 垂直方向的缩放因子
canvas.addEventListener("click", function __handler__(evt) {
    var x = evt.clientX;
    var y = evt.clientY;
    var rect = canvas.getBoundingClientRect();
    x -= rect.left;
    y -= rect.top;
    x *= scaleX; // 修正水平方向的坐标
    y *= scaleY; // 修正垂直方向的坐标
    console.log(x, y); // (x, y) canvas 里的坐标
});
```

** [DEMO-3-1](https://live-demo.github.io/getting-mouse-position-in-canvas/t3-1.html) **


## 设置了 transform

如果我们在 canvas 的 style 上添加了 transform，又有可能会导致上面计算出来的坐标出现偏移。

** [DEMO-4-0](https://live-demo.github.io/getting-mouse-position-in-canvas/t4-0.html) **

而且经过 transform 后很难通过已经的 API 来计算出准确的坐标？w3c 为了解决这个问题，在 CSSOM-View 中添加了一个名为 [GeometryUtils](http://dev.w3.org/csswg/cssom-view/#the-geometryutils-interface) 的接口，该接口提供了一系列的 api 帮助我们对页面上的点、矩形、四边形等的坐标进行转换（目前只有 Firefox 支持）。
这里我们使用其中的 `convertPointFromNode` 方法，直接把在 viewport 的坐标 `(evt.clientX, evt.clientY)` 转换成相对于 canvas 元素的坐标。
如果 canvas 同时设置了样式 `width、height、box-sizing`，我们可以使用 `getBoxQuads` 方法来获取 canvas 经过 transform 之前的元素的 `width` 和 `height`（虽然可以使用通过获取 style 的相关属性来计算，但这种方式太麻烦了）来计算出经过 css 缩放的因子。

```javascript
var quads = canvas.getBoxQuads({
    box: "content",
    relativeTo: canvas
});
var bounds = quads[0];
var scaleX = canvas.width / bounds.width;
var scaleY = canvas.height / bounds.height;
canvas.addEventListener("click", function __handler__(evt) {
    var {x, y} = canvas.convertPointFromNode({
        x: evt.clientX,
        y: evt.clientY
    }, document, {
        toBox: "content"
    });
    x *= scaleX;
    y *= scaleY;
    console.log(x, y);
});
```
** [DEMO-4-1](https://live-demo.github.io/getting-mouse-position-in-canvas/t4-1.html) **


在文章的最后，贴上另一种方法的解决方案：

** [DEMO-4-2](https://live-demo.github.io/getting-mouse-position-in-canvas/t4-2.html) **

## koa-logger

[koa-logger](https://github.com/koajs/logger)是一款日志中间件，首先举一个使用koa-logger日志中间件的示例

```javascript
  const Koa = require('koa')
  const logger = require('koa-logger')
  const app = new Koa()

  app.use(logger())

  app.listen(3000)
```

在浏览器中访问3000端口，控制台中会输出如下

![https://github.com/wangtianlun/koa-design/blob/master/images/koa-logger-terminal.png](https://github.com/wangtianlun/koa-design/blob/master/images/koa-logger-terminal.png)

我们着重来看一下logger函数。

首先index.js中定义了dev函数，并将dev函数导出，这个dev函数就是我们示例中的logger函数，而dev函数的执行结果会返回一个async函数

```javascript
  module.exports = dev

  function dev() {
    ...

    return async function logger(ctx, next) {
      ...
    }
  }
```

## 其它函数

### log

### time
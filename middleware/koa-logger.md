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
在dev函数中，首先定义了一个print函数，这个函数的作用就是打印字符串。

```javascript
  const print = (function () {
    let transporter
    if (typeof opts === 'function') {
      transporter = opts
    } else if (opts && opts.transporter) {
      transporter = opts.transporter
    }

    return function printFunc (...args) {
      let str = util.format(...args)
      if (transporter) {
        transporter(str, args)
      } else {
        console.log(...args)
      }
    }
  }())
```

dev函数的参数为opts，我们可以向logger函数中传入一个transporter函数，并将koa-logger处理后的日志字符串和args对象传入其中，args对象包含了[format, method, url, status, time, length]，transporter函数的作用就是可以对输出字符串做一些自定义的处理，比如传入到其它可写流里面。 print函数会继续返回一个printFunc函数，在这里，如果传入了transport函数则会调用transport函数，否则会执行console.log

接下来着重来看logger函数

```javascript
  return async function logger (ctx, next) {
    // request
    const start = Date.now()
    print('  ' + chalk.gray('<--') +
      ' ' + chalk.bold('%s') +
      ' ' + chalk.gray('%s'),
        ctx.method,
        ctx.originalUrl)

    try {
      await next()
    } catch (err) {
      // log uncaught downstream errors
      log(print, ctx, start, null, err)
      throw err
    }

    // calculate the length of a streaming response
    // by intercepting the stream with a counter.
    // only necessary if a content-length header is currently not set.
    const length = ctx.response.length
    const body = ctx.body
    let counter
    if (length == null && body && body.readable) {
      ctx.body = body
        .pipe(counter = Counter())
        .on('error', ctx.onerror)
    }

    // log when the response is finished or closed,
    // whichever happens first.
    const res = ctx.res

    const onfinish = done.bind(null, 'finish')
    const onclose = done.bind(null, 'close')

    res.once('finish', onfinish)
    res.once('close', onclose)

    function done (event) {
      res.removeListener('finish', onfinish)
      res.removeListener('close', onclose)
      log(print, ctx, start, counter ? counter.length : length, null, event)
    }
  }
```

首先定义start常亮记录请求发起的毫秒数,

## 其它函数

### log

### time
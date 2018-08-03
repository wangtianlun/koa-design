koa源码中的application.js文件定义了一个Application类，它继承events模块，继承events模块的实例可以进行自定义事件的绑定以及触发事件。

```javascript
  const EventEmitter = require('events');
  
  class MyEmitter extends EventEmitter {}
  
  const myEmitter = new MyEmitter();
  
  // 绑定custom自定义事件
  myEmitter.on('custom', () => {
    console.log("hello world")
  })
  
  myEmitter.emit('custom')  // 触发custom事件
```
  
## 构造函数

```javascript
constructor() {
  super();

  this.proxy = false;
  this.middleware = [];  // 用于存储所有中间件的数组
  this.subdomainOffset = 2;
  this.env = process.env.NODE_ENV || 'development';  // 标识Koa实例的执行环境
  this.context = Object.create(context);
  this.request = Object.create(request);
  this.response = Object.create(response);
  if (util.inspect.custom) {
    this[util.inspect.custom] = this.inspect;
  }
}
```


我们就以一个最简单的Koa应用示例来说明上述各个实例属性的用法

```javascript
  const Koa = require('koa')
  const app = new Koa()
  
  app.use(async ctx => {
    console.log('hello koa')
  })
  
  app.listen(3000, () => {
    console.log('app is running on port 3000')
  })
 
```

Koa构造函数中的proxy属性默认为false，如果将proxy置为true，那么获取ctx.request.host的属性值时将会返回的是 ‘X-Forwarded-Host’头部的值。

X-Forwarded-Host请求头用于标识源请求主机，这个头部字段可以用于debug调试，统计以及生成依赖追踪的内容，故意暴露一些隐私信息，比如客户端的IP地址
因此，应用这个字段时一定要注意用户的隐私

```javascript
  X-Forwarded-Host: id42.example-cdn.com
```

用Object.create这种方式生成了三个对象，分别赋值给实例的context，request，response属性。那么这三个属性对象的__proto__属性就指向了context，request，response对象。 这三个对象后面会详细介绍

![https://github.com/wangtianlun/koa-design/blob/master/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202018-08-01%20%E4%B8%8A%E5%8D%8811.26.20.png](https://github.com/wangtianlun/koa-design/blob/master/images/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202018-08-01%20%E4%B8%8A%E5%8D%8811.26.20.png)

接下来实例app通过use方法加载了一个中间件函数，这里我们打印出了一句“hello koa”. 我们接下来看看use方法的定义

## use方法

```javascript
  use(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    if (isGeneratorFunction(fn)) {
      deprecate('Support for generators will be removed in v3. ' +
                'See the documentation for examples of how to convert old middleware ' +
                'https://github.com/koajs/koa/blob/master/docs/migration.md');
      fn = convert(fn);
    }
    debug('use %s', fn._name || fn.name || '-');
    this.middleware.push(fn);
    return this;
  }
```

use函数接收一个中间件函数作为参数，首先判断fn的类型，如果不是function类型，则会抛出一个类型错误，在koa2里，要求中间件为普通函数或者async函数，如果传入了一个用generator函数(function*)实现的中间件，需要用koa-convert这个转换一下。所以use函数的第二行就对fn函数进行了是否为generator函数的判断，这里引入了一个“is-generator-function”包用作判断方法. 包地址为[is-generator-function](https://github.com/ljharb/is-generator-function), 判断如果为generator函数，则会给出一个不推荐使用的提示。

进行过判断之后，就将fn添加到实例的middleware数组中，并返回自身

再回到我们的示例，接下来实例app调用了listen方法，传递了一个端口和一个回调函数，我们来看看在源码中listen方法的实现

## listen方法

```javascript
  listen(...args) {
    debug('listen');
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }
```

debug方法先不用看，主要看第二行，这里调用了原生http模块的createServer方法，里面传递了this.callback()这个函数的执行结果，在用原生nodejs来创建server时，我们会这样写

```javascript
  const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World\n');
  });
```

那么我猜想，这个this.callback()一定会返回一个类似于(req, res) => { ... }的函数，接下来我们来看看callback函数的定义

## callback方法

```javascript
  callback() {
    const fn = compose(this.middleware);

    if (!this.listenerCount('error')) this.on('error', this.onerror);

    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }
```

果然如我们预期的那样，callback函数会返回handleRequest, 而handleRequest函数的定义就形如(req, res) => { ... }这种格式，首先来看第一行，调用了compose方法并传入了实例中的middleware数组，compose方法是通过[koa-compose](https://github.com/koajs/compose/blob/master/index.js)这个包暴露出来的，它接收中间件数组，并返回一个中间件函数，在中间件函数中会依次执行middleware数组中的中间件函数，这个koa-compose包会在之后详细介绍，回到callback函数, 因为Koa类继承自events模块，所有Koa的实例就会有listenerCount这个函数，这个函数是用来获取指定事件在该实例上所绑定的数量。

我们可以在我们的示例上添加上这几句，来验证一下这个方法的使用

```javascript
  const Koa = require('koa')
  const app = new Koa()

  app.on('custom', () => {
    console.log('event1')
  })

  app.on('custom', () => {
    console.log('event2')
  })

  app.use((ctx) => {
    console.log(app.listenerCount('custom'))  // 2
    console.log('hello koa')
  })

  app.listen(3000, () => {
    console.log('app is running on port 3000')
  })
```
接下来定义了handleRequest函数，函数接收req请求对象以及res响应对象，函数里首先调用了createContext方法，并将req和res传入，我们来看看createContext函数的定义

## createContext

```javascript
  createContext(req, res) {
    const context = Object.create(this.context);
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);
    context.app = request.app = response.app = this;
    context.req = request.req = response.req = req;
    context.res = request.res = response.res = res;
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;
    context.originalUrl = request.originalUrl = req.url;
    context.state = {};
    return context;
  }
```
首先分别定义了三个变量，context, request, response，以context为例，通过Object.create这种创建对象的方式，使context变量的__proto__属性指向this.context对象，request以及response同理，同时将this.request和this.response挂载到了context.request和context.response的__proto__属性上。接下来又将Koa实例本身，req对象，res对象挂载到了context，request和response上。使各自都有了相互访问的途径。然后将请求进来的url赋值给context和request上面的originalUrl属性上，并在context上定义了state属性，最后将包装好的context返回

回到callback函数，接下来函数直接返回了this.handleRequest(ctx, fn)， 我们来看一下handleRequest的定义

## handleRequest

```javascript
  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = err => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    onFinished(res, onerror);
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }
```

函数内部首先获取了res对象，然后将statusCode置为了404，然后定义了错误处理函数，紧接着定义了handleResponse函数，函数体中调用了respond方法，respond方法是用来处理一系列响应操作的，稍后会进行介绍。再往下，就是调用了onFinished方法，这个onFinished方法来自[on-finished](https://github.com/jshttp/on-finished)包，作用是当http响应操作结束，发生错误，或者关闭时触发传入的监听函数，当前就是这个onerror函数，最后返回了一个promise对象. 这个fnMiddleware是一个形如function (context, next) { ... }的函数，方法执行过后就会返回一个promise对象，并且在该promise对象的then方法中传入了之前定义的用于操作响应的函数，同时添加了cache捕获。

最后回到listen方法，创建完了server之后，就直接调用原生node的listen方法，并将其返回



















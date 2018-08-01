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

![https://github.com/wangtianlun/koa-design/blob/master/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202018-08-01%20%E4%B8%8A%E5%8D%8811.26.20.png](https://github.com/wangtianlun/koa-design/blob/master/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202018-08-01%20%E4%B8%8A%E5%8D%8811.26.20.png)

接下来实例app通过use方法加载了一个中间件函数，这里我们打印出了一句“hello koa”. 我们接下来看看use方法的定义

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

控制台上打印的结果就为






















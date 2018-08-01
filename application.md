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

use函数接收一个中间件函数作为参数，首先判断fn的类型，如果不是function类型，则会抛出一个类型错误，在koa2里，要求中间件为普通函数或者async函数，如果传入了一个用generator函数实现的中间件，需要用koa-convert这个转换一下。所以use函数的第二行就对fn函数进行了是否为generator函数的判断，这里引入了一个“is-generator-function”包用作判断方法. 包地址为[is-generator-function](https://github.com/ljharb/is-generator-function), 判断如果为generator函数，则会给出一个不推荐使用的提示。

进行过判断之后，就将fn添加到实例的middleware数组中，并返回自身

再回到我们的示例，接下来实例app调用了listen方法，传递了一个端口和一个回调函数，我们来看看在源码中listen方法的实现

























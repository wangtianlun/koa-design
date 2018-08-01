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

























## koa-compose源码
```javascript
function compose (middleware) {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  return function (context, next) {
    // last called middleware #
    let index = -1
    return dispatch(0)
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
```

compose函数首先判断传入的middleware是否为数组，如果不是数组则会抛出一个类型错误。由于数组原生具备iterator接口，所以这里的middleware可以用for...of来进行遍历，这里判断如果数组里有任何一个元素不是函数类型，则也会抛出类型错误。

接下来compose函数会返回一个函数，函数中又定义了dispatch函数，传入的参数表示middleware数组的下标，在dispatch函数中会去取出middleware数组中第i个中间件函数，然后放入Promise.resolve中并执行fn函数。

其实返回的结构类似于

```javascript
  return Promise.resolve(fn1(context, async () => {
    return Promise.resolve(fn2(context, async () => {
      return Promise.resolve(fn3(context, async () => {
        return Promise.resolve()
      }))
    }))
  }))
```


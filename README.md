# element-sticky
实现类似position:sticky效果，支持top,bottom

## 用法
```js
npm install element-sticky
```

## 构造函数
ElementSticky(el: string|HTMLElement, options: object)
+ el
  - type: string|HTMLElement
  - 要sticky的元素，支持元素选择器
+ options
  - type: object
+ options.scroller
  - type: string|HTMLElement
  - 手动指定滚动容器，默认自动查找最近的父级滚动容器
+ options.OBSAVTTFS
  - type: number|{height: number, width: number}
  - 当滚动容器和视图的宽度或高度误差在此范围内，自动启用fixed布局
+ options.position
  - type: 'absolute'|'fixed'
  - default: null
  - 没有指定position则自动智能判断，只能传absolute和fixed。使用absolute时请预先将scroller样式置为定位样式
+ options.top
  - type: string|number
  - defautl: 0
  - 不支持百分比，不能和bottom同时设置
+ options.bottom
  - type: string|number
  - 不支持百分比，不能和top同时设置
+ options.style
  - type: object
  - default: { zIndex: 9 }
  - sticky时的额外样式
+ options.triggerFunc
  - type: TriggerCallback
  - default: defaultTriggerFunc
  - 触发sticky的条件函数
+ options.delayInit
  - type: number
  - default: 0
  - 延时初始化，某些情况可以保证获取到正确的样式。毫秒数
+ options.afterInited
  - type: (ctx: ElementSticky) => any
  - default: null
  - init方法执行后的回调
+ options.observeThreshold
  - type: number|number[]
  - default: 1
  - Intersection Observer API的threshold参数
+ options.observeRootMargin
  - type: string
  - default: '0px'
  - Intersection Observer API的rootMargin参数
+ optins.polyfill
  - type: boolean
  - default: false
  - 否强制初始化，否则只对不原生支持sticky的环境执行初始化
+ options.debug
  - type: boolean
  - default: false
  - 是否打印调试信息

</br>

+ @callback: TriggerCallback
  - @param: {IntersectionObserverEntry[]} entries
  - @param {ElementSticky} ctx
  - @returns {boolean}

</br>

## 实例方法
+ init
  - 初始化
+ initObserver
  - 初始化观察器
+ unobserve
  - 解除InterSectionObserver观察，解除sticky
+ destroy
  - 销毁

项目基于InterSectionObserver API和ResizeObserver API实现，目前这两个API的polyfill还是会有些莫名的问题


### 建议使用场景
全局滚动容器下需要top和bottom粘性布局，这时使用的是fixed布局

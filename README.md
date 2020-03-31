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
  要sticky的元素，支持元素选择器
+ options
  - type: object
+ options.scroller
  - type: string|HTMLElement
  手动指定滚动容器，默认自动查找最近的父级滚动容器
+ options.OBSAVTTFS
  - type: number|{height: number, width: number}
  当滚动容器和视图的宽度或高度误差在此范围内，自动启用fixed布局
+ options.position
  - type: 'absolute'|'fixed'
  - default: null
  没有指定position则自动智能判断，只能传absolute和fixed。使用absolute时请预先将scroller样式置为定位样式
+ options.top
  - type: string|number
  - defautl: 0
  不支持百分比，不能和bottom同时设置
+ options.bottom
  - type: string|number
  不支持百分比，不能和top同时设置
+ options.style
  - type: object
  - default: { zIndex: 9 }
  sticky时的额外样式
+ options.triggerFunc
  - type: TriggerCallback
  - default: defaultTriggerFunc
  触发sticky的条件函数
+ options.delayInit
  - type: number
  - default: 0
  延时初始化，某些情况可以保证获取到正确的样式。毫秒数
+ options.afterInited
  - type: (ctx: ElementSticky) => any
  - default: null
  init方法执行后的回调
+ options.observeThreshold
  - type: number|number[]
  - default: 1
  Intersection Observer API的threshold参数
+ options.observeRootMargin
  - type: string
  - default: '0px'
  Intersection Observer API的rootMargin参数
+ optins.polyfill
  - type: boolean
  - default: false
  否强制初始化，否则只对不原生支持sticky的环境执行初始化
+ options.debug
  - type: boolean
  - default: false
  是否打印调试信息

</br>

+ @callback: TriggerCallback
  - @param: {IntersectionObserverEntry[]} entries
  - @param {ElementSticky} ctx
  - @returns {boolean}

</br>

项目基于InterSectionObserver API和ResizeObserver API实现，注意滚动容器每次resize时会重新执行初始化


### 已知bugs或注意点
1. 在chrome v80.0.3987.149上，如果滚动容器的计算宽度有小数，并且小数的第一位大于等于5(如：220.62)，那么InterSectionObserver API无论无何不会被触发，不知道是否是版本特例？还是我使用姿势不对？
2. firefox上非块级元素，不会触发InterSectionObserver API，不知道是我写的有问题还是浏览器的bug。代码已经使用div块级元素来包裹目标元素，所以此问题暂时算解决。
3. IE上absolute方式的sticky的absolute布局表现比较糟糕，因为ie性能太差。如果是局部滚动，就只能监听容器scroll方式并采用absolute布局，这在ie上表现比较糟糕，这是无法解决的。
4. 已知left,right方向的sticky存在问题（所以暂不支持）
5. 因为InterSectionObserver API的异步特性，如果目标元素所占布局（宽，高）特别小，那么极有可能回调函数不会被触发，因为滚动时咻的一下就过去了

### 建议使用场景
全局滚动容器下需要top和bottom粘性布局，这时使用的是fixed布局

/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
/* eslint-disable func-names */
/**
 * 对于不原生支持position:sticky的浏览器（没错，说的就是你IE）提供类似的效果
 * 对于原生支持sticky的环境不会自动执行初始化，滚动容器最好预先添加position:relative样式
 * NOTE 注意对于非全屏的局部滚动，使用fixed定位是无法达到预期的效果，这是谁都无法解决的(一旦整体页面发生滚动无法计算)
 * 对于全屏滚动，强烈建议使用fixed定位
 * 害~IE上的效果真是一言难尽，因为滚动性能和频繁设置样式
 * NOTE 此代码实现的sitcky效果和原生postition:sticky是有差异的
 * @author huyk<bengda@outlook.com>
 * @version 1.0.0
 * @requires intersection-observer,resize-observer-polyfill
 * 已知bugs:
 * 1、chrome上如果滚动容器的计算宽度有小数，并且小数的第一位大于等于5(如：220.6234)，那么InterSectionObserver API无论无何不会被触发，等待chrome后续解决
 * 2、firefox上非块级元素，不会触发InterSectionObserver API，不知道是我写的有问题还是浏览器的bug
 * 3、IE上absolute方式的sticky表现比较糟糕，因为ie性能太差
 * 4、已知right方向的sticky存在问题（无法解决）
 * 建议使用场景：
 * fixed定位的top和bottom粘性布局
 */

/**
 * sticky {@link https://developer.mozilla.org/zh-CN/docs/Web/CSS/position}
 * 元素根据正常文档流进行定位，然后相对它的最近滚动祖先（nearest scrolling ancestor）
 * 和 containing block (最近块级祖先 nearest block-level ancestor)，包括table-related元素，
 * 基于top, right, bottom, 和 left的值进行偏移。偏移值不会影响任何其他元素的位置。
 * 该值总是创建一个新的层叠上下文（stacking context）。
 * 注意，一个sticky元素会“固定”在离它最近的一个拥有“滚动机制”的祖先上（当该祖先的overflow 是 hidden, scroll, auto, 或 overlay时），
 * 即便这个祖先不是真的滚动祖先。这个阻止了所有“sticky”行为（详情见Github issue on W3C CSSWG）。
 */

// IntersectionObserver API polyfill
import 'intersection-observer';
import ResizeObserver from 'resize-observer-polyfill';

/* istanbul ignore next */
const resizeHandler = function (entries) {
  for (const entry of entries) {
    const listeners = entry.target.__resizeListeners__ || [];
    if (listeners.length) {
      listeners.forEach((fn) => {
        fn();
      });
    }
  }
};

/* istanbul ignore next */
const addResizeListener = function (element, fn) {
  if (!element.__resizeListeners__) {
    // eslint-disable-next-line no-param-reassign
    element.__resizeListeners__ = [];
    // eslint-disable-next-line no-param-reassign
    element.__ro__ = new ResizeObserver(resizeHandler);
    element.__ro__.observe(element);
  }

  if (element.__resizeListeners__.indexOf(fn) === -1) {
    element.__resizeListeners__.push(fn);
  }
};

/* istanbul ignore next */
const removeResizeListener = function (element, fn) {
  if (!element || !element.__resizeListeners__) return;
  element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
  if (!element.__resizeListeners__.length) {
    element.__ro__.disconnect();
    element.__resizeListeners__ = null;
  }
};


function isType(arg) {
  return Object.prototype.toString.call(arg).slice(8, -1).toLowerCase();
}

function isString(arg) {
  return isType(arg) === 'string';
}

function isFunction(arg) {
  return isType(arg) === 'function';
}

function isNull(arg) {
  return isType(arg) === 'null';
}

function isArray(arg) {
  return isType(arg) === 'array';
}

function isObject(arg) {
  return typeof arg === 'object' && !isNull(arg) && !isArray(arg);
}

/**
 * 是否继承自Object.prototype
 * @param {any} arg
 * @example
 *  var a = { a: 'a' } // true
 *  var b = Object.create(null) // false
 *  function Apple() {}
 *  var apple = new Apple(); // false
 */
function isPlainObject(arg) {
  return isObject(arg) && Object.getPrototypeOf(arg) === Object.prototype;
}

/**
 * 是否是数字型数据。包含string类型
 * 注意诸如[1], ['1']等会隐式转为字符1,'1'
 * @param {any} arg
 */
function isNumeric(arg) {
  return !isArray(arg) && /^[+-]?[0-9]\d*$|^[+-]?[0-9]\d*\.\d+$/g.test(arg);
}

function isDom(arg) {
  return arg instanceof HTMLElement;
}

/**
 * document和window认为是虚假的dom元素
 * 因为它们可以监听事件但是没有dom元素的属性而且也不是HTMLElement实例
 */
function isFakeDom(arg) {
  return arg === window || arg === document;
}

/**
 * 延时函数
 * @param {number} t - 毫秒数
 * @param {function} [callback]
 * @returns {{ start: function, stop: function, untilEnd: () => Promise<any> }}
 */
function delay(t, callback) {
  let tId = null;
  let timeEnded = true;
  let resolver = null;
  return {
    start() {
      if (!tId) {
        timeEnded = false;
        tId = setTimeout(() => {
          timeEnded = true;
          if (isFunction(callback)) {
            callback();
          }
          if (resolver) {
            resolver();
          }
        }, t);
      }
      return this;
    },
    stop() {
      if (tId) {
        clearTimeout(tId);
        tId = null;
        timeEnded = true;
        resolver = null;
      }
      return this;
    },
    /**
     * @returns {promise}
     */
    untilEnd() {
      return new Promise((resolve) => {
        if (timeEnded) {
          resolve();
        }
        resolver = resolve;
      });
    },
  };
}

/**
 * 短折线命名
 * 将aaBbXx 转为 aa-bb-xx
 * @param {boolean} [trimHeadKebab=false] - AaBbXx => -aa-bb-xx;trimHeadKebab=true则舍弃首部-字符
 * @returns {string}
*/
function kebabCase(str, trimHeadKebab = false) {
  const res = str.replace(/([A-Z])/g, letter => (`-${letter.toLowerCase()}`));
  return trimHeadKebab ? res.replace(/^-/, '') : res;
}

/**
 * 驼峰式命名
 * 将aa-bb-xx 转为aaBbXx
 * @param {string} str
 * @param {boolean} [ignoreHeadKebab=false]
 *  - 忽略首位-，如为true则-webkit-border-radius会转为webkitBorderRadius
 */
function camelCase(str, ignoreHeadKebab = false) {
  return str.replace(/([:\-_]+(.))/g, (_, separator, letter, offset) => (offset >= Number(ignoreHeadKebab) ? letter.toUpperCase() : letter));
}

/**
 * 浏览器是否支持position:sticky
 */
function isSupportCssSticky() {
  const vendors = ['', '-webkit-', '-ms-', '-moz-', '-o-'];
  const stickyElement = document.createElement('div');

  return vendors.some((vendor) => {
    stickyElement.style.position = `${vendor}sticky`;
    return stickyElement.style.position !== '';
  });
}

/**
 * 获取dom元素
 * @param {string|HTMLElement} arg
 * @param {HTMLElement} [root=document] - 根节点
 */
function getDom(arg, root = document) {
  if (isDom(arg)) {
    return arg;
  } if (isString(arg)) {
    const dom = root.querySelector(arg);
    if (!dom) {
      throw new Error(`${arg} not exist in the given root node`);
    }
    return dom;
  }
  throw new TypeError('Expected HTMLElement or valid selector');
}

function getEmptyRect() {
  return {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
  };
}

/**
 * Shims the native getBoundingClientRect for compatibility with older IE.
 * @param {Element} el The element whose bounding rect to get.
 * @return {Object} The (possibly shimmed) rect of the element.
 */
function getBoundingClientRect(el) {
  let rect;

  try {
    rect = el.getBoundingClientRect();
  } catch (err) {
    // Ignore Windows 7 IE11 "Unspecified error"
    // https://github.com/w3c/IntersectionObserver/pull/205
  }

  if (!rect) return getEmptyRect();

  // Older IE
  if (!(rect.width && rect.height)) {
    rect = {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
    };
  }
  return rect;
}

/**
 * 设置元素样式
 * @method setStyle
 * @param {HTMLElement} el
 * @param {string|{[propName: string]: string|number}} prop
 *  - 样式名称。可使用对象.例如 { width: '100px' }，此时会忽略value参数
 * @param {string} value - 设置值
 */
function setStyle(el, styleProp, value) {
  let styleName = styleProp;

  if (isPlainObject(styleName)) {
    // NOTE 这样写性能极差
    // return Object.entries(styleName).every(([k, v]) => setStyle(el, k, v));
    const styleEntries = Object.entries(styleName).map(([k, v]) => [`${kebabCase(k)}`.trim(), `${v}`.trim()]);
    const styleMapping = Object.fromEntries(styleEntries);
    const attrStyleEntries = (el.getAttribute('style') || '').split(';')
      .map(item => item.split(':').map(p => `${p}`.trim()));
    const attrStyleMapping = Object.fromEntries(attrStyleEntries);
    const styleAttrStr = Object.entries(Object.assign(attrStyleMapping, styleMapping))
      .filter(entry => !!entry[0])
      .map(([prop, v]) => `${prop}:${v}`).join(';');

    return el.setAttribute('style', styleAttrStr);
  }
  styleName = camelCase(styleName);
  // eslint-disable-next-line no-param-reassign
  el.style[styleName] = value;
  return el.style[styleName];
}

/**
 * 获取元素某个样式
 * 优先使用计算值，意味着如果使用document.createElement创建元素，但是没有append到页面中去是获取不到元素的宽高等信息的
 * @method getStyle
 * @param {HTMLElement} el
 * @param {string} styleName 样式名称
 * @return {string|number|null}
 */
function getStyle(el, styleName) {
  try {
    const computed = document.defaultView.getComputedStyle(el, null);
    return computed.getPropertyValue(kebabCase(styleName, false));
  } catch (e) {
    return el.style[camelCase(styleName, false)];
  }
}


/**
 * Gets the parent node of an element or its host element if the parent node
 * is a shadow root.
 * @param {Node} node The node whose parent to get.
 * @return {Node|null} The parent node or null if no parent exists.
 */
function getParentNode(node) {
  const parent = node.parentNode;

  if (parent && parent.nodeType === 11 && parent.host) {
    // If the parent is a shadow root, return the host element.
    return parent.host;
  }

  if (parent && parent.assignedSlot) {
    // If the parent is distributed in a <slot>, return the parent of a slot.
    return parent.assignedSlot.parentNode;
  }

  return parent;
}

/**
 * 查找最近的拥有滚动机制(hidden, scroll, auto, overlay)的父级元素
 * 这里排除hidden
 * 最顶级查找到document
 * @param {HTMLElement|document} el
 */
function findClosestScrollParent(el) {
  let scroller = getParentNode(el);
  while (scroller) {
    if (getParentNode(scroller) === document) {
      scroller = document;
      break;
    } else if (['scroll', 'auto', 'overlay'].includes(getStyle(scroller, 'overflow'))) {
      break;
    } else {
      scroller = getParentNode(scroller);
    }
  }
  return scroller;
}


/**
 * 查找最近的父级定位元素
 * 最顶级查找到document.documentElement(不管是否设置了position)
 * @param {HTMLElement} el
 */
function findClosestPositionParent(el) {
  let positionParent = getParentNode(el);
  while (positionParent) {
    if (getParentNode(positionParent) === document) {
      break;
    } else if (['relative', 'absolute', 'fixed', 'sticky'].includes(getStyle(positionParent, 'position'))) {
      break;
    } else {
      positionParent = getParentNode(positionParent);
    }
  }
  return positionParent;
}

/**
 * Checks to see if a parent element contains a child element (including inside
 * shadow DOM).
 * @param {Node} parent The parent element.
 * @param {Node} child The child element.
 * @return {boolean} True if the parent node contains the child node.
 */
function containsDeep(parent, child) {

  let node = child;
  while (node) {
    if (node === parent) return true;

    node = getParentNode(node);
  }
  return false;
}

/**
 * 获取元素滚动条宽度
 * @param {'x'|'y'} overflow
 */
function getElementScrollbarWidth(el, overflow) {
  let barWidth = 0;
  if (overflow === 'x') {
    barWidth = el.offsetWidth - el.clientWidth;
  } else if (overflow === 'y') {
    barWidth = el.offsetHeight - el.clientHeight;
  }

  // 2是人为设定的误差范围
  return barWidth < 2 ? 0 : barWidth;
}

/**
 * 监听事件
 * @method on
 * @param {HTMLElement} el - 需绑定元素
 * @param {string} event - 绑定事件名称
 * @param {function} handler - 事件执行函数
 * @param {{ capture: boolean, passive: boolean, once: boolean }|boolean} [option]
 * - addEventListener的第三个option参数 { capture: false, passive: false, once: false }
 */
function on(el, event, handler, option) {
  return el.addEventListener(event, handler, option);
}

/**
 * 取消监听事件
 * 注意如果捕获型事件和冒泡型事件分别注册了，需要分别移除，两者互不干扰
 * @method off
 * @param {HTMLElement} el - element元素
 * @param {stirng} event - 绑定事件名称
 * @param {function} handler - 回调函数
 * @param {boolean} [useCapture=false] 是否是捕获型
 */
function off(el, event, handler, useCapture = false) {
  return el.removeEventListener(event, handler, useCapture);
}
/**
 * 样式值只接受数字，px
 */
function isValidStyleNumericValue(value) {
  if (isNumeric(value)) {
    return true;
  }

  const str = `${value}`.trim();
  const reg = /px$/;
  if (reg.test(str)) {
    return isNumeric(str.replace(reg, ''));
  }
  return false;
}
function parseStyleNumericValue(value, offset = 0) {
  return isValidStyleNumericValue(value) ? `${Number.parseFloat(value) + offset}px` : null;
}

function assertTRBL(style) {
  const {
    top, right, bottom, left,
  } = style;
  if (isValidStyleNumericValue(top) && isValidStyleNumericValue(bottom)) {
    throw new Error('can not both set top and bottom');
  }
  if (isValidStyleNumericValue(right) && isValidStyleNumericValue(left)) {
    throw new Error('can not both set left and right');
  }
}

/**
 * 默认触发函数
 * @callback TriggerCallback
 * @param {IntersectionObserverEntry[]} entries
 * @param {ElementSticky} ctx
 * @returns {boolean}
 */

/**
 * @type {TriggerCallback}
 */
function defaultTriggerFunc(entries, ctx) {
  const [interEl] = entries;
  // 由显示到不显示
  // NOTE firefox和chrome的isIntersecting表现不一致
  // let flag = !interEl.isIntersecting;
  let flag = interEl.intersectionRatio <= 1;

  if (!flag) {
    return false;
  }

  const {
    top, right, bottom, left,
  } = ctx.options.style;


  const {
    top: bcTop,
    right: bcRight,
    bottom: bcBottom,
    left: bcLeft,
  } = interEl.boundingClientRect;

  const {
    top: rbTop,
    right: rbRight,
    bottom: rbBottom,
    left: rbLeft,
  } = interEl.rootBounds;

  const {
    top: irTop,
    right: irRight,
    bottom: irBottom,
    left: irLeft,
  } = interEl.intersectionRect;

  if (isValidStyleNumericValue(top)) {
    flag = flag
      && (bcTop <= rbTop || (irTop > 0 && irTop <= rbTop));
  }
  if (flag && isValidStyleNumericValue(left)) {
    flag = flag
      && (bcLeft <= rbLeft || (irLeft > 0 && irLeft <= rbLeft));
  }

  if (flag && isValidStyleNumericValue(bottom)) {
    flag = flag
      && (bcBottom >= rbBottom || (irBottom > 0 && irBottom >= rbBottom));
  }
  if (flag && isValidStyleNumericValue(right)) {
    flag = flag
      && (bcRight >= rbRight || (irRight > 0 && irRight >= rbRight));
  }

  return flag;
}

export default class ElementSticky {
  /**
   * @param {string|HTMLElement} el 要sticky的元素，支持元素选择器
   * @param {object} [options]
   */
  constructor(el, options) {
    this.$args = {};
    this.$args.el = el;
    this.$args.options = options;

    this.cot();
  }

  context() {
    return this.destroyed ? null : this;
  }

  cot() {
    const ctx = this.context();

    const defaultOptions = {
      /**
       * 手动指定滚动容器，默认自动查找最近的父级滚动容器
       * @type {string|HTMLElement}
       */
      scroller: null,
      /**
       * 当滚动容器和视图的宽度或高度误差在此范围内，自动启用fixed布局
       * OffsetBetweenScrollerAndViewportToTurnonFixedSticky
       * @type {number|{height: number, width: number}}
       */
      OBSAVTTFS: 50,
      /**
       * 没有指定position则自动智能判断，只能传absolute和fixed
       * @type {'absolute'|'fixed'}
       */
      position: null,
      /**
       * 不支持百分比
       * @type {string|number}
       */
      top: null,
      /**
       * 不支持百分比
       * @type {string|number}
       */
      right: null,
      /**
       * 不支持百分比
       * @type {string|number}
       */
      bottom: null,
      /**
       * 不支持百分比
       * @type {string|number}
       */
      left: null,
      /**
       * 除left,top,right,bottom外的额外样式
       * @type {object}
       */
      style: { zIndex: 9 },
      /**
       * 触发sticky的条件函数
       * @type {TriggerCallback}
       */
      triggerFunc: defaultTriggerFunc,
      /**
       * 延时初始化，某些情况可以保证获取到正确的样式
       * 毫秒数
       * @type {number}
       */
      delayInit: 0,
      /**
       * init方法执行后的回调
       * @type {(ctx: ElementSticky) => any}
       */
      afterInited: null,
      /**
       * Intersection Observer API的threshold参数
       * @type {number|number[]}
       */
      observeThreshold: 1,
      /**
       * Intersection Observer API的rootMargin参数
       * @type {string}
       */
      observeRootMargin: '0px',
      /**
       * 是否强制初始化，否者只对不原生支持sticky的环境执行初始化
       * @type {boolean}
       */
      polyfill: false,
      // 是否打印调试信息
      debug: false,
    };
    const { el, options } = ctx.$args;

    ctx.el = getDom(el);
    ctx.options = Object.assign({}, defaultOptions, options);

    if (ctx.options.debug) {
      // eslint-disable-next-line no-console
      console.log('[ElementSticky:cot]', ctx.options.right);
    }

    // NOTE 已知left会有bug
    if (isValidStyleNumericValue(ctx.options.left)) {
      console.warn('[ElementSticky]:temporarily not support the left-param');
      return false;
    }

    // NOTE 已知right会有bug
    if (isValidStyleNumericValue(ctx.options.right)) {
      console.warn('[ElementSticky]:temporarily not support the right-param');
      return false;
    }

    if (!isValidStyleNumericValue(ctx.options.top)
      && !isValidStyleNumericValue(ctx.options.right)
      && !isValidStyleNumericValue(ctx.options.bottom)
      && !isValidStyleNumericValue(ctx.options.left)) {
      ctx.options.top = 0;
    }

    ctx.isSupportCssSticky = isSupportCssSticky();
    if (ctx.options.polyfill || !ctx.isSupportCssSticky) {
      if (ctx.delayExeRes) {
        ctx.delayExeRes.stop();
      }
      ctx.delayExeRes = delay(ctx.options.delayInit, ctx.init.bind(ctx));
      ctx.delayExeRes.start();
    }
  }

  init() {
    const ctx = this.context();
    if (ctx.options.debug) {
      // eslint-disable-next-line no-console
      console.log('[ElementSticky:init]');
    }

    ctx.unobserve();
    ctx.unsticky();

    ctx.elOriginStyle = ctx.el.getAttribute('style');
    ctx.elParentNode = getParentNode(ctx.el);
    if (ctx.options.scroller) {
      ctx.elScroller = (isFakeDom(ctx.options.scroller) || ctx.options.scroller === null) ? null : getDom(ctx.options.scroller);
    } else {
      ctx.elScroller = findClosestScrollParent(ctx.el);
    }

    if (isFakeDom(ctx.elScroller)) {
      ctx.elScroller = null;
    }
    ctx.elClosestPositionParent = findClosestPositionParent(ctx.el);
    if (ctx.elScroller && ctx.elClosestPositionParent && !containsDeep(ctx.elScroller, ctx.elClosestPositionParent)) {
      setStyle(ctx.elScroller, 'position', 'relative');
      ctx.elClosestPositionParent = ctx.elScroller;
    }
    ctx.fakeViewportRectEl = document.querySelector('[data-el-fake-rect-el]');

    if (['absolute', 'fixed'].includes(ctx.options.position)) {
      ctx.options.style.position = ctx.options.position;
    } else {
      ctx.options.style.position = ctx.elScroller === null ? 'fixed' : 'absolute';
      if (ctx.elScroller && ctx.options.style.position === 'absolute') {
        const viewportRect = ctx.getViewportRect();
        // 这里设定当滚动容器的高度或宽度与视图相差在一定范围内时则启用fixed，因为此时认为是页面主滚动容器。这种情况下fixed表现更好
        const scrollerH = ctx.elScroller.clientHeight;
        const scrollerW = ctx.elScroller.clientWidth;
        const offsetViewportH = viewportRect.height - scrollerH;
        const offsetViewportW = viewportRect.width - scrollerW;
        if (isPlainObject(ctx.options.OBSAVTTFS)) {
          if ((offsetViewportH < ctx.options.OBSAVTTFS.height)
              || (offsetViewportW < ctx.options.OBSAVTTFS.width)) {
            ctx.options.style.position = 'fixed';
          }
        } else if ((offsetViewportH < ctx.options.OBSAVTTFS)
          || (offsetViewportW < ctx.options.OBSAVTTFS)) {
          ctx.options.style.position = 'fixed';
        }
      }
    }
    ctx.stickyByFixed = ctx.options.style.position === 'fixed';
    ctx.stickyByAbsolute = ctx.options.style.position === 'absolute';

    let {
      top, left, right, bottom,
    } = ctx.options;

    const scrollerRect = ctx.getScrollerRect();

    const {
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
    } = document.defaultView.getComputedStyle(ctx.el);

    top = parseStyleNumericValue(
      top,
      (ctx.stickyByFixed ? scrollerRect.top : 0) - Number.parseFloat(marginTop),
    );
    left = parseStyleNumericValue(
      left,
      (ctx.stickyByFixed ? scrollerRect.left : 0) - Number.parseFloat(marginLeft),
    );
    right = parseStyleNumericValue(
      right,
      (ctx.stickyByFixed ? scrollerRect.right : 0) - Number.parseFloat(marginRight),
    );
    bottom = parseStyleNumericValue(
      bottom,
      (ctx.stickyByFixed ? document.documentElement.clientHeight - scrollerRect.bottom : 0)
        - Number.parseFloat(marginBottom),
    );

    ctx.options.style.top = top;
    ctx.options.style.left = left;
    ctx.options.style.right = right;
    ctx.options.style.bottom = bottom;

    // 因为我们sticky只能照顾一边而observe的元素可能会与root的两边都有交互，上下或左右
    // 所以这里需要过滤另一边的数据
    assertTRBL(ctx.options.style);

    if (!ctx.ElBoxHolder) {
      // 创建一个包裹容器
      ctx.ElBoxHolder = document.createElement('div');
      ctx.ElBoxHolder.setAttributeNode(document.createAttribute('data-el-sticky-holder'));
      ctx.elParentNode.insertBefore(ctx.ElBoxHolder, ctx.el);
      // 使用ElHoxHolder包裹原el元素
      ctx.ElBoxHolder.appendChild(ctx.el);
    }

    if (!ctx.elScrollerListenerWrap) {
      ctx.elScrollerListenerWrap = ctx.elScrollerListener.bind(ctx);
    }
    if (!ctx.elScrollerResizeListenerWrap) {
      ctx.elScrollerResizeListenerWrap = ctx.init.bind(ctx);
    }
    // 观察的根节点,null表示使用顶级文档视窗
    ctx.observeRoot = ctx.elScroller;
    // 要观察的元素
    ctx.observeEl = ctx.ElBoxHolder;
    // 滚动容器是否包含目标元素
    // ctx.isElScrollerContainsObserveEl = ctx.elScroller && containsDeep(elScroller, ctx.observeEl);

    const {
      marginTop: observeRootMarginTop,
      marginRight: observeRootMarginRight,
      marginBottom: observeRootMarginBottom,
      marginLeft: observeRootMarginLeft,
    } = ctx.observeRoot
      ? document.defaultView.getComputedStyle(ctx.observeRoot)
      : {
        marginTop: 0,
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
      };

    ctx.options.observeRootMargin = [
      observeRootMarginTop,
      observeRootMarginRight,
      observeRootMarginBottom,
      observeRootMarginLeft,
    ].map(item => (isValidStyleNumericValue(item) ? parseStyleNumericValue(item) : '0px')).join(' ');

    ctx.initObserver();
    if (ctx.elScroller && !ctx.elScrollerResizeExeced) {
      // removeResizeListener(ctx.elScroller, ctx.elScrollerResizeListenerWrap);
      addResizeListener(ctx.elScroller, ctx.elScrollerResizeListenerWrap);
      ctx.elScrollerResizeExeced = true;
    }


    if (typeof ctx.options.afterInited === 'function') {
      ctx.options.afterInited(ctx);
    }

    if (ctx.options.debug) {
      console.log('ElementSticky:inited', ctx);
    }
  }

  getViewportRect() {
    const ctx = this.context();

    if (!ctx.fakeViewportRectEl) {
      ctx.fakeViewportRectEl = document.createElement('div');
      ctx.fakeViewportRectEl.setAttributeNode(document.createAttribute('data-el-fake-rect-el'));
      setStyle(ctx.fakeViewportRectEl, { zIndex: -1, position: 'fixed', left: 0, top: 0, right: 0, bottom: 0 });
      document.body.appendChild(ctx.fakeViewportRectEl);
    }

    return getBoundingClientRect(ctx.fakeViewportRectEl);
  }

  getScrollerRect() {
    const ctx = this.context();

    return ctx.elScroller === null
      ? ctx.getViewportRect()
      : getBoundingClientRect(ctx.elScroller);
  }

  /**
   * 当position为absolute时，并且el的直接父级定位元素不是elScroller
   * 那么需要监听elScroller的滚动和resize来实时设置样el的式
   */
  elScrollerListener() {
    const ctx = this.context();

    if (ctx.options.debug) {
      // eslint-disable-next-line no-console
      console.log('[ElementSticky:elScrollerListener]');
    }

    let {
      top, left, right, bottom,
    } = ctx.options.style;

    if (ctx.stickyByAbsolute && ctx.elClosestPositionParent === ctx.elScroller) {
      // 最近的滚动元素就是直接父节点，则计算scrollLeft和scrollTop
      top = parseStyleNumericValue(top, ctx.elScroller.scrollTop);
      left = parseStyleNumericValue(left, ctx.elScroller.scrollLeft);
      right = parseStyleNumericValue(
        right,
        0 - ctx.elScroller.scrollLeft
          + getElementScrollbarWidth(ctx.elScroller, 'x'),
      );
      bottom = parseStyleNumericValue(
        bottom,
        0 - ctx.elScroller.scrollTop
        + getElementScrollbarWidth(ctx.elScroller, 'y'),
      );
    } else {
      const elScrollerRect = ctx.getScrollerRect();
      const closestPositionParentRect = getBoundingClientRect(ctx.elClosestPositionParent);

      top = parseStyleNumericValue(top, elScrollerRect.top - closestPositionParentRect.top);
      left = parseStyleNumericValue(left, elScrollerRect.left - closestPositionParentRect.left);
      right = parseStyleNumericValue(
        right,
        closestPositionParentRect.right
          - elScrollerRect.right
          + getElementScrollbarWidth(ctx.elScroller, 'x'),
      );
      bottom = parseStyleNumericValue(
        bottom,
        closestPositionParentRect.bottom
          - elScrollerRect.bottom
          + getElementScrollbarWidth(ctx.elScroller, 'y'),
      );
    }


    setStyle(ctx.el, {
      top, right, bottom, left,
    });
  }

  setElBoxHolderStyles() {
    const ctx = this.context();
    if (ctx.ElBoxHolder) {
      const {
        // ie下取的值没有包含padding
        // width: elWidth,
        // height: elHeight,
        position: elPosition,
        display: elDisplay,
        // 火狐下取不到margin，必须取4边的值
        margin: elMargin,
        marginTop: elMarginTop,
        marginRight: elMarginRight,
        marginBottom: elMarginBottom,
        marginLeft: elMarginLeft,
      } = document.defaultView.getComputedStyle(ctx.el);
      const { width: elWidth, height: elHeight } = getBoundingClientRect(ctx.el);

      setStyle(ctx.ElBoxHolder, {
        width: `${elWidth}px`,
        height: `${elHeight}px`,
        position: elPosition,
        display: elDisplay,
        margin: elMargin,
        marginTop: elMarginTop,
        marginRight: elMarginRight,
        marginBottom: elMarginBottom,
        marginLeft: elMarginLeft,
      });
    }
  }

  setElStickyStyles() {
    const ctx = this.context();

    setStyle(ctx.el, ctx.options.style);
  }

  unobserve() {
    const ctx = this.context();
    if (ctx.options.debug) {
      // eslint-disable-next-line no-console
      console.log('[ElementSticky:unobserve]');
    }

    if (ctx.observer) {
      ctx.observer.unobserve(ctx.observeEl);
      ctx.observer.disconnect();
      ctx.observer = null;
    }
  }

  initObserver() {
    const ctx = this.context();

    if (ctx.options.debug) {
      // eslint-disable-next-line no-console
      console.log('[ElementSticky:initObserver]');
    }

    ctx.observer = new IntersectionObserver(ctx.observeCallback.bind(ctx), {
      root: ctx.observeRoot,
      rootMargin: ctx.options.observeRootMargin,
      threshold: ctx.options.observeThreshold,
    });
    ctx.observer.observe(ctx.observeEl);
  }

  observeCallback(entries) {
    const ctx = this.context();

    if (ctx.options.debug) {
      // eslint-disable-next-line no-console
      console.log('[ElementSticky:observeCallback]', entries);
    }
    let flag = false;
    if (typeof ctx.options.triggerFunc === 'function') {
      flag = ctx.options.triggerFunc(entries, ctx);
    }

    if (flag) {
      ctx.sticky();
    } else {
      ctx.unsticky();
    }
  }


  sticky() {
    const ctx = this.context();

    ctx.unsticky();

    if (ctx.options.debug) {
      // eslint-disable-next-line no-console
      console.log('[ElementSticky:sticky]');
    }

    if (!ctx.stickyed && ctx.elParentNode && ctx.ElBoxHolder) {
      ctx.setElBoxHolderStyles();
      ctx.setElStickyStyles();

      if (ctx.elScroller && ctx.stickyByAbsolute) {
        ctx.elScrollerListener();
        on(ctx.elScroller, 'scroll', ctx.elScrollerListenerWrap, { passive: true });
      }

      ctx.stickyed = true;
    }
  }

  unsticky() {
    const ctx = this.context();

    if (ctx.options.debug) {
      // eslint-disable-next-line no-console
      console.log('[ElementSticky:unsticky]');
    }

    if (ctx.stickyed && ctx.elParentNode && ctx.ElBoxHolder) {
      if (ctx.elScroller) {
        off(ctx.elScroller, 'scroll', ctx.elScrollerListenerWrap);
      }
      ctx.el.setAttribute('style', ctx.elOriginStyle || '');
      ctx.ElBoxHolder.setAttribute('style', '');

      ctx.stickyed = false;
    }
  }

  destroy() {
    const ctx = this.context();

    if (ctx.options.debug) {
      // eslint-disable-next-line no-console
      console.log('[ElementSticky:destroy]');
    }

    if (ctx.delayExeRes) {
      ctx.delayExeRes.stop();
    }

    ctx.unobserve();
    ctx.unsticky();
    if (ctx.elScroller && ctx.elScrollerResizeListenerWrap) {
      removeResizeListener(ctx.elScroller, ctx.elScrollerResizeListenerWrap);
    }

    // 还原元素位置
    if (ctx.elParentNode) {
      ctx.elParentNode.insertBefore(ctx.el, ctx.ElBoxHolder);
      ctx.elParentNode.removeChild(ctx.ElBoxHolder);
    }
    Object.keys(ctx).forEach((key) => { ctx[key] = null; });
    Object.setPrototypeOf(ctx, null);
    ctx.destroyed = true;
  }
}

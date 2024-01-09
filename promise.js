
const PENDING = 'pending'
const REJECTED = 'rejected'
const FULFILLED = 'fulfilled'

function _resolve(params) {
    changeState.call(this, FULFILLED, params)
}

function _reject(params) {
    changeState.call(this, REJECTED, params)
}
function changeState(state, params) {
    if (this.State !== PENDING) {
        return
    }
    this.State = state
    this.Result = params
    // 处理链式调用then
    runQunen.call(this)
}
// 创建微任务
function creareMicro(cb) {
    if (typeof process  !== 'undefined') {
        process.next(cb)
    } else if (typeof MutationObserver !== undefined) {
        const p = document.createElement('p')
        const obsever = new MutationObserver(cb)
        obsever.observe(p, {
            childList: true
        })
        p.textContent = 111
    } else {
        setTimeout(cb)
    }
}


// 暂且认为符合thenable 规范 就认为他是一个promise（promiselike）
function isPromise(obj) {
    return obj && typeof obj === 'object' && typeof obj.then === 'function'
}

// 执行微任务队列
function runQunen() {
    if (this.State === PENDING) {
        return
    }
    while (this.qunen[0]) {
        const task = this.qunen[0]
        runTask.call(this, task)
        this.qunen.shift()
    }
}

function runTask({ State, execute, resolve, reject }) {
    creareMicro(() => {
        // 标识当前状态与改变的状态不一致 无需执行
        if (State !== this.State) {
            return
        }
        // 与一下情况对应
        // let pro = promise.resolve()
        // let pro1 = pro.then()
        if (typeof execute !== 'function') {
            if (this.State === FULFILLED) {
                resolve(this.Result)
            } else {
                reject(this.Result)
            }
            return
        }

        try {
            const result = execute(this.Result)
            // then函数里面返回的是一个promise
            if (isPromise(result)) {
                result.then(resolve, reject)
            } else {
                resolve(result)
            }
        } catch (error) {
            reject(error)
        }
    })
}

class MyPromise {
    constructor(execute) {
        this.State = PENDING
        this.Result = undefined
        this.qunen = []
        try {
            execute(_resolve.bind(this), _reject.bind(this))
        } catch (error) {
            _reject.call(this, error)
        }
    }
    then(OnResolve, OnRejected) {
        return new MyPromise((resolve, reject) => {
            this.qunen.push({
                State: FULFILLED,
                execute: OnResolve,
                resolve,
                reject
            })
            this.qunen.push({
                State: REJECTED,
                execute: OnRejected,
                resolve,
                reject
            })
            runQunen.call(this)
        })
    }
    catch(OnRejected) {
        return this.then(undefined, OnRejected)
    }
    finally(onFinally) {
        return this.then(res => {
            MyPromise.resolve(onFinally()).then(() => res)
        }, error => {
            MyPromise.resolve(onFinally()).then(() => {
                throw error
            })
        })
    }
}


MyPromise.resolve = function (params) {
    if (params instanceof Promise) {
        return params
    }
    if (isPromise(params)) {
        return new MyPromise((resolve, reject) => {
            params.then(resolve, reject)
        })
    } else {
        return new MyPromise(resolve => {
            resolve(params)
        })
    }
}

MyPromise.reject = function (params) {
    return new MyPromise((resolve, reject) => {
        reject(params)
    })
}

MyPromise.all = function (params) {
    // 判断传入的参数是否是可迭代的
    if (typeof params[Symbol.iterator] !== 'function') {
        return new Error(`${params} is not iterable (cannot read property Symbol(Symbol.iterator))
        at Function.all (<anonymous>)`)
    }
    const result = new Array(params.length)
    let marker = 0 
    return new MyPromise((resolve, reject) => {
        for (let item of params) {
            let index = params.indexOf(item)
            if (!isPromise(item)) {
                item = MyPromise.resolve(item)
            }
            item.then(res => {
                marker++
                result[index] = res
                if (result.length === marker) {
                    resolve(result)
                }
            }, error => {
                reject(error)
            })
        }
    })
}

MyPromise.race = function (params) {
    // 判断传入的参数是否是可迭代的
    if (typeof params[Symbol.iterator] !== 'function') {
        return new Error(`${params} is not iterable (cannot read property Symbol(Symbol.iterator))
        at Function.all (<anonymous>)`)
    }
    return new MyPromise((resolve, reject) => {
        for (let item of params) {
            if (!isPromise(item)) {
                item = MyPromise.resolve(item)
            }
            item.then(resolve, reject)
        }
    })
}
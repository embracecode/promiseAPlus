
const PENDING = 'pending'
const REJECTED = 'rejected'
const FULFILLED = 'fulfilled'

// 保存then函数中的微队列
const qunen = []

function resolve(params) {
    const change = changeState.bind(this)
    change(FULFILLED, params)
}

function reject(params) {
    const change = changeState.bind(this)
    change(REJECTED, params)
}
function changeState(state, params) {
    console.log(this, 'changeState', this.State);
    if (this.State !== PENDING) {
        return
    }
    this.State = state
    this.Result = params
    // 处理链式调用then
    // const _runQunen = runQunen.bind(this)
    // _runQunen()
    bindFn(runQunen, this)
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
    console.log(this, 'runqunen', qunen);
    if (this.State === PENDING) {
        return
    }
    while (qunen[0]) {
        const task = qunen[0]
        // const _runTask = runTask.bind(this)
        // _runTask(task)
        bindFn(runTask, this, task)
        qunen.shift()
    }
}

function runTask({State, execute, resolve, reject}) {
    creareMicro(() => {
        console.log(this, 'runtask');
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


function bindFn(fn, thisArg, params) {
    if (typeof fn !== 'function') {
        console.warn(`${fn} is not function in 'bindFn' methods`)
        return
    }
    const res = fn.bind(thisArg)
    return  params ? res(params) : res()
}


class MyPromise {
    constructor(execute) {
        this.State = PENDING
        this.Result = undefined
        try {
            execute(resolve.bind(this), reject.bind(this))
        } catch (error) {
            // const _reject = reject.bind(this)
            // _reject(error)
            bindFn(reject, this, error)
        }
    }
    then(OnResolve, OnRejected) {
        return new MyPromise((resolve, reject) => {
            qunen.push({
                State: FULFILLED,
                execute: OnResolve,
                resolve,
                reject
            })
            qunen.push({
                State: REJECTED,
                execute: OnRejected,
                resolve,
                reject
            })
            // const _runQunen = runQunen.bind(this)
            // _runQunen()
            bindFn(runQunen, this)
        })
    }
    catch(OnRejected) {
        return this.then(undefined, OnRejected)
    }
}

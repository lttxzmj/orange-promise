// features:
// Turn exceptions in user code into rejections

export class OrangePromise4 {
  _fulfillmentTasks = [];
  _rejectionTasks = [];
  _promiseResult = undefined;
  _promiseState = 'pending';
  _alreadyResolved = false;

  then(onFulfilled, onRejected) {
    const resultPromise = new OrangePromise4();

    // Runs if the Promise is fulfilled(now or later)
    const fulfillmentTask = () => {
      if (typeof onFulfilled === 'function') {
        this._runReactionSafely(resultPromise, onFulfilled); // [new]
      } else {
        // `onFulfilled` is missing
        // => we must pass on the fulfillment value
        resultPromise.resolve(this._promiseResult);
      }
    }

    const rejectionTask = () => {
      if (typeof onRejected === 'function') {
        this._runReactionSafely(resultPromise, onRejected);
      } else {
        // `onRejected` is missing
        // => we must pass on the rejection value
        resultPromise.reject(this._promiseResult);
      }
    }

    switch (this._promiseState) {
      // TODO: figure out when tasks in _fulfillmentTasks called?
      case 'pending':
        this._fulfillmentTasks.push(fulfillmentTask);
        this._rejectionTasks.push(rejectionTask);
        break;
      case 'fulfilled':
        addToTaskQueue(fulfillmentTask);
        break;
      case 'rejected':
        addToTaskQueue(rejectionTask);
      default:
        throw new Error();
    }
    return resultPromise;
  }

  _runReactionSafely(resultPromise, reaction) {// [new]
    try {
      const returned = reaction(this._promiseResult);
      resultPromise.resolve(returned);
    } catch (onRejected) { // [new]
      return this.then(null, onRejected)
    }
  }

  resolve(value) {
    if (this._alreadyResolved) return this;

    this._alreadyResolved = true;

    if (isThenable(value)) {
      // Forward fulfillments and rejections from `value` to `this`.
      // The callbacks are always executed asynchronously
      value.then(
        (result) => this._doFulfill(result),
        (error) => this._doReject(error)
      )
    } else {
      this._doFulfill(value)
    }
    return this;
  }

  _doFulfill(value) {
    assert.ok(!isThenable(value));
    this._promiseState = 'fulfilled';
    this._promiseResult = value;
  }

  reject(error) {
    if (this._alreadyResolved) return this;
    this._alreadyResolved = true;
    this._doReject(error);
    return this;
  }

  // Only a separate method because it’s called from ._coreResolve()
  _doReject(error) {
    this._promiseState = 'rejected';
    this._promiseResult = error;
    this._clearAndEnqueueTasks(this._rejectionTasks);
  }

  _clearAndEnqueueTasks(tasks) {
    this._fulfillmentTasks = undefined;
    this._rejectionTasks = undefined;
    task.map(addToTaskQueue);
  }
}

function isThenable(value) {
  return typeof value === 'object' && value !== null && typeof value.then === 'function'
}

function addToTaskQueue(task) {
  setTimeout(task, 0)
}
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.juicebox = factory());
}(this, function () { 'use strict';

/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Modified for injection into igv.js after bable translation.  Search for "regeneratorRuntime rollup" for
 * threads on this topic.  Posted solutions did not work for me or others.
 */

var regeneratorRuntime  = {}
var Op = Object.prototype;
var hasOwn = Op.hasOwnProperty;
var undefined; // More compressible than void 0.
var $Symbol = typeof Symbol === "function" ? Symbol : {};
var iteratorSymbol = $Symbol.iterator || "@@iterator";
var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
}
regeneratorRuntime.wrap = wrap;

// Try/catch helper to minimize deoptimizations. Returns a completion
// record like context.tryEntries[i].completion. This interface could
// have been (and was previously) designed to take a closure to be
// invoked without arguments, but in all the cases we care about we
// already have an existing method we want to call, so there's no need
// to create a new function object. We can even get away with assuming
// the method takes exactly one argument, since that happens to be true
// in every case, so we don't have to touch the arguments object. The
// only additional allocation required is the completion record, which
// has a stable shape and so hopefully should be cheap to allocate.
function tryCatch(fn, obj, arg) {
    try {
        return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
        return { type: "throw", arg: err };
    }
}

var GenStateSuspendedStart = "suspendedStart";
var GenStateSuspendedYield = "suspendedYield";
var GenStateExecuting = "executing";
var GenStateCompleted = "completed";

// Returning this object from the innerFn has the same effect as
// breaking out of the dispatch switch statement.
var ContinueSentinel = {};

// Dummy constructor functions that we use as the .constructor and
// .constructor.prototype properties for functions that return Generator
// objects. For full spec compliance, you may wish to configure your
// minifier not to mangle the names of these two functions.
function Generator() {}
function GeneratorFunction() {}
function GeneratorFunctionPrototype() {}

// This is a polyfill for %IteratorPrototype% for environments that
// don't natively support it.
var IteratorPrototype = {};
IteratorPrototype[iteratorSymbol] = function () {
    return this;
};

var getProto = Object.getPrototypeOf;
var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
if (NativeIteratorPrototype &&
    NativeIteratorPrototype !== Op &&
    hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
}

var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
GeneratorFunctionPrototype.constructor = GeneratorFunction;
GeneratorFunctionPrototype[toStringTagSymbol] =
    GeneratorFunction.displayName = "GeneratorFunction";

// Helper for defining the .next, .throw, and .return methods of the
// Iterator interface in terms of a single ._invoke method.
function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
        prototype[method] = function(arg) {
            return this._invoke(method, arg);
        };
    });
}

regeneratorRuntime.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
        ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
        : false;
};

regeneratorRuntime.mark = function(genFun) {
    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
        genFun.__proto__ = GeneratorFunctionPrototype;
        if (!(toStringTagSymbol in genFun)) {
            genFun[toStringTagSymbol] = "GeneratorFunction";
        }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
};

// Within the body of any async function, `await x` is transformed to
// `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
// `hasOwn.call(value, "__await")` to determine if the yielded value is
// meant to be awaited.
regeneratorRuntime.awrap = function(arg) {
    return { __await: arg };
};

function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
        var record = tryCatch(generator[method], generator, arg);
        if (record.type === "throw") {
            reject(record.arg);
        } else {
            var result = record.arg;
            var value = result.value;
            if (value &&
                typeof value === "object" &&
                hasOwn.call(value, "__await")) {
                return Promise.resolve(value.__await).then(function(value) {
                    invoke("next", value, resolve, reject);
                }, function(err) {
                    invoke("throw", err, resolve, reject);
                });
            }

            return Promise.resolve(value).then(function(unwrapped) {
                // When a yielded Promise is resolved, its final value becomes
                // the .value of the Promise<{value,done}> result for the
                // current iteration.
                result.value = unwrapped;
                resolve(result);
            }, function(error) {
                // If a rejected Promise was yielded, throw the rejection back
                // into the async generator function so it can be handled there.
                return invoke("throw", error, resolve, reject);
            });
        }
    }

    var previousPromise;

    function enqueue(method, arg) {
        function callInvokeWithMethodAndArg() {
            return new Promise(function(resolve, reject) {
                invoke(method, arg, resolve, reject);
            });
        }

        return previousPromise =
            // If enqueue has been called before, then we want to wait until
            // all previous Promises have been resolved before calling invoke,
            // so that results are always delivered in the correct order. If
            // enqueue has not been called before, then it is important to
            // call invoke immediately, without waiting on a callback to fire,
            // so that the async generator function has the opportunity to do
            // any necessary setup in a predictable way. This predictability
            // is why the Promise constructor synchronously invokes its
            // executor callback, and why async functions synchronously
            // execute code before the first await. Since we implement simple
            // async functions in terms of async generators, it is especially
            // important to get this right, even though it requires care.
            previousPromise ? previousPromise.then(
                callInvokeWithMethodAndArg,
                // Avoid propagating failures to Promises returned by later
                // invocations of the iterator.
                callInvokeWithMethodAndArg
            ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
}

defineIteratorMethods(AsyncIterator.prototype);
AsyncIterator.prototype[asyncIteratorSymbol] = function () {
    return this;
};
regeneratorRuntime.AsyncIterator = AsyncIterator;

// Note that simple async functions are implemented on top of
// AsyncIterator objects; they just return a Promise for the value of
// the final result produced by the iterator.
regeneratorRuntime.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
        wrap(innerFn, outerFn, self, tryLocsList)
    );

    return regeneratorRuntime.isGeneratorFunction(outerFn)
        ? iter // If outerFn is a generator, return the full iterator.
        : iter.next().then(function(result) {
            return result.done ? result.value : iter.next();
        });
};

function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
        if (state === GenStateExecuting) {
            throw new Error("Generator is already running");
        }

        if (state === GenStateCompleted) {
            if (method === "throw") {
                throw arg;
            }

            // Be forgiving, per 25.3.3.3.3 of the spec:
            // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
            return doneResult();
        }

        context.method = method;
        context.arg = arg;

        while (true) {
            var delegate = context.delegate;
            if (delegate) {
                var delegateResult = maybeInvokeDelegate(delegate, context);
                if (delegateResult) {
                    if (delegateResult === ContinueSentinel) continue;
                    return delegateResult;
                }
            }

            if (context.method === "next") {
                // Setting context._sent for legacy support of Babel's
                // function.sent implementation.
                context.sent = context._sent = context.arg;

            } else if (context.method === "throw") {
                if (state === GenStateSuspendedStart) {
                    state = GenStateCompleted;
                    throw context.arg;
                }

                context.dispatchException(context.arg);

            } else if (context.method === "return") {
                context.abrupt("return", context.arg);
            }

            state = GenStateExecuting;

            var record = tryCatch(innerFn, self, context);
            if (record.type === "normal") {
                // If an exception is thrown from innerFn, we leave state ===
                // GenStateExecuting and loop back for another invocation.
                state = context.done
                    ? GenStateCompleted
                    : GenStateSuspendedYield;

                if (record.arg === ContinueSentinel) {
                    continue;
                }

                return {
                    value: record.arg,
                    done: context.done
                };

            } else if (record.type === "throw") {
                state = GenStateCompleted;
                // Dispatch the exception by looping back around to the
                // context.dispatchException(context.arg) call above.
                context.method = "throw";
                context.arg = record.arg;
            }
        }
    };
}

// Call delegate.iterator[context.method](context.arg) and handle the
// result, either by returning a { value, done } result from the
// delegate iterator, or by modifying context.method and context.arg,
// setting context.delegate to null, and returning the ContinueSentinel.
function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
        // A .throw or .return when the delegate iterator has no .throw
        // method always terminates the yield* loop.
        context.delegate = null;

        if (context.method === "throw") {
            // Note: ["return"] must be used for ES3 parsing compatibility.
            if (delegate.iterator["return"]) {
                // If the delegate iterator has a return method, give it a
                // chance to clean up.
                context.method = "return";
                context.arg = undefined;
                maybeInvokeDelegate(delegate, context);

                if (context.method === "throw") {
                    // If maybeInvokeDelegate(context) changed context.method from
                    // "return" to "throw", let that override the TypeError below.
                    return ContinueSentinel;
                }
            }

            context.method = "throw";
            context.arg = new TypeError(
                "The iterator does not provide a 'throw' method");
        }

        return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
        context.method = "throw";
        context.arg = record.arg;
        context.delegate = null;
        return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
        context.method = "throw";
        context.arg = new TypeError("iterator result is not an object");
        context.delegate = null;
        return ContinueSentinel;
    }

    if (info.done) {
        // Assign the result of the finished delegate to the temporary
        // variable specified by delegate.resultName (see delegateYield).
        context[delegate.resultName] = info.value;

        // Resume execution at the desired location (see delegateYield).
        context.next = delegate.nextLoc;

        // If context.method was "throw" but the delegate handled the
        // exception, let the outer generator proceed normally. If
        // context.method was "next", forget context.arg since it has been
        // "consumed" by the delegate iterator. If context.method was
        // "return", allow the original .return call to continue in the
        // outer generator.
        if (context.method !== "return") {
            context.method = "next";
            context.arg = undefined;
        }

    } else {
        // Re-yield the result returned by the delegate method.
        return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
}

// Define Generator.prototype.{next,throw,return} in terms of the
// unified ._invoke helper method.
defineIteratorMethods(Gp);

Gp[toStringTagSymbol] = "Generator";

// A Generator should always return itself as the iterator object when the
// @@iterator function is called on it. Some browsers' implementations of the
// iterator prototype chain incorrectly implement this, causing the Generator
// object to not be returned from this call. This ensures that doesn't happen.
// See https://github.com/facebook/regenerator/issues/274 for more details.
Gp[iteratorSymbol] = function() {
    return this;
};

Gp.toString = function() {
    return "[object Generator]";
};

function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
        entry.catchLoc = locs[1];
    }

    if (2 in locs) {
        entry.finallyLoc = locs[2];
        entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
}

function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
}

function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
}

regeneratorRuntime.keys = function(object) {
    var keys = [];
    for (var key in object) {
        keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
        while (keys.length) {
            var key = keys.pop();
            if (key in object) {
                next.value = key;
                next.done = false;
                return next;
            }
        }

        // To avoid creating an additional object, we just hang the .value
        // and .done properties off the next function object itself. This
        // also ensures that the minifier will not anonymize the function.
        next.done = true;
        return next;
    };
};

function values(iterable) {
    if (iterable) {
        var iteratorMethod = iterable[iteratorSymbol];
        if (iteratorMethod) {
            return iteratorMethod.call(iterable);
        }

        if (typeof iterable.next === "function") {
            return iterable;
        }

        if (!isNaN(iterable.length)) {
            var i = -1, next = function next() {
                while (++i < iterable.length) {
                    if (hasOwn.call(iterable, i)) {
                        next.value = iterable[i];
                        next.done = false;
                        return next;
                    }
                }

                next.value = undefined;
                next.done = true;

                return next;
            };

            return next.next = next;
        }
    }

    // Return an iterator with no values.
    return { next: doneResult };
}
regeneratorRuntime.values = values;

function doneResult() {
    return { value: undefined, done: true };
}

Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
        this.prev = 0;
        this.next = 0;
        // Resetting context._sent for legacy support of Babel's
        // function.sent implementation.
        this.sent = this._sent = undefined;
        this.done = false;
        this.delegate = null;

        this.method = "next";
        this.arg = undefined;

        this.tryEntries.forEach(resetTryEntry);

        if (!skipTempReset) {
            for (var name in this) {
                // Not sure about the optimal order of these conditions:
                if (name.charAt(0) === "t" &&
                    hasOwn.call(this, name) &&
                    !isNaN(+name.slice(1))) {
                    this[name] = undefined;
                }
            }
        }
    },

    stop: function() {
        this.done = true;

        var rootEntry = this.tryEntries[0];
        var rootRecord = rootEntry.completion;
        if (rootRecord.type === "throw") {
            throw rootRecord.arg;
        }

        return this.rval;
    },

    dispatchException: function(exception) {
        if (this.done) {
            throw exception;
        }

        var context = this;
        function handle(loc, caught) {
            record.type = "throw";
            record.arg = exception;
            context.next = loc;

            if (caught) {
                // If the dispatched exception was caught by a catch block,
                // then let that catch block handle the exception normally.
                context.method = "next";
                context.arg = undefined;
            }

            return !! caught;
        }

        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            var record = entry.completion;

            if (entry.tryLoc === "root") {
                // Exception thrown outside of any try block that could handle
                // it, so set the completion value of the entire function to
                // throw the exception.
                return handle("end");
            }

            if (entry.tryLoc <= this.prev) {
                var hasCatch = hasOwn.call(entry, "catchLoc");
                var hasFinally = hasOwn.call(entry, "finallyLoc");

                if (hasCatch && hasFinally) {
                    if (this.prev < entry.catchLoc) {
                        return handle(entry.catchLoc, true);
                    } else if (this.prev < entry.finallyLoc) {
                        return handle(entry.finallyLoc);
                    }

                } else if (hasCatch) {
                    if (this.prev < entry.catchLoc) {
                        return handle(entry.catchLoc, true);
                    }

                } else if (hasFinally) {
                    if (this.prev < entry.finallyLoc) {
                        return handle(entry.finallyLoc);
                    }

                } else {
                    throw new Error("try statement without catch or finally");
                }
            }
        }
    },

    abrupt: function(type, arg) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.tryLoc <= this.prev &&
                hasOwn.call(entry, "finallyLoc") &&
                this.prev < entry.finallyLoc) {
                var finallyEntry = entry;
                break;
            }
        }

        if (finallyEntry &&
            (type === "break" ||
                type === "continue") &&
            finallyEntry.tryLoc <= arg &&
            arg <= finallyEntry.finallyLoc) {
            // Ignore the finally entry if control is not jumping to a
            // location outside the try/catch block.
            finallyEntry = null;
        }

        var record = finallyEntry ? finallyEntry.completion : {};
        record.type = type;
        record.arg = arg;

        if (finallyEntry) {
            this.method = "next";
            this.next = finallyEntry.finallyLoc;
            return ContinueSentinel;
        }

        return this.complete(record);
    },

    complete: function(record, afterLoc) {
        if (record.type === "throw") {
            throw record.arg;
        }

        if (record.type === "break" ||
            record.type === "continue") {
            this.next = record.arg;
        } else if (record.type === "return") {
            this.rval = this.arg = record.arg;
            this.method = "return";
            this.next = "end";
        } else if (record.type === "normal" && afterLoc) {
            this.next = afterLoc;
        }

        return ContinueSentinel;
    },

    finish: function(finallyLoc) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.finallyLoc === finallyLoc) {
                this.complete(entry.completion, entry.afterLoc);
                resetTryEntry(entry);
                return ContinueSentinel;
            }
        }
    },

    "catch": function(tryLoc) {
        for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.tryLoc === tryLoc) {
                var record = entry.completion;
                if (record.type === "throw") {
                    var thrown = record.arg;
                    resetTryEntry(entry);
                }
                return thrown;
            }
        }

        // The context.catch method must only be called with a location
        // argument that corresponds to a known catch block.
        throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
        this.delegate = {
            iterator: values(iterable),
            resultName: resultName,
            nextLoc: nextLoc
        };

        if (this.method === "next") {
            // Deliberately forget the last sent value so that we don't
            // accidentally pass it on to the delegate.
            this.arg = undefined;
        }

        return ContinueSentinel;
    }
};

  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
      var info = gen[key](arg);
      var value = info.value;
    } catch (error) {
      reject(error);
      return;
    }

    if (info.done) {
      resolve(value);
    } else {
      Promise.resolve(value).then(_next, _throw);
    }
  }

  function _asyncToGenerator(fn) {
    return function () {
      var self = this,
          args = arguments;
      return new Promise(function (resolve, reject) {
        var gen = fn.apply(self, args);

        function _next(value) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
        }

        function _throw(err) {
          asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
        }

        _next(undefined);
      });
    };
  }

  class ModalTable {

      constructor(args) {

          this.datasource = args.datasource;
          this.selectHandler = args.selectHandler;

          const id = args.id;
          const title = args.title || '';
          const parent = args.parent ? $(args.parent) : $('body');
          const html = `
        <div id="${id}" class="modal fade">
        
            <div class="modal-dialog modal-xl">
        
                <div class="modal-content">
        
                    <div class="modal-header">
                        <div class="modal-title">${title}</div>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
        
                    <div class="modal-body">
        
                        <div id="${id}-spinner" class="spinner-border" style="display: none;">
                            <!-- spinner -->
                        </div>
        
                        <div id="${id}-datatable-container">
        
                        </div>
                    </div>
        
                    <div class="modal-footer">
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-sm btn-secondary" data-dismiss="modal">OK</button>
                    </div>
        
                </div>
        
            </div>
        
        </div>
    `;
          const $m = $(html);
          parent.append($m);

          this.$modal = $m;
          this.$datatableContainer = $m.find(`#${id}-datatable-container`);
          this.$spinner = $m.find(`#${id}-spinner`);
          const $okButton = $m.find('.modal-footer button:nth-child(2)');

          $m.on('shown.bs.modal', (e) => {
              this.buildTable();
          });

          $m.on('hidden.bs.modal', (e) => {
              $(e.relatedTarget).find('tr.selected').removeClass('selected');
          });

          $okButton.on('click', (e) => {
              const selected = this.getSelectedTableRowsData.call(this, this.$dataTable.$('tr.selected'));
              if (selected && this.selectHandler) {
                  this.selectHandler(selected);
              }
          });
      }

      remove() {
          this.$modal.remove();
      }

      setDatasource(datasource) {
          this.datasource = datasource;
          this.$datatableContainer.empty();
          this.$table = undefined;
      }

      async buildTable () {

          if (!this.$table && this.datasource) {

              this.$table = $('<table cellpadding="0" cellspacing="0" border="0" class="display"></table>');
              this.$datatableContainer.append(this.$table);

              try {
                  this.startSpinner();
                  const datasource = this.datasource;
                  const tableData = await datasource.tableData();
                  const tableColumns = await datasource.tableColumns();
                  const columnFormat = tableColumns.map(c => ({title: c, data: c}));
                  const config =
                      {
                          data: tableData,
                          columns: columnFormat,
                          autoWidth: false,
                          paging: true,
                          scrollX: true,
                          scrollY: '400px',
                          scroller: true,
                          scrollCollapse: true
                      };

                  this.tableData = tableData;
                  this.$dataTable = this.$table.dataTable(config);
                  this.$table.api().columns.adjust().draw();   // Don't try to simplify this, you'll break it

                  this.$table.find('tbody').on('click', 'tr', function () {

                      if ($(this).hasClass('selected')) {
                          $(this).removeClass('selected');
                      } else {
                          $(this).addClass('selected');
                      }

                  });

              } catch (e) {

              } finally {
                  this.stopSpinner();
              }
          }
      }


      getSelectedTableRowsData($rows) {
          const tableData = this.tableData;
          const result = [];
          if ($rows.length > 0) {
              $rows.removeClass('selected');
              const api = this.$table.api();
              $rows.each(function () {
                  const index = api.row(this).index();
                  result.push(tableData[index]);
              });
          }
          return result
      }


      startSpinner () {
          if (this.$spinner)
              this.$spinner.show();
      }


      stopSpinner () {
          if (this.$spinner)
              this.$spinner.hide();
      }


  }

  /*
   * The MIT License (MIT)
   *
   * Copyright (c) 2016-2017 The Regents of the University of California
   * Author: Jim Robinson
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.
   *
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  const getDataWrapper = function (data) {

      if (typeof(data) == 'string' || data instanceof String) {
          return new StringDataWrapper(data);
      } else {
          return new ByteArrayDataWrapper(data);
      }
  };


  // Data might be a string, or an UInt8Array
  var StringDataWrapper = function (string) {
      this.data = string;
      this.ptr = 0;
  };

  StringDataWrapper.prototype.nextLine = function () {
      //return this.split(/\r\n|\n|\r/gm);
      var start = this.ptr,
          idx = this.data.indexOf('\n', start);

      if (idx > 0) {
          this.ptr = idx + 1;   // Advance pointer for next line
          return idx === start ? undefined : this.data.substring(start, idx).trim();
      }
      else {
          // Last line
          this.ptr = this.data.length;
          return (start >= this.data.length) ? undefined : this.data.substring(start).trim();
      }
  };

  // For use in applications where whitespace carries meaning
  // Returns "" for an empty row (not undefined like nextLine), since this is needed in AED
  StringDataWrapper.prototype.nextLineNoTrim = function () {
      var start = this.ptr,
          idx = this.data.indexOf('\n', start),
          data = this.data;

      if (idx > 0) {
          this.ptr = idx + 1;   // Advance pointer for next line
          if (idx > start && data.charAt(idx - 1) === '\r') {
              // Trim CR manually in CR/LF sequence
              return data.substring(start, idx - 1);
          }
          return data.substring(start, idx);
      }
      else {
          var length = data.length;
          this.ptr = length;
          // Return undefined only at the very end of the data
          return (start >= length) ? undefined : data.substring(start);
      }
  };

  var ByteArrayDataWrapper = function (array) {
      this.data = array;
      this.length = this.data.length;
      this.ptr = 0;
  };

  ByteArrayDataWrapper.prototype.nextLine = function () {

      var c, result;
      result = "";

      if (this.ptr >= this.length) return undefined;

      for (var i = this.ptr; i < this.length; i++) {
          c = String.fromCharCode(this.data[i]);
          if (c === '\r') continue;
          if (c === '\n') break;
          result = result + c;
      }

      this.ptr = i + 1;
      return result;
  };

  // The ByteArrayDataWrapper does not do any trimming by default, can reuse the function
  ByteArrayDataWrapper.prototype.nextLineNoTrim = ByteArrayDataWrapper.prototype.nextLine;

  /*
   * The MIT License (MIT)
   *
   * Copyright (c) 2019 The Regents of the University of California
   * Author: Jim Robinson
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.
   *
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  const columns = [
      'Biosample',
      'Target',
      'Assay Type',
      'Output Type',
      'Bio Rep',
      'Tech Rep',
      'Format',
      'Experiment',
      'Accession',
      'Lab'
  ];

  class EncodeDataSource {

      constructor(genomeId, filter, suffix) {
          this.genomeId = genomeId;
          this.filter = filter;
          this.suffix = suffix || ".txt";
      };

      async tableData() {
          return this.fetchData()
      };

      async tableColumns() {
          return columns;
      };

      async fetchData() {

          const id = canonicalId(this.genomeId);
          const url = "https://s3.amazonaws.com/igv.org.app/encode/" + id + this.suffix;
          const response = await fetch(url);
          const data = await response.text();
          const records = parseTabData(data, this.filter);
          records.sort(encodeSort);
          return records
      }

      static supportsGenome(genomeId) {
          const knownGenomes = new Set(["ce10", "ce11", "dm3", "dm6", "GRCh38", "hg19", "mm9", "mm10"]);
          const id = canonicalId(genomeId);
          return knownGenomes.has(id)
      }

  }

  function parseTabData(data, filter) {

      var dataWrapper,
          line;

      dataWrapper = getDataWrapper(data);

      let records = [];

      dataWrapper.nextLine();  // Skip header
      while (line = dataWrapper.nextLine()) {

          let tokens = line.split("\t");
          let record = {
              "Assembly": tokens[1],
              "ExperimentID": tokens[0],
              "Experiment": tokens[0].substr(13).replace("/", ""),
              "Biosample": tokens[2],
              "Assay Type": tokens[3],
              "Target": tokens[4],
              "Format": tokens[8],
              "Output Type": tokens[7],
              "Lab": tokens[9],
              "url": "https://www.encodeproject.org" + tokens[10],
              "Bio Rep": tokens[5],
              "Tech Rep": tokens[6],
              "Accession": tokens[11]
          };
          record["Name"] = constructName(record);

          if (filter === undefined || filter(record)) {
              records.push(record);
          }
      }

      return records;
  }

  function constructName(record) {

      let name = record["Cell Type"] || "";

      if (record["Target"]) {
          name += " " + record["Target"];
      }
      if (record["Assay Type"].toLowerCase() !== "chip-seq") {
          name += " " + record["Assay Type"];
      }
      if (record["Bio Rep"]) {
          name += " " + record["Bio Rep"];
      }
      if (record["Tech Rep"]) {
          name += (record["Bio Rep"] ? ":" : " 0:") + record["Tech Rep"];
      }

      name += " " + record["Output Type"];

      name += " " + record["Experiment"];

      return name

  }

  function encodeSort(a, b) {
      var aa1,
          aa2,
          cc1,
          cc2,
          tt1,
          tt2;

      aa1 = a['Assay Type'];
      aa2 = b['Assay Type'];
      cc1 = a['Biosample'];
      cc2 = b['Biosample'];
      tt1 = a['Target'];
      tt2 = b['Target'];

      if (aa1 === aa2) {
          if (cc1 === cc2) {
              if (tt1 === tt2) {
                  return 0;
              } else if (tt1 < tt2) {
                  return -1;
              } else {
                  return 1;
              }
          } else if (cc1 < cc2) {
              return -1;
          } else {
              return 1;
          }
      } else {
          if (aa1 < aa2) {
              return -1;
          } else {
              return 1;
          }
      }
  }

  function canonicalId(genomeId) {

      switch(genomeId) {
          case "hg38":
              return "GRCh38"
          case "CRCh37":
              return "hg19"
          case "GRCm38":
              return "mm10"
          case "NCBI37":
              return "mm9"
          case "WBcel235":
              return "ce11"
          case "WS220":
              return "ce10"
          default:
              return genomeId
      }

  }

  /**
   * @fileoverview
   * - Using the 'QRCode for Javascript library'
   * - Fixed dataset of 'QRCode for Javascript library' for support full-spec.
   * - this library has no dependencies.
   *
   * @author davidshimjs
   * @see <a href="http://www.d-project.com/" target="_blank">http://www.d-project.com/</a>
   * @see <a href="http://jeromeetienne.github.com/jquery-qrcode/" target="_blank">http://jeromeetienne.github.com/jquery-qrcode/</a>
   */
  //---------------------------------------------------------------------
  // QRCode for JavaScript
  //
  // Copyright (c) 2009 Kazuhiko Arase
  //
  // URL: http://www.d-project.com/
  //
  // Licensed under the MIT license:
  //   http://www.opensource.org/licenses/mit-license.php
  //
  // The word "QR Code" is registered trademark of
  // DENSO WAVE INCORPORATED
  //   http://www.denso-wave.com/qrcode/faqpatent-e.html
  //
  //---------------------------------------------------------------------
  function QR8bitByte(data) {
    this.mode = QRMode.MODE_8BIT_BYTE;
    this.data = data;
    this.parsedData = []; // Added to support UTF-8 Characters

    for (var i = 0, l = this.data.length; i < l; i++) {
      var byteArray = [];
      var code = this.data.charCodeAt(i);

      if (code > 0x10000) {
        byteArray[0] = 0xF0 | (code & 0x1C0000) >>> 18;
        byteArray[1] = 0x80 | (code & 0x3F000) >>> 12;
        byteArray[2] = 0x80 | (code & 0xFC0) >>> 6;
        byteArray[3] = 0x80 | code & 0x3F;
      } else if (code > 0x800) {
        byteArray[0] = 0xE0 | (code & 0xF000) >>> 12;
        byteArray[1] = 0x80 | (code & 0xFC0) >>> 6;
        byteArray[2] = 0x80 | code & 0x3F;
      } else if (code > 0x80) {
        byteArray[0] = 0xC0 | (code & 0x7C0) >>> 6;
        byteArray[1] = 0x80 | code & 0x3F;
      } else {
        byteArray[0] = code;
      }

      this.parsedData.push(byteArray);
    }

    this.parsedData = Array.prototype.concat.apply([], this.parsedData);

    if (this.parsedData.length != this.data.length) {
      this.parsedData.unshift(191);
      this.parsedData.unshift(187);
      this.parsedData.unshift(239);
    }
  }

  QR8bitByte.prototype = {
    getLength: function getLength(buffer) {
      return this.parsedData.length;
    },
    write: function write(buffer) {
      for (var i = 0, l = this.parsedData.length; i < l; i++) {
        buffer.put(this.parsedData[i], 8);
      }
    }
  };

  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  QRCodeModel.prototype = {
    addData: function addData(data) {
      var newData = new QR8bitByte(data);
      this.dataList.push(newData);
      this.dataCache = null;
    },
    isDark: function isDark(row, col) {
      if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
        throw new Error(row + "," + col);
      }

      return this.modules[row][col];
    },
    getModuleCount: function getModuleCount() {
      return this.moduleCount;
    },
    make: function make() {
      this.makeImpl(false, this.getBestMaskPattern());
    },
    makeImpl: function makeImpl(test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);

      for (var row = 0; row < this.moduleCount; row++) {
        this.modules[row] = new Array(this.moduleCount);

        for (var col = 0; col < this.moduleCount; col++) {
          this.modules[row][col] = null;
        }
      }

      this.setupPositionProbePattern(0, 0);
      this.setupPositionProbePattern(this.moduleCount - 7, 0);
      this.setupPositionProbePattern(0, this.moduleCount - 7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(test, maskPattern);

      if (this.typeNumber >= 7) {
        this.setupTypeNumber(test);
      }

      if (this.dataCache == null) {
        this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
      }

      this.mapData(this.dataCache, maskPattern);
    },
    setupPositionProbePattern: function setupPositionProbePattern(row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r <= -1 || this.moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c++) {
          if (col + c <= -1 || this.moduleCount <= col + c) continue;

          if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
            this.modules[row + r][col + c] = true;
          } else {
            this.modules[row + r][col + c] = false;
          }
        }
      }
    },
    getBestMaskPattern: function getBestMaskPattern() {
      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        var lostPoint = QRUtil.getLostPoint(this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    },
    createMovieClip: function createMovieClip(target_mc, instance_name, depth) {
      var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
      var cs = 1;
      this.make();

      for (var row = 0; row < this.modules.length; row++) {
        var y = row * cs;

        for (var col = 0; col < this.modules[row].length; col++) {
          var x = col * cs;
          var dark = this.modules[row][col];

          if (dark) {
            qr_mc.beginFill(0, 100);
            qr_mc.moveTo(x, y);
            qr_mc.lineTo(x + cs, y);
            qr_mc.lineTo(x + cs, y + cs);
            qr_mc.lineTo(x, y + cs);
            qr_mc.endFill();
          }
        }
      }

      return qr_mc;
    },
    setupTimingPattern: function setupTimingPattern() {
      for (var r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] != null) {
          continue;
        }

        this.modules[r][6] = r % 2 == 0;
      }

      for (var c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] != null) {
          continue;
        }

        this.modules[6][c] = c % 2 == 0;
      }
    },
    setupPositionAdjustPattern: function setupPositionAdjustPattern() {
      var pos = QRUtil.getPatternPosition(this.typeNumber);

      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i];
          var col = pos[j];

          if (this.modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) {
              if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) {
                this.modules[row + r][col + c] = true;
              } else {
                this.modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    },
    setupTypeNumber: function setupTypeNumber(test) {
      var bits = QRUtil.getBCHTypeNumber(this.typeNumber);

      for (var i = 0; i < 18; i++) {
        var mod = !test && (bits >> i & 1) == 1;
        this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i++) {
        var mod = !test && (bits >> i & 1) == 1;
        this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    },
    setupTypeInfo: function setupTypeInfo(test, maskPattern) {
      var data = this.errorCorrectLevel << 3 | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      for (var i = 0; i < 15; i++) {
        var mod = !test && (bits >> i & 1) == 1;

        if (i < 6) {
          this.modules[i][8] = mod;
        } else if (i < 8) {
          this.modules[i + 1][8] = mod;
        } else {
          this.modules[this.moduleCount - 15 + i][8] = mod;
        }
      }

      for (var i = 0; i < 15; i++) {
        var mod = !test && (bits >> i & 1) == 1;

        if (i < 8) {
          this.modules[8][this.moduleCount - i - 1] = mod;
        } else if (i < 9) {
          this.modules[8][15 - i - 1 + 1] = mod;
        } else {
          this.modules[8][15 - i - 1] = mod;
        }
      }

      this.modules[this.moduleCount - 8][8] = !test;
    },
    mapData: function mapData(data, maskPattern) {
      var inc = -1;
      var row = this.moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;

      for (var col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col == 6) col--;

        while (true) {
          for (var c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              var dark = false;

              if (byteIndex < data.length) {
                dark = (data[byteIndex] >>> bitIndex & 1) == 1;
              }

              var mask = QRUtil.getMask(maskPattern, row, col - c);

              if (mask) {
                dark = !dark;
              }

              this.modules[row][col - c] = dark;
              bitIndex--;

              if (bitIndex == -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || this.moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
  };
  QRCodeModel.PAD0 = 0xEC;
  QRCodeModel.PAD1 = 0x11;

  QRCodeModel.createData = function (typeNumber, errorCorrectLevel, dataList) {
    var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
    var buffer = new QRBitBuffer();

    for (var i = 0; i < dataList.length; i++) {
      var data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
      data.write(buffer);
    }

    var totalDataCount = 0;

    for (var i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount;
    }

    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error("code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")");
    }

    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }

    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false);
    }

    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }

      buffer.put(QRCodeModel.PAD0, 8);

      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break;
      }

      buffer.put(QRCodeModel.PAD1, 8);
    }

    return QRCodeModel.createBytes(buffer, rsBlocks);
  };

  QRCodeModel.createBytes = function (buffer, rsBlocks) {
    var offset = 0;
    var maxDcCount = 0;
    var maxEcCount = 0;
    var dcdata = new Array(rsBlocks.length);
    var ecdata = new Array(rsBlocks.length);

    for (var r = 0; r < rsBlocks.length; r++) {
      var dcCount = rsBlocks[r].dataCount;
      var ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);

      for (var i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      }

      offset += dcCount;
      var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      var modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);

      for (var i = 0; i < ecdata[r].length; i++) {
        var modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }

    var totalCodeCount = 0;

    for (var i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount;
    }

    var data = new Array(totalCodeCount);
    var index = 0;

    for (var i = 0; i < maxDcCount; i++) {
      for (var r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i];
        }
      }
    }

    for (var i = 0; i < maxEcCount; i++) {
      for (var r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i];
        }
      }
    }

    return data;
  };

  var QRMode = {
    MODE_NUMBER: 1 << 0,
    MODE_ALPHA_NUM: 1 << 1,
    MODE_8BIT_BYTE: 1 << 2,
    MODE_KANJI: 1 << 3
  };
  var QRErrorCorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2
  };
  var QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7
  };
  var QRUtil = {
    PATTERN_POSITION_TABLE: [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]],
    G15: 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0,
    G18: 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0,
    G15_MASK: 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1,
    getBCHTypeInfo: function getBCHTypeInfo(data) {
      var d = data << 10;

      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
        d ^= QRUtil.G15 << QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15);
      }

      return (data << 10 | d) ^ QRUtil.G15_MASK;
    },
    getBCHTypeNumber: function getBCHTypeNumber(data) {
      var d = data << 12;

      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
        d ^= QRUtil.G18 << QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18);
      }

      return data << 12 | d;
    },
    getBCHDigit: function getBCHDigit(data) {
      var digit = 0;

      while (data != 0) {
        digit++;
        data >>>= 1;
      }

      return digit;
    },
    getPatternPosition: function getPatternPosition(typeNumber) {
      return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },
    getMask: function getMask(maskPattern, i, j) {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000:
          return (i + j) % 2 == 0;

        case QRMaskPattern.PATTERN001:
          return i % 2 == 0;

        case QRMaskPattern.PATTERN010:
          return j % 3 == 0;

        case QRMaskPattern.PATTERN011:
          return (i + j) % 3 == 0;

        case QRMaskPattern.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;

        case QRMaskPattern.PATTERN101:
          return i * j % 2 + i * j % 3 == 0;

        case QRMaskPattern.PATTERN110:
          return (i * j % 2 + i * j % 3) % 2 == 0;

        case QRMaskPattern.PATTERN111:
          return (i * j % 3 + (i + j) % 2) % 2 == 0;

        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    },
    getErrorCorrectPolynomial: function getErrorCorrectPolynomial(errorCorrectLength) {
      var a = new QRPolynomial([1], 0);

      for (var i = 0; i < errorCorrectLength; i++) {
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      }

      return a;
    },
    getLengthInBits: function getLengthInBits(mode, type) {
      if (1 <= type && type < 10) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 10;

          case QRMode.MODE_ALPHA_NUM:
            return 9;

          case QRMode.MODE_8BIT_BYTE:
            return 8;

          case QRMode.MODE_KANJI:
            return 8;

          default:
            throw new Error("mode:" + mode);
        }
      } else if (type < 27) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 12;

          case QRMode.MODE_ALPHA_NUM:
            return 11;

          case QRMode.MODE_8BIT_BYTE:
            return 16;

          case QRMode.MODE_KANJI:
            return 10;

          default:
            throw new Error("mode:" + mode);
        }
      } else if (type < 41) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 14;

          case QRMode.MODE_ALPHA_NUM:
            return 13;

          case QRMode.MODE_8BIT_BYTE:
            return 16;

          case QRMode.MODE_KANJI:
            return 12;

          default:
            throw new Error("mode:" + mode);
        }
      } else {
        throw new Error("type:" + type);
      }
    },
    getLostPoint: function getLostPoint(qrCode) {
      var moduleCount = qrCode.getModuleCount();
      var lostPoint = 0;

      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount; col++) {
          var sameCount = 0;
          var dark = qrCode.isDark(row, col);

          for (var r = -1; r <= 1; r++) {
            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c++) {
              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrCode.isDark(row + r, col + c)) {
                sameCount++;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += 3 + sameCount - 5;
          }
        }
      }

      for (var row = 0; row < moduleCount - 1; row++) {
        for (var col = 0; col < moduleCount - 1; col++) {
          var count = 0;
          if (qrCode.isDark(row, col)) count++;
          if (qrCode.isDark(row + 1, col)) count++;
          if (qrCode.isDark(row, col + 1)) count++;
          if (qrCode.isDark(row + 1, col + 1)) count++;

          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount - 6; col++) {
          if (qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col++) {
        for (var row = 0; row < moduleCount - 6; row++) {
          if (qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) {
            lostPoint += 40;
          }
        }
      }

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col++) {
        for (var row = 0; row < moduleCount; row++) {
          if (qrCode.isDark(row, col)) {
            darkCount++;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;
      return lostPoint;
    }
  };
  var QRMath = {
    glog: function glog(n) {
      if (n < 1) {
        throw new Error("glog(" + n + ")");
      }

      return QRMath.LOG_TABLE[n];
    },
    gexp: function gexp(n) {
      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return QRMath.EXP_TABLE[n];
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
  };

  for (var i = 0; i < 8; i++) {
    QRMath.EXP_TABLE[i] = 1 << i;
  }

  for (var i = 8; i < 256; i++) {
    QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
  }

  for (var i = 0; i < 255; i++) {
    QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
  }

  function QRPolynomial(num, shift) {
    if (num.length == undefined) {
      throw new Error(num.length + "/" + shift);
    }

    var offset = 0;

    while (offset < num.length && num[offset] == 0) {
      offset++;
    }

    this.num = new Array(num.length - offset + shift);

    for (var i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
  }

  QRPolynomial.prototype = {
    get: function get(index) {
      return this.num[index];
    },
    getLength: function getLength() {
      return this.num.length;
    },
    multiply: function multiply(e) {
      var num = new Array(this.getLength() + e.getLength() - 1);

      for (var i = 0; i < this.getLength(); i++) {
        for (var j = 0; j < e.getLength(); j++) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
        }
      }

      return new QRPolynomial(num, 0);
    },
    mod: function mod(e) {
      if (this.getLength() - e.getLength() < 0) {
        return this;
      }

      var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
      var num = new Array(this.getLength());

      for (var i = 0; i < this.getLength(); i++) {
        num[i] = this.get(i);
      }

      for (var i = 0; i < e.getLength(); i++) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
      }

      return new QRPolynomial(num, 0).mod(e);
    }
  };

  function QRRSBlock(totalCount, dataCount) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }

  QRRSBlock.RS_BLOCK_TABLE = [[1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9], [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16], [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13], [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9], [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12], [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15], [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14], [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15], [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13], [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16], [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13], [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15], [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12], [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13], [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12], [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16], [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15], [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15], [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14], [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16], [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17], [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13], [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16], [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17], [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16], [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17], [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16], [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16], [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16], [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16], [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16], [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16], [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16], [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17], [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16], [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16], [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16], [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16], [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16], [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16]];

  QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {
    var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);

    if (rsBlock == undefined) {
      throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
    }

    var length = rsBlock.length / 3;
    var list = [];

    for (var i = 0; i < length; i++) {
      var count = rsBlock[i * 3 + 0];
      var totalCount = rsBlock[i * 3 + 1];
      var dataCount = rsBlock[i * 3 + 2];

      for (var j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }

    return list;
  };

  QRRSBlock.getRsBlockTable = function (typeNumber, errorCorrectLevel) {
    switch (errorCorrectLevel) {
      case QRErrorCorrectLevel.L:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];

      case QRErrorCorrectLevel.M:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];

      case QRErrorCorrectLevel.Q:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];

      case QRErrorCorrectLevel.H:
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];

      default:
        return undefined;
    }
  };

  function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
  }

  QRBitBuffer.prototype = {
    get: function get(index) {
      var bufIndex = Math.floor(index / 8);
      return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
    },
    put: function put(num, length) {
      for (var i = 0; i < length; i++) {
        this.putBit((num >>> length - i - 1 & 1) == 1);
      }
    },
    getLengthInBits: function getLengthInBits() {
      return this.length;
    },
    putBit: function putBit(bit) {
      var bufIndex = Math.floor(this.length / 8);

      if (this.buffer.length <= bufIndex) {
        this.buffer.push(0);
      }

      if (bit) {
        this.buffer[bufIndex] |= 0x80 >>> this.length % 8;
      }

      this.length++;
    }
  };
  var QRCodeLimitLength = [[17, 14, 11, 7], [32, 26, 20, 14], [53, 42, 32, 24], [78, 62, 46, 34], [106, 84, 60, 44], [134, 106, 74, 58], [154, 122, 86, 64], [192, 152, 108, 84], [230, 180, 130, 98], [271, 213, 151, 119], [321, 251, 177, 137], [367, 287, 203, 155], [425, 331, 241, 177], [458, 362, 258, 194], [520, 412, 292, 220], [586, 450, 322, 250], [644, 504, 364, 280], [718, 560, 394, 310], [792, 624, 442, 338], [858, 666, 482, 382], [929, 711, 509, 403], [1003, 779, 565, 439], [1091, 857, 611, 461], [1171, 911, 661, 511], [1273, 997, 715, 535], [1367, 1059, 751, 593], [1465, 1125, 805, 625], [1528, 1190, 868, 658], [1628, 1264, 908, 698], [1732, 1370, 982, 742], [1840, 1452, 1030, 790], [1952, 1538, 1112, 842], [2068, 1628, 1168, 898], [2188, 1722, 1228, 958], [2303, 1809, 1283, 983], [2431, 1911, 1351, 1051], [2563, 1989, 1423, 1093], [2699, 2099, 1499, 1139], [2809, 2213, 1579, 1219], [2953, 2331, 1663, 1273]];

  function _isSupportCanvas() {
    return typeof CanvasRenderingContext2D != "undefined";
  } // android 2.x doesn't support Data-URI spec


  function _getAndroid() {
    var android = false;
    var sAgent = navigator.userAgent;

    if (/android/i.test(sAgent)) {
      // android
      android = true;
      var aMat = sAgent.toString().match(/android ([0-9]\.[0-9])/i);

      if (aMat && aMat[1]) {
        android = parseFloat(aMat[1]);
      }
    }

    return android;
  }

  var svgDrawer = function () {
    var Drawing = function Drawing(el, htOption) {
      this._el = el;
      this._htOption = htOption;
    };

    Drawing.prototype.draw = function (oQRCode) {
      var _htOption = this._htOption;
      var _el = this._el;
      var nCount = oQRCode.getModuleCount();
      var nWidth = Math.floor(_htOption.width / nCount);
      var nHeight = Math.floor(_htOption.height / nCount);
      this.clear();

      function makeSVG(tag, attrs) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', tag);

        for (var k in attrs) {
          if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
        }

        return el;
      }

      var svg = makeSVG("svg", {
        'viewBox': '0 0 ' + String(nCount) + " " + String(nCount),
        'width': '100%',
        'height': '100%',
        'fill': _htOption.colorLight
      });
      svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");

      _el.appendChild(svg);

      svg.appendChild(makeSVG("rect", {
        "fill": _htOption.colorLight,
        "width": "100%",
        "height": "100%"
      }));
      svg.appendChild(makeSVG("rect", {
        "fill": _htOption.colorDark,
        "width": "1",
        "height": "1",
        "id": "template"
      }));

      for (var row = 0; row < nCount; row++) {
        for (var col = 0; col < nCount; col++) {
          if (oQRCode.isDark(row, col)) {
            var child = makeSVG("use", {
              "x": String(col),
              "y": String(row)
            });
            child.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#template");
            svg.appendChild(child);
          }
        }
      }
    };

    Drawing.prototype.clear = function () {
      while (this._el.hasChildNodes()) {
        this._el.removeChild(this._el.lastChild);
      }
    };

    return Drawing;
  }();

  var useSVG = document.documentElement.tagName.toLowerCase() === "svg"; // Drawing in DOM by using Table tag

  var Drawing = useSVG ? svgDrawer : !_isSupportCanvas() ? function () {
    var Drawing = function Drawing(el, htOption) {
      this._el = el;
      this._htOption = htOption;
    };
    /**
     * Draw the QRCode
     *
     * @param {QRCode} oQRCode
     */


    Drawing.prototype.draw = function (oQRCode) {
      var _htOption = this._htOption;
      var _el = this._el;
      var nCount = oQRCode.getModuleCount();
      var nWidth = Math.floor(_htOption.width / nCount);
      var nHeight = Math.floor(_htOption.height / nCount);
      var aHTML = ['<table style="border:0;border-collapse:collapse;">'];

      for (var row = 0; row < nCount; row++) {
        aHTML.push('<tr>');

        for (var col = 0; col < nCount; col++) {
          aHTML.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:' + nWidth + 'px;height:' + nHeight + 'px;background-color:' + (oQRCode.isDark(row, col) ? _htOption.colorDark : _htOption.colorLight) + ';"></td>');
        }

        aHTML.push('</tr>');
      }

      aHTML.push('</table>');
      _el.innerHTML = aHTML.join(''); // Fix the margin values as real size.

      var elTable = _el.childNodes[0];
      var nLeftMarginTable = (_htOption.width - elTable.offsetWidth) / 2;
      var nTopMarginTable = (_htOption.height - elTable.offsetHeight) / 2;

      if (nLeftMarginTable > 0 && nTopMarginTable > 0) {
        elTable.style.margin = nTopMarginTable + "px " + nLeftMarginTable + "px";
      }
    };
    /**
     * Clear the QRCode
     */


    Drawing.prototype.clear = function () {
      this._el.innerHTML = '';
    };

    return Drawing;
  }() : function () {
    // Drawing in Canvas
    function _onMakeImage() {
      this._elImage.src = this._elCanvas.toDataURL("image/png");
      this._elImage.style.display = "block";
      this._elCanvas.style.display = "none";
    }
    /**
     * Check whether the user's browser supports Data URI or not
     *
     * @private
     * @param {Function} fSuccess Occurs if it supports Data URI
     * @param {Function} fFail Occurs if it doesn't support Data URI
     */


    function _safeSetDataURI(fSuccess, fFail) {
      var self = this;
      self._fFail = fFail;
      self._fSuccess = fSuccess; // Check it just once

      if (self._bSupportDataURI === null) {
        var el = document.createElement("img");

        var fOnError = function fOnError() {
          self._bSupportDataURI = false;

          if (self._fFail) {
            self._fFail.call(self);
          }
        };

        var fOnSuccess = function fOnSuccess() {
          self._bSupportDataURI = true;

          if (self._fSuccess) {
            self._fSuccess.call(self);
          }
        };

        el.onabort = fOnError;
        el.onerror = fOnError;
        el.onload = fOnSuccess;
        el.src = "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="; // the Image contains 1px data.

        return;
      } else if (self._bSupportDataURI === true && self._fSuccess) {
        self._fSuccess.call(self);
      } else if (self._bSupportDataURI === false && self._fFail) {
        self._fFail.call(self);
      }
    }
    /**
     * Drawing QRCode by using canvas
     *
     * @constructor
     * @param {HTMLElement} el
     * @param {Object} htOption QRCode Options
     */

    var Drawing = function Drawing(el, htOption) {
      this._bIsPainted = false;
      this._android = _getAndroid();
      this._htOption = htOption;
      this._elCanvas = document.createElement("canvas");
      this._elCanvas.width = htOption.width;
      this._elCanvas.height = htOption.height;
      el.appendChild(this._elCanvas);
      this._el = el;
      this._oContext = this._elCanvas.getContext("2d");
      this._bIsPainted = false;
      this._elImage = document.createElement("img");
      this._elImage.alt = "Scan me!";
      this._elImage.style.display = "none";

      this._el.appendChild(this._elImage);

      this._bSupportDataURI = null;
    };
    /**
     * Draw the QRCode
     *
     * @param {QRCode} oQRCode
     */


    Drawing.prototype.draw = function (oQRCode) {
      var _elImage = this._elImage;
      var _oContext = this._oContext;
      var _htOption = this._htOption;
      var nCount = oQRCode.getModuleCount();
      var nWidth = _htOption.width / nCount;
      var nHeight = _htOption.height / nCount;
      var nRoundedWidth = Math.round(nWidth);
      var nRoundedHeight = Math.round(nHeight);
      _elImage.style.display = "none";
      this.clear();

      for (var row = 0; row < nCount; row++) {
        for (var col = 0; col < nCount; col++) {
          var bIsDark = oQRCode.isDark(row, col);
          var nLeft = col * nWidth;
          var nTop = row * nHeight;
          _oContext.strokeStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
          _oContext.lineWidth = 1;
          _oContext.fillStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;

          _oContext.fillRect(nLeft, nTop, nWidth, nHeight); // 안티 앨리어싱 방지 처리


          _oContext.strokeRect(Math.floor(nLeft) + 0.5, Math.floor(nTop) + 0.5, nRoundedWidth, nRoundedHeight);

          _oContext.strokeRect(Math.ceil(nLeft) - 0.5, Math.ceil(nTop) - 0.5, nRoundedWidth, nRoundedHeight);
        }
      }

      this._bIsPainted = true;
    };
    /**
     * Make the image from Canvas if the browser supports Data URI.
     */


    Drawing.prototype.makeImage = function () {
      if (this._bIsPainted) {
        _safeSetDataURI.call(this, _onMakeImage);
      }
    };
    /**
     * Return whether the QRCode is painted or not
     *
     * @return {Boolean}
     */


    Drawing.prototype.isPainted = function () {
      return this._bIsPainted;
    };
    /**
     * Clear the QRCode
     */


    Drawing.prototype.clear = function () {
      this._oContext.clearRect(0, 0, this._elCanvas.width, this._elCanvas.height);

      this._bIsPainted = false;
    };
    /**
     * @private
     * @param {Number} nNumber
     */


    Drawing.prototype.round = function (nNumber) {
      if (!nNumber) {
        return nNumber;
      }

      return Math.floor(nNumber * 1000) / 1000;
    };

    return Drawing;
  }();
  /**
   * Get the type by string length
   *
   * @private
   * @param {String} sText
   * @param {Number} nCorrectLevel
   * @return {Number} type
   */

  function _getTypeNumber(sText, nCorrectLevel) {
    var nType = 1;

    var length = _getUTF8Length(sText);

    for (var i = 0, len = QRCodeLimitLength.length; i <= len; i++) {
      var nLimit = 0;

      switch (nCorrectLevel) {
        case QRErrorCorrectLevel.L:
          nLimit = QRCodeLimitLength[i][0];
          break;

        case QRErrorCorrectLevel.M:
          nLimit = QRCodeLimitLength[i][1];
          break;

        case QRErrorCorrectLevel.Q:
          nLimit = QRCodeLimitLength[i][2];
          break;

        case QRErrorCorrectLevel.H:
          nLimit = QRCodeLimitLength[i][3];
          break;
      }

      if (length <= nLimit) {
        break;
      } else {
        nType++;
      }
    }

    if (nType > QRCodeLimitLength.length) {
      throw new Error("Too long data");
    }

    return nType;
  }

  function _getUTF8Length(sText) {
    var replacedText = encodeURI(sText).toString().replace(/\%[0-9a-fA-F]{2}/g, 'a');
    return replacedText.length + (replacedText.length != sText ? 3 : 0);
  }
  /**
   * @class QRCode
   * @constructor
   * @example
   * new QRCode(document.getElementById("test"), "http://jindo.dev.naver.com/collie");
   *
   * @example
   * var oQRCode = new QRCode("test", {
   *    text : "http://naver.com",
   *    width : 128,
   *    height : 128
   * });
   *
   * oQRCode.clear(); // Clear the QRCode.
   * oQRCode.makeCode("http://map.naver.com"); // Re-create the QRCode.
   *
   * @param {HTMLElement|String} el target element or 'id' attribute of element.
   * @param {Object|String} vOption
   * @param {String} vOption.text QRCode link data
   * @param {Number} [vOption.width=256]
   * @param {Number} [vOption.height=256]
   * @param {String} [vOption.colorDark="#000000"]
   * @param {String} [vOption.colorLight="#ffffff"]
   * @param {QRCode.CorrectLevel} [vOption.correctLevel=QRCode.CorrectLevel.H] [L|M|Q|H]
   */


  var QRCode = function QRCode(el, vOption) {
    this._htOption = {
      width: 256,
      height: 256,
      typeNumber: 4,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRErrorCorrectLevel.H
    };

    if (typeof vOption === 'string') {
      vOption = {
        text: vOption
      };
    } // Overwrites options


    if (vOption) {
      for (var i in vOption) {
        this._htOption[i] = vOption[i];
      }
    }

    if (typeof el == "string") {
      el = document.getElementById(el);
    }

    if (this._htOption.useSVG) {
      Drawing = svgDrawer;
    }

    this._android = _getAndroid();
    this._el = el;
    this._oQRCode = null;
    this._oDrawing = new Drawing(this._el, this._htOption);

    if (this._htOption.text) {
      this.makeCode(this._htOption.text);
    }
  };
  /**
   * Make the QRCode
   *
   * @param {String} sText link data
   */


  QRCode.prototype.makeCode = function (sText) {
    this._oQRCode = new QRCodeModel(_getTypeNumber(sText, this._htOption.correctLevel), this._htOption.correctLevel);

    this._oQRCode.addData(sText);

    this._oQRCode.make();

    this._el.title = sText;

    this._oDrawing.draw(this._oQRCode);

    this.makeImage();
  };
  /**
   * Make the Image from Canvas element
   * - It occurs automatically
   * - Android below 3 doesn't support Data-URI spec.
   *
   * @private
   */


  QRCode.prototype.makeImage = function () {
    if (typeof this._oDrawing.makeImage == "function" && (!this._android || this._android >= 3)) {
      this._oDrawing.makeImage();
    }
  };
  /**
   * Clear the QRCode
   */


  QRCode.prototype.clear = function () {
    this._oDrawing.clear();
  };
  /**
   * @name QRCode.CorrectLevel
   */


  QRCode.CorrectLevel = QRErrorCorrectLevel;

  var lastGenomeId;
  var qrcode;
  var currentContactMapDropdownButtonID;
  var HICBrowser;
  var allBrowsers;
  var igv;

  function init(_x, _x2, _x3) {
    return _init.apply(this, arguments);
  }

  function _init() {
    _init = _asyncToGenerator(
    /*#__PURE__*/
    regeneratorRuntime.mark(function _callee2(container, config, hic) {
      var genomeChangeListener, $appContainer, $hic_share_url_modal, $e, postCreateBrowser, getEmbeddableSnippet, getEmbedTarget, loadAnnotationSelector, loadHicFile, populatePulldown;
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              populatePulldown = function _ref7(menu) {
                var parent;
                parent = $("#" + menu.id);
                igv.xhr.loadString(menu.items).then(function (data) {
                  var lines = igv.splitLines(data),
                      len = lines.length,
                      tokens,
                      i;

                  for (i = 0; i < len; i++) {
                    tokens = lines[i].split('\t');

                    if (tokens.length > 1) {
                      parent.append($('<option value="' + tokens[0] + '">' + tokens[1] + '</option>'));
                    }
                  }

                  parent.selectpicker("refresh");
                })["catch"](function (error) {});
              };

              loadHicFile = function _ref6(url, name) {
                var synchState, browsersWithMaps, isControl, browser, query, config, uriDecode;
                browsersWithMaps = allBrowsers.filter(function (browser) {
                  return browser.dataset !== undefined;
                });

                if (browsersWithMaps.length > 0) {
                  synchState = browsersWithMaps[0].getSyncState();
                }

                isControl = currentContactMapDropdownButtonID === 'hic-control-map-dropdown';
                browser = HICBrowser.getCurrentBrowser();
                config = {
                  url: url,
                  name: name,
                  isControl: isControl
                };

                if (igv.isString(url) && url.includes("?")) {
                  query = hic.extractQuery(url);
                  uriDecode = url.includes("%2C");
                  hic.decodeQuery(query, config, uriDecode);
                }

                if (isControl) {
                  browser.loadHicControlFile(config).then(function (dataset) {});
                } else {
                  browser.reset();
                  browsersWithMaps = allBrowsers.filter(function (browser) {
                    return browser.dataset !== undefined;
                  });

                  if (browsersWithMaps.length > 0) {
                    config["synchState"] = browsersWithMaps[0].getSyncState();
                  }

                  browser.loadHicFile(config).then(function (ignore) {
                    if (!isControl) {
                      hic.syncBrowsers(allBrowsers);
                    }

                    $('#hic-control-map-dropdown').removeClass('disabled');
                  });
                }
              };

              loadAnnotationSelector = function _ref5($container, url, type) {
                var elements;
                $container.empty();
                elements = [];
                elements.push('<option value=' + '-' + '>' + '-' + '</option>');
                igv.xhr.loadString(url).then(function (data) {
                  var lines = data ? igv.splitLines(data) : [];
                  lines.forEach(function (line) {
                    var tokens = line.split('\t');

                    if (tokens.length > 1 && ("2D" === type || igvSupports(tokens[1]))) {
                      elements.push('<option value=' + tokens[1] + '>' + tokens[0] + '</option>');
                    }
                  });
                  $container.append(elements.join(''));
                })["catch"](function (error) {});

                function igvSupports(path) {
                  // For now we will pretend that igv does not support bedpe, we want these loaded as 2D tracks
                  if (path.endsWith(".bedpe") || path.endsWith(".bedpe.gz")) {
                    return false;
                  }

                  var config = {
                    url: path
                  };
                  igv.inferTrackTypes(config);
                  return config.type !== undefined;
                }
              };

              getEmbedTarget = function _ref4() {
                var href, idx;
                href = new String(window.location.href);
                idx = href.indexOf("?");
                if (idx > 0) href = href.substring(0, idx);
                idx = href.lastIndexOf("/");
                return href.substring(0, idx) + "/embed.html";
              };

              getEmbeddableSnippet = function _ref3(jbUrl) {
                var idx, embedUrl, params, width, height;
                idx = jbUrl.indexOf("?");
                params = jbUrl.substring(idx);
                embedUrl = (config.embedTarget || getEmbedTarget()) + "?juiceboxURL=" + params;
                width = $appContainer.width() + 50;
                height = $appContainer.height();
                return '<iframe src="' + embedUrl + '" width="100%" height="' + height + '" frameborder="0" style="border:0" allowfullscreen></iframe>';
              };

              postCreateBrowser = function _ref2() {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                  for (var _iterator = allBrowsers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var browser = _step.value;
                    browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
                    browser.eventBus.subscribe("MapLoad", checkBDropdown);
                    updateBDropdown(browser);
                  } // Must manually trigger the genome change event on initial load

                } catch (err) {
                  _didIteratorError = true;
                  _iteratorError = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                      _iterator["return"]();
                    }
                  } finally {
                    if (_didIteratorError) {
                      throw _iteratorError;
                    }
                  }
                }

                if (HICBrowser.currentBrowser && HICBrowser.currentBrowser.genome) {
                  genomeChangeListener.receiveEvent({
                    data: HICBrowser.currentBrowser.genome.id
                  });
                }

                if (config.mapMenu) {
                  populatePulldown(config.mapMenu);
                }

                $hic_share_url_modal = $('#hic-share-url-modal');

                $hic_share_url_modal.on('show.bs.modal',
                /*#__PURE__*/
                function () {
                  var _ref = _asyncToGenerator(
                  /*#__PURE__*/
                  regeneratorRuntime.mark(function _callee(e) {
                    var href, idx, jbUrl, embedSnippet, $hic_embed_url, shareUrl, tweetContainer, config, $hic_share_url;
                    return regeneratorRuntime.wrap(function _callee$(_context) {
                      while (1) {
                        switch (_context.prev = _context.next) {
                          case 0:
                            href = new String(window.location.href); // This js file is specific to the aidenlab site, and we know we have only juicebox parameters.
                            // Strip href of current parameters, if any

                            idx = href.indexOf("?");
                            if (idx > 0) href = href.substring(0, idx);
                            _context.next = 5;
                            return hic.shortJuiceboxURL(href);

                          case 5:
                            jbUrl = _context.sent;
                            embedSnippet = getEmbeddableSnippet(jbUrl);
                            $hic_embed_url = $('#hic-embed');
                            $hic_embed_url.val(embedSnippet);
                            $hic_embed_url.get(0).select();
                            shareUrl = jbUrl; // Shorten second time
                            // e.g. converts https://aidenlab.org/juicebox?juiceboxURL=https://goo.gl/WUb1mL  to https://goo.gl/ERHp5u

                            $hic_share_url = $('#hic-share-url');
                            $hic_share_url.val(shareUrl);
                            $hic_share_url.get(0).select();
                            tweetContainer = $('#tweetButtonContainer');
                            tweetContainer.empty();
                            config = {
                              text: 'Contact map: '
                            };
                            $('#emailButton').attr('href', 'mailto:?body=' + shareUrl);

                            if (shareUrl.length < 100) {
                              window.twttr.widgets.createShareButton(shareUrl, tweetContainer.get(0), config).then(function (el) {}); // QR code generation

                              if (qrcode) {
                                qrcode.clear();
                                $('hic-qr-code-image').empty();
                              } else {
                                config = {
                                  width: 128,
                                  height: 128,
                                  correctLevel: QRCode.CorrectLevel.H
                                };
                                qrcode = new QRCode(document.getElementById("hic-qr-code-image"), config);
                              }

                              qrcode.makeCode(shareUrl);
                            }

                          case 19:
                          case "end":
                            return _context.stop();
                        }
                      }
                    }, _callee);
                  }));

                  return function (_x4) {
                    return _ref.apply(this, arguments);
                  };
                }());
                $hic_share_url_modal.on('hidden.bs.modal', function (e) {
                  $('#hic-embed-container').hide();
                  $('#hic-qr-code-image').hide();
                });
                $('#hic-track-dropdown').parent().on('shown.bs.dropdown', function () {
                  var browser;
                  browser = HICBrowser.getCurrentBrowser();

                  if (undefined === browser || undefined === browser.dataset) {
                    igv.Alert.presentAlert('Contact map must be loaded and selected before loading tracks');
                  }
                });
                $('#hic-embed-button').on('click', function (e) {
                  $('#hic-qr-code-image').hide();
                  $('#hic-embed-container').toggle();
                });
                $('#hic-qr-code-button').on('click', function (e) {
                  $('#hic-embed-container').hide();
                  $('#hic-qr-code-image').toggle();
                });
                $('#dataset_selector').on('change', function (e) {
                  var $selected, url, browser;
                  url = $(this).val();
                  $selected = $(this).find('option:selected');
                  browser = HICBrowser.getCurrentBrowser();

                  if (undefined === browser) {
                    igv.Alert.presentAlert('ERROR: you must select a map panel by clicking the panel header.');
                  } else {
                    loadHicFile(url, $selected.text());
                  }

                  $('#hic-contact-map-select-modal').modal('hide');
                  $(this).find('option').removeAttr("selected");
                });
                $('.selectpicker').selectpicker();
                $('#hic-load-local-file').on('change', function (e) {
                  var file, suffix;

                  if (undefined === HICBrowser.getCurrentBrowser()) {
                    igv.Alert.presentAlert('ERROR: you must select a map panel.');
                  } else {
                    file = $(this).get(0).files[0];
                    suffix = file.name.substr(file.name.lastIndexOf('.') + 1);

                    if ('hic' === suffix) {
                      loadHicFile(file, file.name);
                    } else {
                      HICBrowser.getCurrentBrowser().loadTracks([{
                        url: file,
                        name: file.name
                      }]);
                    }
                  }

                  $(this).val("");
                  $('#hic-load-local-file-modal').modal('hide');
                });
                $('#hic-load-url').on('change', function (e) {
                  var url;

                  if (undefined === HICBrowser.getCurrentBrowser()) {
                    igv.Alert.presentAlert('ERROR: you must select a map panel.');
                  } else {
                    url = $(this).val();
                    loadHicFile(url);
                  }

                  $(this).val("");
                  $('#hic-load-url-modal').modal('hide');
                });
                $('#track-load-url').on('change', function (e) {
                  var url;

                  if (undefined === HICBrowser.getCurrentBrowser()) {
                    igv.Alert.presentAlert('ERROR: you must select a map panel.');
                  } else {
                    url = $(this).val();
                    HICBrowser.getCurrentBrowser().loadTracks([{
                      url: url
                    }]);
                  }

                  $(this).val("");
                  $('#track-load-url-modal').modal('hide');
                });
                $('#annotation-selector').on('change', function (e) {
                  var path, name;

                  if (undefined === HICBrowser.getCurrentBrowser()) {
                    igv.Alert.presentAlert('ERROR: you must select a map panel.');
                  } else {
                    path = $(this).val();
                    name = $(this).find('option:selected').text();
                    var config = {
                      url: path,
                      name: name
                    };

                    if (path.indexOf("hgdownload.cse.ucsc.edu") > 0) {
                      config.indexed = false; //UCSC files are never indexed
                    }

                    HICBrowser.getCurrentBrowser().loadTracks([config]);
                  }

                  $('#hic-annotation-select-modal').modal('hide');
                  $(this).find('option').removeAttr("selected");
                });
                $('#annotation-2D-selector').on('change', function (e) {
                  var path, name;

                  if (undefined === HICBrowser.getCurrentBrowser()) {
                    igv.Alert.presentAlert('ERROR: you must select a map panel.');
                  } else {
                    path = $(this).val();
                    name = $(this).find('option:selected').text();
                    HICBrowser.getCurrentBrowser().loadTracks([{
                      url: path,
                      name: name
                    }]);
                  }

                  $('#hic-annotation-2D-select-modal').modal('hide');
                  $(this).find('option').removeAttr("selected");
                });
                $('.juicebox-app-clone-button').on('click', function (e) {
                  var config;
                  config = {
                    initFromUrl: false,
                    updateHref: false
                  };
                  hic.createBrowser(container, config).then(function (browser) {
                    browser.eventBus.subscribe("GenomeChange", genomeChangeListener);
                    HICBrowser.setCurrentBrowser(browser);
                  });
                });
                $('#hic-copy-link').on('click', function (e) {
                  var success;
                  $('#hic-share-url')[0].select();
                  success = document.execCommand('copy');

                  if (success) {
                    $('#hic-share-url-modal').modal('hide');
                  } else {
                    alert("Copy not successful");
                  }
                });
                $('#hic-embed-copy-link').on('click', function (e) {
                  var success;
                  $('#hic-embed')[0].select();
                  success = document.execCommand('copy');

                  if (success) {
                    $('#hic-share-url-modal').modal('hide');
                  } else {
                    alert("Copy not successful");
                  }
                });
                $e = $('button[id$=-map-dropdown]');
                $e.parent().on('show.bs.dropdown', function () {
                  var id = $(this).children('.dropdown-toggle').attr('id');
                  currentContactMapDropdownButtonID = id;
                });
                $e.parent().on('hide.bs.dropdown', function () {});
                hic.eventBus.subscribe("BrowserSelect", function (event) {
                  updateBDropdown(event.data);
                });
              };

              HICBrowser = hic.HICBrowser;
              allBrowsers = hic.allBrowsers;
              igv = hic.igv;
              genomeChangeListener = {
                receiveEvent: function receiveEvent(event) {
                  var genomeId = event.data;

                  if (lastGenomeId !== genomeId) {
                    lastGenomeId = genomeId;

                    if (config.trackMenu) {
                      var tracksURL = config.trackMenu.items.replace("$GENOME_ID", genomeId);
                      loadAnnotationSelector($('#' + config.trackMenu.id), tracksURL, "1D");
                    }

                    if (config.trackMenu2D) {
                      var annotations2dURL = config.trackMenu2D.items.replace("$GENOME_ID", genomeId);
                      loadAnnotationSelector($('#' + config.trackMenu2D.id), annotations2dURL, "2D");
                    }

                    if (EncodeDataSource.supportsGenome(genomeId)) {
                      $('#hic-encode-modal-button').show();
                      createEncodeTable(genomeId);
                    } else {
                      $('#hic-encode-modal-button').hide();
                    }
                  }
                }
              };
              config = config || {};
              $appContainer = $(container);
              _context2.next = 14;
              return hic.initApp(container, config);

            case 14:
              postCreateBrowser();

            case 15:
            case "end":
              return _context2.stop();
          }
        }
      }, _callee2);
    }));
    return _init.apply(this, arguments);
  }

  function checkBDropdown() {
    updateBDropdown(HICBrowser.getCurrentBrowser());
  }

  function updateBDropdown(browser) {
    if (browser) {
      if (browser.dataset) {
        $('#hic-control-map-dropdown').removeClass('disabled');
      } else {
        $('#hic-control-map-dropdown').addClass('disabled');
      }
    }
  }

  var encodeModal = new ModalTable({
    id: "hic-encode-modal",
    title: "ENCODE",
    selectHandler: function selectHandler(selected) {
      HICBrowser.getCurrentBrowser().loadTracks(selected);
    }
  });

  function createEncodeTable(genomeId) {
    var datasource = new EncodeDataSource(genomeId);
    encodeModal.setDatasource(datasource);
  }

  var site = {
    init: init
  };

  return site;

}));


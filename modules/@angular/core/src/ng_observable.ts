import { Observable } from 'rxjs';

/* Declarations */

interface NgObservable<T> extends Observable<T> {
};

interface NgObservableCreator extends Rx.ObservableStatic {
  new(options: { keep: boolean }): NgObservableCreator;
  readonly keep: NgObservableCreator;
};

/* Implementations */

// Solves "Index signature is missing in type" error:
// https://github.com/Microsoft/TypeScript/issues/1887
const IterableObserver = Observable as { [key: string]: any };

// This should be an angular service.
// An explicit function was used instead of class since we return an instance of
// a different prototype. An @Injectable is not needed since we don't inject any
// services whatsoever to the function below
function NgObservable() {
  // Created observables components are gonna be automatically disposed once their
  // belonging components are being destroyed,
  // e.g. this.observable.of([1, 2, 3]);
  return new NgObservableCreator({ keep: false }) as NgObservableCreator;
}

// NgObservable and Observable instances share the same prototype,
// This way we won't ever have to import the Observable directly
NgObservable.prototype = Observable.prototype;

// Creates new Observable instances through its prototypical methods.
// The constructor only holds options which should be applied to these instances
function NgObservableCreator(options: { keep: boolean }) {
  this._keep = options.keep;
}

// Delegating all kind of Observable factory functions like 'of', 'from' etc.
// The advantages of automatically generated prototype are that we're always gonna
// be correlated with the currently installed Observable API
NgObservableCreator.prototype = Object
  .keys(Observable)
  .filter((key) => typeof IterableObserver[key] == "function")
  .reduce((prototype, methodName) => {
    const methodHandler = function () {
      const observable = IterableObserver[methodName].apply(Observable, arguments);
      observable._keep = this._keep;
      return observable;
    };

    return Object.defineProperty(prototype, methodName, {
      configurable: true,
      writable: true,
      value: methodHandler
    });
  }, {});

// The keep getter will make sure that created observables won't be disposed
// automatically once their belonging components are being destroyed,
// e.g. this.observable.keep.of([1, 2, 3]);
Object.defineProperty(NgObservableCreator.prototype, "keep", {
  configurable: true,
  get: function () {
    return new NgObservableCreator({ keep: true });
  }
});

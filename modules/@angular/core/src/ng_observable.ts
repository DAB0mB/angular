import { Observable } from "rxjs";

/* Declarations */

// Save duplicate importations
export interface NgObservable<T> extends Observable<T> {
  _keep: boolean;
};

// Will define a dynamic interface based on the current version of "rxjs" installed
export interface NgObservableStatic extends Rx.ObservableStatic {
  readonly keep: NgObservableStatic;
};

/* Implementations */

// Creates new Observable instances through its prototypical methods.
// The constructor only holds options which should be applied to these instances
export class NgObservableStatic {
  private _keep: boolean;

  constructor({ keep }: { keep?: boolean } = {}) {
    this._keep = !!keep;
  }
}

// Solves "Index signature is missing in type" error:
// https://github.com/Microsoft/TypeScript/issues/1887
const IterableObserver = Observable as { [key: string]: any };

// Delegating all kind of Observable factory functions like 'of', 'from' etc.
// The advantages of automatically generated prototype are that we're always gonna
// be correlated with the currently installed Observable API
Object.keys(Observable).forEach((key) => {
  const value = IterableObserver[key];

  // Delegate function
  if (typeof value == "function") {
    const methodHandler = function () {
      const observable = value.apply(Observable, arguments);

      if (observable instanceof Observable) {
        const ngObservable = observable as NgObservable<any>;
        ngObservable._keep = this._keep;
      }

      return observable;
    };

    Object.defineProperty(NgObservableStatic.prototype, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: methodHandler
    });
  }
  // Delegate value
  else {
    Object.defineProperty(NgObservableStatic.prototype, key, {
      configurable: true,
      enumerable: true,
      get() {
        return IterableObserver[key];
      },
      set(value) {
        return IterableObserver[key] = value;
      }
    });
  }
});

// The "keep" getter will make sure that created observables won't be disposed
// automatically once their belonging components are being destroyed,
// e.g. this.observable.keep.of([1, 2, 3]);
Object.defineProperty(NgObservableStatic.prototype, "keep", {
  configurable: true,
  enumerable: true,
  get() {
    return new NgObservableStatic({ keep: true });
  }
});

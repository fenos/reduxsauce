'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var isNil = _interopDefault(require('ramda/src/isNil'));
var is = _interopDefault(require('ramda/src/is'));
var has = _interopDefault(require('ramda/src/has'));
var pipe = _interopDefault(require('ramda/src/pipe'));
var trim = _interopDefault(require('ramda/src/trim'));
var split = _interopDefault(require('ramda/src/split'));
var without = _interopDefault(require('ramda/src/without'));
var map = _interopDefault(require('ramda/src/map'));
var fromPairs = _interopDefault(require('ramda/src/fromPairs'));
var anyPass = _interopDefault(require('ramda/src/anyPass'));
var isEmpty = _interopDefault(require('ramda/src/isEmpty'));
var join = _interopDefault(require('ramda/src/join'));
var mapObjIndexed = _interopDefault(require('ramda/src/mapObjIndexed'));
var zipObj = _interopDefault(require('ramda/src/zipObj'));
var keys = _interopDefault(require('ramda/src/keys'));
var replace = _interopDefault(require('ramda/src/replace'));
var toUpper = _interopDefault(require('ramda/src/toUpper'));

/**
  Creates a reducer.
  @param {string} initialState - The initial state for this reducer.
  @param {object} handlers - Keys are action types (strings), values are reducers (functions).
  @return {object} A reducer object.
 */
var cr = (function (initialState, handlers) {
  // initial state is required
  if (isNil(initialState)) {
    throw new Error('initial state is required');
  }

  // handlers must be an object
  if (isNil(handlers) || !is(Object, handlers)) {
    throw new Error('handlers must be an object');
  }

  // create the reducer function
  return function () {
    var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialState;
    var action = arguments[1];

    // wrong actions, just return state
    if (isNil(action)) return state;
    if (!has('type', action)) return state;

    // look for the handler
    var handler = handlers[action.type];

    // no handler no cry
    if (isNil(handler)) return state;

    // execute the handler
    return handler(state, action);
  };
});

var isNilOrEmpty = anyPass([isNil, isEmpty]);

var createTypes$1 = (function (types) {
  if (isNilOrEmpty(types)) throw new Error('valid types are required');

  return pipe(trim, split(/\s/), map(pipe(trim)), without([null, '']), map(function (x) {
    return [x, x];
  }), fromPairs)(types);
});

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

// matches on capital letters (except at the start & end of the string)
var RX_CAPS = /(?!^)([A-Z])/g;

// converts a camelCaseWord into a SCREAMING_SNAKE_CASE word
var camelToScreamingSnake = pipe(replace(RX_CAPS, '_$1'), toUpper);

// build Action Types out of an object
var convertToTypes = pipe(keys, // just the keys
map(camelToScreamingSnake), // CONVERT_THEM
join(' '), // space separated
createTypes$1 // make them into Redux Types
);

// an action creator with additional properties
var createActionCreator = function createActionCreator(name, extraPropNames) {
  // types are upcase and snakey
  var type = camelToScreamingSnake(name);

  // do we need extra props for this?
  var noKeys = isNil(extraPropNames) || isEmpty(extraPropNames);

  // a type-only action creator
  if (noKeys) return function () {
    return { type: type };
  };

  // an action creator with type + properties
  return function () {
    for (var _len = arguments.length, values = Array(_len), _key = 0; _key < _len; _key++) {
      values[_key] = arguments[_key];
    }

    var extraProps = zipObj(extraPropNames, values);
    return _extends({ type: type }, extraProps);
  };
};

// build Action Creators out of an objet
var convertToCreators = mapObjIndexed(function (num, key, value) {
  if (typeof value[key] === 'function') {
    // the user brought their own action creator
    return value[key];
  } else {
    // lets make an action creator for them!
    return createActionCreator(key, value[key]);
  }
});

var ca = (function (config) {
  if (isNil(config)) {
    throw new Error('an object is required to setup types and creators');
  }
  if (isEmpty(config)) {
    throw new Error('empty objects are not supported');
  }

  return {
    Types: convertToTypes(config),
    Creators: convertToCreators(config)
  };
});

var createReducer = cr;
var createTypes = createTypes$1;
var createActions = ca;

exports.createReducer = createReducer;
exports.createTypes = createTypes;
exports.createActions = createActions;
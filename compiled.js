'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');

var FUNCTION = '$$simplydit';
var ANYTHING = '$$anything';

var ExpectedCall = function () {
  function ExpectedCall(expectedArguments) {
    _classCallCheck(this, ExpectedCall);

    this.expectedArguments = expectedArguments;
    this.called = false;
  }

  _createClass(ExpectedCall, [{
    key: 'andReturn',
    value: function andReturn(value) {
      if (this.whenCalled) {
        throw new Error('Behavior already specified for this call');
      }
      this.whenCalled = 'return';
      this.returnValue = value;
      return this;
    }
  }, {
    key: 'andThrow',
    value: function andThrow(error) {
      if (this.whenCalled) {
        throw new Error('Behavior already specified for this call');
      }
      this.whenCalled = 'fail';
      this.throwError = error;
    }
  }, {
    key: 'andCallback',
    value: function andCallback(argumentIndex, callbackArguments) {
      if (this.whenCalled) {
        throw new Error('Behavior already specified for this call');
      }
      this.whenCalled = 'callback';
      this.argumentIndex = argumentIndex;
      this.callbackArguments = callbackArguments;
      return this;
    }
  }, {
    key: 'call',
    value: function call(that, args) {
      if (this.called) {
        return {
          error: 'Multiple calls, probably internal error of library'
        };
      }
      if (!this.whenCalled) {
        return {
          error: 'No behavior specified for call'
        };
      }
      if (this.expectedArguments[0] !== ANYTHING && !_.isEqual(this.expectedArguments, args)) {
        return {
          error: JSON.stringify(args, null, 2) + ', expected ' + JSON.stringify(this.expectedArguments, null, 2)
        };
      }
      this.called = true;
      if (this.whenCalled === 'return') {
        return { result: this.returnValue };
      }
      if (this.whenCalled === 'fail') {
        throw this.throwError;
      }
      if (this.whenCalled === 'callback') {
        args[this.argumentIndex].apply(that, this.callbackArguments);
        return 'callback called';
      }
    }
  }]);

  return ExpectedCall;
}();

function createMock(name, structure) {
  if (structure === FUNCTION) {
    return mockFunction(name);
  }
  if (structure instanceof Spy) {
    structure.setName(name);
    return structure.callee();
  }
  var ret = {};
  var mockFunctions = [];

  for (var key in structure) {
    var _mock = createMock(name + '.' + key, structure[key]);
    mockFunctions.push(_mock);
    ret[key] = _mock;
  }

  ret.verify = function () {
    return mockFunctions.map(function (func) {
      return func.verify();
    });
  };
  return ret;
}

function mockFunction(name) {
  var messages = [];
  var expectedCalls = [];
  var callIndex = 0;

  var mock = function mock() {
    var index = callIndex;
    if (callIndex >= expectedCalls.length) {
      throw new Error('Mock ' + name + ' called, but no call was expected');
    }
    var call = expectedCalls[callIndex++].call(this, arguments);
    if (call.error) {
      messages.push({ index: index, error: call.error });
      throw new Error('Mock ' + name + ' called with different arguments ' + call.error);
    } else {
      return call.result;
    }
  };
  mock.expectCallWith = function () {
    var expectation = new ExpectedCall(arguments);
    expectedCalls.push(expectation);
    return expectation;
  };
  mock.verify = function () {
    if (callIndex !== expectedCalls.length) {
      throw new Error(name + ': More calls expected ' + expectedCalls.length + ' than actually called (' + callIndex + ')');
    }
    if (messages.length) {
      throw new Error('Some calls had different arguments:\n' + messages.map(function (msg) {
        return '#' + msg.index + ': ' + msg.error;
      }).join('\n'));
    }
  };
  return mock;
}

function createMockFunc(name) {
  return mock(name, FUNCTION);
}

var Spy = function () {
  function Spy(response, logger) {
    _classCallCheck(this, Spy);

    this.response = response;
    this.logger = logger || console.log;
  }

  _createClass(Spy, [{
    key: 'callee',
    value: function callee() {
      var self = this;
      return function () {
        var result = _.isFunction(self.response) ? self.response.apply(this, arguments) : self.response;
        if (self.logger) {
          self.logger(arguments, result, self.name);
        }
        return result;
      };
    }
  }, {
    key: 'setName',
    value: function setName(name) {
      this.name = name;
      return this;
    }
  }, {
    key: 'andReply',
    value: function andReply(response) {
      this.response = response;
      return this;
    }
  }, {
    key: 'verify',
    value: function verify() {}
  }]);

  return Spy;
}();

function logIt(logger) {
  return new Spy(null, logger);
}

module.exports = {
  mock: createMock,
  mockFunc: createMockFunc,
  Spy: Spy,
  spy: function spy(arg) {
    return new Spy(arg);
  },
  logIt: logIt,
  func: FUNCTION,
  anything: ANYTHING,
  promise: function promise(value) {
    return new Promise(function (resolve, reject) {
      return resolve(value);
    });
  },
  reject: function reject(err) {
    return new Promise(function (resolve, reject) {
      return reject(err);
    });
  }
};


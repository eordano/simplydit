const _ = require('lodash')

const FUNCTION = '$$simplydit'
const ANYTHING = '$$anything'

class ExpectedCall {
  constructor(expectedArguments) {
    this.expectedArguments = expectedArguments
    this.called = false
  }
  andReturn(value) {
    if (this.whenCalled) {
      throw new Error('Behavior already specified for this call')
    }
    this.whenCalled = 'return'
    this.returnValue = value
    return this
  }
  andCallback(argumentIndex, callbackArguments) {
    if (this.whenCalled) {
      throw new Error('Behavior already specified for this call')
    }
    this.whenCalled = 'callback'
    this.argumentIndex = argumentIndex
    this.callbackArguments = callbackArguments
    return this
  }
  call(that, args) {
    if (this.called) {
      return {
        error: 'Multiple calls, probably internal error of library'
      }
    }
    if (!this.whenCalled) {
      return {
        error: 'No behavior specified for call'
      }
    }
    if (this.expectedArguments[0] !== ANYTHING && !_.isEqual(this.expectedArguments, args)) {
      return {
        error: `${JSON.stringify(args, null, 2)}, expected ${JSON.stringify(this.expectedArguments, null, 2)}`
      }
    }
    this.called = true
    if (this.whenCalled === 'return') {
      return { result: this.returnValue }
    }
    if (this.whenCalled === 'callback') {
      args[this.argumentIndex].apply(that, this.callbackArguments)
      return 'callback called'
    }
  }
}

function createMock(name, structure) {
  if (structure === FUNCTION) {
    return mockFunction(name)
  }
  if (structure instanceof Spy) {
    structure.setName(name)
    return structure.callee()
  }
  const ret = {}
  const mockFunctions = []

  for (let key in structure) {
    const mock = createMock(`${name}.${key}`, structure[key])
    mockFunctions.push(mock)
    ret[key] = mock
  }

  ret.verify = function() {
    return mockFunctions.map(func => func.verify())
  }
  return ret
}

function mockFunction(name) {
  const messages = []
  const expectedCalls = []
  let callIndex = 0

  const mock = function() {
    let index = callIndex
    if (callIndex >= expectedCalls.length) {
      throw new Error(`Mock ${name} called, but no call was expected`)
    }
    const call = expectedCalls[callIndex++].call(this, arguments)
    if (call.error) {
      messages.push({ index, error: call.error })
      throw new Error(`Mock ${name} called with different arguments ${call.error}`)
    } else {
      return call.result
    }
  }
  mock.expectCallWith = function() {
    const expectation = new ExpectedCall(arguments)
    expectedCalls.push(expectation)
    return expectation
  }
  mock.verify = function() {
    if (callIndex !== expectedCalls.length) {
      throw new Error(`${name}: More calls expected ${expectedCalls.length} than actually called (${callIndex})`)
    }
    if (messages.length) {
      throw new Error(
        'Some calls had different arguments:\n' +
        messages.map(msg => `#${msg.index}: ${msg.error}`).join('\n')
      )
    }
  }
  return mock
}

function createMockFunc(name) {
  return mock(name, FUNCTION)
}

class Spy {
  constructor(response, logger) {
    this.response = response
    this.logger = logger || console.log
  }
  callee() {
    const self = this
    return function() {
      const result = _.isFunction(self.response)
        ? self.response.apply(this, arguments)
        : self.response
      if (self.logger) {
        self.logger(arguments, result, self.name)
      }
      return result
    }
  }
  setName(name) {
    this.name = name
    return this
  }
  andReply(response) {
    this.response = response
    return this
  }
  verify() {
  }
}

function logIt(logger) {
  return new Spy(null, logger)
}

module.exports = {
  mock: createMock,
  mockFunc: createMockFunc,
  Spy: Spy,
  spy: arg => new Spy(arg),
  logIt: logIt,
  func: FUNCTION,
  anything: ANYTHING,
  promise: function(value) {
    return new Promise((resolve, reject) => resolve(value))
  },
  reject: function(err) {
    return new Promise((resolve, reject) => reject(err))
  }
}

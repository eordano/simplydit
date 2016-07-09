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
        error: `${JSON.stringify(args)}, expected ${JSON.stringify(this.expectedArguments)}`
      }
    }
    this.called = true
    if (this.whenCalled === 'return') {
      return { result: this.returnValue }
    }
    if (this.whenCalled === 'callback') {
      args[this.argumentIndex].apply(that, this.callbackArguments)
      return {}
    }
  }
}

function createMock(name, structure) {
  if (structure === FUNCTION) {
    return mockFunction(name)
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
      throw new Error('More calls expected than actually called')
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

module.exports = {
  mock: createMock,
  func: FUNCTION,
  anything: ANYTHING,
  promise: function(value) {
    return new Promise((resolve, reject) => resolve(value))
  },
  reject: function(err) {
    return new Promise((resolve, reject) => reject(err))
  }
}

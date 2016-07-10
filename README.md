# simplydit

A mocking library with inversion of control principles that simply works.

## Install

```sh
npm install simplydit
```

## Usage

```js
// expect = chai.expect
describe('my test', () => {
  it('works', done => {

    // simplydit.mock creates an object with some structure
    // its first argument is the name for the mock (useful for debugging errors)
    // and its second argument is the structure of the object to be mocked.
    // simplydit.func is a constant value
    const db = simplydit.mock('db', {
      user: {
        findOne: simplydit.func
      }
    })

    // This is the API used for describing how should the mock react to calls
    // Currently the API is really basic, but it shouldn't be hard to improve on it.
    db.user.findOne
      .expectCallWith({ id: 1 })
      .andReturn(simplydit.promise('Fake user')) // simplydit.promise is just
                                                 // value => new Promise(resolve => resolve(value))

    // This example test assumes that this "Service", when asked to "getUser",
    // internally calls "db.user.findOne()". Let's test it.
    const service = new Service(db)
    service.getUser(1).then(user => {

      // Normal verifications
      expect(user).to.equal('Fake user')

      // Mock verifications, verifies that all calls instrumented took effect
      db.verify()

      done()
    }).catch(done)
  })
  it('call backs', done => {

    // Boilerplate
    const db = simplydit.mock('db', { user: { findOne: simplydit.func } })

    // This findOne method uses callbacks instead of Promises.
    db.user.findOne
      .expectCallWith(simplydit.anything)  // there's currently no support for partial
                                           // descriptions (PRs welcomed)
      .andCallback(1, [null, 'result'])    // "1" is the position (0-based) of the callback
                                           // The array is the arguments to be passed
                                           // This simulates the very common response:
                                           // "err" = null, "res" = something

    // The rest of the example is pretty much equal
  })
})
```

## Notes

This is some very early work on trying to improve on top of sinon, which I've been using 
to get a similar result, but the way it overwrites values in objects is prone to errors.

## License

MIT

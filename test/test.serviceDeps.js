const tap = require('tap');
const Hapi = require('hapi');
const plugin = require('../index.js');
const util = require('util');
const wait = util.promisify(setTimeout);

tap.test('can initialize and use service deps', async t => {
  const server = new Hapi.Server({ port: 8080 });
  await server.register({
    plugin,
    options: {
      checkOnStart: false,
      services: {
        test: 'http://test'
      }
    }
  });
  const service = server.services.getService('test');
  t.deepEqual(service, {
    endpoint: 'http://test'
  });
  t.end();
});

tap.test('service deps starts/stops listening when server starts/stops', async t => {
  const server = new Hapi.Server({ port: 8080 });
  await server.register({
    plugin,
    options: {
      checkOnStart: false,
      monitorInterval: 100,
      services: {
        test: 'http://localhost:8080'
      }
    }
  });
  server.route({
    method: 'get',
    path: '/',
    handler(request, h) {
      return 'ok';
    }
  });
  await server.start();
  let checks = 0;
  server.services.on('service.check', () => {
    checks++;
  });
  await wait(200);
  // verify event handler was called:
  t.ok(checks > 0);
  // now stop server:
  await server.stop();
  await wait(200);
  const preChecks = checks;
  await wait(200);
  // verify event handler was not called after close:
  t.equal(preChecks, checks);
  t.end();
});

tap.test('will log an error when "service.error" event is emitted', async t => {
  const server = new Hapi.Server({ port: 8080 });
  await server.register({
    plugin,
    options: {
      checkOnStart: false,
      services: {
        test: 'http://test'
      }
    }
  });
  let seen = false;
  server.events.on('log', (input) => {
    t.isA(input.timestamp, 'number');
    t.equal(input.tags[0], 'service-deps');
    t.equal(input.tags[1], 'error');
    t.match(input.data, {
      name: 'test',
      service: { endpoint: 'http://test' },
    });
    t.match(input.data.error, 'Error: this is an error');
    seen = true;
  });
  server.services.emit('service.error', 'test', { endpoint: 'http://test' }, new Error('this is an error'));
  await server.stop();
  await wait(200);
  t.ok(seen);
  t.end();
});

tap.test('verbose mode logs service.add and service.check', async t => {
  const server = new Hapi.Server({ port: 8080 });
  await server.register({
    plugin,
    options: {
      checkOnStart: false,
      verbose: true,
      monitorInterval: 400,
      services: {}
    }
  });
  server.route({
    method: 'get',
    path: '/',
    handler(request, h) {
      return 'ok';
    }
  });
  let serviceCheck = false;
  let serviceAdd = false;
  server.events.on('log', (input) => {
    if (!serviceCheck && input.tags.includes('service.check')) {
      serviceCheck = true;
      t.match(input.data.name, 'test');
      t.match(input.data.service, { endpoint: 'http://localhost:8080/' });
    }
    if (!serviceAdd && input.tags.includes('service.add')) {
      serviceAdd = true;
      t.match(input.data.name, 'test');
    }
  });
  await server.start();
  server.services.addService('test', 'http://localhost:8080/');
  await wait(500);
  server.services.stopMonitor();
  // now stop server:
  t.ok(serviceCheck);
  t.ok(serviceAdd);
  await server.stop();
  t.end();
});

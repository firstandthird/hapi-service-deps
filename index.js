const ServiceDeps = require('service-deps');

const register = (server, options) => {
  const services = new ServiceDeps(options);
  server.decorate('server', 'services', services);
  server.events.on('start', () => {
    server.services.startMonitor();
  });
  server.events.on('stop', () => {
    server.services.stopMonitor();
  });
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};

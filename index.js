const ServiceDeps = require('service-deps');

const defaults = {
  verbose: false
};

const register = (server, pluginOptions) => {
  const options = Object.assign(defaults, pluginOptions);
  const services = new ServiceDeps(options);
  server.decorate('server', 'services', services);
  server.events.on('start', () => {
    server.services.startMonitor();
  });
  server.events.on('stop', () => {
    server.services.stopMonitor();
  });
  server.services.on('service.error', (name, service, error) => {
    server.log(['service-deps', 'error'], { name, service, error: error.stack || error.message || error });
  });

  if (options.verbose) {
    server.services.on('service.check', (name, service, healthUrl) => {
      server.log(['hapi-service-deps', 'service.check'], { name, service });
    });
    server.services.on('service.add', (name) => {
      server.log(['hapi-service-deps', 'service.add'], { name });
    });
  }
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};

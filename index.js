const ServiceDeps = require('service-deps');

const defaults = {
  checkOnStart: true, // do an initial check when server is started
  startMonitor: true, // start monitoring as soon as plugin is registered
  verbose: false // log all service.check and service.add events
};

const register = (server, pluginOptions) => {
  const options = Object.assign({}, defaults, pluginOptions);
  const services = new ServiceDeps(options);
  server.decorate('server', 'services', services);
  // if startMonitor is false you will have to manually call services.startMonitor()
  if (options.startMonitor) {
    server.events.on('start', () => {
      server.services.startMonitor();
    });
  }
  if (options.checkOnStart) {
    server.ext('onPreStart', server.services.checkServices.bind(services));
  }

  server.events.on('stop', () => {
    server.services.stopMonitor();
  });
  server.services.on('service.error', (name, service, error) => {
    server.log(['service-deps', 'error'], { name, service, message: `Error with service "${name}"`, error: error.stack || error.message || error });
  });

  if (options.verbose) {
    server.services.on('service.check', (name, service, healthUrl) => {
      server.log(['hapi-service-deps', 'service.check'], { name, service, healthUrl, message: `service check for ${name} at url ${healthUrl}` });
    });
    server.services.on('service.add', (name) => {
      server.log(['hapi-service-deps', 'service.add'], { name, message: `service ${name} added` });
    });
  }
};

exports.plugin = {
  register,
  once: true,
  pkg: require('./package.json')
};

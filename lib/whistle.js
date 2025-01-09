
const path = require('path');
const startWhistle = require('whistle');
const { homedir } = require('os');
const { getWhistlePath } = require('whistle');
const { getServerIp } = require('./util/address');
const parseDomain = require('./util/parseDomain');
const getPort = require('./util/getPort');

const getShadowRules = (port, domain) => {
  domain = parseDomain(domain);
  domain.unshift(`//${getServerIp()}:${port}`);
  return domain.map((d) => {
    return `${d} http://127.0.0.1:${port} enable://capture`;
  }).join('\n');
};

module.exports = (options, callback) => {
  getPort((port) => {
    const {
      domain,
      username,
      password,
      realPort,
      realHost,
      authKey,
      mainAuthKey,
      debugMode,
      storageServer,
      dnsServer,
      globalPluginPath,
      accountPluginPath,
    } = options;
    const projectPluginPath = [path.join(__dirname, 'plugins')];
    const notUninstallPluginPath = [path.join(__dirname, '../node_modules')];
    const addon = globalPluginPath ? projectPluginPath.concat(globalPluginPath) : projectPluginPath;
    let { baseDir } = options;
    if (/^~\//.test(baseDir)) {
      baseDir = path.join(homedir(), baseDir.substring(2));
    } else if (baseDir && /^[\w.-]+$/.test(baseDir)) {
      baseDir = path.join(homedir(), '.nohost', baseDir);
    }
    if (baseDir) {
      process.env.NOHOST_BADE_DIR = baseDir;
    }
    const mode = 'proxyServer|master|x-forwarded-proto';
    const proxy = startWhistle({
      port,
      baseDir,
      projectPluginPath,
      notUninstallPluginPath,
      customPluginPath: path.join(getWhistlePath(), 'nohost_plugins/main_plugins'),
      addon,
      encrypted: true,
      username,
      password,
      realPort,
      realHost,
      cmdName: 'n2 -g',
      host: '127.0.0.1',
      shadowRules: getShadowRules(realPort, domain),
      dnsServer,
      authKey: mainAuthKey,
      pluginsDataMap: {
        nohost: {
          username,
          password,
          domain,
          realPort,
          realHost,
          authKey,
          storageServer,
          dnsServer,
          accountPluginPath,
        },
      },
      mode: debugMode ? mode : `${mode}|strict|rules|disableUpdateTips|proxifier|notAllowedDisablePlugins`,
    }, () => {
      const {
        REMOTE_ADDR_HEAD: remoteAddrHead,
        REMOTE_PORT_HEAD: remotePortHead,
      } = proxy.config;
      callback(null, { remoteAddrHead, remotePortHead, port });
    });
  });
};

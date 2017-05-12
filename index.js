'use strict';

var constants = require('haraka-constants');

exports.register = function() {
  var plugin = this;

  plugin.OpenDKIM = require('node-opendkim');

  plugin.cfg         = plugin.config.get('opendkim.ini');
  plugin.cfg.general = plugin.cfg.general || {};
  plugin.cfg.verify  = plugin.cfg.verify  || {};
  plugin.cfg.sign    = plugin.cfg.sign    || {};

  if (plugin.cfg.general.debug) {
    plugin.logdebug('haraka-plugin-opendkim: registering plugin...');
  }

  plugin.register_hook('data_post', 'opendkim');
};

exports.opendkim = function(next, connection) {
  var plugin = this;

  // set a few local variables we may use from the config
  var g_debug = (plugin.cfg.general.debug === undefined) ?
    0 : plugin.cfg.general.debug;
  var v_debug = (plugin.cfg.verify.debug === undefined) ?
    g_debug : plugin.cfg.verify.debug;
  var s_debug = (plugin.cfg.sign.debug === undefined) ?
    g_debug : plugin.cfg.sign.debug;

  if (g_debug) {
    plugin.logdebug('haraka-plugin-opendkim: hooked data_post');
  }

  return next();
};

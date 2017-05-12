'use strict';

var fixtures  = require('haraka-test-fixtures');
var constants = require('haraka-constants');

var stub      = fixtures.stub.stub;

var _set_up = function (done) {
  this.plugin = new fixtures.plugin('opendkim');

  // stub out functions
  this.connection = stub();

  // some test data
  this.configfile = {
    general : {
      debug : 0,
    },
    verify : {
      debug : 0,
    },
    sign : {
      debug : 0,
    },
  };

  if (this.plugin) {
    this.plugin.config.get = function () {
      return this.configfile;
    }.bind(this);
  }

  done();
};

exports.register = {
  setUp : _set_up,
  'should have register function' : function (test) {
    if (this.plugin) {
      test.expect(2);
      test.isNotNull(this.plugin);
      test.isFunction(this.plugin.register);
    }
    test.done();
  },
  'register function should call register_hook()' : function (test) {
    if (this.plugin && this.plugin.OpenDKIM) {
      this.plugin.register();
      test.expect(1);
      test.ok(this.plugin.register_hook.called);
    }
    test.done();
  },
  'register_hook() should register for proper hook' : function (test) {
    if (this.plugin && this.plugin.OpenDKIM) {
      this.plugin.register();
      test.expect(1);
      test.equals(this.plugin.register_hook.args[0], 'data_post');
    }
    test.done();
  },
  'register_hook() should register available function' : function (test) {
    if (this.plugin && this.plugin.OpenDKIM) {
      this.plugin.register();
      test.expect(3);
      test.equals(this.plugin.register_hook.args[1], 'opendkim');
      test.isNotNull(this.plugin.opendkim);
      test.isFunction(this.plugin.opendkim);
    }
    test.done();
  },
};

exports.hook = {
  setUp : _set_up,
  'returns just next() by default' : function (test) {
    if (!this.plugin || !this.plugin.OpenDKIM) { return test.done(); }

    var next = function (action) {
      test.expect(1);
      test.isUndefined(action);
      test.done();
    };

    this.plugin.opendkim(next, this.connection);
  },
};

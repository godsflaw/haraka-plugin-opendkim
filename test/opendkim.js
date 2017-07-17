'use strict';

var fs        = require('fs');
var fixtures  = require('haraka-test-fixtures');
var constants = require('haraka-constants');

var Connection  = fixtures.connection;
var Transaction = fixtures.transaction;
var Stub        = fixtures.stub.stub;

var _set_up = function (done) {
  this.plugin = new fixtures.plugin('opendkim');

  // stub out functions
  this.connection = Connection.createConnection();
  this.connection.transaction = Transaction.createTransaction();
  this.connection.transaction.message_stream.pipe = Stub();
  this.connection.transaction.message_stream.once = Stub();

  // some test data
  this.configfile = {
    general : {
      query_method : 'DKIM_QUERY_FILE',
      query_info   : './test/fixtures/testkeys',
    },
    verify : {},
    sign : {},
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
    test.expect(2);
    if (this.plugin) {
      test.isNotNull(this.plugin);
      test.isFunction(this.plugin.register);
    }
    test.done();
  },
  'register function should call register_hook()' : function (test) {
    test.expect(1);
    if (this.plugin) {
      this.plugin.register();
      test.ok(this.plugin.register_hook.called);
    }
    test.done();
  },
  'register_hook() should register for proper hook' : function (test) {
    test.expect(1);
    if (this.plugin) {
      this.plugin.register();
      test.equals(this.plugin.register_hook.args[0], 'data_post');
    }
    test.done();
  },
  'register_hook() should register available function' : function (test) {
    test.expect(3);
    if (this.plugin) {
      this.plugin.register();
      test.equals(this.plugin.register_hook.args[1], 'verify');
      test.isNotNull(this.plugin.verify);
      test.isFunction(this.plugin.verify);
    }
    test.done();
  },
  'register_hook() should register with higher priority' : function (test) {
    test.expect(1);
    if (this.plugin) {
      this.plugin.register();
      test.equals(this.plugin.register_hook.args[2], -25);
    }
    test.done();
  },
  'plugin OpenDKIM set' : function (test) {
    test.expect(1);
    if (this.plugin) {
      this.plugin.register();
      test.isFunction(this.plugin.OpenDKIM);
    }
    test.done();
  },
  'plugin config options set' : function (test) {
    test.expect(5);
    if (this.plugin) {
      this.plugin.register();
      test.isNotNull(this.plugin.cfg);
      test.isObject(this.plugin.cfg);
      test.isObject(this.plugin.cfg.general);
      test.isObject(this.plugin.cfg.verify);
      test.isObject(this.plugin.cfg.sign);
    }
    test.done();
  },
};

exports.hook = {
  setUp : function(done) {
    var self = this;
    _set_up.call(this, function() {
      self.plugin.register();
      done();
    });
  },
  'pipe is established to the message stream' : function (test) {
    test.expect(4);
    this.plugin.verify(Stub(), this.connection);
    test.ok(this.connection.transaction.message_stream.pipe.called);
    test.isObject(this.connection.transaction.message_stream.pipe.args[0]);
    test.isObject(this.connection.transaction.message_stream.pipe.args[1]);
    test.equals(this.connection.transaction.message_stream.pipe.args[1].line_endings, '\r\n');
    test.done();
  },
  'once is passed end for the message stream' : function (test) {
    test.expect(3);
    this.plugin.verify(Stub(), this.connection);
    test.ok(this.connection.transaction.message_stream.pipe.called);
    test.equals(this.connection.transaction.message_stream.once.args[0], 'end');
    test.isFunction(this.connection.transaction.message_stream.once.args[1]);
    test.done();
  },
};

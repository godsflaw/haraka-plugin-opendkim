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

exports.OpenDKIMVerifyStream = {
  setUp : function(done) {
    var self = this;
    _set_up.call(this, function() {
      var path = process.cwd() + '/test/fixtures/';
      self.message_good = Buffer.from(
        fs.readFileSync(path + 'message_good.eml', 'utf8')
      );
      self.message_no_signature = Buffer.from(
        fs.readFileSync(path + 'message_no_signature.eml', 'utf8')
      );
      self.message_bad_altered_body = Buffer.from(
        fs.readFileSync(path + 'message_bad_altered_body.eml', 'utf8')
      );
      self.next = Stub();
      self.plugin.register();
      self.plugin.verify(self.next, self.connection);
      self.verify_stream = self.connection.transaction.message_stream.pipe.args[0];
      self.connection.auth_results = Stub();
      self.connection.transaction.results = Stub();
      self.connection.transaction.results.add = Stub();
      done();
    });
  },
  'object members are set' : function (test) {
    test.expect(4);
    test.isObject(this.verify_stream.plugin);
    test.isFunction(this.verify_stream.callback);
    test.equals(this.verify_stream.timeout, 30);
    test.isObject(this.verify_stream.opendkim);
    test.done();
  },
  'debug calls logdebug' : function (test) {
    test.expect(2);
    this.plugin.logdebug = Stub();
    this.verify_stream.debug('test');
    test.ok(this.plugin.logdebug.called);
    test.equals(this.plugin.logdebug.args[0], 'test');
    test.done();
  },
  '_build_results pass' : function (test) {
    var vs = this.verify_stream;
    test.expect(8);
    vs.opendkim                 = Stub();
    vs.opendkim.sig_getidentity = Stub();
    vs.opendkim.sig_getdomain   = Stub();
    vs.opendkim.sig_getselector = Stub();
    var result = vs._build_result();
    test.ok(vs.opendkim.sig_getidentity.called);
    test.ok(vs.opendkim.sig_getdomain.called);
    test.ok(vs.opendkim.sig_getselector.called);
    test.isUndefined(result.error);
    test.equals(result.result, 'pass');
    test.equals(result.identity, '');
    test.equals(result.domain,   '');
    test.equals(result.selector, '');
    test.done();
  },
  '_build_results pass with no signature data' : function (test) {
    var vs = this.verify_stream;
    test.expect(5);
    var result = vs._build_result();
    test.isUndefined(result.error);
    test.equals(result.result, 'pass');
    test.equals(result.identity, 'missing identity');
    test.equals(result.domain,   'missing domain');
    test.equals(result.selector, 'missing selector');
    test.done();
  },
  '_build_results none' : function (test) {
    var vs = this.verify_stream;
    test.expect(8);
    vs.opendkim                 = Stub();
    vs.opendkim.sig_getidentity = Stub();
    vs.opendkim.sig_getdomain   = Stub();
    vs.opendkim.sig_getselector = Stub();
    var result = vs._build_result({ message: 'No signature' });
    test.ok(vs.opendkim.sig_getidentity.called);
    test.ok(vs.opendkim.sig_getdomain.called);
    test.ok(vs.opendkim.sig_getselector.called);
    test.equals(result.error, 'No signature');
    test.equals(result.result, 'none');
    test.equals(result.identity, '');
    test.equals(result.domain,   '');
    test.equals(result.selector, '');
    test.done();
  },
  '_build_results tempfail' : function (test) {
    var vs = this.verify_stream;
    test.expect(24);
    var messages = [
      'Key retrieval failed',
      'Resource unavailable',
      'Try again later'
    ];
    for (var i = 0; i < messages.length; i++) {
      vs.opendkim                 = Stub();
      vs.opendkim.sig_getidentity = Stub();
      vs.opendkim.sig_getdomain   = Stub();
      vs.opendkim.sig_getselector = Stub();
      var result = vs._build_result({ message: messages[i] });
      test.ok(vs.opendkim.sig_getidentity.called);
      test.ok(vs.opendkim.sig_getdomain.called);
      test.ok(vs.opendkim.sig_getselector.called);
      test.equals(result.error, messages[i]);
      test.equals(result.result, 'tempfail');
      test.equals(result.identity, '');
      test.equals(result.domain,   '');
      test.equals(result.selector, '');
    }
    test.done();
  },
  '_build_results invalid' : function (test) {
    var vs = this.verify_stream;
    test.expect(16);
    var messages = [
      'Invalid parameter',
      'Invalid result'
    ];
    for (var i = 0; i < messages.length; i++) {
      vs.opendkim                 = Stub();
      vs.opendkim.sig_getidentity = Stub();
      vs.opendkim.sig_getdomain   = Stub();
      vs.opendkim.sig_getselector = Stub();
      var result = vs._build_result({ message: messages[i] });
      test.ok(vs.opendkim.sig_getidentity.called);
      test.ok(vs.opendkim.sig_getdomain.called);
      test.ok(vs.opendkim.sig_getselector.called);
      test.equals(result.error, messages[i]);
      test.equals(result.result, 'invalid');
      test.equals(result.identity, '');
      test.equals(result.domain,   '');
      test.equals(result.selector, '');
    }
    test.done();
  },
  '_build_results fail' : function (test) {
    var vs = this.verify_stream;
    test.expect(16);
    var messages = [
      'Bad signature',
      'Some random error'
    ];
    for (var i = 0; i < messages.length; i++) {
      vs.opendkim                 = Stub();
      vs.opendkim.sig_getidentity = Stub();
      vs.opendkim.sig_getdomain   = Stub();
      vs.opendkim.sig_getselector = Stub();
      var result = vs._build_result({ message: messages[i] });
      test.ok(vs.opendkim.sig_getidentity.called);
      test.ok(vs.opendkim.sig_getdomain.called);
      test.ok(vs.opendkim.sig_getselector.called);
      test.equals(result.error, messages[i]);
      test.equals(result.result, 'fail');
      test.equals(result.identity, '');
      test.equals(result.domain,   '');
      test.equals(result.selector, '');
    }
    test.done();
  },
  'write an empty chunk' : function (test) {
    var vs = this.verify_stream;
    vs.callback = Stub();
    test.expect(1);
    vs.write(Buffer.from(''));
    test.ok(!(vs.callback.called));
    test.done();
  },
  'write a good message' : function (test) {
    var vs = this.verify_stream;
    vs.callback = Stub();
    test.expect(1);
    vs.write(this.message_good);
    test.ok(!(vs.callback.called));
    test.done();
  },
  'write a message with no signature' : function (test) {
    var vs = this.verify_stream;
    vs.callback = Stub();
    test.expect(4);
    vs.write(this.message_no_signature);
    test.ok(vs.callback.called);
    test.isObject(vs.callback.args[0]);
    test.equals(vs.callback.args[0].message, 'No signature');
    test.equals(vs.callback.args[1].result, 'none');
    test.done();
  },
  'write an empty chunk and end' : function (test) {
    var vs = this.verify_stream;
    vs.callback = Stub();
    test.expect(5);
    vs.write(Buffer.from(''));
    test.ok(!(vs.callback.called));
    vs.end();
    test.ok(vs.callback.called);
    test.isObject(vs.callback.args[0]);
    test.equals(vs.callback.args[0].message, 'Syntax error');
    test.equals(vs.callback.args[1].result, 'fail');
    test.done();
  },
  'write a good message and end' : function (test) {
    var vs = this.verify_stream;
    vs.callback = Stub();
    test.expect(6);
    vs.end(this.message_good);
    test.ok(vs.callback.called);
    test.isUndefined(vs.callback.args[0]);
    test.equals(vs.callback.args[1].result, 'pass');
    test.equals(vs.callback.args[1].identity, '@example.com');
    test.equals(vs.callback.args[1].domain, 'example.com');
    test.equals(vs.callback.args[1].selector, 'test');
    test.done();
  },
  'write a message with no signature and end' : function (test) {
    var vs = this.verify_stream;
    vs.callback = Stub();
    test.expect(4);
    vs.end(this.message_no_signature);
    test.ok(vs.callback.called);
    test.isObject(vs.callback.args[0]);
    test.equals(vs.callback.args[0].message, 'No signature');
    test.equals(vs.callback.args[1].result, 'none');
    test.done();
  },
  'results good message (pass)' : function (test) {
    var vs = this.verify_stream;
    test.expect(12);
    this.connection.loginfo = Stub();
    this.connection.logdebug = Stub();
    vs.end(this.message_good);
    test.ok(this.connection.auth_results.called);
    test.equals(
      this.connection.auth_results.args[0],
      'dkim=pass header.i=@example.com'
    );
    test.ok(this.connection.loginfo.called);
    test.equals(
      this.connection.loginfo.args[1],
      'identity="@example.com" domain="example.com" selector="test" result=pass'
    );
    test.ok(this.connection.logdebug.called);
    test.ok(this.connection.transaction.results.add.called);
    test.equals(this.connection.transaction.results.add.args[1].pass, 'example.com');
    test.isObject(this.connection.transaction.notes.opendkim_result);
    test.equals(this.connection.transaction.notes.opendkim_result.result, 'pass');
    test.equals(this.connection.transaction.notes.opendkim_result.identity, '@example.com');
    test.equals(this.connection.transaction.notes.opendkim_result.domain, 'example.com');
    test.equals(this.connection.transaction.notes.opendkim_result.selector, 'test');
    test.done();
  },
  'results message with no signature (none)' : function (test) {
    var vs = this.verify_stream;
    test.expect(12);
    this.connection.loginfo = Stub();
    this.connection.logdebug = Stub();
    vs.end(this.message_no_signature);
    test.ok(this.connection.auth_results.called);
    test.equals(
      this.connection.auth_results.args[0],
      'dkim=none (No signature) header.i=missing identity'
    );
    test.ok(this.connection.loginfo.called);
    test.equals(
      this.connection.loginfo.args[1],
      'identity="missing identity" domain="missing domain" ' +
      'selector="missing selector" result=none (No signature)'
    );
    test.ok(this.connection.logdebug.called);
    test.ok(this.connection.transaction.results.add.called);
    test.equals(this.connection.transaction.results.add.args[1].err, 'missing domain (No signature)');
    test.isObject(this.connection.transaction.notes.opendkim_result);
    test.equals(this.connection.transaction.notes.opendkim_result.result, 'none');
    test.equals(this.connection.transaction.notes.opendkim_result.identity, 'missing identity');
    test.equals(this.connection.transaction.notes.opendkim_result.domain, 'missing domain');
    test.equals(this.connection.transaction.notes.opendkim_result.selector, 'missing selector');
    test.done();
  },
  'results message with modified body (fail)' : function (test) {
    var vs = this.verify_stream;
    test.expect(12);
    this.connection.loginfo = Stub();
    this.connection.logdebug = Stub();
    vs.end(this.message_bad_altered_body);
    test.ok(this.connection.auth_results.called);
    test.equals(
      this.connection.auth_results.args[0],
      'dkim=fail (Bad signature) header.i=@example.com'
    );
    test.ok(this.connection.loginfo.called);
    test.equals(
      this.connection.loginfo.args[1],
      'identity="@example.com" domain="example.com" selector="test" result=fail (Bad signature)'
    );
    test.ok(this.connection.logdebug.called);
    test.ok(this.connection.transaction.results.add.called);
    test.equals(this.connection.transaction.results.add.args[1].fail, 'example.com (Bad signature)');
    test.isObject(this.connection.transaction.notes.opendkim_result);
    test.equals(this.connection.transaction.notes.opendkim_result.result, 'fail');
    test.equals(this.connection.transaction.notes.opendkim_result.identity, '@example.com');
    test.equals(this.connection.transaction.notes.opendkim_result.domain, 'example.com');
    test.equals(this.connection.transaction.notes.opendkim_result.selector, 'test');
    test.done();
  },
};
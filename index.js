'use strict';

var Stream    = require('stream').Stream;
var util      = require('util');
var constants = require('haraka-constants');

class OpenDKIMVerifyStream extends Stream {
  constructor (cb, plugin, opendkim) {
    super();

    var self      = this;
    this.plugin   = plugin;
    this.writable = true;
    this.finished = false;
    this.timeout  = ((plugin.timeout) ? plugin.timeout - 1 : 30);
    this.opendkim = opendkim;

    this.callback = function (err, res) {
      self._complete();
      return cb(err, res);
    };
  }
}

OpenDKIMVerifyStream.prototype.debug = function (str) {
  this.plugin.logdebug(str);
};

OpenDKIMVerifyStream.prototype._complete = function () {
  this.writable = false;
  this.finished = true;
};

OpenDKIMVerifyStream.prototype._get_chunk = function (buf) {
  var chunk = buf
    .toString('utf8')
    .replace(/\nTo:\s+/g, '\nTo: ');  // fixes wrapped To: header from yahoo
  return chunk;
};

OpenDKIMVerifyStream.prototype._build_result = function (error) {
  var result = {};

  if (error === undefined) {
    // The pass case.
    result.result = 'pass';
  } else if (error.message === 'No signature') {
    // The none case.  We can't know if this is a fail until DMARC.
    result.result = 'none';
    result.error  = error.message;
  } else if (error.message === 'Key retrieval failed' ||
             error.message === 'Resource unavailable' ||
             error.message === 'Try again later') {
    // The 'tempfail' case, where we can retry
    result.result = 'tempfail';
    result.error  = error.message;
  } else if (error.message === 'Invalid parameter' ||
             error.message === 'Invalid result') {
    // The 'invalid' case.
    result.result = 'invalid';
    result.error  = error.message;
  } else {
    // Everything else is simply a 'fail'
    result.result = 'fail';
    result.error  = error.message || 'No error message';
  }

  // This data may be missing in many cases, but we care about
  // it in all cases.
  try {
    result.identity = this.opendkim.sig_getidentity() || '';
  } catch(err) {
    this.plugin.logdebug('missing identity: ' + err.message);
    result.identity = '';
  }

  try {
    result.domain = this.opendkim.sig_getdomain() || '';
  } catch(err) {
    this.plugin.logdebug('missing domain: ' + err.message);
    result.domain = '';
  }

  try {
    result.selector = this.opendkim.sig_getselector() || '';
  } catch(err) {
    this.plugin.logdebug('missing selector: ' + err.message);
    result.selector = '';
  }

  return result;
};

OpenDKIMVerifyStream.prototype.write = function (buf) {
  var self = this;

  if (buf && buf.length && !(self.finished)) {
    var chunk = self._get_chunk(buf);
    var options = {
        message: chunk,
        length: chunk.length
    };
    self.opendkim.chunk(options, function (err, result) {
      if (err) {
        return self.callback(err, self._build_result(err));
      }

      self.emit('drain');
    });
  }

  return false;
};

OpenDKIMVerifyStream.prototype.end = function (buf) {
  var self = this;

  if (self.finished) {
    return;
  }

  if (buf && buf.length) {
    // There is still a buffer, we need to process it
    var chunk = self._get_chunk(buf);
    var options = {
        message: chunk,
        length: chunk.length
    };
    self.opendkim.chunk(options, async function (err, result) {
      if (err) {
        return self.callback(err, self._build_result(err));
      }

      try {
        await self.opendkim.chunk_end();
        return self.callback(undefined, self._build_result());
      } catch (err) {
        return self.callback(err, self._build_result(err));
      }
    });
  } else {
    // empty buffer, just call chunk_end() and move on
    self.opendkim.chunk_end(function (err, result) {
      if (err) {
        return self.callback(err, self._build_result(err));
      }

      return self.callback(undefined, self._build_result());
    });
  }
};

//
// Plugin entry point
//
exports.register = function () {
  var plugin = this;

  plugin.OpenDKIM    = require('node-opendkim');

  plugin.cfg         = plugin.config.get('opendkim.ini');
  plugin.cfg.general = plugin.cfg.general || {};
  plugin.cfg.verify  = plugin.cfg.verify  || {};
  plugin.cfg.sign    = plugin.cfg.sign    || {};

  plugin.logdebug('haraka-plugin-opendkim: registering plugin...');

  plugin.register_hook('data_post', 'verify', -25);
};

exports.verify = function (next, connection) {
  var plugin = this;

  plugin.logdebug('haraka-plugin-opendkim: hooked data_post');

  if (!connection || !connection.transaction) {
      return next();
  }

  var txn = connection.transaction;
  var opendkim = new plugin.OpenDKIM();

  if (this.cfg.general.query_method && this.cfg.general.query_info) {
    opendkim.query_method(this.cfg.general.query_method);
    opendkim.query_info(this.cfg.general.query_info);
  }

  opendkim.verify_sync({id: txn.uuid});

  var verifier = new OpenDKIMVerifyStream(function (err, res) {
    connection.auth_results(
      'dkim=' + res.result +
      ((res.error) ? ' (' + res.error + ')' : '') +
      ' header.i=' + res.identity
    );

    connection.loginfo(plugin, 'identity="' + res.identity + '" ' +
                               'domain="'   + res.domain + '" ' +
                               'selector="' + res.selector + '" ' +
                               'result='    + res.result +
                              ((res.error) ? ' (' + res.error + ')' : ''));

    // Add individual results to ResultStore
    if (res.result === 'pass') {
      txn.results.add(plugin, { pass: res.domain });
    } else if (res.result === 'none') {
      txn.results.add(plugin, {
        skip: ((res.error) ? '(' + res.error + ')' : '')
      });
    } else if (res.result === 'fail') {
      txn.results.add(plugin, {
        fail: res.domain + ((res.error) ? ' (' + res.error + ')' : '')
      });
    } else {
      txn.results.add(plugin, {
          err: res.domain + ((res.error) ? ' (' + res.error + ')' : '')
      });
    }

    connection.logdebug(plugin, JSON.stringify(res));

    // Store results for other plugins
    txn.notes.opendkim_result = res;

    return process.nextTick(() => {
      next();
    });
  }, plugin, opendkim);
  txn.message_stream.pipe(verifier, { line_endings: '\r\n' });
};

'use strict';

var Mongoo = require('../lib/mongoo.js')
  , Mongoose = require('mongoose')
  , Path = require('path')
  , Util = require('util')
  , Moment = require('moment')
  , Async = require('async')
  , Belt = require('jsbelt')
  , _ = require('underscore')
  , Optionall = require('optionall')
  , O = new Optionall();

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

var Globals = {
  'mongo_connection': Util.format('mongodb://%s:%s/%s', O.mongodb.host, O.mongodb.port, O.mongodb.db)
};

exports['plugins'] = {
  'setUp': function(done){
    Globals.mongoose = Mongoose.createConnection(Globals.mongo_connection);
    done();
  }
, 'tests': function(test){
    return Async.waterfall([
      function(cb){
        Globals.schema = new Mongoose.Schema({
          'label': String
        });
        Globals.schema.plugin(Mongoo.plugins.timestamps).plugin(Mongoo.plugins.encrypt_path, {'path': 'password'});
        Globals.mongoose.model('label', Globals.schema);
        return Globals.mongoose.model('label').create({'label': 'test', 'plaintext_password': 'thisisthepassword'}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        test.ok(Globals.doc.get('password') !== 'thisisthepassword');
        test.ok(!Globals.doc.get('plaintext_password'));
        return Globals.doc.match_password('thisisthepassword', Belt.cs(cb, Globals, 'matches', 0));
      }
    , function(cb){
        test.ok(Globals.matches);
        return Globals.doc.match_password('notthepassword', Belt.cs(cb, Globals, 'matches', 0));
      }
    , function(cb){
        test.ok(!Globals.matches);
        return cb();
      }
    , function(cb){
        Globals.doc.set('plaintext_password', 'changing the password');
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        return Globals.doc.match_password('changing the password', Belt.cs(cb, Globals, 'matches', 0));
      }
    , function(cb){
        test.ok(Globals.matches);
        return Globals.doc.match_password('thisisthepassword', Belt.cs(cb, Globals, 'matches', 0));
      }
    , function(cb){
        test.ok(!Globals.matches);
        Globals.hash = Globals.doc.get('password');
        return cb();
      }
    , function(cb){
        Globals.doc.set('label', 'changing the label');
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(Globals.hash === Globals.doc.get('password'));
        return cb();
      }
    , function(cb){
        Globals.schema2 = new Mongoose.Schema({
          'label': String
        });
        Globals.schema2.plugin(Mongoo.plugins.encrypt_path, {'path': 'password', 'required': true});
        Globals.mongoose.model('label2', Globals.schema2);
        return Globals.mongoose.model('label2').create({'label': 'test'}, function(err, doc){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        return Globals.mongoose.model('label2').create({'label': 'test', 'plaintext_password': 'apasswordgoinghere'}, function(err, doc){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema3 = new Mongoose.Schema({
          'label': String
        });
        Globals.schema3.plugin(Mongoo.plugins.encrypt_path, {'path': 'password'});
        Globals.schema3.plugin(Mongoo.plugins.confirm_path, {'path': 'plaintext_password'});
        Globals.model = Globals.mongoose.model('model3', Globals.schema3);
        return Globals.mongoose.model('model3').create({'label': 'test', 'plaintext_password': 'thisisthepassword'}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        return Globals.mongoose.model('model3').create({'label': 'test', 'plaintext_password': 'thisisthepassword'
        , 'plaintext_password_confirmation': 'thisisthepassword'}, function(err, doc){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        return Globals.mongoose.model('model3').create({'label': 'test'}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        var doc = new Globals.model();
        doc.set('plaintext_password', 'anewtest');
        return doc.save(function(err){
          test.ok(err);
          Globals.doc = doc;
          doc.set('plaintext_password_confirmation', 'anewtest');
          return doc.save(Belt.cw(cb, 0));
        });
      }
    , function(cb){
        Globals.uuid = Belt.uuid();
        Globals.doc.set('plaintext_password', Globals.uuid);
        return Globals.doc.save(function(err){
          test.ok(err);
          Globals.doc.set('plaintext_password_confirmation', Globals.uuid);
          return Globals.doc.save(Belt.cw(cb, 0));
        });
      }
    , function(cb){
        Globals.schema4 = new Mongoose.Schema({
          'label': String
        });
        Globals.schema4.plugin(Mongoo.plugins.virtual_path, {});
        Globals.schema4.virtual('thisisvirtual');
        Globals.model = Globals.mongoose.model('model4', Globals.schema4);
        return cb();
      }
    , function(cb){
        var doc = new Globals.model();
        doc.set('thisisvirtual', 'anewtest');
        test.ok(doc.isModified('thisisvirtual'));
        return cb();
      }
    , function(cb){
        var doc = new Globals.model();
        test.ok(!doc.isModified('thisisvirtual'));
        return cb();
      }
    , function(cb){
        return Globals.model.create({}, function(err, doc){
          test.ok(!err);
          test.ok(!doc.isModified('thisisvirtual'));
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'thisisvirtual': 'anewtest'}, function(err, doc){
          test.ok(!err);
          test.ok(doc.isModified('thisisvirtual'));
          return cb();
        });
      }
    , function(cb){
        Globals.schema5 = new Mongoose.Schema({
          'label': String
        });
        Globals.schema5.plugin(Mongoo.plugins.timestamps);
        Globals.model = Globals.mongoose.model('model5', Globals.schema5);
        return cb();
      }
    , function(cb){
        return Globals.model.create({}, function(err, doc){
          test.ok(!err);
          test.ok(doc.get('created_at'));
          test.ok(doc.get('updated_at'));
          test.ok(doc.get('created_at') === doc.get('updated_at'));
          doc.set('label', 'something new');
          return doc.save(function(err, doc){
            test.ok(!err);
            test.ok(doc.get('created_at'));
            test.ok(doc.get('updated_at'));
            test.ok(doc.get('created_at') !== doc.get('updated_at'));
            return cb();
          });
        });
      }
    , function(cb){
        return Globals.model.create({}, function(err, doc){
          test.ok(!err);
          var c = doc.get('created_at'), u = doc.get('updated_at');
          test.ok(c);
          test.ok(u);
          test.ok(c === u);
          return doc.save(function(err, doc){
            test.ok(!err);
            test.ok(doc.get('created_at') === c);
            test.ok(doc.get('updated_at') === u);
            test.ok(doc.get('created_at') === doc.get('updated_at'));
            return cb();
          });
        });
      }
    , function(cb){
        Globals.schema6 = new Mongoose.Schema({
          'label': String
        });
        Globals.schema6.plugin(Mongoo.plugins.path_token, {'path': 'label'});
        Globals.model = Globals.mongoose.model('model6', Globals.schema6);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'label': 'anewtest'}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        test.ok(Globals.doc.get('label_token.token'));
        Globals.token = Globals.doc.get('label_token.token');
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        Globals.doc.set('label', 'somethingnew');
        return Globals.doc.save(function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        Globals.doc.set('label', 'somethingnew');
        Globals.doc.set('label_token_confirmation', Globals.token);
        return Globals.doc.save(function(err, doc){
          test.ok(!err);
          test.ok(Globals.token !== doc.get('label_token.token'));
          return cb();
        });
      }
    , function(cb){
        Globals.schema7 = new Mongoose.Schema({
          'label': String
        });
        Globals.schema7.plugin(Mongoo.plugins.path_token, {'path': 'label', 'expires': 2000});
        Globals.model = Globals.mongoose.model('model7', Globals.schema7);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'label': 'anewtest'}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        test.ok(Globals.doc.get('label_token.token'));
        test.ok(Globals.doc.get('label_token.expires_at'));
        Globals.token = Globals.doc.get('label_token.token');
        return setTimeout(function(){ return Globals.doc.save(Belt.cs(cb, Globals, 'doc2', 1, 0)); }, 3000);
      }
    , function(cb){
        test.ok(Globals.token !== Globals.doc2.get('label_token.token'));
        Globals.doc2.set('label', 'somethingnew');
        Globals.doc2.set('label_token_confirmation', Globals.doc2.get('label_token.token'));
        return Globals.doc2.save(function(err, doc){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema8 = new Mongoose.Schema({
          'label': String
        , 'name': String
        });
        Globals.schema8.plugin(Mongoo.plugins.require_together, {'paths': ['label', 'name']});
        Globals.model = Globals.mongoose.model('model8', Globals.schema8);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'label': 'anewtest', 'name': 'aname'}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        return Globals.model.create({'label': 'anewtest'}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema9 = new Mongoose.Schema({
          'start': Date
        , 'stop': Date
        });
        Globals.schema9.plugin(Mongoo.plugins.start_end, {'start_path': 'start', 'end_path': 'stop'});
        Globals.model = Globals.mongoose.model('model9', Globals.schema9);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'start': Moment().toDate(), 'stop': Moment().subtract(30, 'years')}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        var t = Moment().toDate();
        return Globals.model.create({'start': t, 'stop': t}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'start': Moment().toDate(), 'stop': Moment().add(30, 'years')}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'start': Moment().add(30, 'years'), 'stop': Moment().add(1, 'years')}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema10 = new Mongoose.Schema({
          'start': Number
        , 'stop': Number
        });
        Globals.schema10.plugin(Mongoo.plugins.min_max, {'min_path': 'start', 'max_path': 'stop'});
        Globals.model = Globals.mongoose.model('model10', Globals.schema10);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'start': 1, 'stop': 0}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'start': 1, 'stop': 1}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'start': 1, 'stop': 12}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema11 = new Mongoose.Schema({
          'tags': Array
        });
        Globals.schema11.plugin(Mongoo.plugins.set_predicate);
        Globals.schema11.validate_set('tags', function(t){ return t === 'apple'; });
        Globals.model = Globals.mongoose.model('model11', Globals.schema11);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'tags': ['orange', 'apple']}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'tags': ['orange', 'banana', 'grapefruit']}, function(err, doc){
          test.ok(!err);
          Globals.tags = doc.get('tags');
          doc.iter_add('tags', 'cucumber', function(t){ return t === 'orange'; });
          test.ok(Belt.deepEqual(Globals.tags, doc.get('tags')));
          doc.iter_add('tags', 'cucumber', function(t){ return t === 'cucumber'; });
          test.ok(_.find(doc.get('tags'), function(f){ return f === 'cucumber'; }));
          test.ok(doc.iter_indexOf('tags', function(f){ return f === 'grapefruit'; }) === 2);
          test.ok(Belt.deepEqual(doc.iter_remove('tags', function(t){ return t.match(/(orange|cucumber)/); }), ['orange', 'cucumber']));
          test.ok(Belt.deepEqual(doc.get('tags'), ['banana', 'grapefruit']));
          return doc.save(Belt.cw(cb, 0));
        });
      }
    , function(cb){
        Globals.schema12 = new Mongoose.Schema({});
        Globals.schema12.plugin(Mongoo.plugins.url_path, {'path': 'url', 'required': true});
        Globals.model = Globals.mongoose.model('model12', Globals.schema12);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'url': 'not a url'}, function(err){
          test.ok(err);

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({}, function(err){
          test.ok(err);

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'url': 'https://www.reddit.com'}, function(err){
          test.ok(!err);

          return cb();
        });
      }
    , function(cb){
        Globals.schema13 = new Mongoose.Schema({});
        Globals.schema13.plugin(Mongoo.plugins.email_path, {'path': 'email'});
        Globals.schema13.plugin(Mongoo.plugins.phone_path, {'path': 'phone'});
        Globals.model = Globals.mongoose.model('model13', Globals.schema13);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'email': 'https://www.reddit.com'}, function(err){
          test.ok(err);

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'email': 'fake@email.io'}, function(err){
          test.ok(!err);

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'phone': 'fake@email.io'}, function(err){
          test.ok(err);

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'phone': '555-555-5555'}, function(err){
          test.ok(!err);

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'phone': '555.555.5555'}, function(err){
          test.ok(!err);

          return cb();
        });
      }
    , function(cb){
        return Mongoo.utils.clearModels(Globals.mongoose, Belt.cw(cb, 0));
      }
    , function(cb){
        return Globals.mongoose.model('label2').find({}, Belt.cs(cb, Globals, 'docs', 1, 0));
      }
    , function(cb){
        test.ok(!_.any(Globals.docs));
        return cb();
      }
    , function(cb){
        return Globals.mongoose.model('label').find({}, Belt.cs(cb, Globals, 'docs', 1, 0));
      }
    , function(cb){
        test.ok(!_.any(Globals.docs));
        return cb();
      }
    ], function(err){
      if (err) console.error(err);
      test.ok(!err);
      return test.done();
    });
  }
};

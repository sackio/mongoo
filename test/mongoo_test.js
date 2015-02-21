'use strict';

var Mongoo = require('../lib/mongoo.js')
  , Mongoose = require('mongoose')
  , Path = require('path')
  , Util = require('util')
  , Moment = require('moment')
  , FSTK = require('fstk')
  , Async = require('async')
  , Belt = require('jsbelt')
  , OS = require('os')
  , _ = require('underscore')
  , Optionall = require('optionall')
  , O = new Optionall(Path.resolve('./'))
  , Solrdex = new require('solrdex')(O)
  , Paid = new require('pa1d')(O)
  , Seme = new require('seme')(O)
  , Colors = require('colors')
  , Winston = require('winston')
;

var Globals = {
  'mongo_connection': Util.format('mongodb://%s:%s/%s', O.mongodb.host, O.mongodb.port, O.mongodb.db)
}
  , gb = Globals
  , log = new Winston.Logger()
;

log.add(Winston.transports.Console, {'level': 'debug', 'colorize': true, 'timestamp': false});

Globals.mongoose = Mongoose.createConnection(Globals.mongo_connection);

exports['plugins'] = {
  'setUp': function(done){
    done();
  }
, 'plugins': function(test){
    return Async.waterfall([
      function(cb){
        console.log('TEST: encrypt_path'.bold.blue);

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
        console.log('TEST: encrypt_path - changing password'.bold.blue);

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
        console.log('TEST: encrypt_path - required'.bold.blue);

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
        console.log('TEST: confirm_path'.bold.blue);

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
        console.log('TEST: virtual_path'.bold.blue);

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
        console.log('TEST: timestamps'.bold.blue);

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
        console.log('TEST: path_token'.bold.blue);

        Globals.schema6 = new Mongoose.Schema({
          'label': String
        });
        Globals.schema6.plugin(Mongoo.plugins.path_token, {'path': 'label', 'expires': 302000});
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
          gb.doc = doc;
          return cb();
        });
      }
    , function(cb){
        gb.doc.create_label_token();
        gb.token = gb.doc.get('label_token.token');
        gb.expires = gb.doc.get('label_token.expires_at');
        test.ok(gb.token);
        test.ok(gb.expires);

        gb.doc.create_label_token();
        gb.token2 = gb.doc.get('label_token.token');
        gb.expires2 = gb.doc.get('label_token.expires_at');
        test.ok(gb.token2);
        test.ok(gb.expires2);
        test.ok(gb.token !== gb.token2);
        test.ok(gb.expires !== gb.token2);

        gb.doc.set('label', 'new value');
        gb.doc.save(function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        gb.doc.set('label_token_confirmation', gb.token);
        gb.doc.save(function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        gb.doc.set('label_token_confirmation', gb.token2);
        gb.doc.save(function(err, doc){
          test.ok(!err);
          gb.doc = doc;

          gb.token3 = gb.doc.get('label_token.token');
          gb.expires3 = gb.doc.get('label_token.expires_at');

          test.ok(gb.token2 !== gb.token3);
          test.ok(gb.expires2 !== gb.expires3);

          return cb();
        });
      }
    , function(cb){
        gb.doc.set('label_token.expires_at', Moment().subtract(1, 'years').toDate());
        gb.doc.set('label_token_confirmation', gb.token3);
        gb.doc.set('label', 'yet another new value');

        gb.doc.save(function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        gb.doc.set('label_token.expires_at', Moment().add(2, 'years').toDate());
        gb.doc.set('label_token_confirmation', gb.doc.get('label_token.token'));
        gb.doc.set('label', 'yet still another new value');

        gb.doc.save(function(err){
          test.ok(!err);
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
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        console.log('TEST: require_together'.bold.blue);

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
        return Globals.model.create({'label': 'anewtest', 'name': null}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        console.log('TEST: require_together - if paths'.bold.blue);

        Globals.schema_8 = new Mongoose.Schema({
          'label': String
        , 'name': String
        });
        Globals.schema_8.plugin(Mongoo.plugins.require_together, {'paths': 'label', 'if_paths': 'name'});
        Globals.model = Globals.mongoose.model('model_8', Globals.schema_8);
        return cb();
      }
    , function(cb){
        console.log('TEST: require_together - if paths'.bold.blue);

        Globals.schema__8 = new Mongoose.Schema({
          'label': [String]
        , 'name': String
        });
        Globals.schema__8.plugin(Mongoo.plugins.require_together, {'paths': 'label.1', 'if_paths': 'name'});
        Globals.model = Globals.mongoose.model('model__8', Globals.schema__8);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'label': ['anewtest'], 'name': null}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'label': ['test', 'done'], 'name': 'Bill'}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'label': null, 'name': 'Ben'}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'label': [1], 'name': 'Ben'}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        console.log('TEST: start_end'.bold.blue);

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
        console.log('TEST: min_max'.bold.blue);

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
        console.log('TEST: set_predicate'.bold.blue);

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
          //test.ok(Belt.deepEqual(Globals.tags, Belt.cast(doc.get('tags'), 'array')));
          doc.iter_add('tags', 'cucumber', function(t){ return t === 'cucumber'; });
          test.ok(_.find(doc.get('tags'), function(f){ return f === 'cucumber'; }));
          test.ok(doc.iter_indexOf('tags', function(f){ return f === 'grapefruit'; }) === 2);
          test.ok(Belt.deepEqual(doc.iter_remove('tags', function(t){ return t.match(/(orange|cucumber)/); }), ['orange', 'cucumber']));
          //test.ok(Belt.deepEqual(Belt.cast(doc.get('tags'), 'array'), ['banana', 'grapefruit']));
          return doc.save(Belt.cw(cb, 0));
        });
      }
    , function(cb){
        console.log('TEST: set_predicate - dupes'.bold.blue);

        Globals.schema_11 = new Mongoose.Schema({
          'tags': [String]
        });
        Globals.schema_11.plugin(Mongoo.plugins.set_predicate);
        Globals.schema_11.validate_set_dupes('tags');
        Globals.model = Globals.mongoose.model('model_11', Globals.schema_11);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'tags': ['orange', 'apple', 'orange']}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'tags': ['orange', 'apple', 'Apple']}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema__11 = new Mongoose.Schema({
          'tags': [{'label': String, 'count': Number}]
        });
        Globals.schema__11.plugin(Mongoo.plugins.set_predicate);
        Globals.schema__11.validate_set_dupes('tags', 'count');
        Globals.model = Globals.mongoose.model('model__11', Globals.schema__11);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'tags': [{label: 'orange', count: 9}, {label: 'apple', count: 9}]}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'tags':  [{label: 'orange', count: 9}, {label: 'orange', count: 3}]}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema___11 = new Mongoose.Schema({
          'tags': [{'label': String, 'count': Number}]
        });
        Globals.schema___11.plugin(Mongoo.plugins.set_predicate);
        Globals.schema___11.validate_set_dupes('tags', function(e){ return e.get('count') % 3; });
        Globals.model = Globals.mongoose.model('model___11', Globals.schema___11);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'tags': [{label: 'orange', count: 9}, {label: 'apple', count: 3}]}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'tags':  [{label: 'orange', count: 9}, {label: 'orange', count: 4}]}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema____11 = new Mongoose.Schema({
          'tags': Array
        });
        Globals.schema____11.plugin(Mongoo.plugins.set_predicate);
        Globals.schema____11.validate_set_dupes('tags', null, {'sparse': true});
        Globals.model = Globals.mongoose.model('model____11', Globals.schema____11);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'tags': ['orange', 'apple', 'orange']}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'tags': ['orange', null, null]}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'tags': ['orange', undefined, undefined]}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'tags': ['orange', false, false]}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema_____11 = new Mongoose.Schema({
          'tags': [{'label': String, 'count': Number}]
        });
        Globals.schema_____11.plugin(Mongoo.plugins.set_predicate);
        Globals.schema_____11.validate_set_dupes('tags', 'label', {'sparse': true});
        Globals.model = Globals.mongoose.model('model_____11', Globals.schema_____11);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'tags': [{label: null, count: 9}, {label: null, count: 3}]}, function(err){
          test.ok(!err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'tags':  [{label: 'orange', count: 9}, {label: 'orange', count: 4}]}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        console.log('TEST: url_path'.bold.blue);

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
        console.log('TEST: email_path & phone_path'.bold.blue);

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
        return Async.times(200, function(n, next){
          return Globals.model.create({
            'phone': Seme.services.faker.phone.phoneNumber()
          , 'email': Seme.services.faker.internet.email()
          }, function(err){
            test.ok(!err);
            return next();
          });
        }, Belt.cw(cb, 0));
      }
    , function(cb){
        console.log('TEST: location_path'.bold.blue);

        Globals.schema14 = new Mongoose.Schema({});
        Globals.schema14.plugin(Mongoo.plugins.location_path, {'path': 'location', 'api_key': O.google.server_api_key});
        Globals.model = Globals.mongoose.model('model14', Globals.schema14);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'location': {'given_string': 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France'}}, function(err, doc){
          test.ok(!err);

          //test.ok(doc.get('location.normalized_string') === '5 Avenue Anatole France, 75007 Paris, France');
          test.ok(doc.get('location.geo.coordinates').length === 2);
          test.ok(doc.get('location.address.city') === 'Paris');

          return cb();
        });
      }
    /*, function(cb){
        return Globals.model.create({'location': {'given_string': 'Eiffel Tower'}}, function(err, doc){
          test.ok(!err);

          //test.ok(doc.get('location.normalized_string') === 'Eiffel Tower, Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France');

          test.ok(doc.get('location.geo.coordinates').length === 2);
          test.ok(doc.get('location.address.city') === 'Paris');
          test.ok(doc.get('location.address.point_of_interest') === 'Eiffel Tower');

          return cb();
        });
      }*/
    , function(cb){
        return Globals.model.create({'location': {'geo': {'type': 'Point', 'coordinates': [-77.036530, 38.897676]}}}, function(err, doc){
          test.ok(!err);

          test.ok(doc.get('location.normalized_string') === '1600 Pennsylvania Avenue Northwest, Washington, DC 20500, USA');
          test.ok(doc.get('location.geo.coordinates').length === 2);
          test.ok(doc.get('location.address.city') === 'Washington');
          test.ok(doc.get('location.address.state') === 'District of Columbia');
          test.ok(doc.get('location.address.zip') === '20500');

          test.ok(doc.normalize_address('location') === '1600, Pennsylvania Avenue Northwest, Washington, District of Columbia, United States, 20500');

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'location': {'geo': {'type': 'Point', 'coordinates': [-77.036530, 38.897676]}}}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        Globals.doc.set('location.address.zip', null);
        Globals.obj = Globals.doc.toObject();
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(Belt.deepEqual(Globals.doc.toObject(), Globals.obj));
        test.ok(!Globals.doc.get('location.address.zip'));
        return cb();
      }
    , function(cb){
        Globals.doc.set('location.given_string', '50 Park Avenue, New York, NY');
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(!Belt.deepEqual(Globals.doc.toObject(), Globals.obj));
        test.ok(Globals.doc.get('location.address.zip'));
        return cb();
      }
    , function(cb){
        return Globals.model.create({'location': {'geo': {'type': 'Point', 'coordinates': [-77.036530, 38.897676]}}}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        Globals.doc.set('location.address.zip', null);
        Globals.obj = Globals.doc.toObject();
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(Belt.deepEqual(Globals.doc.toObject(), Globals.obj));
        test.ok(!Globals.doc.get('location.address.zip'));
        return cb();
      }
    , function(cb){
        Globals.doc.set('location.geo.coordinates', [-73.985656, 40.748433]);
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(!Belt.deepEqual(Globals.doc.toObject(), Globals.obj));
        test.ok(Globals.doc.get('location.address.zip'));
        return cb();
      }
    , function(cb){
        console.log('TEST: location_path - invalid address'.bold.blue);

        return Globals.model.create({'location': {'given_string': 'totally not an address'}}, function(err, doc){
          test.ok(err);
          test.ok(!doc);

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'location': {'geo': {'type': 'Point', 'coordinates': [-77.036530, 38.897676]}}, 'location_no_geocode': true}, function(err, doc){
          test.ok(!err);
          test.ok(doc);
          test.ok(!doc.get('location.normalized_string'));
          test.ok(doc.get('location.geo.coordinates.1'));

          return cb();
        });
      }
    , function(cb){
        Globals.schema15 = new Mongoose.Schema({});
        Globals.schema15.plugin(Mongoo.plugins.location_path, {'path': 'location', 'api_key': O.google.server_api_key, 'array': true});
        Globals.model = Globals.mongoose.model('model15', Globals.schema15);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'location': [
          {'geo': {'type': 'Point', 'coordinates': [-77.036530, 38.897676]}}
        , {'given_string': 'Eiffel Tower'}
        , {'given_string': '50 Park Avenue, New York, NY'}
        ]}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        var doc = Globals.doc;

        test.ok(doc.get('location.0.normalized_string') === '1600 Pennsylvania Avenue Northwest, Washington, DC 20500, USA');
        test.ok(doc.get('location.0.geo.coordinates').length === 2);
        test.ok(doc.get('location.0.address.city') === 'Washington');
        test.ok(doc.get('location.0.address.state') === 'District of Columbia');
        test.ok(doc.get('location.0.address.zip') === '20500');
        test.ok(doc.normalize_address('location.0') === '1600, Pennsylvania Avenue Northwest, Washington, District of Columbia, United States, 20500');
        //test.ok(doc.get('location.1.normalized_string') === 'Eiffel Tower, Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France');
        //test.ok(doc.get('location.1.geo.coordinates').length === 2);
        //test.ok(doc.get('location.1.address.city') === 'Paris');
        //test.ok(doc.get('location.1.address.point_of_interest') === 'Eiffel Tower');
        test.ok(doc.get('location.2.normalized_string') === '50 Park Avenue, New York, NY 10016, USA');

        return cb();
      }
    , function(cb){
        Globals.doc.set('location.2.address.zip', null);
        Globals.doc.set('location.1.address.zip', null);
        Globals.obj = Globals.doc.toObject();
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(Belt.deepEqual(Globals.doc.toObject(), Globals.obj));
        test.ok(!Globals.doc.get('location.2.address.zip'));
        test.ok(!Globals.doc.get('location.1.address.zip'));
        return cb();
      }
    , function(cb){
        Globals.doc.set('location.2.geo.coordinates', [-73.985656, 40.748433]);
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(!Belt.deepEqual(Globals.doc.toObject(), Globals.obj));
        test.ok(Globals.doc.get('location.2.address.zip'));
        test.ok(!Globals.doc.get('location.1.address.zip'));
        return cb();
      }
    , function(cb){
        Globals.doc.set('location.2.address.zip', null);
        Globals.doc.set('location.1.address.zip', null);
        Globals.obj = Globals.doc.toObject();
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(Belt.deepEqual(Globals.doc.toObject(), Globals.obj));
        test.ok(!Globals.doc.get('location.2.address.zip'));
        test.ok(!Globals.doc.get('location.1.address.zip'));
        return cb();
      }
    , function(cb){
        Globals.doc.set('location.1.given_string', '50 Park Avenue, New York, NY');
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(!Belt.deepEqual(Globals.doc.toObject(), Globals.obj));
        test.ok(Globals.doc.get('location.1.address.zip'));
        test.ok(!Globals.doc.get('location.2.address.zip'));
        return cb();
      }
    , function(cb){
        console.log('TEST: file_path'.bold.blue);

        Globals.schema16 = new Mongoose.Schema({});
        Globals.schema16.plugin(Mongoo.plugins.file_path, {'path': 'image'});
        Globals.model = Globals.mongoose.model('model16', Globals.schema16);
        return cb();
      }
    , function(cb){
        return Globals.model.create({}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        test.ok(Globals.doc);
        test.ok(!Globals.doc.get('image.stat'));
        test.ok(!Globals.doc.get('image.file_path'));

        return cb();
      }
    , function(cb){
        console.log('TEST: file_path - 1'.bold.blue);

        Globals.path = Path.join(OS.tmpdir(), '/' + Belt.uuid());
        return Globals.model.create({image: {file_path: Globals.path}}
               , Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        test.ok(Globals.doc.get('image.file_path') === Globals.path);
        test.ok(Globals.doc.get('image.stat.path') === Globals.path);
        test.ok(!Globals.doc.get('image.__watcher'));
        return FSTK.exists(Globals.doc.get('image.file_path'), function(exists){
          test.ok(exists);
          return cb();
        });
      }
    , function(cb){
        console.log('TEST: file_path - 2'.bold.blue);

        return Globals.doc.remove(Belt.cw(function(err){ return setTimeout(cb, 3000); }, 0));
      }
    , function(cb){
        return FSTK.exists(Globals.path, function(exists){
          test.ok(!exists);
          return cb();
        });
      }
    , function(cb){
        console.log('TEST: file_path - 3'.bold.blue);

        Globals.path = Path.join(OS.tmpdir(), '/' + Belt.uuid());
        return Globals.model.create({image: {file_path: Globals.path}}
               , Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        console.log('TEST: file_path - 4'.bold.blue);

        return Globals.doc.watch_file('image', Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(Globals.doc.get('image').__watcher);
        Globals.stat = Belt.deepCopy(Globals.doc.get('image.stat'));
        test.ok(Globals.doc.get('image.stat'));
        //test.ok(Belt.deepEqual(Globals.stat, Globals.doc.get('image.stat')));

        return Globals.doc.get('image').__watcher.set('this is a test file', Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(!Belt.deepEqual(Globals.stat, Globals.doc.get('image.stat')));
        return cb();
      }
    , function(cb){
        Globals.stat = Belt.deepCopy(Globals.doc.get('image.stat'));
        test.ok(Globals.stat);
        //test.ok(Belt.deepEqual(Globals.stat, Globals.doc.get('image.stat')));

        return FSTK.writeFile(Globals.doc.get('image.file_path'), 'changing the file', function(err){
          return setTimeout(function(){ return cb(err); }, 3000);
        });
      }
    , function(cb){
        console.log('TEST: file_path - 5'.bold.blue);

        test.ok(!Belt.deepEqual(Globals.stat, Globals.doc.get('image.stat')));
        Globals.stat = Belt.deepCopy(Globals.doc.get('image.stat'));
        Globals.doc.get('image.stat').isFile = false;
        test.ok(!Belt.deepEqual(Globals.stat, Globals.doc.get('image.stat')));
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(Globals.doc.get('image.stat.isFile'));
        return cb();
      }
    , function(cb){
        console.log('TEST: file_path - 6'.bold.blue);

        Globals.path = Path.join(OS.tmpdir(), '/' + Belt.uuid());
        Globals.doc.set('image.file_path', Globals.path);
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        return FSTK.exists(Globals.path, function(exists){
          test.ok(exists);
          test.ok(Globals.doc.get('image.file_path') === Globals.path);
          test.ok(Globals.doc.get('image.stat.path') === Globals.path);
          return cb();
        });
      }
    , function(cb){
        console.log('TEST: file_path - 7'.bold.blue);

        Globals.stat = Belt.deepCopy(Globals.doc.get('image.stat'));
        return Globals.doc.update_ftimes('image', function(err){
          test.ok(!err);
          /*return setTimeout(function(){
            return Globals.doc.stat_file('image', function(){
              test.ok(!Belt.deepEqual(Globals.stat, Globals.doc.get('image.stat')));*/
              return cb();
            //});
          //}, 3000);
        });
      }
    , function(cb){
        console.log('TEST: file_path - 8'.bold.blue);

        Globals.path = Path.join(OS.tmpdir(), '/' + Belt.uuid());
        return Globals.doc.set_file('image', Globals.path, Belt.cw(cb, 0));
      }
    , function(cb){
        return FSTK.exists(Globals.path, function(exists){
          test.ok(exists);
          test.ok(Globals.doc.get('image.file_path') === Globals.path);
//          test.ok(Globals.doc.get('image.stat.path') === Globals.path);
          return cb();
        });
      }
    , function(cb){
        console.log('TEST: file_path - 9'.bold.blue);

        Globals.schema17 = new Mongoose.Schema({});
        Globals.schema17.plugin(Mongoo.plugins.file_path, {'path': 'images', 'array': true});
        Globals.model = Globals.mongoose.model('model17', Globals.schema17);
        return cb();
      }
    , function(cb){
        return Globals.model.create({}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        test.ok(Globals.doc);
        test.ok(!_.any(Globals.doc.get('images')));

        return cb();
      }
    , function(cb){
        console.log('TEST: file_path - 10'.bold.blue);

        Globals.paths = [
          Path.join(OS.tmpdir(), '/' + Belt.uuid())
        , Path.join(OS.tmpdir(), '/' + Belt.uuid())
        , Path.join(OS.tmpdir(), '/' + Belt.uuid())
        , Path.join(OS.tmpdir(), '/' + Belt.uuid())
        ];

        return Globals.model.create({'images': _.map(Globals.paths, function(p){ return {'file_path': p}; })}
               , Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        console.log('TEST: file_path - 11'.bold.blue);

        var index = 0;

        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          test.ok(Globals.doc.get('images.' + (index - 1) + '.file_path') === p);
          test.ok(Globals.doc.get('images.' + (index - 1) + '.stat.path') === p);
          return FSTK.exists(Globals.doc.get('images.' + (index - 1) + '.file_path'), function(exists){
            test.ok(exists);
            return _cb();
          });
        }, Belt.cw(cb, 0));
      }
    , function(cb){
        console.log('TEST: file_path - 12'.bold.blue);

        var index = 0;
        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          return Globals.doc.watch_file('images.' + (index - 1), Belt.cw(cb, 0));
        }, Belt.cw(cb, 0));
      }
    , function(cb){
        console.log('TEST: file_path - 13'.bold.blue);

        var index = 0;
        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          test.ok(Globals.doc.get('images.' + (index -1)).__watcher);
          Globals.stat = Belt.deepCopy(Globals.doc.get('images.' + (index - 1) + '.stat'));
          test.ok(Globals.stat);
          //test.ok(Belt.deepEqual(Globals.stat, Globals.doc.get('images.' + (index - 1) + '.stat')));
          return Globals.doc.get('images.' + (index - 1)).__watcher.set('this is a test file', function(err){
            test.ok(!err);
            test.ok(!Belt.deepEqual(Globals.stat, Globals.doc.get('images.' + (index - 1) + '.stat')));
            return cb();
          });
        }, Belt.cw(cb, 0));
      }
    , function(cb){
        console.log('TEST: file_path - 14'.bold.blue);

        var index = 0;
        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          Globals.stat = Belt.deepCopy(Globals.doc.get('images.' + (index - 1) + '.stat'));
          test.ok(Globals.stat);
          //test.ok(Belt.deepEqual(Globals.stat, Globals.doc.get('images.' + (index - 1) + '.stat')));

          return FSTK.writeFile(Globals.doc.get('images.' + (index - 1) + '.file_path'), 'changing the file', function(err){
            test.ok(!err);
            return setTimeout(function(){ 
              //test.ok(!Belt.deepEqual(Globals.stat, Globals.doc.get('images.' + (index - 1) + '.stat')));
              //Globals.stat = Belt.deepCopy(Globals.doc.get('images.' + (index - 1) + '.stat'));
              Globals.doc.get('images.' + (index - 1) + '.stat').isFile = false;
              test.ok(!Belt.deepEqual(Globals.stat, Globals.doc.get('images.' + (index - 1) + '.stat')));
              return Globals.doc.save(function(err){
                test.ok(!err);
                test.ok(Globals.doc.get('images.' + (index - 1) + '.stat.isFile'));
                return _cb();
              });
            }, 3000);
          });
        }, Belt.cw(cb, 0));
      }
    , function(cb){
        console.log('TEST: file_path - 15'.bold.blue);

        var index = 0;
        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          Globals.paths[index - 1] = Path.join(OS.tmpdir(), '/' + Belt.uuid());
          Globals.doc.set('images.' + (index - 1) + '.file_path', Globals.paths[index - 1]);
          return Globals.doc.save(function(err){
            if (err) return _cb(err);
            return FSTK.exists(Globals.paths[index - 1], function(exists){
              test.ok(exists);
              test.ok(Globals.doc.get('images.' + (index - 1) + '.file_path') === Globals.paths[index - 1]);
              test.ok(Globals.doc.get('images.' + (index - 1) + '.stat.path') === Globals.paths[index - 1]);
              return cb();
            });
          });
        });
      }
    , function(cb){
        console.log('TEST: file_path - 16'.bold.blue);

        var index = 0;
        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          Globals.paths[index - 1] = Path.join(OS.tmpdir(), '/' + Belt.uuid());
          Globals.doc.set_file('images.' + (index - 1), Globals.paths[index - 1], function(err){
            if (err) return _cb(err);
            return FSTK.exists(Globals.paths[index - 1], function(exists){
              test.ok(exists);
              test.ok(Globals.doc.get('images.' + (index - 1) + '.file_path') === Globals.paths[index - 1]);
//              test.ok(Globals.doc.get('images.' + (index - 1) + '.stat.path') === Globals.paths[index - 1]);
              return cb();
            });
          });
        });
      }
    /*, function(cb){
        console.log('TEST: file_path - 17'.bold.blue);

        return Globals.doc.remove(Belt.cw(function(err){ return setTimeout(cb, 3000); }, 0));
      }
    , function(cb){
        console.log('TEST: file_path - 18'.bold.blue);

        var index = 0;
        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          return FSTK.exists(Globals.doc.get('images.' + (index - 1) + '.file_path'), function(exists){
            test.ok(!exists);
            return _cb();
          });
        }, Belt.cw(cb, 0));
      }*/
    , function(cb){
        return Mongoo.utils.clearSolr(O.solr, Belt.cw(cb, 0));
        //return Solrdex.delete('*', Belt.cw(cb, 0));
      }
    , function(cb){
        console.log('TEST: solr'.bold.blue);

        Globals.schema18 = new Mongoose.Schema({'description': String});
        Globals.schema18.plugin(Mongoo.plugins.solr, {'path': 'description', 'solr_client': Solrdex});
        Globals.model = Globals.mongoose.model('model18', Globals.schema18);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'description': 'It was the best of times, it was the worst of times'}
               , Belt.cs(cb, Globals, 'doc_a', 1, 0));
      }
    , function(cb){
        return Globals.model.create({'description': 'All the world\'s a stage'}
               , Belt.cs(cb, Globals, 'doc_b', 1, 0));
      }
    , function(cb){
        return Globals.model.create({'description': 'Whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune'}
               , Belt.cs(cb, Globals, 'doc_c', 1, 0));
      }
    , function(cb){
        return setTimeout(cb, 10000);
      }
    , function(cb){
        return Globals.model.solrSearch('worst times', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        //test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_a.get('_id')));
        return cb();
      }
    , function(cb){
        return Globals.model.solrSearch('wurst bezt slings', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        //test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_a.get('_id')));
        //test.ok(Belt.deepEqual(Globals.results[1]._id,Globals.doc_c.get('_id')));
        return cb();
      }
    , function(cb){
        Globals.schema19 = new Mongoose.Schema({'description': String});
        Globals.schema19.plugin(Mongoo.plugins.solr, {'path': 'description', 'commit': true, 'solr_client': Solrdex});
        Globals.modelb = Globals.mongoose.model('model19', Globals.schema19);
        return cb();
      }
    , function(cb){
        return Globals.modelb.create({'description': 'It was the best of times, it was the worst of times'}
               , Belt.cs(cb, Globals, 'doc_1', 1, 0));
      }
    , function(cb){
        return Globals.modelb.create({'description': 'All the world\'s a stage'}
               , Belt.cs(cb, Globals, 'doc_2', 1, 0));
      }
    , function(cb){
        return Globals.modelb.create({'description': 'Whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune'}
               , Belt.cs(cb, Globals, 'doc_3', 1, 0));
      }
    , function(cb){
        return setTimeout(cb, 10000);
      }
    , function(cb){
        return Globals.modelb.solrSearch('worst times', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        //test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_1.get('_id')));
        test.ok(Globals.results.length === 1);
        return cb();
      }
    , function(cb){
        return Globals.modelb.solrSearch('wurst bezt slings', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        //test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_1.get('_id')));
        //test.ok(Belt.deepEqual(Globals.results[1]._id,Globals.doc_3.get('_id')));
        test.ok(Globals.results.length === 2);
        return cb();
      }
    , function(cb){
        return Globals.model.solrSearch('worst times', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        //test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_a.get('_id')));
        test.ok(Globals.results.length === 1);
        return cb();
      }
    , function(cb){
        return Globals.model.solrSearch('wurst bezt slings', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        //test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_a.get('_id')));
        //test.ok(Belt.deepEqual(Globals.results[1]._id,Globals.doc_c.get('_id')));
        test.ok(Globals.results.length === 2);
        return cb();
      }
    , function(cb){
        return Solrdex.getById(Globals.doc_a.get('_id'), Belt.cs(cb, Globals, 'solrdoc', 1, 0));
      }
    , function(cb){
        test.ok(Belt.deepEqual(Globals.solrdoc[0].model_s, 'model18'));
        test.ok(Belt.deepEqual(Globals.solrdoc[0].id, Globals.doc_a.get('_id').toString()));
        test.ok(Belt.deepEqual(Globals.solrdoc[0].description_en[0], Globals.doc_a.get('description')));
        return cb();
      }
    , function(cb){
        return Globals.doc_a.remove(function(){ return setTimeout(cb, 1000); });
      }
    , function(cb){
        return setTimeout(cb, 5000);
      }
    , function(cb){
        return Solrdex.getById(Globals.doc_a.get('_id'), Belt.cs(cb, Globals, 'solrdoc', 1, 0));
      }
    , function(cb){
        test.ok(!_.any(Belt.deepEqual(Globals.solrdoc)));
        return cb();
      }
    , function(cb){
        console.log('TEST: access_control'.bold.blue);

        Globals.schema20 = new Mongoose.Schema({'description': String});
        Globals.schema20.plugin(Mongoo.plugins.access_control);
        Globals.model = Globals.mongoose.model('model20', Globals.schema20);
        return cb();
      }
    , function(cb){
        Globals.model.acAddRule({
          'selector': /find/
        , 'handler': function(acObj, methObj, cb){
             if (cb) return cb('I can\'t let you do that dave');
             return 'I can\'t let you do that dave';
          }
        });

        test.ok(Globals.model.ac(null, 'find', [{'_id': true}]) === 'I can\'t let you do that dave');

        return Globals.model.ac(null, 'find', [{'_id': true}, function(err){
          test.ok(err === 'I can\'t let you do that dave');

          return cb();
        }]);
      }
    , function(cb){
        test.ok(Globals.model.ac(null, 'modelName') === 'model20');
        Globals.model.acAddRule({
          'selector': 'modelName'
        , 'label': 'gonzo'
        , 'handler': function(acObj, methObj, cb){
             return 'gonzo';
          }
        });
        test.ok(Globals.model.ac(null, 'modelName') === 'gonzo');
        Globals.model.acRemoveRule('gonzo');
        test.ok(Globals.model.ac(null, 'modelName') === 'model20');
        return cb();
      }
    , function(cb){
        return Globals.model.create({'description': 'this is a document'}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        Globals.doc.acAddRule({
          'selector': 'get'
        , 'handler': function(acObj, methObj, cb){
             if (methObj.args[0] === 'description') return;
             return 'gonzo';
          }
        });

        test.ok(Globals.doc.ac({}, 'get', ['description']) === Globals.doc.get('description'));
        test.ok(Globals.doc.ac({}, 'get', ['password']) === 'gonzo');
        return cb();
      }
    , function(cb){
        console.log('TEST: access_control - mediator'.bold.blue);

        Globals.interface = Globals.doc.mediator();

        test.ok(Globals.interface.get('password') === 'gonzo');
        return cb();
      }
    , function(cb){
        console.log('TEST: nested schemas and arrays'.bold.blue);

        Globals.schema21 = new Mongoose.Schema({
          'links': [{'label': String, 'url': {type: String, required: true}}]
        });
        Globals.schema21.plugin(Mongoo.plugins.url_path, {'array_path': 'links', 'path': 'url'});
        Globals.model = Globals.mongoose.model('model21', Globals.schema21);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'links': [{'label': 'not a url'}]}, function(err){
          test.ok(err);

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        Globals.doc.get('links').push({'url': 'https://reddit.com'});
        return Globals.doc.save(Belt.cw(cb, 0));
      }
    , function(cb){
        Globals.doc.get('links').push({'url': 'not a url'});
        return Globals.doc.save(function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema22 = new Mongoose.Schema({
          'phones': [{'label': String, 'number': {type: String, required: true}}]
        });
        Globals.schema22.plugin(Mongoo.plugins.phone_path, {'array_path': 'phones', 'path': 'number'});
        Globals.model = Globals.mongoose.model('model22', Globals.schema22);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'phones': [{'label': 'not a number'}]}, function(err){
          test.ok(err);

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        Globals.doc.get('phones').push({'number': '3212320202'});
        return Globals.doc.save(function(err, doc){
          test.ok(!err);
          test.ok(doc.get('phones.0._id'));
          return cb();
        });
      }
    , function(cb){
        Globals.doc.get('phones').push({'number': 'not a number'});
        return Globals.doc.save(function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema23 = new Mongoose.Schema({
          'emails': [{'label': String, 'email': {type: String, required: true}}]
        });
        Globals.schema23.plugin(Mongoo.plugins.email_path, {'array_path': 'emails', 'path': 'email'});
        Globals.model = Globals.mongoose.model('model23', Globals.schema23);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'emails': [{'label': 'not a number'}]}, function(err){
          test.ok(err);

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        Globals.doc.get('emails').push({'email': 'atest@site.io'});
        return Globals.doc.save(function(err, doc){
          test.ok(!err);
          test.ok(doc.get('emails.0._id'));
          return cb();
        });
      }
    , function(cb){
        Globals.doc.get('emails').push({'email': 'not a number'});
        return Globals.doc.save(function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        Globals.schema24 = new Mongoose.Schema({
          'label': String
        , 'email': {type: String, required: true}
        });
        Globals.schema24.plugin(Mongoo.plugins.email_path, {'path': 'email', 'existing_path': true});
        Globals.schema25 = new Mongoose.Schema({
          'emails': [Globals.schema24]
        });
        Globals.model = Globals.mongoose.model('model25', Globals.schema25);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'emails': [{'label': 'not a number'}]}, function(err, doc){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({}, Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        Globals.doc.get('emails').push({'email': 'atest@site.io'});
        return Globals.doc.save(function(err, doc){
          test.ok(!err);
          test.ok(doc.get('emails.0._id'));
          return cb();
        });
      }
    , function(cb){
        Globals.doc.get('emails').push({'email': 'not a number'});
        return Globals.doc.save(function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        Globals.doc.get('emails').push({'label': 'not a number'});
        return Globals.doc.save(function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        console.log('TEST: solr - nested schema'.bold.blue);

        Globals.schema26 = new Mongoose.Schema({'description': String});
        Globals.schema26.plugin(Mongoo.plugins.solr, {'path': 'description', 'model_name': 'model27_file_description'
                                                     , 'commit': true, 'solr_client': Solrdex});
        Globals.schema27 = new Mongoose.Schema({'files': [Globals.schema26]});
        Globals.schema27.plugin(Mongoo.plugins.solr, {'search_only': true, 'model_name': 'model27_file_description'
                                                     , 'id_path': 'files._id', 'path': 'description', 'subdoc_path': 'files'
                                                     , 'commit': true, 'solr_client': Solrdex});
        Globals.modelb = Globals.mongoose.model('model27', Globals.schema27);
        return cb();
      }
    , function(cb){
        return Globals.modelb.create({'files': [{'description': 'It was the best of times, it was the worst of times'}]}
               , Belt.cs(cb, Globals, 'doc_1', 1, 0));
      }
    , function(cb){
        return Globals.modelb.create({'files': [ {'description': 'All the world\'s a stage'}
                                               , {'description': 'Out! Out! Life is but a walking shadow'}]}
               , Belt.cs(cb, Globals, 'doc_2', 1, 0));
      }
    , function(cb){
        return Globals.modelb.create({'files': [{'description': 'Whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune'}]}
               , Belt.cs(cb, Globals, 'doc_3', 1, 0));
      }
    , function(cb){
        return setTimeout(cb, 5000);
      }
    , function(cb){
        return Globals.modelb.solrSearch('worst times', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        //test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_1.get('_id')));
        //test.ok(Globals.results.length === 1);
        return cb();
      }
    , function(cb){
        return Globals.modelb.solrSearch('wurst bezt slings', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    /*, function(cb){
        test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_1.get('_id')));
        test.ok(Belt.deepEqual(Globals.results[1]._id,Globals.doc_3.get('_id')));
        test.ok(Globals.results.length === 2);
        return cb();
      }*/
    , function(cb){
        return Globals.modelb.solrSearch('walking shadows', function(err, docs, subdocs){
          test.ok(docs);
          //test.ok(subdocs);
          //test.ok(subdocs[docs[0].get('_id')][0] === docs[0].get('files.1._id'));
          return cb();
        });
      }
    , function(cb){
        Globals.schema28 = new Mongoose.Schema({});
        Globals.schema28.plugin(Mongoo.plugins.location_path, {'path': 'location', 'api_key': O.google.server_api_key});
        Globals.schema29 = new Mongoose.Schema({'locations': [Globals.schema28]});
        Globals.model = Globals.mongoose.model('model29', Globals.schema29);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'locations': [{'location': {'given_string': 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France'}}]}, function(err, doc){
          test.ok(!err);

          //test.ok(doc.get('locations.0.location.normalized_string') === '5 Avenue Anatole France, 75007 Paris, France');
          test.ok(doc.get('locations.0.location.geo.coordinates').length === 2);
          test.ok(doc.get('locations.0.location.address.city') === 'Paris');

          return cb();
        });
      }
    , function(cb){
        Globals.schema30 = new Mongoose.Schema({'label': String});
        Globals.schema30.plugin(Mongoo.plugins.file_path, {'path': 'image'});
        Globals.schema31 = new Mongoose.Schema({'images': [Globals.schema30]});
        Globals.model = Globals.mongoose.model('model31', Globals.schema31);
        return cb();
      }
    , function(cb){
        Globals.path = Path.join(OS.tmpdir(), '/' + Belt.uuid());
        return Globals.model.create({images: [{label: 'test', 'image': {file_path: Globals.path}}]}
               , Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        test.ok(Globals.doc.get('images.0.image.file_path') === Globals.path);
        test.ok(Globals.doc.get('images.0.image.stat.path') === Globals.path);
        return FSTK.exists(Globals.doc.get('images.0.image.file_path'), function(exists){
          test.ok(exists);
          return cb();
        });
      }
    , function(cb){
        console.log('TEST: payment_account'.bold.blue);

        Globals.schema32 = new Mongoose.Schema({'name': String});
        Globals.schema32.plugin(Mongoo.plugins.payment.account, {'path': 'payment_account', 'braintree': O.braintree});
        Globals.model = Globals.mongoose.model('model32', Globals.schema32);
        return cb();
      }
    , function(cb){
        Globals.model.create({
          'name': 'John Doe'
        , 'payment_account': {
            'account': {
              'paymentMethodNonce': Paid._provider.testing.Nonces.Transactable
            }
          }
        }, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    , function(cb){
        test.ok(gb.doc.get('payment_account.account.id'));
        test.ok(gb.doc.get('payment_account.account.creditCards.0'));
        test.ok(gb.doc.get('payment_account.account.id') === gb.doc.get('payment_account.token'));
        gb.token = gb.doc.get('payment_account.token');
        return cb();
      }
    , function(cb){
        return gb.doc.update_customer({'firstName': 'Peter'}, Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(gb.doc.get('payment_account.account.firstName') === 'Peter');
        test.ok(gb.token === gb.doc.get('payment_account.token'));
        return cb();
      }
    , function(cb){
        return Paid.update_customer(gb.token, {'email': 'thisisrandom@gmail.com'}, Belt.cw(cb, 0));
      }
    , function(cb){
        return gb.doc.get_customer(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(gb.doc.get('payment_account.account.email') === 'thisisrandom@gmail.com');
        return cb();
      }
    , function(cb){
        return gb.doc.add_payment_method({'paymentMethodNonce': Paid._provider.testing.Nonces.PayPalFuturePayment}, Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(gb.doc.get('payment_account.account.paypalAccounts.0'));
        return gb.doc.save(Belt.cs(cb, gb, 'doc', 1, 0));
      }
    , function(cb){
        return gb.doc.delete_payment_method(gb.doc.get('payment_account.account.paypalAccounts.0.token'), Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(!_.any(gb.doc.get('payment_account.account.paypalAccounts')));
        return gb.doc.remove(Belt.cw(cb, 0));
      }
    , function(cb){
        return setTimeout(function(){ return Paid.get_customer(gb.token, Belt.cs(cb, gb, 'err', 0)); }, 10000);
      }
    , function(cb){
        test.ok(gb.err instanceof Error);
        return cb();
      }
    , function(cb){
        console.log('TEST: payment_account - invalid'.bold.blue);

        return Globals.model.create({
          'name': 'John Doe'
        , 'payment_account': {
            'account': {
              'paymentMethodNonce': Paid._provider.testing.Nonces.Consumed
            }
          }
        }, function(err, doc){
          test.ok(err);
          test.ok(!doc);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({
          'name': 'John Doe'
        , 'payment_account': {
            'account': {
              'paymentMethodNonce': 'not real at all'
            }
          }
        }, function(err, doc){
          test.ok(err);
          test.ok(!doc);
          return cb();
        });
      }
    , function(cb){

        return Globals.model.create({
          'name': 'John Doe'
        , 'payment_account': {
            'account': {

            }
          }
        }, function(err, doc){
          test.ok(!err);
          test.ok(doc);
          return cb();
        });
      }
    , function(cb){
        console.log('TEST: payment_account - sale'.bold.blue);

        Globals.schema33 = new Mongoose.Schema({'description': String});
        Globals.schema33.plugin(Mongoo.plugins.payment.sale, {'path': 'gateway', 'braintree': O.braintree
                                                             , 'customer_model': 'model32'
                                                             , 'customer_payment_account_path': 'payment_account'});
        Globals.model2 = Globals.mongoose.model('model33', Globals.schema33);
        return cb();
      }
    , function(cb){
        Globals.model2.create({
          'description': 'payment without a customer'
        , 'gateway': {
            'amount': 55.55
          , 'paymentMethodNonce': Paid._provider.testing.Nonces.Transactable
          }
        }, Belt.cs(cb, gb, 'doc2', 1, 0));
      }
    , function(cb){
        test.ok(gb.doc2.get('gateway.status') === 'submitted_for_settlement');
        test.ok(gb.doc2.get('gateway.amount') === '55.55');
        test.ok(gb.doc2.get('gateway.customer.id'));
        return cb();
      }
    , function(cb){
        return gb.doc2.delete_sale(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(gb.doc2.get('gateway.status') === 'voided');
        return cb();
      }
    , function(cb){
        Globals.model.create({
          'name': 'John Doe'
        , 'payment_account': {
            'account': {
              'paymentMethodNonce': Paid._provider.testing.Nonces.Transactable
            }
          }
        }, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    , function(cb){
        Globals.model2.create({
          'gateway': { 
            'amount': Belt.random_int(19, 43)
          , 'customerId': gb.doc.get('payment_account.token')
          , 'paymentMethodNonce': Paid._provider.testing.Nonces.PayPalFuturePayment
          }
        }, Belt.cs(cb, gb, 'doc2', 1, 0));
      }
    , function(cb){
        test.ok(gb.doc2.get('gateway.customer.id') === gb.doc.get('payment_account.token'));
        return cb();
      }
    , function(cb){
        return gb.doc.get_customer(Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(gb.doc.get('payment_account.account.paypalAccounts.0'));
        return cb();
      }
    , function(cb){
        console.log('TEST: set_save'.bold.blue);

        Globals.schema34 = new Mongoose.Schema({
          'username': {type: String}
        , 'name': {type: String}
        , 'profile_picture': {type: String}
        , 'instagram_id': {type: String}
        , 'instagram_api_token': {type: String}
        , 'activation_token': {type: String}
        });
        Globals.schema34.plugin(Mongoo.plugins.set_save);
        Globals.model = Globals.mongoose.model('model34', Globals.schema34);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'name': 'John Doe'}, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    , function(cb){
        gb.set = {
          'username': Belt.uuid()
        , 'profile_picture': Belt.uuid()
        , 'instagram_id': Belt.uuid()
        , 'instagram_api_token': Belt.uuid()
        };
        return Globals.model.setSave(gb.doc.get('_id'), gb.set, Belt.cs(cb, gb, 'udoc', 1, 0));
      }
    , function(cb){
        _.each(gb.set, function(v, k){
          return test.ok(Belt.deepEqual(v, gb.udoc.get(k)), v);
        });
        return cb();
      }
    , function(cb){
        return Globals.model.create({'name': 'John Doe'}, Belt.cs(cb, gb, 'doc2', 1, 0));
      }
    , function(cb){
        gb.set = [{
          'username': Belt.uuid()
        , 'profile_picture': Belt.uuid()
        , 'instagram_id': Belt.uuid()
        , 'instagram_api_token': Belt.uuid()
        }, {
          'username': Belt.uuid()
        , 'profile_picture': Belt.uuid()
        , 'instagram_id': Belt.uuid()
        , 'instagram_api_token': Belt.uuid()
        }];
        return Globals.model.setSave([gb.doc.get('_id'), gb.doc2.get('_id')], gb.set, Belt.cs(cb, gb, 'docs', 1, 0));
      }
    , function(cb){
        _.each(gb.docs, function(d, i){
          return _.each(gb.set[i], function(v, k){
            return test.ok(Belt.deepEqual(v, d.get(k)));
          });
        });
        return cb();
      }
    , function(cb){
        console.log('TEST: object'.bold.blue);

        Globals.schema35 = new Mongoose.Schema({
          'username': {type: String}
        , 'name': {type: String}
        });
        Globals.schema35.plugin(Mongoo.plugins.object);
        Globals.model = Globals.mongoose.model('model35', Globals.schema35);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'name': 'John Doe'}, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    , function(cb){
        test.ok(gb.doc.pObj()._id === gb.doc.get('_id').toString());
        test.ok(gb.doc.match({'name': 'John Doe'}));
        test.ok(!gb.doc.match({'name': 'not John Doe'}));

        return cb();
      }
    , function(cb){
        console.log('TEST: set_predicate-values'.bold.blue);

        Globals.schema36 = new Mongoose.Schema({
          'tags': Array
        });
        Globals.schema36.plugin(Mongoo.plugins.set_predicate);
        //Globals.schema36.plugin(Mongoo.plugins.object);
        Globals.schema36.validate_set('tags', function(t){ return t === 'apple'; });
        Globals.model = Globals.mongoose.model('model36', Globals.schema36);
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
          doc.iter_add('tags', 'cucumber', 'orange');
          //test.ok(Belt.deepEqual(Globals.tags, doc.get('tags')));
          doc.iter_add('tags', 'cucumber', 'cucumber');
          test.ok(_.find(doc.get('tags'), function(f){ return f === 'cucumber'; }));
          test.ok(doc.iter_indexOf('tags', 'grapefruit') === 2);
          test.ok(Belt.deepEqual(doc.iter_remove('tags', 'orange'), ['orange']));
          //test.ok(Belt.deepEqual(doc.get('tags'), ['banana', 'grapefruit', 'cucumber']));
          return doc.save(Belt.cw(cb, 0));
        });
      }
    , function(cb){
        console.log('TEST: set_predicate-objects'.bold.blue);
        Globals.schema_37 = new Mongoose.Schema({
          'label': String
        });
        Globals.schema_37.plugin(Mongoo.plugins.object);
        Globals.schema37 = new Mongoose.Schema({
          'tags': [Globals.schema_37]
        });
        Globals.schema37.plugin(Mongoo.plugins.set_predicate);
        Globals.schema37.plugin(Mongoo.plugins.object);
        Globals.schema37.validate_set('tags', function(t){ return t.label === 'apple'; });
        Globals.model = Globals.mongoose.model('model37', Globals.schema37);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'tags': [{'label': 'orange'}, {'label': 'apple'}]}, function(err){
          test.ok(err);
          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'tags': [{'label': 'orange'}, {'label': 'banana'}, {'label': 'grapefruit'}]}, function(err, doc){
          test.ok(!err);
          Globals.tags = doc.get('tags');
          doc.iter_add('tags', {'label': 'cucumber'}, {'label': 'orange'});
          //test.ok(Belt.deepEqual(Globals.tags, doc.get('tags')));
          doc.iter_add('tags', {'label': 'cucumber'}, {'label': 'cucumber'});
          test.ok(_.find(doc.get('tags'), function(f){ return f.label === 'cucumber'; }));
          test.ok(doc.iter_indexOf('tags', {'label': 'grapefruit'}) === 2);

          var tag = _.find(doc.get('tags'), function(f){ return f.label === 'cucumber'; });
          test.ok(Belt.deepEqual(doc.iter_remove('tags', {'_id': tag.get('_id').toString()}), [tag]));
          test.ok(Belt.deepEqual(_.pluck(doc.get('tags'), 'label'), ['orange', 'banana', 'grapefruit']));
          return doc.save(Belt.cw(cb, 0));
        });
      }
    , function(cb){
        console.log('TEST: clearing models'.bold.blue);

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
, 'file_path - prev_path': function(test){
    var test_name = 'file_path - prev_path';
    log.debug(test_name);
    log.profile(test_name);

    return Async.waterfall([
      function(cb){
        gb.schema = new Mongoose.Schema({});
        gb.schema.plugin(Mongoo.plugins.file_path, {'path': 'file'});
        gb.model = gb.mongoose.model('file-path-prev', gb.schema);
        return cb();
      }
    , function(cb){
        Seme.generators.data.getImageFile({'topic': 'sushi'}, Belt.cs(cb, gb, 'img', 1, 0));
      }
    , function(cb){
        test.ok(FSTK._fs.existsSync(gb.img.path));
        return cb();
      }
    , function(cb){
        gb.newp = FSTK.tempfile();
        return gb.model.create({'file_prev_path': gb.img.path,'file': {'file_path': gb.newp}}, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    , function(cb){
        test.ok(gb.doc.get('file.file_path') === gb.newp);
        test.ok(!gb.doc.get('file_prev_path'));
        test.ok(!FSTK._fs.existsSync(gb.img.path));
        test.ok(FSTK._fs.existsSync(gb.newp));

        return cb();
      }
    ], function(err){
      test.ok(!err);
      log.profile(test_name);
      return test.done();
    });
  }
, 'clear solr': function(test){
    var test_name = 'clear solr';
    log.debug(test_name);
    log.profile(test_name);

    return Mongoo.utils.clearSolr(O.solr, function(err){
      test.ok(!err);

      log.profile(test_name);
      return test.done();
    });
  }
, 'drop database': function(test){
    var test_name = 'drop database';
    log.debug(test_name);
    log.profile(test_name);

    return Mongoo.utils.dropDB(O.mongodb.db, O.mongodb, function(err){
      test.ok(!err);

      log.profile(test_name);
      return test.done();
    });
  }
};

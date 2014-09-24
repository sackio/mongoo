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
  , O = new Optionall()
  , Solrdex = new require('solrdex')()
;

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
        Globals.schema14 = new Mongoose.Schema({});
        Globals.schema14.plugin(Mongoo.plugins.location_path, {'path': 'location', 'api_key': O.google.server_api_key});
        Globals.model = Globals.mongoose.model('model14', Globals.schema14);
        return cb();
      }
    , function(cb){
        return Globals.model.create({'location': {'given_string': 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France'}}, function(err, doc){
          test.ok(!err);

          test.ok(doc.get('location.normalized_string') === '5 Avenue Anatole France, 75007 Paris, France');
          test.ok(doc.get('location.geo.coordinates').length === 2);
          test.ok(doc.get('location.address.city') === 'Paris');

          return cb();
        });
      }
    , function(cb){
        return Globals.model.create({'location': {'given_string': 'Eiffel Tower'}}, function(err, doc){
          test.ok(!err);

          test.ok(doc.get('location.normalized_string') === 'Eiffel Tower, Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France');
          test.ok(doc.get('location.geo.coordinates').length === 2);
          test.ok(doc.get('location.address.city') === 'Paris');
          test.ok(doc.get('location.address.point_of_interest') === 'Eiffel Tower');

          return cb();
        });
      }
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
        test.ok(doc.get('location.1.normalized_string') === 'Eiffel Tower, Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France');
        test.ok(doc.get('location.1.geo.coordinates').length === 2);
        test.ok(doc.get('location.1.address.city') === 'Paris');
        test.ok(doc.get('location.1.address.point_of_interest') === 'Eiffel Tower');
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
        Globals.path = Path.join(OS.tmpdir(), '/' + Belt.uuid());
        return Globals.model.create({image: {file_path: Globals.path}}
               , Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        test.ok(Globals.doc.get('image.file_path') === Globals.path);
        test.ok(Globals.doc.get('image.stat.path') === Globals.path);
        return FSTK.exists(Globals.doc.get('image.file_path'), function(exists){
          test.ok(exists);
          return cb();
        });
      }
    , function(cb){
        return Globals.doc.remove(Belt.cw(function(err){ return setTimeout(cb, 3000); }, 0));
      }
    , function(cb){
        return FSTK.exists(Globals.path, function(exists){
          test.ok(!exists);
          return cb();
        });
      }
    , function(cb){
        Globals.path = Path.join(OS.tmpdir(), '/' + Belt.uuid());
        return Globals.model.create({image: {file_path: Globals.path}}
               , Belt.cs(cb, Globals, 'doc', 1, 0));
      }
    , function(cb){
        return Globals.doc.watch_file('image', Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(Globals.doc.get('image').__watcher);
        Globals.stat = Belt.deepCopy(Globals.doc.get('image.stat'));
        test.ok(Belt.deepEqual(Globals.stat, Globals.doc.get('image.stat')));

        return Globals.doc.get('image').__watcher.set('this is a test file', Belt.cw(cb, 0));
      }
    , function(cb){
        test.ok(!Belt.deepEqual(Globals.stat, Globals.doc.get('image.stat')));
        return cb();
      }
    , function(cb){
        Globals.stat = Belt.deepCopy(Globals.doc.get('image.stat'));
        test.ok(Belt.deepEqual(Globals.stat, Globals.doc.get('image.stat')));

        return FSTK.writeFile(Globals.doc.get('image.file_path'), 'changing the file', function(err){
          return setTimeout(function(){ return cb(err); }, 3000);
        });
      }
    , function(cb){
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
        Globals.path = Path.join(OS.tmpdir(), '/' + Belt.uuid());
        return Globals.doc.set_file('image', Globals.path, Belt.cw(cb, 0));
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
        var index = 0;
        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          return Globals.doc.watch_file('images.' + (index - 1), Belt.cw(cb, 0));
        }, Belt.cw(cb, 0));
      }
    , function(cb){
        var index = 0;
        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          test.ok(Globals.doc.get('images.' + (index -1)).__watcher);
          Globals.stat = Belt.deepCopy(Globals.doc.get('images.' + (index - 1) + '.stat'));
          test.ok(Globals.stat);
          test.ok(Belt.deepEqual(Globals.stat, Globals.doc.get('images.' + (index - 1) + '.stat')));
          return Globals.doc.get('images.' + (index - 1)).__watcher.set('this is a test file', function(err){
            test.ok(!err);
            test.ok(!Belt.deepEqual(Globals.stat, Globals.doc.get('images.' + (index - 1) + '.stat')));
            return cb();
          });
        }, Belt.cw(cb, 0));
      }
    , function(cb){
        var index = 0;
        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          Globals.stat = Belt.deepCopy(Globals.doc.get('images.' + (index - 1) + '.stat'));
          test.ok(Belt.deepEqual(Globals.stat, Globals.doc.get('images.' + (index - 1) + '.stat')));

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
        var index = 0;
        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          Globals.paths[index - 1] = Path.join(OS.tmpdir(), '/' + Belt.uuid());
          Globals.doc.set_file('images.' + (index - 1), Globals.paths[index - 1], function(err){
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
        return Globals.doc.remove(Belt.cw(function(err){ return setTimeout(cb, 3000); }, 0));
      }
    , function(cb){
        var index = 0;
        return Async.eachSeries(Globals.paths, function(p, _cb){
          index++;
          return FSTK.exists(Globals.doc.get('images.' + (index - 1) + '.file_path'), function(exists){
            test.ok(!exists);
            return _cb();
          });
        }, Belt.cw(cb, 0));
      }
    , function(cb){
        return Solrdex.delete('*', Belt.cw(cb, 0));
      }
    , function(cb){
        Globals.schema18 = new Mongoose.Schema({'description': String});
        Globals.schema18.plugin(Mongoo.plugins.solr, {'path': 'description'});
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
        return Globals.model.solrSearch('worst times', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_a.get('_id')));
        return cb();
      }
    , function(cb){
        return Globals.model.solrSearch('wurst bezt slings', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_a.get('_id')));
        test.ok(Belt.deepEqual(Globals.results[1]._id,Globals.doc_c.get('_id')));
        return cb();
      }
    , function(cb){
        Globals.schema19 = new Mongoose.Schema({'description': String});
        Globals.schema19.plugin(Mongoo.plugins.solr, {'path': 'description'});
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
        return Globals.modelb.solrSearch('worst times', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_1.get('_id')));
        test.ok(Globals.results.length === 1);
        return cb();
      }
    , function(cb){
        return Globals.modelb.solrSearch('wurst bezt slings', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_1.get('_id')));
        test.ok(Belt.deepEqual(Globals.results[1]._id,Globals.doc_3.get('_id')));
        test.ok(Globals.results.length === 2);
        return cb();
      }
    , function(cb){
        return Globals.model.solrSearch('worst times', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_a.get('_id')));
        test.ok(Globals.results.length === 1);
        return cb();
      }
    , function(cb){
        return Globals.model.solrSearch('wurst bezt slings', Belt.cs(cb, Globals, 'results', 1, 0));
      }
    , function(cb){
        test.ok(Belt.deepEqual(Globals.results[0]._id,Globals.doc_a.get('_id')));
        test.ok(Belt.deepEqual(Globals.results[1]._id,Globals.doc_c.get('_id')));
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
        return Solrdex.getById(Globals.doc_a.get('_id'), Belt.cs(cb, Globals, 'solrdoc', 1, 0));
      }
    , function(cb){
        test.ok(!_.any(Belt.deepEqual(Globals.solrdoc)));
        return cb();
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

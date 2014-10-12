/*
  Add a path that represents a location - address and geojson
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore')
  , Async = require('async')
  , Mongoose = require('mongoose')
  , Pa1d = require('pa1d');

module.exports['account'] = function(schema, options){
  var a = Belt.argulint(arguments, {
                         'validators': {
                            'options': [
                              {
                                'validator': function(){
                                   return this.path;
                                 }
                              , 'error': new Error('path is required')
                              }
                             ]
                          }
                       , 'options': options || {}
                       });

  a.o = _.defaults(a.o, {
    'path': false
  , 'schema': {
      'type': {type: String, enum: ['braintree', 'paypal', 'stripe', 'coinbase'], default: 'braintree'}
    , 'token': {type: String}
    , 'account': {type: Mongoose.Schema.Types.Mixed}
    }
  , 'paid_api': new Pa1d(a.o)
  , 'token_path': 'id'
  , 'payment_method_path': 'creditCards'
  , 'auto_create': true
  , 'auto_get': false
  , 'auto_update': false
  , 'auto_remove': true
  });

  var def = [a.o.schema];

  schema.add(_.object([a.o.path], def));

  //create a customer for the given account
  schema.method('create_customer', function(account, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {
    
    });
    var ac = account && !_.isFunction(account) ? account : self.get(a.o.path + '.account');
    var gb = {};
    return Async.waterfall([
      function(cb){
        return a.o.paid_api.create_customer(ac, Belt.cs(cb, gb, 'account', 1, 0));
      }
    , function(cb){
        self.set(a.o.path + '.account', gb.account);
        self.set(a.o.path + '.token', Belt._get(gb.account, a.o.token_path));
        return cb();
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err, gb.account);
    });
  });

  //get customer for the given account
  schema.method('get_customer', function(token, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {
    
    });
    var ac = token && !_.isFunction(token) ? token : this.get(a.o.path + '.token');
    var gb = {};
    return Async.waterfall([
      function(cb){
        return a.o.paid_api.get_customer(ac, Belt.cs(cb, gb, 'account', 1, 0));
      }
    , function(cb){
        self.set(a.o.path + '.account', gb.account);
        return cb();
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err, gb.account);
    });
  });

  //update customer for the given account
  schema.method('update_customer', function(account, token, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {
    
    });
    var tok = token && !_.isFunction(token) ? token : this.get(a.o.path + '.token')
      , ac = account && !_.isFunction(account) ? account : this.get(a.o.path + '.account');

    var gb = {};
    return Async.waterfall([
      function(cb){
        return a.o.paid_api.update_customer(tok, ac, Belt.cs(cb, gb, 'account', 1, 0));
      }
    , function(cb){
        self.set(a.o.path + '.account', gb.account);
        return cb();
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err, gb.account);
    });
  });

  //delete customer for the given account
  schema.method('delete_customer', function(token, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {
    
    });
    var tok = token && !_.isFunction(token) ? token : this.get(a.o.path + '.token');

    var gb = {};
    return Async.waterfall([
      function(cb){
        return a.o.paid_api.delete_customer(tok, Belt.cw(cb, 0));
      }
    , function(cb){
        self.set(a.o.path + '.account', undefined);
        return cb();
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err);
    });
  });

  //add payment method
  schema.method('add_payment_method', function(method, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {

    });

    var gb = {};
    return Async.waterfall([
      function(cb){
        return a.o.paid_api.create_payment_method(Belt.extend({'customerId': self.get(a.o.path + '.token')}
                                                 , method), Belt.cw(cb, 0));
      }
    , function(cb){
        return self.get_customer(Belt.cw(cb, 0));
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err);
    });
  });

  //delete payment method
  schema.method('delete_payment_method', function(token, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {

    });

    var gb = {};
    return Async.waterfall([
      function(cb){
        return a.o.paid_api.delete_payment_method(token, Belt.cw(cb, 0));
      }
    , function(cb){
        return self.get_customer(Belt.cw(cb, 0));
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err);
    });
  });

  if (a.o.auto_create) schema.pre('save', function(next){
    if (!this.isNew || !this.isModified(a.o.path)) return next();

    return this.create_customer(next);
  });

  if (a.o.auto_get) schema.pre('save', function(next){
    if (!this.isModified(a.o.path)) return next();

    return this.get_customer(next);
  });

  if (a.o.auto_update) schema.pre('save', function(next){
    if (this.isNew || !this.isModified(a.o.path)) return next();

    return this.update_customer(next);
  });

  if (a.o.auto_remove) schema.post('remove', function(){
    return this.delete_customer();
  });

  return schema;
};

module.exports['sale'] = function(schema, options){
  var a = Belt.argulint(arguments, {
                         'validators': {
                            'options': [
                              {
                                'validator': function(){
                                   return this.path;
                                 }
                              , 'error': new Error('path is required')
                              }
                             ]
                          }
                       , 'options': options || {}
                       });

  a.o = _.defaults(a.o, {
    'path': false
  , 'paid_api': new Pa1d(a.o)
  , 'token_path': 'id'
  });

  var def = [a.o.schema];

  schema.add(_.object([a.o.path], def));

  //create sale
  schema.method('create_sale', function(sale, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {
      'customer': false
    , 'payment_account_path': 'payment_account'
    , 'customer_token_path': 'customer.id'
    });
    var gb = {};
    sale = sale && !_.isFunction(sale) ? sale : self.get(a.o.path);

    return Async.waterfall([
      function(cb){
        if (b.o.customer) sale = Belt.extend({}, sale, {'options': {'storeInVault': true}});
        return Pa1d.create_sale(sale, Belt.cs(cb, gb, 'sale', 1, 0));
      }
    , function(cb){
        if (!b.o.customer) return cb();

        //create customer payment account
        b.o.customer.get_customer(Belt._get(gb.sale, b.o.customer_token_path), Belt.cw(cb, 0));
      }
    , function(cb){
        self.set(a.o.path, gb.sale);
        return cb();
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err, gb.sale);
    });
  });

  //get sale
  schema.method('get_sale', function(token, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {
      'no_save_customer': true
    });
    var ac = token && !_.isFunction(token) ? token : this.get(a.o.path + '.' + a.o.token_path);
    var gb = {};
    return Async.waterfall([
      function(cb){
        return a.o.paid_api.get_sale(ac, Belt.cs(cb, gb, 'sale', 1, 0));
      }
    , function(cb){
        self.set(a.o.path, gb.sale);
        return cb();
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err, gb.sale);
    });
  });

  //delete sale
  schema.method('delete_sale', function(token, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {
    
    });

    var tok = token && !_.isFunction(token) ? token : this.get(a.o.path + '.' + a.o.token_path);

    var gb = {};
    return Async.waterfall([
      function(cb){
        return a.o.paid_api.delete_sale(tok, b.o, Belt.cw(cb, 0));
      }
    , function(cb){
        self.set(a.o.path, undefined);
        return cb();
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err);
    });
  });

  if (a.o.auto_create) schema.pre('save', function(next){
    if (!this.isNew || !this.isModified(a.o.path)) return next();

    return this.create_sale(next);
  });

  //create a new sale record (and a new customer optionally)
  schema.static('create_sale', function(sale, options, callback){
    var b = Belt.argulint(arguments)
      , self = this;
    b.o = _.defaults(b.o, {
      'customer_model': false
    });
    var gb = {};
    return Async.waterfall([
      function(cb){
        gb.sale = self.new({});
        if (b.o.customer_model) b.o.customer = b.o.customer_model.new({});
        return cb();
      }
    , function(cb){
        return gb.sale.create_sale(sale, b.o, Belt.cw(cb, 0));
      }
    , function(cb){
        return gb.sale.save(Belt.cs(cb, gb, 'sale', 1, 0));
      }
    , function(cb){
        if (!b.o.customer || b.o.no_save_customer) return cb();

        return b.o.customer.save(Belt.cs(cb, b.o, 'customer', 1, 0));
      }
    ], function(err){
      if (err) console.error(err);
      return b.cb(err, gb.sale, b.o.customer);
    });
  });

  return schema;
};

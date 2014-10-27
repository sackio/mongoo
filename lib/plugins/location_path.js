/*
  Add a path that represents a location - address and geojson
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore')
  , Async = require('async')
  , Locup = require('locup');

module.exports = function(schema, options){
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
      'given_string': {type: String}
    , 'normalized_string': {type: String}
    , 'address': {type: Object}
    , 'geo': {
        'type': {type: String, default: 'Point'}
      , 'coordinates': {type: Array}
      }
    }
  , 'array': false
  , 'geocoder_api': new Locup(a.o)
  , 'auto_geocode': true
  , 'virtual_prefix': '__'
  });

  var def = [a.o.schema];
  if (a.o.array) def = [def];

  schema.add(_.object([a.o.path], def));
  schema.index(_.object([a.o.path + '.geo'], ['2dsphere']));

  var vp = schema.virtual(a.o.path + '_no_geocode');
  vp.get(function(){
    return this[a.o.virtual_prefix + a.o.path + '_no_geocode'];
  });
  vp.set(function(val){
    return this[a.o.virtual_prefix + a.o.path + '_no_geocode'] = val;
  });

  //Attempt to produce a normalized address based on the address components present
  schema.method('normalize_address', function(path){
    if (_.isArray(this.get(path))){
      var addrs = []
        , self = this;
      _.each(this.get(path), function(p, i){
        return addrs.push(_.compact([self.get(path + '.' + i + '.address.street_number')
        , self.get(path + '.' + i + '.address.route'), self.get(path + '.' + i + '.address.city'), self.get(path + '.' + i + '.address.state')
        , self.get(path + '.' + i + '.address.country'), self.get(path + '.' + i + '.address.zip')]).join(', '));
      });
      return addrs;
    }

    return _.compact([this.get(path + '.address.street_number'), this.get(path + '.address.route')
    , this.get(path + '.address.city'), this.get(path + '.address.state'), this.get(path + '.address.country'), this.get(path + '.address.zip')]).join(', ');
  });

  if (a.o.geocoder_api){
    //Use the given string to geocode the address, setting coordinates, formatted address, and address components
    schema.method('geocode', function(path, options, callback){
      var self = this
        , b = Belt.argulint(arguments);

      b.o = _.defaults(b.o, {
        'address_string': 'given_string'
      , 'reverse_geocode': false
      });

      if (_.isArray(this.get(path))){
        var geos = []
          , index = 0;

        return Async.eachSeries(this.get(path), function(l, cb){
          index++;

          var args = b.o.reverse_geocode ? [self.get(path + '.' + (index - 1) + '.geo.coordinates.1'), self.get(path + '.' + (index - 1) + '.geo.coordinates.0')] 
                                         : [self.get(path + '.' + (index - 1) + '.' + b.o.address_string)];
          return a.o.geocoder_api[b.o.reverse_geocode ? 'reverse_geocode' : 'geocode'].apply(null, args.concat([function(err, geocoding){
            if (err) return cb(new Error('Error geocoding location: [' + args.join(', ') + '] - ' + err.message));

            geocoding = _.isArray(geocoding) ? geocoding[0] : geocoding;

            //set coordinates
            self.set(path + '.' + (index - 1) + '.geo.coordinates', [Belt._get(geocoding, 'geometry.location.lng'), Belt._get(geocoding, 'geometry.location.lat')]);

            //set normalized_address
            self.set(path + '.' + (index - 1) + '.normalized_string', Belt._get(geocoding, 'formatted_address'));

            var components = a.o.geocoder_api.address_components_to_obj(Belt._get(geocoding, 'address_components')) || {};

            //set address components
            _.each(components, function(v, k){
              return self.set(path + '.' + (index - 1) + '.address.' + k, v);
            });

            self.set(path + '.' + (index - 1) + '.address.city', components.locality);
            self.set(path + '.' + (index - 1) + '.address.state', components.administrative_area_level_1);
            self.set(path + '.' + (index - 1) + '.address.zip', components.postal_code);

            geos.push(geocoding);

            return cb();
          }]));
        }, function(err){
          return b.cb(err, geos);
        });
      }

      var args = b.o.reverse_geocode ? [this.get(path + '.geo.coordinates.1'), this.get(path + '.geo.coordinates.0')] 
                                     : [this.get(path + '.' + b.o.address_string)];

      return a.o.geocoder_api[b.o.reverse_geocode ? 'reverse_geocode' : 'geocode'].apply(null, args.concat([function(err, geocoding){
        if (err) return b.cb(new Error('Error geocoding location: [' + args.join(', ') + '] - ' + err.message));

        geocoding = _.isArray(geocoding) ? geocoding[0] : geocoding;

        //set coordinates
        self.set(path + '.geo.coordinates', [Belt._get(geocoding, 'geometry.location.lng'), Belt._get(geocoding, 'geometry.location.lat')]);

        //set normalized_address
        self.set(path + '.normalized_string', Belt._get(geocoding, 'formatted_address'));
        var components = a.o.geocoder_api.address_components_to_obj(Belt._get(geocoding, 'address_components')) || {};

        //set address components
        _.each(components, function(v, k){
          return self.set(path + '.address.' + k, v);
        });

        self.set(path + '.address.city', components.locality);
        self.set(path + '.address.state', components.administrative_area_level_1);
        self.set(path + '.address.zip', components.postal_code);

        return b.cb(err, geocoding);
      }]));
    });

    //Use the given coordinates to look up an address
    schema.method('reverse_geocode', function(path, options, callback){
      var b = Belt.argulint(arguments);

      b.o = _.defaults(b.o, {
        'reverse_geocode': true
      });

      return this.geocode(path, b.o, b.cb);
    });

    if (a.o.auto_geocode) schema.pre('save', function(next){
      if (!this.isNew && !this.isModified(a.o.path) || this.get(a.o.path + '_no_geocode')) return next();

      if (!a.o.array){
        if ((this.isNew && _.any(this.get(a.o.path + '.geo.coordinates'))) || this.isModified(a.o.path + '.geo.coordinates')){
          return this.reverse_geocode(a.o.path, Belt.cw(next, 0));
        }
        if ((this.isNew && this.get(a.o.path + '.given_string')) || this.isModified(a.o.path + '.given_string')){
          return this.geocode(a.o.path, Belt.cw(next, 0));
        }
        return next();
      }

      var index = 0
        , self = this;

      return Async.eachSeries(self.get(a.o.path), function(p, cb){
        index++;

        if (!self.isNew && !self.isModified(a.o.path + '.' + (index - 1))) return cb();

        if ((self.isNew && _.any(self.get(a.o.path + '.' + (index -1) + '.geo.coordinates')))
           || self.isModified(a.o.path + '.' + (index -1) + '.geo.coordinates'))
          return self.reverse_geocode(a.o.path + '.' + (index -1), Belt.cw(cb, 0));
        if ((self.isNew && self.get(a.o.path + '.' + (index -1) + '.given_string'))
           || self.isModified(a.o.path + '.' + (index -1) + '.given_string'))
          return self.geocode(a.o.path + '.' + (index -1), Belt.cw(cb, 0));

        return cb();
      }, Belt.cw(next, 0));
    });
  }

  return schema;
};

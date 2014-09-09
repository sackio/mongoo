/*
  Add a path that represents a file
*/

'use strict';

var Belt = require('jsbelt')
  , _ = require('underscore');

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
      'file_path': {type: String, required: true}
    , 'stat': Object
    }
  , 'array': false
  , 'auto_stat': true
  , 'auto_remove': true
  , 'auto_touch': true
  });

  var def = [a.o.schema];
  if (a.o.array) def = [def];

  schema.add(_.object([a.o.path], def));
  schema.index(_.object([a.o.path + '.geo'], ['2dsphere']));

  var vp = schema.virtual(a.o.path + '_normalized_address');
  vp.get(function(){
    var cmp = [this.get('address1'), this.get('address2'), this.get('city')
              , this.get('state'), this.get('country'), this.get('zip')];

    return _.compact(cmp).join(', ');
  });

  if (a.o.geocoder_api){
    schema.method('geocode', function(path, callback){
      var self = this;
      return a.o.geocoder_api.get_coordinates(this.get(path + '_normalized_address'),
      function(err, coords){
        if (err) return callback(err);

        coords = _.isArray(coords) ? coords[0] : coords;
        self.set(path + '.geo', [coords[1], coords[0]]);

        return callback(err, coords);
      });
    });

    schema.method('reverse_geocode', function(path, callback){
      var self = this;
      return a.o.geocoder_api.get_address_components(this.get(path + '.geo.coordinates.1')
      , this.get(path + '.geo.coordinates.0'), function(err, components){
        if (err) return callback(err);

        components = _.isArray(components) ? components[0] : components;

        self.set(path + '.address.street_number', components.street_number);
        self.set(path + '.address.intersection', components.intersection);
        self.set(path + '.address.room', components.room);
        self.set(path + '.address.floor', components.floor);
        self.set(path + '.address.address1', components.street_address);
        self.set(path + '.address.neighborhood', components.neighborhood);
        self.set(path + '.address.city', components.locality);
        self.set(path + '.address.state', components.administrative_area_level_1);
        self.set(path + '.address.zip', components.postal_code);
        self.set(path + '.address.country', components.country);

        return callback(err, components);
      });
    });

    if (a.o.auto_address) schema.pre('save', function(next){
      if (!this.isModified(a.o.path + '.geo')) return next();

      return this.reverse_geocode(a.o.path, Belt.cw(next, 0));
    });

    if (a.o.auto_geocode) schema.pre('save', function(next){
      if (!this.isModified(a.o.path + '.address')) return next();

      return this.geocode(a.o.path, Belt.cw(next, 0));
    });
  }

  return schema;
};

var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var fetch = require('node-fetch');

var graphql = require('graphql');
var graphqlHTTP = require('express-graphql');

var OWNERS = "owners";
var PETS = "pets";

var app = express();
app.use(bodyParser.json());

//GraphQL
var petType = new graphql.GraphQLObjectType({
  name: 'Pet',
  description: '....',
  fields: {
    _id: { type: graphql.GraphQLString },
    name: { type: graphql.GraphQLString },
    type: { type: graphql.GraphQLString }
  }
});

var ownerType = new graphql.GraphQLObjectType({
  name: 'Owner',
  description: '....',
  fields: {
    _id: { type: graphql.GraphQLString },
    name: { type: graphql.GraphQLString },
    pet_id: { type: graphql.GraphQLString },
    pets: {
      type: new graphql.GraphQLList(petType),
      resolve: function (owner) {

        return fetch('http://localhost:3000/pets/'+ owner.pet_id)
                .then(function(res) {
                    return res.json();
                }).then(function(pets) {
                    return [pets];
                });

      }
    }
  }

});


var RootType = new graphql.GraphQLObjectType({
  name: 'Query',
  description: '....',

  fields: {
    owners: {
      type: new graphql.GraphQLList(ownerType),
      resolve: function () {

        return fetch('http://localhost:3000/owners/')
                .then(function(res) {
                    return res.json();
                }).then(function(owners) {
                    return owners;
                });

      }
    },
    pets: {
      type: new graphql.GraphQLList(petType),
      resolve: function () {

        return fetch('http://localhost:3000/pets/')
                .then(function(res) {
                    return res.json();
                }).then(function(pets) {
                    return pets;
                });

      }
    },
    owner: {
      type: ownerType,

      args: {
        id: { type: graphql.GraphQLString }
      },

      resolve: function (_, args) {

        return fetch('http://localhost:3000/owners/'+ args.id)
                .then(function(res) {
                    return res.json();
                }).then(function(owner) {
                    return owner;
                });

      }
    },
    pet: {
      type: new graphql.GraphQLList(petType),

      args: {
        type: { type: graphql.GraphQLString }
      },

      resolve: function (_, args) {

        return fetch('http://localhost:3000/pets/type/'+ args.type)
                .then(function(res) {
                    return res.json();
                }).then(function(pets) {
                    return pets;
                });

      }
    }
  }
});

var schema = new graphql.GraphQLSchema({
  query: RootType
});




app.use('/graphql', graphqlHTTP({ schema: schema, pretty: true, graphiql: true }));


var db;

mongodb.MongoClient.connect('mongodb://localhost:27017/pet-shop', function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(3000, function () {
    var port = server.address().port;
    console.log("pet-shop is now running on port", port);
  });
});

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}




/////////
//routes
////////

  //GET: finds all owners
  app.get("/owners", function(req, res) {
    console.log("GET /owners");

    db.collection(OWNERS).find({}).toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get owners.");
      } else {
        res.status(200).json(docs);
      }
    });
  });

  //POST: create new owners
  app.post("/owners", function(req, res) {
    console.log("POST /owners");
    var owner = req.body;

    if (!(req.body.name && req.body.pet_id)) {
      handleError(res, "Invalid user input", "Must provide a name and pet_id.", 400);
    }

    db.collection(OWNERS).insertOne(owner, function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to create new owner.");
      } else {
        res.status(201).json(doc.ops[0]);
      }
    });
  });

  // GET: find owrner by id
  app.get("/owners/:id", function(req, res) {
    console.log("GET /owners/",req.params.id);

    db.collection(OWNERS).findOne({ _id: req.params.id }, function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to get owner");
      } else {
        res.status(200).json(doc);
      }
    });
  });

  //PUT: update owner by id
  app.put("/owners/:id", function(req, res) {
    console.log("PUT /owners/",req.params.id);

    var updateDoc = req.body;
    console.log(req.body);


    db.collection(OWNERS).updateOne({_id: req.params.id }, updateDoc, function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to update owner");
      } else {
        res.status(204).end();
      }
    });
  });

  //DELETE: deletes owner by id
  app.delete("/owners/:id", function(req, res) {
    console.log("DELETE /owners/",req.params.id);

    db.collection(OWNERS).deleteOne({_id: req.params.id }, function(err, result) {
      if (err) {
        handleError(res, err.message, "Failed to delete owner");
      } else {
        res.status(204).end();
      }
    });
  });



  //GET: finds all pets
  app.get("/pets", function(req, res) {
    console.log("GET /pets");

    db.collection(PETS).find({}).toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get pets.");
      } else {
        res.status(200).json(docs);
      }
    });
  });

  //POST: create new pets
  app.post("/pets", function(req, res) {
    console.log("POST /pets");

    var pet = req.body;


    if (!(req.body.name || req.body.type)) {
      handleError(res, "Invalid user input", "Must provide a name or pets.", 400);
    }

    db.collection(PETS).insertOne(pet, function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to create new pet.");
      } else {
        res.status(201).json(doc.ops[0]);
      }
    });
  });

  // GET: find pet by id
  app.get("/pets/:id", function(req, res) {
    console.log("GET /pets/", req.params.id);

    db.collection(PETS).findOne({ _id: req.params.id }, function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to get pets");
      } else {
        res.status(200).json(doc);
      }
    });
  });

  // GET: find pets by type
  app.get("/pets/type/:type", function(req, res) {
    console.log("GET /pets/type/", req.params.type);

    db.collection(PETS).find({ type: req.params.type }).toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get pets by type.");
      } else {
        res.status(200).json(docs);
      }
    });
  });

  //PUT: update owner by id
  app.put("/pets/:id", function(req, res) {
    console.log("PUT /pets/", req.params.id);

    var pet = req.body;


    db.collection(PETS).updateOne({_id: req.params.id}, pet, function(err, doc) {
      if (err) {
        handleError(res, err.message, "Failed to update pet");
      } else {
        res.status(204).end();
      }
    });
  });

  //DELETE: deletes owner by id
  app.delete("/pets/:id", function(req, res) {
    console.log("DELETE /pets/", req.params.id);

    db.collection(PETS).deleteOne({_id: req.params.id}, function(err, result) {
      if (err) {
        handleError(res, err.message, "Failed to delete pet");
      } else {
        res.status(204).end();
      }
    });
  });

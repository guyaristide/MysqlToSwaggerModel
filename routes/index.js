var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var async = require('async');
var jsonfile = require('jsonfile')
var yaml = require('write-yaml');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: ""
});

/* GET home page. */
router.get('/', function (req, res, next) {

  //Connect to Mysql bd and get all tables
  buildData()


  res.render('index', {
    title: 'Express'
  });
});


/**
 * connecte to database and get all tables
 */
function buildData(){

  //Data base name
  var dataBase = 'crea911-light-v';


  sqlTables = `SELECT table_name, table_type, engine
  FROM information_schema.tables
  WHERE table_schema = '` + dataBase + `'`;

  con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
    //Récuperation des table de la bd
    con.query(sqlTables, function (err, result) {
      if (err) throw err;
      buildYamel(result);
    });
  });
}

/**
 * 
 * @param {Object[]} result --- item {table_name : String, table_type : String, engine : String}
 */
function buildYamel(result) {


  var tableauFinal = {};
  //
  async.forEachOf(result, function (element, i, inner_callback) {

    sql = `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = '` + element.table_name + `'`;

    //get table attributs
    con.query(sql, function (errSet, resultSet) {
      if (!errSet) {
        var object = new ObjetcSwagger(element.table_name, resultSet);
        console.log("Result: " + JSON.stringify(object));
        tableauFinal[element.table_name.substring(8)] = object;
        inner_callback(null);
      } else {
        console.log("Error while performing Query");
        inner_callback(err);
      };
    });
  }, function (err) {
    if (err) {
      //handle the error if the query throws an error
    } else {
      //whatever you wanna do after all the iterations are done
      var file = './generated/data.yml'

      yaml(file, tableauFinal, function(err) {
        // do stuff with err
        console.log(err) 
      });
    }
  });
}

function ObjetcSwagger(tableName, object) {
  this.type = "object";
  this.properties = {};

  object.forEach(element => {
    var item = {
      type: element.DATA_TYPE
    }
    if (element.DATA_TYPE === "tinyint") {
      item.type = "boolean"
    }
    if (element.DATA_TYPE === "varchar") {
      item.type = "string"
    }

    if (element.DATA_TYPE === "timestamp") {
      item.type = "string"
      item.format = "date-time"
    }

    if (element.DATA_TYPE === "int") {
      item.type = "integer"
    }

    if (element.COLUMN_DEFAULT !== "NULL") {
      item.default = element.COLUMN_DEFAULT
    }

    this.properties[element.COLUMN_NAME] = item
  })


  this.xml = {
    name: tableName.substring(8)
  }

}

module.exports = router;
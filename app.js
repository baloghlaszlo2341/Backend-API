require('dotenv').config();
const express = require('express');
var mysql = require('mysql');
const cors = require('cors');
const app = express();
const port = process.env.PORT;
const ShortCrypt = require('short-crypt');
// MIDDLEWARE FUNCION
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(express.json());

var pool  = mysql.createPool({
    connectionLimit : 10,
    host            : process.env.DBHOST,
    user            : process.env.DBUSER,
    password        : process.env.DBPASS,
    database        : process.env.DBNAME
  });
var secret = process.env.DBPASS;
var shortcrypt = new Shortcrypt(secret);
// ENDPOINTS

// logincheck
// A tábla az alábbi mezőket tartalmazza: ID, nev, zarodolgozatcim, rovidleiras, leadasidatum, konzulensnev, ertekeles
app.post('/logincheck', (req, res)=>{

  let table = 'ID';
  let field1 = 'nev';
  let field2 = 'zarodolgozatim';
  let field3 = 'rovidleiras';
  let field4 = 'leadasidatum';
  let field5 = 'konzulensev';
  let field6 = 'ertekeles';
  let value1 = req.body.email;
  let value2 = req.body.passwd;

  pool.query(`SELECT * FROM ${table} WHERE ${field1}='${value1}' AND ${field2}='${value2}'`, (err, results)=>{
    sendResults(table, err, results, req, res, 'logincheck from');
  });
});

app.get('/', function (req, res) {
  res.send('Node JS backend');
});

// GET all records
app.get('/:table', (req, res) => {
  let table = ShortCrypt.Decrypted(req.params.table);
    pool.query(`SELECT * FROM ${table}`, (err, results) => {
      sendResults(table, err, results, req, res, 'sent from');
    });
});

// GET one record by ID
app.get('/:table/:id', (req, res) => {
  let table = req.params.table;
  let id = req.params.id;
  
  pool.query(`SELECT * FROM ${table} WHERE ID=${id}`, (err, results) => {
    sendResults(table, err, results, req, res, 'sent from');
  });
});

// GET records by field  
app.get('/:table/:field/:op/:value', (req, res)=>{
  let table = req.params.table;
  let field = req.params.field;
  let value = req.params.value;
  let op = getOperator(req.params.op);
  
  if (op == ' like '){
    value = `%${value}%`;
  }

  pool.query(`SELECT * FROM ${table} WHERE ${field}${op}'${value}'`, (err, results)=>{
    sendResults(table, err, results, req, res, 'sent from');
  });
});

// POST new record to table
app.post('/:table', (req, res)=>{
  let table =  ShortCrypt.Encrypted(req.params.table);

  let valued = '"'+ Object.values(req.body).join('","') +'"';
  let values = ShortCrypt.Encrypted(valued);
  let fields = Object.keys(req.body).join(',');

  pool.query(`INSERT INTO ${table} (${fields}) VALUES(${values})`, (err, results)=>{
    sendResults(table, err, results, req, res, 'insert into');
  });
});

// PATCH record in table by field (update)
app.patch('/:table/:field/:op/:value', (req, res) => {
  let table = req.params.table;
  let field = req.params.field;
  let value = req.params.value;
  let op = getOperator(req.params.op);

  if (op == ' like '){
    value = `%${value}%`;
  }

  let values = Object.values(req.body);
  let fields = Object.keys(req.body);

  let sql = '';
  for(i=0; i< values.length; i++){
    sql += fields[i] + `='` + values[i] + `'`;
    if (i< values.length-1) {
      sql += ',';
    } 
  }

  pool.query(`UPDATE ${table} SET ${sql} WHERE ${field}${op}'${value}'`, (err, results)=>{
    sendResults(table, err, results, req, res, 'updated in');
  });

});

// DELETE one record by ID
app.delete('/:table/:id', (req, res) => {
  let table = req.params.table;
  let id = req.params.id;
  
  pool.query(`DELETE FROM ${table} WHERE ID=${id}`, (err, results) => {
    sendResults(table, err, results, req, res, 'sent from');
  });
});

// DELETE record from table by field
app.delete('/:table/:field/:op/:value', (req, res) => {
  let table = req.params.table;
  let field = req.params.field;
  let value = req.params.value;
  let op = getOperator(req.params.op);

  if (op == ' like '){
    value = `%${value}%`;
  }

  pool.query(`DELETE FROM ${table} WHERE ${field}${op}'${value}'`, (err, results) => {
    sendResults(table, err, results, req, res, 'deleted from');
  }); 
});

// DELETE all records from table
app.delete('/:table', (req, res) => {
  let table = req.params.table;
  pool.query(`DELETE FROM ${table}`, (err, results) => {
    sendResults(table, err, results, req, res, 'deleted from');
  }); 
});

// send results to the client
function sendResults(table, err, results, req, res, msg){
  if (err){
    console.log(req.socket.remoteAddress + ' >> ' + err.sqlMessage);
    res.status(500).send(err.sqlMessage);
  }else{
    console.log(req.socket.remoteAddress + ' >> ' +results.length + ` record(s) ${msg} ${table} table.`);
    res.status(200).send(results);
  }
}

// change operator value
function getOperator(op){
  switch(op){
    case 'eq': {op = '='; break}
    case 'lt': {op = '<'; break}
    case 'gt': {op = '>'; break}
    case 'lte': {op = '<='; break}
    case 'gte': {op = '>='; break}
    case 'not': {op = '!='; break}
    case 'lk': {op = ' like '; break}
  }
  return op;
}

app.listen(port, () => {
    console.log(`Server listening on port ${port}...`);
});

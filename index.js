const express = require('express');
const app = express();
const PORT = process.env.port || 8000;
const mysql      = require('mysql');
const {DB_INFO} = require("./config/conn_config");

const connection = mysql.createConnection(DB_INFO);

connection.connect();

connection.query('show tables', (error, rows, fields) => {
    if (error) throw error;
    console.log(rows);
});

connection.end();

app.listen(PORT, ()=>{
    console.log(`running on port ${PORT}`);
});
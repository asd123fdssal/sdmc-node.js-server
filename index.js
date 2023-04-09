const express = require('express');
const app = express();
const PORT = process.env.port || 8000;
const mysql      = require('mysql');
const {DB_INFO} = require("./config/conn_config");
const {get_game_title} = require('./config/sql_query')

const connection = mysql.createConnection(DB_INFO);

connection.connect();

app.get('/games', function(req, res){
    connection.query(get_game_title(1), (error, rows) => {
        res.send(rows);
    })
});

app.get('/games/:index', function(req, res){
    connection.query(get_game_title(req.params.index), function(error, rows){
        res.send(rows);
    })
});

app.listen(PORT, ()=>{
    console.log(`running on port ${PORT}`);
});
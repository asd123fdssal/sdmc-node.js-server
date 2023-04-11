const express = require('express');
const app = express();
const PORT = process.env.port || 8000;
const mysql      = require('mysql');
const {DB_INFO, SESSION_SECRET, SESSION_KEY} = require("./config/conn_config");
const {get_game_title, get_login_result} = require('./config/sql_query');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);


// DB 커넥션
const pool = mysql.createPool(DB_INFO);

// DB 정보로 세션 등록
const sessionStore = new MySQLStore(DB_INFO, pool);
app.use(session({
    key: SESSION_KEY,
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie:{
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 6 * 3,
        expire: new Date(Date.now() + 24 * 60 * 60 * 1000 * 3)
    }
}));
app.use(cookieParser());
app.use(express.json());
app.use(cors());

setInterval(function () {
    pool.query('SELECT 1');
}, 5000);

app.get('/games', function(req, res){
    pool.query(get_game_title(1), (error, rows) => {
        res.send({
            games : rows,
        });
    })
});

app.get('/games/:index', function(req, res){
    pool.query(get_game_title(req.params.index), function(error, rows){
        res.send({
            games : rows,
        });
    })
});

app.post('/login', function (req, res){
    console.log(req.body)
    pool.query(get_login_result(req.body.username, req.body.password), function (error, rows){
        // 로그인 성공 시 세션 등록
        if (rows[0] !== undefined){
            req.session.uid = rows[0].uid;
            req.session.save();
            res.status(200).send({

            });
            //console.log(req.session);
        }else{
            // 결과 전달
            res.send({
                loginResult : (rows[0] !== undefined)
            });
        }
    })
});

app.get('/login', function(req, res){
    if(req.session.uid !== undefined) return res.redirect("/");
    // if(req.session.uid !==undefined){
    //     console.log('로그인된');
    // }
    res.send({

    });
});

app.get('/', function (req, res){
    res.status(200).json({
        status:'success',
        data:req.body
    });
})

app.listen(PORT, ()=>{
    console.log(`running on port ${PORT}`);
});
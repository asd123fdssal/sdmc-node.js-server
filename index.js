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
//app.use(cors());

// 로컬 개발 환경에서 cors 에러를 피하기 위한 코드
const whitelist = ["http://localhost:3000"];

const corsOptions = {
    credentials : true,
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1) { // 만일 whitelist 배열에 origin인자가 있을 경우
            callback(null, true); // cors 허용
        } else {
            callback(new Error("Not Allowed Origin!")); // cors 비허용
        }
    },
};

app.use(cors(corsOptions)); // 옵션을 추가한 CORS 미들웨어 추가

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
    // console.log(req.body)
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
    res.status(200).send({
        loginResult: (req.session.uid !==undefined)
    });
});

app.get('/', function (req, res){
    res.status(200).json({
        status:'success',
        data:req.body
    });
});

app.get('/logout', function (req, res){
    if(req.session.uid !== undefined){
        req.session.destroy(req.session);
    }

    res.status(200).send({

    })
})

app.listen(PORT, ()=>{
    console.log(`running on port ${PORT}`);
});
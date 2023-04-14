const express = require('express');
const app = express();
const PORT = process.env.port || 8000;
const mysql      = require('mysql');
const {DB_INFO, SESSION_SECRET, SESSION_KEY} = require("./config/conn_config");
const {get_game_title, get_login_result, sign_up_member, isDuplicateUsername, isDuplicateNickname, isDuplicateEmail} = require('./config/sql_query');
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
        maxAge: 1000 * 60 * 60 * 3,
        expire: new Date(Date.now() + 60 * 60 * 1000 * 3)
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
    pool.query(get_login_result(req.body.username, req.body.password), function (error, rows){
        // 로그인 성공 시 세션 등록
        if (rows !== undefined){
            req.session.uid = rows[0].uid;
            req.session.save();
            res.status(200).send({

            });
        }else{
            res.status(401).send({
                message: '아이디 또는 패스워드가 일치하지 않습니다.'
            });
        }
    })
});

app.get('/login', function(req, res){
    res.status((req.session.uid !== undefined)? 200 : 401).send({

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
        delete req.session.uid;
        req.session.save();
    };

    res.status(200).send({
        loginResult: (req.session.uid !== undefined)
    });
});

app.get('/auth', function (req, res){
    res.status(200).send({
        loginResult: (req.session.uid !== undefined)
    });
});

app.get('/signup', function(req, res){
    res.status(200).send({

    });
});

function duplication_check(item, value){
    return new Promise((resolve, reject) => {
        if(item === 'username'){
            pool.query(isDuplicateUsername(value), (err, rows) => {
                resolve(rows.length !== 0);
            })
        }else if(item==='nickname'){
            pool.query(isDuplicateNickname(value), (err, rows) => {
                resolve(rows.length !== 0);
            })
        }else if(item === 'email') {
            pool.query(isDuplicateEmail(value), (err, rows) => {
                resolve(rows.length !== 0)
            })
        }
    })
}

app.post('/signup', function (req, res){
    /*
    * Promise.all([checkDuplicateId(id), checkDuplicateEmail(email)])
  .then(([isDuplicateId, isDuplicateEmail]) => {
    if (isDuplicateId) {
      console.log('중복된 아이디입니다.');
    } else {
      console.log('사용 가능한 아이디입니다.');
    }
    if (isDuplicateEmail) {
      console.log('중복된 이메일입니다.');
    } else {
      console.log('사용 가능한 이메일입니다.');
    }
    connection.end(); // 연결 종료
  })
  .catch((error) => {
    console.error(error);
    connection.end(); // 연결 종료
  });
    * */

    const {username, password, email, nickname} = req.body;

    Promise.all([
        duplication_check('username', username),
        duplication_check('email', email),
        duplication_check('nickname', nickname)
    ]).then(
            (isDuplicate) => {
        let errorMessage = '';
        
        if (isDuplicate[0]){
            errorMessage = '이미 존재하는 아이디 입니다.';
        }else if(isDuplicate[1]){
            errorMessage = '이미 존재하는 이메일 입니다.';
        }else if(isDuplicate[2]){
            errorMessage = '이미 존재하는 닉네임 입니다.';
        }

        if(!isDuplicate[0] && !isDuplicate[1] && !isDuplicate[2]){
            pool.query(sign_up_member(username, password, email, nickname), (err, rows) => {
                if(err){
                    console.log(err)
                }
            });

            res.status(200).send({

            });
        }else{
            res.status(409).send({
                message: errorMessage
            });
        };
    })
})

app.listen(PORT, ()=>{
    console.log(`running on port ${PORT}`);
});
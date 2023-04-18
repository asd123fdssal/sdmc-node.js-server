const express = require('express');
const app = express();
const PORT = process.env.port || 8080;
const mysql      = require('mysql');
const {DB_INFO, SESSION_SECRET, SESSION_KEY} = require("./config/conn_config");
const {get_game_title, get_login_result, sign_up_member, isDuplicateUsername, isDuplicateNickname, isDuplicateEmail,
    isDuplicateGame, uploadGame, isDupKorCompany, isDupOrgCompany, isDupOrgGameCompany, isDupKorGameCompany,
    insertNewGameCompany, selectAllGameCompany, selectAllGameSeries, isDupKorGameSeries, insertNewGameSeries,
    selectAllGameGenre, isDupGameGenreName, insertNewGameGenre, selectAllGameShop, isDupGameShopName, insertNewGameShop,
    insertGameGenre, insertGameShop
} = require('./config/sql_query');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const multer = require('multer');
const upload = multer({
   storage: multer.diskStorage({
       destination: function (req, file, cb){
           cb(null, "uploads/");
       },
       filename: function (req, file, cb){
           cb(null, file.originalname);
       }
   })
});

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
app.use(express.static("uploads"));
//app.use(cors());

// 로컬 개발 환경에서 cors 에러를 피하기 위한 코드
const whitelist = ["http://localhost:3000"];

const corsOptions = {
    credentials : true,
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1 || origin === undefined) { // 만일 whitelist 배열에 origin인자가 있을 경우
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
        if(error){
            console.log(error);
        }
        res.send({
            games: rows
        });
    })
});

app.get('/games/:index', function(req, res){
    pool.query(get_game_title(req.params.index), function(error, rows){
        if(error){
            console.log(error);
        }
        res.send({
            games: rows
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

app.post("/images", upload.single("image"), (req, res) => {
    const file = req.file;
    res.send({
       imageUrl: file.filename
    });
});

function user_duplication_check(item, value){
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
    const {username, password, email, nickname} = req.body;

    Promise.all([
        user_duplication_check('username', username),
        user_duplication_check('email', email),
        user_duplication_check('nickname', nickname)
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

function game_validation(item, value){
    return new Promise(resolve => {
        if (item === "kor_name"){
            resolve(value ===undefined || value === '');
        }else if(item === "release_date"){
            resolve(value === undefined || value === '');
        }
    });
}

function get_sql_valid_data(sql, value){
    return new Promise((resolve, reject) => {
        pool.query(sql, value, (err, rows) => {
            if (err) {
                reject(err);
            }else{
                if(rows.length > 0){
                    reject(new Error("이미 존재하는 값입니다."));
                }else{
                    resolve(true);
                }
            }
        });
    });
}

function insert_sql_data(sql, value) {
    return new Promise((resolve, reject) => {
        pool.query(sql, value, (err, rows) => {
            if (err) {
                reject(err);
            }else{
                resolve(true);
            }
        });
    });
}

app.post('/games/upload', async (req, res) => {
    let nicknames = '';
    let {company, series, imageUrl, release_date, org_name, kor_name, synopsis, hookcode, etc, nickname, genre, shop} = req.body;

    const valid1 = await game_validation('kor_name', kor_name);
    const valid2 = await game_validation('release_date', release_date);

    let errorMessage = '';

    if (valid1){
        errorMessage = '게임 이름(한글)을 입력해주세요.';
    }else if(valid2){
        errorMessage = '발매일을 입력해주세요.';
    }
    if(!valid1 && !valid2){
        const valid3 = await get_sql_valid_data(isDuplicateGame(), [kor_name, release_date]);

        if(!valid3){
            errorMessage = '이미 존재하는 게임 입니다.';
            res.status(409).send({
                                     message: errorMessage
                                 });
        }else{
            // 이미지가 없으면 기본 이미지로 대체한다.
            if (imageUrl === null)
                imageUrl = "default_image.png";

            // 줄임말을 콤마로 변환한다.
            for (let i = 0; i < nickname.length; i++) {
                nicknames += nickname[i].text;
                if(i + 1 !== nickname.length)
                    nicknames += ',';
            }
            let values = [company, series, imageUrl, release_date, org_name, kor_name, synopsis, hookcode, etc, nicknames];

            const valid4 = await insert_sql_data(uploadGame(), [company, series, imageUrl, release_date, org_name, kor_name, synopsis, hookcode, etc, nicknames]);
            let valid5 = true;
            if(valid4){
                for (let i = 0; i < genre.length; i++) {
                    valid5 = valid5 && await insert_sql_data(insertGameGenre(), [kor_name, genre[i].value])
                }
                valid5 = valid5 && await insert_sql_data(insertGameShop(), [shop, req.session.uid, kor_name]);

                if(valid5){
                    res.status(200).send({
                                             message : "추가가 완료되었습니다."
                                         });
                }else{
                    res.status(409).send({
                                             message : "알 수 없는 에러가 발생했습니다."
                                         });
                }
            }
        }
    }else{
        res.status(403).send({
                                 message: errorMessage
                             });
    }
});

function game_comp_kor_dup_chk(value){
    return new Promise((resolve, reject) => {
        const {kor_name} = value;

        if(kor_name === undefined || kor_name === ""){
            reject(new Error("제작사(한글)를 입력해주세요."));
        }else if(kor_name !== undefined && kor_name !== "") {
            pool.query(isDupKorGameCompany(), kor_name, (err, rows) => {
                if(err){
                    console.log(err);
                }

                if(rows.length !== 0){
                    reject(new Error("중복된 제작사(한글)가 존재합니다."))
                } else{
                    resolve(true);
                }
            })
        }
    })
}

app.post("/company/upload", (req, res) => {
    Promise.all(
        [game_comp_kor_dup_chk(req.body)]
    ).then((isDuplicate) => {
        if(isDuplicate[0]){
            const {kor_name, org_name} = req.body;
            pool.query(insertNewGameCompany(), [org_name, kor_name], (err, rows) => {
                if (err) {
                    console.error(err);
                }else{
                    res.status(200).send({
                        message: "회사 추가 성공~"
                    });
                }
            })
        }
    }).catch((err) => {
        res.status(403).send({
            message : err.message
        });
    });
});

app.get("/api/company/all", (req, res) => {
    pool.query(selectAllGameCompany(), (err, rows) => {
        if(err){
            console.log(err)
        }
        res.status(200).send(rows);
    });
})

app.get("/api/series/all", (req, res)=> {
    pool.query(selectAllGameSeries(), (err, rows) => {
        if(err){
            console.log(err)
        }
        res.status(200).send(rows);
    });
})

function game_seri_dup_chk(value){
    return new Promise((resolve, reject) => {
        const {kor_name} = value;

        if(kor_name === undefined || kor_name === ""){
            reject(new Error("시리즈를 입력해주세요."));
        }else if(kor_name !== undefined && kor_name !== "") {
            pool.query(isDupKorGameSeries(), kor_name, (err, rows) => {
                if(err){
                    console.log(err);
                }

                if(rows.length !== 0){
                    reject(new Error("중복된 시리즈가 존재합니다."))
                } else{
                    resolve(true);
                }
            })
        }
    })
}

app.post("/series/upload", (req, res) => {
    Promise.all(
        [game_seri_dup_chk(req.body)]
    ).then((isDuplicate) => {
        if(isDuplicate[0]){
            const {kor_name, nickname} = req.body;
            let nicknames = '';
            for (let i = 0; i < nickname.length; i++) {
                nicknames += nickname[i].text;
                if(i + 1 < nickname.length)
                    nicknames += ',';
            }
            
            pool.query(insertNewGameSeries(), [kor_name, nicknames], (err, rows) => {
                if (err) {
                    console.error(err);
                }else{
                    res.status(200).send({
                                             message: "시리즈 추가 성공~"
                    });
                }
            })
        }
    }).catch((err) => {
        res.status(403).send({
                                 message : err.message
        });
    });
});

function game_genre_dup_chk(value){
    return new Promise((resolve, reject) => {
        const {kor_name} = value;

        if(kor_name === undefined || kor_name === ""){
            reject(new Error("장르명을 입력해주세요."));
        }else if(kor_name !== undefined && kor_name !== "") {
            pool.query(isDupGameGenreName(), kor_name, (err, rows) => {
                if(err){
                    console.log(err);
                }

                if(rows.length !== 0){
                    reject(new Error("중복된 장르가 존재합니다."))
                } else{
                    resolve(true);
                }
            })
        }
    })
}

app.post("/genres/upload", (req, res) => {
    Promise.all(
        [game_genre_dup_chk(req.body)]
    ).then((isDuplicate) => {
        if(isDuplicate[0]){
            const {kor_name} = req.body;

            pool.query(insertNewGameGenre(), [kor_name], (err, rows) => {
                if (err) {
                    console.error(err);
                }else{
                    res.status(200).send({
                                             message: "장르 추가 성공~"
                                         });
                }
            })
        }
    }).catch((err) => {
        res.status(403).send({
                                 message : err.message
                             });
    });
});

app.get("/api/genre/all", (req, res) => {
    pool.query(selectAllGameGenre(), (err, rows) => {
        if(err){
            console.log(err)
        }
        res.status(200).send(rows);
    });
});

app.get("/api/shops/all", (req, res) => {
    pool.query(selectAllGameShop(), (err, rows) => {
        if(err){
            console.log(err);
        }
        res.status(200).send(rows);
    })
});

function game_shop_dup_chk(value){
    return new Promise((resolve, reject) => {
        const {kor_name} = value;

        if(kor_name === undefined || kor_name === ""){
            reject(new Error("구매처를 입력해주세요."));
        }else if(kor_name !== undefined && kor_name !== "") {
            pool.query(isDupGameShopName(), kor_name, (err, rows) => {
                if(err){
                    console.log(err);
                }

                if(rows.length !== 0){
                    reject(new Error("중복된 구매처가 존재합니다."))
                } else{
                    resolve(true);
                }
            })
        }
    })
}

app.post("/shops/upload", (req, res) => {
    Promise.all(
        [game_shop_dup_chk(req.body)]
    ).then((isDuplicate) => {
        if(isDuplicate[0]){
            const {kor_name} = req.body;

            pool.query(insertNewGameShop(), [kor_name], (err, rows) => {
                if (err) {
                    console.error(err);
                }else{
                    res.status(200).send({
                                             message: "구매처 추가 성공~"
                                         });
                }
            })
        }
    }).catch((err) => {
        res.status(403).send({
                                 message : err.message
                             });
    });
});

app.get("/api/games/id", (req, res) => {
    const {kor_name, release_date} = req.query;
    pool.query(isDuplicateGame(), [kor_name, release_date], (err, rows) => {
        if(err){
            console.log(err);
        }else{
            res.status(200).send({
                                     id : rows[0].id
                                 });
        }
    })
});

app.listen(PORT, ()=>{
    console.log(`running on port ${PORT}`);
});
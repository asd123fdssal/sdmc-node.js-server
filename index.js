const express = require('express');
const app = express();
const PORT = process.env.port || 8080;
const mysql      = require('mysql2/promise');
const {DB_INFO, SESSION_SECRET, SESSION_KEY} = require("./config/conn_config");
const {get_game_title, get_login_result, sign_up_member, isDuplicateUsername, isDuplicateNickname, isDuplicateEmail,
    isDuplicateGame, uploadGame, isDupKorCompany, isDupOrgCompany, isDupOrgGameCompany, isDupKorGameCompany,
    insertNewGameCompany, selectAllGameCompany, selectAllGameSeries, isDupKorGameSeries, insertNewGameSeries,
    selectAllGameGenre, isDupGameGenreName, insertNewGameGenre, selectAllGameShop, isDupGameShopName, insertNewGameShop,
    insertGameGenre, insertGameShop, selectGameByID, selectGameGenreByGid, selectMyGameShop, selectCharcterByGid,
    insertCharacters, isDuplCharacters
} = require('./config/sql_query');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const multer = require('multer');
const {MAX_CONTENTS} = require("./config/const_config");
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

app.get('/games', async(req, res) => {
    try {
        const [games] = await pool.query(get_game_title(), [1, MAX_CONTENTS]);
        res.send({games: games});
    }catch (err){
        console.error(err)
    }
});

app.get('/games/:index', async (req, res) => {
    try {
        const page = parseInt(req.params.index);
        const [games] = await pool.query(get_game_title(), [((page - 1) * MAX_CONTENTS), MAX_CONTENTS]);
        res.send({games: games});
    }catch (err){
        console.error(err)
    }
});

app.post('/login', async (req, res) => {
    try {
        const [users] = await pool.query(get_login_result(), [req.body.username, req.body.password]);
        if(users !== undefined){
            req.session.uid = users[0].uid;
            req.session.save();
            res.status(200).send({});
        }else{
            res.status(401).send({message: '아이디 또는 패스워드가 일치하지 않습니다.'});
        }
    }catch (err){
        console.error(err);
    }
});

app.get('/login', function(req, res){
    res.status((req.session.uid !== undefined)? 200 : 401).send({

    });
});

app.get('/', function (req, res){
    res.status(200).json({});
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
    res.status(200).send({loginResult: (req.session.uid !== undefined)});
});

app.get('/signup', function(req, res){
    res.status(200).send({});
});

app.post("/images", upload.single("image"), (req, res) => {
    const file = req.file;
    res.status(200).send({imageUrl: file.filename});
});

app.post('/signup', async (req, res) => {
    let errorMessage = '';
    const {username, password, email, nickname} = req.body;

    try {
        const [dup_username] = await pool.query(isDuplicateUsername(), [username]);
        const [dup_email] = await pool.query(isDuplicateEmail(), [email]);
        const [dup_nickname] = await pool.query(isDuplicateNickname(), [nickname]);

        if(dup_username.length !== 0){
            errorMessage = '이미 존재하는 아이디 입니다.';
        }else if(dup_email.length !== 0){
            errorMessage = '이미 존재하는 이메일 입니다.';
        }else if(dup_nickname.length !== 0){
            errorMessage = '이미 존재하는 닉네임 입니다.';
        }else {
            let verify_code = '';
            for (let i = 0; i < 6; i++) {
                verify_code += Math.floor(Math.random() * 10);
            }

            const verify_date = new Date(new Date().getTime() + 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

            const [member] = await pool.query(sign_up_member(), [username, password, email, nickname, verify_code, verify_date]);
            if(member.affectedRows === 1){
                res.status(200).send({});
            }else{
                res.status(409).send({message: "알 수 없는 에러가 발생했습니다."});
            }
        }
    }catch (err){
        res.status(409).send({message: errorMessage});
    }
});

app.post('/games/upload', async (req, res) => {
    try{
        let nicknames = '';
        let {company, series, imageUrl, release_date, org_name, kor_name, synopsis, hookcode, etc, nickname, genre, shop} = req.body;

        let errorMessage = '';

        if(kor_name === undefined || kor_name === ''){
            errorMessage = '게임 이름(한글)을 입력해주세요.';
        }else if(release_date === undefined || release_date === ''){
            errorMessage = '발매일을 입력해주세요.';
        }else {
            const [dup_game] = await pool.query(isDuplicateGame(), [kor_name, release_date]);
            if (dup_game.length !== 0){
                errorMessage = '이미 존재하는 게임 입니다.';
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

                const [game] = await pool.query(uploadGame(), [company, series, imageUrl, release_date, org_name, kor_name, synopsis, hookcode, etc, nicknames]);
                let genreCnt = 0;
                for (let i = 0; i < genre.length; i++) {
                    const [genre] = await pool.query(insertGameGenre(), [kor_name, genre[i].value]);
                    genreCnt += genre.affectedRows;
                }
                const [shops] = await pool.query (insertGameShop(), [shop, req.session.uid, kor_name]);

                if(game.affectedRows !== 0 && genreCnt === genre.length && shops.affectedRows !==0){
                    res.status(200).send({message : "추가가 완료되었습니다."});
                }else{
                    errorMessage = "알 수 없는 에러가 발생했습니다.";
                }
            }
        }
        if(errorMessage !== undefined && errorMessage !== ''){
            res.status(409).send({message : errorMessage});
        }
    }catch (err){
        console.error(err)
    }
});

app.post("/company/upload", async (req, res) => {
    try{
        let errorMessage = '';
        const {kor_name, org_name} = req.body;
        if(kor_name === undefined || kor_name === ""){
            errorMessage = "제작사(한글)를 입력해주세요.";
        }
        const [dup_company] = await pool.query(isDupKorGameCompany(), [kor_name]);
        if(dup_company.length !==0){
            errorMessage = "중복된 제작사(한글)가 존재합니다.";
        }else {
            const [company] = await pool.query(insertNewGameCompany(), [org_name, kor_name]);
            if(company.affectedRows === 0){
                errorMessage = "알 수 없는 에러가 발생했습니다.";
            }
        }
        if(errorMessage !== undefined && errorMessage !== ''){
            res.status(200).send({message: "회사 추가 성공~"});
        }else{{
            res.status(403).send({message : errorMessage});
        }};
    }catch (err){
        console.error(err);
    };
});

app.get("/api/company/all", async (req, res) => {
    try{
        const [company] = await pool.query(selectAllGameCompany());
        res.status(200).send(company);
    }catch (err){
        console.error(err);
    };
})

app.get("/api/series/all", async (req, res)=> {
    try{
        const [series] = await pool.query(selectAllGameSeries());
        res.status(200).send(series);
    }catch (err){
        console.error(err);
    };
})

app.post("/series/upload", async (req, res) => {
    try{
        let errorMessage = '';
        const {kor_name, nickname} = req.body;
        if(kor_name === undefined || kor_name === ""){
            errorMessage = "시리즈를 입력해주세요.";
        }
        const [dup_series] = await pool.query(isDupKorGameSeries(), [kor_name]);
        if(dup_series.length !==0){
            errorMessage = "중복된 시리즈가 존재합니다.";
        }else {
            const [series] = await pool.query(insertNewGameSeries(), [kor_name, nickname]);
            if(series.affectedRows === 0){
                errorMessage = "알 수 없는 에러가 발생했습니다.";
            }
        }
        if(errorMessage !== undefined && errorMessage !== ''){
            res.status(200).send({message: "시리즈 추가 성공~"});
        }else{{
            res.status(403).send({message : errorMessage});
        }};
    }catch (err){
        console.error(err);
    };
});

app.post("/genres/upload", async (req, res) => {
    try{
        let errorMessage = '';
        const {kor_name} = req.body;
        if(kor_name === undefined || kor_name === ""){
            errorMessage = "장르명을 입력해주세요.";
        }
        const [dup_genre] = await pool.query(isDupGameGenreName(), [kor_name]);
        if(dup_genre.length !==0){
            errorMessage = "중복된 장르가 존재합니다.";
        }else {
            const [genre] = await pool.query(insertNewGameGenre(), [kor_name]);
            if(genre.affectedRows === 0){
                errorMessage = "알 수 없는 에러가 발생했습니다.";
            }
        }
        if(errorMessage !== undefined && errorMessage !== ''){
            res.status(200).send({message: "장르 추가 성공~"});
        }else{{
            res.status(403).send({message : errorMessage});
        }};
    }catch (err){
        console.error(err);
    };
});

app.get("/api/genre/all",async (req, res) => {
    try{
        const [genre] = await pool.query(selectAllGameGenre());
        res.status(200).send(genre);
    }catch (err){
        console.error(err);
    };
});

app.get("/api/shops/all", async (req, res) => {
    try{
        const [shops] = await pool.query(selectAllGameShop());
        res.status(200).send(shops);
    }catch (err){
        console.error(err);
    };
});

app.post("/shops/upload", async (req, res) => {
    try{
        let errorMessage = '';
        const {kor_name} = req.body;
        if(kor_name === undefined || kor_name === ""){
            errorMessage = "구매처를 입력해주세요.";
        }
        const [dup_shop] = await pool.query(isDupGameShopName(), [kor_name]);
        if(dup_shop.length !==0){
            errorMessage = "중복된 구매처가 존재합니다.";
        }else {
            const [shop] = await pool.query(insertNewGameShop(), [kor_name]);
            if(shop.affectedRows === 0){
                errorMessage = "알 수 없는 에러가 발생했습니다.";
            }
        }
        if(errorMessage !== undefined && errorMessage !== ''){
            res.status(200).send({message: "구매처 추가 성공~"});
        }else{{
            res.status(403).send({message : errorMessage});
        }};
    }catch (err){
        console.error(err);
    };
});

app.get("/api/games/id", async (req, res) => {
    try{
        const {kor_name, release_date} = req.query;
        const [games] = pool.query(isDuplicateGame(), [kor_name, release_date]);
        if(games.length !==0){
            res.status(200).send({id : games[0].id});
        }else{

        }
    }catch (err){
        console.error(err)
    };
});

app.get("/games/titles/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const [games] = await pool.query(selectGameByID(), [id]);
        const [genre] = await pool.query(selectGameGenreByGid(), [id]);
        const [shop] = await pool.query(selectMyGameShop(), [id, req.session.uid]);
        const [characters] = await pool.query(selectCharcterByGid(), [id]);
        const nickname = games[0].nickname.split(',').map((nick) => {return { key:nick, value: nick };});
        res.status(200).send({games: games[0], genres: genre, shop: (shop[0]===undefined? "": shop[0]), nickname:nickname, characters: characters});
    } catch (err) {
        console.error(err);
    }
});

app.get("/characters/upload", async (req, res) => {
   res.status(200).send({});
});

app.post("/characters/upload", async (req, res) => {
    try{
        let errorMessage = '';
        const {title_id, org_name, kor_name, imageUrl, strategy} = req.body;
        const [dup_characters] = await pool.query(isDuplCharacters(), [title_id, kor_name]);

        if(dup_characters.length !== 0){
            errorMessage = "이미 존재하는 캐릭터 입니다.";
        }else{
            const [characters] = await pool.query(insertCharacters(), [title_id, org_name, kor_name, imageUrl, strategy]);
            if(characters.length === 0){
                errorMessage = "알 수 없는 에러가 발생했습니다.";
            }
        }

        if(errorMessage === ''){
            res.status(200).send({message: "캐릭터 추가가 완료되었습니다."});
        }else{
            res.status(409).send({message: errorMessage});
        }
    }catch (err){
        console.error(err);
    };
});

app.listen(PORT, ()=>{
    console.log(`running on port ${PORT}`);
});
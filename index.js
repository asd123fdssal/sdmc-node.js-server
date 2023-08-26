const express = require('express');
const app = express();
const PORT = process.env.port || 80;
const mysql      = require('mysql2/promise');
const {DB_INFO, SESSION_SECRET, SESSION_KEY} = require("./config/conn_config");
const {get_game_title, get_login_result, sign_up_member, isDuplicateUsername, isDuplicateNickname, isDuplicateEmail,
    isDuplicateGame, uploadGame,  isDupKorGameCompany,
    insertNewGameCompany, selectAllGameCompany, selectAllGameSeries, isDupKorGameSeries, insertNewGameSeries,
    selectAllGameGenre, isDupGameGenreName, insertNewGameGenre, selectAllGameShop, isDupGameShopName, insertNewGameShop,
    insertGameGenre, insertGameShop, selectGameByID, selectGameGenreByGid, selectMyGameShop, selectCharacterByGid,
    insertCharacters, isDuplCharacters, updateGameProgress, updateCharacters, updateGames, deleteGameGenre,
    getGameRecommendByUid, updateRecommend, getGameComments, insertNewGameComments, deleteGameComments, getGameMaxPage,
    getGameMaxPageByFilter
} = require('./config/sql_query');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const multer = require('multer');
const {MAX_CONTENTS} = require("./config/const_config");
const {formatTimestamp} = require("./utility/utils");
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
const whitelist = ["http://localhost:3000", "http://sdmc.co.kr:80", "http://localhost"];

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

app.get('/api/games', async(req, res) => {
    try {
        const [games] = await pool.query(get_game_title(), [1, MAX_CONTENTS]);
        res.send({games: games});
    }catch (err){
        console.error(err)
    }
});

app.get('/api/games/:index', async (req, res) => {
    try {
        const {options, value, order, genre} = req.query;
        const page = parseInt(req.params.index);
        const genres = genre?genre.flatMap(obj => [obj.value]):'';

        let orderQuery = '';
        if(order === '발매일순'){
            orderQuery = 'order by release_date desc';
        }else if(order === '추천순'){
            orderQuery = 'order by recommend desc';
        }else if(order === '댓글순'){
            orderQuery = 'order by comments desc';
        }else if(order === '가나다순'){
            orderQuery = 'order by title_name asc';
        }

        if(options && value !== '' && value){
            const mode = options.value;
            const [games] = await pool.query(get_game_title(orderQuery), [value, mode !== '제목', value, mode !== '제작사', value, mode !== '시리즈', genres, genres === '', genre?genre.length:0, genre?false:true, ((page - 1) * MAX_CONTENTS), MAX_CONTENTS]);
            const [pages] = await pool.query(getGameMaxPageByFilter(), [value, mode !== '제목', value, mode !== '제작사', value, mode !== '제작사', genres, genres === '', genre?genre.length:0, genre?false:true, ((page - 1) * MAX_CONTENTS), MAX_CONTENTS]);
            res.status(200).send({games: games, pages:pages[0].pages});
        }else{
            const [games] = await pool.query(get_game_title(orderQuery), ['', true, '', true, '', true, genres, genres === '', genre?genre.length:0, genre?false:true, ((page - 1) * MAX_CONTENTS), MAX_CONTENTS]);
            const [pages] = await pool.query(getGameMaxPage(), [MAX_CONTENTS]);
            res.status(200).send({games: games, pages:pages[0].pages});
        }
    }catch (err){
        console.error(err)
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const [users] = await pool.query(get_login_result(), [req.body.username, req.body.password]);
        if(users && users[0]){
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

app.get('/api/login', function(req, res){
    res.status((req.session.uid !== undefined)? 200 : 401).send({

    });
});

app.get('/', function (req, res){
    res.status(200).json({});
});

app.get('/api/logout', function (req, res){
    if(req.session.uid !== undefined){
        delete req.session.uid;
        req.session.save();
    }

    res.status(200).send({
        loginResult: (req.session.uid !== undefined)
    });
});

app.get('/api/auth', function (req, res){
    res.status(200).send({loginResult: (req.session.uid !== undefined)});
});

app.get('/api/signup', function(req, res){
    res.status(200).send({});
});

app.post("/api/images", upload.single("image"), (req, res) => {
    const file = req.file;
    res.status(200).send({imageUrl: file.filename});
});

app.post('/api/signup', async (req, res) => {
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

app.post('/api/games/upload', async (req, res) => {
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

                const [game] = await pool.query(uploadGame(), [company, series, imageUrl, formatTimestamp(release_date), org_name, kor_name, synopsis, hookcode, etc, nicknames]);
                let genreCnt = 0;
                for (let i = 0; i < genre.length; i++) {
                    const [genres] = await pool.query(insertGameGenre(), [kor_name, genre[i].value]);
                    genreCnt += genres.affectedRows;
                }
                if (shop){
                    const [shops] = await pool.query (insertGameShop(), [shop, req.session.uid, kor_name, shop]);
                }

                if(game.affectedRows > 0 && genreCnt === genre.length){
                    res.status(200).send({message : "추가가 완료되었습니다."});
                }else{
                    errorMessage = "알 수 없는 에러가 발생했습니다.";
                }
            }
        }
        if(errorMessage !== ''){
            res.status(409).send({message : errorMessage});
        }
    }catch (err){
        console.error(err)
    }
});

app.post("/api/company/upload", async (req, res) => {
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
        if(errorMessage !== ''){
            res.status(200).send({message: "회사 추가 성공~"});
        }else{{
            res.status(403).send({message : errorMessage});
        }}
    }catch (err){
        console.error(err);
    }
});

app.get("/api/company/all", async (req, res) => {
    try{
        const [company] = await pool.query(selectAllGameCompany());
        res.status(200).send(company);
    }catch (err){
        console.error(err);
    }
})

app.get("/api/series/all", async (req, res)=> {
    try{
        const [series] = await pool.query(selectAllGameSeries());
        res.status(200).send(series);
    }catch (err){
        console.error(err);
    }
})

app.post("/api/series/upload", async (req, res) => {
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
        if(errorMessage !== ''){
            res.status(200).send({message: "시리즈 추가 성공~"});
        }else{{
            res.status(403).send({message : errorMessage});
        }}
    }catch (err){
        console.error(err);
    }
});

app.post("/api/genres/upload", async (req, res) => {
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
        if(errorMessage !== ''){
            res.status(200).send({message: "장르 추가 성공~"});
        }else{{
            res.status(403).send({message : errorMessage});
        }}
    }catch (err){
        console.error(err);
    }
});

app.get("/api/genre/all",async (req, res) => {
    try{
        const [genre] = await pool.query(selectAllGameGenre());
        res.status(200).send(genre);
    }catch (err){
        console.error(err);
    }
});

app.get("/api/shops/all", async (req, res) => {
    try{
        const [shops] = await pool.query(selectAllGameShop());
        res.status(200).send(shops);
    }catch (err){
        console.error(err);
    }
});

app.post("/api/shops/upload", async (req, res) => {
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
        if(errorMessage !== ''){
            res.status(200).send({message: "구매처 추가 성공~"});
        }else{{
            res.status(403).send({message : errorMessage});
        }}
    }catch (err){
        console.error(err);
    }
});

app.get("/api/games/id", async (req, res) => {
    try{
        const {kor_name, release_date} = req.query;
        const [games] = await pool.query(isDuplicateGame(), [kor_name, formatTimestamp(release_date)]);
        if(games.length !==0){
            res.status(200).send({id : games[0].id});
        }else{

        }
    }catch (err){
        console.error(err)
    }
});

app.get("/api/games/titles/:id", async (req, res) => {
    const id = req.params.id;
    const {uid} = req.session;
    try {
        const [games] = await pool.query(selectGameByID(), [id]);
        const [genre] = await pool.query(selectGameGenreByGid(), [id]);
        const [shop] = await pool.query(selectMyGameShop(), [id, uid]);
        const [characters] = await pool.query(selectCharacterByGid(), [uid, id]);
        const [recommend] = await pool.query(getGameRecommendByUid(), [id, uid]);
        const [comments] = await pool.query(getGameComments(),[id, uid]);
        let nickname = [];

        if (games[0].nickname !== null) {
            games[0].nickname.split(',').map((nick) => {return { key:nick, value: nick };});
        }

        res.status(200).send({games: games[0], genres: genre, shop: (shop[0]===undefined? "": shop[0]), nickname:nickname, characters: characters, recommend: recommend.length!==0? recommend[0].recommend:false, comments:comments, uid:uid});
    } catch (err) {
        console.error(err);
    }
});

app.get("/api/characters/upload", async (req, res) => {
   res.status(200).send({});
});

app.post("/api/characters/upload", async (req, res) => {
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
    }
});

app.post("/api/member/character/progress", async (req, res) => {
    try{
        const {gpid, cid, progress} = req.body;
        const [game_progress] = await pool.query(updateGameProgress(), [gpid, cid, req.session.uid, progress, progress]);
        if(game_progress.length > 0){
            res.status(200).send({});
        }else{
            res.status(409).send({
                message: "알 수 없는 에러가 발생하였습니다."
                                 });
        }
    }catch (err){
        console.error(err);
    }
})

app.post("/api/characters/update", async (req, res) => {
   try{
       let errorMessage = '';
       const {org_name, kor_name, imageUrl, strategy, cid} = req.body;

       if(kor_name === undefined || kor_name === ""){
           errorMessage = "캐릭터명(한글)을 입력해주세요.";
       }else{
           const [characters] = await pool.query(updateGames(), [org_name, kor_name, imageUrl, strategy, cid]);
           if(characters.affectedRows !== 1){
               errorMessage = "알 수 없는 에러가 발생했습니다.";
           }
       }

       if(errorMessage === ''){
           res.status(200).send({message: "캐릭터 수정이 완료되었습니다."});
       }else{
           res.status(409).send({message: errorMessage});
       }
   }catch (err){
       console.error(err)
   }
});

app.post("/api/games/update", async (req, res) => {
    try{
        const {id, company, series, imageUrl, release_date, gameInfo, genre, nickname, shop} = req.body;
        const {org_name, kor_name, synopsis, hookcode, etc} = gameInfo;
        let nicknames = '';
        // 줄임말을 콤마로 변환한다.
        for (let i = 0; i < nickname.length; i++) {
            nicknames += nickname[i].text;
            if(i + 1 !== nickname.length)
                nicknames += ',';
        }
        const [games] = await pool.query(updateGames(), [company, series, imageUrl, release_date, org_name, kor_name, synopsis, hookcode, etc, nicknames, id]);

        const [del_genre] = await pool.query(deleteGameGenre(), [id]);
        for (let i = 0; i < genre.length; i++) {
            const [genres] = await pool.query(insertGameGenre(), [kor_name, genre[i].value]);
        }
        const [shops] = await pool.query (insertGameShop(), [shop, req.session.uid, kor_name, shop]);

        if(games.affectedRows > 0){
            res.status(200).send({message: "게임 수정이 완료되었습니다."});
        }else {
            res.status(409).send({message: "알 수 없는 에러가 발생했습니다."});
        }
    }catch (err) {
        console.error(err);
    }
})

app.put("/api/games/titles/recommends", async (req, res) => {
    try {
        const {gid, recommend} = req.body;
        const {uid} = req.session;

        const [ins_recommend] = await pool.query(updateRecommend(), [uid, gid, recommend, recommend]);

        if (ins_recommend.affectedRows > 0){
            if(recommend){
                res.status(200).send({message:"추천 등록이 완료되었습니다."});
            }else {
                res.status(200).send({message:"추천 해제가 완료되었습니다."});
            }
        }else{
            res.status(409).send({message:"알 수 없는 에러가 발생하였습니다."});
        }
    } catch (err) {
        console.error(err);
    }
});

app.post("/api/games/comments/upload", async (req, res) => {
    try{
        const uid = req.session.uid;
        const {gid, comments} = req.body;
        const [comment] = await pool.query(insertNewGameComments(), [gid, uid, comments]);
        if(comment.affectedRows > 0){
            res.status(200).send({message:"코멘트 등록이 완료되었습니다."});
        }else {
            res.status(409).send({message:"알 수 없는 에러가 발생하였습니다."});
        }
    }catch (err) {
        console.error(err)
    }
});

app.get("/api/games/comments",async (req, res) => {
   try{
       const {gid} = req.query;
       const [comments] = await pool.query(getGameComments(), [gid]);
       res.status(200).send({comments:comments});
   } catch (err) {
       console.error(err)
   }
});

app.delete("/api/games/comments/delete", async (req, res) => {
   try{
       const {cid} = req.query;
       const [comments] = await pool.query(deleteGameComments(),[cid]);
       if(comments.affectedRows > 0) {
           res.status(200).send({message:"정상적으로 삭제되었습니다."});
       }else{
           res.status(409).send({message:"알 수없는 에러가 발생했습니다."});
       }
   } catch (err) {
       console.error(err);
   }
});

app.get("/api/games/max-page", async (req, res) => {
   try{
       const [pages] = await pool.query(getGameMaxPage(), [MAX_CONTENTS, MAX_CONTENTS]);
       res.status(200).send({pages:pages[0].pages});
   } catch (err){
       console.error(err);
   }
});

app.listen(PORT, ()=>{
    console.log(`running on port ${PORT}`);
});
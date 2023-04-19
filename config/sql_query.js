const {MAX_CONTENTS} = require('./const_config');

function get_game_title(){
    return `
        select
            g.img_dir as \`title_picture\`, 
            g.id as \`title_id\`, 
            g.kor_name as \`title_name\`, 
            c.kor_name as \`company_name\`, 
            g.release_date as \`release_date\`,
            count(v.is_recommend) as \`recommend\`
        from games g
        inner join game_company c on c.id = g.company_id
        left join game_vote v on v.games_id = g.id
        group by g.id
        order by g.id desc
        limit ?, ?;
    `
}

function get_login_result(){
    return (`select id as \`uid\` from member where username = ? and password = ? limit 1`);
}

function sign_up_member(){
    return (`insert into member values(null, ?, ?, ?, ?, 0, ?, ?);`)
}

function isDuplicateUsername(){
    return (`select username from member where username = ?`);
}

function isDuplicateEmail(){
    return (`select mail from member where mail = ?`);
}

function isDuplicateNickname(){
    return (`select nickname from member where nickname = ?`);
}

function isDuplicateGame(kor_name, release_date){
    return (`select id from games where kor_name = ? and release_date = ?`);
}

function uploadGame(){
    return (`insert into games values (null, (select id from game_company where kor_name = ?), (select id from game_series where kor_name = ?), ?, ?, ?, ?, ?, ?, ?, ?)`);
}

function isDupKorGameCompany(){
    return (`select id from game_company where kor_name = ?`);
}

function isDupOrgGameCompany(){
    return (`select id from game_company where org_name = ?`);
}

function insertNewGameCompany() {
    return (`insert into game_company (id, org_name, kor_name) values (null, ?, ?)`);
}

function selectAllGameCompany(){
    return (`select id as \`key\`, kor_name as \`value\` from game_company`);
}

function selectAllGameSeries() {
    return (`select id as \`key\`, kor_name as \`value\` from game_series`);
}

function isDupKorGameSeries(){
    return (`select id from game_series where kor_name = ?`);
}

function insertNewGameSeries() {
    return (`insert into game_series (id, kor_name, nickname) values (null, ?, ?)`);
}

function selectAllGameGenre() {
    return (`select kor_name as \`value\` from game_genre`);
}

function isDupGameGenreName() {
    return (`select id from game_genre where kor_name = ?`);
}

function insertNewGameGenre() {
    return (`insert into game_genre (id, kor_name) values (null, ?)`);
}

function selectAllGameShop() {
    return (`select kor_name as \`value\` from game_shop`);
}

function isDupGameShopName() {
    return (`select id from game_shop where kor_name = ?`);
}

function insertNewGameShop() {
    return (`insert into game_shop (id, kor_name) values (null, ?)`);
}

function insertGameGenre(){
    return (`insert into game_has_genre (id, games_id, genre_id) values(null, (select id from games where kor_name = ?), (select id from game_genre where kor_name = ?))`)
}

function insertGameShop(){
    return (`insert into game_member_has_shop (id, game_shop_id, member_id, games_id) values(null, (select id from game_shop where kor_name = ?) , ?, (select id from games where kor_name = ?))`)
}

function selectGameByID(){
    return (`select c.kor_name as \`company\`, s.kor_name as \`series\`, g.img_dir, g.release_date, g.org_name, g.kor_name, g.synopsis, g.hookcode, g.etc, g.nickname from games g left join game_company c on c.id = g.company_id left join game_series s on s.id = g.series_id where g.id = ?`);
}

function selectGameGenreByGid() {
    return (`select kor_name as \'value\' from game_has_genre ghg inner join game_genre g on g.id = ghg.genre_id where ghg.games_id = ?`);
}

function selectMyGameShop(){
    return (`select kor_name from game_member_has_shop mhs inner join member m on m.id = mhs.member_id inner join game_shop gs on gs.id = mhs.game_shop_id where mhs.games_id = ? and mhs.member_id = ?`);
}

function selectCharcterByGid(){
    return (`SELECT * FROM characters where games_id = ?`);
}

module.exports = {
    get_game_title,
    get_login_result,
    sign_up_member,
    isDuplicateUsername,
    isDuplicateEmail,
    isDuplicateNickname,
    isDuplicateGame,
    uploadGame,
    isDupKorGameCompany,
    isDupOrgGameCompany,
    insertNewGameCompany,
    selectAllGameCompany,
    selectAllGameSeries,
    isDupKorGameSeries,
    insertNewGameSeries,
    selectAllGameGenre,
    isDupGameGenreName,
    insertNewGameGenre,
    selectAllGameShop,
    isDupGameShopName,
    insertNewGameShop,
    insertGameGenre,
    insertGameShop,
    selectGameByID,
    selectGameGenreByGid,
    selectMyGameShop,
    selectCharcterByGid,
}
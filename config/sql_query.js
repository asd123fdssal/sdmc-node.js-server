const {MAX_CONTENTS} = require('./const_config');

function get_game_title(page){
    const offset =((page - 1) * MAX_CONTENTS);
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
        limit ${offset}, ${MAX_CONTENTS};
    `
}

function get_login_result(username, password){
    return (`select id as \`uid\` from member where username = \'${username}\' and password = \'${password}\' limit 1`);
}

function sign_up_member(username, pw, email, nickname){
    let verify_code = '';
    for (let i = 0; i < 6; i++) {
        verify_code += Math.floor(Math.random() * 10);
    }

    const verify_date = new Date(new Date().getTime() + 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    return (`insert into member values(null, \'${username}\',   \'${pw}\',    \'${email}\',   \'${nickname}\',   0,    \'${verify_code}\',  \'${verify_date}\'  );`)
}

function isDuplicateUsername(username){
    return (`select username from member where username = \'${username}\'`);
}

function isDuplicateEmail(email){
    return (`select mail from member where mail = \'${email}\'`);
}

function isDuplicateNickname(nickname){
    return (`select nickname from member where nickname = \'${nickname}\'`);
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
}
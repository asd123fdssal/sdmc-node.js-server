const {MAX_CONTENTS} = require('./const_config');

function get_game_title(order){
  return (`select g.id as 'gid', g.img_dir as \`title_picture\`, g.id as \`title_id\`, g.kor_name as \`title_name\`, c.kor_name as \`company_name\`, g.release_date as \`release_date\`, 
        (select count(id) from game_vote where games_id = g.id) as \`recommend\`,  
        (select count(id) from game_comment where games_id = g.id) as \`comments\` from games g 
        left join game_company c on c.id = g.company_id 
        left join game_vote v on v.games_id = g.id 
        left join game_series s on s.id\t= g.series_id
        left join game_has_genre ghg on ghg.games_id = g.id
        left join game_genre gg on gg.id = ghg.genre_id
        where (g.kor_name like concat('%' ?, '%') or ?) and (c.kor_name like concat('%' ?, '%') or ?) and (s.kor_name like concat('%' ?, '%') or ?) and (gg.kor_name in (?) or ?)
        group by g.id
        having (count(distinct gg.kor_name) = ? or ?) 
        ${order} 
        limit ?, ?;`);
    //return (`select g.id as \'gid\', g.img_dir as \`title_picture\`, g.id as \`title_id\`, g.kor_name as \`title_name\`, c.kor_name as \`company_name\`, g.release_date as \`release_date\`, (case when sum(v.is_recommend) is null then 0 else sum(v.is_recommend) end) as \`recommend\`, (select count(id) from game_comment where games_id = g.id) as \`comments\` from games g inner join game_company c on c.id = g.company_id left join game_vote v on v.games_id = g.id group by g.id order by g.id desc limit ?, ?`);
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

function isDuplicateGame(){
    return (`select id from games where kor_name = ? and release_date = ?`);
}

function uploadGame(){
    return (`insert into games values (null, (select id from game_company where kor_name = ?), (select id from game_series where kor_name = ?), ?, ?, ?, ?, ?, ?, ?, ?)`);
}

function isDupKorGameCompany(){
    return (`select id from game_company where kor_name = ?`);
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
    return (`insert ignore into game_has_genre (id, games_id, genre_id) values(null, (select id from games where kor_name = ?), (select id from game_genre where kor_name = ?))`)
}

function deleteGameGenre() {
    return (`delete from game_has_genre where games_id = ?`);
}

function insertGameShop(){
    return (`insert into game_member_has_shop (id, game_shop_id, member_id, games_id) values(null, (select id from game_shop where kor_name = ?) , ?, (select id from games where kor_name = ?)) on duplicate key update game_shop_id = (select id from game_shop where kor_name = ?)`)
}

function insertNewGameComments(){
    return (`insert into game_comment values(null, ?, ?, ?, 0)`)
}

function selectGameByID(){
    return (`select g.id as \'id\', c.kor_name as \`company\`, s.kor_name as \`series\`, g.img_dir, g.release_date, g.org_name, g.kor_name, g.synopsis, g.hookcode, g.etc, g.nickname from games g left join game_company c on c.id = g.company_id left join game_series s on s.id = g.series_id where g.id = ?`);
}

function selectGameGenreByGid() {
    return (`select kor_name as \'value\' from game_has_genre ghg inner join game_genre g on g.id = ghg.genre_id where ghg.games_id = ?`);
}

function selectMyGameShop(){
    return (`select kor_name from game_member_has_shop mhs inner join member m on m.id = mhs.member_id inner join game_shop gs on gs.id = mhs.game_shop_id where mhs.games_id = ? and mhs.member_id = ?`);
}

function selectCharacterByGid(){
    return (`SELECT c.id as 'cid', c.games_id, c.org_name, c.kor_name, c.pic_dir, c.strategy, gp.id as 'gpid', gp.progress FROM characters c left join game_progress gp on gp.characters_id = c.id and gp.member_id = ? where c.games_id = ?`);
}

function getGameRecommendByUid(){
    return (`select (case when is_recommend is null then 0 else is_recommend end) as \`recommend\` from game_vote where games_id = ? and member_id = ?`);
}

function getGameComments(){
    return (`select gc.id, m.id as \'uid\', m.nickname, gc.comment from game_comment gc inner join member m on m.id = gc.member_id and gc.games_id = ? order by gc.id asc`);
}

function getGameMaxPageByFilter(){
    return (`select count(g.id) as \'pages\' from games g
        left join game_company c on c.id = g.company_id 
        left join game_vote v on v.games_id = g.id 
        left join game_series s on s.id = g.series_id
        left join game_has_genre ghg on ghg.games_id = g.id
        left join game_genre gg on gg.id = ghg.genre_id
        where (g.kor_name like concat('%' ?, '%') or ?) and (c.kor_name like concat('%' ?, '%') or ?) and (s.kor_name like concat('%' ?, '%') or ?)
        `);
}

function getGameMaxPage(){
    return (`select count(id) as \`pages\` from games;`);
}

function deleteGameComments(){
    return (`delete from game_comment where id = ?`)
}

function updateRecommend(){
    return (`insert into game_vote values(null, ?, ?, ?) on duplicate key update is_recommend = ?;`);
}

function insertCharacters(){
    return (`insert into \`characters\` values(null, ?, ?, ?, ?, ?)`);
}

function updateCharacters(){
    return (`update characters set org_name = ?, kor_name = ?, pic_dir = ?, strategy = ? where id = ?`);
}

function isDuplCharacters(){
    return (`select id from \`characters\` where games_id = ? and kor_name = ?`);
}

function updateGameProgress() {
    return (`insert into game_progress values(?, ?, ?, ?) on duplicate key update progress = ?;`);
}

function updateGames(){
    return (`update games set company_id = (select id from game_company where kor_name = ?), series_id = (select id from game_series where kor_name = ?), img_dir = ?, release_date = ?, org_name = ?, kor_name = ?, synopsis = ?, hookcode = ?, etc = ?, nickname = ? where id = ?`);
}

function insertCharacters(){
    return (`insert into \`characters\` values(null, ?, ?, ?, ?, ?)`);
}

function isDuplCharacters(){
    return (`select id from \`characters\` where games_id = ? and kor_name = ?`);
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
    selectCharacterByGid,
    insertCharacters,
    isDuplCharacters,
    updateGameProgress,
    updateCharacters,
    updateGames,
    deleteGameGenre,
    getGameRecommendByUid,
    updateRecommend,
    getGameComments,
    insertNewGameComments,
    deleteGameComments,
    getGameMaxPage,
    getGameMaxPageByFilter,
}
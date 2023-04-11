const {MAX_CONTENTS} = require('./const_config');

function get_game_title(page){
    const offset =((page - 1) * MAX_CONTENTS);
    return `
        select
            t.picture as \`title_picture\`, 
            t.id as \`title_id\`, 
            t.kor_name as \`title_name\`, 
            c.kor_name as \`company_name\`, 
            t.release_date as \`release_date\`,
            count(r.isRecommend) as \`recommend\`
        from title t
        inner join company c on c.id = t.company_id
        left join rate r on r.title_id = t.id
        group by t.id
        order by t.id desc
        limit ${offset}, ${MAX_CONTENTS};
    `
}

function get_login_result(username, password){
    return `
        select 
            id as \`uid\`
        from member
        where
            username = \'${username}\'
        and
            password = \'${password}\'
        limit 1
    `
}

module.exports = {
    get_game_title,
    get_login_result
}
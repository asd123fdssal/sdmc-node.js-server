const {MAX_CONTENTS} = require('./const_config');

function get_game_title(page){
    const offset =((page - 1) * MAX_CONTENTS);
    return `
        select
            t.picture as \`title_picture\`, 
            t.id as \`title_id\`, 
            t.kor_name as \`title_name\`, 
            c.kor_name as \`company_name\`, 
            count(r.isRecommend) as \`recommend\`
        from title t
        inner join company c on c.id = t.company_id
        left join rate r on r.title_id = t.id
        group by t.id
        order by t.id desc
        limit ${offset}, ${MAX_CONTENTS};
    `
}

module.exports = {
    get_game_title
}
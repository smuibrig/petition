const spicedPg = require("spiced-pg");

const db = spicedPg(
    process.env.DATABASE_URL || `postgres:sophie@localhost:5432/sophie`
);

exports.createUser = async (firstName, lastName, email, password) => {
    let result = await db.query(
        `INSERT INTO users (first, last, email, password) VALUES ($1, $2, $3, $4) RETURNING id`,
        [firstName, lastName, email, password]
    );
    if (result != undefined && result.rows.length == 1) {
        return result.rows[0].id;
    }
};

exports.updateUser = async (id, firstName, lastName, email, password) => {
    let args = [id, firstName, lastName, email];

    if (password != undefined) {
        args.push(password);
    } else {
        args.push(null);
    }

    let result = await db.query(
        `UPDATE users SET
          first = $2, last = $3,
          email = $4, password = COALESCE($5, users.password)
         WHERE id = $1
         RETURNING id`,
        args
    );

    if (result != undefined && result.rows.length == 1) {
        return result.rows[0].id;
    }
};

exports.createSignature = async (signature, user_id) => {
    let result = await db.query(
        `INSERT INTO signatures (signature, user_id) VALUES ($1, $2) RETURNING id`,
        [signature, user_id]
    );

    if (result != undefined && result.rows.length == 1) {
        return result.rows[0].id;
    }
};

exports.createProfile = async (age, city, url, user_id) => {
    let result = await db.query(
        `INSERT INTO user_profiles (age, city, url, user_id) VALUES ($1, $2, $3, $4) RETURNING id`,
        [age, city, url, user_id]
    );

    if (result != undefined && result.rows.length == 1) {
        return result.rows[0];
    }
};

exports.getUserInfo = async (email) => {
    let result = await db.query(`SELECT * FROM users WHERE email = $1 `, [
        email,
    ]);
    if (result != undefined && result.rows.length == 1) {
        return result.rows[0];
    }
};

exports.getSignature = async (user_id) => {
    let result = await db.query(`SELECT * FROM signatures WHERE user_id = $1`, [
        user_id,
    ]);
    if (result != undefined && result.rows.length == 1) {
        return result.rows[0];
    }
};

exports.getSignatures = async (city = "") => {
    let query = `
    SELECT users.id, signature, first, last, url, city, age
    FROM signatures s
    INNER JOIN users ON users.id = s.user_id
    LEFT JOIN user_profiles p ON p.user_id = users.id
`;

    let params = [];
    if (city != "") {
        query += "WHERE LOWER(city) = LOWER($1)";
        params.push(city);
    }

    let result = await db.query(query, params);

    if (result != undefined) {
        return result.rows;
    }
};

exports.getUserDataById = async (user_id) => {
    let result = await db.query(
        `
    SELECT users.id, first, last, email, age, city, url
    FROM users
    LEFT JOIN user_profiles p ON users.id = p.user_id
    WHERE users.id = $1 
    `,
        [user_id]
    );
    if (result != undefined && result.rows.length == 1) {
        return result.rows[0];
    }
};

exports.updateProfile = async (user_id, age, city, url) => {
    let result = await db.query(
        `INSERT INTO user_profiles (user_id, age, city, url)
        VALUES (
            $1,
            NULLIF($2, '')::int,
            NULLIF($3, ''),
            NULLIF($4, '')
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          age  = NULLIF($2, '')::int,
          city = NULLIF($3, ''),
          url  = NULLIF($4, '')`,
        [user_id, age, city, url]
    );
    if (result != undefined && result.rows.length == 1) {
        return result.rows[0].id;
    }
};

exports.deleteSignature = async (user_id) => {
    let result = await db.query(`DELETE FROM signatures WHERE user_id = $1`, [
        user_id,
    ]);
    if (result != undefined && result.rows.length == 1) {
        return result.rows[0];
    }
};

exports.deleteProfile = async (user_id) => {
    let result = await db.query(
        `DELETE FROM user_profiles WHERE user_id = $1`,
        [user_id]
    );
    if (result != undefined && result.rows.length == 1) {
        return result.rows[0];
    }
};

exports.deleteUser = async (id) => {
    let result = await db.query(`DELETE FROM users WHERE id = $1`, [id]);
    if (result != undefined && result.rows.length == 1) {
        return result.rows[0];
    }
};

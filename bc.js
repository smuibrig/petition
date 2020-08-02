const bcrypt = require("bcryptjs");
let { genSalt, hash, compare } = bcrypt;
const { promisify } = require("util"); 

genSalt = promisify(genSalt);
hash = promisify(hash);
compare = promisify(compare); 

module.exports.hash = plainPassword => genSalt().then(salt=>hash(plainPassword,salt)); 

module.exports.compare = compare; 


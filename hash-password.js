import bcrypt from "bcryptjs";

const hashed = bcrypt.hashSync("yourpassword", 10);
console.log(hashed);

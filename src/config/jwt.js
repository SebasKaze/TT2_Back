import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "supersecretkey";

export const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email
        },
            SECRET,
        {
            expiresIn: "2h"
        }
    );
};

export const verifyToken = (token) => {
    return jwt.verify(token, SECRET);
};
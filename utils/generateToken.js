import jwt from "jsonwebtoken";

export const generateToken = (userId, email) => {
  const token = jwt.sign(
    { userInfo: { userId: userId, email: email } },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1d",
    }
  );
  return token;
};

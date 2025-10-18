const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateJoinCode = (length = 6) => {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    code += alphabet[randomIndex];
  }
  return code;
};

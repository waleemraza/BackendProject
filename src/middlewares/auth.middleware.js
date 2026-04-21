import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken'
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req, res, next) => {
     //console.log("🔹 verifyJWT START");
   try {
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
     ///console.log("🔑 TOKEN:", token);
     if (!token) {
         throw new ApiError(401, "unauthorized access")
     }
 
     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
     //console.log("✅ DECODED:", decodedToken);
 
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
 
     if (!user) {
        //console.log("❌ JWT ERROR:", error.message);
         throw new ApiError(401," Invalid Access Token")
         
     }
     req.user = user;
     next()
      
   } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token")
   }

})